// Timeline: a plain markdown list becomes a vertical line of dated stops,
// built from a `data-timeline` div:
//
//   <div class="timeline" data-timeline data-title="Project history">
//
//   - **2024-01** First working prototype, a single-file script.
//   - **2024-06** Rewritten as a proper CLI with tests.
//   - **2025-02** v1.0 released, with config file support.
//
//   </div>
//
// Each item's leading **bold** text is the stop's label; the rest is its
// body (inline Markdown — code, links — renders normally, mdBook already
// turned it into HTML before this script runs). `data-title` is optional.
// Unlike the progress map this has no done-state or persistence: every
// entry's full text is always visible, and the only interactivity is
// orientation — click or arrow-key a dot to highlight and scroll to it.
(function () {
  // Pure: each list item's innerHTML -> { label, bodyHtml }. A leading
  // <strong>...</strong> (what mdBook renders **bold** as) becomes the
  // label; everything after it is the body, left as HTML so inline
  // formatting (code, links) survives. No leading <strong> -> label ''.
  function parseEntries(itemHtmls) {
    return (itemHtmls || []).map(function (html) {
      var s = String(html || '');
      var m = /^\s*<strong>([\s\S]*?)<\/strong>/.exec(s);
      if (!m) return { label: '', bodyHtml: s.trim() };
      return { label: m[1], bodyHtml: s.slice(m[0].length).trim() };
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function readEntries(root) {
    var lis = Array.prototype.slice.call(root.querySelectorAll(':scope > ul > li, :scope > ol > li'));
    return lis.map(function (li) { return li.innerHTML; });
  }

  function render(root, entries) {
    var title = root.getAttribute('data-title');
    var html = '';
    if (title) html += '<div class="tl-head">' + escapeHtml(title) + '</div>';
    html += '<div class="tl-jump">' +
      '<button type="button" class="tl-jump-btn" data-tl-jump="oldest">&uarr; Oldest</button>' +
      '<button type="button" class="tl-jump-btn" data-tl-jump="latest">Latest &darr;</button></div>';
    html += '<ol class="tl-line">';
    entries.forEach(function (e, i) {
      html += '<li class="tl-stop" data-tl-stop="' + i + '">' +
        '<button type="button" class="tl-dot" data-tl-dot="' + i + '" aria-pressed="false" aria-label="' +
        escapeHtml(e.label || 'Entry ' + (i + 1)) + '"></button>' +
        '<div class="tl-entry">' +
        (e.label ? '<div class="tl-label">' + escapeHtml(e.label) + '</div>' : '') +
        '<div class="tl-body">' + e.bodyHtml + '</div></div></li>';
    });
    html += '</ol>';
    root.innerHTML = html;
    root.classList.add('tl-ready');
  }

  function wireOne(root) {
    var entries = parseEntries(readEntries(root));
    if (!entries.length) return;
    render(root, entries);

    var dots = Array.prototype.slice.call(root.querySelectorAll('.tl-dot'));
    var stops = Array.prototype.slice.call(root.querySelectorAll('.tl-stop'));

    function highlight(i) {
      dots.forEach(function (d, j) {
        d.classList.toggle('tl-dot-active', j === i);
        d.setAttribute('aria-pressed', j === i ? 'true' : 'false');
      });
      stops.forEach(function (s, j) { s.classList.toggle('tl-stop-active', j === i); });
    }

    function goTo(i) {
      if (i < 0 || i >= dots.length) return;
      highlight(i);
      stops[i].scrollIntoView({ block: 'center', behavior: 'smooth' });
      dots[i].focus();
    }

    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () { highlight(i); stops[i].scrollIntoView({ block: 'center', behavior: 'smooth' }); });
      dot.addEventListener('keydown', function (e) {
        var n;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = Math.min(dots.length - 1, i + 1);
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = Math.max(0, i - 1);
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = dots.length - 1;
        else return;
        e.preventDefault();
        goTo(n);
      });
    });

    var jumpOldest = root.querySelector('[data-tl-jump="oldest"]');
    var jumpLatest = root.querySelector('[data-tl-jump="latest"]');
    if (jumpOldest) jumpOldest.addEventListener('click', function () { goTo(0); });
    if (jumpLatest) jumpLatest.addEventListener('click', function () { goTo(dots.length - 1); });
  }

  function wire() {
    document.querySelectorAll('[data-timeline]').forEach(wireOne);
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', wire);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { parseEntries: parseEntries };
  }
})();
