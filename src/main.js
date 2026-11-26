import "./styles.css";
import { setupUpdates } from "./actualizacion.js";
import { ordersSection, renderOrders, setOrdersState, setupOrders } from "./pedidos.js";

var openId = null;

// Todo viene del backend (GET /santi/state). Estas variables se rellenan en applyState().
var clients = [];
var MENUS = [];
var weekOptions = [];
var weekly = {};
var histData = {};
var payData = {};
var editing = null;
var sentWeek = false;

var API_BASE = import.meta.env.VITE_API_URL || "https://saasproback.onrender.com/api/v1";

function setStatus(text, isError) {
  var el = document.getElementById("status");
  el.hidden = !text;
  el.textContent = text || "";
  el.className = isError ? "status err" : "status";
}

// Pedido al backend: devuelve el estado nuevo o rechaza con el mensaje.
function api(method, path, body) {
  return fetch(API_BASE + "/santi" + path, {
    method: method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
    .then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) throw new Error(data && data.message ? [].concat(data.message).join(" ") : "Error " + res.status);
        return data;
      });
    });
}

// Pide al backend y vuelve a dibujar todo con el estado nuevo que devuelve.
function call(method, path, body) {
  return api(method, path, body)
    .then(function (state) {
      applyState(state);
      setStatus("");
    })
    .catch(function (e) {
      setStatus("No se pudo guardar: " + e.message, true);
    });
}

function applyState(state) {
  clients = state.clients;
  MENUS = state.menus;
  weekOptions = state.menus.filter(function (m) { return m.inWeek; }).map(function (m) { return m.id; });
  weekly = {};
  clients.forEach(function (c) { if (c.weeklyMenuId != null) weekly[c.id] = c.weeklyMenuId; });
  payData = {};
  state.payments.forEach(function (p) {
    (payData[p.clientId] = payData[p.clientId] || []).push({ date: p.date, amount: p.amount, method: p.method });
  });
  histData = {};
  state.history.forEach(function (h) {
    (histData[h.clientId] = histData[h.clientId] || []).push([h.day, h.dish]);
  });
  setOrdersState(state);
  render();
  renderMenus();
  renderOrders();
}

function weekMenus() { return MENUS.filter(function (m) { return weekOptions.indexOf(m.id) !== -1; }); }

function menuName(id) {
  for (var i = 0; i < MENUS.length; i++) if (MENUS[i].id === id) return MENUS[i].name;
  return "";
}
// Pagos: el backend guarda el pago con la fecha de hoy y deja al cliente en cero.
function registerPayment(c) {
  if (c.owes <= 0) return;
  call("POST", "/clients/" + c.id + "/payments");
}

var receiptOpen = null;
var receiptSent = {};
function receiptText(c, pay) {
  return "Hola " + c.name + ", recibimos tu pago de " + money(pay.amount) + " el " + pay.date + " (" + pay.method.toLowerCase() + ").\nGracias por tu pago.\nSanti";
}
function payItem(c, pay, idx, showName) {
  var key = c.id + "-" + idx + "-" + pay.date + "-" + pay.amount;
  var item = document.createElement("div");
  item.className = "pay-item";
  var row = document.createElement("div");
  row.className = "pay-row";
  var main = document.createElement("div");
  main.className = "pay-main";
  var am = document.createElement("span");
  am.className = "pay-amount"; am.textContent = money(pay.amount);
  var meta = document.createElement("span");
  meta.className = "pay-meta"; meta.textContent = pay.date + " · " + pay.method;
  if (showName) {
    var who = document.createElement("span");
    who.className = "name"; who.textContent = c.name;
    main.appendChild(who);
  }
  main.appendChild(am); main.appendChild(meta);
  var btn = document.createElement("button");
  btn.type = "button"; btn.className = "btn-ghost btn-small";
  var isOpen = receiptOpen === key;
  btn.textContent = isOpen ? "Cerrar" : "Recibo por WhatsApp";
  btn.addEventListener("click", function () { receiptOpen = isOpen ? null : key; render(); });
  row.appendChild(main); row.appendChild(btn);
  item.appendChild(row);
  if (isOpen) {
    var bw = document.createElement("div");
    bw.className = "bubble-wrap";
    var to = document.createElement("span");
    to.className = "bubble-to"; to.textContent = "Mensaje para " + c.name + " (vista previa, no se manda de verdad)";
    var bb = document.createElement("div");
    bb.className = "bubble"; bb.textContent = receiptText(c, pay);
    var sent = !!receiptSent[key];
    var send = document.createElement("button");
    send.type = "button"; send.className = "btn-wa"; send.disabled = sent;
    send.textContent = sent ? "Enviado a WhatsApp ✓" : "Enviar al WhatsApp";
    send.addEventListener("click", function () { receiptSent[key] = true; render(); });
    bw.appendChild(to); bw.appendChild(bb); bw.appendChild(send);
    item.appendChild(bw);
  }
  return item;
}
function paymentsSection(c) {
  var wrap = document.createElement("div");
  wrap.className = "hist";
  var t = document.createElement("span");
  t.className = "menu-title"; t.textContent = "Pagos y recibos";
  wrap.appendChild(t);
  var list = payData[c.id] || [];
  if (!list.length) {
    var none = document.createElement("span");
    none.className = "menu-note"; none.textContent = "Todavía no hay pagos de este cliente.";
    wrap.appendChild(none);
    return wrap;
  }
  var ul = document.createElement("div");
  ul.className = "pay-list";
  list.forEach(function (pay, idx) { ul.appendChild(payItem(c, pay, idx, false)); });
  wrap.appendChild(ul);
  return wrap;
}

function money(n) { return "$ " + n.toLocaleString("es-UY"); }

function render() { renderPagos(); renderClientes(); }

// Pestaña Pagos: quién debe y el botón de registrar pago.
function renderPagos() {
  var list = document.getElementById("list");
  list.innerHTML = "";
  clients.forEach(function (c) {
    var paid = c.owes === 0;
    var li = document.createElement("li");
    li.className = paid ? "paid" : "";
    var row = document.createElement("div");
    row.className = "row";
    var info = document.createElement("div");
    info.className = "info plain";
    var name = document.createElement("span");
    name.className = "name"; name.textContent = c.name;
    var owes = document.createElement("span");
    owes.className = "owes"; owes.textContent = paid ? "Al día" : "Debe " + money(c.owes);
    info.appendChild(name); info.appendChild(owes);
    var btn = document.createElement("button");
    btn.type = "button"; btn.disabled = paid;
    btn.textContent = paid ? "Pagado ✓" : "Registrar pago";
    btn.addEventListener("click", function () { registerPayment(c); });
    row.appendChild(info); row.appendChild(btn);
    li.appendChild(row);
    list.appendChild(li);
  });
  document.getElementById("total").textContent = money(clients.reduce(function (s, c) { return s + c.owes; }, 0));
}

// Pestaña Clientes: menú de hoy y menú de toda la semana.
function renderClientes() {
  var list = document.getElementById("clientlist");
  list.innerHTML = "";
  clients.forEach(function (c) {
    var li = document.createElement("li");
    var isOpen = openId === c.id;
    li.className = isOpen ? "open" : "";
    var row = document.createElement("div");
    row.className = "row";
    var info = document.createElement("div");
    info.className = "info";
    info.tabIndex = 0;
    info.setAttribute("role", "button");
    info.setAttribute("aria-expanded", String(isOpen));
    function toggle() { openId = isOpen ? null : c.id; renderClientes(); }
    info.addEventListener("click", toggle);
    info.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
    var name = document.createElement("span");
    name.className = "name"; name.textContent = c.name;
    var chev = document.createElement("span");
    chev.className = "chev"; chev.textContent = "›";
    name.appendChild(chev);
    info.appendChild(name);
    if (c.address && c.address !== c.name) {
      var ad = document.createElement("span");
      ad.className = "addr"; ad.textContent = c.address;
      info.appendChild(ad);
    }
    var wk = document.createElement("span");
    wk.className = weekly[c.id] ? "weekly" : "owes-none";
    wk.textContent = weekly[c.id] ? "Toda la semana: " + menuName(weekly[c.id]) : "Sin pedido para la semana";
    info.appendChild(wk);
    row.appendChild(info);
    li.appendChild(row);
    if (isOpen) {
      var menu = document.createElement("div");
      menu.className = "menu";
      var t = document.createElement("span");
      t.className = "menu-title"; t.textContent = "Menú de hoy";
      var mn = document.createElement("span");
      mn.className = "menu-name"; mn.textContent = c.menu.name;
      var ul = document.createElement("ul");
      ul.className = "menu-items";
      c.menu.items.forEach(function (it) {
        var mi = document.createElement("li"); mi.textContent = it; ul.appendChild(mi);
      });
      var nt = document.createElement("span");
      nt.className = "menu-note"; nt.textContent = c.menu.note;
      menu.appendChild(t); menu.appendChild(mn); menu.appendChild(ul); menu.appendChild(nt);
      li.appendChild(menu);

      var pick = document.createElement("div");
      pick.className = "pick";
      var lbl = document.createElement("label");
      lbl.htmlFor = "week-" + c.id; lbl.textContent = "Menú de toda la semana";
      var sel = document.createElement("select");
      sel.id = "week-" + c.id;
      var none = document.createElement("option");
      none.value = ""; none.textContent = "Sin pedido para la semana";
      sel.appendChild(none);
      weekMenus().forEach(function (m) {
        var o = document.createElement("option");
        o.value = String(m.id); o.textContent = m.name;
        if (weekly[c.id] === m.id) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener("change", function () {
        call("PUT", "/clients/" + c.id + "/weekly", { menuId: sel.value ? Number(sel.value) : null });
      });
      pick.appendChild(lbl); pick.appendChild(sel);
      li.appendChild(pick);
      li.appendChild(ordersSection(c.id));

      var hist = document.createElement("div");
      hist.className = "hist";
      var ht = document.createElement("span");
      ht.className = "menu-title"; ht.textContent = "Historial de pedidos (Editar: elegís entre las 3 opciones)";
      var hl = document.createElement("ul");
      hl.className = "hist-list";
      (histData[c.id] || []).forEach(function (h, idx) {
        var hi = document.createElement("li");
        var d = document.createElement("span");
        d.className = "hist-day"; d.textContent = h[0];
        hi.appendChild(d);
        var isEditing = editing && editing.id === c.id && editing.idx === idx;
        if (isEditing) {
          var inp = document.createElement("select");
          inp.id = "hist-" + c.id + "-" + idx;
          inp.setAttribute("aria-label", "Menú del " + h[0]);
          var names = weekMenus().map(function (m) { return m.name; });
          if (names.indexOf(h[1]) === -1) {
            var prev = document.createElement("option");
            prev.value = h[1]; prev.textContent = h[1] + " (anterior)";
            inp.appendChild(prev);
          }
          names.forEach(function (n) {
            var o = document.createElement("option");
            o.value = n; o.textContent = n;
            inp.appendChild(o);
          });
          inp.value = h[1];
          var ok = document.createElement("button");
          ok.type = "button"; ok.textContent = "Guardar";
          function commit() {
            var v = inp.value.trim();
            editing = null;
            if (v) call("PUT", "/clients/" + c.id + "/history/" + encodeURIComponent(h[0]), { dish: v }); else renderClientes();
          }
          ok.addEventListener("click", commit);
          inp.addEventListener("keydown", function (e) {
            if (e.key === "Escape") { editing = null; renderClientes(); }
          });
          var no = document.createElement("button");
          no.type = "button"; no.className = "btn-ghost"; no.textContent = "Cancelar";
          no.addEventListener("click", function () { editing = null; renderClientes(); });
          hi.appendChild(inp); hi.appendChild(ok); hi.appendChild(no);
          setTimeout(function () { inp.focus(); }, 0);
        } else {
          var dish = document.createElement("span");
          dish.className = "hist-dish"; dish.textContent = h[1];
          var ed = document.createElement("button");
          ed.type = "button"; ed.className = "btn-ghost btn-small"; ed.textContent = "Editar";
          ed.addEventListener("click", function () { editing = { id: c.id, idx: idx }; renderClientes(); });
          hi.appendChild(dish); hi.appendChild(ed);
        }
        hl.appendChild(hi);
      });
      hist.appendChild(ht); hist.appendChild(hl);
      li.appendChild(hist);
      li.appendChild(paymentsSection(c));
    }
    list.appendChild(li);
  });
  renderSearch();
  renderHistorial();
  renderPanel();
}
document.getElementById("reset").addEventListener("click", function () {
  call("POST", "/reset");
});

/* ---- Pestañas y menús (solo visual, el envío a WhatsApp es de mentira) ---- */
function renderMenus() {
  var box = document.getElementById("menus");
  box.innerHTML = "";

  var bar = document.createElement("div");
  bar.className = "mcard active";
  var bt = document.createElement("span");
  bt.className = "mtitle";
  bt.textContent = "Opciones de esta semana: " + weekOptions.length + " de 3";
  var bn = document.createElement("span");
  bn.className = "mwho";
  bn.textContent = weekMenus().map(function (m) { return m.name; }).join(" · ") || "Todavía no elegiste ninguna";
  var wa = document.createElement("button");
  wa.type = "button"; wa.className = "btn-wa";
  wa.disabled = sentWeek || weekOptions.length !== 3;
  wa.textContent = sentWeek ? "Enviado a WhatsApp ✓" : weekOptions.length === 3 ? "Enviar las 3 opciones al WhatsApp" : "Elegí 3 opciones para enviar";
  wa.addEventListener("click", function () { sentWeek = true; renderMenus(); });
  bar.appendChild(bt); bar.appendChild(bn); bar.appendChild(wa);
  box.appendChild(bar);

  MENUS.forEach(function (m) {
    var inWeek = weekOptions.indexOf(m.id) !== -1;
    var card = document.createElement("div");
    card.className = "mcard" + (inWeek ? " active" : "");
    var head = document.createElement("div");
    head.className = "mhead";
    var title = document.createElement("span");
    title.className = "mtitle"; title.textContent = m.name;
    head.appendChild(title);
    if (inWeek) {
      var badge = document.createElement("span");
      badge.className = "mbadge"; badge.textContent = "Opción de la semana";
      head.appendChild(badge);
    }
    var ul = document.createElement("ul");
    ul.className = "menu-items";
    m.items.forEach(function (it) {
      var li = document.createElement("li"); li.textContent = it; ul.appendChild(li);
    });
    var who = clients.filter(function (c) { return weekly[c.id] === m.id; }).map(function (c) { return c.name; });
    var whoEl = document.createElement("span");
    whoEl.className = "mwho";
    whoEl.textContent = who.length ? "Lo pidieron toda la semana: " + who.join(", ") : "Nadie lo pidió para toda la semana";
    var actions = document.createElement("div");
    actions.className = "mactions";
    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "btn-ghost";
    if (inWeek) {
      btn.textContent = "Quitar de la semana";
      btn.addEventListener("click", function () {
        sentWeek = false;
        call("PUT", "/menus/" + m.id + "/week", { inWeek: false });
      });
    } else {
      var full = weekOptions.length >= 3;
      btn.disabled = full;
      btn.textContent = full ? "Ya hay 3 · quitá una primero" : "Agregar a la semana";
      btn.addEventListener("click", function () {
        sentWeek = false;
        call("PUT", "/menus/" + m.id + "/week", { inWeek: true });
      });
    }
    actions.appendChild(btn);
    card.appendChild(head); card.appendChild(ul); card.appendChild(whoEl); card.appendChild(actions);
    box.appendChild(card);
  });
}

/* ---- Buscador de clientes (arriba) ---- */
var searchOpenId = null;
function norm(t) { return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }

function renderSearch() {
  var box = document.getElementById("results");
  var q = norm(document.getElementById("search").value);
  box.innerHTML = "";
  if (!q) return;
  var found = clients.filter(function (c) { return norm(c.name).indexOf(q) !== -1 || norm(c.address).indexOf(q) !== -1; });
  if (!found.length) {
    var none = document.createElement("div");
    none.className = "empty"; none.textContent = "No hay clientes con ese nombre o calle.";
    box.appendChild(none);
    return;
  }
  found.forEach(function (c) {
    var isOpen = searchOpenId === c.id;
    var paid = c.owes === 0;
    var card = document.createElement("div");
    card.className = "mcard" + (isOpen ? " active" : "");
    var head = document.createElement("div");
    head.className = "info";
    head.tabIndex = 0;
    head.setAttribute("role", "button");
    head.setAttribute("aria-expanded", String(isOpen));
    function toggle() { searchOpenId = isOpen ? null : c.id; renderSearch(); }
    head.addEventListener("click", toggle);
    head.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
    var nm = document.createElement("span");
    nm.className = "name"; nm.textContent = c.name;
    var chev = document.createElement("span");
    chev.className = "chev"; chev.textContent = "›";
    nm.appendChild(chev);
    head.appendChild(nm);
    if (c.address && c.address !== c.name) {
      var ad = document.createElement("span");
      ad.className = "addr"; ad.textContent = c.address;
      head.appendChild(ad);
    }
    var st = document.createElement("span");
    st.className = "owes"; st.textContent = paid ? "Al día" : "Debe " + money(c.owes);
    if (paid) st.style.color = "var(--accent)";
    head.appendChild(st);
    card.appendChild(head);

    if (isOpen) {
      var d = document.createElement("div");
      d.className = "detail";

      var pay = document.createElement("div");
      pay.className = "row";
      var ps = document.createElement("span");
      ps.textContent = paid ? "Pagó todo" : "Todavía no pagó";
      ps.style.fontWeight = "700";
      var pb = document.createElement("button");
      pb.type = "button"; pb.disabled = paid;
      pb.textContent = paid ? "Pagado ✓" : "Registrar pago";
      pb.addEventListener("click", function () { registerPayment(c); });
      pay.appendChild(ps); pay.appendChild(pb);
      d.appendChild(pay);

      var wkT = document.createElement("div");
      wkT.className = "hist";
      var wt = document.createElement("span");
      wt.className = "menu-title"; wt.textContent = "Menú de toda la semana";
      var wv = document.createElement("span");
      wv.className = "menu-name";
      wv.textContent = weekly[c.id] ? menuName(weekly[c.id]) : "Sin pedido para la semana";
      wkT.appendChild(wt); wkT.appendChild(wv);
      d.appendChild(wkT);

      var h = document.createElement("div");
      h.className = "hist";
      var ht2 = document.createElement("span");
      ht2.className = "menu-title"; ht2.textContent = "Qué compró en la semana";
      var hl2 = document.createElement("ul");
      hl2.className = "hist-list";
      (histData[c.id] || []).forEach(function (row) {
        var li = document.createElement("li");
        var dd = document.createElement("span");
        dd.className = "hist-day"; dd.textContent = row[0];
        var dish = document.createElement("span");
        dish.className = "hist-dish"; dish.textContent = row[1];
        li.appendChild(dd); li.appendChild(dish);
        hl2.appendChild(li);
      });
      h.appendChild(ht2); h.appendChild(hl2);
      d.appendChild(h);
      d.appendChild(paymentsSection(c));

      var mt = document.createElement("div");
      mt.className = "hist";
      var mtt = document.createElement("span");
      mtt.className = "menu-title"; mtt.textContent = "Menú de hoy";
      var mtn = document.createElement("span");
      mtn.className = "menu-name"; mtn.textContent = c.menu.name;
      var mti = document.createElement("span");
      mti.className = "menu-note";
      mti.textContent = (c.menu.items.length ? c.menu.items.join(", ") + ". " : "") + c.menu.note;
      mt.appendChild(mtt); mt.appendChild(mtn); mt.appendChild(mti);
      d.appendChild(mt);

      card.appendChild(d);
    }
    box.appendChild(card);
  });
}
document.getElementById("search").addEventListener("input", function () { searchOpenId = null; renderSearch(); });

/* ---- Ingresar cliente ---- */
var addForm = document.getElementById("addform");
var addMsg = document.getElementById("addmsg");
document.getElementById("addtoggle").addEventListener("click", function () {
  addForm.hidden = !addForm.hidden;
  addMsg.hidden = true;
  if (!addForm.hidden) document.getElementById("add-name").focus();
});
document.getElementById("add-cancel").addEventListener("click", function () { addForm.hidden = true; });
addForm.addEventListener("submit", function (e) {
  e.preventDefault();
  var nameIn = document.getElementById("add-name");
  var addrIn = document.getElementById("add-addr");
  var err = document.getElementById("add-err");
  var name = nameIn.value.trim();
  var addr = addrIn.value.trim();
  if (!name && !addr) {
    err.textContent = "Poné al menos el nombre o la calle."; err.hidden = false; return;
  }
  err.hidden = true;
  var finalName = name || addr;
  call("POST", "/clients", { name: name, address: addr }).then(function () {
    nameIn.value = ""; addrIn.value = "";
    addForm.hidden = true;
    addMsg.textContent = "Cliente agregado: " + finalName + ". Ya lo podés buscar arriba.";
    addMsg.hidden = false;
  });
});

function showTab(which) {
  ["pedidos", "pagos", "menu", "clientes", "cocina", "historial", "panel"].forEach(function (t) {
    document.getElementById("pane-" + t).hidden = t !== which;
    document.getElementById("tab-" + t).setAttribute("aria-selected", String(t === which));
  });
  // el boton de la hamburguesa se marca cuando la seccion activa vive adentro
  document.getElementById("more-btn").setAttribute("aria-selected", String(which === "menu" || which === "historial" || which === "panel"));
  closeMore();
}
function closeMore() {
  document.getElementById("more-menu").hidden = true;
  document.getElementById("more-btn").setAttribute("aria-expanded", "false");
}
document.getElementById("more-btn").addEventListener("click", function (e) {
  e.stopPropagation();
  var menu = document.getElementById("more-menu");
  menu.hidden = !menu.hidden;
  this.setAttribute("aria-expanded", String(!menu.hidden));
});
document.addEventListener("click", closeMore);
document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMore(); });
document.getElementById("tab-historial").addEventListener("click", function () { showTab("historial"); });
document.getElementById("tab-panel").addEventListener("click", function () { showTab("panel"); });

/* ---- Panel de control: lo vendido (cobrado) del mes, ganancia, grafica de 7 dias y movimientos ---- */
var PROFIT = 0.3;
var MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
var DAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
var showAllMov = false;
var MOV_PREVIEW = 6;
var SVG_NS = "http://www.w3.org/2000/svg";

function parseDate(d) { var m = String(d).split("/"); return new Date(+m[2], +m[1] - 1, +m[0]); }
function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function svgEl(name, attrs) {
  var el = document.createElementNS(SVG_NS, name);
  Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, attrs[k]); });
  return el;
}
function smoothPath(pts) {
  var d = "M " + pts[0].x + " " + pts[0].y;
  for (var i = 0; i < pts.length - 1; i++) {
    var mid = (pts[i].x + pts[i + 1].x) / 2;
    d += " C " + mid + " " + pts[i].y + ", " + mid + " " + pts[i + 1].y + ", " + pts[i + 1].x + " " + pts[i + 1].y;
  }
  return d;
}

function renderPanel() {
  var now = new Date();
  var all = [];
  clients.forEach(function (c) {
    (payData[c.id] || []).forEach(function (p) { all.push({ c: c, pay: p, when: parseDate(p.date) }); });
  });

  // Mes actual
  var month = all.filter(function (r) { return r.when.getFullYear() === now.getFullYear() && r.when.getMonth() === now.getMonth(); });
  var sold = month.reduce(function (t, r) { return t + r.pay.amount; }, 0);
  document.getElementById("panel-month").textContent = MONTHS[now.getMonth()] + " " + now.getFullYear();
  document.getElementById("st-sold").textContent = money(sold);
  document.getElementById("st-count").textContent = month.length + " cobro" + (month.length === 1 ? "" : "s");
  document.getElementById("st-profit").textContent = money(Math.round(sold * PROFIT));
  var debtors = clients.filter(function (c) { return c.owes > 0; });
  document.getElementById("st-owed").textContent = money(clients.reduce(function (t, c) { return t + c.owes; }, 0));
  document.getElementById("st-owed-n").textContent = debtors.length + " cliente" + (debtors.length === 1 ? "" : "s");

  // Ultimos 7 dias
  var buckets = [];
  for (var i = 6; i >= 0; i--) {
    var day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    var total = all.filter(function (r) { return sameDay(r.when, day); }).reduce(function (t, r) { return t + r.pay.amount; }, 0);
    buckets.push({ label: i === 0 ? "Hoy" : DAY_SHORT[day.getDay()], total: total, isToday: i === 0 });
  }
  drawChart(buckets);

  // Movimientos del mes, del mas nuevo al mas viejo
  month.sort(function (a, b) { return b.when - a.when; });
  var toggle = document.getElementById("mov-toggle");
  toggle.hidden = month.length <= MOV_PREVIEW;
  toggle.textContent = showAllMov ? "Ver menos" : "Ver todos";
  var shown = showAllMov ? month : month.slice(0, MOV_PREVIEW);
  var box = document.getElementById("movlist");
  box.innerHTML = "";
  if (!shown.length) {
    var none = document.createElement("div");
    none.className = "empty"; none.textContent = "Todavía no hay cobros este mes.";
    box.appendChild(none);
    return;
  }
  shown.forEach(function (r) {
    var item = document.createElement("div");
    item.className = "pay-item";
    var row = document.createElement("div");
    row.className = "pay-row";
    var main = document.createElement("div");
    main.className = "pay-main";
    var nm = document.createElement("span");
    nm.className = "name"; nm.textContent = r.c.name;
    var meta = document.createElement("span");
    meta.className = "pay-meta"; meta.textContent = r.pay.date + " · " + r.pay.method;
    main.appendChild(nm); main.appendChild(meta);
    var am = document.createElement("span");
    am.className = "pay-amount"; am.textContent = money(r.pay.amount);
    row.appendChild(main); row.appendChild(am);
    item.appendChild(row);
    box.appendChild(item);
  });
}
document.getElementById("mov-toggle").addEventListener("click", function () { showAllMov = !showAllMov; renderPanel(); });

// Linea suave con area y puntos (mismo estilo que el grafico de la distribuidora).
function drawChart(buckets) {
  var W = 640, H = 230, PX = 34, PT = 42, PB = 34;
  var innerW = W - PX * 2, innerH = H - PT - PB;
  var max = Math.max.apply(null, buckets.map(function (b) { return b.total; }).concat([1]));
  var pts = buckets.map(function (b, i) {
    return { x: PX + (i / (buckets.length - 1)) * innerW, y: PT + innerH - (b.total / max) * innerH, b: b };
  });
  var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, class: "chart-svg", role: "img", "aria-label": "Ventas de los últimos 7 días" });
  [0, 0.25, 0.5, 0.75, 1].forEach(function (f) {
    var y = PT + innerH * f;
    svg.appendChild(svgEl("line", { x1: PX, y1: y, x2: W - PX, y2: y, class: "chart-grid" }));
  });
  var line = smoothPath(pts);
  var area = line + " L " + pts[pts.length - 1].x + " " + (PT + innerH) + " L " + pts[0].x + " " + (PT + innerH) + " Z";
  svg.appendChild(svgEl("path", { d: area, class: "chart-area" }));
  svg.appendChild(svgEl("path", { d: line, class: "chart-line" }));
  pts.forEach(function (p) {
    if (p.b.total > 0) {
      var v = svgEl("text", { x: p.x, y: p.y - 12, "text-anchor": "middle", class: "chart-value" });
      v.textContent = money(p.b.total);
      svg.appendChild(v);
    }
    var dot = svgEl("circle", { cx: p.x, cy: p.y, r: p.b.isToday ? 6 : 4.5, class: "chart-dot" });
    var tip = svgEl("title", {});
    tip.textContent = p.b.label + ": " + money(p.b.total);
    dot.appendChild(tip);
    svg.appendChild(dot);
    var lb = svgEl("text", { x: p.x, y: H - 10, "text-anchor": "middle", class: p.b.isToday ? "chart-label is-today" : "chart-label" });
    lb.textContent = p.b.label;
    svg.appendChild(lb);
  });
  var host = document.getElementById("chart");
  host.innerHTML = "";
  host.appendChild(svg);
}

/* ---- Pestaña Historial: todos los pagos, del más nuevo al más viejo ---- */
var histFilter = "";
function dateValue(d) { var m = String(d).split("/"); return new Date(+m[2], +m[1] - 1, +m[0]).getTime(); }
function renderHistorial() {
  var sel = document.getElementById("hist-filter");
  sel.innerHTML = "";
  var all = document.createElement("option");
  all.value = ""; all.textContent = "Todos los clientes";
  sel.appendChild(all);
  clients.forEach(function (c) {
    var o = document.createElement("option");
    o.value = String(c.id); o.textContent = c.name;
    sel.appendChild(o);
  });
  sel.value = histFilter;
  var rows = [];
  clients.forEach(function (c) {
    if (histFilter && String(c.id) !== histFilter) return;
    (payData[c.id] || []).forEach(function (pay, idx) { rows.push({ c: c, pay: pay, idx: idx }); });
  });
  rows.sort(function (a, b) { return dateValue(b.pay.date) - dateValue(a.pay.date) || a.idx - b.idx; });
  document.getElementById("paid-total").textContent = money(rows.reduce(function (t, r) { return t + r.pay.amount; }, 0));
  var box = document.getElementById("paylist");
  box.innerHTML = "";
  if (!rows.length) {
    var none = document.createElement("div");
    none.className = "empty"; none.textContent = "Todavía no hay pagos registrados.";
    box.appendChild(none);
    return;
  }
  rows.forEach(function (r) { box.appendChild(payItem(r.c, r.pay, r.idx, true)); });
}
document.getElementById("hist-filter").addEventListener("change", function () { histFilter = this.value; renderHistorial(); });
document.getElementById("tab-pagos").addEventListener("click", function () { showTab("pagos"); });
document.getElementById("tab-clientes").addEventListener("click", function () { showTab("clientes"); });
document.getElementById("tab-menu").addEventListener("click", function () { showTab("menu"); });
document.getElementById("tab-cocina").addEventListener("click", function () { showTab("cocina"); });
document.getElementById("tab-pedidos").addEventListener("click", function () { showTab("pedidos"); });
setupOrders({ api: api, applyState: applyState, money: money, showOrders: function () { showTab("pedidos"); } });
setStatus("Cargando datos... (si el servidor estaba dormido puede tardar unos segundos)");
fetch(API_BASE + "/santi/state")
  .then(function (res) { if (!res.ok) throw new Error("Error " + res.status); return res.json(); })
  .then(function (state) { applyState(state); setStatus(""); })
  .catch(function (e) { setStatus("No se pudo cargar: " + e.message + ". Probá recargar la página.", true); });
setupUpdates();
