import "./styles.css";

var KEY = "santi-cobros-v3";
var INITIAL = [
  { id: 1, name: "Juan", address: "Avenida 18 de Julio 1234", owes: 1500, menu: { name: "Milanesa completa", items: ["Milanesa de carne con huevo", "Papas fritas", "Ensalada mixta", "Flan casero"], note: "Sin cebolla" } },
  { id: 2, name: "María", address: "Bulevar Artigas 850", owes: 2300, menu: { name: "Menú vegetariano", items: ["Tarta de zapallitos", "Arroz con verduras", "Ensalada de rúcula", "Fruta de estación"], note: "Entregado 12:15" } },
  { id: 3, name: "Ana", address: "Calle Colonia 455", owes: 1500, menu: { name: "Pasta del día", items: ["Ñoquis con salsa fileto", "Pan de campo", "Ensalada de tomate", "Budín de pan"], note: "Salsa aparte" } },
  { id: 4, name: "Pedro", address: "Avenida Italia 2210", owes: 800, menu: { name: "Menú liviano", items: ["Pollo al horno", "Puré de calabaza", "Gelatina"], note: "Porción chica" } },
  { id: 5, name: "Lucía", address: "Calle Soriano 612", owes: 3200, menu: { name: "Parrillada para dos", items: ["Asado y chorizo", "Ensalada rusa", "Boniato al horno", "Dulce de leche con queso"], note: "Entregado 13:00" } }
];
var openId = null;

// Historial de lo que pidió cada cliente (de ejemplo): [día, plato].
var DEFAULT_HISTORY = {
  1: [["Lunes", "Pollo al horno con papas"], ["Martes", "Asado con ensalada"], ["Miércoles", "Ravioles con salsa fileto"], ["Jueves", "Milanesa con puré"], ["Viernes", "Pizza de muzzarella"]],
  2: [["Lunes", "Tarta de zapallitos"], ["Martes", "Arroz con verduras"], ["Miércoles", "Ensalada de rúcula y queso"], ["Jueves", "Ñoquis de calabaza"], ["Viernes", "Tortilla de espinaca"]],
  3: [["Lunes", "Ñoquis con fileto"], ["Martes", "Ravioles de ricota"], ["Miércoles", "Milanesa de pollo"], ["Jueves", "Tallarines con crema"], ["Viernes", "Pescado al horno"]],
  4: [["Lunes", "Pollo al horno"], ["Martes", "Puré de calabaza con carne"], ["Miércoles", "Sopa de verduras"], ["Jueves", "Arroz con pollo"], ["Viernes", "Gelatina y fruta"]],
  5: [["Lunes", "Parrillada para dos"], ["Martes", "Milanesa napolitana"], ["Miércoles", "Asado y chorizo"], ["Jueves", "Ravioles con crema"], ["Viernes", "Hamburguesa casera"]]
};
// El historial se puede editar y queda guardado en el navegador.
var HKEY = "santi-historial-v1";
var histData = loadHistory();
var editing = null;
function loadHistory() {
  try { var raw = localStorage.getItem(HKEY); if (raw) return JSON.parse(raw); } catch (e) {}
  return JSON.parse(JSON.stringify(DEFAULT_HISTORY));
}
function saveHistory() { try { localStorage.setItem(HKEY, JSON.stringify(histData)); } catch (e) {} }

var MENUS = [
  { id: 1, name: "Menú ravioli", items: ["Ravioles de ricota y espinaca", "Salsa fileto o crema", "Pan de campo", "Ensalada de tomate", "Flan casero"] },
  { id: 2, name: "Menú milanesas", items: ["Milanesa de carne o pollo", "Papas fritas o puré", "Ensalada mixta", "Fruta de estación"] },
  { id: 3, name: "Menú parrilla", items: ["Asado, chorizo y morcilla", "Ensalada rusa", "Boniato al horno", "Dulce de leche con queso"] },
  { id: 4, name: "Menú liviano", items: ["Pollo al horno", "Verduras salteadas", "Arroz integral", "Gelatina"] },
  { id: 5, name: "Menú pollo", items: ["Pollo a la cacerola", "Arroz con arvejas", "Ensalada de zanahoria", "Fruta de estación"] }
];
// Cada semana hay 3 opciones (ids de MENUS). Los clientes eligen entre estas 3.
var WOKEY = "santi-opciones-v1";
var weekOptions = loadWeekOptions();
var sentWeek = false;
function loadWeekOptions() {
  try { var raw = localStorage.getItem(WOKEY); if (raw) return JSON.parse(raw); } catch (e) {}
  return [1, 5, 2];
}
function saveWeekOptions() { try { localStorage.setItem(WOKEY, JSON.stringify(weekOptions)); } catch (e) {} }
function weekMenus() { return MENUS.filter(function (m) { return weekOptions.indexOf(m.id) !== -1; }); }

// Menú que cada cliente confirmó para toda la semana: { idCliente: idMenu }.
var WKEY = "santi-semana-v1";
var weekly = loadWeekly();
function loadWeekly() {
  try { var raw = localStorage.getItem(WKEY); if (raw) return JSON.parse(raw); } catch (e) {}
  return { 1: 1 };
}
function saveWeekly() { try { localStorage.setItem(WKEY, JSON.stringify(weekly)); } catch (e) {} }
function menuName(id) {
  for (var i = 0; i < MENUS.length; i++) if (MENUS[i].id === id) return MENUS[i].name;
  return "";
}
var clients = load();

// Pagos hechos por cada cliente: { idCliente: [{ date, amount, method }] }. Se guardan en el navegador.
var PKEY = "santi-pagos-v1";
var DEFAULT_PAYMENTS = {
  1: [{ date: "28/10/2026", amount: 1800, method: "Efectivo" }, { date: "21/10/2026", amount: 1500, method: "Transferencia" }],
  2: [{ date: "30/10/2026", amount: 2300, method: "Transferencia" }, { date: "23/10/2026", amount: 2300, method: "Transferencia" }],
  3: [{ date: "29/10/2026", amount: 1500, method: "Efectivo" }],
  4: [{ date: "27/10/2026", amount: 800, method: "Efectivo" }, { date: "20/10/2026", amount: 800, method: "Efectivo" }],
  5: [{ date: "31/10/2026", amount: 3200, method: "Transferencia" }]
};
var payData = loadPayments();
function loadPayments() {
  try { var raw = localStorage.getItem(PKEY); if (raw) return JSON.parse(raw); } catch (e) {}
  return JSON.parse(JSON.stringify(DEFAULT_PAYMENTS));
}
function savePayments() { try { localStorage.setItem(PKEY, JSON.stringify(payData)); } catch (e) {} }
function registerPayment(c) {
  if (c.owes <= 0) return;
  if (!payData[c.id]) payData[c.id] = [];
  payData[c.id].unshift({ date: new Date().toLocaleDateString("es-UY"), amount: c.owes, method: "Efectivo" });
  c.owes = 0;
  save(); savePayments(); render();
}

// Recibos por WhatsApp (ficticio: no abre WhatsApp ni manda nada).
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

function load() {
  try { var raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch (e) {}
  return INITIAL.map(function (c) { return Object.assign({}, c); });
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(clients)); } catch (e) {} }
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
        if (sel.value) weekly[c.id] = Number(sel.value); else delete weekly[c.id];
        saveWeekly(); renderClientes(); renderMenus();
      });
      pick.appendChild(lbl); pick.appendChild(sel);
      li.appendChild(pick);

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
            if (v) { histData[c.id][idx][1] = v; saveHistory(); }
            editing = null; renderClientes();
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
}
document.getElementById("reset").addEventListener("click", function () {
  clients = INITIAL.map(function (c) { return Object.assign({}, c); }); save(); render();
});
render();

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
        weekOptions = weekOptions.filter(function (id) { return id !== m.id; });
        Object.keys(weekly).forEach(function (k) { if (weekly[k] === m.id) delete weekly[k]; });
        sentWeek = false; saveWeekOptions(); saveWeekly(); renderMenus(); renderClientes();
      });
    } else {
      var full = weekOptions.length >= 3;
      btn.disabled = full;
      btn.textContent = full ? "Ya hay 3 · quitá una primero" : "Agregar a la semana";
      btn.addEventListener("click", function () {
        weekOptions.push(m.id);
        sentWeek = false; saveWeekOptions(); renderMenus(); renderClientes();
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
  var id = clients.reduce(function (m, c) { return Math.max(m, c.id); }, 0) + 1;
  var finalName = name || addr;
  clients.push({ id: id, name: finalName, address: addr, owes: 0, menu: { name: "Todavía sin menú hoy", items: [], note: "No se le mandó nada hoy" } });
  histData[id] = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"].map(function (d) { return [d, "Sin pedido"]; });
  save(); saveHistory();
  nameIn.value = ""; addrIn.value = "";
  addForm.hidden = true;
  addMsg.textContent = "Cliente agregado: " + finalName + ". Ya lo podés buscar arriba.";
  addMsg.hidden = false;
  render();
});

function showTab(which) {
  ["pagos", "menu", "clientes", "historial"].forEach(function (t) {
    document.getElementById("pane-" + t).hidden = t !== which;
    document.getElementById("tab-" + t).setAttribute("aria-selected", String(t === which));
  });
  // el boton de la hamburguesa se marca cuando la seccion activa vive adentro
  document.getElementById("more-btn").setAttribute("aria-selected", String(which === "menu"));
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
renderMenus();
