// Copy as: 2+ fenced code blocks that are EQUIVALENT forms of the same
// thing (npm/yarn/pnpm, curl/fetch...), shown one at a time via a row of
// pills, picked with REQUIRED data-labels (labels can't be guessed from
// the language the way code-compare does it: three bash blocks for
// npm/yarn/pnpm would all just say "Shell").
//
//   <div class="copy-as" data-copy-as data-labels="npm|yarn|pnpm">
//
//   ```bash
//   npm install mdbook-template
//   ```
//
//   ```bash
//   yarn add mdbook-template
//   ```
//
//   ```bash
//   pnpm add mdbook-template
//   ```
//
//   </div>
//
// Optional data-default="2" (1-based) picks the starting pane when the
// reader has no stored preference yet; defaults to the first pane.
//
// The reader's last pick is remembered SITE-WIDE (not per block) under
// <prefix>:copyas-pref, so picking "yarn" once opens every other copy-as
// block in the book on "yarn" too, on any page, from then on.
(function () {
  function prefix() {
    var c = typeof window !== 'undefined' && window.BookConfig;
    return (c && c.storagePrefix) || 'mybook';
  }

  function readPref() {
    try { return localStorage.getItem(prefix() + ':copyas-pref'); } catch (e) { return null; }
  }

  function writePref(label) {
    try { localStorage.setItem(prefix() + ':copyas-pref', label); } catch (e) {}
  }

  // Pure: "A|B|C" -> ['A', 'B', 'C']; missing/empty -> [].
  function splitList(attr) {
    if (!attr) return [];
    return String(attr).split('|').map(function (s) { return s.trim(); });
  }

  // Pure: which pane (0-based) to open on. A stored label that matches
  // one of `labels` wins; otherwise `defaultAttr` (1-based, like
  // code-compare's data-default), clamped into range and falling back to
  // the first pane (0) when absent/out of range.
  function preferredIndex(labels, storedLabel, defaultAttr) {
    if (storedLabel) {
      var i = labels.indexOf(storedLabel);
      if (i !== -1) return i;
    }
    var d = parseInt(defaultAttr, 10);
    return d >= 1 && d <= labels.length ? d - 1 : 0;
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function wireOne(root) {
    var pres = Array.prototype.slice.call(root.querySelectorAll(':scope > pre'));
    var labels = splitList(root.getAttribute('data-labels'));
    if (pres.length < 2 || labels.length !== pres.length) return;

    root.classList.add('ca-ready');
    var pills = document.createElement('div');
    pills.className = 'ca-pills';
    pills.setAttribute('role', 'tablist');

    var uid = 'ca-' + Math.random().toString(36).slice(2, 7);
    pres.forEach(function (pre, i) {
      pre.classList.add('ca-pane');
      pre.id = uid + '-pane-' + i;
      pre.setAttribute('role', 'tabpanel');
      var pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'ca-pill';
      pill.id = uid + '-tab-' + i;
      pill.setAttribute('role', 'tab');
      pill.setAttribute('aria-controls', pre.id);
      pre.setAttribute('aria-labelledby', pill.id);
      pill.textContent = labels[i];
      pill.addEventListener('click', function () { select(i); writePref(labels[i]); });
      pills.appendChild(pill);
    });

    pills.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var cur = Array.prototype.indexOf.call(pills.children, document.activeElement);
      if (cur === -1) return;
      var next = (cur + (e.key === 'ArrowRight' ? 1 : -1) + pres.length) % pres.length;
      select(next);
      writePref(labels[next]);
      pills.children[next].focus();
      e.preventDefault();
    });

    root.insertBefore(pills, root.firstChild);

    function select(idx) {
      pres.forEach(function (pre, i) { pre.classList.toggle('ca-active', i === idx); });
      Array.prototype.forEach.call(pills.children, function (t, i) {
        t.classList.toggle('ca-pill-active', i === idx);
        t.setAttribute('aria-selected', i === idx ? 'true' : 'false');
        t.tabIndex = i === idx ? 0 : -1;
      });
    }

    select(preferredIndex(labels, readPref(), root.getAttribute('data-default')));
  }

  function wire() {
    document.querySelectorAll('[data-copy-as]').forEach(wireOne);
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', wire);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { splitList: splitList, preferredIndex: preferredIndex, escapeHtml: escapeHtml };
  }
})();
