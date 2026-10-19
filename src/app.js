/* ProteinOrNot.in client script. No dependencies.
   - No forms collect data; the newsletter block is a static 'coming soon' note.
   - Homepage: filter, sort and search the server-rendered table; state lives in the URL. */
(function () {
  'use strict';

  var dataEl = document.getElementById('data');
  var table = document.getElementById('rank-table');
  var form = document.getElementById('filters');
  if (!dataEl || !table || !form) return;

  var products = JSON.parse(dataEl.textContent);
  var tbody = table.tBodies[0];
  var rows = {};
  Array.prototype.forEach.call(tbody.rows, function (r) { rows[r.getAttribute('data-id')] = r; });

  var SORTS = {
    inr: { key: 'inr_per_10g_protein', dir: 1, label: '₹ per 10 g protein (low to high)' },
    p100: { key: 'protein_per_100kcal', dir: -1, label: 'Protein per 100 kcal (high to low)' },
    price: { key: 'price_inr', dir: 1, label: 'Pack price (low to high)' },
    pserv: { key: 'protein_serving', dir: -1, label: 'Protein per serving (high to low)' }
  };
  var DEFAULT_SORT = 'inr';

  var el = {
    q: document.getElementById('f-q'),
    sort: document.getElementById('f-sort'),
    max: document.getElementById('f-max'),
    maxOut: document.getElementById('f-max-out'),
    store: document.getElementById('f-store'),
    more: document.getElementById('f-more'),
    active: document.getElementById('f-active'),
    count: document.getElementById('result-count'),
    caption: document.getElementById('rank-caption'),
    empty: document.getElementById('empty'),
    emptyReset: document.getElementById('empty-reset')
  };
  var priceCeil = Number(el.max.max);
  var cats = Array.prototype.slice.call(form.querySelectorAll('input[name="cat"]'));
  var diets = Array.prototype.slice.call(form.querySelectorAll('input[name="diet"]'));
  var isNum = function (n) { return typeof n === 'number' && isFinite(n); };
  // Products missing protein, kcal or price are listed after all ranked products.
  var ranked = function (p) { return isNum(p.protein_per_100kcal) && isNum(p.inr_per_10g_protein) && isNum(p.price_inr); };
  var fmtInr =function (n) { return '₹' + Number(n).toLocaleString('en-IN'); };

  /* ---------- state <-> URL <-> form */

  function readUrl() {
    var u = new URLSearchParams(location.search);
    var max = Number(u.get('max'));
    var sort = u.get('sort');
    return {
      q: u.get('q') || '',
      cat: (u.get('cat') || '').split(',').filter(Boolean),
      diet: u.get('diet') || '',
      max: isNum(max) && max > 0 && max < priceCeil ? max : null,
      store: u.get('store') || '',
      sort: SORTS[sort] ? sort : DEFAULT_SORT
    };
  }

  function writeForm(s) {
    el.q.value = s.q;
    el.sort.value = s.sort;
    cats.forEach(function (c) { c.checked = s.cat.indexOf(c.value) > -1; });
    diets.forEach(function (d) { d.checked = d.value === s.diet; });
    el.max.value = s.max == null ? priceCeil : s.max;
    var hasStore = Array.prototype.some.call(el.store.options, function (o) { return o.value === s.store; });
    el.store.value = hasStore ? s.store : '';
  }

  function readForm() {
    var max = Number(el.max.value);
    var diet = diets.filter(function (d) { return d.checked; })[0];
    return {
      q: el.q.value.trim(),
      cat: cats.filter(function (c) { return c.checked; }).map(function (c) { return c.value; }),
      diet: diet ? diet.value : '',
      max: max >= priceCeil ? null : max,
      store: el.store.value,
      sort: SORTS[el.sort.value] ? el.sort.value : DEFAULT_SORT
    };
  }

  function writeUrl(s) {
    var u = new URLSearchParams();
    if (s.q) u.set('q', s.q);
    if (s.cat.length) u.set('cat', s.cat.join(','));
    if (s.diet) u.set('diet', s.diet);
    if (s.max != null) u.set('max', String(s.max));
    if (s.store) u.set('store', s.store);
    if (s.sort !== DEFAULT_SORT) u.set('sort', s.sort);
    var qs = u.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
  }

  /* ---------- filter + sort */

  function matches(p, s) {
    if (s.cat.length && s.cat.indexOf(p.category) < 0) return false;
    if (s.diet && p.veg !== s.diet) return false;
    if (s.max != null && !(isNum(p.price_inr) && p.price_inr <= s.max)) return false;
    if (s.store && p.stores.indexOf(s.store) < 0) return false;
    if (s.q) {
      var hay = (p.brand + ' ' + p.name).toLowerCase();
      var words = s.q.toLowerCase().split(/\s+/);
      for (var i = 0; i < words.length; i++) if (hay.indexOf(words[i]) < 0) return false;
    }
    return true;
  }

  function compare(sortId) {
    var s = SORTS[sortId];
    return function (a, b) {
      if (ranked(a) !== ranked(b)) return ranked(a) ? -1 : 1;
      var av = a[s.key], bv = b[s.key], an = isNum(av), bn = isNum(bv);
      if (an !== bn) return an ? -1 : 1;
      if (an && av !== bv) return (av - bv) * s.dir;
      var ap = isNum(a.protein_per_100kcal) ? a.protein_per_100kcal : -1;
      var bp = isNum(b.protein_per_100kcal) ? b.protein_per_100kcal : -1;
      if (ap !== bp) return bp - ap;
      return (a.brand + ' ' + a.name).localeCompare(b.brand + ' ' + b.name);
    };
  }

  function apply(s) {
    var shown = products.filter(function (p) { return matches(p, s); }).sort(compare(s.sort));
    var shownIds = {};
    var frag = document.createDocumentFragment();
    shown.forEach(function (p, i) {
      var r = rows[p.id];
      if (!r) return;
      shownIds[p.id] = true;
      r.hidden = false;
      r.querySelector('.rank').textContent = i + 1;
      frag.appendChild(r);
    });
    products.forEach(function (p) {
      var r = rows[p.id];
      if (r && !shownIds[p.id]) { r.hidden = true; frag.appendChild(r); }
    });
    tbody.appendChild(frag);

    el.count.textContent = 'Showing ' + shown.length + ' of ' + products.length + ' products';
    el.empty.hidden = shown.length > 0;
    table.hidden = shown.length === 0;
    el.caption.textContent = 'Products sorted by ' + SORTS[s.sort].label;
    el.maxOut.textContent = s.max == null ? 'Any' : 'up to ' + fmtInr(s.max);

    table.querySelectorAll('th[aria-sort]').forEach(function (th) {
      var b = th.querySelector('[data-sort]');
      th.setAttribute('aria-sort', b && b.getAttribute('data-sort') === s.sort ? (SORTS[s.sort].dir === 1 ? 'ascending' : 'descending') : 'none');
    });

    var n = s.cat.length + (s.diet ? 1 : 0) + (s.max != null ? 1 : 0) + (s.store ? 1 : 0);
    el.active.textContent = n ? n + ' on' : '';
  }

  function update() {
    var s = readForm();
    apply(s);
    writeUrl(s);
  }

  /* ---------- wire up */

  var t;
  form.addEventListener('input', function (e) {
    if (e.target === el.q) { clearTimeout(t); t = setTimeout(update, 120); } else update();
  });
  form.addEventListener('change', update);
  form.addEventListener('submit', function (e) { e.preventDefault(); update(); });
  form.addEventListener('reset', function () { setTimeout(function () { writeForm(blank()); update(); }, 0); });
  el.emptyReset.addEventListener('click', function () { writeForm(blank()); update(); el.q.focus(); });

  table.querySelectorAll('.sort-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      el.sort.value = b.getAttribute('data-sort');
      update();
    });
  });

  function blank() { return { q: '', cat: [], diet: '', max: null, store: '', sort: DEFAULT_SORT }; }

  var initial = readUrl();
  writeForm(initial);
  // Open the filter drawer on wide screens, or when the shared link has filters set.
  var filtered = initial.cat.length || initial.diet || initial.max != null || initial.store;
  if (window.matchMedia('(min-width: 60em)').matches || filtered) el.more.open = true;
  apply(initial);
})();
