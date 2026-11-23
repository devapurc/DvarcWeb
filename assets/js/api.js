/* Cliente mínimo de la API de Dvarc. */
(function () {
  "use strict";

  function ApiError(status, code, message) {
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.message = message;
  }
  ApiError.prototype = Object.create(Error.prototype);
  ApiError.prototype.constructor = ApiError;

  function messageFor(status, code) {
    if (status === 0) {
      return "No se pudo conectar con la API. Revisa tu conexión e inténtalo de nuevo.";
    }
    if (status === 401) {
      return "El token no es válido o fue revocado.";
    }
    if (status === 403) {
      return "Tu token no tiene acceso a este contenido.";
    }
    if (status === 404) {
      return "El contenido solicitado no existe.";
    }
    if (status === 429) {
      return "Demasiadas solicitudes seguidas. Espera un momento.";
    }
    if (status >= 500) {
      return "La API está teniendo problemas. Inténtalo más tarde.";
    }
    if (code === "missing_token") {
      return "Falta el token de la instalación.";
    }
    return "La solicitud falló (" + status + ").";
  }

  async function request(path, options) {
    options = options || {};
    var headers = { Accept: "application/json" };
    if (options.token) {
      headers["X-Dvarc-Token"] = options.token;
    }

    var response;
    try {
      response = await fetch(window.DVARC_CONFIG.apiBase + path, {
        method: "GET",
        headers: headers,
        cache: "no-store",
        signal: options.signal,
      });
    } catch (error) {
      if (error && error.name === "AbortError") {
        throw error;
      }
      throw new ApiError(0, "network_error", messageFor(0));
    }

    var data = null;
    var contentType = response.headers.get("content-type") || "";
    if (contentType.indexOf("application/json") !== -1) {
      try {
        data = await response.json();
      } catch (error) {
        data = null;
      }
    }

    if (!response.ok) {
      var code = "http_" + response.status;
      if (data) {
        if (typeof data.error === "string") {
          code = data.error;
        } else if (data.detail && typeof data.detail.error === "string") {
          code = data.detail.error;
        }
      }
      throw new ApiError(response.status, code, messageFor(response.status, code));
    }

    return data;
  }

  window.DvarcApi = {
    ApiError: ApiError,
    health: function () {
      return request("/api/v1/health");
    },
    me: function (token) {
      return request("/api/v1/me", { token: token });
    },
    events: function (token) {
      return request("/api/v1/events", { token: token });
    },
    versions: function (token) {
      return request("/api/v1/versions", { token: token });
    },
    version: function (token, id) {
      return request("/api/v1/versions/" + encodeURIComponent(id), { token: token });
    },
  };
})();
