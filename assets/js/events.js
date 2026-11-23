/* Tarjetas de eventos y utilidades de fecha. */
(function () {
  "use strict";

  var dateFormatter = new Intl.DateTimeFormat("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  var monthFormatter = new Intl.DateTimeFormat("es", { month: "short" });

  function parseDate(value) {
    var date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function capitalize(text) {
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
  }

  function formatFull(date) {
    return capitalize(dateFormatter.format(date));
  }

  function dayParts(date) {
    return {
      day: String(date.getDate()),
      month: monthFormatter.format(date).replace(".", "").toUpperCase(),
    };
  }

  function relative(date, now) {
    now = now || new Date();
    var start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    var days = Math.round((target - start) / 86400000);

    if (days === 0) {
      return { text: "Hoy", tone: "soon" };
    }
    if (days === 1) {
      return { text: "Mañana", tone: "soon" };
    }
    if (days === -1) {
      return { text: "Ayer", tone: "past" };
    }
    if (days > 1) {
      return { text: "En " + days + " días", tone: "soon" };
    }
    return { text: "Hace " + Math.abs(days) + " días", tone: "past" };
  }

  function isUpcoming(date, now) {
    now = now || new Date();
    var startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return date.getTime() >= startOfToday.getTime();
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

  function buildCard(event) {
    var date = parseDate(event.startsAt);
    if (!date) {
      return null;
    }

    var rel = relative(date);
    var card = element("article", "event-card");

    var dateBox = element("div", "event-date");
    var parts = dayParts(date);
    dateBox.appendChild(element("span", "month", parts.month));
    dateBox.appendChild(element("span", "day", parts.day));
    dateBox.setAttribute("aria-hidden", "true");
    card.appendChild(dateBox);

    var body = element("div", "event-body");
    body.appendChild(element("h3", null, event.name));

    if (event.description) {
      body.appendChild(element("p", null, event.description));
    }

    var meta = element("div", "event-meta");
    var time = element("time", null, formatFull(date));
    time.dateTime = event.startsAt;
    meta.appendChild(time);

    var badge = element("span", "badge" + (rel.tone === "past" ? " badge-past" : " badge-soon"), rel.text);
    meta.appendChild(badge);
    body.appendChild(meta);
    card.appendChild(body);

    var link = element("a", "btn btn-sm");
    link.href = event.discordUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Abrir Discord";
    link.setAttribute("aria-label", "Abrir el Discord del evento " + event.name);
    card.appendChild(link);

    return card;
  }

  function emptyState(title, text) {
    var box = element("div", "empty");
    box.appendChild(element("strong", null, title));
    box.appendChild(element("p", null, text));
    return box;
  }

  function render(container, events, filter) {
    if (!container) {
      return;
    }
    container.textContent = "";

    var now = new Date();
    var items = (events || []).filter(function (event) {
      var date = parseDate(event.startsAt);
      if (!date) {
        return false;
      }
      return filter === "all" ? true : isUpcoming(date, now);
    });

    items.sort(function (a, b) {
      return new Date(a.startsAt) - new Date(b.startsAt);
    });

    if (!items.length) {
      if (filter === "upcoming" && (events || []).length) {
        container.appendChild(
          emptyState("No hay eventos próximos", "Cambia el filtro a «Todos» para ver los eventos anteriores.")
        );
      } else {
        container.appendChild(
          emptyState(
            "Aún no hay eventos",
            "Cuando se anuncie uno para tus cuentas aparecerá aquí. Vuelve a revisar más tarde."
          )
        );
      }
      return;
    }

    var fragment = document.createDocumentFragment();
    items.forEach(function (event) {
      var card = buildCard(event);
      if (card) {
        fragment.appendChild(card);
      }
    });
    container.appendChild(fragment);
  }

  function bindFilters(container, onChange) {
    if (!container) {
      return;
    }
    container.addEventListener("click", function (event) {
      var button = event.target.closest("[data-event-filter]");
      if (!button) {
        return;
      }
      var filter = button.getAttribute("data-event-filter");
      container.querySelectorAll("[data-event-filter]").forEach(function (item) {
        item.setAttribute("aria-pressed", item === button ? "true" : "false");
      });
      onChange(filter);
    });
  }

  window.DvarcEvents = {
    render: render,
    bindFilters: bindFilters,
    parseDate: parseDate,
    formatFull: formatFull,
    relative: relative,
  };
})();
