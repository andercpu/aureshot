(function () {
  if (window.__printExtensionContentLoaded) {
    return;
  }

  window.__printExtensionContentLoaded = true;

  const MIN_SELECTION_SIZE = 36;
  const i18n = globalThis.PrintExtensionI18n;
  let destroySelectionSession = null;

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.type) {
      return undefined;
    }

    if (message.type === "PRINT_EXTENSION_PING") {
      sendResponse({ ok: true });
      return undefined;
    }

    if (message.type === "START_REGION_SELECTION") {
      startRegionSelection().catch(() => {
        // noop
      });
      sendResponse({ ok: true });
      return undefined;
    }

    return undefined;
  });

  async function startRegionSelection() {
    if (typeof destroySelectionSession === "function") {
      destroySelectionSession();
      destroySelectionSession = null;
    }

    const currentLanguage = await i18n.getCurrentLanguage();
    const t = (key, params) => i18n.t(key, params, currentLanguage);

    const overlay = document.createElement("div");
    overlay.id = "print-extension-overlay";
    overlay.innerHTML = `
      <div class="pe-hint">
        <span class="pe-hint-title">${escapeHtml(t("content.selection.hintTitle"))}</span>
        <span class="pe-hint-copy">${escapeHtml(t("content.selection.hintCopy"))}</span>
      </div>
      <div class="pe-mask" data-mask="top"></div>
      <div class="pe-mask" data-mask="left"></div>
      <div class="pe-mask" data-mask="right"></div>
      <div class="pe-mask" data-mask="bottom"></div>
      <div class="pe-selection" data-toolbar-position="top">
        <div class="pe-toolbar">
          <span class="pe-toolbar-label">${escapeHtml(t("content.selection.toolbarLabel"))}</span>
          <button type="button" class="pe-toolbar-button pe-toolbar-button--primary" data-action="capture">${escapeHtml(t("content.selection.capture"))}</button>
          <button type="button" class="pe-toolbar-button pe-toolbar-button--secondary" data-action="cancel">${escapeHtml(t("content.selection.cancel"))}</button>
        </div>
        <span class="pe-handle" data-handle="nw"></span>
        <span class="pe-handle" data-handle="n"></span>
        <span class="pe-handle" data-handle="ne"></span>
        <span class="pe-handle" data-handle="e"></span>
        <span class="pe-handle" data-handle="se"></span>
        <span class="pe-handle" data-handle="s"></span>
        <span class="pe-handle" data-handle="sw"></span>
        <span class="pe-handle" data-handle="w"></span>
      </div>
    `;

    const selectionElement = overlay.querySelector(".pe-selection");
    const toolbarElement = overlay.querySelector(".pe-toolbar");
    const topMask = overlay.querySelector('[data-mask="top"]');
    const leftMask = overlay.querySelector('[data-mask="left"]');
    const rightMask = overlay.querySelector('[data-mask="right"]');
    const bottomMask = overlay.querySelector('[data-mask="bottom"]');
    const toolbarLabel = overlay.querySelector(".pe-toolbar-label");
    const captureButton = overlay.querySelector('[data-action="capture"]');
    const cancelButton = overlay.querySelector('[data-action="cancel"]');

    let selectionRect = null;
    let interaction = null;

    document.documentElement.appendChild(overlay);

    const keyHandler = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        teardown();
        return;
      }

      if (event.key === "Enter" && selectionRect) {
        event.preventDefault();
        confirmSelection();
      }
    };

    const clickHandler = (event) => {
      const actionTarget = event.target.closest("[data-action]");

      if (!actionTarget) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (actionTarget.dataset.action === "capture") {
        confirmSelection();
        return;
      }

      teardown();
    };

    const wheelHandler = (event) => {
      event.preventDefault();
    };

    const pointerDownHandler = (event) => {
      if (event.button !== 0) {
        return;
      }

      if (event.target.closest("[data-action]")) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const point = toViewportPoint(event);
      const handle = event.target.closest("[data-handle]");

      if (handle && selectionRect) {
        interaction = {
          type: "resize",
          handle: handle.dataset.handle,
          originX: point.x,
          originY: point.y,
          baseRect: { ...selectionRect },
        };
      } else if (selectionRect && isInsideRect(point, selectionRect) && !event.target.closest(".pe-toolbar")) {
        interaction = {
          type: "move",
          originX: point.x,
          originY: point.y,
          baseRect: { ...selectionRect },
        };
      } else {
        const clampedX = clamp(point.x, 0, viewportWidth);
        const clampedY = clamp(point.y, 0, viewportHeight);
        interaction = {
          type: "draw",
          originX: clampedX,
          originY: clampedY,
        };
        selectionRect = {
          x: clampedX,
          y: clampedY,
          width: 0,
          height: 0,
        };
      }

      overlay.setPointerCapture(event.pointerId);
      updateSelectionVisual();
    };

    const pointerMoveHandler = (event) => {
      if (!interaction) {
        return;
      }

      event.preventDefault();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const point = toViewportPoint(event);

      if (interaction.type === "draw") {
        selectionRect = normalizeRect(
          interaction.originX,
          interaction.originY,
          clamp(point.x, 0, viewportWidth),
          clamp(point.y, 0, viewportHeight)
        );
      } else if (interaction.type === "move") {
        const deltaX = point.x - interaction.originX;
        const deltaY = point.y - interaction.originY;
        const nextX = clamp(interaction.baseRect.x + deltaX, 0, viewportWidth - interaction.baseRect.width);
        const nextY = clamp(interaction.baseRect.y + deltaY, 0, viewportHeight - interaction.baseRect.height);

        selectionRect = {
          ...selectionRect,
          x: nextX,
          y: nextY,
        };
      } else if (interaction.type === "resize") {
        selectionRect = resizeFromHandle(
          interaction.baseRect,
          interaction.handle,
          clamp(point.x, 0, viewportWidth),
          clamp(point.y, 0, viewportHeight)
        );
      }

      updateSelectionVisual();
    };

    const pointerUpHandler = (event) => {
      if (!interaction) {
        return;
      }

      event.preventDefault();
      interaction = null;

      if (
        selectionRect &&
        (selectionRect.width < MIN_SELECTION_SIZE || selectionRect.height < MIN_SELECTION_SIZE)
      ) {
        selectionRect = null;
      }

      updateSelectionVisual();
      releasePointerCaptureSafe(event.pointerId);
    };

    function confirmSelection() {
      if (!selectionRect) {
        return;
      }

      overlay.classList.add("is-capturing");

      const region = {
        x: roundValue(selectionRect.x),
        y: roundValue(selectionRect.y),
        width: roundValue(selectionRect.width),
        height: roundValue(selectionRect.height),
        viewportWidth: roundValue(window.innerWidth),
        viewportHeight: roundValue(window.innerHeight),
        pageX: roundValue(window.scrollX + selectionRect.x),
        pageY: roundValue(window.scrollY + selectionRect.y),
      };

      teardown(true);

      window.setTimeout(() => {
        chrome.runtime.sendMessage({
          type: "REGION_SELECTION_CONFIRMED",
          region,
        }).catch(() => {
          // noop
        });
      }, 140);
    }

    function updateSelectionVisual() {
      const hasSelection = Boolean(selectionRect);
      overlay.classList.toggle("has-selection", hasSelection);

      if (!hasSelection) {
        selectionElement.style.display = "none";
        resetMasks();
        return;
      }

      selectionElement.style.display = "block";
      selectionElement.style.left = `${selectionRect.x}px`;
      selectionElement.style.top = `${selectionRect.y}px`;
      selectionElement.style.width = `${selectionRect.width}px`;
      selectionElement.style.height = `${selectionRect.height}px`;
      toolbarLabel.textContent = t("content.selection.size", {
        width: Math.round(selectionRect.width),
        height: Math.round(selectionRect.height),
      });
      captureButton.disabled =
        selectionRect.width < MIN_SELECTION_SIZE || selectionRect.height < MIN_SELECTION_SIZE;
      positionToolbarWithinViewport();
      updateMasks();
    }

    function positionToolbarWithinViewport() {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      toolbarElement.style.left = "0px";
      toolbarElement.style.right = "auto";

      const toolbarWidth = Math.max(toolbarElement.offsetWidth, 1);
      const toolbarHeight = Math.max(toolbarElement.offsetHeight, 1);
      const availableAbove = selectionRect.y;
      const availableBelow = viewportHeight - (selectionRect.y + selectionRect.height);
      let toolbarPosition = "top";

      if (availableAbove >= toolbarHeight + 16) {
        toolbarPosition = "top";
      } else if (availableBelow >= toolbarHeight + 16) {
        toolbarPosition = "bottom";
      } else {
        toolbarPosition = "inside";
      }

      selectionElement.dataset.toolbarPosition = toolbarPosition;

      const preferredLeft = selectionRect.width >= toolbarWidth
        ? 0
        : Math.min(0, selectionRect.width - toolbarWidth);
      const minLeft = 8 - selectionRect.x;
      const maxLeft = viewportWidth - 8 - selectionRect.x - toolbarWidth;
      const clampedLeft = clamp(preferredLeft, minLeft, maxLeft);

      toolbarElement.style.left = `${Math.round(clampedLeft)}px`;
    }

    function teardown(isSilent) {
      overlay.removeEventListener("click", clickHandler, true);
      overlay.removeEventListener("wheel", wheelHandler, { passive: false });
      overlay.removeEventListener("pointerdown", pointerDownHandler, true);
      overlay.removeEventListener("pointermove", pointerMoveHandler, true);
      overlay.removeEventListener("pointerup", pointerUpHandler, true);
      overlay.removeEventListener("pointercancel", pointerUpHandler, true);
      document.removeEventListener("keydown", keyHandler, true);

      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }

      if (!isSilent) {
        destroySelectionSession = null;
      }
    }

    function releasePointerCaptureSafe(pointerId) {
      if (typeof pointerId !== "number") {
        return;
      }

      try {
        overlay.releasePointerCapture(pointerId);
      } catch (error) {
        // noop
      }
    }

    overlay.addEventListener("click", clickHandler, true);
    overlay.addEventListener("wheel", wheelHandler, { passive: false });
    overlay.addEventListener("pointerdown", pointerDownHandler, true);
    overlay.addEventListener("pointermove", pointerMoveHandler, true);
    overlay.addEventListener("pointerup", pointerUpHandler, true);
    overlay.addEventListener("pointercancel", pointerUpHandler, true);
    document.addEventListener("keydown", keyHandler, true);

    destroySelectionSession = () => teardown();

    function updateMasks() {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const rightEdge = selectionRect.x + selectionRect.width;
      const bottomEdge = selectionRect.y + selectionRect.height;

      topMask.style.left = "0px";
      topMask.style.top = "0px";
      topMask.style.width = `${viewportWidth}px`;
      topMask.style.height = `${selectionRect.y}px`;

      leftMask.style.left = "0px";
      leftMask.style.top = `${selectionRect.y}px`;
      leftMask.style.width = `${selectionRect.x}px`;
      leftMask.style.height = `${selectionRect.height}px`;

      rightMask.style.left = `${rightEdge}px`;
      rightMask.style.top = `${selectionRect.y}px`;
      rightMask.style.width = `${Math.max(0, viewportWidth - rightEdge)}px`;
      rightMask.style.height = `${selectionRect.height}px`;

      bottomMask.style.left = "0px";
      bottomMask.style.top = `${bottomEdge}px`;
      bottomMask.style.width = `${viewportWidth}px`;
      bottomMask.style.height = `${Math.max(0, viewportHeight - bottomEdge)}px`;
    }

  function resetMasks() {
      topMask.style.width = "0px";
      topMask.style.height = "0px";
      leftMask.style.width = "0px";
      leftMask.style.height = "0px";
      rightMask.style.width = "0px";
      rightMask.style.height = "0px";
      bottomMask.style.width = "0px";
      bottomMask.style.height = "0px";
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function isInsideRect(point, rect) {
    return (
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
    );
  }

  function resizeFromHandle(baseRect, handle, pointerX, pointerY) {
    let left = baseRect.x;
    let top = baseRect.y;
    let right = baseRect.x + baseRect.width;
    let bottom = baseRect.y + baseRect.height;

    if (handle.includes("w")) {
      left = clamp(pointerX, 0, right - MIN_SELECTION_SIZE);
    }

    if (handle.includes("e")) {
      right = clamp(pointerX, left + MIN_SELECTION_SIZE, window.innerWidth);
    }

    if (handle.includes("n")) {
      top = clamp(pointerY, 0, bottom - MIN_SELECTION_SIZE);
    }

    if (handle.includes("s")) {
      bottom = clamp(pointerY, top + MIN_SELECTION_SIZE, window.innerHeight);
    }

    return {
      x: left,
      y: top,
      width: Math.max(MIN_SELECTION_SIZE, right - left),
      height: Math.max(MIN_SELECTION_SIZE, bottom - top),
    };
  }

  function normalizeRect(startX, startY, endX, endY) {
    const left = Math.min(startX, endX);
    const top = Math.min(startY, endY);
    const right = Math.max(startX, endX);
    const bottom = Math.max(startY, endY);

    return {
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
    };
  }

  function toViewportPoint(event) {
    return {
      x: event.clientX,
      y: event.clientY,
    };
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function roundValue(value) {
    return Math.round(value * 100) / 100;
  }
})();
