/* Descarga del launcher desde las releases de GitHub. */
(function () {
  "use strict";

  var OS_INFO = {
    windows: { label: "Windows", icon: "windows" },
    macos: { label: "macOS", icon: "apple" },
    linux: { label: "Linux", icon: "linux" },
  };

  var RELEASE_API = "https://api.github.com/repos/" + window.DVARC_CONFIG.repo + "/releases/latest";

  function detectOs() {
    var platform = "";
    if (navigator.userAgentData && navigator.userAgentData.platform) {
      platform = navigator.userAgentData.platform;
    } else {
      platform = navigator.platform || navigator.userAgent || "";
    }
    platform = platform.toLowerCase();

    if (platform.indexOf("win") !== -1) {
      return "windows";
    }
    if (platform.indexOf("mac") !== -1 || platform.indexOf("darwin") !== -1) {
      return "macos";
    }
    if (platform.indexOf("linux") !== -1 || platform.indexOf("x11") !== -1) {
      return "linux";
    }
    return "windows";
  }

  function scoreAsset(asset, os) {
    var name = (asset.name || "").toLowerCase();
    var score = 0;

    function has(needle) {
      return name.indexOf(needle) !== -1;
    }

    if (os === "windows") {
      if (has("windows") || has("win64") || has("win-")) score += 4;
      if (name.endsWith(".exe")) score += 10;
      if (name.endsWith(".msi")) score += 8;
      if (name.endsWith(".zip")) score += 3;
      if (has("installer")) score += 2;
      if (has("portable")) score += 1;
    } else if (os === "macos") {
      if (has("macos") || has("mac-") || has("darwin")) score += 4;
      if (name.endsWith(".dmg")) score += 10;
      if (name.endsWith(".zip")) score += 3;
      if (has("arm64") || has("universal")) score += 1;
    } else {
      if (has("linux")) score += 4;
      if (name.endsWith(".appimage")) score += 10;
      if (name.endsWith(".flatpak")) score += 7;
      if (name.endsWith(".deb")) score += 6;
      if (name.endsWith(".rpm")) score += 5;
      if (name.endsWith(".tar.gz") || name.endsWith(".tar.xz")) score += 4;
    }

    return score;
  }

  function pickAsset(assets, os) {
    var best = null;
    var bestScore = 0;
    (assets || []).forEach(function (asset) {
      var score = scoreAsset(asset, os);
      if (score > bestScore) {
        best = asset;
        bestScore = score;
      }
    });
    return best;
  }

  function formatBytes(bytes) {
    if (!bytes && bytes !== 0) {
      return "—";
    }
    var units = ["B", "KB", "MB", "GB"];
    var value = bytes;
    var unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit += 1;
    }
    return value.toFixed(unit === 0 ? 0 : 1) + " " + units[unit];
  }

  function formatDate(value) {
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "—";
    }
    return new Intl.DateTimeFormat("es", { day: "numeric", month: "long", year: "numeric" }).format(date);
  }

  function cachedRelease() {
    try {
      var raw = window.sessionStorage.getItem(window.DVARC_CONFIG.cacheKey);
      if (!raw) {
        return null;
      }
      var parsed = JSON.parse(raw);
      if (!parsed || Date.now() - parsed.at > window.DVARC_CONFIG.cacheTtl) {
        return null;
      }
      return parsed.release;
    } catch (error) {
      return null;
    }
  }

  function storeRelease(release) {
    try {
      window.sessionStorage.setItem(
        window.DVARC_CONFIG.cacheKey,
        JSON.stringify({ at: Date.now(), release: release })
      );
    } catch (error) {
      /* sin caché */
    }
  }

  async function fetchLatest() {
    var cached = cachedRelease();
    if (cached) {
      return cached;
    }

    var response = await fetch(RELEASE_API, {
      headers: { Accept: "application/vnd.github+json" },
      cache: "no-store",
    });

    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error("GitHub respondió con el código " + response.status + ".");
    }

    var release = await response.json();
    storeRelease(release);
    return release;
  }

  function svgIcon(name) {
    var paths = {
      windows:
        '<path d="M3 5.5 10 4.4v7.1H3V5.5Zm8-1.3 10-1.6v8.9H11V4.2ZM3 12.5h7v7.1L3 18.5v-6Zm8 0h10v8.9l-10-1.6v-7.3Z"/>',
      apple:
        '<path d="M15.5 8.6c-.8 0-1.8.5-2.4.5-.6 0-1.5-.5-2.4-.5-1.6 0-3.1 1.1-3.9 2.9-1.7 2.9-.4 7.2 1.2 9.5.8 1.1 1.7 2.3 3 2.2 1.2 0 1.7-.8 3.2-.8s1.9.8 3.2.8c1.3 0 2.1-1.1 2.9-2.2.9-1.3 1.3-2.5 1.3-2.6-.1 0-2.5-1-2.5-3.8 0-2.4 1.9-3.5 2-3.6-1.1-1.6-2.8-1.8-3.4-1.8-1.5 0-2.7.9-3.5.9Z"/><path d="M13.7 3.2c.7-.9 1.2-2.1 1.1-3.2-1.1.1-2.4.7-3.2 1.6-.7.8-1.3 2-1.1 3.2 1.2.1 2.4-.6 3.2-1.6Z"/>',
      linux:
        '<path d="M12 2a5 5 0 0 0-5 5c0 2.1.9 3.1 1.5 4.4.4.9.5 2.1.4 3.3-.6 1.1-2.1 2.4-2.1 4 0 1.1 1.3 1.3 2.2 1.3.8 0 1.6-.3 2.3-.3.8 0 1.6.6 2.7.6 1 0 2.1-.4 2.1-1.3 0-1.4-1.4-2.7-2-4.3-.2-1.2 0-2.4.4-3.3C15.1 10.1 17 9.1 17 7a5 5 0 0 0-5-5Zm-2 5.2a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8Zm4 0a.9.9 0 1 1 0-1.8.9 0 0 1 0 1.8ZM12 9.1c.8 0 1.4.4 1.4.8 0 .5-.6.9-1.4.9s-1.4-.4-1.4-.9c0-.4.6-.8 1.4-.8Z"/>',
    };
    return (
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">' +
      (paths[name] || "") +
      "</svg>"
    );
  }

  function renderTabs(container, selected, onSelect) {
    if (!container) {
      return;
    }
    container.textContent = "";
    Object.keys(OS_INFO).forEach(function (key) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "os-tab";
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", key === selected ? "true" : "false");
      button.innerHTML = svgIcon(OS_INFO[key].icon) + "<span>" + OS_INFO[key].label + "</span>";
      button.addEventListener("click", function () {
        onSelect(key);
      });
      container.appendChild(button);
    });
  }

  function buildMetaList(release, asset, os) {
    var list = document.createElement("ul");
    list.className = "download-meta";

    function row(label, value) {
      var item = document.createElement("li");
      var key = document.createElement("span");
      key.textContent = label;
      var val = document.createElement("strong");
      val.textContent = value;
      item.appendChild(key);
      item.appendChild(val);
      list.appendChild(item);
    }

    row("Sistema", OS_INFO[os].label);
    row("Versión", release.tag_name || release.name || "—");
    row("Publicado", formatDate(release.published_at));
    if (asset) {
      row("Archivo", asset.name);
      row("Tamaño", formatBytes(asset.size));
    }
    return list;
  }

  function renderRelease(root, release, os, onOsChange) {
    root.textContent = "";

    var card = document.createElement("div");
    card.className = "download-card";

    var left = document.createElement("div");
    var title = document.createElement("h2");
    title.textContent = "Dvarc Launcher " + (release.tag_name || "");
    left.appendChild(title);

    var lead = document.createElement("p");
    lead.className = "text-muted";
    lead.textContent =
      "Instalador oficial de Dvarc Launcher para " + OS_INFO[os].label + ".";
    left.appendChild(lead);

    var asset = pickAsset(release.assets, os);
    var actions = document.createElement("div");
    actions.className = "download-actions";

    if (asset) {
      var download = document.createElement("a");
      download.className = "btn btn-primary";
      download.href = asset.browser_download_url;
      download.rel = "noopener";
      download.innerHTML = svgIcon(OS_INFO[os].icon) + "<span>Descargar para " + OS_INFO[os].label + "</span>";
      actions.appendChild(download);
    } else {
      var fallback = document.createElement("a");
      fallback.className = "btn btn-primary";
      fallback.href = window.DVARC_CONFIG.releasesUrl;
      fallback.target = "_blank";
      fallback.rel = "noopener noreferrer";
      fallback.textContent = "Ver las releases en GitHub";
      actions.appendChild(fallback);
    }

    var all = document.createElement("a");
    all.className = "btn btn-ghost";
    all.href = window.DVARC_CONFIG.releasesUrl;
    all.target = "_blank";
    all.rel = "noopener noreferrer";
    all.textContent = "Todas las versiones";
    actions.appendChild(all);
    left.appendChild(actions);

    card.appendChild(left);

    var right = document.createElement("div");
    right.appendChild(buildMetaList(release, asset, os));

    if (!asset) {
      var warn = document.createElement("p");
      warn.className = "hint";
      warn.style.marginTop = "0.8rem";
      warn.textContent =
        "Esta release no incluye un archivo para " + OS_INFO[os].label + ". Prueba con otro sistema o revisa todas las descargas.";
      right.appendChild(warn);
    }

    card.appendChild(right);
    root.appendChild(card);

    var tabs = document.getElementById("os-tabs");
    renderTabs(tabs, os, onOsChange);

    var details = document.getElementById("asset-details");
    var list = document.getElementById("asset-list");
    if (details && list) {
      list.textContent = "";
      var assets = release.assets || [];
      details.hidden = assets.length === 0;
      assets.forEach(function (item) {
        var li = document.createElement("li");
        var name = document.createElement("span");
        name.textContent = item.name;
        var info = document.createElement("span");
        info.className = "text-muted";
        info.textContent = formatBytes(item.size) + " · ";
        var link = document.createElement("a");
        link.href = item.browser_download_url;
        link.rel = "noopener";
        link.textContent = "Descargar";
        info.appendChild(link);
        li.appendChild(name);
        li.appendChild(info);
        list.appendChild(li);
      });
    }
  }

  function renderNoReleases(root) {
    root.textContent = "";
    var card = document.createElement("div");
    card.className = "download-card";

    var left = document.createElement("div");
    var title = document.createElement("h2");
    title.textContent = "Todavía no hay descargas publicadas";
    left.appendChild(title);

    var lead = document.createElement("p");
    lead.className = "text-muted";
    lead.textContent =
      "El repositorio del launcher ya está disponible, pero aún no tiene una release con archivos. En cuanto se publique la primera aparecerá aquí automáticamente.";
    left.appendChild(lead);

    var actions = document.createElement("div");
    actions.className = "download-actions";

    var releases = document.createElement("a");
    releases.className = "btn btn-primary";
    releases.href = window.DVARC_CONFIG.releasesUrl;
    releases.target = "_blank";
    releases.rel = "noopener noreferrer";
    releases.textContent = "Abrir las releases en GitHub";
    actions.appendChild(releases);

    var repo = document.createElement("a");
    repo.className = "btn btn-ghost";
    repo.href = "https://github.com/" + window.DVARC_CONFIG.repo;
    repo.target = "_blank";
    repo.rel = "noopener noreferrer";
    repo.textContent = "Ver el repositorio";
    actions.appendChild(repo);
    left.appendChild(actions);

    card.appendChild(left);

    var right = document.createElement("div");
    var note = document.createElement("p");
    note.className = "hint";
    note.textContent =
      "Mientras tanto puedes compilar el launcher desde el código fuente. Sigue las instrucciones del README del repositorio.";
    right.appendChild(note);
    card.appendChild(right);

    root.appendChild(card);
  }

  function renderError(root, message) {
    root.textContent = "";
    var box = document.createElement("div");
    box.className = "error-box";
    var text = document.createElement("p");
    text.textContent = message;
    box.appendChild(text);

    var retry = document.createElement("button");
    retry.type = "button";
    retry.className = "btn btn-sm";
    retry.textContent = "Reintentar";
    retry.addEventListener("click", function () {
      window.location.reload();
    });
    box.appendChild(retry);
    root.appendChild(box);
  }

  async function init() {
    var root = document.getElementById("release-root");
    if (!root) {
      return;
    }

    var status = document.getElementById("release-status");
    if (status) {
      status.textContent = "Buscando la última versión…";
    }

    try {
      var release = await fetchLatest();
      if (status) {
        status.textContent = release ? "Última versión disponible." : "No hay releases publicadas.";
      }

      if (!release) {
        renderNoReleases(root);
        var tabs = document.getElementById("os-tabs");
        if (tabs) {
          tabs.textContent = "";
        }
        return;
      }

      var os = detectOs();
      var handleOsChange = function (next) {
        os = next;
        renderRelease(root, release, os, handleOsChange);
      };
      renderRelease(root, release, os, handleOsChange);
    } catch (error) {
      if (status) {
        status.textContent = "";
      }
      renderError(root, "No se pudieron cargar las descargas: " + error.message);
    }
  }

  window.DvarcDownload = {
    init: init,
    detectOs: detectOs,
    formatBytes: formatBytes,
  };
})();
