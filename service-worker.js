bootstrapWorkerDependencies();

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

function bootstrapWorkerDependencies() {
  const candidateScripts = ["service-i18n.js", "i18n.js"];
  let lastBootstrapError = null;

  for (const scriptPath of candidateScripts) {
    try {
      importScripts(scriptPath);
      lastBootstrapError = null;
      break;
    } catch (error) {
      lastBootstrapError = error;
    }
  }

  if (!globalThis.PrintExtensionI18n) {
    globalThis.PrintExtensionI18n = createWorkerFallbackI18n();

    if (lastBootstrapError) {
      console.warn("Worker i18n bootstrap fallback activated.", lastBootstrapError);
    }
  }

  importScripts("capture-store.js");
}

function createWorkerFallbackI18n() {
  const STORAGE_KEY = "preferredLanguage";
  const FALLBACK_LANGUAGE = "en";
  let fallbackLanguage = getWorkerBrowserLanguage();

  function normalizeLanguage(language) {
    const value = String(language || "").trim().toLowerCase();

    if (!value) {
      return FALLBACK_LANGUAGE;
    }

    if (value === "pt" || value.startsWith("pt-br")) {
      return "pt-BR";
    }

    if (value.startsWith("pt-pt")) {
      return "pt-PT";
    }

    if (value === "es" || value.startsWith("es-")) {
      return "es";
    }

    if (value === "fr" || value.startsWith("fr-")) {
      return "fr";
    }

    return "en";
  }

  function formatMessage(template, params) {
    return String(template || "").replace(/\{(\w+)\}/g, (match, key) => {
      if (params && Object.prototype.hasOwnProperty.call(params, key)) {
        return String(params[key]);
      }

      return match;
    });
  }

  function getMessage(key) {
    return (
      {
        "common.errorUnexpectedCapture": "An unexpected error occurred during capture.",
        "service.error.captureCancelled": "Capture canceled.",
      }[key] || key
    );
  }

  return {
    getDefaultLanguage() {
      return fallbackLanguage;
    },
    getCurrentLanguageSync() {
      return fallbackLanguage;
    },
    async getCurrentLanguage() {
      try {
        const result = await new Promise((resolve, reject) => {
          if (!chrome?.storage?.local) {
            resolve({});
            return;
          }

          chrome.storage.local.get(STORAGE_KEY, (value) => {
            if (chrome.runtime && chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
              return;
            }

            resolve(value || {});
          });
        });

        fallbackLanguage = normalizeLanguage(result[STORAGE_KEY] || fallbackLanguage);
      } catch (error) {
        fallbackLanguage = normalizeLanguage(fallbackLanguage);
      }

      return fallbackLanguage;
    },
    normalizeLanguage,
    populateLanguageSelect() {
      return;
    },
    setCurrentLanguage(language) {
      fallbackLanguage = normalizeLanguage(language || fallbackLanguage);
      return fallbackLanguage;
    },
    async setLanguage(language) {
      fallbackLanguage = normalizeLanguage(language || fallbackLanguage);
      return fallbackLanguage;
    },
    t(key, params, language) {
      const nextLanguage = normalizeLanguage(language || fallbackLanguage);
      fallbackLanguage = nextLanguage;
      return formatMessage(getMessage(key), params);
    },
  };
}

function getWorkerBrowserLanguage() {
  if (globalThis.chrome?.i18n && typeof globalThis.chrome.i18n.getUILanguage === "function") {
    return globalThis.chrome.i18n.getUILanguage();
  }

  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language;
  }

  return "en";
}

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

    const estimatedSlices = buildFullPageSlices(
      pageState.documentHeight,
      pageState.contentViewportHeight
    );

    if (!estimatedSlices.length) {
      throw new Error(t("service.error.buildFullPage"));
    }

    await notifyCaptureProgress(session, 10, t("service.progress.capturingSlices"));

    let scaleX = 0;
    let scaleY = 0;
    let stitchedWidth = 0;
    let stitchedHeight = 0;
    let canvas = null;
    let context = null;
    let nextStartY = 0;
    let currentDocumentHeight = pageState.documentHeight;
    let capturedSlices = 0;

    while (nextStartY < currentDocumentHeight - 0.5) {
      assertCaptureActive(session);

      const sliceMetrics = await prepareSliceCapture(tabId, 0, nextStartY, {
        preserveTopFixed: capturedSlices === 0,
      });

      assertCaptureActive(session);
      currentDocumentHeight = Math.max(
        currentDocumentHeight,
        Math.max(1, sliceMetrics.documentHeight || 0)
      );

      const sliceStartY =
        sliceMetrics.scrollY > nextStartY + 2 ? sliceMetrics.scrollY : nextStartY;
      const cropOffsetY = Math.max(0, sliceStartY - sliceMetrics.scrollY);
      const visibleSliceHeight = Math.max(0, sliceMetrics.captureHeight - cropOffsetY);
      const sliceHeight = Math.min(
        visibleSliceHeight,
        Math.max(0, currentDocumentHeight - sliceStartY)
      );

      if (sliceHeight < 1) {
        throw new Error(t("service.error.buildFullPage"));
      }

      const capture = await captureVisibleTabImage(tabId);

      if (!scaleX || !scaleY) {
        scaleX = capture.width / sliceMetrics.viewportWidth;
        scaleY = capture.height / sliceMetrics.viewportHeight;
      }

      const requiredWidth = Math.max(1, Math.round(sliceMetrics.captureWidth * scaleX));
      const requiredHeight = Math.max(1, Math.round(currentDocumentHeight * scaleY));

      if (!canvas || !context) {
        canvas = new OffscreenCanvas(requiredWidth, requiredHeight);
        context = canvas.getContext("2d");

        if (!context) {
          throw new Error(t("service.error.prepareFullPageCanvas"));
        }
      } else {
        const resizedCanvasState = ensureCanvasSize(
          canvas,
          context,
          Math.max(stitchedWidth, requiredWidth),
          Math.max(stitchedHeight, requiredHeight)
        );
        canvas = resizedCanvasState.canvas;
        context = resizedCanvasState.context;
      }

      stitchedWidth = canvas.width;
      stitchedHeight = canvas.height;

      const slice = {
        startY: sliceStartY,
        cropOffsetY,
        sliceHeight,
        captureX: Math.max(0, Math.round(sliceMetrics.captureX * scaleX)),
        captureY: Math.max(0, Math.round(sliceMetrics.captureY * scaleY)),
        captureWidth: Math.max(1, Math.round(sliceMetrics.captureWidth * scaleX)),
      };

      await drawSliceOnCanvas(context, capture.dataUrl, slice, {
        scaleX,
        scaleY,
        stitchedWidth,
        stitchedHeight,
      });

      capturedSlices += 1;
      nextStartY = sliceStartY + sliceHeight;

      await notifyCaptureProgress(
        session,
        getCaptureSliceProgress(
          capturedSlices,
          Math.max(estimatedSlices.length, capturedSlices)
        ),
        t("service.progress.assemblingSlice", {
          index: capturedSlices,
          total: Math.max(estimatedSlices.length, capturedSlices),
        })
      );
    }

    if (!canvas) {
      throw new Error(t("service.error.prepareFullPageCanvas"));
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
      const previousSession = window.__printExtensionFullPageState || null;

      if (previousCaptureStyle) {
        previousCaptureStyle.remove();
      }

      if (
        previousSession &&
        previousSession.mutationObserver &&
        typeof previousSession.mutationObserver.disconnect === "function"
      ) {
        previousSession.mutationObserver.disconnect();
      }

      for (const element of document.querySelectorAll(
        "[data-print-extension-fullpage-hidden='true']"
      )) {
        if (element instanceof HTMLElement) {
          element.removeAttribute("data-print-extension-fullpage-hidden");
        }
      }

      for (const element of document.querySelectorAll(
        "[data-print-extension-fullpage-preserve='true']"
      )) {
        if (element instanceof HTMLElement) {
          element.removeAttribute("data-print-extension-fullpage-preserve");
        }
      }

      docEl.removeAttribute("data-print-extension-fullpage-freeze");
      delete window.__printExtensionFullPageState;

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

      const scrollTarget = findPrimaryScrollTarget();
      const captureStyle = document.createElement("style");
      captureStyle.id = captureStyleId;
      captureStyle.textContent = `
        [data-print-extension-fullpage-hidden="true"] {
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
        [data-print-extension-fullpage-preserve="true"] {
          visibility: visible !important;
          opacity: 1 !important;
        }
        html[data-print-extension-fullpage-capturing="true"],
        html[data-print-extension-fullpage-capturing="true"] *,
        html[data-print-extension-fullpage-capturing="true"] *::before,
        html[data-print-extension-fullpage-capturing="true"] *::after {
          scroll-behavior: auto !important;
          scroll-snap-type: none !important;
          scroll-snap-align: none !important;
          scroll-snap-stop: normal !important;
          overflow-anchor: none !important;
        }
        html[data-print-extension-fullpage-freeze="true"],
        html[data-print-extension-fullpage-freeze="true"] *,
        html[data-print-extension-fullpage-freeze="true"] *::before,
        html[data-print-extension-fullpage-freeze="true"] *::after {
          animation-play-state: paused !important;
          caret-color: transparent !important;
          transition-property: none !important;
        }
      `;
      document.documentElement.appendChild(captureStyle);

      docEl.setAttribute("data-print-extension-fullpage-capturing", "true");

      const mutationObserver = new MutationObserver(() => {
        const session = window.__printExtensionFullPageState || null;

        if (session) {
          session.lastMutationAt = performance.now();
        }
      });

      mutationObserver.observe(docEl, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["class", "style", "src", "srcset", "sizes", "loading", "hidden"],
      });

      window.__printExtensionFullPageState = {
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        documentElementScrollBehavior: docEl.style.scrollBehavior || "",
        bodyScrollBehavior: body ? body.style.scrollBehavior || "" : "",
        scrollTarget,
        hiddenElements: [],
        preservedElements: [],
        deferredHiddenElements: [],
        lastMutationAt: performance.now(),
        mutationObserver,
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

function ensureCanvasSize(canvas, context, width, height) {
  if (canvas.width >= width && canvas.height >= height) {
    return {
      canvas,
      context,
    };
  }

  const nextCanvas = new OffscreenCanvas(
    Math.max(canvas.width, width),
    Math.max(canvas.height, height)
  );
  const nextContext = nextCanvas.getContext("2d");

  if (!nextContext) {
    throw new Error(t("service.error.prepareFullPageCanvas"));
  }

  nextContext.drawImage(canvas, 0, 0);

  return {
    canvas: nextCanvas,
    context: nextContext,
  };
}

async function prepareSliceCapture(tabId, scrollX, scrollY, options) {
  return executeInTab(
    tabId,
    ({ scrollX: nextScrollX, scrollY: nextScrollY, preserveTopFixed }) =>
      new Promise((resolve) => {
        const session = window.__printExtensionFullPageState || null;
        const docEl = document.documentElement;
        const body = document.body;
        const target =
          session &&
          session.scrollTarget &&
          session.scrollTarget.type === "element" &&
          session.scrollTarget.element instanceof HTMLElement
            ? session.scrollTarget.element
            : null;

        function clamp(value, min, max) {
          return Math.min(max, Math.max(min, value));
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

        function getDocumentHeight() {
          if (target) {
            return Math.max(target.scrollHeight, target.clientHeight);
          }

          const scrollingElement = document.scrollingElement || docEl;
          const bodyHeight = body
            ? Math.max(body.scrollHeight, body.offsetHeight, body.clientHeight)
            : 0;

          return Math.max(
            scrollingElement.scrollHeight,
            scrollingElement.clientHeight,
            docEl.scrollHeight,
            docEl.clientHeight,
            bodyHeight
          );
        }

        function getSliceMetrics() {
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;

          if (target) {
            const rect = target.getBoundingClientRect();
            const captureX = clamp(
              rect.left + target.clientLeft,
              0,
              Math.max(0, viewportWidth - 1)
            );
            const captureY = clamp(
              rect.top + target.clientTop,
              0,
              Math.max(0, viewportHeight - 1)
            );
            const captureWidth = Math.max(
              1,
              Math.min(target.clientWidth, viewportWidth - captureX)
            );
            const captureHeight = Math.max(
              1,
              Math.min(target.clientHeight, viewportHeight - captureY)
            );

            return {
              scrollX: target.scrollLeft,
              scrollY: target.scrollTop,
              documentHeight: getDocumentHeight(),
              viewportWidth,
              viewportHeight,
              captureX,
              captureY,
              captureWidth,
              captureHeight,
            };
          }

          return {
            scrollX: window.scrollX,
            scrollY: window.scrollY,
            documentHeight: getDocumentHeight(),
            viewportWidth,
            viewportHeight,
            captureX: 0,
            captureY: 0,
            captureWidth: Math.max(1, docEl.clientWidth || viewportWidth),
            captureHeight: Math.max(1, docEl.clientHeight || viewportHeight),
          };
        }

        function getElementIdentityText(element) {
          const role = element.getAttribute("role") || "";
          const ariaLabel = element.getAttribute("aria-label") || "";
          const dataTestId = element.getAttribute("data-testid") || "";
          const className =
            typeof element.className === "string" ? element.className : "";

          return [
            element.tagName.toLowerCase(),
            element.id || "",
            className,
            role,
            ariaLabel,
            dataTestId,
          ]
            .join(" ")
            .toLowerCase();
        }

        function hasStrongNavigationSemantics(element) {
          const tagName = element.tagName.toLowerCase();
          const role = (element.getAttribute("role") || "").toLowerCase();

          return (
            tagName === "header" ||
            tagName === "nav" ||
            ["banner", "navigation", "menubar", "toolbar", "tablist"].includes(role)
          );
        }

        function hasWeakNavigationSignal(element) {
          const identity = getElementIdentityText(element);

          return /\b(header|navbar|nav|navigation|menu|menubar|toolbar|topbar|masthead|site-header|main-menu|mega-menu)\b/i.test(
            identity
          );
        }

        function hasNavigationDescendant(element) {
          return Boolean(
            element.querySelector(
              "header, nav, [role='banner'], [role='navigation'], [role='menubar'], [role='toolbar'], [role='tablist']"
            )
          );
        }

        function countVisibleInteractiveChildren(element) {
          const interactiveElements = element.querySelectorAll(
            "a[href], button, [role='button'], [role='link'], [role='menuitem'], [role='tab'], input:not([type='hidden']), select, textarea"
          );
          let visibleCount = 0;

          for (const candidate of interactiveElements) {
            if (!(candidate instanceof HTMLElement)) {
              continue;
            }

            const style = window.getComputedStyle(candidate);

            if (
              style.display === "none" ||
              style.visibility === "hidden" ||
              Number.parseFloat(style.opacity || "1") === 0
            ) {
              continue;
            }

            const rect = candidate.getBoundingClientRect();

            if (rect.width < 12 || rect.height < 12) {
              continue;
            }

            visibleCount += 1;

            if (visibleCount >= 6) {
              return visibleCount;
            }
          }

          return visibleCount;
        }

        function shouldPreserveForFirstSlice(element, rect) {
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          const visibleWidth = Math.max(
            0,
            Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0)
          );
          const widthCoverage = visibleWidth / Math.max(1, viewportWidth);
          const strongSignal =
            hasStrongNavigationSemantics(element) || hasNavigationDescendant(element);
          const weakSignal = hasWeakNavigationSignal(element);
          const interactiveCount = countVisibleInteractiveChildren(element);
          const isMenuLike = interactiveCount >= 3;
          const isNearTop = rect.top <= Math.max(40, viewportHeight * 0.16);
          const isVisibleAtTop = rect.bottom > 0;
          const isReasonableHeight =
            rect.height <= viewportHeight * (strongSignal || weakSignal ? 0.78 : 0.36);
          const semanticCoverage = widthCoverage >= 0.22;
          const broadCoverage = widthCoverage >= 0.42;
          const compactHeader =
            widthCoverage >= 0.1 && rect.height <= viewportHeight * 0.2;

          if (!isNearTop || !isVisibleAtTop || !isReasonableHeight) {
            return false;
          }

          if (strongSignal) {
            return semanticCoverage || (compactHeader && interactiveCount >= 2) || isMenuLike;
          }

          if (weakSignal) {
            return (
              (semanticCoverage &&
                (interactiveCount >= 2 || rect.height <= viewportHeight * 0.18)) ||
              (broadCoverage && isMenuLike)
            );
          }

          return broadCoverage && isMenuLike;
        }

        function buildProtectedElements() {
          const protectedElements = new Set([docEl]);

          if (body) {
            protectedElements.add(body);
          }

          if (target) {
            let current = target;

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

          return protectedElements;
        }

        function trackHiddenElement(element) {
          if (!Array.isArray(session.hiddenElements)) {
            session.hiddenElements = [];
          }

          if (!session.hiddenElements.includes(element)) {
            session.hiddenElements.push(element);
          }
        }

        function trackPreservedElement(element) {
          if (!Array.isArray(session.preservedElements)) {
            session.preservedElements = [];
          }

          if (!session.preservedElements.includes(element)) {
            session.preservedElements.push(element);
          }

          element.removeAttribute("data-print-extension-fullpage-hidden");
          element.setAttribute("data-print-extension-fullpage-preserve", "true");
        }

        function hideFloatingElements() {
          if (!session) {
            return;
          }

          if (!Array.isArray(session.deferredHiddenElements)) {
            session.deferredHiddenElements = [];
          }

          if (!preserveTopFixed && session.deferredHiddenElements.length) {
            for (const element of session.deferredHiddenElements) {
              if (!(element instanceof HTMLElement)) {
                continue;
              }

              element.removeAttribute("data-print-extension-fullpage-preserve");
              element.setAttribute("data-print-extension-fullpage-hidden", "true");
              trackHiddenElement(element);
            }

            session.deferredHiddenElements = [];
          }

          const protectedElements = buildProtectedElements();

          walkTree(document, (element) => {
            if (protectedElements.has(element)) {
              return;
            }

            if (target && element.contains(target)) {
              return;
            }

            if (element.closest("[data-print-extension-fullpage-hidden='true']")) {
              return;
            }

            if (element.closest("[data-print-extension-fullpage-preserve='true']")) {
              return;
            }

            if (
              Array.isArray(session.hiddenElements) &&
              session.hiddenElements.includes(element)
            ) {
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

            if (preserveTopFixed && shouldPreserveForFirstSlice(element, rect)) {
              trackPreservedElement(element);

              if (!session.deferredHiddenElements.includes(element)) {
                session.deferredHiddenElements.push(element);
              }

              return;
            }

            element.removeAttribute("data-print-extension-fullpage-preserve");
            element.setAttribute("data-print-extension-fullpage-hidden", "true");
            trackHiddenElement(element);
          });
        }

        function isNearViewport(rect) {
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          const verticalMargin = Math.max(96, viewportHeight * 0.25);
          const horizontalMargin = Math.max(64, viewportWidth * 0.15);

          return (
            rect.bottom >= -verticalMargin &&
            rect.top <= viewportHeight + verticalMargin &&
            rect.right >= -horizontalMargin &&
            rect.left <= viewportWidth + horizontalMargin
          );
        }

        function countPendingVisibleMedia() {
          let pending = 0;

          for (const image of document.images) {
            if (!(image instanceof HTMLImageElement)) {
              continue;
            }

            if (!isNearViewport(image.getBoundingClientRect())) {
              continue;
            }

            if (!image.complete) {
              pending += 1;

              if (pending >= 8) {
                return pending;
              }
            }
          }

          for (const video of document.querySelectorAll("video")) {
            if (!(video instanceof HTMLVideoElement)) {
              continue;
            }

            if (!isNearViewport(video.getBoundingClientRect())) {
              continue;
            }

            if (video.readyState < 2) {
              pending += 1;

              if (pending >= 8) {
                return pending;
              }
            }
          }

          return pending;
        }

        function finalizeSlicePreparation() {
          hideFloatingElements();

          requestAnimationFrame(() => {
            docEl.setAttribute("data-print-extension-fullpage-freeze", "true");

            requestAnimationFrame(() => {
              resolve(getSliceMetrics());
            });
          });
        }

        if (!session) {
          finalizeSlicePreparation();
          return;
        }

        docEl.removeAttribute("data-print-extension-fullpage-freeze");

        if (target) {
          target.scrollTo({
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

        const startedAt = performance.now();
        let stableTicks = 0;
        let lastScrollX = null;
        let lastScrollY = null;

        function waitForStableViewport() {
          const metrics = getSliceMetrics();
          const maxScrollX = target
            ? Math.max(0, target.scrollWidth - target.clientWidth)
            : Math.max(
                0,
                Math.max(
                  (document.scrollingElement || docEl).scrollWidth,
                  docEl.scrollWidth,
                  body ? body.scrollWidth : 0
                ) - metrics.captureWidth
              );
          const maxScrollY = Math.max(0, metrics.documentHeight - metrics.captureHeight);
          const expectedScrollX = Math.min(nextScrollX, maxScrollX);
          const expectedScrollY = Math.min(nextScrollY, maxScrollY);
          const scrollStable =
            lastScrollX !== null &&
            lastScrollY !== null &&
            Math.abs(metrics.scrollX - lastScrollX) <= 1 &&
            Math.abs(metrics.scrollY - lastScrollY) <= 1;
          const targetReached =
            Math.abs(metrics.scrollX - expectedScrollX) <= 2 &&
            Math.abs(metrics.scrollY - expectedScrollY) <= 2;
          const quietEnough =
            performance.now() - (session.lastMutationAt || 0) >= 220;
          const fontsReady =
            !document.fonts || document.fonts.status === "loaded";
          const pendingVisibleMedia = countPendingVisibleMedia();

          if (scrollStable && targetReached && quietEnough && fontsReady && pendingVisibleMedia === 0) {
            stableTicks += 1;
          } else {
            stableTicks = 0;
          }

          lastScrollX = metrics.scrollX;
          lastScrollY = metrics.scrollY;

          if (stableTicks >= 2 || performance.now() - startedAt >= 2800) {
            finalizeSlicePreparation();
            return;
          }

          const nextDelay = pendingVisibleMedia > 0 || !fontsReady ? 90 : 45;

          window.setTimeout(() => {
            requestAnimationFrame(waitForStableViewport);
          }, nextDelay);
        }

        requestAnimationFrame(() => {
          requestAnimationFrame(waitForStableViewport);
        });
      }),
    [
      {
        scrollX,
        scrollY,
        preserveTopFixed: Boolean(options && options.preserveTopFixed),
      },
    ]
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

        if (Array.isArray(session.preservedElements)) {
          for (const element of session.preservedElements) {
            if (element instanceof HTMLElement) {
              element.removeAttribute("data-print-extension-fullpage-preserve");
            }
          }
        }

        if (
          session.mutationObserver &&
          typeof session.mutationObserver.disconnect === "function"
        ) {
          session.mutationObserver.disconnect();
        }

        for (const element of document.querySelectorAll(
          "[data-print-extension-fullpage-hidden='true']"
        )) {
          if (element instanceof HTMLElement) {
            element.removeAttribute("data-print-extension-fullpage-hidden");
          }
        }

        for (const element of document.querySelectorAll(
          "[data-print-extension-fullpage-preserve='true']"
        )) {
          if (element instanceof HTMLElement) {
            element.removeAttribute("data-print-extension-fullpage-preserve");
          }
        }

        const captureStyle = document.getElementById("print-extension-fullpage-style");

        if (captureStyle) {
          captureStyle.remove();
        }

        docEl.removeAttribute("data-print-extension-fullpage-capturing");
        docEl.removeAttribute("data-print-extension-fullpage-freeze");
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
    const sourceX = Math.max(0, slice.captureX || 0);
    const sourceY = Math.max(
      0,
      (slice.captureY || 0) + Math.round(slice.cropOffsetY * metrics.scaleY)
    );
    const targetY = Math.max(0, Math.round(slice.startY * metrics.scaleY));
    const targetWidth = Math.min(
      metrics.stitchedWidth,
      Math.max(1, slice.captureWidth || metrics.stitchedWidth)
    );
    const sourceWidth = Math.min(
      Math.max(1, imageBitmap.width - sourceX),
      Math.max(1, slice.captureWidth || metrics.stitchedWidth)
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
      targetWidth,
      sourceHeight
    );
  } finally {
    imageBitmap.close();
  }
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
