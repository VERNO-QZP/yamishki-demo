(function () {
  "use strict";
  var FREE = 3000, PHONE = "+73492261199";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var NF = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 });
  var rub = function (n) { return NF.format(n); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 200); };
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  };
  var P = {
    plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="m5 12 5 5L20 7"/>', phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    bag: '<path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'
  };
  var ic = function (n) { return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">' + P[n] + "</svg>"; };

  /* ---------- opening hours (Салехард, UTC+5) ---------- */
  var sched = [["10:00", "22:00"], ["10:00", "22:00"], ["10:00", "22:00"], ["10:00", "22:00"], ["10:00", "22:30"], ["10:00", "22:30"], ["10:00", "22:00"]];
  var now = new Date(Date.now() + (new Date().getTimezoneOffset() + 300) * 60000);
  var di = (now.getDay() + 6) % 7, today = sched[di];
  var mins = function (t) { var a = t.split(":"); return +a[0] * 60 + +a[1]; };
  var cur = now.getHours() * 60 + now.getMinutes();
  var open = cur >= mins(today[0]) && cur < mins(today[1]);
  var st = $("#status");
  if (st) st.innerHTML = '<i class="dot ' + (open ? "" : "off") + '"></i>Салехард · ' + (open ? "Сегодня работаем до " + today[1] : "Сейчас закрыто, откроемся в " + today[0]);
  $$(".hours [data-day]").forEach(function (el) { if (+el.getAttribute("data-day") === di) el.classList.add("today"); });

  /* ---------- catalogue from prerendered cards ---------- */
  var items = {};
  $$(".card[data-id]").forEach(function (c) {
    var id = c.getAttribute("data-id");
    if (!items[id]) items[id] = { n: c.getAttribute("data-n"), p: +c.getAttribute("data-p"), m: c.getAttribute("data-m") || "", img: c.getAttribute("data-img"), k: c.getAttribute("data-k") || "", d: (($(".d", c) || {}).textContent || "") };
  });

  /* ---------- cart (snapshot so it works across pages) ---------- */
  var cart = store.get("ym_cart2", {});
  Object.keys(cart).forEach(function (id) {
    if (!cart[id] || !cart[id].q) delete cart[id];
    else if (items[id]) { cart[id].n = items[id].n; cart[id].p = items[id].p; cart[id].m = items[id].m; cart[id].img = items[id].img; }
  });
  var total = function () { return Object.keys(cart).reduce(function (s, id) { return s + cart[id].p * cart[id].q; }, 0); };
  var count = function () { return Object.keys(cart).reduce(function (s, id) { return s + cart[id].q; }, 0); };
  var qtyOf = function (id) { return cart[id] ? cart[id].q : 0; };

  function ctl(id, name) {
    var q = qtyOf(id);
    return q ? '<div class="qty"><button type="button" data-dec="' + id + '" aria-label="Убрать одну порцию: ' + esc(name) + '">' + ic("minus") + '</button><span aria-live="polite">' + q + '</span><button type="button" data-inc="' + id + '" aria-label="Добавить ещё: ' + esc(name) + '">' + ic("plus") + "</button></div>"
      : '<button type="button" class="add" data-inc="' + id + '" aria-label="Добавить в корзину: ' + esc(name) + '">' + ic("plus") + '<span class="t">В корзину</span></button>';
  }
  function refresh(id) {
    if (id) {
      $$('.card[data-id="' + id + '"] .ctl').forEach(function (el) { el.innerHTML = ctl(id, items[id] ? items[id].n : ""); });
      var m = $("#modal");
      if (m && m.classList.contains("on") && m.getAttribute("data-id") === id) $(".ctl", m).innerHTML = ctl(id, items[id].n);
    }
    var t = total(), c = count();
    $("#cartCnt").textContent = c;
    $("#cartSum").textContent = c ? rub(t) : "Корзина";
    $("#mSum").textContent = c ? "· " + rub(t) : "";
    if ($("#drawer").classList.contains("on") && view === "cart") renderCart();
    store.set("ym_cart2", cart);
  }
  function inc(id) {
    var it = items[id] || cart[id]; if (!it) return;
    if (!cart[id]) cart[id] = { n: it.n, p: it.p, m: it.m, img: it.img, q: 0 };
    cart[id].q++; refresh(id);
    if (cart[id].q === 1) toast("Добавлено: " + it.n);
  }
  function dec(id) { if (!cart[id]) return; cart[id].q--; if (!cart[id].q) delete cart[id]; refresh(id); }

  var tt;
  function toast(text, action, onAction) {
    var el = $("#toast");
    el.innerHTML = "<span>" + esc(text) + "</span>" + (action ? '<button type="button">' + esc(action) + "</button>" : "");
    if (action) $("button", el).onclick = function () { el.classList.remove("on"); onAction(); };
    el.classList.add("on"); clearTimeout(tt);
    tt = setTimeout(function () { el.classList.remove("on"); }, action ? 6000 : 1800);
  }

  /* ---------- dialogs: open/close, focus trap ---------- */
  var lastFocus = null, activeLayer = null;
  function openLayer(el) {
    lastFocus = document.activeElement; activeLayer = el;
    el.classList.add("on"); $("#ov").classList.add("on"); document.body.style.overflow = "hidden";
    var f = $(".x", el); if (f) f.focus({ preventScroll: true });
  }
  function closeAll() {
    if (!activeLayer) return;
    $("#modal").classList.remove("on"); $("#drawer").classList.remove("on"); $("#ov").classList.remove("on"); document.body.style.overflow = "";
    activeLayer = null;
    if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }
  document.addEventListener("keydown", function (e) {
    if (!activeLayer) return;
    if (e.key === "Escape") { closeAll(); return; }
    if (e.key !== "Tab") return;
    var f = $$('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])', activeLayer).filter(function (x) { return x.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  function openItem(id) {
    var i = items[id], m = $("#modal"); if (!i) return;
    m.setAttribute("data-id", id);
    var k = i.k ? i.k.match(/(\d+)\s*ккал.*?Б\s*([\d.,]+).*?Ж\s*([\d.,]+).*?У\s*([\d.,]+)/) : null;
    m.innerHTML = '<div class="mimg"><img src="' + i.img + '" width="640" height="480" alt="' + esc(i.n) + '"></div><div class="mb"><button type="button" class="x" data-close aria-label="Закрыть">' + ic("x") + '</button><h2 id="mTitle">' + esc(i.n) + '</h2><div class="meta">' + esc(i.m) + "</div>" + (i.d ? "<p>" + esc(i.d) + "</p>" : "") +
      (k ? '<div class="kbju" aria-label="Пищевая ценность"><span>' + k[1] + "&nbsp;ккал</span><span>Б&nbsp;" + k[2] + "&nbsp;г</span><span>Ж&nbsp;" + k[3] + "&nbsp;г</span><span>У&nbsp;" + k[4] + "&nbsp;г</span></div>" : "") +
      '<div class="ft"><span class="price">' + rub(i.p) + '</span><span class="ctl">' + ctl(id, i.n) + "</span></div></div>";
    openLayer(m);
  }

  /* ---------- cart drawer ---------- */
  var view = "cart", form = store.get("ym_form", { type: "delivery", pay: "cash" });
  function openCart() { view = "cart"; renderCart(); openLayer($("#drawer")); }
  function renderCart() {
    $("#dTitle").textContent = "Корзина";
    var ids = Object.keys(cart);
    if (!ids.length) {
      $("#dBody").innerHTML = '<div class="cart-empty"><svg viewBox="0 0 24 24" class="ico" aria-hidden="true" style="stroke-width:1.2">' + P.bag + '</svg><b>В корзине пока пусто</b><p class="note">Добавьте роллы, сеты или пиццу из меню.</p></div>';
      $("#dFoot").innerHTML = '<a class="btn btn-b" style="width:100%" href="/yamishki-demo/#menu" data-close>Перейти в меню</a>'; return;
    }
    var t = total(), left = Math.max(0, FREE - t);
    $("#dBody").innerHTML = '<div class="progress">' + (left ? "До бесплатной доставки — <b>" + rub(left) + "</b>" : "<b>Доставка по городу бесплатно</b>") + '<div class="bar"><i style="transform:scaleX(' + Math.min(1, t / FREE).toFixed(3) + ')"></i></div></div>' +
      ids.map(function (id) {
        var i = cart[id];
        return '<div class="ci"><img src="' + i.img + '" width="64" height="64" alt=""><div><b>' + esc(i.n) + '</b><div class="meta">' + esc(i.m) + '</div><div class="qty"><button type="button" data-dec="' + id + '" aria-label="Меньше: ' + esc(i.n) + '">' + ic("minus") + "</button><span>" + i.q + '</span><button type="button" data-inc="' + id + '" aria-label="Больше: ' + esc(i.n) + '">' + ic("plus") + '</button></div></div><span class="sum">' + rub(i.p * i.q) + "</span></div>";
      }).join("") + '<p class="note">К каждой порции роллов — соевый соус, имбирь и васаби. Дополнительные соусы — в разделе <a href="/yamishki-demo/menu/dopolnitelno/">«Соусы и добавки»</a>.</p>';
    $("#dFoot").innerHTML = '<div class="row"><span>Товары, ' + count() + " шт.</span><span>" + rub(t) + '</span></div><div class="row"><span>Доставка</span><span>' + (left ? "уточнит оператор" : "бесплатно") + '</span></div><div class="row total"><span>Итого</span><span>' + rub(t) + '</span></div><button type="button" class="btn btn-b" style="width:100%;margin-top:12px" id="toCheckout">Перейти к оформлению</button>';
    $("#toCheckout").onclick = renderCheckout;
  }
  function field(id, name, label, val, attrs) {
    return '<label for="' + id + '">' + label + '</label><input id="' + id + '" name="' + name + '" value="' + esc(val || "") + '" aria-describedby="' + id + 'Err" ' + (attrs || "") + '><p class="ferr" id="' + id + 'Err" hidden></p>';
  }
  function renderCheckout() {
    view = "checkout"; $("#dTitle").textContent = "Оформление заказа";
    var f = form;
    $("#dBody").innerHTML = '<form class="form" id="orderForm" novalidate>' +
      '<div class="seg" role="group" aria-label="Способ получения"><button type="button" data-seg="type" data-v="delivery" aria-pressed="' + (f.type !== "pickup") + '">Доставка</button><button type="button" data-seg="type" data-v="pickup" aria-pressed="' + (f.type === "pickup") + '">Самовывоз</button></div>' +
      field("fName", "name", "Имя", f.name, 'autocomplete="given-name" placeholder="Анна…"') +
      field("fPhone", "tel", "Телефон", f.phone, 'type="tel" inputmode="tel" autocomplete="tel" spellcheck="false" required placeholder="+7 912 345-67-89…"') +
      '<div id="addrBox"' + (f.type === "pickup" ? " hidden" : "") + ">" + field("fStreet", "street", "Улица и дом", f.street, 'autocomplete="address-line1" placeholder="ул. Республики, 73…"') +
      '<div class="four"><div>' + field("fApt", "apt", "Кв.", f.apt, 'inputmode="numeric" autocomplete="off"') + "</div><div>" + field("fEnt", "entrance", "Подъезд", f.ent, 'inputmode="numeric" autocomplete="off"') + "</div><div>" + field("fFloor", "floor", "Этаж", f.floor, 'inputmode="numeric" autocomplete="off"') + "</div><div>" + field("fCode", "intercom", "Домофон", f.code, 'autocomplete="off" spellcheck="false"') + "</div></div></div>" +
      '<p class="note" id="pickupNote"' + (f.type === "pickup" ? "" : " hidden") + ">Самовывоз: Салехард, ул. Матросова, 26.</p>" +
      '<label for="fWhen">Когда привезти</label><select id="fWhen" name="when"><option value="asap">Как можно скорее</option><option value="time"' + (f.when === "time" ? " selected" : "") + ">Ко времени (интервал 30 минут)</option></select>" +
      '<div id="timeBox"' + (f.when === "time" ? "" : " hidden") + ">" + field("fTime", "time", "Интервал", f.time, 'autocomplete="off" placeholder="18:00–18:30…"') + "</div>" +
      '<label id="payL">Оплата при получении</label><div class="seg" role="group" aria-labelledby="payL"><button type="button" data-seg="pay" data-v="cash" aria-pressed="' + (f.pay !== "card") + '">Наличными</button><button type="button" data-seg="pay" data-v="card" aria-pressed="' + (f.pay === "card") + '">Картой</button></div>' +
      '<div id="changeBox"' + (f.pay === "card" ? " hidden" : "") + ">" + field("fChange", "change", "С какой купюры нужна сдача", f.change, 'inputmode="numeric" autocomplete="off" placeholder="5000…"') + "</div>" +
      field("fPersons", "persons", "Количество персон", f.persons || 1, 'type="number" min="1" max="30" inputmode="numeric" autocomplete="off"') +
      '<label for="fComment">Комментарий</label><textarea id="fComment" name="comment" autocomplete="off" placeholder="Без лука, позвонить за 10 минут…"></textarea>' +
      '<label class="chk" for="fAgree"><input type="checkbox" id="fAgree" name="agree" aria-describedby="fAgreeErr"' + (f.agree ? " checked" : "") + '><span>Согласен на обработку персональных данных по <a href="/yamishki-demo/politika/" target="_blank">политике конфиденциальности</a></span></label><p class="ferr" id="fAgreeErr" hidden></p>' +
      "</form>";
    $("#dFoot").innerHTML = '<div class="row total"><span>К оплате</span><span>' + rub(total()) + '</span></div><button type="submit" form="orderForm" class="btn btn-b" style="width:100%;margin-top:12px">Отправить заказ</button><button type="button" class="btn btn-text" style="width:100%;margin-top:4px" id="backCart">Вернуться в корзину</button>';
    $$("[data-seg]").forEach(function (b) {
      b.onclick = function () {
        var key = b.getAttribute("data-seg"); f[key] = b.getAttribute("data-v");
        $$('[data-seg="' + key + '"]').forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
        $("#addrBox").hidden = f.type === "pickup"; $("#pickupNote").hidden = f.type !== "pickup"; $("#changeBox").hidden = f.pay === "card";
      };
    });
    $("#fWhen").onchange = function (e) { f.when = e.target.value; $("#timeBox").hidden = f.when !== "time"; };
    $("#backCart").onclick = function () { view = "cart"; renderCart(); };
    $("#orderForm").onsubmit = function (e) { e.preventDefault(); placeOrder(); };
    $("#orderForm").addEventListener("input", function (e) { if (e.target.getAttribute("aria-invalid") === "true") setErr(e.target.id, ""); });
  }
  function setErr(id, msg) {
    var el = $("#" + id), er = $("#" + id + "Err"); if (!el || !er) return;
    el.setAttribute("aria-invalid", msg ? "true" : "false"); er.textContent = msg; er.hidden = !msg;
  }
  function collect() {
    var g = function (id) { var el = $(id); return el ? el.value.trim() : ""; };
    ["name", "phone", "street", "apt", "ent", "floor", "code", "time", "change", "persons"].forEach(function (k) { form[k] = g("#f" + k.charAt(0).toUpperCase() + k.slice(1)); });
    form.comment = g("#fComment"); form.when = g("#fWhen"); form.agree = $("#fAgree").checked;
    var keep = {}; Object.keys(form).forEach(function (k) { if (k !== "comment") keep[k] = form[k]; });
    store.set("ym_form", keep);
  }
  function placeOrder() {
    collect(); var f = form, errs = [];
    ["fPhone", "fStreet", "fAgree"].forEach(function (id) { setErr(id, ""); });
    if (f.phone.replace(/\D/g, "").length < 10) errs.push(["fPhone", "Введите номер полностью, например +7 912 345-67-89."]);
    if (f.type !== "pickup" && !f.street) errs.push(["fStreet", "Укажите улицу и номер дома — без этого курьер не найдёт адрес."]);
    if (!f.agree) errs.push(["fAgree", "Отметьте согласие, чтобы мы могли принять заказ."]);
    if (errs.length) { errs.forEach(function (e) { setErr(e[0], e[1]); }); $("#" + errs[0][0]).focus(); return; }
    var t = total();
    var lines = Object.keys(cart).map(function (id) { var i = cart[id]; return "• " + i.n + " × " + i.q + " = " + rub(i.p * i.q); });
    var addr = [f.street, f.apt && "кв. " + f.apt, f.ent && "подъезд " + f.ent, f.floor && "этаж " + f.floor, f.code && "домофон " + f.code].filter(Boolean).join(", ");
    var text = ["Заказ с сайта — Японские Мишки", ""].concat(lines, ["", "Итого: " + rub(t) + (t >= FREE && f.type !== "pickup" ? " (доставка бесплатно)" : ""), "",
      "Имя: " + (f.name || "—"), "Телефон: " + f.phone, f.type === "pickup" ? "Самовывоз (Матросова, 26)" : "Адрес: " + addr,
      "Когда: " + (f.when === "time" ? (f.time || "ко времени") : "как можно скорее"),
      "Оплата: " + (f.pay === "card" ? "картой при получении" : "наличными" + (f.change ? ", сдача с " + f.change : "")),
      "Персон: " + (f.persons || 1)]).concat(f.comment ? ["Комментарий: " + f.comment] : []).join("\n");
    view = "done"; $("#dTitle").textContent = "Заказ собран";
    $("#dBody").innerHTML = '<div class="done-ic">' + ic("check") + '</div><p style="text-align:center;margin-bottom:14px">Позвоните нам или отправьте заказ сообщением — оператор подтвердит его и назовёт время доставки.</p><div class="order-text" id="oText">' + esc(text) + "</div>";
    $("#dFoot").innerHTML = '<div class="stack"><a class="btn btn-b" href="tel:' + PHONE + '">' + ic("phone") + 'Позвонить: 6-11-99</a><button type="button" class="btn btn-o" id="copyOrder">Скопировать текст заказа</button><a class="btn btn-o" href="https://vk.me/ya_mishki" target="_blank" rel="noopener" id="vkOrder">Отправить во ВКонтакте</a><button type="button" class="btn btn-text" id="newOrder">Очистить корзину</button></div>';
    var copy = function () {
      var done = function () { toast("Текст заказа скопирован"); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
      function fallback() { var r = document.createRange(); r.selectNodeContents($("#oText")); var s = getSelection(); s.removeAllRanges(); s.addRange(r); try { document.execCommand("copy"); done(); } catch (e) { } }
    };
    $("#copyOrder").onclick = copy; $("#vkOrder").addEventListener("click", copy);
    $("#newOrder").onclick = function () {
      var backup = JSON.parse(JSON.stringify(cart)), ids = Object.keys(cart);
      cart = {}; ids.forEach(refresh); refresh(); closeAll();
      toast("Корзина очищена", "Вернуть", function () { cart = backup; Object.keys(cart).forEach(refresh); refresh(); });
    };
  }

  /* ---------- scroll spy (home page) ---------- */
  var links = $$("#catbar a[data-sec]"), secEls = $$("#menu section.cat[data-sec]"), lastSec = null, bar = $("#catbar");
  function spy() {
    var id = null;
    for (var k = 0; k < secEls.length; k++) { if (secEls[k].getBoundingClientRect().top < 170) id = secEls[k].getAttribute("data-sec"); else break; }
    if (id === lastSec) return; lastSec = id;
    links.forEach(function (a) {
      var on = a.getAttribute("data-sec") === id; a.classList.toggle("on", on);
      if (on) bar.scrollTo({ left: a.offsetLeft - bar.clientWidth / 2 + a.clientWidth / 2, behavior: "smooth" });
    });
  }
  if (links.length && secEls.length > 1) {
    var ticking = false;
    addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; spy(); }); } }, { passive: true });
    idle(spy);
  }

  /* ---------- search (URL-synced ?q=) ---------- */
  var q = $("#q"), isHome = !!$("#menu"), index = null, loading = null;
  function loadIndex() {
    if (index) return Promise.resolve(index);
    if (!loading) loading = fetch("/yamishki-demo/assets/search.json").then(function (r) { return r.json(); }).then(function (d) { index = d; return d; });
    return loading;
  }
  function clientCard(i) {
    var badge = i.b === 1 ? '<span class="badge">Новинка</span>' : i.b === 2 ? '<span class="badge prem">Премиум</span>' : "";
    var img = "/yamishki-demo/img/menu/" + i.id + ".webp", sm = "/yamishki-demo/img/menu/sm/" + i.id + ".webp";
    if (!items[i.id]) items[i.id] = { n: i.n, p: i.p, m: i.m, img: img, k: i.k, d: i.d };
    return '<li><article class="card" data-id="' + i.id + '"><button type="button" class="ph" data-open="' + i.id + '" aria-label="Подробнее: ' + esc(i.n) + '"><img src="' + img + '" srcset="' + sm + " 320w, " + img + ' 640w" sizes="(max-width:820px) 50vw, (max-width:1100px) 33vw, 290px" width="640" height="480" loading="lazy" alt="' + esc(i.n) + '">' + badge + "</button>" +
      '<div class="bd"><h3><button type="button" data-open="' + i.id + '">' + esc(i.n) + "</button></h3>" + (i.m ? '<div class="meta">' + esc(i.m) + "</div>" : "") + (i.d ? '<p class="d">' + esc(i.d) + "</p>" : "") +
      '<div class="ft"><span class="price">' + rub(i.p) + '</span><span class="ctl">' + ctl(i.id, i.n) + "</span></div></div></article></li>";
  }
  var lastQ = "";
  function filter(raw) {
    var val = raw.trim().toLowerCase(); lastQ = val;
    try { var u = new URL(location.href); if (val) u.searchParams.set("q", raw.trim()); else u.searchParams.delete("q"); history.replaceState(null, "", u.pathname + u.search + u.hash); } catch (e) { }
    var res = $("#searchResults"), menu = $("#menu"), em = $("#emptySearch");
    if (!val) { res.hidden = true; menu.hidden = false; em.hidden = true; return; }
    loadIndex().then(function (idx) {
      if (val !== lastQ) return;
      var words = val.split(/\s+/);
      var found = idx.filter(function (i) { var t = (i.n + " " + i.d).toLowerCase(); return words.every(function (w) { return t.indexOf(w) >= 0; }); });
      $("#srTitle").textContent = found.length ? "Нашли " + found.length + " " + (found.length % 10 === 1 && found.length % 100 !== 11 ? "блюдо" : found.length % 10 >= 2 && found.length % 10 <= 4 && (found.length % 100 < 10 || found.length % 100 >= 20) ? "блюда" : "блюд") : "Результаты поиска";
      $("#srGrid").innerHTML = found.map(clientCard).join("");
      res.hidden = !found.length; menu.hidden = true; em.hidden = !!found.length;
    });
  }
  if (q) {
    if (isHome) {
      var deb;
      q.addEventListener("focus", loadIndex, { once: true });
      q.addEventListener("input", function () { clearTimeout(deb); deb = setTimeout(function () { filter(q.value); }, 120); });
      q.closest("form").addEventListener("submit", function (e) { e.preventDefault(); filter(q.value); });
      var pq = new URLSearchParams(location.search).get("q");
      if (pq) { q.value = pq; filter(pq); }
    } else {
      q.closest("form").addEventListener("submit", function (e) { if (!q.value.trim()) e.preventDefault(); });
    }
  }

  /* ---------- events ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-inc],[data-dec],[data-open],[data-close]"); if (!t) return;
    if (t.hasAttribute("data-inc")) { e.preventDefault(); inc(t.getAttribute("data-inc")); }
    else if (t.hasAttribute("data-dec")) { e.preventDefault(); dec(t.getAttribute("data-dec")); }
    else if (t.hasAttribute("data-open")) { e.preventDefault(); openItem(t.getAttribute("data-open")); }
    else if (t.hasAttribute("data-close")) { if (t.tagName !== "A") e.preventDefault(); closeAll(); }
  });
  $("#ov").onclick = closeAll;
  $("#cartBtn").onclick = openCart; $("#mCart").onclick = openCart;
  if (Object.keys(cart).length) { Object.keys(cart).forEach(function (id) { if (items[id]) refresh(id); }); refresh(); }
})();
