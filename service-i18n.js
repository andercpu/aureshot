(function (scope) {
  const STORAGE_KEY = "preferredLanguage";
  const FALLBACK_LANGUAGE = "en";
  const MESSAGES = {
    "pt-BR": {
      "common.errorUnexpectedCapture": "Ocorreu um erro inesperado durante a captura.",
      "service.error.activeTabNotFound": "A aba ativa não foi encontrada.",
      "service.error.buildFullPage": "Não foi possível montar a captura da página inteira.",
      "service.error.captureCancelled": "Captura cancelada.",
      "service.error.captureInProgress": "Já existe uma captura em andamento nesta aba.",
      "service.error.captureTab": "Não foi possível executar a captura na aba.",
      "service.error.cropCanvas": "Não foi possível preparar o canvas de recorte.",
      "service.error.invalidHeight": "A altura selecionada é inválida.",
      "service.error.invalidViewportHeight": "A altura da viewport é inválida.",
      "service.error.invalidViewportWidth": "A largura da viewport é inválida.",
      "service.error.invalidWidth": "A largura selecionada é inválida.",
      "service.error.invalidX": "A coordenada horizontal selecionada é inválida.",
      "service.error.invalidY": "A coordenada vertical selecionada é inválida.",
      "service.error.noCaptureToCancel": "Não existe captura em andamento para cancelar.",
      "service.error.noRecentProject": "Nenhum projeto recente foi encontrado.",
      "service.error.pageHeight": "Não foi possível identificar a altura da página.",
      "service.error.prepareFullPageCanvas": "Não foi possível preparar o canvas da captura full page.",
      "service.error.readImage": "Não foi possível ler a imagem capturada.",
      "service.error.regionNotReceived": "A região selecionada não foi recebida.",
      "service.error.tabWindow": "Não foi possível identificar a janela da aba para capturar.",
      "service.error.viewportContent": "Não foi possível identificar a área útil da viewport.",
      "service.error.viewportSize": "Não foi possível identificar o tamanho da viewport.",
      "service.error.visibleCaptureEmpty": "A captura visível retornou vazia.",
      "service.progress.canceling": "Cancelando captura...",
      "service.progress.capturingSlices": "Capturando as fatias da página...",
      "service.progress.completed": "Captura concluída.",
      "service.progress.openingEditor": "Abrindo o editor...",
      "service.progress.preparingFullPage": "Preparando a página inteira...",
      "captureStore.error.delete": "Não foi possível remover a captura.",
      "captureStore.error.deleteComplete": "Não foi possível concluir a remoção da captura.",
      "captureStore.error.list": "Não foi possível listar as capturas.",
      "captureStore.error.listComplete": "Não foi possível concluir a listagem das capturas.",
      "captureStore.error.openDatabase": "Não foi possível abrir o banco de capturas.",
      "captureStore.error.read": "Não foi possível ler a captura.",
      "captureStore.error.readComplete": "Não foi possível concluir a leitura da captura.",
      "captureStore.error.save": "Não foi possível salvar a captura.",
      "captureStore.error.saveAbort": "O salvamento da captura foi abortado.",
      "captureStore.error.saveComplete": "Não foi possível finalizar o salvamento da captura."
    },
    "pt-PT": {
      "common.errorUnexpectedCapture": "Ocorreu um erro inesperado durante a captura.",
      "service.error.activeTabNotFound": "O separador ativo não foi encontrado.",
      "service.error.buildFullPage": "Não foi possível montar a captura da página inteira.",
      "service.error.captureCancelled": "Captura cancelada.",
      "service.error.captureInProgress": "Já existe uma captura em curso neste separador.",
      "service.error.captureTab": "Não foi possível executar a captura no separador.",
      "service.error.cropCanvas": "Não foi possível preparar o canvas de recorte.",
      "service.error.invalidHeight": "A altura selecionada é inválida.",
      "service.error.invalidViewportHeight": "A altura da viewport é inválida.",
      "service.error.invalidViewportWidth": "A largura da viewport é inválida.",
      "service.error.invalidWidth": "A largura selecionada é inválida.",
      "service.error.invalidX": "A coordenada horizontal selecionada é inválida.",
      "service.error.invalidY": "A coordenada vertical selecionada é inválida.",
      "service.error.noCaptureToCancel": "Não existe nenhuma captura em curso para cancelar.",
      "service.error.noRecentProject": "Não foi encontrado nenhum projeto recente.",
      "service.error.pageHeight": "Não foi possível identificar a altura da página.",
      "service.error.prepareFullPageCanvas": "Não foi possível preparar o canvas da captura full page.",
      "service.error.readImage": "Não foi possível ler a imagem capturada.",
      "service.error.regionNotReceived": "A região selecionada não foi recebida.",
      "service.error.tabWindow": "Não foi possível identificar a janela do separador para capturar.",
      "service.error.viewportContent": "Não foi possível identificar a área útil da viewport.",
      "service.error.viewportSize": "Não foi possível identificar o tamanho da viewport.",
      "service.error.visibleCaptureEmpty": "A captura visível regressou vazia.",
      "service.progress.canceling": "A cancelar captura...",
      "service.progress.capturingSlices": "A capturar as fatias da página...",
      "service.progress.completed": "Captura concluída.",
      "service.progress.openingEditor": "A abrir o editor...",
      "service.progress.preparingFullPage": "A preparar a página inteira...",
      "captureStore.error.delete": "Não foi possível remover a captura.",
      "captureStore.error.deleteComplete": "Não foi possível concluir a remoção da captura.",
      "captureStore.error.list": "Não foi possível listar as capturas.",
      "captureStore.error.listComplete": "Não foi possível concluir a listagem das capturas.",
      "captureStore.error.openDatabase": "Não foi possível abrir a base de dados das capturas.",
      "captureStore.error.read": "Não foi possível ler a captura.",
      "captureStore.error.readComplete": "Não foi possível concluir a leitura da captura.",
      "captureStore.error.save": "Não foi possível guardar a captura.",
      "captureStore.error.saveAbort": "A gravação da captura foi cancelada.",
      "captureStore.error.saveComplete": "Não foi possível concluir a gravação da captura."
    },
    en: {
      "common.errorUnexpectedCapture": "An unexpected error occurred during capture.",
      "service.error.activeTabNotFound": "The active tab was not found.",
      "service.error.buildFullPage": "The full-page capture could not be built.",
      "service.error.captureCancelled": "Capture canceled.",
      "service.error.captureInProgress": "There is already a capture in progress on this tab.",
      "service.error.captureTab": "The tab capture could not be executed.",
      "service.error.cropCanvas": "The crop canvas could not be prepared.",
      "service.error.invalidHeight": "The selected height is invalid.",
      "service.error.invalidViewportHeight": "The viewport height is invalid.",
      "service.error.invalidViewportWidth": "The viewport width is invalid.",
      "service.error.invalidWidth": "The selected width is invalid.",
      "service.error.invalidX": "The selected horizontal coordinate is invalid.",
      "service.error.invalidY": "The selected vertical coordinate is invalid.",
      "service.error.noCaptureToCancel": "There is no running capture to cancel.",
      "service.error.noRecentProject": "No recent project was found.",
      "service.error.pageHeight": "The page height could not be identified.",
      "service.error.prepareFullPageCanvas": "The canvas for the full-page capture could not be prepared.",
      "service.error.readImage": "The captured image could not be read.",
      "service.error.regionNotReceived": "The selected region was not received.",
      "service.error.tabWindow": "The tab window for capture could not be identified.",
      "service.error.viewportContent": "The usable viewport area could not be identified.",
      "service.error.viewportSize": "The viewport size could not be identified.",
      "service.error.visibleCaptureEmpty": "The visible capture returned empty.",
      "service.progress.canceling": "Canceling capture...",
      "service.progress.capturingSlices": "Capturing page slices...",
      "service.progress.completed": "Capture completed.",
      "service.progress.openingEditor": "Opening the editor...",
      "service.progress.preparingFullPage": "Preparing the full page...",
      "captureStore.error.delete": "The capture could not be removed.",
      "captureStore.error.deleteComplete": "The capture removal could not be completed.",
      "captureStore.error.list": "The captures could not be listed.",
      "captureStore.error.listComplete": "The capture listing could not be completed.",
      "captureStore.error.openDatabase": "The capture database could not be opened.",
      "captureStore.error.read": "The capture could not be read.",
      "captureStore.error.readComplete": "The capture read operation could not be completed.",
      "captureStore.error.save": "The capture could not be saved.",
      "captureStore.error.saveAbort": "The capture save operation was aborted.",
      "captureStore.error.saveComplete": "The capture save operation could not be completed."
    },
    es: {
      "common.errorUnexpectedCapture": "Se produjo un error inesperado durante la captura.",
      "service.error.activeTabNotFound": "No se encontró la pestaña activa.",
      "service.error.buildFullPage": "No se pudo montar la captura de página completa.",
      "service.error.captureCancelled": "Captura cancelada.",
      "service.error.captureInProgress": "Ya hay una captura en curso en esta pestaña.",
      "service.error.captureTab": "No se pudo ejecutar la captura en la pestaña.",
      "service.error.cropCanvas": "No se pudo preparar el canvas de recorte.",
      "service.error.invalidHeight": "La altura seleccionada no es válida.",
      "service.error.invalidViewportHeight": "La altura del viewport no es válida.",
      "service.error.invalidViewportWidth": "La anchura del viewport no es válida.",
      "service.error.invalidWidth": "La anchura seleccionada no es válida.",
      "service.error.invalidX": "La coordenada horizontal seleccionada no es válida.",
      "service.error.invalidY": "La coordenada vertical seleccionada no es válida.",
      "service.error.noCaptureToCancel": "No hay ninguna captura en curso para cancelar.",
      "service.error.noRecentProject": "No se encontró ningún proyecto reciente.",
      "service.error.pageHeight": "No se pudo identificar la altura de la página.",
      "service.error.prepareFullPageCanvas": "No se pudo preparar el canvas de la captura full page.",
      "service.error.readImage": "No se pudo leer la imagen capturada.",
      "service.error.regionNotReceived": "No se recibió la región seleccionada.",
      "service.error.tabWindow": "No se pudo identificar la ventana de la pestaña para capturar.",
      "service.error.viewportContent": "No se pudo identificar el área útil del viewport.",
      "service.error.viewportSize": "No se pudo identificar el tamaño del viewport.",
      "service.error.visibleCaptureEmpty": "La captura visible volvió vacía.",
      "service.progress.canceling": "Cancelando captura...",
      "service.progress.capturingSlices": "Capturando los fragmentos de la página...",
      "service.progress.completed": "Captura completada.",
      "service.progress.openingEditor": "Abriendo el editor...",
      "service.progress.preparingFullPage": "Preparando la página completa...",
      "captureStore.error.delete": "No se pudo eliminar la captura.",
      "captureStore.error.deleteComplete": "No se pudo completar la eliminación de la captura.",
      "captureStore.error.list": "No se pudieron listar las capturas.",
      "captureStore.error.listComplete": "No se pudo completar el listado de capturas.",
      "captureStore.error.openDatabase": "No se pudo abrir la base de datos de capturas.",
      "captureStore.error.read": "No se pudo leer la captura.",
      "captureStore.error.readComplete": "No se pudo completar la lectura de la captura.",
      "captureStore.error.save": "No se pudo guardar la captura.",
      "captureStore.error.saveAbort": "Se canceló el guardado de la captura.",
      "captureStore.error.saveComplete": "No se pudo completar el guardado de la captura."
    },
    fr: {
      "common.errorUnexpectedCapture": "Une erreur inattendue s'est produite pendant la capture.",
      "service.error.activeTabNotFound": "L'onglet actif est introuvable.",
      "service.error.buildFullPage": "La capture pleine page n'a pas pu être construite.",
      "service.error.captureCancelled": "Capture annulée.",
      "service.error.captureInProgress": "Une capture est déjà en cours sur cet onglet.",
      "service.error.captureTab": "La capture de l'onglet n'a pas pu être exécutée.",
      "service.error.cropCanvas": "Le canvas de recadrage n'a pas pu être préparé.",
      "service.error.invalidHeight": "La hauteur sélectionnée est invalide.",
      "service.error.invalidViewportHeight": "La hauteur de la fenêtre visible est invalide.",
      "service.error.invalidViewportWidth": "La largeur de la fenêtre visible est invalide.",
      "service.error.invalidWidth": "La largeur sélectionnée est invalide.",
      "service.error.invalidX": "La coordonnée horizontale sélectionnée est invalide.",
      "service.error.invalidY": "La coordonnée verticale sélectionnée est invalide.",
      "service.error.noCaptureToCancel": "Aucune capture en cours à annuler.",
      "service.error.noRecentProject": "Aucun projet récent n'a été trouvé.",
      "service.error.pageHeight": "La hauteur de la page n'a pas pu être identifiée.",
      "service.error.prepareFullPageCanvas": "Le canvas de la capture pleine page n'a pas pu être préparé.",
      "service.error.readImage": "L'image capturée n'a pas pu être lue.",
      "service.error.regionNotReceived": "La région sélectionnée n'a pas été reçue.",
      "service.error.tabWindow": "La fenêtre de l'onglet à capturer n'a pas pu être identifiée.",
      "service.error.viewportContent": "La zone utile de la fenêtre visible n'a pas pu être identifiée.",
      "service.error.viewportSize": "La taille de la fenêtre visible n'a pas pu être identifiée.",
      "service.error.visibleCaptureEmpty": "La capture visible est revenue vide.",
      "service.progress.canceling": "Annulation de la capture...",
      "service.progress.capturingSlices": "Capture des sections de la page...",
      "service.progress.completed": "Capture terminée.",
      "service.progress.openingEditor": "Ouverture de l'éditeur...",
      "service.progress.preparingFullPage": "Préparation de la page entière...",
      "captureStore.error.delete": "La capture n'a pas pu être supprimée.",
      "captureStore.error.deleteComplete": "La suppression de la capture n'a pas pu être finalisée.",
      "captureStore.error.list": "Les captures n'ont pas pu être listées.",
      "captureStore.error.listComplete": "La liste des captures n'a pas pu être finalisée.",
      "captureStore.error.openDatabase": "La base de données des captures n'a pas pu être ouverte.",
      "captureStore.error.read": "La capture n'a pas pu être lue.",
      "captureStore.error.readComplete": "La lecture de la capture n'a pas pu être finalisée.",
      "captureStore.error.save": "La capture n'a pas pu être enregistrée.",
      "captureStore.error.saveAbort": "L'enregistrement de la capture a été annulé.",
      "captureStore.error.saveComplete": "L'enregistrement de la capture n'a pas pu être finalisé."
    }
  };

  const DEFAULT_LANGUAGE = getBrowserLanguage();
  let currentLanguage = DEFAULT_LANGUAGE;

  function normalizeLanguage(language, fallbackLanguage = DEFAULT_LANGUAGE) {
    const value = String(language || "").trim().toLowerCase();

    if (!value) {
      return fallbackLanguage;
    }

    if (value === "pt" || value.startsWith("pt-br")) {
      return "pt-BR";
    }

    if (value.startsWith("pt-pt")) {
      return "pt-PT";
    }

    if (value === "en" || value.startsWith("en-")) {
      return "en";
    }

    if (value === "es" || value.startsWith("es-")) {
      return "es";
    }

    if (value === "fr" || value.startsWith("fr-")) {
      return "fr";
    }

    return fallbackLanguage;
  }

  function getBrowserLanguage() {
    if (scope.chrome && scope.chrome.i18n && typeof scope.chrome.i18n.getUILanguage === "function") {
      return normalizeLanguage(scope.chrome.i18n.getUILanguage(), FALLBACK_LANGUAGE);
    }

    if (typeof navigator !== "undefined" && navigator.language) {
      return normalizeLanguage(navigator.language, FALLBACK_LANGUAGE);
    }

    return FALLBACK_LANGUAGE;
  }

  function formatMessage(template, params) {
    return String(template || "").replace(/\{(\w+)\}/g, (match, key) => {
      if (params && Object.prototype.hasOwnProperty.call(params, key)) {
        return String(params[key]);
      }

      return match;
    });
  }

  function translate(key, params, language) {
    const normalizedLanguage = normalizeLanguage(language || currentLanguage);
    const defaultMessages = MESSAGES[FALLBACK_LANGUAGE];
    const languageMessages = MESSAGES[normalizedLanguage] || defaultMessages;
    const template = languageMessages[key] || defaultMessages[key] || key;
    return formatMessage(template, params);
  }

  function getDefaultLanguage() {
    return DEFAULT_LANGUAGE;
  }

  function setCurrentLanguage(language) {
    currentLanguage = normalizeLanguage(language);
    return currentLanguage;
  }

  async function getCurrentLanguage() {
    const result = await storageGet(STORAGE_KEY);
    currentLanguage = normalizeLanguage(result[STORAGE_KEY]);
    return currentLanguage;
  }

  function storageGet(key) {
    return new Promise((resolve, reject) => {
      if (!scope.chrome || !scope.chrome.storage || !scope.chrome.storage.local) {
        resolve({});
        return;
      }

      scope.chrome.storage.local.get(key, (result) => {
        if (scope.chrome.runtime && scope.chrome.runtime.lastError) {
          reject(scope.chrome.runtime.lastError);
          return;
        }

        resolve(result || {});
      });
    });
  }

  scope.PrintExtensionI18n = {
    getCurrentLanguage,
    getDefaultLanguage,
    normalizeLanguage,
    setCurrentLanguage,
    t: translate,
  };
})(typeof self !== "undefined" ? self : globalThis);
