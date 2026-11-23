/* Sesión basada en el token de la instalación. */
(function () {
  "use strict";

  var TOKEN_KEY = window.DVARC_CONFIG.tokenKey;
  var PAGES = { panel: "panel.html", login: "login.html", download: "download.html", home: "index.html" };

  function pickStorage() {
    var stores = [];
    try {
      stores.push(window.localStorage);
    } catch (error) {
      /* bloqueado */
    }
    try {
      stores.push(window.sessionStorage);
    } catch (error) {
      /* bloqueado */
    }
    for (var index = 0; index < stores.length; index += 1) {
      try {
        var probe = "__dvarc_probe__";
        stores[index].setItem(probe, "1");
        stores[index].removeItem(probe);
        return stores[index];
      } catch (error) {
        /* siguiente */
      }
    }
    return null;
  }

  var storage = pickStorage();
  var available = Boolean(storage);

  var Auth = {
    available: available,

    token: function () {
      if (!storage) {
        return "";
      }
      return storage.getItem(TOKEN_KEY) || "";
    },

    setToken: function (token) {
      if (storage) {
        storage.setItem(TOKEN_KEY, token);
      }
    },

    clear: function () {
      if (storage) {
        storage.removeItem(TOKEN_KEY);
      }
    },

    login: async function (token) {
      var clean = String(token || "").trim();
      if (clean.length < 16) {
        throw new window.DvarcApi.ApiError(0, "invalid_format", "El token no parece válido.");
      }
      var me = await window.DvarcApi.me(clean);
      this.setToken(clean);
      return me;
    },

    logout: function (redirect) {
      this.clear();
      if (redirect !== false) {
        window.location.href = PAGES.login;
      }
    },

    preview: function (token) {
      if (!token) {
        return "";
      }
      if (token.length <= 18) {
        return token;
      }
      return token.slice(0, 10) + "…" + token.slice(-6);
    },

    nextPage: function () {
      try {
        var next = new URLSearchParams(window.location.search).get("next");
        if (next === PAGES.panel || next === PAGES.download) {
          return next;
        }
      } catch (error) {
        /* ignorar */
      }
      return PAGES.panel;
    },

    guard: function () {
      if (this.token()) {
        return true;
      }
      var here = window.location.pathname.split("/").pop() || PAGES.home;
      window.location.replace(PAGES.login + "?next=" + encodeURIComponent(here));
      return false;
    },

    updateDocument: function () {
      document.body.classList.toggle("has-token", Boolean(this.token()));
    },
  };

  window.DvarcAuth = Auth;
})();
