importScripts("i18n.js", "capture-store.js");

const captureLocks = new Set();
const captureSessions = new Map();
const maxVisibleCaptureCallsPerSecond =
  typeof chrome.tabs.MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND === "number"
    ? chrome.tabs.MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND
    : 2;
const visibleCaptureIntervalMs =
  Math.ceil(1000 / Math.max(1, maxVisibleCaptureCallsPerSecond)) + 120;

let lastVisibleCaptureAt = 0;
let visibleCaptureQueue = Promise.resolve();
let currentLanguage = PrintExtensionI18n.getDefaultLanguage();

async function withLocale(task) {
  currentLanguage = await PrintExtensionI18n.getCurrentLanguage();
  PrintExtensionI18n.setCurrentLanguage(currentLanguage);
  return task();
}

function t(key, params) {
  return PrintExtensionI18n.t(key, params, currentLanguage);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) {
    return undefined;
  }

  if (message.type === "BEGIN_REGION_CAPTURE") {
    withLocale(() => handleBeginRegionCapture(message.tabId))
      .then(() => {
        sendResponse({ ok: true });
      })
      .catch((error) => {
        sendResponse({
          ok: false,
          error: normalizeError(error),
        });
      });

    return true;
  }

  if (message.type === "CAPTURE_FULL_PAGE") {
    withLocale(() => handleFullPageCapture(message.tabId))
      .then(() => {
        sendResponse({ ok: true });
      })
      .catch(async (error) => {
        if (normalizeError(error) !== t("service.error.captureCancelled")) {
          try {
            await openErrorWindow(normalizeError(error));
          } catch (windowError) {
            // noop
          }
        }

        sendResponse({
          ok: false,
          error: normalizeError(error),
        });
      });

    return true;
  }

  if (message.type === "CANCEL_CAPTURE") {
    withLocale(() => handleCancelCapture(message.tabId))
      .then((response) => {
        sendResponse(response);
      })
      .catch((error) => {
        sendResponse({
          ok: false,
          error: normalizeError(error),
        });
      });

    return true;
  }

  if (message.type === "OPEN_LAST_PROJECT") {
    withLocale(() => handleOpenLastProject())
      .then(() => {
        sendResponse({ ok: true });
      })
      .catch((error) => {
        sendResponse({
          ok: false,
          error: normalizeError(error),
        });
      });

    return true;
  }

  if (message.type === "REGION_SELECTION_CONFIRMED") {
    withLocale(() => handleRegionCapture(sender.tab && sender.tab.id, message.region))
      .then(() => {
        sendResponse({ ok: true });
      })
      .catch(async (error) => {
        try {
          await openErrorWindow(normalizeError(error));
        } catch (windowError) {
          // noop
        }

        sendResponse({
          ok: false,
          error: normalizeError(error),
        });
      });

    return true;
  }

  return undefined;
});

async function handleBeginRegionCapture(tabId) {
  validateTabId(tabId);
  await ensureContentScript(tabId);
  await chrome.tabs.sendMessage(tabId, {
    type: "START_REGION_SELECTION",
  });
}

async function handleFullPageCapture(tabId) {
  validateTabId(tabId);

  await withCaptureLock(tabId, async () => {
    const session = startCaptureSession(tabId, "full-page");

    try {
      await notifyCaptureProgress(session, 3, t("service.progress.preparingFullPage"));
      const dataUrl = await captureFullPage(tabId, session);
      assertCaptureActive(session);
      await notifyCaptureProgress(session, 96, t("service.progress.openingEditor"));
      await storeCaptureAndOpenEditor(dataUrl, {
        mode: "full-page",
        capturedAt: Date.now(),
      });
      await notifyCaptureProgress(session, 100, t("service.progress.completed"));
    } finally {
      finishCaptureSession(tabId);
    }
  });
}

async function handleRegionCapture(tabId, region) {
  validateTabId(tabId);
  validateRegion(region);

  await withCaptureLock(tabId, async () => {
    const dataUrl = await captureRegion(tabId, region);
    await storeCaptureAndOpenEditor(dataUrl, {
      mode: "region",
      capturedAt: Date.now(),
      width: region.width,
      height: region.height,
    });
  });
}

async function handleCancelCapture(tabId) {
  validateTabId(tabId);
  const session = captureSessions.get(tabId);

  if (!session) {
    return {
      ok: false,
      error: t("service.error.noCaptureToCancel"),
    };
  }

  session.cancelRequested = true;
  await notifyCaptureProgress(session, session.progress || 0, t("service.progress.canceling"));

  return {
    ok: true,
  };
}

async function handleOpenLastProject() {
  const captures = await CaptureStore.getAllCaptures();

  if (!captures.length) {
    throw new Error(t("service.error.noRecentProject"));
  }

  captures.sort((left, right) => {
    const leftDate = left.updatedAt || left.createdAt || 0;
    const rightDate = right.updatedAt || right.createdAt || 0;
    return rightDate - leftDate;
  });

  const latestCapture = captures.find((capture) => capture && capture.id && capture.dataUrl);

  if (!latestCapture) {
    throw new Error(t("service.error.noRecentProject"));
  }

  await openEditorWindowForCapture(latestCapture.id);
}

async function ensureContentScript(tabId) {
  let hasContentScript = false;

  try {
    await chrome.tabs.sendMessage(tabId, {
      type: "PRINT_EXTENSION_PING",
    });
    hasContentScript = true;
  } catch (error) {
    hasContentScript = false;
  }

  await refreshContentStyles(tabId);

  if (hasContentScript) {
    return;
  }

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["i18n.js", "content-script.js"],
  });
}

async function refreshContentStyles(tabId) {
  try {
    await chrome.scripting.removeCSS({
      target: { tabId },
      files: ["content-style.css"],
    });
  } catch (error) {
    // noop
  }

  await chrome.scripting.insertCSS({
    target: { tabId },
    files: ["content-style.css"],
  });
}

async function captureFullPage(tabId, session) {
  const pageState = await prepareFullPageCapture(tabId);

  try {
    if (!pageState.viewportWidth || !pageState.viewportHeight) {
      throw new Error(t("service.error.viewportSize"));
    }

    if (!pageState.contentViewportWidth || !pageState.contentViewportHeight) {
      throw new Error(t("service.error.viewportContent"));
    }

    if (!pageState.documentHeight) {
      throw new Error(t("service.error.pageHeight"));
    }

    const slices = buildFullPageSlices(
      pageState.documentHeight,
      pageState.contentViewportHeight
    );

    if (!slices.length) {
      throw new Error(t("service.error.buildFullPage"));
    }

    await notifyCaptureProgress(session, 10, t("service.progress.capturingSlices"));

    const firstSlice = slices[0];
    await scrollTabTo(tabId, 0, firstSlice.scrollY);
    assertCaptureActive(session);
    const firstCapture = await captureVisibleTabImage(tabId);
    const scaleX = firstCapture.width / pageState.viewportWidth;
    const scaleY = firstCapture.height / pageState.viewportHeight;
    const sourceCaptureWidth = Math.max(
      1,
      Math.round(pageState.contentViewportWidth * scaleX)
    );
    const sourceCaptureX = Math.max(0, Math.round((pageState.captureX || 0) * scaleX));
    const sourceCaptureY = Math.max(0, Math.round((pageState.captureY || 0) * scaleY));
    const stitchedWidth = sourceCaptureWidth;
    const stitchedHeight = Math.max(1, Math.round(pageState.documentHeight * scaleY));
    const canvas = new OffscreenCanvas(stitchedWidth, stitchedHeight);
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error(t("service.error.prepareFullPageCanvas"));
    }

    await drawSliceOnCanvas(context, firstCapture.dataUrl, firstSlice, {
      scaleX,
      scaleY,
      stitchedWidth,
      stitchedHeight,
      sourceCaptureX,
      sourceCaptureY,
      sourceCaptureWidth,
    });

    await notifyCaptureProgress(
      session,
      getCaptureSliceProgress(1, slices.length),
      t("service.progress.assemblingSlice", { index: 1, total: slices.length })
    );

    if (slices.length > 1) {
      await hideDeferredFixedElements(tabId);
    }

    for (let index = 1; index < slices.length; index += 1) {
      assertCaptureActive(session);
      const slice = slices[index];
      await scrollTabTo(tabId, 0, slice.scrollY);
      const capture = await captureVisibleTabImage(tabId);
      await drawSliceOnCanvas(context, capture.dataUrl, slice, {
        scaleX,
        scaleY,
        stitchedWidth,
        stitchedHeight,
        sourceCaptureX,
        sourceCaptureY,
        sourceCaptureWidth,
      });

      await notifyCaptureProgress(
        session,
        getCaptureSliceProgress(index + 1, slices.length),
        t("service.progress.assemblingSlice", { index: index + 1, total: slices.length })
      );
    }

    const blob = await canvas.convertToBlob({
      type: "image/png",
    });

    return blobToDataUrl(blob);
  } finally {
    await restoreFullPageCapture(tabId, pageState).catch(() => {
      // noop
    });
  }
}

async function captureRegion(tabId, region) {
  const visibleCapture = await captureVisibleTabImage(tabId);
  const viewportWidth = region.viewportWidth;
  const viewportHeight = region.viewportHeight;

  if (!viewportWidth || !viewportHeight) {
    throw new Error(t("service.error.viewportSize"));
  }

  const scaleX = visibleCapture.width / viewportWidth;
  const scaleY = visibleCapture.height / viewportHeight;
  const cropX = sanitizeCoordinate(region.x * scaleX);
  const cropY = sanitizeCoordinate(region.y * scaleY);
  const cropWidth = sanitizeClipValue(region.width * scaleX);
  const cropHeight = sanitizeClipValue(region.height * scaleY);

  return cropImageDataUrl(visibleCapture.dataUrl, {
    x: cropX,
    y: cropY,
    width: cropWidth,
    height: cropHeight,
  });
}

async function prepareFullPageCapture(tabId) {
  const state = await executeInTab(
    tabId,
    () => {
      const docEl = document.documentElement;
      const body = document.body;
      const scrollingElement = document.scrollingElement || docEl;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const bodyWidth = body
        ? Math.max(body.scrollWidth, body.offsetWidth, body.clientWidth)
        : 0;
      const bodyHeight = body
        ? Math.max(body.scrollHeight, body.offsetHeight, body.clientHeight)
        : 0;
      const documentWidth = Math.max(
        scrollingElement.scrollWidth,
        scrollingElement.clientWidth,
        docEl.scrollWidth,
        docEl.clientWidth,
        bodyWidth
      );
      const documentHeight = Math.max(
        scrollingElement.scrollHeight,
        scrollingElement.clientHeight,
        docEl.scrollHeight,
        docEl.clientHeight,
        bodyHeight
      );
      const viewportArea = Math.max(1, viewportWidth * viewportHeight);
      const captureStyleId = "print-extension-fullpage-style";
      const previousCaptureStyle = document.getElementById(captureStyleId);

      if (previousCaptureStyle) {
        previousCaptureStyle.remove();
      }

      for (const element of document.querySelectorAll(
        "[data-print-extension-fullpage-hidden='true']"
      )) {
        if (element instanceof HTMLElement) {
          element.removeAttribute("data-print-extension-fullpage-hidden");
        }
      }

      function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
      }

      function getVisibleArea(rect) {
        const visibleWidth = Math.max(
          0,
          Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0)
        );
        const visibleHeight = Math.max(
          0,
          Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0)
        );

        return visibleWidth * visibleHeight;
      }

      function walkTree(root, visitor) {
        const stack = [];

        if (root instanceof Document) {
          if (root.documentElement) {
            stack.push(root.documentElement);
          }
        } else if (root instanceof ShadowRoot || root instanceof Element) {
          stack.push(...root.children);
        }

        while (stack.length) {
          const current = stack.pop();

          if (!(current instanceof HTMLElement)) {
            continue;
          }

          visitor(current);

          if (current.shadowRoot) {
            stack.push(...current.shadowRoot.children);
          }

          stack.push(...current.children);
        }
      }

      function hasScrollableOverflow(style) {
        return ["auto", "scroll", "overlay"].includes(style.overflowY);
      }

      function buildDocumentTarget() {
        return {
          type: "document",
          element: null,
          scrollHeight: documentHeight,
          scrollTop: window.scrollY,
          scrollLeft: window.scrollX,
          captureX: 0,
          captureY: 0,
          captureWidth: Math.max(1, docEl.clientWidth || viewportWidth),
          captureHeight: Math.max(1, docEl.clientHeight || viewportHeight),
          score: viewportArea,
        };
      }

      function buildElementTarget(element) {
        const rect = element.getBoundingClientRect();
        const visibleArea = getVisibleArea(rect);
        const coverage = visibleArea / viewportArea;

        if (coverage < 0.4) {
          return null;
        }

        if (element.clientWidth < viewportWidth * 0.35) {
          return null;
        }

        if (element.clientHeight < viewportHeight * 0.35) {
          return null;
        }

        const captureX = clamp(
          rect.left + element.clientLeft,
          0,
          Math.max(0, viewportWidth - 1)
        );
        const captureY = clamp(
          rect.top + element.clientTop,
          0,
          Math.max(0, viewportHeight - 1)
        );
        const captureWidth = Math.max(
          1,
          Math.min(element.clientWidth, viewportWidth - captureX)
        );
        const captureHeight = Math.max(
          1,
          Math.min(element.clientHeight, viewportHeight - captureY)
        );

        if (captureWidth < viewportWidth * 0.35 || captureHeight < viewportHeight * 0.35) {
          return null;
        }

        if (
          captureWidth < viewportWidth * 0.55 &&
          captureHeight < viewportHeight * 0.55
        ) {
          return null;
        }

        const scrollDepth = element.scrollHeight / Math.max(1, element.clientHeight);
        const edgeGap =
          captureX +
          captureY +
          Math.max(0, viewportWidth - captureX - captureWidth) +
          Math.max(0, viewportHeight - captureY - captureHeight);
        const edgeAffinity =
          1 - Math.min(0.65, edgeGap / Math.max(1, viewportWidth + viewportHeight));
        const score =
          visibleArea *
          Math.min(scrollDepth, 6) *
          (0.5 + coverage) *
          edgeAffinity;

        return {
          type: "element",
          element,
          scrollHeight: Math.max(element.scrollHeight, element.clientHeight),
          scrollTop: element.scrollTop,
          scrollLeft: element.scrollLeft,
          captureX,
          captureY,
          captureWidth,
          captureHeight,
          score,
        };
      }

      function findPrimaryScrollTarget() {
        let bestTarget = buildDocumentTarget();

        walkTree(document, (element) => {
          if (element === docEl || element === body) {
            return;
          }

          const style = window.getComputedStyle(element);

          if (!hasScrollableOverflow(style)) {
            return;
          }

          if (element.scrollHeight <= element.clientHeight + 1) {
            return;
          }

          if (
            style.display === "none" ||
            style.visibility === "hidden" ||
            Number.parseFloat(style.opacity || "1") === 0
          ) {
            return;
          }

          const candidate = buildElementTarget(element);

          if (!candidate) {
            return;
          }

          if (candidate.score > bestTarget.score * 1.05) {
            bestTarget = candidate;
          }
        });

        return bestTarget;
      }

      function shouldPreserveForFirstSlice(element, rect) {
        const visibleWidth = Math.max(
          0,
          Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0)
        );
        const widthCoverage = visibleWidth / Math.max(1, viewportWidth);
        const isNearTop = rect.top <= Math.max(24, viewportHeight * 0.18);
        const isVisibleAtTop = rect.bottom > 0;
        const isWideHeader = widthCoverage >= 0.45;
        const isReasonableHeight = rect.height <= viewportHeight * 0.32;

        return isNearTop && isVisibleAtTop && isWideHeader && isReasonableHeight;
      }

      const scrollTarget = findPrimaryScrollTarget();
      const captureStyle = document.createElement("style");
      captureStyle.id = captureStyleId;
      captureStyle.textContent = `
        [data-print-extension-fullpage-hidden="true"] {
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
        html[data-print-extension-fullpage-capturing="true"],
        html[data-print-extension-fullpage-capturing="true"] *,
        html[data-print-extension-fullpage-capturing="true"] *::before,
        html[data-print-extension-fullpage-capturing="true"] *::after {
          animation-delay: 0s !important;
          animation-duration: 0s !important;
          animation-play-state: paused !important;
          caret-color: transparent !important;
          transition-delay: 0s !important;
          transition-duration: 0s !important;
        }
      `;
      document.documentElement.appendChild(captureStyle);

      docEl.setAttribute("data-print-extension-fullpage-capturing", "true");

      const hiddenElements = [];
      const deferredHiddenElements = [];
      const protectedElements = new Set([docEl]);

      if (body) {
        protectedElements.add(body);
      }

      if (scrollTarget.element instanceof HTMLElement) {
        let current = scrollTarget.element;

        while (current) {
          protectedElements.add(current);

          const rootNode = current.getRootNode();

          if (rootNode instanceof ShadowRoot) {
            current = rootNode.host instanceof HTMLElement ? rootNode.host : null;
          } else {
            current = current.parentElement;
          }
        }
      }

      walkTree(document, (element) => {
        if (protectedElements.has(element)) {
          return;
        }

        if (scrollTarget.element instanceof HTMLElement && element.contains(scrollTarget.element)) {
          return;
        }

        if (element.closest("[data-print-extension-fullpage-hidden='true']")) {
          return;
        }

        const computedStyle = window.getComputedStyle(element);

        if (
          computedStyle.position !== "fixed" &&
          computedStyle.position !== "sticky"
        ) {
          return;
        }

        if (
          computedStyle.display === "none" ||
          computedStyle.visibility === "hidden" ||
          Number.parseFloat(computedStyle.opacity || "1") === 0
        ) {
          return;
        }

        const rect = element.getBoundingClientRect();

        if (rect.width < 1 || rect.height < 1) {
          return;
        }

        if (shouldPreserveForFirstSlice(element, rect)) {
          deferredHiddenElements.push(element);
          return;
        }

        element.setAttribute("data-print-extension-fullpage-hidden", "true");
        hiddenElements.push(element);
      });

      window.__printExtensionFullPageState = {
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        documentElementScrollBehavior: docEl.style.scrollBehavior || "",
        bodyScrollBehavior: body ? body.style.scrollBehavior || "" : "",
        scrollTarget,
        hiddenElements,
        deferredHiddenElements,
      };

      docEl.style.scrollBehavior = "auto";

      if (body) {
        body.style.scrollBehavior = "auto";
      }

      return {
        viewportWidth,
        viewportHeight,
        contentViewportWidth: scrollTarget.captureWidth,
        contentViewportHeight: scrollTarget.captureHeight,
        captureX: scrollTarget.captureX,
        captureY: scrollTarget.captureY,
        documentWidth,
        documentHeight: scrollTarget.scrollHeight,
        originalScrollX: window.scrollX,
        originalScrollY: window.scrollY,
      };
    }
  );

  return state;
}

async function hideDeferredFixedElements(tabId) {
  await executeInTab(
    tabId,
    () =>
      new Promise((resolve) => {
        const session = window.__printExtensionFullPageState || null;

        if (!session || !Array.isArray(session.deferredHiddenElements)) {
          resolve();
          return;
        }

        if (!Array.isArray(session.hiddenElements)) {
          session.hiddenElements = [];
        }

        for (const element of session.deferredHiddenElements) {
          if (!(element instanceof HTMLElement)) {
            continue;
          }

          element.setAttribute("data-print-extension-fullpage-hidden", "true");
          session.hiddenElements.push(element);
        }

        session.deferredHiddenElements = [];

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            window.setTimeout(resolve, 80);
          });
        });
      })
  );
}

async function restoreFullPageCapture(tabId, pageState) {
  if (!pageState) {
    return;
  }

  await executeInTab(
    tabId,
    ({ scrollX, scrollY }) => {
      const session = window.__printExtensionFullPageState || null;
      const docEl = document.documentElement;
      const body = document.body;

      if (session) {
        docEl.style.scrollBehavior = session.documentElementScrollBehavior || "";

        if (body) {
          body.style.scrollBehavior = session.bodyScrollBehavior || "";
        }

        if (
          session.scrollTarget &&
          session.scrollTarget.type === "element" &&
          session.scrollTarget.element instanceof HTMLElement
        ) {
          session.scrollTarget.element.scrollTo({
            left: session.scrollTarget.scrollLeft || 0,
            top: session.scrollTarget.scrollTop || 0,
            behavior: "auto",
          });
        }

        if (Array.isArray(session.hiddenElements)) {
          for (const element of session.hiddenElements) {
            if (element instanceof HTMLElement) {
              element.removeAttribute("data-print-extension-fullpage-hidden");
            }
          }
        }

        const captureStyle = document.getElementById("print-extension-fullpage-style");

        if (captureStyle) {
          captureStyle.remove();
        }

        docEl.removeAttribute("data-print-extension-fullpage-capturing");
        delete window.__printExtensionFullPageState;
      }

      window.scrollTo({
        left: scrollX,
        top: scrollY,
        behavior: "auto",
      });
    },
    [
      {
        scrollX: pageState.originalScrollX,
        scrollY: pageState.originalScrollY,
      },
    ]
  );
}

function buildFullPageSlices(documentHeight, viewportHeight) {
  const slices = [];
  let startY = 0;

  while (startY < documentHeight) {
    const scrollY = Math.min(startY, Math.max(0, documentHeight - viewportHeight));
    const cropOffsetY = Math.max(0, startY - scrollY);
    const sliceHeight = Math.min(
      viewportHeight - cropOffsetY,
      documentHeight - startY
    );

    slices.push({
      scrollY,
      startY,
      cropOffsetY,
      sliceHeight,
    });

    startY += sliceHeight;
  }

  return slices;
}

async function drawSliceOnCanvas(context, dataUrl, slice, metrics) {
  const sourceBlob = await fetchDataUrlAsBlob(dataUrl);
  const imageBitmap = await createImageBitmap(sourceBlob);

  try {
    const sourceX = Math.max(0, metrics.sourceCaptureX || 0);
    const sourceY = Math.max(
      0,
      (metrics.sourceCaptureY || 0) + Math.round(slice.cropOffsetY * metrics.scaleY)
    );
    const targetY = Math.max(0, Math.round(slice.startY * metrics.scaleY));
    const sourceWidth = Math.min(
      Math.max(1, imageBitmap.width - sourceX),
      Math.max(1, metrics.sourceCaptureWidth)
    );
    const targetHeight = Math.min(
      metrics.stitchedHeight - targetY,
      Math.max(1, Math.round(slice.sliceHeight * metrics.scaleY))
    );
    const sourceHeight = Math.min(
      targetHeight,
      Math.max(1, imageBitmap.height - sourceY)
    );

    if (targetHeight < 1 || sourceHeight < 1) {
      return;
    }

    context.drawImage(
      imageBitmap,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      targetY,
      metrics.stitchedWidth,
      sourceHeight
    );
  } finally {
    imageBitmap.close();
  }
}

async function scrollTabTo(tabId, scrollX, scrollY) {
  await executeInTab(
    tabId,
    ({ scrollX: nextScrollX, scrollY: nextScrollY }) =>
      new Promise((resolve) => {
        const session = window.__printExtensionFullPageState || null;
        const target = session && session.scrollTarget;

        if (target && target.type === "element" && target.element instanceof HTMLElement) {
          target.element.scrollTo({
            left: nextScrollX,
            top: nextScrollY,
            behavior: "auto",
          });
        } else {
          window.scrollTo({
            left: nextScrollX,
            top: nextScrollY,
            behavior: "auto",
          });
        }

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            window.setTimeout(resolve, 140);
          });
        });
      }),
    [
      {
        scrollX,
        scrollY,
      },
    ]
  );
}

async function executeInTab(tabId, func, args) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func,
    args: args || [],
  });

  if (!Array.isArray(results) || !results.length) {
    throw new Error(t("service.error.captureTab"));
  }

  return results[0].result;
}

async function captureVisibleTabImage(tabId) {
  const tab = await chrome.tabs.get(tabId);

  if (!tab || typeof tab.windowId !== "number") {
    throw new Error(t("service.error.tabWindow"));
  }

  const dataUrl = await queueVisibleTabCapture(async () => {
    await waitForVisibleCaptureSlot();
    return captureVisibleTabDataUrl(tab.windowId);
  });

  if (!dataUrl) {
    throw new Error(t("service.error.visibleCaptureEmpty"));
  }

  const dimensions = await getImageDimensions(dataUrl);

  return {
    dataUrl,
    width: dimensions.width,
    height: dimensions.height,
  };
}

function queueVisibleTabCapture(task) {
  const scheduledTask = visibleCaptureQueue.then(task, task);

  visibleCaptureQueue = scheduledTask.catch(() => {
    // noop
  });

  return scheduledTask;
}

async function waitForVisibleCaptureSlot() {
  const elapsedMs = Date.now() - lastVisibleCaptureAt;
  const waitMs = Math.max(0, visibleCaptureIntervalMs - elapsedMs);

  if (waitMs > 0) {
    await delay(waitMs);
  }
}

async function captureVisibleTabDataUrl(windowId) {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(windowId, {
      format: "png",
    });

    lastVisibleCaptureAt = Date.now();
    return dataUrl;
  } catch (error) {
    if (!isVisibleCaptureQuotaError(error)) {
      throw error;
    }

    await delay(visibleCaptureIntervalMs);

    const dataUrl = await chrome.tabs.captureVisibleTab(windowId, {
      format: "png",
    });

    lastVisibleCaptureAt = Date.now();
    return dataUrl;
  }
}

function isVisibleCaptureQuotaError(error) {
  const message = normalizeError(error);
  return message.includes("MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND");
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function getImageDimensions(dataUrl) {
  const blob = await fetchDataUrlAsBlob(dataUrl);
  const imageBitmap = await createImageBitmap(blob);

  try {
    return {
      width: imageBitmap.width,
      height: imageBitmap.height,
    };
  } finally {
    imageBitmap.close();
  }
}

async function cropImageDataUrl(dataUrl, cropRect) {
  const sourceBlob = await fetchDataUrlAsBlob(dataUrl);
  const imageBitmap = await createImageBitmap(sourceBlob);
  const safeCropRect = clampCropRect(cropRect, imageBitmap.width, imageBitmap.height);
  const canvas = new OffscreenCanvas(safeCropRect.width, safeCropRect.height);
  const context = canvas.getContext("2d");

  if (!context) {
    imageBitmap.close();
    throw new Error(t("service.error.cropCanvas"));
  }

  context.drawImage(
    imageBitmap,
    safeCropRect.x,
    safeCropRect.y,
    safeCropRect.width,
    safeCropRect.height,
    0,
    0,
    safeCropRect.width,
    safeCropRect.height
  );
  imageBitmap.close();

  const blob = await canvas.convertToBlob({
    type: "image/png",
  });

  return blobToDataUrl(blob);
}

function clampCropRect(rect, sourceWidth, sourceHeight) {
  const x = Math.max(0, Math.min(Math.round(rect.x), sourceWidth - 1));
  const y = Math.max(0, Math.min(Math.round(rect.y), sourceHeight - 1));
  const width = Math.max(1, Math.min(Math.round(rect.width), sourceWidth - x));
  const height = Math.max(1, Math.min(Math.round(rect.height), sourceHeight - y));

  return {
    x,
    y,
    width,
    height,
  };
}

async function fetchDataUrlAsBlob(dataUrl) {
  const response = await fetch(dataUrl);

  if (!response.ok) {
    throw new Error(t("service.error.readImage"));
  }

  return response.blob();
}

async function blobToDataUrl(blob) {
  const buffer = await blob.arrayBuffer();
  const base64 = arrayBufferToBase64(buffer);
  const contentType = blob.type || "image/png";
  return `data:${contentType};base64,${base64}`;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 32768;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function storeCaptureAndOpenEditor(dataUrl, metadata) {
  const captureId = `capture-${Date.now()}-${crypto.randomUUID()}`;

  await CaptureStore.saveCapture({
    id: captureId,
    dataUrl,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    metadata,
  });

  CaptureStore.prune(6).catch(() => {
    // noop
  });

  await openEditorWindowForCapture(captureId);
}

async function openErrorWindow(message) {
  const editorUrl = chrome.runtime.getURL(`editor.html?error=${encodeURIComponent(message)}`);

  await chrome.windows.create({
    url: editorUrl,
    type: "popup",
    width: 760,
    height: 520,
  });
}

async function withCaptureLock(tabId, task) {
  if (captureLocks.has(tabId)) {
    throw new Error(t("service.error.captureInProgress"));
  }

  captureLocks.add(tabId);

  try {
    return await task();
  } finally {
    captureLocks.delete(tabId);
  }
}

function startCaptureSession(tabId, operation) {
  const session = {
    tabId,
    operation,
    cancelRequested: false,
    progress: 0,
  };

  captureSessions.set(tabId, session);
  return session;
}

function finishCaptureSession(tabId) {
  captureSessions.delete(tabId);
}

function assertCaptureActive(session) {
  if (session && session.cancelRequested) {
    throw new Error(t("service.error.captureCancelled"));
  }
}

async function notifyCaptureProgress(session, progress, message) {
  if (!session) {
    return;
  }

  session.progress = progress;

  try {
    await chrome.runtime.sendMessage({
      type: "CAPTURE_PROGRESS",
      operation: session.operation,
      tabId: session.tabId,
      progress,
      message,
    });
  } catch (error) {
    // noop
  }
}

function getCaptureSliceProgress(index, total) {
  if (!total) {
    return 90;
  }

  return Math.min(94, Math.max(10, Math.round(10 + (index / total) * 82)));
}

async function openEditorWindowForCapture(captureId) {
  const editorUrl = chrome.runtime.getURL(`editor.html?captureId=${encodeURIComponent(captureId)}`);

  await chrome.windows.create({
    url: editorUrl,
    type: "popup",
    width: 1360,
    height: 920,
  });
}

function validateTabId(tabId) {
  if (typeof tabId !== "number") {
    throw new Error(t("service.error.activeTabNotFound"));
  }
}

function validateRegion(region) {
  if (!region) {
    throw new Error(t("service.error.regionNotReceived"));
  }

  if (!Number.isFinite(region.x) || region.x < 0) {
    throw new Error(t("service.error.invalidX"));
  }

  if (!Number.isFinite(region.y) || region.y < 0) {
    throw new Error(t("service.error.invalidY"));
  }

  if (!Number.isFinite(region.width) || region.width < 1) {
    throw new Error(t("service.error.invalidWidth"));
  }

  if (!Number.isFinite(region.height) || region.height < 1) {
    throw new Error(t("service.error.invalidHeight"));
  }

  if (!Number.isFinite(region.viewportWidth) || region.viewportWidth < 1) {
    throw new Error(t("service.error.invalidViewportWidth"));
  }

  if (!Number.isFinite(region.viewportHeight) || region.viewportHeight < 1) {
    throw new Error(t("service.error.invalidViewportHeight"));
  }
}

function sanitizeCoordinate(value) {
  return Math.max(0, Math.round(value * 100) / 100);
}

function sanitizeClipValue(value) {
  return Math.max(1, Math.round(value * 100) / 100);
}

function normalizeError(error) {
  if (!error) {
    return t("common.errorUnexpectedCapture");
  }

  if (typeof error === "string") {
    return error;
  }

  if (error.message) {
    return error.message;
  }

  return t("common.errorUnexpectedCapture");
}
