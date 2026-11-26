// Actualizaciones (mismo comportamiento que las demas apps de Logic Lab):
// - Si hay version nueva y la estan USANDO (tocaron algo hace poco, estan
//   escribiendo o tienen un pedido a medio cargar): cartel "Hay una nueva
//   actualizacion" y deciden ellos.
// - Si NO la estan usando: se actualiza sola.
// - Mientras se actualiza sale la pantalla de Logic Lab con la barra.
/* global __APP_RELEASE_SHA__ */
var CHECK_MS = 2 * 60 * 1000;
var IDLE_CHECK_MS = 10 * 1000;
var IDLE_BEFORE_AUTO_MS = 45 * 1000;
var PROGRESS_MS = 2200;

var lastActivity = Date.now();
var available = false;
var started = false;

function el(tag, className, text) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function inUse() {
  var active = document.activeElement;
  var typing = !!active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName);
  var openOrder = !!document.querySelector(".orderform");
  return typing || openOrder || Date.now() - lastActivity < IDLE_BEFORE_AUTO_MS;
}

// Da de baja el service worker de ESTA app y borra su cache, para que la
// recarga traiga la version nueva. Si falla, igual se recarga.
function clearAppCache() {
  var tasks = [];
  if ("serviceWorker" in navigator) {
    var scope = new URL("./", window.location.href).pathname;
    tasks.push(navigator.serviceWorker.getRegistrations().then(function (list) {
      return Promise.all(list.filter(function (r) { return new URL(r.scope).pathname === scope; }).map(function (r) { return r.unregister(); }));
    }));
  }
  if ("caches" in window) {
    tasks.push(window.caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k.indexOf("santi-") === 0; }).map(function (k) { return window.caches.delete(k); }));
    }));
  }
  return Promise.all(tasks).catch(function () {});
}

function runUpdate() {
  if (started) return;
  started = true;
  var banner = document.querySelector(".update-banner");
  if (banner) banner.remove();

  var overlay = el("div", "update-overlay");
  overlay.setAttribute("role", "status");
  var card = el("div", "update-overlay-card");
  var logo = el("img");
  logo.src = import.meta.env.BASE_URL + "LogoLogicLab.png";
  logo.alt = "Logic Lab";
  var title = el("strong", "", "Actualizando la aplicación…");
  var bar = el("div", "update-progress");
  var fill = el("div", "update-progress-fill");
  bar.appendChild(fill);
  var percent = el("span", "", "0%");
  card.appendChild(logo); card.appendChild(title); card.appendChild(bar); card.appendChild(percent);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  var cleanup = clearAppCache();
  var startedAt = Date.now();
  var timer = window.setInterval(function () {
    var value = Math.min(100, Math.round(((Date.now() - startedAt) / PROGRESS_MS) * 100));
    fill.style.width = value + "%";
    percent.textContent = value + "%";
    if (value >= 100) {
      window.clearInterval(timer);
      title.textContent = "¡Listo!";
      cleanup.then(function () { window.location.reload(); });
    }
  }, 40);
}

function showBanner() {
  if (started || document.querySelector(".update-banner")) return;
  var banner = el("aside", "update-banner");
  banner.setAttribute("role", "status");
  banner.appendChild(el("strong", "", "Hay una nueva actualización"));
  var button = el("button", "", "Actualizar");
  button.type = "button";
  button.addEventListener("click", runUpdate);
  banner.appendChild(button);
  document.body.appendChild(banner);
}

function evaluate() {
  if (!available || started) return;
  if (inUse()) showBanner();
  else runUpdate();
}

function check() {
  fetch(import.meta.env.BASE_URL + "app-build.json?ts=" + Date.now(), { cache: "no-store" })
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (published) {
      if (published && published.releaseSha && published.releaseSha !== __APP_RELEASE_SHA__) {
        available = true;
        evaluate();
      }
    })
    .catch(function () {
      // Silencioso: se reintenta en el proximo chequeo.
    });
}

export function setupUpdates() {
  if (!import.meta.env.PROD) return;
  ["pointerdown", "keydown", "touchstart", "input", "wheel"].forEach(function (name) {
    window.addEventListener(name, function () { lastActivity = Date.now(); }, { passive: true });
  });
  check();
  window.setInterval(check, CHECK_MS);
  window.setInterval(evaluate, IDLE_CHECK_MS);
  var onReturn = function () { if (document.visibilityState === "visible") check(); };
  window.addEventListener("focus", onReturn);
  document.addEventListener("visibilitychange", onReturn);
}
