const regionCaptureButton = document.getElementById("regionCaptureButton");
const fullPageCaptureButton = document.getElementById("fullPageCaptureButton");
const resumeProjectButton = document.getElementById("resumeProjectButton");
const popupLanguageSelect = document.getElementById("popupLanguageSelect");
const popupStatus = document.getElementById("popupStatus");
const popupProgress = document.getElementById("popupProgress");
const popupProgressBar = document.getElementById("popupProgressBar");
const popupProgressValue = document.getElementById("popupProgressValue");
const cancelCaptureButton = document.getElementById("cancelCaptureButton");
const i18n = globalThis.PrintExtensionI18n;

const popupState = {
  activeTabId: null,
  activeOperation: null,
};

let currentLanguage = i18n.getDefaultLanguage();

applyPopupTranslations();

regionCaptureButton.addEventListener("click", () => {
  handleAction("BEGIN_REGION_CAPTURE", {
    busyMessageKey: "popup.busy.preparingSelector",
    closeOnSuccess: true,
  });
});

fullPageCaptureButton.addEventListener("click", () => {
  handleAction("CAPTURE_FULL_PAGE", {
    busyMessageKey: "popup.busy.capturingFullPage",
    closeOnSuccess: true,
    operation: "full-page",
  });
});

resumeProjectButton.addEventListener("click", () => {
  handleAction("OPEN_LAST_PROJECT", {
    busyMessageKey: "popup.busy.openingLastProject",
    closeOnSuccess: true,
  });
});

cancelCaptureButton.addEventListener("click", async () => {
  if (typeof popupState.activeTabId !== "number") {
    return;
  }

  try {
    await chrome.runtime.sendMessage({
      type: "CANCEL_CAPTURE",
      tabId: popupState.activeTabId,
    });
  } catch (error) {
    setBusyState(false, normalizeError(error), true);
  }
});

popupLanguageSelect.addEventListener("change", async () => {
  currentLanguage = await i18n.setLanguage(popupLanguageSelect.value);
  applyPopupTranslations();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes.preferredLanguage) {
    return;
  }

  currentLanguage = i18n.normalizeLanguage(changes.preferredLanguage.newValue);
  applyPopupTranslations();
});

chrome.runtime.onMessage.addListener((message) => {
  if (!message || message.type !== "CAPTURE_PROGRESS") {
    return undefined;
  }

  if (
    message.operation !== popupState.activeOperation ||
    message.tabId !== popupState.activeTabId
  ) {
    return undefined;
  }

  const progress = Number.isFinite(message.progress) ? message.progress : 0;
  setProgress(progress, message.message || "");

  return undefined;
});

initializePopupI18n().catch((error) => {
  setBusyState(false, normalizeError(error), true);
});

async function handleAction(type, options) {
  try {
    const busyMessage = t(options.busyMessageKey);

    if (options.operation) {
      const tab = await getActiveTab();

      if (!tab || typeof tab.id !== "number") {
        throw new Error(t("popup.error.noActiveTab"));
      }

      popupState.activeTabId = tab.id;
      popupState.activeOperation = options.operation;
      setBusyState(true, busyMessage);
      setProgress(0, busyMessage);

      const response = await chrome.runtime.sendMessage({
        type,
        tabId: tab.id,
      });

      if (!response || !response.ok) {
        throw new Error(response && response.error ? response.error : t("popup.error.operationFailed"));
      }

      if (options.closeOnSuccess) {
        window.close();
        return;
      }

      setBusyState(false, t("popup.status.completed"));
      return;
    }

    setBusyState(true, busyMessage);

    let payload = { type };

    if (type === "BEGIN_REGION_CAPTURE") {
      const tab = await getActiveTab();

      if (!tab || typeof tab.id !== "number") {
        throw new Error(t("popup.error.noActiveTab"));
      }

      payload = {
        type,
        tabId: tab.id,
      };
    }

    const response = await chrome.runtime.sendMessage(payload);

    if (!response || !response.ok) {
      throw new Error(response && response.error ? response.error : t("popup.error.operationFailed"));
    }

    if (options.closeOnSuccess) {
      window.close();
      return;
    }

    setBusyState(false, t("popup.status.completed"));
  } catch (error) {
    popupState.activeTabId = null;
    popupState.activeOperation = null;
    hideProgress();
    setBusyState(false, normalizeError(error), true);
  }
}

function setBusyState(isBusy, message, isError) {
  regionCaptureButton.disabled = isBusy;
  fullPageCaptureButton.disabled = isBusy;
  resumeProjectButton.disabled = isBusy;
  cancelCaptureButton.disabled = !isBusy || popupState.activeOperation !== "full-page";
  popupStatus.textContent = message || "";
  popupStatus.classList.toggle("is-error", Boolean(isError));

  if (!isBusy) {
    popupState.activeTabId = null;
    popupState.activeOperation = null;
    hideProgress();
  }
}

function setProgress(value, message) {
  popupProgress.classList.remove("is-hidden");
  popupProgressBar.style.width = `${clamp(value, 0, 100)}%`;
  popupProgressValue.textContent = `${Math.round(clamp(value, 0, 100))}%`;

  if (message) {
    popupStatus.textContent = message;
    popupStatus.classList.remove("is-error");
  }
}

function hideProgress() {
  popupProgress.classList.add("is-hidden");
  popupProgressBar.style.width = "0%";
  popupProgressValue.textContent = "0%";
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  return tabs[0] || null;
}

async function initializePopupI18n() {
  currentLanguage = await i18n.getCurrentLanguage();
  applyPopupTranslations();
}

function applyPopupTranslations() {
  i18n.applyTranslations(document, currentLanguage);
  i18n.populateLanguageSelect(popupLanguageSelect, currentLanguage);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function t(key, params) {
  return i18n.t(key, params, currentLanguage);
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
