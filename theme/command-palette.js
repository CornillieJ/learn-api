// Command palette: Ctrl/Cmd+K opens a fuzzy search over chapter titles (read
// from the sidebar, which is already in the page once mdBook's own toc.js has
// run), the current page's h2/h3 headings, and any glossary terms
// (`dfn[data-def]`) on the current page. Enter jumps: to another chapter, to
// a heading on this page, or to a glossary term (scrolled into view and
// opened, the same popover `glossary.js` already wires on click).
//
// Global, no authored markup: nothing to add to a page to get this.
(function () {
  // Pure: how well `query` matches `text`. Higher is better; null means no
  // match. An exact substring always outranks a scattered subsequence match,
  // and within subsequence matches, consecutive characters score higher than
  // scattered ones.
  function fuzzyScore(query, text) {
    query = String(query == null ? '' : query).trim().toLowerCase();
    text = String(text == null ? '' : text);
    if (!query) return 0;
    var hay = text.toLowerCase();
    var sub = hay.indexOf(query);
    if (sub !== -1) return 1000 - sub;
    var qi = 0, score = 0, lastPos = -2;
    for (var i = 0; i < hay.length && qi < query.length; i++) {
      if (hay[i] !== query[qi]) continue;
      score += (lastPos === i - 1) ? 5 : 1;
      lastPos = i;
      qi++;
    }
    return qi === query.length ? score : null;
  }

  // Pure: items (each with a `title`) -> the matching ones, best first,
  // capped at `limit`. An empty query returns the first `limit` items as-is
  // (the palette's "nothing typed yet" view).
  function filterItems(items, query, limit) {
    items = items || [];
    limit = limit || 50;
    query = String(query == null ? '' : query).trim();
    if (!query) return items.slice(0, limit);
    var scored = [];
    for (var i = 0; i < items.length; i++) {
      var score = fuzzyScore(query, items[i].title);
      if (score != null) scored.push({ item: items[i], score: score, i: i });
    }
    scored.sort(function (a, b) { return b.score - a.score || a.i - b.i; });
    return scored.slice(0, limit).map(function (s) { return s.item; });
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  var KIND_LABEL = { chapter: 'Chapter', heading: 'On this page', term: 'Glossary' };

  function collectItems() {
    var items = [];
    document.querySelectorAll('#mdbook-sidebar a[href]').forEach(function (a) {
      var title = a.textContent.replace(/\s+/g, ' ').trim();
      if (!title || !a.getAttribute('href')) return;
      items.push({ kind: 'chapter', title: title, href: a.getAttribute('href') });
    });
    var main = document.querySelector('#mdbook-content main') || document.querySelector('main');
    if (main) {
      main.querySelectorAll('h2[id], h3[id]').forEach(function (h) {
        items.push({ kind: 'heading', title: h.textContent.replace(/\s+/g, ' ').trim(), id: h.id });
      });
      main.querySelectorAll('dfn[data-def]').forEach(function (d) {
        if (!d.id) d.id = 'cp-term-' + Math.random().toString(36).slice(2);
        items.push({ kind: 'term', title: d.textContent.replace(/\s+/g, ' ').trim(), id: d.id });
      });
    }
    return items;
  }

  function buildUI() {
    var overlay = document.createElement('div');
    overlay.className = 'cp-overlay';
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="cp-modal" role="dialog" aria-modal="true" aria-label="Command palette">' +
      '<input class="cp-input" type="text" placeholder="Jump to a chapter, heading, or term…" aria-label="Search" autocomplete="off">' +
      '<ul class="cp-results" role="listbox"></ul>' +
      '</div>';
    document.body.appendChild(overlay);
    return overlay;
  }

  function wire() {
    var overlay = null, input = null, list = null, items = null, active = -1, shown = [];

    function render() {
      list.innerHTML = shown.map(function (item, i) {
        return '<li class="cp-result' + (i === active ? ' cp-active' : '') + '" role="option" aria-selected="' +
          (i === active ? 'true' : 'false') + '" data-i="' + i + '">' +
          '<span class="cp-title">' + escapeHtml(item.title) + '</span>' +
          '<span class="cp-kind">' + KIND_LABEL[item.kind] + '</span></li>';
      }).join('');
      var activeEl = list.querySelector('.cp-active');
      if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
    }

    function setQuery(q) {
      shown = filterItems(items, q, 50);
      active = shown.length ? 0 : -1;
      render();
    }

    function close() {
      if (!overlay || overlay.hidden) return;
      overlay.hidden = true;
      input.value = '';
    }

    function activate(i) {
      var item = shown[i];
      if (!item) return;
      close();
      if (item.kind === 'chapter') {
        window.location.href = item.href;
        return;
      }
      var el = document.getElementById(item.id);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (item.kind === 'term') {
        setTimeout(function () { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); }, 300);
      } else {
        el.classList.add('cp-flash');
        setTimeout(function () { el.classList.remove('cp-flash'); }, 1200);
      }
    }

    function open() {
      if (!overlay) overlay = buildUI();
      input = overlay.querySelector('.cp-input');
      list = overlay.querySelector('.cp-results');
      items = collectItems();
      overlay.hidden = false;
      setQuery('');
      input.focus();
    }

    function toggle() {
      if (overlay && !overlay.hidden) close(); else open();
    }

    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle();
        return;
      }
      if (!overlay || overlay.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); }
    });

    document.addEventListener('input', function (e) {
      if (!overlay || overlay.hidden || e.target !== input) return;
      setQuery(input.value);
    });

    document.addEventListener('keydown', function (e) {
      if (!overlay || overlay.hidden || e.target !== input) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, shown.length - 1); render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); render(); }
      else if (e.key === 'Enter') { e.preventDefault(); activate(active); }
    });

    document.addEventListener('mousedown', function (e) {
      if (!overlay || overlay.hidden) return;
      if (e.target === overlay) close();
      var li = e.target.closest('.cp-result');
      if (li) activate(+li.getAttribute('data-i'));
    });
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', wire);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { fuzzyScore: fuzzyScore, filterItems: filterItems };
  }
})();
