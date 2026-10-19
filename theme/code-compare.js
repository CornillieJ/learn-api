// Code compare: two (or more) fenced code blocks side by side.
//
//   <div class="code-compare" data-code-compare>
//
//   ```python
//   ...
//   ```
//
//   ```javascript
//   ...
//   ```
//
//   </div>
//
// Wide: labelled columns. Narrow: a tab switcher (a CSS container query
// decides which layout shows). Labels come from each block's language;
// optional attributes on the div:
//   data-labels="Before|After"   override the pane labels
//   data-subs=".NET|Spring"      small grey sub-label per pane
//   data-default="1"             which pane (1-based) the narrow view opens
//                                on; defaults to the LAST pane (the "target")
(function () {
  var LANGS = {
    csharp: 'C#', cs: 'C#', 'c#': 'C#', fsharp: 'F#', java: 'Java', kotlin: 'Kotlin', kt: 'Kotlin',
    scala: 'Scala', python: 'Python', py: 'Python', javascript: 'JavaScript', js: 'JavaScript',
    jsx: 'JSX', typescript: 'TypeScript', ts: 'TypeScript', tsx: 'TSX', go: 'Go', golang: 'Go',
    rust: 'Rust', rs: 'Rust', c: 'C', cpp: 'C++', 'c++': 'C++', objectivec: 'Objective-C',
    swift: 'Swift', ruby: 'Ruby', rb: 'Ruby', php: 'PHP', perl: 'Perl', lua: 'Lua', r: 'R',
    dart: 'Dart', elixir: 'Elixir', haskell: 'Haskell', clojure: 'Clojure', sql: 'SQL',
    bash: 'Bash', sh: 'Shell', shell: 'Shell', zsh: 'Zsh', console: 'Console',
    powershell: 'PowerShell', ps1: 'PowerShell', dockerfile: 'Dockerfile', docker: 'Dockerfile',
    makefile: 'Makefile', yaml: 'YAML', yml: 'YAML', json: 'JSON', toml: 'TOML', ini: 'INI',
    xml: 'XML', html: 'HTML', css: 'CSS', scss: 'SCSS', markdown: 'Markdown', md: 'Markdown',
    graphql: 'GraphQL', http: 'HTTP', diff: 'Diff', text: 'Text', plaintext: 'Text', nginx: 'nginx',
  };

  // Pure: a <code> element's className -> display label.
  function langFromClass(className) {
    var m = /(?:^|\s)language-([^\s]+)/.exec(className || '');
    if (!m) return { label: 'Code', key: 'code' };
    var id = m[1].toLowerCase();
    return { label: LANGS[id] || m[1], key: id.replace(/[^a-z0-9]/g, '') || 'code' };
  }

  // Pure: "A|B" -> ['A', 'B']; missing/empty -> [].
  function splitList(attr) {
    if (!attr) return [];
    return String(attr).split('|').map(function (s) { return s.trim(); });
  }

  // Pure: final labels/subs per pane plus the default pane (0-based).
  function paneSetup(classNames, labelsAttr, subsAttr, defaultAttr) {
    var labels = splitList(labelsAttr), subs = splitList(subsAttr);
    var panes = classNames.map(function (cls, i) {
      var lang = langFromClass(cls);
      return { label: labels[i] || lang.label, sub: subs[i] || '', key: lang.key };
    });
    var d = parseInt(defaultAttr, 10);
    var def = d >= 1 && d <= panes.length ? d - 1 : panes.length - 1;
    return { panes: panes, defaultIndex: Math.max(0, def) };
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function wireOne(root, n) {
    var pres = Array.prototype.slice.call(root.querySelectorAll(':scope > pre'));
    if (pres.length < 2) return;
    var setup = paneSetup(pres.map(function (pre) {
      var code = pre.querySelector('code');
      return code ? code.className : '';
    }), root.getAttribute('data-labels'), root.getAttribute('data-subs'), root.getAttribute('data-default'));
    root.classList.add('cc-ready');
    var tabs = document.createElement('div');
    tabs.className = 'cc-tabs';
    tabs.setAttribute('role', 'tablist');
    var grid = document.createElement('div');
    grid.className = 'cc-grid cc-n' + Math.min(pres.length, 4);
    var panes = [];
    pres.forEach(function (pre, i) {
      var info = setup.panes[i];
      var pane = document.createElement('div');
      pane.className = 'cc-pane cc-p' + (i % 4) + ' cc-' + info.key;
      pane.id = 'cc-' + n + '-' + i;
      pane.setAttribute('role', 'tabpanel');
      var head = document.createElement('div');
      head.className = 'cc-head';
      head.innerHTML = '<span class="cc-lang">' + escapeHtml(info.label) + '</span>' + (info.sub ? '<span class="cc-sub">' + escapeHtml(info.sub) + '</span>' : '');
      pre.parentNode.insertBefore(pane, pre);
      pane.appendChild(head);
      pane.appendChild(pre);
      grid.appendChild(pane);
      panes.push(pane);
      var tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'cc-tab cc-p' + (i % 4);
      tab.id = pane.id + '-tab';
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', pane.id);
      pane.setAttribute('aria-labelledby', tab.id);
      tab.textContent = info.label;
      tab.addEventListener('click', function () { select(i); });
      tabs.appendChild(tab);
    });
    tabs.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var cur = panes.map(function (p) { return p.classList.contains('cc-active'); }).indexOf(true);
      var next = (cur + (e.key === 'ArrowRight' ? 1 : -1) + panes.length) % panes.length;
      select(next);
      tabs.children[next].focus();
      e.preventDefault();
    });
    if (panes.length === 2) {
      var vs = document.createElement('span');
      vs.className = 'cc-vs';
      vs.setAttribute('aria-hidden', 'true');
      vs.textContent = 'vs';
      grid.insertBefore(vs, panes[1]);
    }
    root.insertBefore(tabs, root.firstChild);
    root.appendChild(grid);

    function select(idx) {
      panes.forEach(function (p, i) { p.classList.toggle('cc-active', i === idx); });
      Array.prototype.forEach.call(tabs.children, function (t, i) {
        t.setAttribute('aria-selected', i === idx ? 'true' : 'false');
        t.tabIndex = i === idx ? 0 : -1;
      });
    }
    select(setup.defaultIndex);
  }

  function wire() {
    document.querySelectorAll('[data-code-compare]').forEach(wireOne);
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', wire);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { langFromClass: langFromClass, splitList: splitList, paneSetup: paneSetup };
  }
})();
