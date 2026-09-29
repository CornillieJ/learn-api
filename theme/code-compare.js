// C# vs Java side by side: <div class="code-compare" data-code-compare>
// with two fenced code blocks inside. Wide: two labelled columns.
// Narrow: a tab switcher (CSS container query decides which layout shows).
(function () {
  var LANGS = {
    csharp: { label: 'C#', sub: '.NET', key: 'cs' },
    cs: { label: 'C#', sub: '.NET', key: 'cs' },
    'c#': { label: 'C#', sub: '.NET', key: 'cs' },
    java: { label: 'Java', sub: 'Spring', key: 'java' },
    xml: { label: 'XML', sub: '', key: 'xml' },
    kotlin: { label: 'Kotlin', sub: '', key: 'kt' },
    sql: { label: 'SQL', sub: '', key: 'sql' },
  };

  function langFromClass(className) {
    var m = /(?:^|\s)language-([^\s]+)/.exec(className || '');
    if (!m) return { label: 'Code', sub: '', key: 'code' };
    var id = m[1].toLowerCase();
    return LANGS[id] || { label: id.charAt(0).toUpperCase() + id.slice(1), sub: '', key: id };
  }

  function wireOne(root, n) {
    var pres = Array.prototype.slice.call(root.querySelectorAll(':scope > pre'));
    if (pres.length < 2) return;
    root.classList.add('cc-ready');
    var tabs = document.createElement('div');
    tabs.className = 'cc-tabs';
    tabs.setAttribute('role', 'tablist');
    var grid = document.createElement('div');
    grid.className = 'cc-grid';
    var panes = [];
    pres.forEach(function (pre, i) {
      var code = pre.querySelector('code');
      var lang = langFromClass(code ? code.className : '');
      var pane = document.createElement('div');
      pane.className = 'cc-pane cc-' + lang.key;
      pane.id = 'cc-' + n + '-' + i;
      pane.setAttribute('role', 'tabpanel');
      var head = document.createElement('div');
      head.className = 'cc-head';
      head.innerHTML = '<span class="cc-lang">' + lang.label + '</span>' + (lang.sub ? '<span class="cc-sub">' + lang.sub + '</span>' : '');
      pre.parentNode.insertBefore(pane, pre);
      pane.appendChild(head);
      pane.appendChild(pre);
      grid.appendChild(pane);
      panes.push(pane);
      var tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'cc-tab cc-tab-' + lang.key;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', pane.id);
      tab.textContent = lang.label;
      tab.addEventListener('click', function () { select(i); });
      tabs.appendChild(tab);
    });
    var vs = document.createElement('span');
    vs.className = 'cc-vs';
    vs.setAttribute('aria-hidden', 'true');
    vs.textContent = 'vs';
    if (panes.length === 2) grid.insertBefore(vs, panes[1]);
    root.insertBefore(tabs, root.firstChild);
    root.appendChild(grid);

    function select(idx) {
      panes.forEach(function (p, i) { p.classList.toggle('cc-active', i === idx); });
      Array.prototype.forEach.call(tabs.children, function (t, i) {
        t.setAttribute('aria-selected', i === idx ? 'true' : 'false');
      });
    }
    // Default to the Java side on narrow screens: that's what's being learned.
    var javaIdx = panes.map(function (p) { return p.classList.contains('cc-java'); }).indexOf(true);
    select(javaIdx === -1 ? 0 : javaIdx);
  }

  function wire() {
    document.querySelectorAll('[data-code-compare]').forEach(wireOne);
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', wire);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { langFromClass: langFromClass };
  }
})();
