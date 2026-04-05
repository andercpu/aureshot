(function (scope) {
  const DATABASE_NAME = "print-extension-chrome";
  const STORE_NAME = "captures";
  const DATABASE_VERSION = 1;

  function translate(key) {
    if (scope.PrintExtensionI18n && typeof scope.PrintExtensionI18n.t === "function") {
      return scope.PrintExtensionI18n.t(key);
    }

    return key;
  }

  const CaptureStore = {
    async saveCapture(record) {
      const database = await openDatabase();

      return new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        const request = transaction.objectStore(STORE_NAME).put(record);

        request.onsuccess = () => {
          resolve(record);
        };

        request.onerror = () => {
          reject(request.error || new Error(translate("captureStore.error.save")));
        };

        transaction.oncomplete = () => {
          database.close();
        };

        transaction.onerror = () => {
          database.close();
          reject(transaction.error || new Error(translate("captureStore.error.saveComplete")));
        };

        transaction.onabort = () => {
          database.close();
          reject(transaction.error || new Error(translate("captureStore.error.saveAbort")));
        };
      });
    },

    async getCapture(id) {
      const database = await openDatabase();

      return new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, "readonly");
        const request = transaction.objectStore(STORE_NAME).get(id);

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = () => {
          reject(request.error || new Error(translate("captureStore.error.read")));
        };

        transaction.oncomplete = () => {
          database.close();
        };

        transaction.onerror = () => {
          database.close();
          reject(transaction.error || new Error(translate("captureStore.error.readComplete")));
        };
      });
    },

    async getAllCaptures() {
      const database = await openDatabase();

      return new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, "readonly");
        const request = transaction.objectStore(STORE_NAME).getAll();

        request.onsuccess = () => {
          resolve(Array.isArray(request.result) ? request.result : []);
        };

        request.onerror = () => {
          reject(request.error || new Error(translate("captureStore.error.list")));
        };

        transaction.oncomplete = () => {
          database.close();
        };

        transaction.onerror = () => {
          database.close();
          reject(transaction.error || new Error(translate("captureStore.error.listComplete")));
        };
      });
    },

    async deleteCapture(id) {
      const database = await openDatabase();

      return new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        const request = transaction.objectStore(STORE_NAME).delete(id);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(request.error || new Error(translate("captureStore.error.delete")));
        };

        transaction.oncomplete = () => {
          database.close();
        };

        transaction.onerror = () => {
          database.close();
          reject(transaction.error || new Error(translate("captureStore.error.deleteComplete")));
        };
      });
    },

    async prune(limit) {
      const captures = await this.getAllCaptures();

      if (captures.length <= limit) {
        return;
      }

      captures.sort((left, right) => right.createdAt - left.createdAt);
      const staleCaptures = captures.slice(limit);

      await Promise.all(
        staleCaptures.map((capture) => this.deleteCapture(capture.id))
      );
    },
  };

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, {
            keyPath: "id",
          });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error || new Error(translate("captureStore.error.openDatabase")));
      };
    });
  }

  scope.CaptureStore = CaptureStore;
})(self);
