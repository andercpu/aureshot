const baseCanvas = document.getElementById("baseCanvas");
const annotationCanvas = document.getElementById("annotationCanvas");
const canvasStage = document.getElementById("editorCanvasStage");
const canvasViewport = document.getElementById("editorCanvasViewport");
const shapeSelectionOverlay = document.getElementById("shapeSelectionOverlay");
const emptyState = document.getElementById("editorEmptyState");
const captureMeta = document.getElementById("captureMeta");
const editorNotice = document.getElementById("editorNotice");
const helpButton = document.getElementById("helpButton");
const helpModal = document.getElementById("helpModal");
const closeHelpButton = document.getElementById("closeHelpButton");
const editorLanguageSelect = document.getElementById("editorLanguageSelect");
const colorPicker = document.getElementById("colorPicker");
const strokeWidthRange = document.getElementById("strokeWidthRange");
const strokeWidthValue = document.getElementById("strokeWidthValue");
const undoButton = document.getElementById("undoButton");
const redoButton = document.getElementById("redoButton");
const deleteActionButton = document.getElementById("deleteActionButton");
const fitWidthButton = document.getElementById("fitWidthButton");
const zoomValue = document.getElementById("zoomValue");
const copyButton = document.getElementById("copyButton");
const saveProjectButton = document.getElementById("saveProjectButton");
const applyCropButton = document.getElementById("applyCropButton");
const downloadButton = document.getElementById("downloadButton");
const toolButtons = Array.from(document.querySelectorAll("[data-tool]"));
const i18n = globalThis.PrintExtensionI18n;

const baseContext = baseCanvas.getContext("2d");
const annotationContext = annotationCanvas.getContext("2d");

const HANDLE_SIZE_SCREEN_PX = 12;
const HANDLE_TOLERANCE_MULTIPLIER = 1.45;
const MIN_BOX_SIZE = 12;
const AUTOSAVE_DELAY_MS = 380;
const DEFAULT_TEXT_SIZE = 22;
const ARROW_HEAD_ANGLE = Math.PI / 7;

const BOX_TOOLS = new Set(["circle", "rectangle", "blur", "redact", "crop"]);
const EFFECT_TOOLS = new Set(["blur", "redact"]);
const FREEHAND_TOOLS = new Set(["marker", "eraser"]);
const SHAPE_TOOLS = new Set(["circle", "rectangle", "arrow", "blur", "redact", "crop"]);
const SELECTABLE_TOOLS = new Set(["circle", "rectangle", "arrow", "text", "pin", "blur", "redact", "crop"]);

const editorState = {
  actions: [],
  undoStack: [],
  redoStack: [],
  draftAction: null,
  currentTool: "marker",
  currentColor: colorPicker.value,
  strokeWidth: Number(strokeWidthRange.value),
  activePointerId: null,
  isDrawing: false,
  isPanning: false,
  panPointerId: null,
  panStartClientX: 0,
  panStartClientY: 0,
  panStartScrollLeft: 0,
  panStartScrollTop: 0,
  isSpacePressed: false,
  actionResizeSession: null,
  actionMoveSession: null,
  selectedActionId: null,
  captureRecord: null,
  baseImageDataUrl: "",
  nextPinNumber: 1,
  zoom: 1,
  minZoom: 0.1,
  maxZoom: 6,
  autoFitEnabled: true,
  saveTimer: null,
  noticeTimer: null,
  isApplyingSnapshot: false,
  textEditorSession: null,
};

let textEditorElement = null;
let currentLanguage = i18n.getDefaultLanguage();

applyEditorTranslations();

document.addEventListener("DOMContentLoaded", () => {
  initializeEditor().catch((error) => {
    showEmptyState(t("editor.error.openCaptureTitle"), normalizeError(error));
  });
});

async function initializeEditor() {
  currentLanguage = await i18n.getCurrentLanguage();
  applyEditorTranslations();
  bindUiEvents();
  ensureTextEditorElement();
  bindLanguageEvents();
  await loadCaptureFromQuery();
}

function bindUiEvents() {
  toolButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveTool(button.dataset.tool);
    });
  });

  colorPicker.addEventListener("input", () => {
    editorState.currentColor = colorPicker.value;
    scheduleProjectSave();
  });

  strokeWidthRange.addEventListener("input", () => {
    editorState.strokeWidth = Number(strokeWidthRange.value);
    updateStrokeWidthValue();
    scheduleProjectSave();
  });

  undoButton.addEventListener("click", () => {
    undoLastAction().catch((error) => {
      showNotice(normalizeError(error), true);
    });
  });

  redoButton.addEventListener("click", () => {
    redoLastAction().catch((error) => {
      showNotice(normalizeError(error), true);
    });
  });

  deleteActionButton.addEventListener("click", () => {
    deleteSelectedAction();
  });

  fitWidthButton.addEventListener("click", () => {
    editorState.autoFitEnabled = true;
    fitCanvasToViewportWidth();
  });

  copyButton.addEventListener("click", () => {
    copyAnnotatedImage().catch((error) => {
      showNotice(normalizeError(error), true);
    });
  });

  saveProjectButton.addEventListener("click", () => {
    saveProjectNow(true).catch((error) => {
      showNotice(normalizeError(error), true);
    });
  });

  applyCropButton.addEventListener("click", () => {
    applySelectedCrop().catch((error) => {
      showNotice(normalizeError(error), true);
    });
  });

  downloadButton.addEventListener("click", () => {
    downloadAnnotatedImage().catch((error) => {
      showNotice(normalizeError(error), true);
    });
  });

  helpButton.addEventListener("click", openHelpModal);
  closeHelpButton.addEventListener("click", closeHelpModal);
  helpModal.addEventListener("click", (event) => {
    if (event.target instanceof HTMLElement && event.target.dataset.helpClose === "true") {
      closeHelpModal();
    }
  });

  annotationCanvas.addEventListener("pointerdown", handlePointerDown);
  annotationCanvas.addEventListener("pointermove", handlePointerMove);
  annotationCanvas.addEventListener("pointerup", handlePointerUp);
  annotationCanvas.addEventListener("pointercancel", handlePointerUp);
  canvasStage.addEventListener("wheel", handleCanvasWheel, { passive: false });

  window.addEventListener("keydown", handleKeyboardShortcuts);
  window.addEventListener("keyup", handleKeyboardShortcutRelease);
  window.addEventListener("resize", handleWindowResize);
}

function bindLanguageEvents() {
  editorLanguageSelect.addEventListener("change", async () => {
    currentLanguage = await i18n.setLanguage(editorLanguageSelect.value);
    applyEditorTranslations();
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes.preferredLanguage) {
      return;
    }

    currentLanguage = i18n.normalizeLanguage(changes.preferredLanguage.newValue);
    applyEditorTranslations();
  });
}

function applyEditorTranslations() {
  i18n.applyTranslations(document, currentLanguage);
  i18n.populateLanguageSelect(editorLanguageSelect, currentLanguage);
  updateStrokeWidthValue();
  updateZoomValue();

  if (textEditorElement) {
    textEditorElement.placeholder = t("editor.text.placeholder");
  }

  if (editorState.captureRecord) {
    setCaptureMeta(editorState.captureRecord);
  }
}

function ensureTextEditorElement() {
  if (textEditorElement) {
    return textEditorElement;
  }

  textEditorElement = document.createElement("textarea");
  textEditorElement.className = "editor-text-editor is-hidden";
  textEditorElement.spellcheck = false;
  textEditorElement.placeholder = t("editor.text.placeholder");

  textEditorElement.addEventListener("blur", () => {
    commitTextEditor().catch((error) => {
      showNotice(normalizeError(error), true);
    });
  });

  textEditorElement.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelTextEditor();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      commitTextEditor().catch((error) => {
        showNotice(normalizeError(error), true);
      });
    }
  });

  canvasStage.appendChild(textEditorElement);
  return textEditorElement;
}

async function loadCaptureFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const errorMessage = params.get("error");

  if (errorMessage) {
    showEmptyState(t("editor.error.openCaptureTitle"), errorMessage);
    return;
  }

  const captureId = params.get("captureId");

  if (!captureId) {
    showEmptyState(t("editor.error.noCaptureTitle"), t("editor.error.noCaptureCopy"));
    return;
  }

  try {
    const captureRecord = await CaptureStore.getCapture(captureId);

    if (!captureRecord || !captureRecord.dataUrl) {
      throw new Error(t("editor.error.captureNotFound"));
    }

    editorState.captureRecord = captureRecord;
    hydrateProjectState(captureRecord);
    await loadBaseImageToCanvas(editorState.baseImageDataUrl, {
      preserveZoom: false,
      skipRender: true,
    });

    setCaptureMeta(captureRecord);
    updateToolbarState();
    setActiveTool(editorState.currentTool, { skipSave: true });
    showCanvas();

    requestAnimationFrame(() => {
      const restoredProject = captureRecord.editorState;

      if (restoredProject && Number.isFinite(restoredProject.zoom)) {
        editorState.autoFitEnabled = false;
        setZoom(clampZoom(restoredProject.zoom));
      } else {
        editorState.autoFitEnabled = true;
        fitCanvasToViewportWidth();
      }

      renderEditorCanvas();

      if (captureRecord.editorState && Array.isArray(captureRecord.editorState.actions)) {
        showNotice(t("editor.notice.draftRestored"));
      }
    });
  } catch (error) {
    showEmptyState(t("editor.error.openCaptureTitle"), normalizeError(error));
  }
}

function hydrateProjectState(captureRecord) {
  const storedProject = captureRecord.editorState || null;
  const storedActions = storedProject && Array.isArray(storedProject.actions)
    ? cloneActions(storedProject.actions)
    : [];

  editorState.actions = storedActions;
  editorState.undoStack = [];
  editorState.redoStack = [];
  editorState.selectedActionId = null;
  editorState.baseImageDataUrl = (storedProject && storedProject.baseImageDataUrl) || captureRecord.dataUrl;
  editorState.nextPinNumber = computeNextPinNumber(storedActions);
  editorState.currentColor = (storedProject && storedProject.currentColor) || colorPicker.value;
  editorState.strokeWidth = Number.isFinite(storedProject && storedProject.strokeWidth)
    ? storedProject.strokeWidth
    : Number(strokeWidthRange.value);
  editorState.currentTool = (storedProject && storedProject.currentTool) || "marker";

  colorPicker.value = editorState.currentColor;
  strokeWidthRange.value = String(editorState.strokeWidth);
  updateStrokeWidthValue();
}

async function loadBaseImageToCanvas(dataUrl, options = {}) {
  const image = await createImage(dataUrl);
  const preserveZoom = options.preserveZoom !== false;
  const nextZoom = preserveZoom ? clampZoom(editorState.zoom || 1) : 1;

  editorState.baseImageDataUrl = dataUrl;

  baseCanvas.width = image.naturalWidth;
  baseCanvas.height = image.naturalHeight;
  annotationCanvas.width = image.naturalWidth;
  annotationCanvas.height = image.naturalHeight;

  baseContext.clearRect(0, 0, image.naturalWidth, image.naturalHeight);
  baseContext.drawImage(image, 0, 0);

  setZoom(nextZoom, {
    skipRender: true,
  });

  if (!options.skipRender) {
    renderEditorCanvas();
  }
}

function setCaptureMeta(captureRecord) {
  const metadata = captureRecord.metadata || {};
  const modeLabel = metadata.mode === "full-page" ? t("editor.meta.fullPage") : t("editor.meta.region");
  const dimensions = `${baseCanvas.width} x ${baseCanvas.height} px`;
  captureMeta.textContent = t("editor.meta.format", {
    mode: modeLabel,
    dimensions,
  });
}

function setActiveTool(tool, options = {}) {
  if (!tool) {
    return;
  }

  if (editorState.textEditorSession && tool !== "text") {
    cancelTextEditor();
  }

  editorState.currentTool = tool;

  if (!shouldKeepSelectionForTool(tool)) {
    editorState.selectedActionId = null;
  }

  if (editorState.isDrawing) {
    editorState.draftAction = null;
    editorState.isDrawing = false;
    editorState.activePointerId = null;
  }

  updateCanvasCursor();
  updateToolbarState();
  renderEditorCanvas();

  toolButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tool === tool);
  });

  if (!options.skipSave) {
    scheduleProjectSave();
  }
}

function shouldKeepSelectionForTool(tool) {
  if (tool === "move") {
    return true;
  }

  const selectedAction = getSelectedAction();
  return Boolean(selectedAction && selectedAction.tool === tool);
}

function handlePointerDown(event) {
  if (!baseCanvas.width || event.button !== 0) {
    return;
  }

  if (editorState.textEditorSession && event.target !== textEditorElement) {
    commitTextEditor().catch((error) => {
      showNotice(normalizeError(error), true);
    });
  }

  if (shouldPanInsteadOfDraw()) {
    startPan(event);
    return;
  }

  const point = getCanvasPoint(event);

  if (editorState.actionMoveSession || editorState.actionResizeSession) {
    return;
  }

  if (!FREEHAND_TOOLS.has(editorState.currentTool)) {
    const handleHit = getSelectedActionHandleHit(point);

    if (handleHit) {
      startActionResize(event, handleHit);
      return;
    }

    const hitAction = findSelectableActionAtPoint(point);

    if (hitAction) {
      if (hitAction.id === editorState.selectedActionId && isMovableAction(hitAction)) {
        startActionMove(event, hitAction, point);
      } else {
        editorState.selectedActionId = hitAction.id;
        updateToolbarState();
        renderEditorCanvas();
      }

      return;
    }

    editorState.selectedActionId = null;
    updateToolbarState();
  }

  if (editorState.currentTool === "text") {
    beginTextEditor(point);
    return;
  }

  if (editorState.currentTool === "pin") {
    createPinAction(point);
    return;
  }

  startDraftAction(event, point);
}

function handlePointerMove(event) {
  if (editorState.isPanning && editorState.panPointerId === event.pointerId) {
    event.preventDefault();
    canvasViewport.scrollLeft =
      editorState.panStartScrollLeft - (event.clientX - editorState.panStartClientX);
    canvasViewport.scrollTop =
      editorState.panStartScrollTop - (event.clientY - editorState.panStartClientY);
    return;
  }

  if (
    editorState.actionResizeSession &&
    editorState.actionResizeSession.pointerId === event.pointerId
  ) {
    event.preventDefault();
    updateActionResize(getCanvasPoint(event), event.shiftKey);
    return;
  }

  if (
    editorState.actionMoveSession &&
    editorState.actionMoveSession.pointerId === event.pointerId
  ) {
    event.preventDefault();
    updateActionMove(getCanvasPoint(event));
    return;
  }

  if (!editorState.isDrawing || editorState.activePointerId !== event.pointerId || !editorState.draftAction) {
    return;
  }

  const point = getCanvasPoint(event);
  updateDraftAction(point, event.shiftKey);
}

function handlePointerUp(event) {
  if (editorState.isPanning && editorState.panPointerId === event.pointerId) {
    editorState.isPanning = false;
    editorState.panPointerId = null;
    releasePointerCaptureSafely(event.pointerId);
    updateCanvasCursor();
    return;
  }

  if (
    editorState.actionResizeSession &&
    editorState.actionResizeSession.pointerId === event.pointerId
  ) {
    finishActionResize(event.pointerId);
    return;
  }

  if (
    editorState.actionMoveSession &&
    editorState.actionMoveSession.pointerId === event.pointerId
  ) {
    finishActionMove(event.pointerId);
    return;
  }

  if (!editorState.isDrawing || editorState.activePointerId !== event.pointerId) {
    return;
  }

  finalizeDraftAction(event.pointerId);
}

function startPan(event) {
  editorState.isPanning = true;
  editorState.panPointerId = event.pointerId;
  editorState.panStartClientX = event.clientX;
  editorState.panStartClientY = event.clientY;
  editorState.panStartScrollLeft = canvasViewport.scrollLeft;
  editorState.panStartScrollTop = canvasViewport.scrollTop;
  annotationCanvas.setPointerCapture(event.pointerId);
  updateCanvasCursor();
}

function startActionResize(event, handleHit) {
  editorState.actionResizeSession = {
    pointerId: event.pointerId,
    actionId: handleHit.actionId,
    handle: handleHit.handle,
    previousSnapshot: createSnapshot(),
    previousActions: cloneActions(editorState.actions),
  };

  annotationCanvas.setPointerCapture(event.pointerId);
}

function updateActionResize(point, shouldSnap) {
  const session = editorState.actionResizeSession;

  if (!session) {
    return;
  }

  const nextActions = cloneActions(session.previousActions);
  const action = nextActions.find((item) => item.id === session.actionId);

  if (!action) {
    return;
  }

  resizeBoxAction(action, session.handle, point, shouldSnap);
  editorState.actions = nextActions;
  renderEditorCanvas();
}

function finishActionResize(pointerId) {
  const session = editorState.actionResizeSession;

  if (!session) {
    return;
  }

  editorState.actionResizeSession = null;
  releasePointerCaptureSafely(pointerId);

  if (actionsAreDifferent(session.previousActions, editorState.actions)) {
    editorState.undoStack.push(session.previousSnapshot);
    editorState.redoStack = [];
    updateToolbarState();
    scheduleProjectSave();
  } else {
    editorState.actions = session.previousActions;
  }

  sanitizeSelection();
  renderEditorCanvas();
}

function startActionMove(event, action, point) {
  editorState.actionMoveSession = {
    pointerId: event.pointerId,
    actionId: action.id,
    originPoint: point,
    previousSnapshot: createSnapshot(),
    previousActions: cloneActions(editorState.actions),
  };

  annotationCanvas.setPointerCapture(event.pointerId);
}

function updateActionMove(point) {
  const session = editorState.actionMoveSession;

  if (!session) {
    return;
  }

  const nextActions = cloneActions(session.previousActions);
  const action = nextActions.find((item) => item.id === session.actionId);

  if (!action) {
    return;
  }

  moveActionByDelta(
    action,
    point.x - session.originPoint.x,
    point.y - session.originPoint.y
  );

  editorState.actions = nextActions;
  renderEditorCanvas();
}

function finishActionMove(pointerId) {
  const session = editorState.actionMoveSession;

  if (!session) {
    return;
  }

  editorState.actionMoveSession = null;
  releasePointerCaptureSafely(pointerId);

  if (actionsAreDifferent(session.previousActions, editorState.actions)) {
    editorState.undoStack.push(session.previousSnapshot);
    editorState.redoStack = [];
    updateToolbarState();
    scheduleProjectSave();
  } else {
    editorState.actions = session.previousActions;
  }

  sanitizeSelection();
  renderEditorCanvas();
}

function startDraftAction(event, point) {
  if (!isDrawableTool(editorState.currentTool)) {
    return;
  }

  editorState.isDrawing = true;
  editorState.activePointerId = event.pointerId;
  annotationCanvas.setPointerCapture(event.pointerId);

  if (FREEHAND_TOOLS.has(editorState.currentTool)) {
    editorState.draftAction = {
      id: createActionId(),
      tool: editorState.currentTool,
      color: editorState.currentColor,
      size: editorState.strokeWidth,
      points: [point],
    };
  } else {
    editorState.draftAction = {
      id: createActionId(),
      tool: editorState.currentTool,
      color: editorState.currentColor,
      size: resolveActionSize(editorState.currentTool),
      start: point,
      end: point,
    };
  }

  renderEditorCanvas();
}

function updateDraftAction(point, shouldSnap) {
  if (!editorState.draftAction) {
    return;
  }

  if (FREEHAND_TOOLS.has(editorState.draftAction.tool)) {
    editorState.draftAction.points.push(point);
  } else {
    editorState.draftAction.end = getSnappedEndPoint(
      editorState.draftAction.start,
      point,
      editorState.draftAction.tool,
      shouldSnap
    );
  }

  renderEditorCanvas();
}

function finalizeDraftAction(pointerId) {
  const draftAction = editorState.draftAction;

  editorState.isDrawing = false;
  editorState.activePointerId = null;
  editorState.draftAction = null;
  releasePointerCaptureSafely(pointerId);

  if (!isActionDrawable(draftAction)) {
    renderEditorCanvas();
    return;
  }

  const committedAction = normalizeAction(draftAction);
  commitActions([...editorState.actions, committedAction], {
    selectedActionId: isSelectableAction(committedAction) ? committedAction.id : null,
  });
}

function createPinAction(point) {
  const pinNumber = computeNextPinNumber(editorState.actions);
  const pinAction = {
    id: createActionId(),
    tool: "pin",
    color: editorState.currentColor,
    size: Math.max(10, editorState.strokeWidth),
    x: point.x,
    y: point.y,
    label: String(pinNumber),
  };
  const nextActions = [...editorState.actions, pinAction];

  commitActions(nextActions, {
    selectedActionId: pinAction.id,
    nextPinNumber: computeNextPinNumber(nextActions),
  });
}

function beginTextEditor(point, existingAction) {
  ensureTextEditorElement();

  const action = existingAction || getSelectedAction();
  const editingExisting = Boolean(action && action.tool === "text");
  const textAction = editingExisting
    ? action
    : {
        id: createActionId(),
        tool: "text",
        color: editorState.currentColor,
        size: resolveActionSize("text"),
        x: point.x,
        y: point.y,
        text: "",
      };

  const metrics = measureTextAction(textAction, textAction.text || "Texto");

  editorState.textEditorSession = {
    actionId: editingExisting ? textAction.id : null,
    action: textAction,
  };

  textEditorElement.value = editingExisting ? textAction.text : "";
  textEditorElement.style.color = textAction.color;
  textEditorElement.style.width = `${Math.max(180, Math.round(metrics.width * editorState.zoom) + 36)}px`;
  textEditorElement.style.height = `${Math.max(64, Math.round(metrics.height * editorState.zoom) + 28)}px`;
  textEditorElement.classList.remove("is-hidden");

  syncTextEditorPosition();

  requestAnimationFrame(() => {
    textEditorElement.focus();
    textEditorElement.select();
  });
}

function syncTextEditorPosition() {
  if (!editorState.textEditorSession || !textEditorElement || textEditorElement.classList.contains("is-hidden")) {
    return;
  }

  const action = editorState.textEditorSession.action;
  const zoom = Math.max(editorState.zoom, 0.1);

  textEditorElement.style.left = `${Math.round(action.x * zoom)}px`;
  textEditorElement.style.top = `${Math.round(action.y * zoom)}px`;
  textEditorElement.style.fontSize = `${Math.max(12, Math.round(action.size * zoom))}px`;
}

async function commitTextEditor() {
  if (!editorState.textEditorSession || !textEditorElement) {
    return;
  }

  const session = editorState.textEditorSession;
  const value = textEditorElement.value.trim();

  textEditorElement.classList.add("is-hidden");
  editorState.textEditorSession = null;

  if (!value) {
    if (session.actionId) {
      commitActions(
        editorState.actions.filter((action) => action.id !== session.actionId),
        {
          selectedActionId: null,
        }
      );
    } else {
      renderEditorCanvas();
    }

    return;
  }

  const nextAction = {
    ...session.action,
    color: editorState.currentColor,
    size: resolveActionSize("text", session.action.size),
    text: value,
  };

  if (session.actionId) {
    const nextActions = cloneActions(editorState.actions).map((action) =>
      action.id === session.actionId ? nextAction : action
    );

    commitActions(nextActions, {
      selectedActionId: session.actionId,
    });
    return;
  }

  commitActions([...editorState.actions, nextAction], {
    selectedActionId: nextAction.id,
  });
}

function cancelTextEditor() {
  if (!editorState.textEditorSession || !textEditorElement) {
    return;
  }

  textEditorElement.classList.add("is-hidden");
  editorState.textEditorSession = null;
  renderEditorCanvas();
}

function renderEditorCanvas() {
  if (!baseCanvas.width || !baseCanvas.height) {
    return;
  }

  const compositeCanvas = buildCompositeCanvas({
    includeDraft: true,
  });

  annotationContext.clearRect(0, 0, annotationCanvas.width, annotationCanvas.height);
  annotationContext.drawImage(compositeCanvas, 0, 0);

  syncSelectionOverlay();
  syncTextEditorPosition();
  updateToolbarState();
}

function buildCompositeCanvas(options = {}) {
  const compositeCanvas = document.createElement("canvas");
  compositeCanvas.width = baseCanvas.width;
  compositeCanvas.height = baseCanvas.height;

  const compositeContext = compositeCanvas.getContext("2d");
  const annotationLayer = document.createElement("canvas");
  annotationLayer.width = baseCanvas.width;
  annotationLayer.height = baseCanvas.height;
  const annotationLayerContext = annotationLayer.getContext("2d");

  const renderableActions = [];
  const effectActions = [];

  for (const action of editorState.actions) {
    if (action.tool === "crop") {
      continue;
    }

    if (EFFECT_TOOLS.has(action.tool)) {
      effectActions.push(action);
      continue;
    }

    renderableActions.push(action);
  }

  compositeContext.drawImage(baseCanvas, 0, 0);
  renderRenderableActions(annotationLayerContext, renderableActions);

  if (options.includeDraft && editorState.draftAction && !EFFECT_TOOLS.has(editorState.draftAction.tool)) {
    if (editorState.draftAction.tool === "crop") {
      drawCropGuide(annotationLayerContext, editorState.draftAction);
    } else {
      drawAction(annotationLayerContext, editorState.draftAction);
    }
  }

  compositeContext.drawImage(annotationLayer, 0, 0);
  applyEffectActions(compositeContext, effectActions);

  if (options.includeDraft && editorState.draftAction && EFFECT_TOOLS.has(editorState.draftAction.tool)) {
    applyEffectAction(compositeContext, editorState.draftAction);
  }

  return compositeCanvas;
}

function renderRenderableActions(context, actions) {
  actions.forEach((action) => {
    drawAction(context, action);
  });
}

function drawAction(context, action) {
  if (!action) {
    return;
  }

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = action.size || editorState.strokeWidth;

  if (action.tool === "eraser") {
    context.globalCompositeOperation = "destination-out";
    context.strokeStyle = "rgba(0, 0, 0, 1)";
    context.fillStyle = "rgba(0, 0, 0, 1)";
  } else {
    context.globalCompositeOperation = "source-over";
    context.strokeStyle = action.color || editorState.currentColor;
    context.fillStyle = action.color || editorState.currentColor;
  }

  switch (action.tool) {
    case "marker":
    case "eraser":
      drawFreehand(context, action);
      break;
    case "circle":
      drawEllipse(context, action);
      break;
    case "rectangle":
      drawRectangle(context, action);
      break;
    case "arrow":
      drawArrow(context, action);
      break;
    case "text":
      drawTextAction(context, action);
      break;
    case "pin":
      drawPinAction(context, action);
      break;
    default:
      break;
  }

  context.restore();
}

function drawFreehand(context, action) {
  const points = Array.isArray(action.points) ? action.points : [];

  if (!points.length) {
    return;
  }

  if (points.length === 1) {
    context.beginPath();
    context.arc(points[0].x, points[0].y, (action.size || 2) / 2, 0, Math.PI * 2);
    context.fill();
    return;
  }

  context.beginPath();
  context.moveTo(points[0].x, points[0].y);

  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index].x, points[index].y);
  }

  context.stroke();
}

function drawEllipse(context, action) {
  const bounds = getActionBounds(action);
  const centerX = (bounds.left + bounds.right) / 2;
  const centerY = (bounds.top + bounds.bottom) / 2;
  const radiusX = Math.max(bounds.width / 2, 1);
  const radiusY = Math.max(bounds.height / 2, 1);

  context.beginPath();
  context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
  context.stroke();
}

function drawRectangle(context, action) {
  const bounds = getActionBounds(action);

  context.beginPath();
  context.rect(bounds.left, bounds.top, bounds.width, bounds.height);
  context.stroke();
}

function drawArrow(context, action) {
  const geometry = getArrowGeometry(action);

  context.save();
  context.lineCap = "butt";
  context.beginPath();
  context.moveTo(geometry.start.x, geometry.start.y);
  context.lineTo(geometry.shaftEnd.x, geometry.shaftEnd.y);
  context.stroke();
  context.restore();

  context.beginPath();
  context.moveTo(geometry.tip.x, geometry.tip.y);
  context.lineTo(geometry.leftWing.x, geometry.leftWing.y);
  context.lineTo(geometry.rightWing.x, geometry.rightWing.y);
  context.closePath();
  context.fill();
}

function drawTextAction(context, action) {
  const metrics = measureTextAction(action, action.text);
  const lines = splitTextLines(action.text);

  context.fillStyle = action.color;
  context.font = getTextFont(action.size);
  context.textBaseline = "top";

  lines.forEach((line, index) => {
    context.fillText(line, action.x, action.y + index * metrics.lineHeight);
  });
}

function drawPinAction(context, action) {
  const radius = getPinRadius(action);

  context.save();
  context.fillStyle = action.color;
  context.strokeStyle = "#ffffff";
  context.lineWidth = Math.max(2, radius * 0.18);
  context.beginPath();
  context.arc(action.x, action.y, radius, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();

  context.save();
  context.fillStyle = "#ffffff";
  context.font = `700 ${Math.max(10, Math.round(radius * 0.95))}px ${getBodyFontStack()}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(String(action.label || ""), action.x, action.y + 0.5);
  context.restore();
}

function drawCropGuide(context, action) {
  const bounds = getActionBounds(action);

  context.save();
  context.setLineDash([10, 8]);
  context.lineWidth = 2;
  context.strokeStyle = "#121212";
  context.fillStyle = "rgba(18, 18, 18, 0.08)";
  context.fillRect(bounds.left, bounds.top, bounds.width, bounds.height);
  context.strokeRect(bounds.left, bounds.top, bounds.width, bounds.height);
  context.restore();
}

function applyEffectActions(context, actions) {
  actions.forEach((action) => {
    applyEffectAction(context, action);
  });
}

function applyEffectAction(context, action) {
  if (action.tool === "blur") {
    applyBlurAction(context, action);
    return;
  }

  if (action.tool === "redact") {
    const bounds = getActionBounds(action);
    context.save();
    context.fillStyle = "#121212";
    context.fillRect(bounds.left, bounds.top, bounds.width, bounds.height);
    context.restore();
  }
}

function applyBlurAction(context, action) {
  const bounds = getActionBounds(action);
  const width = Math.max(1, Math.round(bounds.width));
  const height = Math.max(1, Math.round(bounds.height));

  if (width < 1 || height < 1) {
    return;
  }

  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = width;
  sourceCanvas.height = height;

  const sourceContext = sourceCanvas.getContext("2d");
  sourceContext.drawImage(
    context.canvas,
    bounds.left,
    bounds.top,
    width,
    height,
    0,
    0,
    width,
    height
  );

  const tinyCanvas = document.createElement("canvas");
  tinyCanvas.width = Math.max(1, Math.round(width / 10));
  tinyCanvas.height = Math.max(1, Math.round(height / 10));

  const tinyContext = tinyCanvas.getContext("2d");
  tinyContext.imageSmoothingEnabled = true;
  tinyContext.drawImage(sourceCanvas, 0, 0, tinyCanvas.width, tinyCanvas.height);

  sourceContext.clearRect(0, 0, width, height);
  sourceContext.filter = "blur(8px)";
  sourceContext.drawImage(tinyCanvas, 0, 0, width, height);
  sourceContext.filter = "none";

  context.save();
  context.beginPath();
  context.rect(bounds.left, bounds.top, width, height);
  context.clip();
  context.drawImage(sourceCanvas, bounds.left, bounds.top);
  context.fillStyle = "rgba(255, 255, 255, 0.08)";
  context.fillRect(bounds.left, bounds.top, width, height);
  context.restore();
}

async function undoLastAction() {
  if (!editorState.undoStack.length || editorState.isApplyingSnapshot) {
    return;
  }

  const currentSnapshot = createSnapshot();
  const snapshot = editorState.undoStack.pop();
  editorState.redoStack.push(currentSnapshot);
  await applySnapshot(snapshot);
}

async function redoLastAction() {
  if (!editorState.redoStack.length || editorState.isApplyingSnapshot) {
    return;
  }

  const currentSnapshot = createSnapshot();
  const snapshot = editorState.redoStack.pop();
  editorState.undoStack.push(currentSnapshot);
  await applySnapshot(snapshot);
}

async function applySnapshot(snapshot) {
  editorState.isApplyingSnapshot = true;

  try {
    cancelTextEditor();

    editorState.actions = cloneActions(snapshot.actions);
    editorState.nextPinNumber = computeNextPinNumber(editorState.actions);
    editorState.selectedActionId = null;

    if (snapshot.baseImageDataUrl !== editorState.baseImageDataUrl) {
      await loadBaseImageToCanvas(snapshot.baseImageDataUrl, {
        preserveZoom: true,
        skipRender: true,
      });
    }

    editorState.baseImageDataUrl = snapshot.baseImageDataUrl;
    updateToolbarState();
    renderEditorCanvas();
    scheduleProjectSave();
  } finally {
    editorState.isApplyingSnapshot = false;
  }
}

function updateToolbarState() {
  const selectedAction = getSelectedAction();

  undoButton.disabled = editorState.undoStack.length === 0;
  redoButton.disabled = editorState.redoStack.length === 0;
  deleteActionButton.disabled = !selectedAction;
  applyCropButton.disabled = !selectedAction || selectedAction.tool !== "crop";
}

function handleKeyboardShortcuts(event) {
  if (event.key === "F1" || (event.shiftKey && event.key === "?") || event.key === "?") {
    event.preventDefault();

    if (isHelpModalOpen()) {
      closeHelpModal();
    } else {
      openHelpModal();
    }

    return;
  }

  if (event.key === "Escape" && isHelpModalOpen()) {
    event.preventDefault();
    closeHelpModal();
    return;
  }

  if (isHelpModalOpen()) {
    return;
  }

  if (event.code === "Space" && !isEditableTarget(event.target)) {
    event.preventDefault();

    if (!editorState.isSpacePressed) {
      editorState.isSpacePressed = true;
      updateCanvasCursor();
    }

    return;
  }

  const isCommand = event.ctrlKey || event.metaKey;
  const key = event.key.toLowerCase();

  if (isCommand && key === "z" && !event.shiftKey) {
    event.preventDefault();
    undoLastAction().catch((error) => {
      showNotice(normalizeError(error), true);
    });
    return;
  }

  if ((isCommand && key === "y") || (isCommand && event.shiftKey && key === "z")) {
    event.preventDefault();
    redoLastAction().catch((error) => {
      showNotice(normalizeError(error), true);
    });
    return;
  }

  if (isCommand && key === "s") {
    event.preventDefault();
    saveProjectNow(true).catch((error) => {
      showNotice(normalizeError(error), true);
    });
    return;
  }

  if (isCommand && event.shiftKey && key === "c") {
    event.preventDefault();
    copyAnnotatedImage().catch((error) => {
      showNotice(normalizeError(error), true);
    });
    return;
  }

  if (!isEditableTarget(event.target) && (event.key === "Delete" || event.key === "Backspace")) {
    event.preventDefault();
    deleteSelectedAction();
    return;
  }

  if (!isEditableTarget(event.target) && event.key === "Enter") {
    const selectedAction = getSelectedAction();

    if (editorState.currentTool === "text" && selectedAction && selectedAction.tool === "text") {
      event.preventDefault();
      beginTextEditor({ x: selectedAction.x, y: selectedAction.y }, selectedAction);
      return;
    }
  }

  if (isCommand || event.altKey || isEditableTarget(event.target)) {
    return;
  }

  if (key === "m") {
    setActiveTool("marker");
  } else if (key === "a") {
    setActiveTool("arrow");
  } else if (key === "t") {
    setActiveTool("text");
  } else if (key === "p") {
    setActiveTool("pin");
  } else if (key === "c") {
    setActiveTool("circle");
  } else if (key === "r") {
    setActiveTool("rectangle");
  } else if (key === "b") {
    setActiveTool("blur");
  } else if (key === "d") {
    setActiveTool("redact");
  } else if (key === "x") {
    setActiveTool("crop");
  } else if (key === "h" || key === "v") {
    setActiveTool("move");
  }
}

function handleKeyboardShortcutRelease(event) {
  if (isHelpModalOpen()) {
    return;
  }

  if (event.code !== "Space") {
    return;
  }

  if (!editorState.isSpacePressed) {
    return;
  }

  editorState.isSpacePressed = false;
  updateCanvasCursor();
}

function handleWindowResize() {
  if (!baseCanvas.width) {
    return;
  }

  if (editorState.autoFitEnabled) {
    fitCanvasToViewportWidth();
    return;
  }

  renderEditorCanvas();
}

async function downloadAnnotatedImage() {
  if (editorState.textEditorSession) {
    await commitTextEditor();
  }

  const exportCanvas = createExportCanvas();
  const link = document.createElement("a");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  link.href = exportCanvas.toDataURL("image/png");
  link.download = `${t("editor.download.filePrefix")}-${timestamp}.png`;
  link.click();
}

async function copyAnnotatedImage() {
  if (editorState.textEditorSession) {
    await commitTextEditor();
  }

  const exportCanvas = createExportCanvas();
  const blob = await canvasToBlob(exportCanvas);

  if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
    throw new Error(t("editor.error.clipboardUnavailable"));
  }

  await navigator.clipboard.write([
    new ClipboardItem({
      "image/png": blob,
    }),
  ]);

  showNotice(t("editor.notice.imageCopied"));
}

function createExportCanvas() {
  const exportCanvas = buildCompositeCanvas({
    includeDraft: false,
  });

  return exportCanvas;
}

function handleCanvasWheel(event) {
  if (!baseCanvas.width) {
    return;
  }

  if (!event.shiftKey) {
    return;
  }

  event.preventDefault();
  editorState.autoFitEnabled = false;

  const wheelDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
  const zoomFactor = wheelDelta < 0 ? 1.1 : 0.9;
  const nextZoom = clampZoom(editorState.zoom * zoomFactor);

  if (nextZoom === editorState.zoom) {
    return;
  }

  setZoom(nextZoom, {
    anchorClientX: event.clientX,
    anchorClientY: event.clientY,
  });
}

function fitCanvasToViewportWidth() {
  if (!baseCanvas.width) {
    return;
  }

  const styles = window.getComputedStyle(canvasViewport);
  const horizontalPadding =
    parseFloat(styles.paddingLeft || "0") + parseFloat(styles.paddingRight || "0");
  const availableWidth = Math.max(1, canvasViewport.clientWidth - horizontalPadding);
  const fitZoom = clampZoom(Math.min(1, availableWidth / baseCanvas.width));

  setZoom(fitZoom);
  canvasViewport.scrollLeft = 0;
  canvasViewport.scrollTop = 0;
}

function setZoom(nextZoom, options = {}) {
  const previousZoom = editorState.zoom || 1;
  const viewportRect = canvasViewport.getBoundingClientRect();
  const stageRect = canvasStage.getBoundingClientRect();
  const stageLeftInScrollSpace = canvasViewport.scrollLeft + (stageRect.left - viewportRect.left);
  const stageTopInScrollSpace = canvasViewport.scrollTop + (stageRect.top - viewportRect.top);
  const anchorClientX = Number.isFinite(options.anchorClientX) ? options.anchorClientX : viewportRect.left;
  const anchorClientY = Number.isFinite(options.anchorClientY) ? options.anchorClientY : viewportRect.top;
  const anchorOffsetX = anchorClientX - viewportRect.left;
  const anchorOffsetY = anchorClientY - viewportRect.top;
  const contentX =
    previousZoom > 0
      ? (canvasViewport.scrollLeft + anchorOffsetX - stageLeftInScrollSpace) / previousZoom
      : 0;
  const contentY =
    previousZoom > 0
      ? (canvasViewport.scrollTop + anchorOffsetY - stageTopInScrollSpace) / previousZoom
      : 0;
  const width = Math.max(1, Math.round(baseCanvas.width * nextZoom));
  const height = Math.max(1, Math.round(baseCanvas.height * nextZoom));

  editorState.zoom = nextZoom;

  baseCanvas.style.width = `${width}px`;
  baseCanvas.style.height = `${height}px`;
  annotationCanvas.style.width = `${width}px`;
  annotationCanvas.style.height = `${height}px`;
  canvasStage.style.width = `${width}px`;
  canvasStage.style.height = `${height}px`;
  updateZoomValue();

  if (Number.isFinite(options.anchorClientX) && Number.isFinite(options.anchorClientY)) {
    const nextStageRect = canvasStage.getBoundingClientRect();
    const nextStageLeftInScrollSpace =
      canvasViewport.scrollLeft + (nextStageRect.left - viewportRect.left);
    const nextStageTopInScrollSpace =
      canvasViewport.scrollTop + (nextStageRect.top - viewportRect.top);

    canvasViewport.scrollLeft = Math.max(
      0,
      Math.round(nextStageLeftInScrollSpace + contentX * nextZoom - anchorOffsetX)
    );
    canvasViewport.scrollTop = Math.max(
      0,
      Math.round(nextStageTopInScrollSpace + contentY * nextZoom - anchorOffsetY)
    );
  }

  if (!options.skipRender) {
    renderEditorCanvas();
  }
}

function commitActions(nextActions, options = {}) {
  const previousSnapshot = createSnapshot();
  const nextSnapshot = {
    ...previousSnapshot,
    actions: cloneActions(nextActions),
    nextPinNumber: Number.isFinite(options.nextPinNumber)
      ? options.nextPinNumber
      : computeNextPinNumber(nextActions),
  };

  if (!snapshotsAreDifferent(previousSnapshot, nextSnapshot)) {
    renderEditorCanvas();
    return;
  }

  editorState.undoStack.push(previousSnapshot);
  editorState.redoStack = [];
  editorState.actions = nextSnapshot.actions;
  editorState.nextPinNumber = nextSnapshot.nextPinNumber;
  editorState.selectedActionId =
    Object.prototype.hasOwnProperty.call(options, "selectedActionId")
      ? options.selectedActionId
      : editorState.selectedActionId;

  sanitizeSelection();
  updateToolbarState();
  renderEditorCanvas();
  scheduleProjectSave();
}

function updateStrokeWidthValue() {
  strokeWidthValue.textContent = t("common.pixels", {
    value: editorState.strokeWidth,
  });
}

function updateZoomValue() {
  zoomValue.textContent = `${Math.round((editorState.zoom || 1) * 100)}%`;
}

function sanitizeSelection() {
  if (!editorState.selectedActionId) {
    return;
  }

  const selectedAction = getSelectedAction();

  if (!selectedAction || !isSelectableAction(selectedAction)) {
    editorState.selectedActionId = null;
  }
}

function getSelectedAction() {
  if (!editorState.selectedActionId) {
    return null;
  }

  return editorState.actions.find((action) => action.id === editorState.selectedActionId) || null;
}

function getSelectedActionHandleHit(point) {
  const selectedAction = getSelectedAction();

  if (!selectedAction || !isResizableAction(selectedAction)) {
    return null;
  }

  const tolerance = getHandleRadiusInCanvasUnits() * HANDLE_TOLERANCE_MULTIPLIER;
  const handlePoints = getActionHandlePoints(selectedAction);

  for (const handlePoint of handlePoints) {
    if (
      Math.abs(point.x - handlePoint.x) <= tolerance &&
      Math.abs(point.y - handlePoint.y) <= tolerance
    ) {
      return {
        actionId: selectedAction.id,
        handle: handlePoint.handle,
      };
    }
  }

  return null;
}

function getActionHandlePoints(action) {
  const bounds = getActionBounds(action);

  return [
    { handle: "nw", x: bounds.left, y: bounds.top },
    { handle: "ne", x: bounds.right, y: bounds.top },
    { handle: "se", x: bounds.right, y: bounds.bottom },
    { handle: "sw", x: bounds.left, y: bounds.bottom },
  ];
}

function findSelectableActionAtPoint(point) {
  for (let index = editorState.actions.length - 1; index >= 0; index -= 1) {
    const action = editorState.actions[index];

    if (!isSelectableAction(action)) {
      continue;
    }

    if (isPointInsideAction(point, action)) {
      return action;
    }
  }

  return null;
}

function isPointInsideAction(point, action) {
  const bounds = getActionBounds(action);

  if (BOX_TOOLS.has(action.tool)) {
    return isPointInsideBounds(point, bounds);
  }

  if (action.tool === "text") {
    return isPointInsideBounds(point, bounds);
  }

  if (action.tool === "pin") {
    return distanceBetweenPoints(point, action) <= getPinRadius(action);
  }

  if (action.tool === "arrow") {
    const geometry = getArrowGeometry(action);
    const tolerance = Math.max(8, geometry.lineWidth * 1.6);

    return (
      distanceToLineSegment(point, geometry.start, geometry.shaftEnd) <= tolerance ||
      isPointInsideTriangle(point, geometry.tip, geometry.leftWing, geometry.rightWing)
    );
  }

  return false;
}

function getActionBounds(action) {
  if (BOX_TOOLS.has(action.tool)) {
    const left = Math.min(action.start.x, action.end.x);
    const top = Math.min(action.start.y, action.end.y);
    const right = Math.max(action.start.x, action.end.x);
    const bottom = Math.max(action.start.y, action.end.y);

    return {
      left,
      top,
      right,
      bottom,
      width: Math.max(right - left, 1),
      height: Math.max(bottom - top, 1),
    };
  }

  if (action.tool === "arrow") {
    const geometry = getArrowGeometry(action);
    const padding = Math.max(4, geometry.lineWidth / 2 + 2);
    const left = Math.min(
      geometry.start.x,
      geometry.tip.x,
      geometry.leftWing.x,
      geometry.rightWing.x
    ) - padding;
    const top = Math.min(
      geometry.start.y,
      geometry.tip.y,
      geometry.leftWing.y,
      geometry.rightWing.y
    ) - padding;
    const right = Math.max(
      geometry.start.x,
      geometry.tip.x,
      geometry.leftWing.x,
      geometry.rightWing.x
    ) + padding;
    const bottom = Math.max(
      geometry.start.y,
      geometry.tip.y,
      geometry.leftWing.y,
      geometry.rightWing.y
    ) + padding;

    return {
      left,
      top,
      right,
      bottom,
      width: Math.max(right - left, 1),
      height: Math.max(bottom - top, 1),
    };
  }

  if (action.tool === "text") {
    const metrics = measureTextAction(action, action.text);

    return {
      left: action.x,
      top: action.y,
      right: action.x + metrics.width,
      bottom: action.y + metrics.height,
      width: Math.max(metrics.width, 1),
      height: Math.max(metrics.height, 1),
    };
  }

  if (action.tool === "pin") {
    const radius = getPinRadius(action);

    return {
      left: action.x - radius,
      top: action.y - radius,
      right: action.x + radius,
      bottom: action.y + radius,
      width: radius * 2,
      height: radius * 2,
    };
  }

  return {
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
  };
}

function syncSelectionOverlay() {
  const selectedAction = getSelectedAction();

  if (!selectedAction || !isSelectableAction(selectedAction)) {
    shapeSelectionOverlay.classList.add("is-hidden");
    return;
  }

  const bounds = getActionBounds(selectedAction);
  const zoom = Math.max(editorState.zoom, 0.1);

  shapeSelectionOverlay.style.left = `${Math.round(bounds.left * zoom)}px`;
  shapeSelectionOverlay.style.top = `${Math.round(bounds.top * zoom)}px`;
  shapeSelectionOverlay.style.width = `${Math.max(1, Math.round(bounds.width * zoom))}px`;
  shapeSelectionOverlay.style.height = `${Math.max(1, Math.round(bounds.height * zoom))}px`;
  shapeSelectionOverlay.classList.toggle("is-resizable", isResizableAction(selectedAction));
  shapeSelectionOverlay.classList.remove("is-hidden");
}

function handleCanvasDeleteShortcut() {
  deleteSelectedAction();
}

function deleteSelectedAction() {
  const selectedAction = getSelectedAction();

  if (!selectedAction) {
    return;
  }

  const nextActions = editorState.actions.filter((action) => action.id !== selectedAction.id);

  commitActions(nextActions, {
    selectedActionId: null,
  });
}

async function applySelectedCrop() {
  if (editorState.textEditorSession) {
    await commitTextEditor();
  }

  const selectedAction = getSelectedAction();

  if (!selectedAction || selectedAction.tool !== "crop") {
    return;
  }

  const cropBounds = getActionBounds(selectedAction);
  const previousSnapshot = createSnapshot();
  const nextActions = [];

  for (const action of editorState.actions) {
    if (action.id === selectedAction.id) {
      continue;
    }

    const transformedAction = transformActionForCrop(action, cropBounds);

    if (transformedAction) {
      nextActions.push(transformedAction);
    }
  }

  const croppedDataUrl = await cropBaseImageDataUrl(cropBounds);

  editorState.undoStack.push(previousSnapshot);
  editorState.redoStack = [];
  editorState.actions = nextActions;
  editorState.selectedActionId = null;
  editorState.nextPinNumber = computeNextPinNumber(nextActions);

  await loadBaseImageToCanvas(croppedDataUrl, {
    preserveZoom: true,
    skipRender: true,
  });

  setCaptureMeta(editorState.captureRecord || { metadata: {} });
  updateToolbarState();
  renderEditorCanvas();
  scheduleProjectSave();
  showNotice(t("editor.notice.cropApplied"));
}

async function cropBaseImageDataUrl(cropBounds) {
  const sourceImage = await createImage(editorState.baseImageDataUrl);
  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = Math.max(1, Math.round(cropBounds.width));
  cropCanvas.height = Math.max(1, Math.round(cropBounds.height));

  const cropContext = cropCanvas.getContext("2d");
  cropContext.drawImage(
    sourceImage,
    cropBounds.left,
    cropBounds.top,
    cropBounds.width,
    cropBounds.height,
    0,
    0,
    cropCanvas.width,
    cropCanvas.height
  );

  return cropCanvas.toDataURL("image/png");
}

function transformActionForCrop(action, cropBounds) {
  if (FREEHAND_TOOLS.has(action.tool)) {
    const points = (action.points || [])
      .filter((point) => isPointInsideBounds(point, cropBounds))
      .map((point) => ({
        x: point.x - cropBounds.left,
        y: point.y - cropBounds.top,
      }));

    if (!points.length) {
      return null;
    }

    return {
      ...action,
      points,
    };
  }

  if (BOX_TOOLS.has(action.tool)) {
    const bounds = getActionBounds(action);
    const intersection = getBoundsIntersection(bounds, cropBounds);

    if (!intersection) {
      return null;
    }

    return {
      ...action,
      start: {
        x: intersection.left - cropBounds.left,
        y: intersection.top - cropBounds.top,
      },
      end: {
        x: intersection.right - cropBounds.left,
        y: intersection.bottom - cropBounds.top,
      },
    };
  }

  if (action.tool === "arrow") {
    const bounds = getActionBounds(action);

    if (!getBoundsIntersection(bounds, cropBounds)) {
      return null;
    }

    return {
      ...action,
      start: shiftPointWithinBounds(action.start, cropBounds),
      end: shiftPointWithinBounds(action.end, cropBounds),
    };
  }

  if (action.tool === "text") {
    const bounds = getActionBounds(action);

    if (!getBoundsIntersection(bounds, cropBounds)) {
      return null;
    }

    return {
      ...action,
      x: clamp(action.x - cropBounds.left, 0, Math.max(0, cropBounds.width - 1)),
      y: clamp(action.y - cropBounds.top, 0, Math.max(0, cropBounds.height - 1)),
    };
  }

  if (action.tool === "pin") {
    if (!isPointInsideBounds(action, cropBounds)) {
      return null;
    }

    return {
      ...action,
      x: action.x - cropBounds.left,
      y: action.y - cropBounds.top,
    };
  }

  return null;
}

function shiftPointWithinBounds(point, bounds) {
  return {
    x: clamp(point.x, bounds.left, bounds.right) - bounds.left,
    y: clamp(point.y, bounds.top, bounds.bottom) - bounds.top,
  };
}

function resizeBoxAction(action, handle, point, shouldSnap) {
  const bounds = getActionBounds(action);
  let left = bounds.left;
  let top = bounds.top;
  let right = bounds.right;
  let bottom = bounds.bottom;

  if (handle.includes("w")) {
    left = Math.min(point.x, right - MIN_BOX_SIZE);
  }

  if (handle.includes("e")) {
    right = Math.max(point.x, left + MIN_BOX_SIZE);
  }

  if (handle.includes("n")) {
    top = Math.min(point.y, bottom - MIN_BOX_SIZE);
  }

  if (handle.includes("s")) {
    bottom = Math.max(point.y, top + MIN_BOX_SIZE);
  }

  if (shouldSnap && (action.tool === "circle" || action.tool === "rectangle" || action.tool === "blur" || action.tool === "redact" || action.tool === "crop")) {
    const size = Math.max(Math.abs(right - left), Math.abs(bottom - top));

    if (handle.includes("w")) {
      left = right - size;
    } else {
      right = left + size;
    }

    if (handle.includes("n")) {
      top = bottom - size;
    } else {
      bottom = top + size;
    }
  }

  action.start = clampPointToCanvas({
    x: left,
    y: top,
  });
  action.end = clampPointToCanvas({
    x: right,
    y: bottom,
  });
}

function moveActionByDelta(action, deltaX, deltaY) {
  if (BOX_TOOLS.has(action.tool) || action.tool === "arrow") {
    const bounds = getActionBounds(action);
    const maxDeltaLeft = -bounds.left;
    const maxDeltaTop = -bounds.top;
    const maxDeltaRight = baseCanvas.width - bounds.right;
    const maxDeltaBottom = baseCanvas.height - bounds.bottom;
    const safeDeltaX = clamp(deltaX, maxDeltaLeft, maxDeltaRight);
    const safeDeltaY = clamp(deltaY, maxDeltaTop, maxDeltaBottom);

    action.start = {
      x: action.start.x + safeDeltaX,
      y: action.start.y + safeDeltaY,
    };
    action.end = {
      x: action.end.x + safeDeltaX,
      y: action.end.y + safeDeltaY,
    };
    return;
  }

  if (action.tool === "text") {
    const bounds = getActionBounds(action);
    const safeDeltaX = clamp(deltaX, -bounds.left, baseCanvas.width - bounds.right);
    const safeDeltaY = clamp(deltaY, -bounds.top, baseCanvas.height - bounds.bottom);

    action.x += safeDeltaX;
    action.y += safeDeltaY;
    return;
  }

  if (action.tool === "pin") {
    action.x = clamp(action.x + deltaX, 0, baseCanvas.width);
    action.y = clamp(action.y + deltaY, 0, baseCanvas.height);
  }
}

function createSnapshot() {
  return {
    baseImageDataUrl: editorState.baseImageDataUrl,
    actions: cloneActions(editorState.actions),
    nextPinNumber: computeNextPinNumber(editorState.actions),
  };
}

function snapshotsAreDifferent(left, right) {
  return JSON.stringify(left) !== JSON.stringify(right);
}

function scheduleProjectSave() {
  if (!editorState.captureRecord) {
    return;
  }

  if (editorState.saveTimer) {
    clearTimeout(editorState.saveTimer);
  }

  editorState.saveTimer = window.setTimeout(() => {
    saveProjectNow(false).catch((error) => {
      showNotice(normalizeError(error), true);
    });
  }, AUTOSAVE_DELAY_MS);
}

async function saveProjectNow(showFeedback) {
  if (editorState.textEditorSession) {
    await commitTextEditor();
  }

  if (!editorState.captureRecord) {
    return;
  }

  if (editorState.saveTimer) {
    clearTimeout(editorState.saveTimer);
    editorState.saveTimer = null;
  }

  const record = {
    ...editorState.captureRecord,
    dataUrl: editorState.baseImageDataUrl,
    updatedAt: Date.now(),
    editorState: {
      version: 1,
      baseImageDataUrl: editorState.baseImageDataUrl,
      actions: cloneActions(editorState.actions),
      nextPinNumber: computeNextPinNumber(editorState.actions),
      zoom: editorState.zoom,
      currentColor: editorState.currentColor,
      strokeWidth: editorState.strokeWidth,
      currentTool: editorState.currentTool,
    },
  };

  await CaptureStore.saveCapture(record);
  editorState.captureRecord = record;

  if (showFeedback) {
    showNotice(t("editor.notice.draftSaved"));
  }
}

function computeNextPinNumber(actions) {
  const usedPins = new Set(
    actions
      .filter((action) => action.tool === "pin")
      .map((action) => Number.parseInt(action.label, 10))
      .filter((value) => Number.isFinite(value) && value > 0)
  );

  let nextPin = 1;

  while (usedPins.has(nextPin)) {
    nextPin += 1;
  }

  return nextPin;
}

function resolveActionSize(tool, fallbackSize) {
  if (tool === "text") {
    if (Number.isFinite(fallbackSize)) {
      return Math.max(12, fallbackSize);
    }

    return Math.max(DEFAULT_TEXT_SIZE, Math.round(editorState.strokeWidth * 2.8));
  }

  if (tool === "pin") {
    return Math.max(10, fallbackSize || editorState.strokeWidth);
  }

  return Math.max(2, fallbackSize || editorState.strokeWidth);
}

function measureTextAction(action, textValue) {
  const lines = splitTextLines(textValue);
  const fontSize = Math.max(12, action.size || DEFAULT_TEXT_SIZE);
  const lineHeight = Math.round(fontSize * 1.35);

  baseContext.save();
  baseContext.font = getTextFont(fontSize);

  let width = 0;

  for (const line of lines) {
    width = Math.max(width, baseContext.measureText(line || " ").width);
  }

  baseContext.restore();

  return {
    width: Math.max(width, fontSize * 0.6),
    height: Math.max(lineHeight, lines.length * lineHeight),
    lineHeight,
  };
}

function getTextFont(size) {
  return `600 ${Math.max(12, size)}px ${getBodyFontStack()}`;
}

function getBodyFontStack() {
  return `"Manrope", "Segoe UI", Tahoma, sans-serif`;
}

function splitTextLines(value) {
  return String(value || "").split(/\r?\n/);
}

function getPinRadius(action) {
  return Math.max(14, (action.size || 8) * 2.2);
}

function isActionDrawable(action) {
  if (!action) {
    return false;
  }

  if (FREEHAND_TOOLS.has(action.tool)) {
    return Array.isArray(action.points) && action.points.length > 0;
  }

  if (action.tool === "text") {
    return Boolean(action.text && action.text.trim());
  }

  if (action.tool === "pin") {
    return Number.isFinite(action.x) && Number.isFinite(action.y);
  }

  if (SHAPE_TOOLS.has(action.tool)) {
    const bounds = getActionBounds(action);
    return bounds.width > 1 || bounds.height > 1;
  }

  return false;
}

function normalizeAction(action) {
  if (!action) {
    return action;
  }

  if (BOX_TOOLS.has(action.tool)) {
    const bounds = getActionBounds(action);

    return {
      ...action,
      start: { x: bounds.left, y: bounds.top },
      end: { x: bounds.right, y: bounds.bottom },
    };
  }

  return action;
}

function isDrawableTool(tool) {
  return FREEHAND_TOOLS.has(tool) || SHAPE_TOOLS.has(tool);
}

function isSelectableAction(action) {
  return Boolean(action) && SELECTABLE_TOOLS.has(action.tool);
}

function isResizableAction(action) {
  return Boolean(action) && BOX_TOOLS.has(action.tool);
}

function isMovableAction(action) {
  return isSelectableAction(action);
}

function shouldPanInsteadOfDraw() {
  return editorState.currentTool === "move" || editorState.isSpacePressed;
}

function updateCanvasCursor() {
  const isPanMode = shouldPanInsteadOfDraw();

  annotationCanvas.classList.toggle("is-pan-mode", isPanMode && !editorState.isPanning);
  annotationCanvas.classList.toggle("is-panning", editorState.isPanning);

  if (editorState.isPanning) {
    annotationCanvas.style.cursor = "grabbing";
    return;
  }

  if (isPanMode) {
    annotationCanvas.style.cursor = "grab";
    return;
  }

  if (editorState.currentTool === "text") {
    annotationCanvas.style.cursor = "text";
    return;
  }

  annotationCanvas.style.cursor = "crosshair";
}

function getCanvasPoint(event) {
  const rect = annotationCanvas.getBoundingClientRect();
  const scaleX = annotationCanvas.width / rect.width;
  const scaleY = annotationCanvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function getHandleRadiusInCanvasUnits() {
  return getCanvasUnitsForScreenPixels(HANDLE_SIZE_SCREEN_PX / 2);
}

function getCanvasUnitsForScreenPixels(screenPixels) {
  const zoom = Number.isFinite(editorState.zoom) && editorState.zoom > 0
    ? editorState.zoom
    : 1;

  return Math.max(1, screenPixels / zoom);
}

function getSnappedEndPoint(start, point, tool, shouldSnap) {
  if (!shouldSnap) {
    return point;
  }

  const deltaX = point.x - start.x;
  const deltaY = point.y - start.y;

  if (BOX_TOOLS.has(tool) || tool === "circle" || tool === "rectangle") {
    const size = Math.max(Math.abs(deltaX), Math.abs(deltaY));

    return {
      x: start.x + Math.sign(deltaX || 1) * size,
      y: start.y + Math.sign(deltaY || 1) * size,
    };
  }

  if (tool === "arrow") {
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (absDeltaX > absDeltaY * 1.6) {
      return {
        x: point.x,
        y: start.y,
      };
    }

    if (absDeltaY > absDeltaX * 1.6) {
      return {
        x: start.x,
        y: point.y,
      };
    }

    const diagonal = Math.max(absDeltaX, absDeltaY);

    return {
      x: start.x + Math.sign(deltaX || 1) * diagonal,
      y: start.y + Math.sign(deltaY || 1) * diagonal,
    };
  }

  return point;
}

function releasePointerCaptureSafely(pointerId) {
  try {
    annotationCanvas.releasePointerCapture(pointerId);
  } catch (error) {
    // noop
  }
}

function cloneActions(actions) {
  if (typeof structuredClone === "function") {
    return structuredClone(actions);
  }

  return JSON.parse(JSON.stringify(actions));
}

function actionsAreDifferent(left, right) {
  return JSON.stringify(left) !== JSON.stringify(right);
}

function clampZoom(value) {
  return Math.min(Math.max(value, editorState.minZoom), editorState.maxZoom);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function clampPointToCanvas(point) {
  return {
    x: clamp(point.x, 0, baseCanvas.width),
    y: clamp(point.y, 0, baseCanvas.height),
  };
}

function createActionId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `shape-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isEditableTarget(target) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

function distanceBetweenPoints(left, right) {
  return Math.hypot((left.x || 0) - (right.x || 0), (left.y || 0) - (right.y || 0));
}

function getArrowGeometry(action) {
  const start = action.start;
  const tip = action.end;
  const lineWidth = action.size || editorState.strokeWidth || 4;
  const deltaX = tip.x - start.x;
  const deltaY = tip.y - start.y;
  const length = Math.hypot(deltaX, deltaY);

  if (length <= Number.EPSILON) {
    return {
      start,
      tip,
      shaftEnd: tip,
      leftWing: tip,
      rightWing: tip,
      lineWidth,
    };
  }

  const unitX = deltaX / length;
  const unitY = deltaY / length;
  const headLength = Math.min(length, Math.max(12, lineWidth * 2.2));
  const baseOffset = Math.min(length, headLength * Math.cos(ARROW_HEAD_ANGLE));

  return {
    start,
    tip,
    shaftEnd: {
      x: tip.x - unitX * baseOffset,
      y: tip.y - unitY * baseOffset,
    },
    leftWing: {
      x: tip.x - headLength * Math.cos(Math.atan2(deltaY, deltaX) - ARROW_HEAD_ANGLE),
      y: tip.y - headLength * Math.sin(Math.atan2(deltaY, deltaX) - ARROW_HEAD_ANGLE),
    },
    rightWing: {
      x: tip.x - headLength * Math.cos(Math.atan2(deltaY, deltaX) + ARROW_HEAD_ANGLE),
      y: tip.y - headLength * Math.sin(Math.atan2(deltaY, deltaX) + ARROW_HEAD_ANGLE),
    },
    lineWidth,
  };
}

function distanceToLineSegment(point, lineStart, lineEnd) {
  const lineLengthSquared =
    (lineEnd.x - lineStart.x) * (lineEnd.x - lineStart.x) +
    (lineEnd.y - lineStart.y) * (lineEnd.y - lineStart.y);

  if (lineLengthSquared === 0) {
    return distanceBetweenPoints(point, lineStart);
  }

  let ratio =
    ((point.x - lineStart.x) * (lineEnd.x - lineStart.x) +
      (point.y - lineStart.y) * (lineEnd.y - lineStart.y)) /
    lineLengthSquared;

  ratio = clamp(ratio, 0, 1);

  const projection = {
    x: lineStart.x + ratio * (lineEnd.x - lineStart.x),
    y: lineStart.y + ratio * (lineEnd.y - lineStart.y),
  };

  return distanceBetweenPoints(point, projection);
}

function isPointInsideTriangle(point, first, second, third) {
  const denominator =
    (second.y - third.y) * (first.x - third.x) +
    (third.x - second.x) * (first.y - third.y);

  if (Math.abs(denominator) <= Number.EPSILON) {
    return false;
  }

  const alpha =
    ((second.y - third.y) * (point.x - third.x) +
      (third.x - second.x) * (point.y - third.y)) /
    denominator;
  const beta =
    ((third.y - first.y) * (point.x - third.x) +
      (first.x - third.x) * (point.y - third.y)) /
    denominator;
  const gamma = 1 - alpha - beta;

  return alpha >= 0 && beta >= 0 && gamma >= 0;
}

function isPointInsideBounds(point, bounds) {
  return (
    point.x >= bounds.left &&
    point.x <= bounds.right &&
    point.y >= bounds.top &&
    point.y <= bounds.bottom
  );
}

function getBoundsIntersection(left, right) {
  const intersection = {
    left: Math.max(left.left, right.left),
    top: Math.max(left.top, right.top),
    right: Math.min(left.right, right.right),
    bottom: Math.min(left.bottom, right.bottom),
  };

  if (intersection.right <= intersection.left || intersection.bottom <= intersection.top) {
    return null;
  }

  return {
    ...intersection,
    width: intersection.right - intersection.left,
    height: intersection.bottom - intersection.top,
  };
}

function showCanvas() {
  emptyState.classList.add("is-hidden");
  canvasViewport.classList.remove("is-hidden");
}

function openHelpModal() {
  helpModal.classList.remove("is-hidden");
  closeHelpButton.focus();
}

function closeHelpModal() {
  helpModal.classList.add("is-hidden");
  helpButton.focus();
}

function isHelpModalOpen() {
  return !helpModal.classList.contains("is-hidden");
}

function showEmptyState(title, description) {
  emptyState.innerHTML = `
    <h2>${escapeHtml(title)}</h2>
    <p>${escapeHtml(description)}</p>
  `;
  emptyState.classList.remove("is-hidden");
  canvasViewport.classList.add("is-hidden");
}

function showNotice(message, isError = false) {
  if (!editorNotice) {
    return;
  }

  editorNotice.textContent = message || "";
  editorNotice.classList.toggle("is-error", Boolean(isError));

  if (editorState.noticeTimer) {
    clearTimeout(editorState.noticeTimer);
  }

  if (!message) {
    return;
  }

  editorState.noticeTimer = window.setTimeout(() => {
    editorNotice.textContent = "";
    editorNotice.classList.remove("is-error");
  }, isError ? 5200 : 2400);
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error(t("editor.error.finalImage")));
        return;
      }

      resolve(blob);
    }, "image/png");
  });
}

function createImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(t("editor.error.capturedImageLoad")));
    image.src = source;
  });
}

function normalizeError(error) {
  if (!error) {
    return t("common.errorUnexpected");
  }

  if (typeof error === "string") {
    return error;
  }

  if (error.message) {
    return error.message;
  }

  return t("common.errorUnexpected");
}

function t(key, params) {
  return i18n.t(key, params, currentLanguage);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
