/* Systemisk Transformation – interaction: theme, menus, search, reading progress, reflection questions */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------- theme ---------- */
  var temaBtn = $('.tema-btn');
  if (temaBtn) temaBtn.addEventListener('click', function () {
    var dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    store('st-tema', root.dataset.theme);
  });

  /* ---------- chapters dropdown and mobile menu ---------- */
  var ddBtn = $('.dd-btn'), ddMenu = $('.dd-menu');
  function closeDd() { if (ddBtn) { ddBtn.setAttribute('aria-expanded', 'false'); ddMenu.classList.remove('open'); } }
  if (ddBtn) {
    ddBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = ddBtn.getAttribute('aria-expanded') !== 'true';
      ddBtn.setAttribute('aria-expanded', String(open)); ddMenu.classList.toggle('open', open);
      if (open) { var f = $('a', ddMenu); if (f) f.focus(); }
    });
    doc.addEventListener('click', function (e) { if (!e.target.closest('.dd')) closeDd(); });
  }
  var menyBtn = $('.meny-btn'), meny = $('#mobilmeny');
  if (menyBtn) menyBtn.addEventListener('click', function () {
    var open = meny.hidden;
    meny.hidden = !open; menyBtn.setAttribute('aria-expanded', String(open));
    doc.body.style.overflow = open ? 'hidden' : '';
  });

  /* ---------- reading progress and section highlight ---------- */
  var bar = $('.progress i'), text = $('.text');
  var tocLinks = $$('.sidtoc a[href^="#"]');
  var heads = tocLinks.map(function (a) { return doc.getElementById(decodeURIComponent(a.getAttribute('href').slice(1))); });
  var ticking = false;
  function onScroll() {
    ticking = false;
    if (bar && text) {
      var r = text.getBoundingClientRect(), h = r.height - innerHeight * 0.6;
      bar.style.width = Math.max(0, Math.min(100, -r.top / Math.max(1, h) * 100)) + '%';
    }
    if (heads.length) {
      var cur = -1;
      for (var i = 0; i < heads.length; i++) if (heads[i] && heads[i].getBoundingClientRect().top < 140) cur = i;
      tocLinks.forEach(function (a, k) { a.classList.toggle('aktiv', k === cur); });
    }
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  // keep the active TOC entry visible in a long sidebar
  var sidtoc = $('.sidtoc');
  if (sidtoc) addEventListener('scroll', function () {
    var a = $('.sidtoc a.aktiv');
    if (!a || innerWidth < 1000) return;
    var r = a.getBoundingClientRect(), s = sidtoc.getBoundingClientRect();
    if (r.top < s.top + 40 || r.bottom > s.bottom - 40) sidtoc.scrollTop += r.top - s.top - s.height / 3;
  }, { passive: true });
  // on small screens, close the TOC after choosing a section
  $$('.sidtoc a').forEach(function (a) { a.addEventListener('click', function () { if (innerWidth < 1000) { var d = a.closest('details'); if (d) d.open = false; } }); });
  if (innerWidth < 1000) $$('.sidtoc details').forEach(function (d) { d.open = false; });

  /* ---------- search ---------- */
  var sok = $('#sok'), sokIn = $('#sok-in'), sokRes = $('#sok-res'), sokInfo = $('#sok-info'), index = null, vald = -1;
  function norm(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/­/g, ''); }
  function openSok() {
    sok.hidden = false; doc.body.style.overflow = 'hidden'; sokIn.focus(); sokIn.select();
    if (!index) fetch('assets/search.json').then(function (r) { return r.json(); }).then(function (d) {
      index = d.map(function (e) { e.n = norm(e.t + ' ' + e.x); e.nt = norm(e.t); return e; }); runSok();
    }).catch(function () { sokInfo.textContent = 'Sökningen kunde inte laddas. Öppna webbplatsen via en webbserver.'; });
  }
  function closeSok() { sok.hidden = true; doc.body.style.overflow = ''; }
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function runSok() {
    if (!index) return;
    var q = norm(sokIn.value.trim());
    sokRes.innerHTML = ''; vald = -1;
    if (q.length < 2) { sokInfo.textContent = 'Skriv minst två tecken. Tryck / för att söka var som helst.'; return; }
    var words = q.split(/\s+/).filter(Boolean), hits = [];
    index.forEach(function (e) {
      var score = 0;
      for (var i = 0; i < words.length; i++) {
        var w = words[i], c = e.n.split(w).length - 1;
        if (!c) return;
        score += Math.min(c, 8) + (e.nt.indexOf(w) >= 0 ? 12 : 0);
      }
      if (e.n.indexOf(q) >= 0) score += 6;
      hits.push({ e: e, s: score });
    });
    hits.sort(function (a, b) { return b.s - a.s; });
    sokInfo.textContent = hits.length ? hits.length + (hits.length === 1 ? ' träff' : ' träffar') : 'Inga träffar för “' + sokIn.value.trim() + '”.';
    hits.slice(0, 40).forEach(function (h) {
      var x = h.e.x, nx = norm(x), p = nx.indexOf(words[0]), start = Math.max(0, p - 70);
      var snip = (start > 0 ? '…' : '') + x.slice(start, start + 200) + (start + 200 < x.length ? '…' : '');
      var hs = esc(snip);
      words.forEach(function (w) {
        var re = new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
        hs = hs.replace(re, '<mark>$1</mark>');
      });
      var li = doc.createElement('li');
      li.innerHTML = '<a href="' + h.e.u + '"><span class="r-s">' + esc(h.e.s) + '</span><span class="r-t">' + esc(h.e.t) + '</span><span class="r-x">' + hs + '</span></a>';
      sokRes.appendChild(li);
    });
  }
  if (sok) {
    $$('.sok-btn').forEach(function (b) { b.addEventListener('click', openSok); });
    $('.sok-stang').addEventListener('click', closeSok);
    sok.addEventListener('click', function (e) { if (e.target === sok) closeSok(); });
    sokIn.addEventListener('input', runSok);
    sokRes.addEventListener('click', function (e) { if (e.target.closest('a')) closeSok(); });
    sokIn.addEventListener('keydown', function (e) {
      var links = $$('a', sokRes);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); if (!links.length) return;
        vald = (vald + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
        links.forEach(function (a, i) { a.classList.toggle('vald', i === vald); });
        links[vald].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter' && links.length) { (links[vald >= 0 ? vald : 0]).click(); }
    });
  }
  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (sok && !sok.hidden) closeSok(); closeDd(); if (meny && !meny.hidden) menyBtn.click(); }
    if (e.key === '/' && sok && sok.hidden && !/input|textarea|select/i.test(doc.activeElement.tagName)) { e.preventDefault(); openSok(); }
  });

  /* ---------- reflection questions: ticks and notes, shared between pages ---------- */
  function key(id) { return 'st-fraga-' + id; }
  function load(id) { try { return JSON.parse(store(key(id)) || '{}'); } catch (e) { return {}; } }
  function save(id, d) { if (!d.klar && !d.not) store(key(id), null); else store(key(id), JSON.stringify(d)); }
  var stat = $('#rf-stat');
  function updStat() {
    if (!stat) return;
    var all = $$('.fraga[data-q]'), n = all.filter(function (li) { return li.classList.contains('klar'); }).length;
    stat.textContent = n + ' av ' + all.length + ' frågor reflekterade';
  }
  $$('.fraga[data-q]').forEach(function (li) {
    var id = li.dataset.q, d = load(id);
    var ui = doc.createElement('div'); ui.className = 'fraga-ui';
    ui.innerHTML = '<label class="bock"><input type="checkbox"> <span>Reflekterat</span></label>' +
      '<textarea class="anteckning" rows="2" placeholder="Mina anteckningar" aria-label="Mina anteckningar"></textarea>';
    li.appendChild(ui);
    var cb = $('input', ui), ta = $('textarea', ui);
    cb.checked = !!d.klar; ta.value = d.not || ''; li.classList.toggle('klar', cb.checked);
    cb.addEventListener('change', function () { var d2 = load(id); d2.klar = cb.checked; save(id, d2); li.classList.toggle('klar', cb.checked); updStat(); });
    var t; ta.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { var d2 = load(id); d2.not = ta.value; save(id, d2); }, 250); });
  });
  addEventListener('storage', function (e) {
    if (!e.key || e.key.indexOf('st-fraga-') !== 0) return;
    var id = e.key.slice(9), li = $('.fraga[data-q="' + id + '"]'); if (!li) return;
    var d = load(id); $('input', li).checked = !!d.klar; $('textarea', li).value = d.not || ''; li.classList.toggle('klar', !!d.klar); updStat();
  });
  updStat();
  var ner = $('#rf-ner');
  if (ner) ner.addEventListener('click', function () {
    var lines = ['Reflektionsfrågor – med mina anteckningar', 'Ur Forskarnas guide till Systemisk Transformation', ''];
    $$('.rf-kap').forEach(function (sec) {
      lines.push('', $('h2', sec).textContent.toUpperCase());
      $$('.rf-grp', sec).forEach(function (g) {
        lines.push('', $('h3', g).textContent.replace(/\s+/g, ' ').trim());
        $$('.fraga', g).forEach(function (li) {
          var d = load(li.dataset.q);
          lines.push((d.klar ? '[x] ' : '[ ] ') + $('.q', li).textContent);
          if (d.not) lines.push('    Mina anteckningar: ' + d.not.replace(/\n/g, '\n    '));
        });
      });
    });
    var blob = new Blob([lines.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' });
    var a = doc.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'reflektionsfragor-med-anteckningar.txt';
    doc.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  });
  var skriv = $('#rf-skriv');
  if (skriv) skriv.addEventListener('click', function () { print(); });

  /* ---------- copy buttons ---------- */
  $$('.kopiera').forEach(function (b) {
    b.addEventListener('click', function () {
      var el = doc.getElementById(b.dataset.copy), t = el.textContent.replace(/\s+/g, ' ').trim(), span = $('span', b), old = span.textContent;
      function done() { b.classList.add('ok'); span.textContent = 'Kopierad'; setTimeout(function () { b.classList.remove('ok'); span.textContent = old; }, 1800); }
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(done, fallback); else fallback();
      function fallback() {
        var ta = doc.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
        doc.body.appendChild(ta); ta.select(); try { doc.execCommand('copy'); done(); } catch (e) {} ta.remove();
      }
    });
  });

  /* ---------- cover replay ---------- */
  var spela = $('.omslag-spela'), omslag = $('.omslag');
  if (spela) spela.addEventListener('click', function () {
    omslag.classList.add('replay'); void omslag.offsetWidth; omslag.classList.remove('replay');
  });
})();
