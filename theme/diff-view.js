// Diff view: one fenced ```diff code block, viewable as Diff / Before /
// After, inside a `data-diff-view` div:
//
//   <div class="diff-view" data-diff-view>
//
//   ```diff
//    function clamp(value, min, max) {
//   -  if (value < min) return value;
//   +  if (value < min) return min;
//      return value;
//   }
//   ```
//
//   </div>
//
// Paste raw `git diff` output straight in: `diff --git`, `index `, `--- `,
// `+++ ` and `@@ ... @@` lines are recognized and dropped from every view.
// Optional attributes on the div: data-labels="Before|Diff|After" (renames
// the three buttons), data-default="diff" (before|diff|after, which view
// opens first).
(function () {
  // Pure: raw diff text -> classified lines, in source order.
  // `text` has its leading marker char stripped for context/add/del.
  function parseDiff(raw) {
    var lines = String(raw || '').replace(/\n$/, '').split('\n');
    return lines.map(function (line) {
      if (/^diff --git /.test(line) || /^index /.test(line) || /^--- /.test(line) || /^\+\+\+ /.test(line)) {
        return { type: 'meta', text: line };
      }
      if (/^@@.*@@/.test(line)) return { type: 'hunk', text: line };
      if (line[0] === '+') return { type: 'add', text: line.slice(1) };
      if (line[0] === '-') return { type: 'del', text: line.slice(1) };
      if (line[0] === ' ') return { type: 'context', text: line.slice(1) };
      // A context line with no leading space (common when hand-typing a
      // snippet rather than pasting real `git diff` output).
      return { type: 'context', text: line };
    });
  }

  // Pure: parsed lines -> the lines to show for a given view.
  var KEEP = { diff: { context: 1, add: 1, del: 1 }, before: { context: 1, del: 1 }, after: { context: 1, add: 1 } };
  function linesForView(parsed, view) {
    var keep = KEEP[view] || KEEP.diff;
    return (parsed || []).filter(function (l) { return keep[l.type]; });
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  var MARK = { add: '+', del: '−', context: '' };

  function renderLines(lines, view) {
    return lines.map(function (l) {
      var cls = 'dv-line dv-' + l.type;
      if (view === 'diff' && l.type === 'context') cls += ' dv-dim';
      return '<span class="' + cls + '"><span class="dv-mark" aria-hidden="true">' + (MARK[l.type] || '') + '</span>' + escapeHtml(l.text) + '\n</span>';
    }).join('');
  }

  function splitList(attr, fallback) {
    var parts = String(attr || '').split('|').map(function (s) { return s.trim(); }).filter(Boolean);
    return parts.length === 3 ? parts : fallback;
  }

  function wireOne(root) {
    var pre = root.querySelector(':scope > pre');
    var code = pre && pre.querySelector('code');
    if (!code) return;
    var parsed = parseDiff(code.textContent);
    if (!parsed.length) return;

    var labels = splitList(root.getAttribute('data-labels'), ['Before', 'Diff', 'After']);
    var views = ['before', 'diff', 'after'];
    var start = views.indexOf(root.getAttribute('data-default'));
    if (start === -1) start = 1;

    root.classList.add('dv-ready');
    var tabs = document.createElement('div');
    tabs.className = 'dv-tabs';
    tabs.setAttribute('role', 'tablist');
    views.forEach(function (v, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dv-tab dv-' + v;
      btn.setAttribute('role', 'tab');
      btn.textContent = labels[i];
      btn.addEventListener('click', function () { select(i); });
      tabs.appendChild(btn);
    });
    tabs.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var cur = Array.prototype.indexOf.call(tabs.children, document.activeElement);
      if (cur === -1) return;
      var next = (cur + (e.key === 'ArrowRight' ? 1 : -1) + views.length) % views.length;
      select(next);
      tabs.children[next].focus();
      e.preventDefault();
    });

    root.insertBefore(tabs, pre);

    function select(i) {
      Array.prototype.forEach.call(tabs.children, function (t, j) {
        t.setAttribute('aria-selected', i === j ? 'true' : 'false');
        t.tabIndex = i === j ? 0 : -1;
      });
      code.innerHTML = renderLines(linesForView(parsed, views[i]), views[i]);
    }
    select(start);
  }

  function wire() {
    document.querySelectorAll('[data-diff-view]').forEach(wireOne);
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', wire);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { parseDiff: parseDiff, linesForView: linesForView, escapeHtml: escapeHtml };
  }
})();
