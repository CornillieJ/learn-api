// Glossary hover-term: mark a word or phrase inline with a definition,
// anywhere in prose. No wrapper div — `<dfn>` is a standard inline element:
//
//   A cache entry is <dfn data-def="Calling it once or many times has the
//   same effect on the server.">idempotent</dfn> if repeating the request
//   doesn't change the outcome.
//
// Hover or focus shows the definition in a small popover; tap toggles it on
// touch. Escape, a click elsewhere, or blur closes it. Only one popover is
// open at a time.
//
// Optional: `<div data-glossary-index>` anywhere on the page collects every
// `dfn[data-def]` already on that page (not the whole book — no build step,
// no cross-page magic) and renders a sorted, deduplicated definition list.
(function () {
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Pure: entries [{ term, def }] -> deduplicated (case-insensitive on
  // `term`, first occurrence wins) and sorted alphabetically by term.
  function collectTerms(entries) {
    var seen = {};
    var out = [];
    (entries || []).forEach(function (e) {
      var term = String((e && e.term) || '').trim();
      if (!term) return;
      var key = term.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      out.push({ term: term, def: String((e && e.def) || '').trim() });
    });
    out.sort(function (a, b) { return a.term.toLowerCase().localeCompare(b.term.toLowerCase()); });
    return out;
  }

  var openState = null; // { dfn, popover }

  function closePopover() {
    if (!openState) return;
    openState.popover.remove();
    openState.dfn.setAttribute('aria-expanded', 'false');
    openState = null;
  }

  function positionPopover(dfn, popover) {
    document.body.appendChild(popover);
    var r = dfn.getBoundingClientRect();
    var pw = popover.offsetWidth;
    var ph = popover.offsetHeight;
    var left = Math.min(Math.max(8, r.left), window.innerWidth - pw - 8);
    var above = r.bottom + ph + 10 > window.innerHeight;
    var top = above ? r.top - ph - 8 : r.bottom + 8;
    popover.style.left = (left + window.scrollX) + 'px';
    popover.style.top = (top + window.scrollY) + 'px';
    popover.classList.toggle('gl-above', above);
  }

  function openPopover(dfn) {
    if (openState && openState.dfn === dfn) return;
    closePopover();
    var id = dfn.id || ('gl-term-' + Math.random().toString(36).slice(2));
    dfn.id = id;
    var popoverId = id + '-pop';
    var popover = document.createElement('div');
    popover.className = 'gl-popover';
    popover.id = popoverId;
    popover.setAttribute('role', 'tooltip');
    popover.innerHTML = escapeHtml(dfn.getAttribute('data-def') || '');
    dfn.setAttribute('aria-describedby', popoverId);
    dfn.setAttribute('aria-expanded', 'true');
    positionPopover(dfn, popover);
    openState = { dfn: dfn, popover: popover };
  }

  function wireTerm(dfn) {
    if (!dfn.getAttribute('data-def')) return;
    dfn.classList.add('gl-term');
    dfn.tabIndex = 0;
    dfn.setAttribute('aria-expanded', 'false');

    var hoverTimer = null;
    function scheduleOpen() {
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(function () { openPopover(dfn); }, 120);
    }
    function scheduleClose() {
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(function () {
        if (openState && openState.dfn === dfn) closePopover();
      }, 150);
    }

    dfn.addEventListener('mouseenter', scheduleOpen);
    dfn.addEventListener('mouseleave', scheduleClose);
    dfn.addEventListener('focus', function () { openPopover(dfn); });
    dfn.addEventListener('blur', function () {
      // Let a click on the popover itself (if ever interactive) win first.
      setTimeout(function () {
        if (openState && openState.dfn === dfn) closePopover();
      }, 0);
    });
    dfn.addEventListener('click', function (e) {
      e.preventDefault();
      if (openState && openState.dfn === dfn) closePopover();
      else openPopover(dfn);
    });
  }

  function wireGlobalClose() {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && openState) {
        openState.dfn.focus();
        closePopover();
      }
    });
    document.addEventListener('click', function (e) {
      if (openState && e.target !== openState.dfn && !openState.dfn.contains(e.target)) closePopover();
    });
    window.addEventListener('scroll', closePopover, true);
    window.addEventListener('resize', closePopover);
  }

  function wireIndex(container) {
    var dfns = Array.prototype.slice.call(document.querySelectorAll('dfn[data-def]'));
    var entries = dfns.map(function (d) { return { term: d.textContent, def: d.getAttribute('data-def') }; });
    var terms = collectTerms(entries);
    if (!terms.length) return;
    container.classList.add('gl-index-ready');
    container.innerHTML = '<dl class="gl-index">' + terms.map(function (t) {
      return '<dt>' + escapeHtml(t.term) + '</dt><dd>' + escapeHtml(t.def) + '</dd>';
    }).join('') + '</dl>';
  }

  function wire() {
    var dfns = document.querySelectorAll('dfn[data-def]');
    if (dfns.length) {
      dfns.forEach(wireTerm);
      wireGlobalClose();
    }
    document.querySelectorAll('[data-glossary-index]').forEach(wireIndex);
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', wire);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { collectTerms: collectTerms, escapeHtml: escapeHtml };
  }
})();
