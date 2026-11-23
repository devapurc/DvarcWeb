/* Lógica compartida y del panel. */
(function () {
  "use strict";

  function ready(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else {
      callback();
    }
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function setText(node, text) {
    if (node) {
      node.textContent = text;
    }
  }

  function loaderLabel(version) {
    var loader = version.loader || {};
    if (!loader.type) {
      return "Vanilla";
    }
    var name = loader.type.charAt(0).toUpperCase() + loader.type.slice(1);
    return loader.version ? name + " " + loader.version : name;
  }

  function formatBytes(bytes) {
    if (window.DvarcDownload) {
      return window.DvarcDownload.formatBytes(bytes);
    }
    return String(bytes || 0);
  }

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (text !== undefined) {
      node.textContent = text;
    }
    return node;
  }

  function errorBox(message) {
    var box = element("div", "error-box");
    box.appendChild(element("p", null, message));
    var retry = element("button", "btn btn-sm", "Reintentar");
    retry.type = "button";
    retry.addEventListener("click", function () {
      window.location.reload();
    });
    box.appendChild(retry);
    return box;
  }

  function emptyBox(title, text) {
    var box = element("div", "empty");
    box.appendChild(element("strong", null, title));
    box.appendChild(element("p", null, text));
    return box;
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        /* probar el método antiguo */
      }
    }
    var area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-1000px";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    var ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (error) {
      ok = false;
    }
    area.remove();
    return ok;
  }

  function alertBox(id) {
    var node = byId(id);
    if (!node) {
      return {
        show: function () {},
        hide: function () {},
        message: function () {},
      };
    }
    var text = node.querySelector("[data-alert-text]") || node;
    return {
      show: function (message, tone) {
        node.hidden = false;
        node.classList.remove("alert-error", "alert-ok", "alert-info");
        if (tone) {
          node.classList.add("alert-" + tone);
        }
        if (text !== node) {
          text.textContent = message;
        }
      },
      hide: function () {
        node.hidden = true;
      },
      message: function () {
        return text.textContent;
      },
    };
  }

  /* -------------------------------------------------------------- chrome */

  function initChrome() {
    var header = document.querySelector(".site-header");
    if (header) {
      var onScroll = function () {
        header.classList.toggle("is-scrolled", window.scrollY > 8);
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    var toggle = document.querySelector(".nav-toggle");
    var nav = byId("site-nav");
    if (toggle && nav) {
      toggle.addEventListener("click", function () {
        var open = toggle.getAttribute("aria-expanded") !== "true";
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
        nav.classList.toggle("is-open", open);
      });
      nav.addEventListener("click", function (event) {
        if (event.target.closest("a")) {
          toggle.setAttribute("aria-expanded", "false");
          nav.classList.remove("is-open");
        }
      });
      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && nav.classList.contains("is-open")) {
          toggle.setAttribute("aria-expanded", "false");
          nav.classList.remove("is-open");
          toggle.focus();
        }
      });
    }

    var current = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".site-nav a[href]").forEach(function (link) {
      var href = link.getAttribute("href");
      if (href === current) {
        link.setAttribute("aria-current", "page");
      }
    });

    var year = byId("footer-year");
    if (year) {
      year.textContent = String(new Date().getFullYear());
    }

    document.querySelectorAll('[data-action="logout"]').forEach(function (button) {
      button.addEventListener("click", function () {
        window.DvarcAuth.logout();
      });
    });

    window.DvarcAuth.updateDocument();
  }

  function initApiStatus() {
    var pill = document.querySelector("[data-api-status]");
    if (!pill) {
      return;
    }
    var dot = pill.querySelector(".pill-dot");
    var label = pill.querySelector("[data-api-status-text]");

    window.DvarcApi.health()
      .then(function (health) {
        if (dot) {
          dot.setAttribute("data-state", "ok");
        }
        setText(
          label,
          health && typeof health.versions === "number"
            ? "Dvarc disponible · " + health.versions + " versiones"
            : "Dvarc disponible"
        );
      })
      .catch(function () {
        if (dot) {
          dot.setAttribute("data-state", "down");
        }
        setText(label, "Servicio no disponible");
      });
  }

  /* --------------------------------------------------------------- login */

  function initLogin() {
    var form = byId("login-form");
    if (!form) {
      return;
    }

    var input = byId("token-input");
    var submit = byId("login-submit");
    var error = alertBox("login-error");
    var info = alertBox("login-info");
    var expired = new URLSearchParams(window.location.search).get("expired");

    if (!window.DvarcAuth.available) {
      error.show(
        "Tu navegador bloquea el almacenamiento local. Habilítalo (o sal del modo privado) para conservar la sesión.",
        "error"
      );
      if (submit) {
        submit.disabled = true;
      }
      return;
    }

    if (expired) {
      info.show("Tu sesión anterior ya no es válida. Vuelve a pegar el token de tu instalación.", "info");
    } else if (window.DvarcAuth.token()) {
      info.show("Ya hay una sesión activa en este navegador. Puedes entrar al panel o reemplazarla con otro token.", "info");
    }

    var show = byId("show-token");
    if (show && input) {
      show.addEventListener("change", function () {
        input.type = show.checked ? "text" : "password";
      });
    }

    var paste = byId("paste-token");
    if (paste && input) {
      paste.addEventListener("click", async function () {
        try {
          var text = await navigator.clipboard.readText();
          if (text) {
            input.value = text.trim();
            input.focus();
          }
        } catch (error) {
          input.focus();
          info.show("No se pudo leer el portapapeles. Pega el token manualmente.", "info");
        }
      });
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      error.hide();

      var token = input ? input.value.trim() : "";
      if (!token) {
        error.show("Escribe el token de tu instalación.", "error");
        input.focus();
        return;
      }

      var original = submit ? submit.textContent : "";
      if (submit) {
        submit.disabled = true;
        submit.textContent = "Verificando…";
      }

      try {
        await window.DvarcAuth.login(token);
        window.DvarcAuth.updateDocument();
        window.location.assign(window.DvarcAuth.nextPage());
      } catch (failure) {
        error.show(failure && failure.message ? failure.message : "No se pudo iniciar sesión.", "error");
        if (submit) {
          submit.disabled = false;
          submit.textContent = original;
        }
      }
    });
  }

  /* --------------------------------------------------------------- panel */

  function renderAccount(me) {
    var usernames = (me && Array.isArray(me.usernames) ? me.usernames : []).filter(Boolean);
    var chip = byId("account-name");
    var avatar = byId("account-avatar");
    var welcome = byId("welcome-title");

    if (usernames.length) {
      var primary = usernames[0];
      setText(chip, usernames.length > 1 ? primary + " +" + (usernames.length - 1) : primary);
      setText(avatar, primary.slice(0, 2));
      setText(welcome, "Hola, " + primary);
      if (usernames.length > 1) {
        var chipNode = byId("account-chip");
        if (chipNode) {
          chipNode.title = "Cuentas: " + usernames.join(", ");
        }
      }
    } else {
      setText(chip, "Sin cuentas vinculadas");
      setText(avatar, "DV");
      setText(welcome, "Hola");
    }
  }

  function loadVersionIcon(img, url, token) {
    var absolute = /^https?:\/\//i.test(url) ? url : window.DVARC_CONFIG.apiBase + url;
    fetch(absolute, { headers: { "X-Dvarc-Token": token }, cache: "no-store" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("icon");
        }
        return response.blob();
      })
      .then(function (blob) {
        var objectUrl = URL.createObjectURL(blob);
        img.src = objectUrl;
        img.addEventListener("load", function () {
          window.setTimeout(function () {
            URL.revokeObjectURL(objectUrl);
          }, 10000);
        });
        img.hidden = false;
      })
      .catch(function () {
        img.remove();
      });
  }

  function renderVersions(container, versions, token) {
    if (!container) {
      return;
    }
    container.textContent = "";

    if (!versions || !versions.length) {
      container.appendChild(
        emptyBox(
          "No hay versiones disponibles",
          "Cuando el equipo publique una versión para tus cuentas aparecerá aquí. También puedes revisar el launcher."
        )
      );
      return;
    }

    var fragment = document.createDocumentFragment();
    versions.forEach(function (version) {
      var card = element("article", "version-card");

      var head = element("div", "version-head");
      var icon = element("div", "version-icon", (version.name || "?").charAt(0));
      if (version.iconUrl) {
        var img = document.createElement("img");
        img.alt = "";
        img.hidden = true;
        icon.textContent = "";
        icon.appendChild(img);
        loadVersionIcon(img, version.iconUrl, token);
      }
      head.appendChild(icon);

      var titles = element("div");
      titles.appendChild(element("h3", null, version.name || version.id));
      titles.appendChild(element("p", null, "Minecraft " + (version.minecraft || "—")));
      head.appendChild(titles);
      card.appendChild(head);

      card.appendChild(
        element("p", null, version.description || "Versión preparada por Dvarc para jugar.")
      );

      var tags = element("div", "version-tags");
      tags.appendChild(element("span", "badge", loaderLabel(version)));
      if (version.java) {
        tags.appendChild(element("span", "badge", "Java " + version.java));
      }
      if (version.memory) {
        tags.appendChild(element("span", "badge", version.memory));
      }
      if (version.restricted) {
        tags.appendChild(element("span", "badge", "Solo invitados"));
      }
      card.appendChild(tags);

      var foot = element("div", "version-foot");
      foot.appendChild(
        element("span", null, (version.fileCount || 0) + " archivos · " + formatBytes(version.size))
      );
      foot.appendChild(element("span", "hint", "Se descarga en el launcher"));
      card.appendChild(foot);

      fragment.appendChild(card);
    });

    container.appendChild(fragment);
  }

  function initPanel() {
    if (!window.DvarcAuth.guard()) {
      return;
    }

    var token = window.DvarcAuth.token();
    var tokenPreview = byId("token-preview");
    var endpoint = byId("api-endpoint");
    var copyStatus = byId("copy-status");
    var copyButton = byId("copy-token");
    var eventsList = byId("events-list");
    var versionsList = byId("versions-list");
    var eventFilters = byId("event-filters");
    var eventData = [];
    var filter = "upcoming";

    setText(tokenPreview, window.DvarcAuth.preview(token));
    if (endpoint) {
      endpoint.textContent = window.DVARC_CONFIG.apiBase.replace(/^https?:\/\//, "");
      endpoint.title = window.DVARC_CONFIG.apiBase;
    }

    if (copyButton) {
      copyButton.addEventListener("click", async function () {
        var ok = await copyText(token);
        if (copyStatus) {
          copyStatus.textContent = ok
            ? "Token copiado al portapapeles."
            : "No se pudo copiar. Selecciona el token manualmente.";
          window.setTimeout(function () {
            copyStatus.textContent = "";
          }, 4000);
        }
      });
    }

    window.DvarcEvents.bindFilters(eventFilters, function (next) {
      filter = next;
      window.DvarcEvents.render(eventsList, eventData, filter);
    });

    var jobs = [
      window.DvarcApi.me(token),
      window.DvarcApi.events(token),
      window.DvarcApi.versions(token),
    ];

    Promise.allSettled(jobs).then(function (results) {
      var authFailed = results.some(function (result) {
        return (
          result.status === "rejected" &&
          result.reason &&
          result.reason.status === 401
        );
      });
      if (authFailed) {
        window.DvarcAuth.clear();
        window.location.replace("login.html?expired=1&next=panel.html");
        return;
      }

      if (eventsList) {
        eventsList.setAttribute("aria-busy", "false");
      }
      if (versionsList) {
        versionsList.setAttribute("aria-busy", "false");
      }

      var meResult = results[0];
      if (meResult.status === "fulfilled") {
        renderAccount(meResult.value);
      } else {
        renderAccount(null);
      }

      var eventsResult = results[1];
      if (eventsResult.status === "fulfilled") {
        eventData = Array.isArray(eventsResult.value) ? eventsResult.value : [];
        window.DvarcEvents.render(eventsList, eventData, filter);
      } else {
        eventsList.textContent = "";
        eventsList.appendChild(
          errorBox(
            eventsResult.reason && eventsResult.reason.message
              ? eventsResult.reason.message
              : "No se pudieron cargar los eventos."
          )
        );
      }

      var versionsResult = results[2];
      if (versionsResult.status === "fulfilled") {
        renderVersions(versionsList, versionsResult.value, token);
      } else {
        versionsList.textContent = "";
        versionsList.appendChild(
          errorBox(
            versionsResult.reason && versionsResult.reason.message
              ? versionsResult.reason.message
              : "No se pudieron cargar las versiones."
          )
        );
      }
    });
  }

  /* ---------------------------------------------------------------- boot */

  ready(function () {
    initChrome();
    initApiStatus();

    var page = document.body.getAttribute("data-page");
    if (page === "login") {
      initLogin();
    } else if (page === "panel") {
      initPanel();
    } else if (page === "download" && window.DvarcDownload) {
      window.DvarcDownload.init();
    }
  });
})();
