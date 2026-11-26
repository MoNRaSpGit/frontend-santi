// Pedidos de viandas: "+ Nuevo pedido" (semanal o por dia) y la vista
// "Cocina" (cuantas viandas de cada menu hay que preparar por dia).
var DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

var ctx = null; // { api, applyState, money }
var data = { clients: [], menus: [], orders: [], today: "", prices: { day: 0, week: 0 } };
var form = null; // null = cerrado
var confirmation = null;
var kitchenDay = "";

function el(tag, className, text) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function addDays(key, days) {
  return new Date(new Date(key + "T12:00:00Z").getTime() + days * 86400000).toISOString().slice(0, 10);
}
function weekdayOf(key) { return new Date(key + "T12:00:00Z").getUTCDay(); }
function shortDate(key) { return key.slice(8, 10) + "/" + key.slice(5, 7); }
function dayLabel(key) {
  if (key === data.today) return "Hoy " + shortDate(key);
  if (key === addDays(data.today, 1)) return "Mañana " + shortDate(key);
  return DAY_NAMES[weekdayOf(key)] + " " + shortDate(key);
}
// Dias habiles (lunes a viernes, desde hoy) de esta semana (0) o la proxima (1).
function weekDates(offset) {
  var monday = addDays(data.today, -((weekdayOf(data.today) + 6) % 7) + offset * 7);
  var result = [];
  for (var i = 0; i < 5; i++) {
    var key = addDays(monday, i);
    if (key >= data.today) result.push(key);
  }
  return result;
}
function weekMenus() { return data.menus.filter(function (m) { return m.inWeek; }); }
function clientById(id) { return data.clients.filter(function (c) { return c.id === id; })[0]; }

function newForm(clientId) {
  var week = weekDates(0).length ? 0 : 1;
  var menu = weekMenus()[0];
  var checked = {};
  weekDates(week).forEach(function (d) { checked[d] = true; });
  return {
    clientId: clientId || (data.clients[0] ? data.clients[0].id : "new"),
    newName: "", newAddress: "",
    kind: "semanal", week: week, menuId: menu ? menu.id : null,
    weekDays: checked, dayMenus: {},
    qty: 1, note: "", total: null, pay: "debe", sena: "", error: "", saving: false
  };
}

function selectedDays() {
  if (form.kind === "semanal") {
    return weekDates(form.week).filter(function (d) { return form.weekDays[d]; }).map(function (d) { return { date: d, menuId: form.menuId }; });
  }
  return Object.keys(form.dayMenus).sort().map(function (d) { return { date: d, menuId: form.dayMenus[d] }; });
}
function autoTotal() {
  var count = selectedDays().length;
  var unit = form.kind === "semanal" && count === 5 ? data.prices.week : data.prices.day * count;
  return unit * (Number(form.qty) || 0);
}
function currentTotal() { return form.total === null ? autoTotal() : Number(form.total) || 0; }

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
function segmented(options, value, onPick) {
  var box = el("div", "seg");
  options.forEach(function (opt) {
    var b = el("button", opt[0] === value ? "seg-btn is-on" : "seg-btn", opt[1]);
    b.type = "button";
    b.setAttribute("aria-pressed", String(opt[0] === value));
    b.addEventListener("click", function () { onPick(opt[0]); });
    box.appendChild(b);
  });
  return box;
}
function input(type, value, placeholder, onInput) {
  var node = el("input");
  node.type = type; node.value = value; node.placeholder = placeholder || ""; node.autocomplete = "off";
  node.addEventListener("input", function () { onInput(node.value); });
  return node;
}
function change(mutate) { mutate(); form.error = ""; renderForm(); }

function renderForm() {
  var box = document.getElementById("orderbox");
  var toggle = document.getElementById("ordertoggle");
  box.innerHTML = "";
  toggle.hidden = !!form;

  if (confirmation) {
    var done = el("div", "mcard active");
    done.appendChild(el("span", "mtitle", "Pedido guardado ✓"));
    done.appendChild(el("span", "bubble-to", "Mensaje para " + confirmation.name + " (vista previa, no se manda de verdad)"));
    done.appendChild(el("div", "bubble", confirmation.text));
    var actions = el("div", "mactions");
    var send = el("button", "btn-wa", confirmation.sent ? "Enviado a WhatsApp ✓" : "Enviar al WhatsApp");
    send.type = "button"; send.disabled = confirmation.sent;
    send.addEventListener("click", function () { confirmation.sent = true; renderForm(); });
    var close = el("button", "btn-ghost", "Listo");
    close.type = "button";
    close.addEventListener("click", function () { confirmation = null; renderForm(); });
    actions.appendChild(send); actions.appendChild(close);
    done.appendChild(actions);
    box.appendChild(done);
  }
  if (!form) return;

  var f = el("form", "orderform");
  f.appendChild(el("span", "mtitle", "Nuevo pedido"));

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
    f.appendChild(field("Nombre", input("text", form.newName, "Ej: Marta", function (v) { form.newName = v; })));
    f.appendChild(field("Dirección", input("text", form.newAddress, "Ej: Colonia 455", function (v) { form.newAddress = v; })));
  }

  f.appendChild(field("Tipo", segmented([["semanal", "Semanal"], ["dia", "Por día"]], form.kind, function (v) { change(function () { form.kind = v; form.total = null; }); })));

  if (form.kind === "semanal") {
    var weeks = [];
    if (weekDates(0).length) weeks.push([0, "Esta semana"]);
    weeks.push([1, "Próxima semana"]);
    f.appendChild(field("Semana", segmented(weeks, form.week, function (v) {
      change(function () {
        form.week = v; form.total = null; form.weekDays = {};
        weekDates(v).forEach(function (d) { form.weekDays[d] = true; });
      });
    })));
    f.appendChild(field("Menú", menuSelect(form.menuId, function (id) { form.menuId = id; }, "Menú de la semana")));
    var chips = el("div", "seg wrap");
    weekDates(form.week).forEach(function (d) {
      var b = el("button", form.weekDays[d] ? "seg-btn is-on" : "seg-btn", DAY_NAMES[weekdayOf(d)].slice(0, 3) + " " + shortDate(d));
      b.type = "button";
      b.setAttribute("aria-pressed", String(!!form.weekDays[d]));
      b.addEventListener("click", function () { change(function () { form.weekDays[d] = !form.weekDays[d]; form.total = null; }); });
      chips.appendChild(b);
    });
    f.appendChild(field("Días", chips));
  } else {
    var list = el("div", "daylist");
    weekDates(0).concat(weekDates(1)).forEach(function (d) {
      var on = form.dayMenus[d] !== undefined;
      var row = el("div", "dayrow");
      var b = el("button", on ? "seg-btn is-on" : "seg-btn", dayLabel(d));
      b.type = "button";
      b.setAttribute("aria-pressed", String(on));
      b.addEventListener("click", function () {
        change(function () {
          if (on) delete form.dayMenus[d];
          else form.dayMenus[d] = weekMenus()[0] ? weekMenus()[0].id : null;
          form.total = null;
        });
      });
      row.appendChild(b);
      if (on) row.appendChild(menuSelect(form.dayMenus[d], function (id) { form.dayMenus[d] = id; }, "Menú del " + dayLabel(d)));
      list.appendChild(row);
    });
    f.appendChild(field("Elegí los días y el menú de cada uno", list));
  }

  var totalInput, totalHint;
  function refreshTotal() { if (form.total === null) totalInput.value = String(autoTotal()); }
  var qty = input("number", String(form.qty), "", function (v) { form.qty = v; form.total = null; refreshTotal(); });
  qty.min = "1"; qty.max = "20";
  f.appendChild(field("Viandas por día", qty));
  f.appendChild(field("Nota", input("text", form.note, "Ej: sin cebolla", function (v) { form.note = v; })));
  totalInput = input("number", String(currentTotal()), "", function (v) { form.total = v; });
  totalInput.min = "0";
  var totalField = field("Precio total ($)", totalInput);
  totalHint = el("span", "menu-note", "Se calcula solo: " + ctx.money(data.prices.day) + " por vianda, o " + ctx.money(data.prices.week) + " la semana completa. Podés cambiarlo.");
  totalField.appendChild(totalHint);
  f.appendChild(totalField);

  f.appendChild(field("Cobro", segmented([["pagado", "Pagó"], ["debe", "Debe"], ["sena", "Seña"]], form.pay, function (v) { change(function () { form.pay = v; }); })));
  if (form.pay === "sena") {
    f.appendChild(field("¿Cuánto dejó de seña? ($)", input("number", form.sena, "Ej: 500", function (v) { form.sena = v; })));
  }

  if (form.error) f.appendChild(el("span", "err", form.error));
  var acts = el("div", "mactions");
  var save = el("button", "", form.saving ? "Guardando…" : "Guardar pedido");
  save.type = "submit"; save.disabled = form.saving;
  var cancel = el("button", "btn-ghost", "Cancelar");
  cancel.type = "button";
  cancel.addEventListener("click", function () { form = null; renderForm(); });
  acts.appendChild(save); acts.appendChild(cancel);
  f.appendChild(acts);
  f.addEventListener("submit", function (e) { e.preventDefault(); submit(); });
  box.appendChild(f);
}

function fail(message) { form.saving = false; form.error = message; renderForm(); }

function submit() {
  if (form.saving) return;
  var days = selectedDays();
  if (!days.length) return fail("Elegí al menos un día.");
  if (days.some(function (d) { return !d.menuId; })) return fail("Elegí un menú.");
  var qty = Number(form.qty);
  if (!(qty >= 1 && qty <= 20 && Math.floor(qty) === qty)) return fail("Las viandas por día van de 1 a 20.");
  var total = Math.round(currentTotal());
  var sena = Math.round(Number(form.sena) || 0);
  if (form.pay === "sena" && !(sena > 0 && sena < total)) return fail("La seña tiene que ser mayor que 0 y menor que el total.");
  var isNew = form.clientId === "new";
  if (isNew && !form.newName.trim() && !form.newAddress.trim()) return fail("Poné el nombre o la dirección del cliente nuevo.");

  var current = form;
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
      var body = { clientId: clientId, kind: current.kind, qty: qty, total: total, payStatus: current.pay, note: current.note.trim(), days: days };
      if (current.pay === "sena") body.paidAmount = sena;
      return ctx.api("POST", "/orders", body).then(function (state) {
        form = null;
        ctx.applyState(state);
        var client = clientById(clientId);
        var lines = days.map(function (d) {
          var menu = data.menus.filter(function (m) { return m.id === d.menuId; })[0];
          return "• " + dayLabel(d.date) + ": " + (menu ? menu.name : "") + (qty > 1 ? " x" + qty : "");
        });
        var pay = current.pay === "pagado" ? "Ya está pago." : current.pay === "sena" ? "Dejaste " + ctx.money(sena) + ", queda " + ctx.money(total - sena) + "." : "Queda pendiente de pago.";
        confirmation = {
          name: client.name,
          sent: false,
          text: "Hola " + client.name + ", tu pedido quedó anotado:\n" + lines.join("\n") + "\nTotal: " + ctx.money(total) + ". " + pay + "\nSanti"
        };
        renderForm();
        document.getElementById("orderbox").scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    })
    .catch(function (e) {
      if (form === current) fail("No se pudo guardar: " + e.message);
    });
}

function payLabel(status) { return status === "pagado" ? "Pagado" : status === "sena" ? "Con seña" : "Debe"; }

function renderKitchen() {
  var box = document.getElementById("kitchen");
  box.innerHTML = "";
  var dates = data.orders.map(function (o) { return o.date; }).filter(function (d, i, all) { return all.indexOf(d) === i; });
  if (!dates.length) {
    box.appendChild(el("div", "empty", "Todavía no hay pedidos. Cargá uno con “+ Nuevo pedido”."));
    return;
  }
  if (dates.indexOf(kitchenDay) === -1) kitchenDay = dates[0];

  var chips = el("div", "seg scroll");
  dates.forEach(function (d) {
    var b = el("button", d === kitchenDay ? "seg-btn is-on" : "seg-btn", dayLabel(d));
    b.type = "button";
    b.addEventListener("click", function () { kitchenDay = d; renderKitchen(); });
    chips.appendChild(b);
  });
  box.appendChild(chips);

  var rows = data.orders.filter(function (o) { return o.date === kitchenDay; });
  var counts = {};
  var total = 0;
  rows.forEach(function (o) { counts[o.menuName] = (counts[o.menuName] || 0) + o.qty; total += o.qty; });

  var head = el("div", "total");
  head.appendChild(el("span", "", "Viandas a preparar"));
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

  box.appendChild(el("h3", "chart-title", "Entregas"));
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
    var side = el("div", "side");
    side.appendChild(el("span", "pay-amount", "x" + o.qty));
    side.appendChild(el("span", "tag tag-" + o.payStatus, payLabel(o.payStatus)));
    row.appendChild(main); row.appendChild(side);
    item.appendChild(row);
    list.appendChild(item);
  });
  box.appendChild(list);
}

// Pestaña Pedidos: todos los pedidos con entregas pendientes, el mas nuevo
// primero, con sus dias, total y estado de cobro.
function renderOrderList() {
  var box = document.getElementById("orderlist");
  box.innerHTML = "";
  var groups = {};
  data.orders.forEach(function (o) { (groups[o.orderId] = groups[o.orderId] || []).push(o); });
  var ids = Object.keys(groups).map(Number).sort(function (a, b) { return b - a; });
  if (!ids.length) {
    box.appendChild(el("div", "empty", "Todavía no hay pedidos. Cargá el primero con “+ Nuevo pedido”."));
    return;
  }
  ids.forEach(function (id) {
    var rows = groups[id];
    var first = rows[0];
    var client = clientById(first.clientId);
    if (!client) return;
    var item = el("div", "order-card");
    var head = el("div", "pay-row");
    var main = el("div", "pay-main");
    main.appendChild(el("span", "name", client.name));
    main.appendChild(el("span", "pay-meta", (first.kind === "semanal" ? "Semanal" : "Por día") + " · " + first.qty + (first.qty === 1 ? " vianda" : " viandas") + " por día"));
    var side = el("div", "side");
    side.appendChild(el("span", "pay-amount", ctx.money(first.total)));
    side.appendChild(el("span", "tag tag-" + first.payStatus, payLabel(first.payStatus)));
    head.appendChild(main); head.appendChild(side);
    item.appendChild(head);
    var days = el("ul", "hist-list");
    rows.forEach(function (o) {
      var li = el("li");
      li.appendChild(el("span", "hist-day", dayLabel(o.date)));
      li.appendChild(el("span", "hist-dish", o.menuName));
      days.appendChild(li);
    });
    item.appendChild(days);
    if (first.note) item.appendChild(el("span", "menu-note", "Nota: " + first.note));
    box.appendChild(item);
  });
}

// Seccion "Pedidos que vienen" dentro de la ficha del cliente.
export function ordersSection(clientId) {
  var wrap = el("div", "hist");
  wrap.appendChild(el("span", "menu-title", "Pedidos que vienen"));
  var rows = data.orders.filter(function (o) { return o.clientId === clientId; });
  if (!rows.length) wrap.appendChild(el("span", "menu-note", "No tiene pedidos cargados."));
  else {
    var ul = el("ul", "hist-list");
    rows.forEach(function (o) {
      var li = el("li");
      li.appendChild(el("span", "hist-day", dayLabel(o.date)));
      li.appendChild(el("span", "hist-dish", o.menuName + (o.qty > 1 ? " x" + o.qty : "")));
      ul.appendChild(li);
    });
    wrap.appendChild(ul);
  }
  var add = el("button", "btn-small", "+ Pedido para este cliente");
  add.type = "button";
  add.addEventListener("click", function () {
    confirmation = null;
    form = newForm(clientId);
    ctx.showOrders();
    renderForm();
    document.getElementById("orderbox").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  wrap.appendChild(add);
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
}
export function setupOrders(context) {
  ctx = context;
  document.getElementById("ordertoggle").addEventListener("click", function () {
    if (!data.today) return;
    confirmation = null;
    form = newForm();
    renderForm();
  });
}
