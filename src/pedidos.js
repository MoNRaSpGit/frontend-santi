// Pedidos de viandas: "+ Nuevo pedido" (cliente + lo que lleva), la lista de
// pedidos, la vista "Cocina" y los precios (en Configuracion).
var DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

var ctx = null; // { api, applyState, money, showOrders }
var data = { clients: [], menus: [], orders: [], today: "", prices: { day: 0, week: 0 } };
var form = null; // null = cerrado
var saved = "";
var openOrderId = null;
var kitchenDay = "";

function el(tag, className, text) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function button(className, text, onClick) {
  var b = el("button", className, text);
  b.type = "button";
  if (onClick) b.addEventListener("click", onClick);
  return b;
}
function addDays(key, days) {
  return new Date(new Date(key + "T12:00:00Z").getTime() + days * 86400000).toISOString().slice(0, 10);
}
function weekdayOf(key) { return new Date(key + "T12:00:00Z").getUTCDay(); }
function shortDate(key) { return key.slice(8, 10) + "/" + key.slice(5, 7); }
function dayLabel(key) {
  if (key === data.today) return "Hoy";
  if (key === addDays(data.today, 1)) return "Mañana";
  return DAY_NAMES[weekdayOf(key)] + " " + shortDate(key);
}
// Los proximos 5 dias habiles (lunes a viernes) contando hoy.
function nextDays() {
  var result = [];
  for (var offset = 0; result.length < 5 && offset < 14; offset++) {
    var key = addDays(data.today, offset);
    var weekday = weekdayOf(key);
    if (weekday >= 1 && weekday <= 5) result.push(key);
  }
  return result;
}
function weekMenus() { return data.menus.filter(function (m) { return m.inWeek; }); }
function firstMenuId() { return weekMenus()[0] ? weekMenus()[0].id : null; }
function clientById(id) { return data.clients.filter(function (c) { return c.id === id; })[0]; }

function newForm(clientId) {
  var dayMenus = {};
  if (nextDays()[0]) dayMenus[nextDays()[0]] = firstMenuId();
  return {
    clientId: clientId || (data.clients[0] ? data.clients[0].id : "new"),
    newName: "", newAddress: "",
    kind: "dia", menuId: firstMenuId(), dayMenus: dayMenus,
    qty: 1, error: "", saving: false
  };
}
function selectedDays() {
  if (form.kind === "semanal") return nextDays().map(function (d) { return { date: d, menuId: form.menuId }; });
  return Object.keys(form.dayMenus).sort().map(function (d) { return { date: d, menuId: form.dayMenus[d] }; });
}
function totalFor(count, qty) {
  var unit = form.kind === "semanal" ? data.prices.week : data.prices.day * count;
  return unit * qty;
}

function menuSelect(value, onChange, label) {
  var sel = el("select");
  sel.setAttribute("aria-label", label);
  weekMenus().forEach(function (m) {
    var o = el("option", "", m.name); o.value = String(m.id);
    if (m.id === value) o.selected = true;
    sel.appendChild(o);
  });
  sel.addEventListener("change", function () { onChange(Number(sel.value)); });
  return sel;
}
function field(label, control) {
  var wrap = el("div", "f");
  wrap.appendChild(el("span", "menu-title", label));
  wrap.appendChild(control);
  return wrap;
}
function input(value, placeholder, onInput) {
  var node = el("input");
  node.type = "text"; node.value = value; node.placeholder = placeholder; node.autocomplete = "off";
  node.addEventListener("input", function () { onInput(node.value); });
  return node;
}
function change(mutate) { mutate(); form.error = ""; renderForm(); }

function renderForm() {
  var box = document.getElementById("orderbox");
  var toggle = document.getElementById("ordertoggle");
  box.innerHTML = "";
  toggle.hidden = !!form;
  document.getElementById("orderlist").hidden = !!form;
  document.querySelector("main > .search").hidden = !!form;
  document.getElementById("results").hidden = !!form;
  if (saved && !form) box.appendChild(el("span", "addmsg", saved));
  if (!form) return;

  var f = el("form", "orderform");

  var sel = el("select");
  sel.setAttribute("aria-label", "Cliente");
  data.clients.forEach(function (c) {
    var o = el("option", "", c.name); o.value = String(c.id); sel.appendChild(o);
  });
  var nw = el("option", "", "+ Cliente nuevo"); nw.value = "new"; sel.appendChild(nw);
  sel.value = String(form.clientId);
  sel.addEventListener("change", function () { change(function () { form.clientId = sel.value === "new" ? "new" : Number(sel.value); }); });
  f.appendChild(field("Cliente", sel));
  if (form.clientId === "new") {
    f.appendChild(field("Nombre", input(form.newName, "Ej: Marta", function (v) { form.newName = v; })));
    f.appendChild(field("Dirección", input(form.newAddress, "Ej: Colonia 455", function (v) { form.newAddress = v; })));
  }

  var kinds = el("div", "seg");
  [["semanal", "Semanal"], ["dia", "Por día"]].forEach(function (opt) {
    var b = button(form.kind === opt[0] ? "seg-btn is-on" : "seg-btn", opt[1], function () { change(function () { form.kind = opt[0]; }); });
    b.setAttribute("aria-pressed", String(form.kind === opt[0]));
    kinds.appendChild(b);
  });
  f.appendChild(kinds);

  if (form.kind === "semanal") {
    f.appendChild(field("Menú", menuSelect(form.menuId, function (id) { form.menuId = id; }, "Menú de la semana")));
  } else {
    var list = el("div", "daylist");
    nextDays().forEach(function (d) {
      var on = form.dayMenus[d] !== undefined;
      var row = el("div", "dayrow");
      var b = button(on ? "seg-btn is-on" : "seg-btn", dayLabel(d), function () {
        change(function () {
          if (on) delete form.dayMenus[d];
          else form.dayMenus[d] = firstMenuId();
        });
      });
      b.setAttribute("aria-pressed", String(on));
      row.appendChild(b);
      if (on) row.appendChild(menuSelect(form.dayMenus[d], function (id) { form.dayMenus[d] = id; }, "Menú: " + dayLabel(d)));
      list.appendChild(row);
    });
    f.appendChild(field("Días", list));
  }

  var stepper = el("div", "stepper");
  var minus = button("seg-btn", "−", function () { change(function () { form.qty = Math.max(1, form.qty - 1); }); });
  minus.setAttribute("aria-label", "Una vianda menos");
  var plus = button("seg-btn", "+", function () { change(function () { form.qty = Math.min(20, form.qty + 1); }); });
  plus.setAttribute("aria-label", "Una vianda más");
  stepper.appendChild(minus); stepper.appendChild(el("strong", "", String(form.qty))); stepper.appendChild(plus);
  f.appendChild(field("Viandas", stepper));

  if (form.error) f.appendChild(el("span", "err", form.error));
  var count = selectedDays().length;
  var acts = el("div", "mactions");
  var save = el("button", "order-cta", form.saving ? "Guardando…" : "Guardar" + (count ? " · " + ctx.money(totalFor(count, form.qty)) : ""));
  save.type = "submit"; save.disabled = form.saving;
  acts.appendChild(save);
  acts.appendChild(button("btn-ghost", "Cancelar", function () { form = null; renderForm(); }));
  f.appendChild(acts);
  f.addEventListener("submit", function (e) { e.preventDefault(); submit(); });
  f.insertBefore(el("span", "mtitle", "Nuevo pedido"), f.firstChild);
  box.appendChild(f);
}

function fail(message) { form.saving = false; form.error = message; renderForm(); }

function submit() {
  if (form.saving) return;
  var days = selectedDays();
  if (!days.length) return fail("Elegí al menos un día.");
  if (days.some(function (d) { return !d.menuId; })) return fail("Primero elegí los platos en Cocina.");
  var isNew = form.clientId === "new";
  if (isNew && !form.newName.trim() && !form.newAddress.trim()) return fail("Poné el nombre o la dirección.");

  var current = form;
  var total = totalFor(days.length, current.qty);
  current.saving = true; current.error = ""; renderForm();

  var clientReady = isNew
    ? ctx.api("POST", "/clients", { name: current.newName.trim(), address: current.newAddress.trim() }).then(function (state) {
        ctx.applyState(state);
        var created = state.clients.reduce(function (max, c) { return c.id > max.id ? c : max; }, state.clients[0]);
        current.clientId = created.id; // si falla el pedido, no se crea de nuevo
        return created.id;
      })
    : Promise.resolve(current.clientId);

  clientReady
    .then(function (clientId) {
      // Queda a cobrar: el pago se registra despues en la pestaña Pagos.
      var body = { clientId: clientId, kind: current.kind, qty: current.qty, total: total, payStatus: "debe", days: days };
      return ctx.api("POST", "/orders", body).then(function (state) {
        form = null;
        ctx.applyState(state);
        var number = state.orders.reduce(function (max, o) { return Math.max(max, o.orderId); }, 0);
        saved = "Pedido #" + number + " de " + clientById(clientId).name + " guardado ✓";
        renderForm();
      });
    })
    .catch(function (e) {
      if (form === current) fail("No se pudo guardar: " + e.message);
    });
}

function payLabel(status) { return status === "pagado" ? "Pagado" : status === "sena" ? "Con seña" : "Debe"; }

function groupOrders(rows) {
  var groups = {};
  rows.forEach(function (o) { (groups[o.orderId] = groups[o.orderId] || []).push(o); });
  return Object.keys(groups).map(Number).sort(function (a, b) { return b - a; }).map(function (id) { return groups[id]; });
}
// "Para hoy" / "Semanal" / "Hoy y 2 días más": el resumen corto del renglon.
function shortWhat(rows) {
  var first = rows[0];
  if (first.kind === "semanal") return "Semanal · " + first.menuName;
  var when = first.date === data.today ? "Para hoy" : dayLabel(first.date);
  return when + " · " + first.menuName + (rows.length > 1 ? " y " + (rows.length - 1) + (rows.length === 2 ? " día más" : " días más") : "");
}

// Lista de pedidos (el mas nuevo primero): renglon corto; al tocarlo se abre.
function renderOrderList() {
  var box = document.getElementById("orderlist");
  box.innerHTML = "";
  var groups = groupOrders(data.orders);
  if (!groups.length) {
    box.appendChild(el("div", "empty", "Todavía no hay pedidos."));
    return;
  }
  groups.forEach(function (rows) {
    var first = rows[0];
    var client = clientById(first.clientId);
    if (!client) return;
    var open = openOrderId === first.orderId;
    var item = el("div", open ? "order-card is-open" : "order-card");
    var head = button("order-head", undefined, function () {
      openOrderId = open ? null : first.orderId;
      renderOrderList();
    });
    head.setAttribute("aria-expanded", String(open));
    var main = el("span", "pay-main");
    main.appendChild(el("span", "name", "#" + first.orderId + " · " + client.name));
    main.appendChild(el("span", "pay-meta", shortWhat(rows)));
    var side = el("span", "side");
    side.appendChild(el("span", "pay-amount", ctx.money(first.total)));
    side.appendChild(el("span", "tag tag-" + first.payStatus, payLabel(first.payStatus)));
    head.appendChild(main); head.appendChild(side);
    item.appendChild(head);
    if (open) {
      var detail = el("div", "order-detail");
      detail.appendChild(el("span", "pay-meta", (first.kind === "semanal" ? "Menú semanal" : "Pedido por día") + " · " + first.qty + (first.qty === 1 ? " vianda" : " viandas") + (first.kind === "semanal" ? " por día" : "")));
      var days = el("ul", "hist-list");
      rows.forEach(function (o) {
        var li = el("li");
        li.appendChild(el("span", "hist-day", dayLabel(o.date)));
        li.appendChild(el("span", "hist-dish", o.menuName + (o.qty > 1 ? " ×" + o.qty : "")));
        days.appendChild(li);
      });
      detail.appendChild(days);
      if (client.address && client.address !== client.name) detail.appendChild(el("span", "pay-meta", client.address));
      item.appendChild(detail);
    }
    box.appendChild(item);
  });
}

// Numeros de los pedidos sin pagar de un cliente (para la pestaña Pagos).
export function unpaidOrders(clientId) {
  return groupOrders(data.orders.filter(function (o) { return o.clientId === clientId && o.payStatus !== "pagado"; }))
    .map(function (rows) { return rows[0].orderId; })
    .reverse();
}

function renderKitchen() {
  var box = document.getElementById("kitchen");
  box.innerHTML = "";
  var dates = data.orders.map(function (o) { return o.date; }).filter(function (d, i, all) { return d >= data.today && all.indexOf(d) === i; });
  if (!dates.length) {
    box.appendChild(el("div", "empty", "No hay pedidos."));
    return;
  }
  if (dates.indexOf(kitchenDay) === -1) kitchenDay = dates[0];

  var chips = el("div", "seg scroll");
  dates.forEach(function (d) {
    chips.appendChild(button(d === kitchenDay ? "seg-btn is-on" : "seg-btn", dayLabel(d), function () { kitchenDay = d; renderKitchen(); }));
  });
  box.appendChild(chips);

  var rows = data.orders.filter(function (o) { return o.date === kitchenDay; });
  var counts = {};
  var total = 0;
  rows.forEach(function (o) { counts[o.menuName] = (counts[o.menuName] || 0) + o.qty; total += o.qty; });

  var head = el("div", "total");
  head.appendChild(el("span", "", "Viandas"));
  head.appendChild(el("strong", "", String(total)));
  box.appendChild(head);

  var grid = el("div", "counts");
  Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).forEach(function (name) {
    var card = el("div", "count");
    card.appendChild(el("strong", "", String(counts[name])));
    card.appendChild(el("span", "", name));
    grid.appendChild(card);
  });
  box.appendChild(grid);

  var list = el("div", "pay-list");
  rows.forEach(function (o) {
    var client = clientById(o.clientId);
    if (!client) return;
    var item = el("div", "pay-item");
    var row = el("div", "pay-row");
    var main = el("div", "pay-main");
    main.appendChild(el("span", "name", client.name));
    if (client.address && client.address !== client.name) main.appendChild(el("span", "pay-meta", client.address));
    main.appendChild(el("span", "pay-meta", o.menuName + (o.note ? " · " + o.note : "")));
    row.appendChild(main); row.appendChild(el("span", "pay-amount", "×" + o.qty));
    item.appendChild(row);
    list.appendChild(item);
  });
  box.appendChild(list);
}

// Precios, en Configuracion.
function renderPrices() {
  var box = document.getElementById("prices");
  // Mientras se escribe no se redibuja (se perderia lo tipeado).
  if (box.contains(document.activeElement)) return;
  box.innerHTML = "";
  var f = el("form", "orderform");
  f.appendChild(el("span", "mtitle", "Precios"));
  function number(value) {
    var node = el("input");
    node.type = "number"; node.min = "1"; node.value = String(value); node.inputMode = "numeric";
    return node;
  }
  var day = number(data.prices.day);
  var week = number(data.prices.week);
  f.appendChild(field("Vianda por día ($)", day));
  f.appendChild(field("Semana completa ($)", week));
  var msg = el("span", "err", "");
  msg.hidden = true;
  var save = el("button", "", "Guardar precios");
  save.type = "submit";
  f.appendChild(msg); f.appendChild(save);
  f.addEventListener("submit", function (e) {
    e.preventDefault();
    var priceDay = Math.round(Number(day.value));
    var priceWeek = Math.round(Number(week.value));
    if (!(priceDay > 0 && priceWeek > 0)) { msg.textContent = "Poné los dos precios."; msg.hidden = false; return; }
    save.disabled = true; msg.hidden = true;
    ctx.api("PUT", "/settings", { priceDay: priceDay, priceWeek: priceWeek })
      .then(function (state) {
        document.activeElement.blur();
        ctx.applyState(state);
        var done = document.querySelector("#prices button[type=submit]");
        if (done) done.textContent = "Guardado ✓";
      })
      .catch(function (error) { save.disabled = false; msg.textContent = "No se pudo guardar: " + error.message; msg.hidden = false; });
  });
  box.appendChild(f);
}

// Seccion "Pedidos" dentro de la ficha del cliente.
export function ordersSection(clientId) {
  var wrap = el("div", "hist");
  wrap.appendChild(el("span", "menu-title", "Pedidos"));
  var rows = data.orders.filter(function (o) { return o.clientId === clientId; });
  if (rows.length) {
    var ul = el("ul", "hist-list");
    groupOrders(rows).forEach(function (group) {
      var li = el("li");
      li.appendChild(el("span", "hist-day", "#" + group[0].orderId));
      li.appendChild(el("span", "hist-dish", shortWhat(group) + " · " + ctx.money(group[0].total) + " · " + payLabel(group[0].payStatus)));
      ul.appendChild(li);
    });
    wrap.appendChild(ul);
  } else {
    wrap.appendChild(el("span", "menu-note", "Sin pedidos."));
  }
  wrap.appendChild(button("btn-small", "+ Nuevo pedido", function () {
    saved = "";
    form = newForm(clientId);
    ctx.showOrders();
    renderForm();
    document.getElementById("orderbox").scrollIntoView({ behavior: "smooth", block: "start" });
  }));
  return wrap;
}

export function setOrdersState(state) {
  data = { clients: state.clients, menus: state.menus, orders: state.orders || [], today: state.today || "", prices: state.prices || { day: 0, week: 0 } };
}
export function renderOrders() {
  // El formulario abierto no se redibuja con cada cambio de estado: se
  // perderia lo que se esta escribiendo.
  if (!form) renderForm();
  renderOrderList();
  renderKitchen();
  renderPrices();
}
export function setupOrders(context) {
  ctx = context;
  document.getElementById("ordertoggle").addEventListener("click", function () {
    if (!data.today) return;
    saved = "";
    form = newForm();
    renderForm();
  });
}
