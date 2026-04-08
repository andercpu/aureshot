const baseCanvas = document.getElementById("baseCanvas");
const annotationCanvas = document.getElementById("annotationCanvas");
const canvasStage = document.getElementById("editorCanvasStage");
const canvasViewport = document.getElementById("editorCanvasViewport");
const shapeSelectionOverlay = document.getElementById("shapeSelectionOverlay");
const emptyState = document.getElementById("editorEmptyState");
const toolSidebar = document.getElementById("editorToolSidebar");
const editorInspector = document.getElementById("editorInspector");
const captureMeta = document.getElementById("captureMeta");
const editorNotice = document.getElementById("editorNotice");
const helpButton = document.getElementById("helpButton");
const helpModal = document.getElementById("helpModal");
const closeHelpButton = document.getElementById("closeHelpButton");
const editorLanguageSelect = document.getElementById("editorLanguageSelect");
const colorPicker = document.getElementById("colorPicker");
const hexColorInput = document.getElementById("hexColorInput");
const colorTargetSelect = document.getElementById("colorTargetSelect");
const eyedropperButton = document.getElementById("eyedropperButton");
const strokeWidthRange = document.getElementById("strokeWidthRange");
const strokeWidthValue = document.getElementById("strokeWidthValue");
const markerOpacityRange = document.getElementById("markerOpacityRange");
const markerOpacityValue = document.getElementById("markerOpacityValue");
const rotationRange = document.getElementById("rotationRange");
const rotationValue = document.getElementById("rotationValue");
const redactBorderRadiusRange = document.getElementById("redactBorderRadiusRange");
const redactBorderRadiusValue = document.getElementById("redactBorderRadiusValue");
const fontSizeRange = document.getElementById("fontSizeRange");
const fontSizeValue = document.getElementById("fontSizeValue");
const textBackgroundModeSelect = document.getElementById("textBackgroundModeSelect");
const textBackgroundOpacityRange = document.getElementById("textBackgroundOpacityRange");
const textBackgroundOpacityValue = document.getElementById("textBackgroundOpacityValue");
const textBorderRadiusRange = document.getElementById("textBorderRadiusRange");
const textBorderRadiusValue = document.getElementById("textBorderRadiusValue");
const toolContextGroup = document.getElementById("toolContextGroup");
const toolContextBadge = document.getElementById("toolContextBadge");
const undoButton = document.getElementById("undoButton");
const redoButton = document.getElementById("redoButton");
const deleteActionButton = document.getElementById("deleteActionButton");
const fitWidthButton = document.getElementById("fitWidthButton");
const zoomValue = document.getElementById("zoomValue");
const copyButton = document.getElementById("copyButton");
const saveProjectButton = document.getElementById("saveProjectButton");
const applyCropButton = document.getElementById("applyCropButton");
const downloadButton = document.getElementById("downloadButton");
const downloadPdfButton = document.getElementById("downloadPdfButton");
const addImageButton = document.getElementById("addImageButton");
const imageUploadInput = document.getElementById("imageUploadInput");
const shareMenuButton = document.getElementById("shareMenuButton");
const shareMenuPanel = document.getElementById("shareMenuPanel");
const shareMenuViews = Array.from(document.querySelectorAll("[data-share-step]"));
const shareMenuTargetButtons = Array.from(document.querySelectorAll("[data-share-target]"));
const shareMenuFormatButtons = Array.from(document.querySelectorAll("[data-share-format]"));
const shareMenuBackButton = document.getElementById("shareMenuBackButton");
const shareMenuTargetSummary = document.getElementById("shareMenuTargetSummary");
const textBoldButton = document.getElementById("textBoldButton");
const textItalicButton = document.getElementById("textItalicButton");
const textUnderlineButton = document.getElementById("textUnderlineButton");
const textAlignButtons = Array.from(document.querySelectorAll("[data-text-align]"));
const textListTypeSelect = document.getElementById("textListTypeSelect");
const imageBorderRadiusRange = document.getElementById("imageBorderRadiusRange");
const imageBorderRadiusValue = document.getElementById("imageBorderRadiusValue");
const imageScaleRange = document.getElementById("imageScaleRange");
const imageScaleValue = document.getElementById("imageScaleValue");
const toggleImageCropButton = document.getElementById("toggleImageCropButton");
const resetImageCropButton = document.getElementById("resetImageCropButton");
const toolButtons = Array.from(document.querySelectorAll("[data-tool]"));
const textStyleControls = Array.from(document.querySelectorAll("[data-text-style-control]"));
const contextualControls = Array.from(document.querySelectorAll("[data-control-role]"));
const i18n = globalThis.PrintExtensionI18n;

const baseContext = baseCanvas.getContext("2d");
const annotationContext = annotationCanvas.getContext("2d");

const HANDLE_SIZE_SCREEN_PX = 12;
const HANDLE_TOLERANCE_MULTIPLIER = 1.45;
const MIN_BOX_SIZE = 12;
const AUTOSAVE_DELAY_MS = 380;
const DEFAULT_TEXT_SIZE = 22;
const DEFAULT_TEXT_BACKGROUND_MODE = "none";
const DEFAULT_TEXT_BACKGROUND_OPACITY = 20;
const DEFAULT_TEXT_BORDER_RADIUS = 14;
const DEFAULT_TEXT_ALIGN = "left";
const DEFAULT_TEXT_LIST_TYPE = "none";
const DEFAULT_TEXT_BOX_WIDTH = 220;
const DEFAULT_TEXT_BOX_HEIGHT = 64;
const DEFAULT_MARKER_OPACITY = 100;
const DEFAULT_ROTATION = 0;
const DEFAULT_REDACT_BORDER_RADIUS = 0;
const DEFAULT_IMAGE_BORDER_RADIUS = 24;
const DEFAULT_IMAGE_SCALE = 1;
const MIN_TEXT_BOX_WIDTH = 120;
const MIN_TEXT_BOX_HEIGHT = 40;
const MIN_IMAGE_BOX_SIZE = 48;
const TEXT_BOX_PADDING_X = 12;
const TEXT_BOX_PADDING_Y = 10;
const TEXT_HIGHLIGHT_PADDING_X = 8;
const TEXT_HIGHLIGHT_PADDING_Y = 3;
const AUTO_SCROLL_EDGE_PX = 54;
const AUTO_SCROLL_MAX_SPEED = 28;
const MIN_DRAW_INTENT_DISTANCE = 6;
const ARROW_HEAD_ANGLE = Math.PI / 7;

const BOX_TOOLS = new Set(["circle", "rectangle", "blur", "redact", "crop"]);
const COLOR_CONTROL_TOOLS = new Set(["marker", "arrow", "text", "pin", "circle", "rectangle"]);
const EFFECT_TOOLS = new Set(["blur", "redact"]);
const FREEHAND_TOOLS = new Set(["marker", "eraser"]);
const SHAPE_TOOLS = new Set(["circle", "rectangle", "arrow", "blur", "redact", "crop"]);
const SIZE_CONTROL_TOOLS = new Set(["marker", "arrow", "pin", "circle", "rectangle", "blur", "redact"]);
const SELECTABLE_TOOLS = new Set([
  "marker",
  "circle",
  "rectangle",
  "arrow",
  "text",
  "pin",
  "blur",
  "redact",
  "crop",
  "image",
]);
const IMAGE_CROP_HANDLES = new Set(["n", "e", "s", "w"]);

const editorState = {
  actions: [],
  undoStack: [],
  redoStack: [],
  draftAction: null,
  currentTool: "marker",
  currentColor: colorPicker.value,
  currentMarkerOpacity: Number(markerOpacityRange.value),
  currentRotation: Number(rotationRange.value),
  currentRedactBorderRadius: Number(redactBorderRadiusRange.value),
  currentTextColor: colorPicker.value,
  currentTextBackgroundColor: colorPicker.value,
  currentTextColorTarget: "text",
  strokeWidth: Number(strokeWidthRange.value),
  currentTextFontSize: Number(fontSizeRange.value),
  currentTextBackgroundMode: textBackgroundModeSelect.value,
  currentTextBackgroundOpacity: Number(textBackgroundOpacityRange.value),
  currentTextBorderRadius: Number(textBorderRadiusRange.value),
  currentTextAlign: DEFAULT_TEXT_ALIGN,
  currentTextBold: false,
  currentTextItalic: false,
  currentTextUnderline: false,
  currentTextListType: DEFAULT_TEXT_LIST_TYPE,
  currentImageBorderRadius: Number(imageBorderRadiusRange.value),
  currentImageScale: Number(imageScaleRange.value) / 100,
  activePointerId: null,
  isDrawing: false,
  isPanning: false,
  isColorPicking: false,
  isShareMenuOpen: false,
  shareMenuStep: "target",
  shareMenuTarget: "",
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
  autoScrollSession: null,
  autoScrollFrame: null,
  imageCropModeActionId: null,
  imageCropSession: null,
};

let textEditorElement = null;
let currentLanguage = i18n.getDefaultLanguage();
const imageAssetCache = new Map();

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
    applyCurrentColor(colorPicker.value, {
      updateSelectedAction: true,
    });
  });

  hexColorInput.addEventListener("change", () => {
    commitHexColorInputValue(true);
  });

  hexColorInput.addEventListener("blur", () => {
    commitHexColorInputValue(false);
  });

  hexColorInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    commitHexColorInputValue(true);
    hexColorInput.select();
  });

  colorTargetSelect.addEventListener("change", () => {
    applyTextColorTargetValue(colorTargetSelect.value);
  });

  strokeWidthRange.addEventListener("input", () => {
    applyStrokeWidthValue(Number(strokeWidthRange.value), {
      updateSelectedAction: true,
    });
  });

  markerOpacityRange.addEventListener("input", () => {
    applyMarkerOpacityValue(Number(markerOpacityRange.value), {
      updateSelectedAction: true,
    });
  });

  rotationRange.addEventListener("input", () => {
    applyRotationValue(Number(rotationRange.value), {
      updateSelectedAction: true,
    });
  });

  redactBorderRadiusRange.addEventListener("input", () => {
    applyRedactBorderRadiusValue(Number(redactBorderRadiusRange.value), {
      updateSelectedAction: true,
    });
  });

  fontSizeRange.addEventListener("input", () => {
    applyTextFontSizeValue(Number(fontSizeRange.value), {
      updateSelectedAction: true,
    });
  });

  textBackgroundModeSelect.addEventListener("change", () => {
    applyTextBackgroundModeValue(textBackgroundModeSelect.value, {
      updateSelectedAction: true,
    });
  });

  textBackgroundOpacityRange.addEventListener("input", () => {
    applyTextBackgroundOpacityValue(Number(textBackgroundOpacityRange.value), {
      updateSelectedAction: true,
    });
  });

  textBorderRadiusRange.addEventListener("input", () => {
    applyTextBorderRadiusValue(Number(textBorderRadiusRange.value), {
      updateSelectedAction: true,
    });
  });

  eyedropperButton.addEventListener("click", () => {
    toggleColorPickingMode();
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

  downloadPdfButton.addEventListener("click", () => {
    downloadAnnotatedPdf().catch((error) => {
      showNotice(normalizeError(error), true);
    });
  });

  addImageButton.addEventListener("click", () => {
    imageUploadInput.click();
  });

  imageUploadInput.addEventListener("change", () => {
    importImageFromInput().catch((error) => {
      showNotice(normalizeError(error), true);
    });
  });

  shareMenuButton.addEventListener("click", () => {
    toggleShareMenu();
  });

  shareMenuTargetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      openShareFormatStep(button.dataset.shareTarget);
    });
  });

  shareMenuFormatButtons.forEach((button) => {
    button.addEventListener("click", () => {
      shareAnnotatedImage(editorState.shareMenuTarget, button.dataset.shareFormat).catch((error) => {
        showNotice(normalizeError(error), true);
      });
    });
  });

  shareMenuBackButton.addEventListener("click", () => {
    setShareMenuStep("target");
    focusShareMenuStep("target");
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
  annotationCanvas.addEventListener("dblclick", handleCanvasDoubleClick);
  canvasStage.addEventListener("wheel", handleCanvasWheel, { passive: false });

  textBoldButton.addEventListener("click", () => {
    applyTextStyleToggle("bold", {
      updateSelectedAction: true,
    });
  });

  textItalicButton.addEventListener("click", () => {
    applyTextStyleToggle("italic", {
      updateSelectedAction: true,
    });
  });

  textUnderlineButton.addEventListener("click", () => {
    applyTextStyleToggle("underline", {
      updateSelectedAction: true,
    });
  });

  textAlignButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyTextAlignValue(button.dataset.textAlign, {
        updateSelectedAction: true,
      });
    });
  });

  textListTypeSelect.addEventListener("change", () => {
    applyTextListTypeValue(textListTypeSelect.value, {
      updateSelectedAction: true,
    });
  });

  imageBorderRadiusRange.addEventListener("input", () => {
    applyImageBorderRadiusValue(Number(imageBorderRadiusRange.value), {
      updateSelectedAction: true,
    });
  });

  imageScaleRange.addEventListener("input", () => {
    applyImageScaleValue(Number(imageScaleRange.value) / 100, {
      updateSelectedAction: true,
    });
  });

  toggleImageCropButton.addEventListener("click", () => {
    toggleSelectedImageCropMode();
  });

  resetImageCropButton.addEventListener("click", () => {
    resetSelectedImageCrop();
  });

  window.addEventListener("keydown", handleKeyboardShortcuts);
  window.addEventListener("keyup", handleKeyboardShortcutRelease);
  window.addEventListener("resize", handleWindowResize);
  document.addEventListener("pointerdown", handleGlobalPointerDown, true);
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
  updateFontSizeValue();
  updateTextBackgroundOpacityValue();
  updateTextBorderRadiusValue();
  updateImageBorderRadiusValue();
  updateImageScaleValue();
  updateZoomValue();
  updateImageCropButtonLabel();
  syncShareMenuView();

  if (textEditorElement) {
    textEditorElement.placeholder = t("editor.text.placeholder");
  }

  if (editorState.captureRecord) {
    setCaptureMeta(editorState.captureRecord);
  }

  syncAppearanceControls();
}

function updateImageCropButtonLabel() {
  const selectedAction = getSelectedAction();
  const isImageCropMode =
    Boolean(selectedAction) &&
    selectedAction.tool === "image" &&
    editorState.imageCropModeActionId === selectedAction.id;
  toggleImageCropButton.textContent = isImageCropMode
    ? t("editor.image.crop.done")
    : t("editor.image.crop.edit");
}

function getActiveTextAction() {
  if (editorState.textEditorSession && editorState.textEditorSession.action) {
    return editorState.textEditorSession.action;
  }

  const selectedAction = getSelectedAction();
  return selectedAction && selectedAction.tool === "text" ? selectedAction : null;
}

function syncTextDefaultsFromAction(action) {
  if (!action || action.tool !== "text") {
    return;
  }

  editorState.currentTextColor = getTextActionColor(action);
  editorState.currentTextBackgroundColor = getTextActionBackgroundColor(action);
  editorState.currentTextFontSize = Math.max(12, action.size || editorState.currentTextFontSize);
  editorState.currentTextBackgroundMode =
    action.backgroundMode || editorState.currentTextBackgroundMode || DEFAULT_TEXT_BACKGROUND_MODE;
  editorState.currentTextBackgroundOpacity = getTextActionBackgroundOpacity(action);
  editorState.currentTextBorderRadius = Math.max(
    0,
    Number.isFinite(action.borderRadius)
      ? action.borderRadius
      : editorState.currentTextBorderRadius
  );
  editorState.currentTextAlign = getTextActionAlign(action);
  editorState.currentTextBold = getTextActionWeight(action);
  editorState.currentTextItalic = getTextActionItalic(action);
  editorState.currentTextUnderline = getTextActionUnderline(action);
  editorState.currentTextListType = getTextActionListType(action);
}

function normalizeTextColorTarget(value) {
  return value === "background" ? "background" : "text";
}

function getTextActionColor(action) {
  return (
    normalizeHexColor(action && action.color) ||
    normalizeHexColor(editorState.currentTextColor) ||
    normalizeHexColor(editorState.currentColor) ||
    normalizeHexColor(colorPicker.value) ||
    "#f97316"
  );
}

function getTextActionBackgroundColor(action) {
  return (
    normalizeHexColor(action && action.backgroundColor) ||
    normalizeHexColor(action && action.color) ||
    normalizeHexColor(editorState.currentTextBackgroundColor) ||
    getTextActionColor(action)
  );
}

function getTextActionBackgroundOpacity(action) {
  const candidate = Number(action && action.backgroundOpacity);

  if (Number.isFinite(candidate)) {
    return clamp(Math.round(candidate), 0, 100);
  }

  return clamp(
    Math.round(editorState.currentTextBackgroundOpacity || DEFAULT_TEXT_BACKGROUND_OPACITY),
    0,
    100
  );
}

function getTextActionAlign(action) {
  return ["left", "center", "right", "justify"].includes(action && action.textAlign)
    ? action.textAlign
    : editorState.currentTextAlign || DEFAULT_TEXT_ALIGN;
}

function getTextActionListType(action) {
  return ["none", "bullet", "number"].includes(action && action.listType)
    ? action.listType
    : editorState.currentTextListType || DEFAULT_TEXT_LIST_TYPE;
}

function getMarkerOpacity(action) {
  const candidate = Number(action && action.opacity);

  if (Number.isFinite(candidate)) {
    return clamp(Math.round(candidate), 10, 100);
  }

  return clamp(
    Math.round(editorState.currentMarkerOpacity || DEFAULT_MARKER_OPACITY),
    10,
    100
  );
}

function getTextActionWeight(action) {
  if (action && typeof action.bold === "boolean") {
    return action.bold;
  }

  return Boolean(editorState.currentTextBold);
}

function getTextActionItalic(action) {
  if (action && typeof action.italic === "boolean") {
    return action.italic;
  }

  return Boolean(editorState.currentTextItalic);
}

function getTextActionUnderline(action) {
  if (action && typeof action.underline === "boolean") {
    return action.underline;
  }

  return Boolean(editorState.currentTextUnderline);
}

function syncImageDefaultsFromAction(action) {
  if (!action || action.tool !== "image") {
    return;
  }

  editorState.currentImageBorderRadius = Math.max(
    0,
    Number.isFinite(action.borderRadius)
      ? action.borderRadius
      : editorState.currentImageBorderRadius || DEFAULT_IMAGE_BORDER_RADIUS
  );
  editorState.currentImageScale = clamp(
    Number.isFinite(action.contentScale) ? action.contentScale : editorState.currentImageScale,
    1,
    3
  );
}

function getImageActionBorderRadius(action) {
  return Math.max(
    0,
    Number.isFinite(action && action.borderRadius)
      ? action.borderRadius
      : editorState.currentImageBorderRadius || DEFAULT_IMAGE_BORDER_RADIUS
  );
}

function getImageActionScale(action) {
  return clamp(
    Number.isFinite(action && action.contentScale)
      ? action.contentScale
      : editorState.currentImageScale || DEFAULT_IMAGE_SCALE,
    1,
    3
  );
}

function getToolbarContextTool(activeTextAction, selectedAction) {
  if (activeTextAction) {
    return "text";
  }

  if (selectedAction) {
    return selectedAction.tool;
  }

  return editorState.currentTool;
}

function getToolbarContextLabel(contextTool) {
  if (!contextTool) {
    return "";
  }

  return `${t("editor.caption.appearance")}: ${t(`editor.tool.${contextTool}`)}`;
}

function getActiveToolbarColor(contextTool, activeTextAction, selectedAction) {
  if (contextTool === "text") {
    const activeTextColorTarget = normalizeTextColorTarget(editorState.currentTextColorTarget);
    const textAction =
      activeTextAction || (selectedAction && selectedAction.tool === "text" ? selectedAction : null);

    return activeTextColorTarget === "background"
      ? getTextActionBackgroundColor(textAction)
      : getTextActionColor(textAction);
  }

  if (selectedAction && canUpdateSelectedActionColor(selectedAction)) {
    return normalizeHexColor(selectedAction.color) || editorState.currentColor;
  }

  return normalizeHexColor(editorState.currentColor) || normalizeHexColor(colorPicker.value) || "#f97316";
}

function syncColorInputs(nextColor) {
  const normalizedColor =
    normalizeHexColor(nextColor) ||
    normalizeHexColor(editorState.currentColor) ||
    normalizeHexColor(colorPicker.value) ||
    "#f97316";

  colorPicker.value = normalizedColor;
  hexColorInput.value = normalizedColor.toUpperCase();
}

function syncAppearanceControls() {
  const activeTextAction = getActiveTextAction();
  const selectedAction = getSelectedAction();
  const contextTool = getToolbarContextTool(activeTextAction, selectedAction);
  const isTextContext = contextTool === "text";
  const isImageContext = contextTool === "image";
  const shouldEnableTextControls = Boolean(
    editorState.currentTool === "text" || editorState.textEditorSession || activeTextAction
  );
  const shouldEnableImageControls = Boolean(selectedAction && selectedAction.tool === "image");
  const visibleControlRoles = new Set();

  if (activeTextAction) {
    syncTextDefaultsFromAction(activeTextAction);
  }

  if (selectedAction && selectedAction.tool !== "text") {
    if (selectedAction.color) {
      editorState.currentColor = selectedAction.color;
    }

    if (canUpdateSelectedActionSize(selectedAction) && Number.isFinite(selectedAction.size)) {
      editorState.strokeWidth = selectedAction.size;
    }

    if (selectedAction.tool === "marker" && Number.isFinite(selectedAction.opacity)) {
      editorState.currentMarkerOpacity = selectedAction.opacity;
    }

    if (Number.isFinite(selectedAction.rotation)) {
      editorState.currentRotation = selectedAction.rotation;
    }

    if (selectedAction.tool === "redact" && Number.isFinite(selectedAction.borderRadius)) {
      editorState.currentRedactBorderRadius = selectedAction.borderRadius;
    }
  }

  if (selectedAction && selectedAction.tool === "image") {
    syncImageDefaultsFromAction(selectedAction);
  }

  syncColorInputs(getActiveToolbarColor(contextTool, activeTextAction, selectedAction));
  strokeWidthRange.value = String(editorState.strokeWidth);
  fontSizeRange.value = String(editorState.currentTextFontSize);
  textBackgroundModeSelect.value = editorState.currentTextBackgroundMode;
  textBackgroundOpacityRange.value = String(editorState.currentTextBackgroundOpacity);
  textBorderRadiusRange.value = String(editorState.currentTextBorderRadius);
  textListTypeSelect.value = editorState.currentTextListType;
  imageBorderRadiusRange.value = String(editorState.currentImageBorderRadius);
  imageScaleRange.value = String(Math.round(getImageActionScale(selectedAction) * 100));
  colorTargetSelect.value = normalizeTextColorTarget(editorState.currentTextColorTarget);

  if (COLOR_CONTROL_TOOLS.has(contextTool)) {
    visibleControlRoles.add("color");
  }

  if (SIZE_CONTROL_TOOLS.has(contextTool)) {
    visibleControlRoles.add("size");
  }

  if (contextTool === "marker") {
    visibleControlRoles.add("marker-opacity");
    visibleControlRoles.add("rotation");
  }

  if (["arrow", "circle", "rectangle", "text", "image"].includes(contextTool)) {
    visibleControlRoles.add("rotation");
  }

  if (contextTool === "redact") {
    visibleControlRoles.add("redact-radius");
    visibleControlRoles.add("rotation");
  }

  if (contextTool === "text") {
    visibleControlRoles.add("font");
    visibleControlRoles.add("text-background");
    visibleControlRoles.add("text-opacity");
    visibleControlRoles.add("text-radius");
    visibleControlRoles.add("text-style");
    visibleControlRoles.add("text-align");
    visibleControlRoles.add("text-list");
  }

  if (contextTool === "image") {
    visibleControlRoles.add("image-radius");
    visibleControlRoles.add("image-scale");
    visibleControlRoles.add("image-crop-actions");
  }

  contextualControls.forEach((control) => {
    const role = control.dataset.controlRole;
    const isVisible = visibleControlRoles.has(role);
    const isTextControl = control.dataset.textStyleControl === "true";
    const isImageControl = role.startsWith("image-");
    const isDisabled =
      (isVisible && isTextControl && !shouldEnableTextControls) ||
      (isVisible && isImageControl && !shouldEnableImageControls);

    control.classList.toggle("is-context-hidden", !isVisible);
    control.classList.toggle("is-disabled", isDisabled);

    control.querySelectorAll("input, select, button").forEach((element) => {
      element.disabled = !isVisible || isDisabled;
    });
  });

  textStyleControls.forEach((control) => {
    if (!control.classList.contains("is-context-hidden")) {
      control.classList.toggle("is-disabled", !shouldEnableTextControls);
    }
  });

  const hasContextControls = visibleControlRoles.size > 0;
  toolContextGroup.classList.toggle("is-hidden", !hasContextControls);
  colorTargetSelect.classList.toggle("is-hidden", !isTextContext);
  colorTargetSelect.disabled = !isTextContext || !visibleControlRoles.has("color");

  if (hasContextControls) {
    toolContextBadge.textContent = getToolbarContextLabel(contextTool);
  } else {
    toolContextBadge.textContent = "";
  }

  toolContextBadge.classList.toggle("is-hidden", !hasContextControls);
  eyedropperButton.classList.toggle("is-active", editorState.isColorPicking);
  textBoldButton.classList.toggle("is-active", editorState.currentTextBold);
  textItalicButton.classList.toggle("is-active", editorState.currentTextItalic);
  textUnderlineButton.classList.toggle("is-active", editorState.currentTextUnderline);
  textAlignButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.textAlign === editorState.currentTextAlign);
  });
  updateStrokeWidthValue();
  updateFontSizeValue();
  updateTextBackgroundOpacityValue();
  updateTextBorderRadiusValue();
  updateMarkerOpacityValue();
  updateRotationValue();
  updateRedactBorderRadiusValue();
  updateImageBorderRadiusValue();
  updateImageScaleValue();
  updateImageCropButtonLabel();
}

function mutateSelectedAction(mutator) {
  const selectedAction = getSelectedAction();

  if (!selectedAction) {
    return false;
  }

  const nextActions = cloneActions(editorState.actions);
  const targetAction = nextActions.find((action) => action.id === selectedAction.id);

  if (!targetAction) {
    return false;
  }

  mutator(targetAction);
  commitActions(nextActions, {
    selectedActionId: targetAction.id,
  });
  return true;
}

function canUpdateSelectedActionColor(action) {
  return Boolean(
    action &&
      ["marker", "arrow", "text", "pin", "circle", "rectangle"].includes(action.tool)
  );
}

function canUpdateSelectedActionSize(action) {
  return Boolean(
    action &&
      ["marker", "arrow", "pin", "circle", "rectangle", "blur", "redact"].includes(action.tool)
  );
}

function applyCurrentColor(nextColor, options = {}) {
  const normalizedColor = normalizeHexColor(nextColor);

  if (!normalizedColor) {
    return;
  }

  const activeTextAction = getActiveTextAction();
  const selectedAction = getSelectedAction();
  const contextTool = getToolbarContextTool(activeTextAction, selectedAction);

  if (contextTool === "text") {
    const colorTarget = normalizeTextColorTarget(editorState.currentTextColorTarget);

    if (colorTarget === "background") {
      editorState.currentTextBackgroundColor = normalizedColor;

      if (editorState.textEditorSession) {
        editorState.textEditorSession.action.backgroundColor = normalizedColor;
        applyTextEditorStyles();
        syncTextEditorDraftFromElement();
      } else if (options.updateSelectedAction && selectedAction && selectedAction.tool === "text") {
        mutateSelectedAction((action) => {
          action.backgroundColor = normalizedColor;
        });
        return;
      }
    } else {
      editorState.currentTextColor = normalizedColor;

      if (editorState.textEditorSession) {
        editorState.textEditorSession.action.color = normalizedColor;
        applyTextEditorStyles();
        syncTextEditorDraftFromElement();
      } else if (options.updateSelectedAction && selectedAction && selectedAction.tool === "text") {
        mutateSelectedAction((action) => {
          action.color = normalizedColor;
        });
        return;
      }
    }

    syncAppearanceControls();
    scheduleProjectSave();
    return;
  }

  editorState.currentColor = normalizedColor;

  if (options.updateSelectedAction && canUpdateSelectedActionColor(selectedAction)) {
    mutateSelectedAction((action) => {
      action.color = normalizedColor;
    });
    return;
  }

  syncAppearanceControls();
  scheduleProjectSave();
}

function applyTextColorTargetValue(nextValue) {
  editorState.currentTextColorTarget = normalizeTextColorTarget(nextValue);
  colorTargetSelect.value = editorState.currentTextColorTarget;
  syncAppearanceControls();
  scheduleProjectSave();
}

function commitHexColorInputValue(showError) {
  const rawValue = String(hexColorInput.value || "").trim();

  if (!rawValue) {
    syncAppearanceControls();
    return false;
  }

  const normalizedColor = normalizeHexColor(rawValue);

  if (!normalizedColor) {
    if (showError) {
      showNotice(t("editor.notice.invalidHexColor"), true);
    }

    syncAppearanceControls();
    return false;
  }

  applyCurrentColor(normalizedColor, {
    updateSelectedAction: true,
  });
  return true;
}

function applyStrokeWidthValue(nextValue, options = {}) {
  editorState.strokeWidth = Math.max(2, nextValue || 2);
  strokeWidthRange.value = String(editorState.strokeWidth);

  if (options.updateSelectedAction && !editorState.textEditorSession) {
    const selectedAction = getSelectedAction();

    if (canUpdateSelectedActionSize(selectedAction)) {
      mutateSelectedAction((action) => {
        action.size = resolveActionSize(action.tool, editorState.strokeWidth);
      });
      return;
    }
  }

  syncAppearanceControls();
  scheduleProjectSave();
}

function applyMarkerOpacityValue(nextValue, options = {}) {
  editorState.currentMarkerOpacity = clamp(nextValue || DEFAULT_MARKER_OPACITY, 10, 100);
  markerOpacityRange.value = String(editorState.currentMarkerOpacity);
  updateMarkerOpacityValue();

  if (options.updateSelectedAction) {
    const selectedAction = getSelectedAction();

    if (selectedAction && selectedAction.tool === "marker") {
      mutateSelectedAction((action) => {
        action.opacity = editorState.currentMarkerOpacity;
      });
      return;
    }
  }

  syncAppearanceControls();
  scheduleProjectSave();
}

function updateMarkerOpacityValue() {
  if (markerOpacityValue) {
    markerOpacityValue.textContent = `${Math.round(editorState.currentMarkerOpacity || DEFAULT_MARKER_OPACITY)}%`;
  }
}

function applyRotationValue(nextValue, options = {}) {
  editorState.currentRotation = clamp(Math.round(nextValue || 0), 0, 360);
  rotationRange.value = String(editorState.currentRotation);
  updateRotationValue();

  if (options.updateSelectedAction) {
    const selectedAction = getSelectedAction();

    if (selectedAction && (selectedAction.tool === "arrow" || selectedAction.tool === "circle" || selectedAction.tool === "rectangle" || selectedAction.tool === "text" || selectedAction.tool === "image")) {
      mutateSelectedAction((action) => {
        action.rotation = editorState.currentRotation;
      });
      return;
    }
  }

  syncAppearanceControls();
  scheduleProjectSave();
}

function updateRotationValue() {
  if (rotationValue) {
    rotationValue.textContent = `${Math.round(editorState.currentRotation || 0)}°`;
  }
}

function applyRedactBorderRadiusValue(nextValue, options = {}) {
  editorState.currentRedactBorderRadius = Math.max(0, Math.round(nextValue || 0));
  redactBorderRadiusRange.value = String(editorState.currentRedactBorderRadius);
  updateRedactBorderRadiusValue();

  if (options.updateSelectedAction) {
    const selectedAction = getSelectedAction();

    if (selectedAction && selectedAction.tool === "redact") {
      mutateSelectedAction((action) => {
        action.borderRadius = editorState.currentRedactBorderRadius;
      });
      return;
    }
  }

  syncAppearanceControls();
  scheduleProjectSave();
}

function updateRedactBorderRadiusValue() {
  if (redactBorderRadiusValue) {
    redactBorderRadiusValue.textContent = `${Math.round(editorState.currentRedactBorderRadius || 0)} px`;
  }
}

function applyTextFontSizeValue(nextValue, options = {}) {
  editorState.currentTextFontSize = Math.max(12, nextValue || DEFAULT_TEXT_SIZE);
  fontSizeRange.value = String(editorState.currentTextFontSize);

  if (editorState.textEditorSession) {
    editorState.textEditorSession.action.size = editorState.currentTextFontSize;
    applyTextEditorStyles();
    syncTextEditorDraftFromElement();
  } else if (options.updateSelectedAction) {
    const selectedAction = getSelectedAction();

    if (selectedAction && selectedAction.tool === "text") {
      mutateSelectedAction((action) => {
        action.size = editorState.currentTextFontSize;
      });
      return;
    }
  }

  syncAppearanceControls();
  scheduleProjectSave();
}

function applyTextBackgroundModeValue(nextValue, options = {}) {
  editorState.currentTextBackgroundMode = ["none", "highlight", "box"].includes(nextValue)
    ? nextValue
    : DEFAULT_TEXT_BACKGROUND_MODE;
  textBackgroundModeSelect.value = editorState.currentTextBackgroundMode;

  if (editorState.textEditorSession) {
    editorState.textEditorSession.action.backgroundMode = editorState.currentTextBackgroundMode;
    editorState.textEditorSession.action.backgroundColor = getTextActionBackgroundColor(
      editorState.textEditorSession.action
    );
    applyTextEditorStyles();
    syncTextEditorDraftFromElement();
  } else if (options.updateSelectedAction) {
    const selectedAction = getSelectedAction();

    if (selectedAction && selectedAction.tool === "text") {
      mutateSelectedAction((action) => {
        action.backgroundMode = editorState.currentTextBackgroundMode;
        action.backgroundColor = getTextActionBackgroundColor(action);
      });
      return;
    }
  }

  syncAppearanceControls();
  scheduleProjectSave();
}

function applyTextBackgroundOpacityValue(nextValue, options = {}) {
  editorState.currentTextBackgroundOpacity = clamp(
    Math.round(nextValue || 0),
    0,
    100
  );
  textBackgroundOpacityRange.value = String(editorState.currentTextBackgroundOpacity);

  if (editorState.textEditorSession) {
    editorState.textEditorSession.action.backgroundOpacity = editorState.currentTextBackgroundOpacity;
    applyTextEditorStyles();
  } else if (options.updateSelectedAction) {
    const selectedAction = getSelectedAction();

    if (selectedAction && selectedAction.tool === "text") {
      mutateSelectedAction((action) => {
        action.backgroundOpacity = editorState.currentTextBackgroundOpacity;
      });
      return;
    }
  }

  syncAppearanceControls();
  scheduleProjectSave();
}

function applyTextBorderRadiusValue(nextValue, options = {}) {
  editorState.currentTextBorderRadius = Math.max(0, nextValue || 0);
  textBorderRadiusRange.value = String(editorState.currentTextBorderRadius);

  if (editorState.textEditorSession) {
    editorState.textEditorSession.action.borderRadius = editorState.currentTextBorderRadius;
    applyTextEditorStyles();
  } else if (options.updateSelectedAction) {
    const selectedAction = getSelectedAction();

    if (selectedAction && selectedAction.tool === "text") {
      mutateSelectedAction((action) => {
        action.borderRadius = editorState.currentTextBorderRadius;
      });
      return;
    }
  }

  syncAppearanceControls();
  scheduleProjectSave();
}

function applyTextAlignValue(nextValue, options = {}) {
  editorState.currentTextAlign = ["left", "center", "right", "justify"].includes(nextValue)
    ? nextValue
    : DEFAULT_TEXT_ALIGN;

  if (editorState.textEditorSession) {
    editorState.textEditorSession.action.textAlign = editorState.currentTextAlign;
    applyTextEditorStyles();
    syncTextEditorDraftFromElement();
  } else if (options.updateSelectedAction) {
    const selectedAction = getSelectedAction();

    if (selectedAction && selectedAction.tool === "text") {
      mutateSelectedAction((action) => {
        action.textAlign = editorState.currentTextAlign;
      });
      return;
    }
  }

  syncAppearanceControls();
  scheduleProjectSave();
}

function applyTextStyleToggle(styleKey, options = {}) {
  if (!["bold", "italic", "underline"].includes(styleKey)) {
    return;
  }

  const stateKey = `currentText${styleKey[0].toUpperCase()}${styleKey.slice(1)}`;
  editorState[stateKey] = !editorState[stateKey];

  if (editorState.textEditorSession) {
    editorState.textEditorSession.action[styleKey] = editorState[stateKey];
    applyTextEditorStyles();
    syncTextEditorDraftFromElement();
  } else if (options.updateSelectedAction) {
    const selectedAction = getSelectedAction();

    if (selectedAction && selectedAction.tool === "text") {
      mutateSelectedAction((action) => {
        action[styleKey] = editorState[stateKey];
      });
      return;
    }
  }

  syncAppearanceControls();
  scheduleProjectSave();
}

function applyTextListTypeValue(nextValue, options = {}) {
  editorState.currentTextListType = ["none", "bullet", "number"].includes(nextValue)
    ? nextValue
    : DEFAULT_TEXT_LIST_TYPE;
  textListTypeSelect.value = editorState.currentTextListType;

  if (editorState.textEditorSession) {
    editorState.textEditorSession.action.listType = editorState.currentTextListType;
    updateTextEditorContent();
    syncTextEditorDraftFromElement();
  } else if (options.updateSelectedAction) {
    const selectedAction = getSelectedAction();

    if (selectedAction && selectedAction.tool === "text") {
      mutateSelectedAction((action) => {
        action.listType = editorState.currentTextListType;
      });
      return;
    }
  }

  syncAppearanceControls();
  scheduleProjectSave();
}

function applyImageBorderRadiusValue(nextValue, options = {}) {
  editorState.currentImageBorderRadius = Math.max(0, Math.round(nextValue || 0));
  imageBorderRadiusRange.value = String(editorState.currentImageBorderRadius);

  if (options.updateSelectedAction) {
    const selectedAction = getSelectedAction();

    if (selectedAction && selectedAction.tool === "image") {
      mutateSelectedAction((action) => {
        action.borderRadius = editorState.currentImageBorderRadius;
      });
      return;
    }
  }

  syncAppearanceControls();
  scheduleProjectSave();
}

function applyImageScaleValue(nextValue, options = {}) {
  editorState.currentImageScale = clamp(nextValue || DEFAULT_IMAGE_SCALE, 1, 3);
  imageScaleRange.value = String(Math.round(editorState.currentImageScale * 100));

  if (options.updateSelectedAction) {
    const selectedAction = getSelectedAction();

    if (selectedAction && selectedAction.tool === "image") {
      mutateSelectedAction((action) => {
        action.contentScale = editorState.currentImageScale;
        clampImageCropOffsets(action);
      });
      return;
    }
  }

  syncAppearanceControls();
  scheduleProjectSave();
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
    window.setTimeout(() => {
      const activeElement = document.activeElement;

      if (
        activeElement instanceof HTMLElement &&
        activeElement.closest(".editor-toolbar, .editor-tool-sidebar, .editor-inspector, .share-menu")
      ) {
        return;
      }

      commitTextEditor().catch((error) => {
        showNotice(normalizeError(error), true);
      });
    }, 0);
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

  textEditorElement.addEventListener("input", () => {
    syncTextEditorListPresentation();
    syncTextEditorDraftFromElement();
    updateTextEditorStyles();
  });

  canvasStage.appendChild(textEditorElement);
  return textEditorElement;
}

function updateTextEditorStyles() {
  if (!textEditorElement || !editorState.textEditorSession) {
    return;
  }

  const action = editorState.textEditorSession.action;
  const textColor = getTextActionColor(action);
  const backgroundColor = getTextActionBackgroundColor(action);
  const backgroundAlpha = getTextActionBackgroundOpacity(action) / 100;
  const borderAlpha = Math.max(0.18, Math.min(1, backgroundAlpha + 0.18));
  const tintStrong = toRgba(backgroundColor, backgroundAlpha);
  const tintBorder = toRgba(backgroundColor, borderAlpha);
  const isBold = getTextActionWeight(action);
  const isItalic = getTextActionItalic(action);
  const isUnderline = getTextActionUnderline(action);

  textEditorElement.style.color = textColor;
  textEditorElement.style.fontWeight = isBold ? "700" : "500";
  textEditorElement.style.fontStyle = isItalic ? "italic" : "normal";
  textEditorElement.style.textDecoration = isUnderline ? "underline" : "none";
  textEditorElement.style.textAlign = getTextActionAlign(action);
  textEditorElement.style.borderRadius = `${Math.max(0, action.borderRadius || 0)}px`;

  const backgroundMode = action.backgroundMode || DEFAULT_TEXT_BACKGROUND_MODE;
  if (backgroundMode === "highlight" || backgroundMode === "box") {
    textEditorElement.style.background = tintStrong + " !important";
  } else {
    textEditorElement.style.background = "rgba(255, 255, 255, 0.05) !important";
  }
}

function updateTextEditorContent() {
  syncTextEditorListPresentation();
}

function syncTextEditorListPresentation() {
  if (!textEditorElement || !editorState.textEditorSession) {
    return "";
  }

  const action = editorState.textEditorSession.action;
  const listType = getTextActionListType(action);
  const currentText = textEditorElement.value;
  const rawText = getEditorRawText(currentText, listType);

  if (!currentText && !rawText) {
    return rawText;
  }

  const formattedText =
    listType === "none" ? rawText : formatTextForList(rawText, listType);
  const selectionStart = Number.isFinite(textEditorElement.selectionStart)
    ? textEditorElement.selectionStart
    : currentText.length;
  const selectionEnd = Number.isFinite(textEditorElement.selectionEnd)
    ? textEditorElement.selectionEnd
    : currentText.length;
  const rawSelectionStart = getRawTextOffsetFromEditorText(currentText, selectionStart);
  const rawSelectionEnd = getRawTextOffsetFromEditorText(currentText, selectionEnd);

  if (currentText === formattedText) {
    return rawText;
  }

  textEditorElement.value = formattedText;
  textEditorElement.selectionStart = getEditorTextOffsetFromRawText(
    rawText,
    rawSelectionStart,
    listType
  );
  textEditorElement.selectionEnd = getEditorTextOffsetFromRawText(
    rawText,
    rawSelectionEnd,
    listType
  );

  return rawText;
}

function getEditorRawText(value, listType) {
  const textValue = String(value || "");

  if (listType === "none") {
    return textValue;
  }

  return removeListFormatting(textValue);
}

function getEditorListPrefixLength(line) {
  if (line.startsWith("\u2022 ")) {
    return 2;
  }

  const numberPrefixMatch = line.match(/^\d+\.\s/);
  return numberPrefixMatch ? numberPrefixMatch[0].length : 0;
}

function getRawTextOffsetFromEditorText(text, offset) {
  const textValue = String(text || "");
  const safeOffset = clamp(Math.round(offset || 0), 0, textValue.length);
  const lines = splitTextLines(textValue);
  let consumed = 0;
  let rawOffset = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lineEnd = consumed + line.length;

    if (safeOffset <= lineEnd) {
      return rawOffset + Math.max(0, safeOffset - consumed - getEditorListPrefixLength(line));
    }

    rawOffset += Math.max(0, line.length - getEditorListPrefixLength(line));
    consumed = lineEnd;

    if (index < lines.length - 1) {
      consumed += 1;
      rawOffset += 1;

      if (safeOffset <= consumed) {
        return rawOffset;
      }
    }
  }

  return rawOffset;
}

function getEditorTextOffsetFromRawText(rawText, rawOffset, listType) {
  const safeRawText = String(rawText || "");
  const safeRawOffset = clamp(Math.round(rawOffset || 0), 0, safeRawText.length);

  if (listType === "none") {
    return safeRawOffset;
  }

  return formatTextForList(safeRawText.slice(0, safeRawOffset), listType).length;
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
    await ensureActionAssetsLoaded(editorState.actions);
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
  editorState.currentTextColor =
    (storedProject && storedProject.currentTextColor) ||
    editorState.currentColor;
  editorState.currentTextBackgroundColor =
    (storedProject && storedProject.currentTextBackgroundColor) ||
    editorState.currentTextColor;
  editorState.currentTextColorTarget = normalizeTextColorTarget(
    storedProject && storedProject.currentTextColorTarget
  );
  editorState.strokeWidth = Number.isFinite(storedProject && storedProject.strokeWidth)
    ? storedProject.strokeWidth
    : Number(strokeWidthRange.value);
  editorState.currentTextFontSize = Number.isFinite(storedProject && storedProject.currentTextFontSize)
    ? storedProject.currentTextFontSize
    : Number(fontSizeRange.value);
  editorState.currentTextBackgroundMode =
    (storedProject && storedProject.currentTextBackgroundMode) || DEFAULT_TEXT_BACKGROUND_MODE;
  editorState.currentTextBackgroundOpacity = Number.isFinite(
    storedProject && storedProject.currentTextBackgroundOpacity
  )
    ? clamp(Math.round(storedProject.currentTextBackgroundOpacity), 0, 100)
    : Number(textBackgroundOpacityRange.value);
  editorState.currentTextBorderRadius = Number.isFinite(
    storedProject && storedProject.currentTextBorderRadius
  )
    ? storedProject.currentTextBorderRadius
    : Number(textBorderRadiusRange.value);
  editorState.currentTextAlign =
    (storedProject && storedProject.currentTextAlign) || DEFAULT_TEXT_ALIGN;
  editorState.currentTextBold = Boolean(storedProject && storedProject.currentTextBold);
  editorState.currentTextItalic = Boolean(storedProject && storedProject.currentTextItalic);
  editorState.currentTextUnderline = Boolean(storedProject && storedProject.currentTextUnderline);
  editorState.currentTextListType =
    (storedProject && storedProject.currentTextListType) || DEFAULT_TEXT_LIST_TYPE;
  editorState.currentImageBorderRadius = Number.isFinite(
    storedProject && storedProject.currentImageBorderRadius
  )
    ? storedProject.currentImageBorderRadius
    : Number(imageBorderRadiusRange.value);
  editorState.currentImageScale = clamp(
    Number.isFinite(storedProject && storedProject.currentImageScale)
      ? storedProject.currentImageScale
      : DEFAULT_IMAGE_SCALE,
    1,
    3
  );
  editorState.currentTool = (storedProject && storedProject.currentTool) || "marker";
  editorState.imageCropModeActionId = null;
  editorState.imageCropSession = null;
  editorState.currentMarkerOpacity = Number.isFinite(
    storedProject && storedProject.currentMarkerOpacity
  )
    ? clamp(Math.round(storedProject.currentMarkerOpacity), 10, 100)
    : Number(markerOpacityRange.value);

  syncColorInputs(editorState.currentColor);
  strokeWidthRange.value = String(editorState.strokeWidth);
  markerOpacityRange.value = String(editorState.currentMarkerOpacity);
  fontSizeRange.value = String(editorState.currentTextFontSize);
  textBackgroundModeSelect.value = editorState.currentTextBackgroundMode;
  textBackgroundOpacityRange.value = String(editorState.currentTextBackgroundOpacity);
  textBorderRadiusRange.value = String(editorState.currentTextBorderRadius);
  textListTypeSelect.value = editorState.currentTextListType;
  imageBorderRadiusRange.value = String(editorState.currentImageBorderRadius);
  imageScaleRange.value = String(Math.round(editorState.currentImageScale * 100));
  colorTargetSelect.value = editorState.currentTextColorTarget;
  updateStrokeWidthValue();
  updateFontSizeValue();
  updateTextBackgroundOpacityValue();
  updateTextBorderRadiusValue();
  updateImageBorderRadiusValue();
  updateImageScaleValue();
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

async function ensureActionAssetsLoaded(actions) {
  const imageActions = Array.isArray(actions)
    ? actions.filter((action) => action && action.tool === "image" && action.imageDataUrl)
    : [];

  await Promise.all(
    imageActions.map((action) => preloadImageAsset(action.imageDataUrl))
  );
}

async function preloadImageAsset(dataUrl) {
  if (!dataUrl) {
    return null;
  }

  const cachedAsset = imageAssetCache.get(dataUrl);

  if (cachedAsset instanceof HTMLImageElement) {
    return cachedAsset;
  }

  if (cachedAsset && typeof cachedAsset.then === "function") {
    return cachedAsset;
  }

  const loader = createImage(dataUrl)
    .then((image) => {
      imageAssetCache.set(dataUrl, image);
      return image;
    })
    .catch((error) => {
      imageAssetCache.delete(dataUrl);
      throw error;
    });

  imageAssetCache.set(dataUrl, loader);
  return loader;
}

function getLoadedImageAsset(dataUrl) {
  const cachedAsset = imageAssetCache.get(dataUrl);
  return cachedAsset instanceof HTMLImageElement ? cachedAsset : null;
}

function getViewportCenterCanvasPoint() {
  const viewportRect = canvasViewport.getBoundingClientRect();
  return getCanvasPointFromClient(
    viewportRect.left + viewportRect.width / 2,
    viewportRect.top + viewportRect.height / 2
  );
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(t("editor.error.importImage")));
    reader.readAsDataURL(file);
  });
}

async function importImageFromInput() {
  if (!imageUploadInput.files || !imageUploadInput.files[0]) {
    return;
  }

  if (!baseCanvas.width || !baseCanvas.height) {
    throw new Error(t("editor.error.importImageUnavailable"));
  }

  if (editorState.textEditorSession) {
    await commitTextEditor();
  }

  const file = imageUploadInput.files[0];
  const dataUrl = await readFileAsDataUrl(file);
  const image = await preloadImageAsset(dataUrl);
  const centerPoint = getViewportCenterCanvasPoint();
  const maxWidth = Math.max(MIN_IMAGE_BOX_SIZE, Math.min(baseCanvas.width * 0.52, 760));
  const maxHeight = Math.max(MIN_IMAGE_BOX_SIZE, Math.min(baseCanvas.height * 0.52, 560));
  const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight, 1.4);
  const width = Math.max(MIN_IMAGE_BOX_SIZE, Math.round(image.naturalWidth * scale));
  const height = Math.max(MIN_IMAGE_BOX_SIZE, Math.round(image.naturalHeight * scale));
  const imageAction = {
    id: createActionId(),
    tool: "image",
    imageDataUrl: dataUrl,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    x: clamp(centerPoint.x - width / 2, 0, Math.max(0, baseCanvas.width - width)),
    y: clamp(centerPoint.y - height / 2, 0, Math.max(0, baseCanvas.height - height)),
    width,
    height,
    borderRadius: editorState.currentImageBorderRadius || DEFAULT_IMAGE_BORDER_RADIUS,
    contentScale: editorState.currentImageScale || DEFAULT_IMAGE_SCALE,
    contentOffsetX: 0,
    contentOffsetY: 0,
  };

  imageUploadInput.value = "";
  commitActions([...editorState.actions, imageAction], {
    selectedActionId: imageAction.id,
  });
  setActiveTool("select");
  showNotice(t("editor.notice.imageImported"));
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

  closeShareMenu();

  if (editorState.textEditorSession && tool !== "text") {
    cancelTextEditor();
  }

  editorState.currentTool = tool;

  if (!shouldKeepSelectionForTool(tool)) {
    editorState.selectedActionId = null;
    editorState.imageCropModeActionId = null;
  }

  if (editorState.isColorPicking) {
    stopColorPickingMode(true);
  }

  if (editorState.isDrawing) {
    editorState.draftAction = null;
    editorState.isDrawing = false;
    editorState.activePointerId = null;
  }

  if (editorState.imageCropSession) {
    editorState.imageCropSession = null;
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
  if (tool === "move" || tool === "select") {
    return true;
  }

  const selectedAction = getSelectedAction();
  return Boolean(selectedAction && selectedAction.tool === tool);
}

function handlePointerDown(event) {

  // Always reset drawing state when starting any pointer interaction
  editorState.isDrawing = false;
  editorState.activePointerId = null;
  editorState.draftAction = null;

  if (!baseCanvas.width || event.button !== 0) {
    return;
  }

  if (editorState.isColorPicking) {
    event.preventDefault();
    sampleColorAtPoint(getCanvasPoint(event));
    return;
  }

  if (editorState.textEditorSession && event.target !== textEditorElement) {
    event.preventDefault();
    commitTextEditor().catch((error) => {
      showNotice(normalizeError(error), true);
    });
    return;
  }

  if (shouldPanInsteadOfDraw()) {
    startPan(event);
    return;
  }

  const point = getCanvasPoint(event);
  const hadSelection = Boolean(getSelectedAction());

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
      if (hitAction.tool === "image" && editorState.imageCropModeActionId === hitAction.id) {
        startImageCropMove(event, hitAction, point);
        return;
      }

      if (editorState.currentTool === "text" && hitAction.tool === "text") {
        reopenTextActionForEditing(hitAction);
        return;
      }

      const isSelectTool = editorState.currentTool === "select";
      const alreadySelected = hitAction.id === editorState.selectedActionId;

      if (isSelectTool && alreadySelected && isMovableAction(hitAction)) {
        startActionMove(event, hitAction, point);
      } else if (isSelectTool && isMovableAction(hitAction)) {
        editorState.selectedActionId = hitAction.id;
        startActionMove(event, hitAction, point);
        updateToolbarState();
      } else if (alreadySelected && isMovableAction(hitAction)) {
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

    if (hadSelection) {
      renderEditorCanvas();
      return;
    }
  } else if (FREEHAND_TOOLS.has(editorState.currentTool)) {
    const selectedAction = getSelectedAction();

    if (selectedAction && selectedAction.tool === editorState.currentTool) {
      const hitAction = findSelectableActionAtPoint(point);

      if (hitAction && hitAction.id === selectedAction.id && isMovableAction(hitAction)) {
        startActionMove(event, hitAction, point);
        return;
      }
    }
    
    // Clear selection when starting a new freehand action on empty area
    // Let startDraftAction handle rendering via renderEditorCanvas()
    editorState.selectedActionId = null;
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

function handleCanvasDoubleClick(event) {
  if (!baseCanvas.width || event.button !== 0 || editorState.isColorPicking) {
    return;
  }

  const point = getCanvasPointFromClient(event.clientX, event.clientY);
  const hitAction = findSelectableActionAtPoint(point);

  if (!hitAction) {
    return;
  }

  event.preventDefault();

  if (hitAction.tool === "text") {
    reopenTextActionForEditing(hitAction);
    return;
  }

  if (hitAction.tool === "image") {
    editorState.selectedActionId = hitAction.id;
    toggleSelectedImageCropMode();
  }
}

function handlePointerMove(event) {
  updateAutoScrollPointer(event);

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

  if (
    editorState.imageCropSession &&
    editorState.imageCropSession.pointerId === event.pointerId
  ) {
    event.preventDefault();
    updateImageCropMove(getCanvasPoint(event));
    return;
  }

  if (!editorState.isDrawing || editorState.activePointerId !== event.pointerId || !editorState.draftAction) {
    return;
  }

  const point = getCanvasPoint(event);
  updateDraftAction(point, event.shiftKey);
}

function handlePointerUp(event) {
  stopAutoScrollSession(event.pointerId);

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

  if (
    editorState.imageCropSession &&
    editorState.imageCropSession.pointerId === event.pointerId
  ) {
    finishImageCropMove(event.pointerId);
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
    handleMode: handleHit.mode || "resize",
    previousSnapshot: createSnapshot(),
    previousActions: cloneActions(editorState.actions),
  };

  annotationCanvas.setPointerCapture(event.pointerId);
  startAutoScrollSession(event, "resize");
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

  if (action.tool === "text") {
    resizeTextAction(action, session.handle, point);
  } else if (action.tool === "image") {
    if (session.handleMode === "crop") {
      cropImageAction(action, session.handle, point);
    } else {
      resizeImageAction(action, session.handle, point, shouldSnap);
    }
  } else {
    resizeBoxAction(action, session.handle, point, shouldSnap);
  }
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
  startAutoScrollSession(event, "move");
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

function startImageCropMove(event, action, point) {
  editorState.imageCropSession = {
    pointerId: event.pointerId,
    actionId: action.id,
    originPoint: point,
    previousSnapshot: createSnapshot(),
    previousActions: cloneActions(editorState.actions),
  };

  annotationCanvas.setPointerCapture(event.pointerId);
  startAutoScrollSession(event, "image-crop");
}

function updateImageCropMove(point) {
  const session = editorState.imageCropSession;

  if (!session) {
    return;
  }

  const nextActions = cloneActions(session.previousActions);
  const action = nextActions.find((item) => item.id === session.actionId);

  if (!action || action.tool !== "image") {
    return;
  }

  action.contentOffsetX = (action.contentOffsetX || 0) + (point.x - session.originPoint.x);
  action.contentOffsetY = (action.contentOffsetY || 0) + (point.y - session.originPoint.y);
  clampImageCropOffsets(action);
  editorState.actions = nextActions;
  renderEditorCanvas();
}

function finishImageCropMove(pointerId) {
  const session = editorState.imageCropSession;

  if (!session) {
    return;
  }

  editorState.imageCropSession = null;
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
  startAutoScrollSession(event, "draw");

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

function reopenTextActionForEditing(action) {
  if (!action || action.tool !== "text") {
    return;
  }

  if (
    editorState.textEditorSession &&
    editorState.textEditorSession.actionId === action.id &&
    textEditorElement &&
    !textEditorElement.classList.contains("is-hidden")
  ) {
    requestAnimationFrame(() => {
      textEditorElement.focus();
      textEditorElement.select();
    });
    return;
  }

  editorState.selectedActionId = action.id;
  updateToolbarState();
  beginTextEditor({ x: action.x, y: action.y }, action);
  renderEditorCanvas();
}

function beginTextEditor(point, existingAction) {
  ensureTextEditorElement();

  const action = existingAction || getSelectedAction();
  const editingExisting = Boolean(action && action.tool === "text");
  const seedAction = editingExisting
    ? {
        ...action,
      }
    : {
        id: createActionId(),
        tool: "text",
        color: editorState.currentTextColor,
        backgroundColor: editorState.currentTextBackgroundColor,
        size: resolveActionSize("text", editorState.currentTextFontSize),
        x: point.x,
        y: point.y,
        text: "",
        backgroundMode: editorState.currentTextBackgroundMode,
        backgroundOpacity: editorState.currentTextBackgroundOpacity,
        borderRadius: editorState.currentTextBorderRadius,
        textAlign: editorState.currentTextAlign,
        bold: editorState.currentTextBold,
        italic: editorState.currentTextItalic,
        underline: editorState.currentTextUnderline,
        listType: editorState.currentTextListType,
      };
  const initialMetrics = measureTextAction(seedAction, seedAction.text || t("editor.text.placeholder"));
  const textAction = {
    ...seedAction,
    width: Number.isFinite(seedAction.width)
      ? Math.max(MIN_TEXT_BOX_WIDTH, seedAction.width)
      : Math.max(DEFAULT_TEXT_BOX_WIDTH, initialMetrics.width),
    height: Number.isFinite(seedAction.height)
      ? Math.max(MIN_TEXT_BOX_HEIGHT, seedAction.height)
      : Math.max(DEFAULT_TEXT_BOX_HEIGHT, initialMetrics.height),
  };

  syncTextDefaultsFromAction(textAction);

  editorState.textEditorSession = {
    actionId: editingExisting ? textAction.id : null,
    action: textAction,
  };

  textEditorElement.value = editingExisting
    ? formatTextForList(textAction.text, getTextActionListType(textAction))
    : "";
  textEditorElement.classList.remove("is-hidden");
  syncTextEditorPosition();
  updateTextEditorStyles();

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
  const rawEditorText = getEditorRawText(
    textEditorElement.value,
    getTextActionListType(action)
  );
  const metrics = measureTextAction(action, rawEditorText || action.text || " ");

  action.width = Math.max(
    MIN_TEXT_BOX_WIDTH,
    Number.isFinite(action.width) ? Math.max(action.width, metrics.width) : metrics.width
  );
  action.height = Math.max(
    MIN_TEXT_BOX_HEIGHT,
    Number.isFinite(action.height) ? Math.max(action.height, metrics.height) : metrics.height
  );

  const container = textEditorElement;
  container.style.left = `${Math.round(action.x * zoom)}px`;
  container.style.top = `${Math.round(action.y * zoom)}px`;
  container.style.width = `${Math.max(MIN_TEXT_BOX_WIDTH, Math.round(action.width * zoom))}px`;
  container.style.height = `${Math.max(MIN_TEXT_BOX_HEIGHT, Math.round(action.height * zoom))}px`;
  textEditorElement.style.fontSize = `${Math.max(12, Math.round(action.size * zoom))}px`;
  applyTextEditorStyles();
}

function applyTextEditorStyles() {
  if (!editorState.textEditorSession || !textEditorElement) {
    return;
  }
  updateTextEditorStyles();
}

function syncTextEditorDraftFromElement() {
  if (!editorState.textEditorSession || !textEditorElement) {
    return;
  }

  const session = editorState.textEditorSession;
  const zoom = Math.max(editorState.zoom, 0.1);
  const currentHeight = textEditorElement.offsetHeight;
  const rawText = getEditorRawText(
    textEditorElement.value,
    getTextActionListType(session.action)
  );

  textEditorElement.style.height = "auto";
  textEditorElement.style.height = `${Math.max(currentHeight, textEditorElement.scrollHeight)}px`;

  const width = Math.max(MIN_TEXT_BOX_WIDTH, textEditorElement.offsetWidth / zoom);
  const nextAction = {
    ...session.action,
    text: rawText,
    width,
  };
  const minMetrics = measureTextAction(nextAction, nextAction.text || " ");

  session.action = {
    ...nextAction,
    height: Math.max(
      MIN_TEXT_BOX_HEIGHT,
      textEditorElement.offsetHeight / zoom,
      minMetrics.height
    ),
  };

  applyTextEditorStyles();
}

async function commitTextEditor() {
  if (!editorState.textEditorSession || !textEditorElement) {
    return;
  }

  syncTextEditorDraftFromElement();

  const session = editorState.textEditorSession;
  const listType = getTextActionListType(session.action);
  const rawValue = getEditorRawText(textEditorElement.value, listType);
  const value = rawValue.trim();

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

    syncAppearanceControls();
    return;
  }

  const nextAction = {
    ...session.action,
    color: getTextActionColor(session.action),
    backgroundColor: getTextActionBackgroundColor(session.action),
    backgroundOpacity: getTextActionBackgroundOpacity(session.action),
    size: resolveActionSize("text", session.action.size || editorState.currentTextFontSize),
    text: value,
    backgroundMode: session.action.backgroundMode || DEFAULT_TEXT_BACKGROUND_MODE,
    borderRadius: Math.max(0, session.action.borderRadius || 0),
    textAlign: getTextActionAlign(session.action),
    bold: getTextActionWeight(session.action),
    italic: getTextActionItalic(session.action),
    underline: getTextActionUnderline(session.action),
    listType: getTextActionListType(session.action),
    width: Math.max(MIN_TEXT_BOX_WIDTH, session.action.width || DEFAULT_TEXT_BOX_WIDTH),
    height: Math.max(MIN_TEXT_BOX_HEIGHT, session.action.height || DEFAULT_TEXT_BOX_HEIGHT),
  };

  syncTextDefaultsFromAction(nextAction);

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
  syncAppearanceControls();
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
    if (shouldHideActionWhileEditing(action)) {
      continue;
    }

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

  if (action.tool === "marker") {
    context.globalAlpha = getMarkerOpacity(action) / 100;
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
    case "image":
      drawImageAction(context, action);
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
  const rotation = Number.isFinite(action.rotation) ? action.rotation : 0;

  context.save();
  if (rotation !== 0) {
    context.translate(centerX, centerY);
    context.rotate((rotation * Math.PI) / 180);
    context.translate(-centerX, -centerY);
  }

  context.beginPath();
  context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
  context.stroke();

  context.restore();
}

function drawRectangle(context, action) {
  const bounds = getActionBounds(action);
  const rotation = Number.isFinite(action.rotation) ? action.rotation : 0;
  const centerX = (bounds.left + bounds.right) / 2;
  const centerY = (bounds.top + bounds.bottom) / 2;

  context.save();
  if (rotation !== 0) {
    context.translate(centerX, centerY);
    context.rotate((rotation * Math.PI) / 180);
    context.translate(-centerX, -centerY);
  }

  context.beginPath();
  context.rect(bounds.left, bounds.top, bounds.width, bounds.height);
  context.stroke();

  context.restore();
}

function drawArrow(context, action) {
  const geometry = getArrowGeometry(action);
  const rotation = Number.isFinite(action.rotation) ? action.rotation : 0;
  const centerX = (geometry.start.x + geometry.tip.x) / 2;
  const centerY = (geometry.start.y + geometry.tip.y) / 2;

  context.save();
  if (rotation !== 0) {
    context.translate(centerX, centerY);
    context.rotate((rotation * Math.PI) / 180);
    context.translate(-centerX, -centerY);
  }
  context.lineCap = "butt";
  context.beginPath();
  context.moveTo(geometry.start.x, geometry.start.y);
  context.lineTo(geometry.shaftEnd.x, geometry.shaftEnd.y);
  context.stroke();

  context.beginPath();
  context.moveTo(geometry.tip.x, geometry.tip.y);
  context.lineTo(geometry.leftWing.x, geometry.leftWing.y);
  context.lineTo(geometry.rightWing.x, geometry.rightWing.y);
  context.closePath();
  context.fill();
  context.restore();
}

function drawTextAction(context, action) {
  const metrics = measureTextAction(action, action.text);
  const rotation = Number.isFinite(action.rotation) ? action.rotation : 0;
  const centerX = action.x + metrics.width / 2;
  const centerY = action.y + metrics.height / 2;

  context.save();
  if (rotation !== 0) {
    context.translate(centerX, centerY);
    context.rotate((rotation * Math.PI) / 180);
    context.translate(-centerX, -centerY);
  }

  const textColor = getTextActionColor(action);
  const backgroundColor = getTextActionBackgroundColor(action);
  const backgroundAlpha = getTextActionBackgroundOpacity(action) / 100;
  const align = getTextActionAlign(action);
  const contentWidth = Math.max(1, metrics.contentWidth || metrics.width);

  if (action.backgroundMode === "highlight") {
    context.fillStyle = toRgba(backgroundColor, backgroundAlpha);

    metrics.lines.forEach((line, index) => {
      const lineWidth = metrics.lineWidths[index] || 0;
      const highlightLeft = getTextLineX(action, metrics, lineWidth) - metrics.paddingX;
      const highlightTop = action.y + index * metrics.lineHeight;
      const highlightWidth = Math.max(
        (align === "justify" && index < metrics.lines.length - 1 ? contentWidth : lineWidth) +
          metrics.paddingX * 2,
        metrics.paddingX * 2 + Math.max(1, (action.size || DEFAULT_TEXT_SIZE) * 0.35)
      );
      const highlightHeight = metrics.lineHeight + metrics.paddingY * 2;

      drawRoundedRect(
        context,
        highlightLeft,
        highlightTop,
        highlightWidth,
        highlightHeight,
        action.borderRadius || 0
      );
      context.fill();
    });
  } else if (action.backgroundMode === "box") {
    context.fillStyle = toRgba(backgroundColor, backgroundAlpha);
    drawRoundedRect(
      context,
      action.x,
      action.y,
      metrics.width,
      metrics.height,
      action.borderRadius || 0
    );
    context.fill();
  }

  context.fillStyle = textColor;
  context.font = getTextFont(action.size, action);
  context.textBaseline = "top";

  metrics.lines.forEach((line, index) => {
    const lineWidth = metrics.lineWidths[index] || 0;
    const baseX = getTextLineX(action, metrics, lineWidth);
    const baseY = action.y + metrics.textOffsetY + index * metrics.lineHeight;
    const shouldJustify =
      align === "justify" &&
      index < metrics.lines.length - 1 &&
      /\s/.test(line) &&
      !/^\s*(?:\d+\.)?\s*$/.test(line);

    if (shouldJustify) {
      drawJustifiedTextLine(context, line, baseX, baseY, contentWidth);
    } else {
      context.fillText(line, baseX, baseY);
    }

    if (getTextActionUnderline(action)) {
      drawTextUnderline(
        context,
        baseX,
        baseY,
        shouldJustify ? contentWidth : lineWidth,
        action.size || DEFAULT_TEXT_SIZE,
        textColor,
        metrics.lineHeight
      );
    }
  });

  context.restore();
}

function drawImageAction(context, action) {
  const image = getLoadedImageAsset(action.imageDataUrl);
  const rotation = Number.isFinite(action.rotation) ? action.rotation : 0;
  const frame = getActionBounds(action);
  const centerX = (frame.left + frame.right) / 2;
  const centerY = (frame.top + frame.bottom) / 2;

  if (!image) {
    context.save();
    if (rotation !== 0) {
      context.translate(centerX, centerY);
      context.rotate((rotation * Math.PI) / 180);
      context.translate(-centerX, -centerY);
    }
    context.strokeStyle = "rgba(18, 18, 18, 0.18)";
    context.setLineDash([10, 8]);
    context.strokeRect(action.x, action.y, action.width, action.height);
    context.restore();
    return;
  }

  const layout = getImageActionLayout(action, image);

  context.save();
  if (rotation !== 0) {
    context.translate(centerX, centerY);
    context.rotate((rotation * Math.PI) / 180);
    context.translate(-centerX, -centerY);
  }
  drawRoundedRect(
    context,
    frame.left,
    frame.top,
    frame.width,
    frame.height,
    getImageActionBorderRadius(action)
  );
  context.clip();
  context.drawImage(image, layout.drawX, layout.drawY, layout.drawWidth, layout.drawHeight);
  context.restore();
}

function getTextLineX(action, metrics, lineWidth) {
  const align = getTextActionAlign(action);
  const contentWidth = Math.max(1, metrics.contentWidth || metrics.width);
  const startX = action.x + metrics.textOffsetX;

  if (align === "center") {
    return startX + Math.max(0, (contentWidth - lineWidth) / 2);
  }

  if (align === "right") {
    return startX + Math.max(0, contentWidth - lineWidth);
  }

  return startX;
}

function drawJustifiedTextLine(context, line, x, y, width) {
  const words = String(line || "").trim().split(/\s+/).filter(Boolean);

  if (words.length < 2) {
    context.fillText(line, x, y);
    return;
  }

  const spaceCount = words.length - 1;
  const measuredWordWidths = words.map((word) => context.measureText(word).width);
  const wordsWidth = measuredWordWidths.reduce((total, current) => total + current, 0);
  const gapWidth = Math.max(0, (width - wordsWidth) / Math.max(1, spaceCount));
  let currentX = x;

  words.forEach((word, index) => {
    context.fillText(word, currentX, y);
    currentX += measuredWordWidths[index];

    if (index < words.length - 1) {
      currentX += gapWidth;
    }
  });
}

function drawTextUnderline(context, x, y, width, fontSize, color, lineHeight) {
  if (!Number.isFinite(width) || width <= 0) {
    return;
  }

  context.save();
  context.strokeStyle = color;
  context.lineWidth = Math.max(1, fontSize * 0.06);
  context.beginPath();
  context.moveTo(x, y + lineHeight - Math.max(2, fontSize * 0.16));
  context.lineTo(x + width, y + lineHeight - Math.max(2, fontSize * 0.16));
  context.stroke();
  context.restore();
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
    await ensureActionAssetsLoaded(editorState.actions);

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
  const canApplyCrop = Boolean(selectedAction && selectedAction.tool === "crop");
  const isSelectedImage = Boolean(selectedAction && selectedAction.tool === "image");

  if (!isSelectedImage) {
    editorState.imageCropModeActionId = null;
  }

  undoButton.disabled = editorState.undoStack.length === 0;
  redoButton.disabled = editorState.redoStack.length === 0;
  deleteActionButton.disabled = !selectedAction;
  deleteActionButton.classList.toggle("is-hidden", !selectedAction);
  applyCropButton.disabled = !canApplyCrop;
  applyCropButton.classList.toggle("is-hidden", !canApplyCrop);
  syncAppearanceControls();
}

function handleKeyboardShortcuts(event) {
  if (event.key === "Escape" && editorState.isShareMenuOpen) {
    event.preventDefault();
    closeShareMenu();
    return;
  }

  if (event.key === "Escape" && editorState.imageCropModeActionId) {
    event.preventDefault();
    editorState.imageCropModeActionId = null;
    updateToolbarState();
    renderEditorCanvas();
    return;
  }

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

    if (selectedAction && selectedAction.tool === "text") {
      event.preventDefault();
      reopenTextActionForEditing(selectedAction);
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

async function downloadAnnotatedPdf() {
  if (editorState.textEditorSession) {
    await commitTextEditor();
  }

  const shareAsset = await exportAnnotatedShareAsset("pdf");
  downloadBlobAsset(shareAsset);
}

async function copyAnnotatedImage() {
  if (editorState.textEditorSession) {
    await commitTextEditor();
  }

  const blob = await exportAnnotatedImageBlob();
  await copyBlobToClipboard(blob, "image/png");

  showNotice(t("editor.notice.imageCopied"));
}

async function exportAnnotatedImageBlob() {
  const exportCanvas = createExportCanvas();
  return canvasToBlob(exportCanvas);
}

async function exportAnnotatedPdfBlob() {
  const exportCanvas = createExportCanvas();
  return createPdfBlobFromCanvas(exportCanvas);
}

async function exportAnnotatedShareAsset(format) {
  const normalizedFormat = format === "pdf" ? "pdf" : "png";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  if (normalizedFormat === "pdf") {
    return {
      blob: await exportAnnotatedPdfBlob(),
      mimeType: "application/pdf",
      extension: "pdf",
      filename: `${t("editor.download.filePrefix")}-${timestamp}.pdf`,
    };
  }

  return {
    blob: await exportAnnotatedImageBlob(),
    mimeType: "image/png",
    extension: "png",
    filename: `${t("editor.download.filePrefix")}-${timestamp}.png`,
  };
}

function downloadBlobAsset(asset) {
  const blobUrl = URL.createObjectURL(asset.blob);
  const link = document.createElement("a");

  link.href = blobUrl;
  link.download = asset.filename;
  link.click();

  window.setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 1000);
}

async function copyBlobToClipboard(blob, mimeType) {
  if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
    throw new Error(t("editor.error.clipboardUnavailable"));
  }

  await navigator.clipboard.write([
    new ClipboardItem({
      [mimeType]: blob,
    }),
  ]);
}

async function shareAnnotatedImage(target, format = "png") {
  closeShareMenu();

  const serviceConfig = getShareServiceConfig(target);

  if (!serviceConfig) {
    throw new Error(t("editor.error.shareUnavailable"));
  }

  if (editorState.textEditorSession) {
    await commitTextEditor();
  }

  const shareAsset = await exportAnnotatedShareAsset(format);
  window.open(serviceConfig.url, "_blank", "noopener,noreferrer");

  if (shareAsset.mimeType === "application/pdf") {
    downloadBlobAsset(shareAsset);
  } else {
    await copyBlobToClipboard(shareAsset.blob, shareAsset.mimeType);
  }

  showNotice(
    t("editor.notice.shareClipboardReady", {
      service: serviceConfig.label,
      format: shareAsset.extension.toUpperCase(),
    })
  );
}

function createExportCanvas() {
  const exportCanvas = buildCompositeCanvas({
    includeDraft: false,
  });

  return exportCanvas;
}

function toggleColorPickingMode() {
  editorState.isColorPicking = !editorState.isColorPicking;
  updateCanvasCursor();
  syncAppearanceControls();

  if (editorState.isColorPicking) {
    showNotice(t("editor.notice.colorPickArmed"));
  } else {
    showNotice("");
  }
}

function stopColorPickingMode(isSilent = false) {
  if (!editorState.isColorPicking) {
    return;
  }

  editorState.isColorPicking = false;
  updateCanvasCursor();
  syncAppearanceControls();

  if (!isSilent) {
    showNotice("");
  }
}

function sampleColorAtPoint(point) {
  const sampleCanvas = createExportCanvas();
  const sampleContext = sampleCanvas.getContext("2d", {
    willReadFrequently: true,
  });

  if (!sampleContext) {
    stopColorPickingMode();
    return;
  }

  const safeX = clamp(Math.round(point.x), 0, sampleCanvas.width - 1);
  const safeY = clamp(Math.round(point.y), 0, sampleCanvas.height - 1);
  const pixel = sampleContext.getImageData(safeX, safeY, 1, 1).data;
  const nextColor = rgbToHex(pixel[0], pixel[1], pixel[2]);

  stopColorPickingMode(true);
  applyCurrentColor(nextColor, {
    updateSelectedAction: true,
  });
  showNotice(t("editor.notice.colorPicked"));
}

function startAutoScrollSession(event, mode) {
  editorState.autoScrollSession = {
    mode,
    pointerId: event.pointerId,
    clientX: event.clientX,
    clientY: event.clientY,
    shiftKey: Boolean(event.shiftKey),
  };
  ensureAutoScrollLoop();
}

function updateAutoScrollPointer(event) {
  const session = editorState.autoScrollSession;

  if (!session || session.pointerId !== event.pointerId) {
    return;
  }

  session.clientX = event.clientX;
  session.clientY = event.clientY;
  session.shiftKey = Boolean(event.shiftKey);
}

function stopAutoScrollSession(pointerId) {
  if (
    editorState.autoScrollSession &&
    editorState.autoScrollSession.pointerId === pointerId
  ) {
    editorState.autoScrollSession = null;
  }

  if (!editorState.autoScrollSession && editorState.autoScrollFrame) {
    window.cancelAnimationFrame(editorState.autoScrollFrame);
    editorState.autoScrollFrame = null;
  }
}

function ensureAutoScrollLoop() {
  if (editorState.autoScrollFrame) {
    return;
  }

  const step = () => {
    editorState.autoScrollFrame = null;

    const session = editorState.autoScrollSession;

    if (!session || editorState.isPanning || editorState.isColorPicking) {
      return;
    }

    const viewportRect = canvasViewport.getBoundingClientRect();
    const deltaX = getAutoScrollVelocity(session.clientX, viewportRect.left, viewportRect.right);
    const deltaY = getAutoScrollVelocity(session.clientY, viewportRect.top, viewportRect.bottom);

    if (deltaX !== 0 || deltaY !== 0) {
      const nextScrollLeft = clamp(
        canvasViewport.scrollLeft + deltaX,
        0,
        Math.max(0, canvasViewport.scrollWidth - canvasViewport.clientWidth)
      );
      const nextScrollTop = clamp(
        canvasViewport.scrollTop + deltaY,
        0,
        Math.max(0, canvasViewport.scrollHeight - canvasViewport.clientHeight)
      );
      const scrolled =
        nextScrollLeft !== canvasViewport.scrollLeft ||
        nextScrollTop !== canvasViewport.scrollTop;

      canvasViewport.scrollLeft = nextScrollLeft;
      canvasViewport.scrollTop = nextScrollTop;

      if (scrolled) {
        const point = getCanvasPointFromClient(session.clientX, session.clientY);

        if (
          session.mode === "draw" &&
          editorState.isDrawing &&
          editorState.draftAction
        ) {
          updateDraftAction(point, session.shiftKey);
        } else if (
          session.mode === "resize" &&
          editorState.actionResizeSession &&
          editorState.actionResizeSession.pointerId === session.pointerId
        ) {
          updateActionResize(point, session.shiftKey);
        } else if (
          session.mode === "move" &&
          editorState.actionMoveSession &&
          editorState.actionMoveSession.pointerId === session.pointerId
        ) {
          updateActionMove(point);
        } else if (
          session.mode === "image-crop" &&
          editorState.imageCropSession &&
          editorState.imageCropSession.pointerId === session.pointerId
        ) {
          updateImageCropMove(point);
        }
      }
    }

    if (editorState.autoScrollSession) {
      editorState.autoScrollFrame = window.requestAnimationFrame(step);
    }
  };

  editorState.autoScrollFrame = window.requestAnimationFrame(step);
}

function getAutoScrollVelocity(clientCoordinate, startEdge, endEdge) {
  if (clientCoordinate < startEdge + AUTO_SCROLL_EDGE_PX) {
    const ratio = clamp((startEdge + AUTO_SCROLL_EDGE_PX - clientCoordinate) / AUTO_SCROLL_EDGE_PX, 0, 1);
    return -Math.max(4, Math.round(AUTO_SCROLL_MAX_SPEED * ratio));
  }

  if (clientCoordinate > endEdge - AUTO_SCROLL_EDGE_PX) {
    const ratio = clamp((clientCoordinate - (endEdge - AUTO_SCROLL_EDGE_PX)) / AUTO_SCROLL_EDGE_PX, 0, 1);
    return Math.max(4, Math.round(AUTO_SCROLL_MAX_SPEED * ratio));
  }

  return 0;
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

function updateFontSizeValue() {
  fontSizeValue.textContent = t("common.pixels", {
    value: editorState.currentTextFontSize,
  });
}

function updateTextBackgroundOpacityValue() {
  textBackgroundOpacityValue.textContent = `${editorState.currentTextBackgroundOpacity}%`;
}

function updateTextBorderRadiusValue() {
  textBorderRadiusValue.textContent = t("common.pixels", {
    value: editorState.currentTextBorderRadius,
  });
}

function updateImageBorderRadiusValue() {
  imageBorderRadiusValue.textContent = t("common.pixels", {
    value: editorState.currentImageBorderRadius,
  });
}

function updateImageScaleValue() {
  imageScaleValue.textContent = `${Math.round((editorState.currentImageScale || 1) * 100)}%`;
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
        mode: handlePoint.mode || "resize",
      };
    }
  }

  return null;
}

function getActionHandlePoints(action) {
  const bounds = getActionBounds(action);
  const handlePoints = [
    {
      handle: "nw",
      x: bounds.left,
      y: bounds.top,
      mode: "resize",
    },
    {
      handle: "ne",
      x: bounds.right,
      y: bounds.top,
      mode: "resize",
    },
    {
      handle: "se",
      x: bounds.right,
      y: bounds.bottom,
      mode: "resize",
    },
    {
      handle: "sw",
      x: bounds.left,
      y: bounds.bottom,
      mode: "resize",
    },
  ];

  if (action.tool === "image") {
    handlePoints.push(
      { handle: "n", x: (bounds.left + bounds.right) / 2, y: bounds.top, mode: "crop" },
      { handle: "e", x: bounds.right, y: (bounds.top + bounds.bottom) / 2, mode: "crop" },
      { handle: "s", x: (bounds.left + bounds.right) / 2, y: bounds.bottom, mode: "crop" },
      { handle: "w", x: bounds.left, y: (bounds.top + bounds.bottom) / 2, mode: "crop" }
    );
  }

  return handlePoints;
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

  if (action.tool === "image") {
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

  if (action.tool === "marker") {
    const points = Array.isArray(action.points) ? action.points : [];
    const tolerance = Math.max(16, (action.size || 6) * 2.2);

    for (const markerPoint of points) {
      if (distanceBetweenPoints(point, markerPoint) <= tolerance) {
        return true;
      }
    }

    return false;
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

  if (action.tool === "image") {
    return {
      left: action.x,
      top: action.y,
      right: action.x + action.width,
      bottom: action.y + action.height,
      width: Math.max(action.width, 1),
      height: Math.max(action.height, 1),
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

  if (action.tool === "marker") {
    const points = Array.isArray(action.points) ? action.points : [];
    
    if (points.length === 0) {
      return {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
      };
    }

    const padding = Math.max(4, (action.size || 6) / 2 + 2);
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const left = minX - padding;
    const top = minY - padding;
    const right = maxX + padding;
    const bottom = maxY + padding;

    return {
      left,
      top,
      right,
      bottom,
      width: Math.max(right - left, 1),
      height: Math.max(bottom - top, 1),
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
  if (editorState.textEditorSession) {
    shapeSelectionOverlay.classList.remove("is-image-crop-mode");
    shapeSelectionOverlay.classList.add("is-hidden");
    return;
  }

  const selectedAction = getSelectedAction();

  if (!selectedAction || !isSelectableAction(selectedAction)) {
    shapeSelectionOverlay.classList.remove("is-image-crop-mode");
    shapeSelectionOverlay.classList.add("is-hidden");
    return;
  }

  const bounds = getActionBounds(selectedAction);
  const zoom = Math.max(editorState.zoom, 0.1);
  const isImageCropMode = selectedAction.tool === "image";

  shapeSelectionOverlay.style.left = `${Math.round(bounds.left * zoom)}px`;
  shapeSelectionOverlay.style.top = `${Math.round(bounds.top * zoom)}px`;
  shapeSelectionOverlay.style.width = `${Math.max(1, Math.round(bounds.width * zoom))}px`;
  shapeSelectionOverlay.style.height = `${Math.max(1, Math.round(bounds.height * zoom))}px`;
  shapeSelectionOverlay.classList.toggle("is-resizable", isResizableAction(selectedAction));
  shapeSelectionOverlay.classList.toggle("is-image-crop-mode", isImageCropMode);
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

function toggleSelectedImageCropMode() {
  const selectedAction = getSelectedAction();

  if (!selectedAction || selectedAction.tool !== "image") {
    return;
  }

  editorState.imageCropModeActionId =
    editorState.imageCropModeActionId === selectedAction.id ? null : selectedAction.id;
  updateToolbarState();
  renderEditorCanvas();

  if (editorState.imageCropModeActionId) {
    showNotice(t("editor.notice.imageCropMode"));
  } else {
    showNotice("");
  }
}

function resetSelectedImageCrop() {
  const selectedAction = getSelectedAction();

  if (!selectedAction || selectedAction.tool !== "image") {
    return;
  }

  editorState.imageCropModeActionId = null;
  mutateSelectedAction((action) => {
    action.contentOffsetX = 0;
    action.contentOffsetY = 0;
    action.contentScale = 1;
    action.borderRadius = editorState.currentImageBorderRadius;
  });
  showNotice(t("editor.notice.imageCropReset"));
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

  if (action.tool === "image") {
    const bounds = getActionBounds(action);
    const intersection = getBoundsIntersection(bounds, cropBounds);

    if (!intersection) {
      return null;
    }

    return {
      ...action,
      x: intersection.left - cropBounds.left,
      y: intersection.top - cropBounds.top,
      width: intersection.width,
      height: intersection.height,
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

function resizeTextAction(action, handle, point) {
  const bounds = getActionBounds(action);
  let left = bounds.left;
  let top = bounds.top;
  let right = bounds.right;
  let bottom = bounds.bottom;

  if (handle.includes("w")) {
    left = Math.min(point.x, right - MIN_TEXT_BOX_WIDTH);
  }

  if (handle.includes("e")) {
    right = Math.max(point.x, left + MIN_TEXT_BOX_WIDTH);
  }

  if (handle.includes("n")) {
    top = Math.min(point.y, bottom - MIN_TEXT_BOX_HEIGHT);
  }

  if (handle.includes("s")) {
    bottom = Math.max(point.y, top + MIN_TEXT_BOX_HEIGHT);
  }

  const clampedTopLeft = clampPointToCanvas({
    x: left,
    y: top,
  });
  const clampedBottomRight = clampPointToCanvas({
    x: right,
    y: bottom,
  });

  action.x = clampedTopLeft.x;
  action.y = clampedTopLeft.y;
  action.width = Math.max(MIN_TEXT_BOX_WIDTH, clampedBottomRight.x - clampedTopLeft.x);
  action.height = Math.max(MIN_TEXT_BOX_HEIGHT, clampedBottomRight.y - clampedTopLeft.y);
}

function resizeImageAction(action, handle, point, shouldSnap) {
  const bounds = getActionBounds(action);
  let left = bounds.left;
  let top = bounds.top;
  let right = bounds.right;
  let bottom = bounds.bottom;

  if (handle.includes("w")) {
    left = Math.min(point.x, right - MIN_IMAGE_BOX_SIZE);
  }

  if (handle.includes("e")) {
    right = Math.max(point.x, left + MIN_IMAGE_BOX_SIZE);
  }

  if (handle.includes("n")) {
    top = Math.min(point.y, bottom - MIN_IMAGE_BOX_SIZE);
  }

  if (handle.includes("s")) {
    bottom = Math.max(point.y, top + MIN_IMAGE_BOX_SIZE);
  }

  if (shouldSnap) {
    const aspectRatio = Math.max(0.01, bounds.width / Math.max(1, bounds.height));
    const width = Math.max(MIN_IMAGE_BOX_SIZE, right - left);
    const height = Math.max(MIN_IMAGE_BOX_SIZE, bottom - top);

    if (width / Math.max(1, height) > aspectRatio) {
      const adjustedHeight = width / aspectRatio;

      if (handle.includes("n")) {
        top = bottom - adjustedHeight;
      } else {
        bottom = top + adjustedHeight;
      }
    } else {
      const adjustedWidth = height * aspectRatio;

      if (handle.includes("w")) {
        left = right - adjustedWidth;
      } else {
        right = left + adjustedWidth;
      }
    }
  }

  const clampedTopLeft = clampPointToCanvas({
    x: left,
    y: top,
  });
  const clampedBottomRight = clampPointToCanvas({
    x: right,
    y: bottom,
  });

  action.x = clampedTopLeft.x;
  action.y = clampedTopLeft.y;
  action.width = Math.max(MIN_IMAGE_BOX_SIZE, clampedBottomRight.x - clampedTopLeft.x);
  action.height = Math.max(MIN_IMAGE_BOX_SIZE, clampedBottomRight.y - clampedTopLeft.y);
  clampImageCropOffsets(action);
}

function cropImageAction(action, handle, point) {
  if (!action || action.tool !== "image" || !IMAGE_CROP_HANDLES.has(handle)) {
    return;
  }

  const bounds = getActionBounds(action);
  const layout = getImageActionLayout(action);
  const naturalWidth = Math.max(
    1,
    action.naturalWidth || (getLoadedImageAsset(action.imageDataUrl) || {}).naturalWidth || action.width || 1
  );
  const naturalHeight = Math.max(
    1,
    action.naturalHeight || (getLoadedImageAsset(action.imageDataUrl) || {}).naturalHeight || action.height || 1
  );
  const absoluteScale = Math.max(
    layout.drawWidth / naturalWidth,
    layout.drawHeight / naturalHeight
  );
  const minCoverScale = absoluteScale / 3;
  const widthRatio = bounds.width / naturalWidth;
  const heightRatio = bounds.height / naturalHeight;
  const minWidth = Math.max(
    MIN_IMAGE_BOX_SIZE,
    heightRatio >= minCoverScale ? 0 : naturalWidth * minCoverScale
  );
  const minHeight = Math.max(
    MIN_IMAGE_BOX_SIZE,
    widthRatio >= minCoverScale ? 0 : naturalHeight * minCoverScale
  );
  const imageLeftLimit = clamp(layout.drawX, 0, baseCanvas.width);
  const imageTopLimit = clamp(layout.drawY, 0, baseCanvas.height);
  const imageRightLimit = clamp(layout.drawX + layout.drawWidth, 0, baseCanvas.width);
  const imageBottomLimit = clamp(layout.drawY + layout.drawHeight, 0, baseCanvas.height);
  let left = bounds.left;
  let top = bounds.top;
  let right = bounds.right;
  let bottom = bounds.bottom;

  if (handle === "w") {
    left = clamp(point.x, imageLeftLimit, right - minWidth);
  } else if (handle === "e") {
    right = clamp(point.x, left + minWidth, imageRightLimit);
  } else if (handle === "n") {
    top = clamp(point.y, imageTopLimit, bottom - minHeight);
  } else if (handle === "s") {
    bottom = clamp(point.y, top + minHeight, imageBottomLimit);
  }

  const nextWidth = Math.max(MIN_IMAGE_BOX_SIZE, right - left);
  const nextHeight = Math.max(MIN_IMAGE_BOX_SIZE, bottom - top);
  const nextCoverScale = Math.max(nextWidth / naturalWidth, nextHeight / naturalHeight);

  action.x = left;
  action.y = top;
  action.width = nextWidth;
  action.height = nextHeight;
  action.contentScale = clamp(absoluteScale / Math.max(nextCoverScale, 0.01), 1, 3);
  action.contentOffsetX = layout.drawX - action.x - (action.width - layout.drawWidth) / 2;
  action.contentOffsetY = layout.drawY - action.y - (action.height - layout.drawHeight) / 2;
  clampImageCropOffsets(action);
}

function getImageActionLayout(action, providedImage) {
  const image = providedImage || getLoadedImageAsset(action.imageDataUrl);
  const naturalWidth = Math.max(1, action.naturalWidth || (image && image.naturalWidth) || action.width || 1);
  const naturalHeight = Math.max(1, action.naturalHeight || (image && image.naturalHeight) || action.height || 1);
  const frameWidth = Math.max(1, action.width || naturalWidth);
  const frameHeight = Math.max(1, action.height || naturalHeight);
  const contentScale = getImageActionScale(action);
  const coverScale = Math.max(frameWidth / naturalWidth, frameHeight / naturalHeight);
  const drawWidth = naturalWidth * coverScale * contentScale;
  const drawHeight = naturalHeight * coverScale * contentScale;
  const overflowX = Math.max(0, drawWidth - frameWidth);
  const overflowY = Math.max(0, drawHeight - frameHeight);
  const offsetX = clamp(action.contentOffsetX || 0, -overflowX / 2, overflowX / 2);
  const offsetY = clamp(action.contentOffsetY || 0, -overflowY / 2, overflowY / 2);

  return {
    drawWidth,
    drawHeight,
    drawX: action.x + (frameWidth - drawWidth) / 2 + offsetX,
    drawY: action.y + (frameHeight - drawHeight) / 2 + offsetY,
    overflowX,
    overflowY,
    offsetX,
    offsetY,
  };
}

function clampImageCropOffsets(action) {
  if (!action || action.tool !== "image") {
    return;
  }

  const layout = getImageActionLayout(action);
  action.contentOffsetX = layout.offsetX;
  action.contentOffsetY = layout.offsetY;
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

  if (action.tool === "image") {
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
    return;
  }

  if (action.tool === "marker") {
    const bounds = getActionBounds(action);
    const maxDeltaLeft = -bounds.left;
    const maxDeltaTop = -bounds.top;
    const maxDeltaRight = baseCanvas.width - bounds.right;
    const maxDeltaBottom = baseCanvas.height - bounds.bottom;
    const safeDeltaX = clamp(deltaX, maxDeltaLeft, maxDeltaRight);
    const safeDeltaY = clamp(deltaY, maxDeltaTop, maxDeltaBottom);

    if (Array.isArray(action.points)) {
      action.points = action.points.map((point) => ({
        x: point.x + safeDeltaX,
        y: point.y + safeDeltaY,
      }));
    }
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
      currentTextColor: editorState.currentTextColor,
      currentTextBackgroundColor: editorState.currentTextBackgroundColor,
      currentTextColorTarget: editorState.currentTextColorTarget,
      strokeWidth: editorState.strokeWidth,
      currentMarkerOpacity: editorState.currentMarkerOpacity,
      currentRotation: editorState.currentRotation,
      currentRedactBorderRadius: editorState.currentRedactBorderRadius,
      currentTextFontSize: editorState.currentTextFontSize,
      currentTextBackgroundMode: editorState.currentTextBackgroundMode,
      currentTextBackgroundOpacity: editorState.currentTextBackgroundOpacity,
      currentTextBorderRadius: editorState.currentTextBorderRadius,
      currentTextAlign: editorState.currentTextAlign,
      currentTextBold: editorState.currentTextBold,
      currentTextItalic: editorState.currentTextItalic,
      currentTextUnderline: editorState.currentTextUnderline,
      currentTextListType: editorState.currentTextListType,
      currentImageBorderRadius: editorState.currentImageBorderRadius,
      currentImageScale: editorState.currentImageScale,
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

    return Math.max(DEFAULT_TEXT_SIZE, editorState.currentTextFontSize || DEFAULT_TEXT_SIZE);
  }

  if (tool === "pin") {
    return Math.max(10, fallbackSize || editorState.strokeWidth);
  }

  return Math.max(2, fallbackSize || editorState.strokeWidth);
}

function shouldHideActionWhileEditing(action) {
  return Boolean(
    editorState.textEditorSession &&
      action &&
      action.tool === "text" &&
      action.id &&
      action.id === editorState.textEditorSession.actionId
  );
}

function measureTextAction(action, textValue) {
  const fontSize = Math.max(12, action.size || DEFAULT_TEXT_SIZE);
  const lineHeight = Math.round(fontSize * 1.35);
  const backgroundMode = action.backgroundMode || DEFAULT_TEXT_BACKGROUND_MODE;
  const paddingX =
    backgroundMode === "highlight"
      ? TEXT_HIGHLIGHT_PADDING_X
      : backgroundMode === "box"
        ? TEXT_BOX_PADDING_X
        : 0;
  const paddingY =
    backgroundMode === "highlight"
      ? TEXT_HIGHLIGHT_PADDING_Y
      : backgroundMode === "box"
        ? TEXT_BOX_PADDING_Y
        : 0;
  const formattedText = formatTextForList(textValue, getTextActionListType(action));
  const wrapWidth = Number.isFinite(action.width)
    ? Math.max(fontSize * 0.8, action.width - paddingX * 2)
    : Infinity;
  const lines = wrapTextLines(formattedText, wrapWidth, fontSize, action);
  const lineWidths = [];

  baseContext.save();
  baseContext.font = getTextFont(fontSize, action);

  let width = 0;

  for (const line of lines) {
    const lineWidth = baseContext.measureText(line || " ").width;
    lineWidths.push(lineWidth);
    width = Math.max(width, lineWidth);
  }

  baseContext.restore();

  const naturalWidth =
    backgroundMode !== "none"
      ? width + paddingX * 2
      : Number.isFinite(action.width)
        ? Math.max(action.width, width)
        : width;
  const naturalHeight =
    backgroundMode !== "none"
      ? lines.length * lineHeight + paddingY * 2
      : lines.length * lineHeight;
  const resolvedWidth = Math.max(
    backgroundMode !== "none" ? MIN_TEXT_BOX_WIDTH : 1,
    Number.isFinite(action.width) ? Math.max(action.width, naturalWidth) : naturalWidth
  );
  const resolvedHeight = Math.max(
    backgroundMode !== "none" ? MIN_TEXT_BOX_HEIGHT : lineHeight,
    Number.isFinite(action.height) ? Math.max(action.height, naturalHeight) : naturalHeight
  );

  return {
    lines,
    lineWidths,
    width: Math.max(resolvedWidth, fontSize * 0.6),
    height: Math.max(resolvedHeight, lineHeight),
    contentWidth: Math.max(1, resolvedWidth - paddingX * 2),
    lineHeight,
    textOffsetX: paddingX,
    textOffsetY: paddingY,
    paddingX,
    paddingY,
  };
}

function formatTextForList(value, listType) {
  const paragraphs = splitTextLines(value);

  if (paragraphs.length === 1 && paragraphs[0] === "") {
    return "";
  }

  if (listType === "none") {
    return paragraphs.join("\n");
  }

  return paragraphs
    .map((paragraph, index) => {
      const prefix =
        listType === "bullet" ? "\u2022 " : listType === "number" ? `${index + 1}. ` : "";
      return `${prefix}${paragraph}`;
    })
    .join("\n");
}

function removeListFormatting(value) {
  const paragraphs = splitTextLines(value);
  
  return paragraphs
    .map((line) => {
      let text = line;
      if (text.startsWith("\u2022 ")) {
        text = text.slice(2);
      } else if (/^\d+\.\s/.test(text)) {
        text = text.replace(/^\d+\.\s/, "");
      }
      return text;
    })
    .join("\n");
}

function getTextFont(size, action) {
  const fontStyle = getTextActionItalic(action) ? "italic" : "normal";
  const fontWeight = getTextActionWeight(action) ? 700 : 500;

  return `${fontStyle} ${fontWeight} ${Math.max(12, size)}px ${getBodyFontStack()}`;
}

function getBodyFontStack() {
  return `"Manrope", "Segoe UI", Tahoma, sans-serif`;
}

function splitTextLines(value) {
  return String(value || "").split(/\r?\n/);
}

function wrapTextLines(value, maxWidth, fontSize, action) {
  const paragraphs = splitTextLines(value);

  if (!Number.isFinite(maxWidth) || maxWidth <= 0) {
    return paragraphs.length ? paragraphs : [""];
  }

  baseContext.save();
  baseContext.font = getTextFont(fontSize, action);

  const wrappedLines = [];

  for (const paragraph of paragraphs) {
    if (!paragraph) {
      wrappedLines.push("");
      continue;
    }

    const words = paragraph.split(/\s+/).filter(Boolean);

    if (!words.length) {
      wrappedLines.push("");
      continue;
    }

    let currentLine = "";

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;

      if (baseContext.measureText(candidate).width <= maxWidth || !currentLine) {
        if (baseContext.measureText(candidate).width <= maxWidth) {
          currentLine = candidate;
          continue;
        }

        const wordParts = breakLongWord(word, maxWidth);

        if (currentLine) {
          wrappedLines.push(currentLine);
        }

        wrappedLines.push(...wordParts.slice(0, -1));
        currentLine = wordParts[wordParts.length - 1] || "";
        continue;
      }

      wrappedLines.push(currentLine);
      currentLine = word;

      if (baseContext.measureText(currentLine).width > maxWidth) {
        const wordParts = breakLongWord(word, maxWidth);
        wrappedLines.push(...wordParts.slice(0, -1));
        currentLine = wordParts[wordParts.length - 1] || "";
      }
    }

    wrappedLines.push(currentLine);
  }

  baseContext.restore();

  return wrappedLines.length ? wrappedLines : [""];
}

function breakLongWord(word, maxWidth) {
  const parts = [];
  let current = "";

  for (const character of String(word || "")) {
    const candidate = current + character;

    if (baseContext.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
      continue;
    }

    parts.push(current);
    current = character;
  }

  if (current) {
    parts.push(current);
  }

  return parts.length ? parts : [word];
}

function getPinRadius(action) {
  return Math.max(14, (action.size || 8) * 2.2);
}

function isActionDrawable(action) {
  if (!action) {
    return false;
  }

  if (FREEHAND_TOOLS.has(action.tool)) {
    // Markers can be single-click (1 point), but other freehand tools need at least 2 points
    if (action.tool === "marker") {
      return (
        Array.isArray(action.points) &&
        action.points.length >= 1
      );
    }
    return (
      Array.isArray(action.points) &&
      action.points.length > 1 &&
      getActionDrawDistance(action) >= MIN_DRAW_INTENT_DISTANCE
    );
  }

  if (action.tool === "text") {
    return Boolean(action.text && action.text.trim());
  }

  if (action.tool === "pin") {
    return Number.isFinite(action.x) && Number.isFinite(action.y);
  }

  if (SHAPE_TOOLS.has(action.tool)) {
    return getActionDrawDistance(action) >= MIN_DRAW_INTENT_DISTANCE;
  }

  return false;
}

function getActionDrawDistance(action) {
  if (!action) {
    return 0;
  }

  if (FREEHAND_TOOLS.has(action.tool)) {
    const points = Array.isArray(action.points) ? action.points : [];
    let totalDistance = 0;

    for (let index = 1; index < points.length; index += 1) {
      totalDistance += Math.hypot(
        points[index].x - points[index - 1].x,
        points[index].y - points[index - 1].y
      );
    }

    return totalDistance;
  }

  if (SHAPE_TOOLS.has(action.tool) && action.start && action.end) {
    return Math.hypot(action.end.x - action.start.x, action.end.y - action.start.y);
  }

  return 0;
}

function normalizeAction(action) {
  if (!action) {
    return action;
  }

  // Don't normalize arrows and markers - they have different structures
  // Arrows preserve original start/end points for direction
  // Markers use points array, not start/end
  if (action.tool === "arrow" || action.tool === "marker") {
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
  return Boolean(action) && (
    BOX_TOOLS.has(action.tool) ||
    action.tool === "arrow" ||
    action.tool === "text" ||
    action.tool === "image"
  );
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
  annotationCanvas.classList.toggle("is-color-picking", editorState.isColorPicking);

  if (editorState.isPanning) {
    annotationCanvas.style.cursor = "grabbing";
    return;
  }

  if (editorState.isColorPicking) {
    annotationCanvas.style.cursor = "copy";
    return;
  }

  if (editorState.imageCropModeActionId) {
    annotationCanvas.style.cursor = editorState.imageCropSession ? "grabbing" : "grab";
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
  return getCanvasPointFromClient(event.clientX, event.clientY);
}

function getCanvasPointFromClient(clientX, clientY) {
  const rect = annotationCanvas.getBoundingClientRect();
  const scaleX = annotationCanvas.width / rect.width;
  const scaleY = annotationCanvas.height / rect.height;

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
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
  toolSidebar.classList.remove("is-hidden");
  editorInspector.classList.remove("is-hidden");
}

function openHelpModal() {
  closeShareMenu();
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

function toggleShareMenu(forceState) {
  const nextState =
    typeof forceState === "boolean" ? forceState : !editorState.isShareMenuOpen;

  editorState.isShareMenuOpen = nextState;
  resetShareMenuState();

  shareMenuPanel.classList.toggle("is-hidden", !nextState);
  shareMenuButton.setAttribute("aria-expanded", String(nextState));

  if (nextState) {
    focusShareMenuStep("target");
  }
}

function closeShareMenu() {
  if (!editorState.isShareMenuOpen) {
    return;
  }

  toggleShareMenu(false);
}

function handleGlobalPointerDown(event) {
  if (
    editorState.isShareMenuOpen &&
    event.target instanceof HTMLElement &&
    !event.target.closest(".share-menu")
  ) {
    closeShareMenu();
  }
}

function getShareServiceConfig(target) {
  return (
    {
      whatsapp: {
        url: "https://web.whatsapp.com/",
        label: t("editor.share.whatsapp"),
      },
      telegram: {
        url: "https://web.telegram.org/",
        label: t("editor.share.telegram"),
      },
      discord: {
        url: "https://discord.com/app",
        label: t("editor.share.discord"),
      },
      slack: {
        url: "https://app.slack.com/client",
        label: t("editor.share.slack"),
      },
    }[target] || null
  );
}

function openShareFormatStep(target) {
  const serviceConfig = getShareServiceConfig(target);

  if (!serviceConfig) {
    showNotice(t("editor.error.shareUnavailable"), true);
    return;
  }

  editorState.shareMenuTarget = target;
  setShareMenuStep("format");
  focusShareMenuStep("format");
}

function setShareMenuStep(step) {
  const nextStep =
    step === "format" && editorState.shareMenuTarget ? "format" : "target";

  editorState.shareMenuStep = nextStep;
  syncShareMenuView();
}

function resetShareMenuState() {
  editorState.shareMenuTarget = "";
  editorState.shareMenuStep = "target";
  syncShareMenuView();
}

function syncShareMenuView() {
  const activeStep =
    editorState.shareMenuStep === "format" && editorState.shareMenuTarget
      ? "format"
      : "target";

  editorState.shareMenuStep = activeStep;

  shareMenuViews.forEach((view) => {
    view.classList.toggle("is-hidden", view.dataset.shareStep !== activeStep);
  });

  shareMenuTargetButtons.forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.shareTarget === editorState.shareMenuTarget);
  });

  if (!shareMenuTargetSummary) {
    return;
  }

  const serviceConfig = getShareServiceConfig(editorState.shareMenuTarget);
  shareMenuTargetSummary.textContent = serviceConfig
    ? t("editor.share.targetSelected", { service: serviceConfig.label })
    : "";
}

function focusShareMenuStep(step = editorState.shareMenuStep) {
  const focusTarget =
    step === "format" ? shareMenuFormatButtons[0] : shareMenuTargetButtons[0];

  if (!focusTarget) {
    return;
  }

  window.requestAnimationFrame(() => {
    focusTarget.focus();
  });
}

function showEmptyState(title, description) {
  emptyState.innerHTML = `
    <h2>${escapeHtml(title)}</h2>
    <p>${escapeHtml(description)}</p>
  `;
  emptyState.classList.remove("is-hidden");
  canvasViewport.classList.add("is-hidden");
  toolSidebar.classList.add("is-hidden");
  editorInspector.classList.add("is-hidden");
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

function canvasToBlob(canvas, type = "image/png", quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error(t("editor.error.finalImage")));
        return;
      }

      resolve(blob);
    }, type, quality);
  });
}

async function createPdfBlobFromCanvas(canvas) {
  const imageBlob = await canvasToBlob(canvas, "image/jpeg", 0.96);
  const imageBytes = new Uint8Array(await imageBlob.arrayBuffer());
  const encoder = new TextEncoder();
  const pageWidth = Math.max(1, Math.round(canvas.width * 72 / 96));
  const pageHeight = Math.max(1, Math.round(canvas.height * 72 / 96));
  const contentStream = `q
${pageWidth} 0 0 ${pageHeight} 0 0 cm
/Im0 Do
Q
`;
  const objects = [];

  objects.push(encoder.encode("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"));
  objects.push(encoder.encode("2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n"));
  objects.push(
    encoder.encode(
      `3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>
endobj
`
    )
  );
  objects.push(
    [
      encoder.encode(
        `4 0 obj
<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>
stream
`
      ),
      imageBytes,
      encoder.encode("\nendstream\nendobj\n"),
    ]
  );
  objects.push(
    encoder.encode(
      `5 0 obj
<< /Length ${encoder.encode(contentStream).length} >>
stream
${contentStream}endstream
endobj
`
    )
  );

  const parts = [encoder.encode("%PDF-1.4\n%----\n")];
  const offsets = [0];
  let position = parts[0].length;

  for (const objectPart of objects) {
    offsets.push(position);

    if (Array.isArray(objectPart)) {
      for (const chunk of objectPart) {
        parts.push(chunk);
        position += chunk.length;
      }
    } else {
      parts.push(objectPart);
      position += objectPart.length;
    }
  }

  const xrefStart = position;
  const xrefEntries = ["0000000000 65535 f \n"];

  for (let index = 1; index < offsets.length; index += 1) {
    xrefEntries.push(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`);
  }

  parts.push(
    encoder.encode(
      `xref
0 ${offsets.length}
${xrefEntries.join("")}trailer
<< /Size ${offsets.length} /Root 1 0 R >>
startxref
${xrefStart}
%%EOF`
    )
  );

  return new Blob(parts, {
    type: "application/pdf",
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

function drawRoundedRect(context, x, y, width, height, radius) {
  const safeRadius = clamp(
    Math.max(0, radius || 0),
    0,
    Math.min(width, height) / 2
  );

  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function rgbToHex(red, green, blue) {
  return `#${[red, green, blue]
    .map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

function normalizeHexColor(hexColor) {
  const normalized = String(hexColor || "").trim().replace(/^#/, "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((character) => character + character)
          .join("")
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(value)) {
    return null;
  }

  return `#${value.toLowerCase()}`;
}

function toRgba(hexColor, alpha) {
  const rgb = hexToRgb(hexColor);

  if (!rgb) {
    return `rgba(18, 18, 18, ${alpha})`;
  }

  return `rgba(${rgb.red}, ${rgb.green}, ${rgb.blue}, ${alpha})`;
}

function hexToRgb(hexColor) {
  const normalized = normalizeHexColor(hexColor);

  if (!normalized) {
    return null;
  }

  return {
    red: Number.parseInt(normalized.slice(1, 3), 16),
    green: Number.parseInt(normalized.slice(3, 5), 16),
    blue: Number.parseInt(normalized.slice(5, 7), 16),
  };
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
