/* Configuración del sitio.
 *
 * La URL de la API se puede sobrescribir en desarrollo cuando la página se sirve
 * desde localhost (por ejemplo `?api=http://127.0.0.1:8765`). En el dominio
 * público siempre se usa la constante, para que un enlace malicioso no pueda
 * redirigir el token de la instalación a otro servidor.
 */
(function () {
  "use strict";

  var LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1"];
  var isLocal = LOCAL_HOSTS.indexOf(window.location.hostname) !== -1;

  var apiBase = "https://dvarc.api.apurc.online";

  if (isLocal) {
    try {
      var params = new URLSearchParams(window.location.search);
      var override = params.get("api") || window.localStorage.getItem("dvarc_api_base");
      if (override) {
        apiBase = override;
        window.localStorage.setItem("dvarc_api_base", override);
      }
    } catch (error) {
      /* localStorage puede estar bloqueado; se usa el valor por defecto. */
    }
  }

  window.DVARC_CONFIG = Object.freeze({
    apiBase: apiBase.replace(/\/+$/, ""),
    websiteUrl: "https://dvarc.apurc.site",
    repo: "devapurc/DvarcLauncher",
    releasesUrl: "https://github.com/devapurc/DvarcLauncher/releases",
    tokenKey: "dvarc_token",
    cacheKey: "dvarc_release_cache",
    cacheTtl: 10 * 60 * 1000,
    isLocal: isLocal,
  });
})();
