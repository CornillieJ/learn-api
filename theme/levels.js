// Level tabs: one `.level-tabs[data-levels]` bar per page switches between
// `.level.overview`, `.level.deep` and `.level.drill` blocks. The reader's
// choice is remembered across chapters. Level NAMES are fixed; the button
// TEXT is yours (e.g. "Quick look" / "In depth" / "Practice").
(function () {
  var LEVELS = ['overview', 'deep', 'drill'];
  function prefix() {
    var c = typeof window !== 'undefined' && window.BookConfig;
    return (c && c.storagePrefix) || 'mybook';
  }
  function storageKey() { return prefix() + ':level'; }
  function isValidLevel(v) { return LEVELS.indexOf(v) !== -1; }
  function getStoredLevel() {
    try {
      var v = localStorage.getItem(storageKey());
      return isValidLevel(v) ? v : 'overview';
    } catch (e) { return 'overview'; }
  }
  function setStoredLevel(level) {
    if (!isValidLevel(level)) return;
    try { localStorage.setItem(storageKey(), level); } catch (e) {}
  }
  // The level a hidden `.level` block belongs to, from its class names.
  function levelFromClasses(classNames) {
    for (var i = 0; i < classNames.length; i++) {
      if (isValidLevel(classNames[i])) return classNames[i];
    }
    return null;
  }
  // Pure: should a sidebar sub-heading for a level-gated section read as
  // dimmed? True only when the heading belongs to a level and it isn't the
  // active one; headings outside any `.level` block (itemLevel null) are
  // ordinary always-visible content and are never dimmed.
  function isInactiveHeading(itemLevel, activeLevel) {
    return !!itemLevel && itemLevel !== activeLevel;
  }
  // mdBook's own built-in sidebar sub-heading feature (toc-*.js, unrelated
  // to this template's own "On this page" nav in on-this-page.js) scans the
  // page for every h2-h6 ONCE at load and lists them all under the active
  // chapter, with no idea that some of them live inside a hidden `.level`
  // block. Left alone, a reader sees "Tasks / Quiz / Flashcards" listed as
  // if they were on the page right now while looking at the Overview level.
  // This dims those entries instead of hiding them outright, because
  // clicking one still works today (levels.js's own click handler below
  // switches to the right level and reveals the target) — hiding the link
  // would remove that shortcut, dimming just stops it from looking like
  // ordinary unconditional content.
  function syncSidebarHeadings(level) {
    document.querySelectorAll('a.header-in-summary').forEach(function (a) {
      var id = hashId(a.hash);
      var target = id && document.getElementById(id);
      var block = target && target.closest('.level');
      var itemLevel = block ? levelFromClasses(Array.prototype.slice.call(block.classList)) : null;
      var li = a.closest('li.header-item');
      if (li) li.classList.toggle('hs-inactive', isInactiveHeading(itemLevel, level));
    });
  }
  function apply(level) {
    document.querySelectorAll('[data-levels]').forEach(function (tabs) {
      tabs.querySelectorAll('button').forEach(function (btn) {
        btn.setAttribute('aria-pressed', btn.getAttribute('data-level') === level ? 'true' : 'false');
      });
    });
    document.querySelectorAll('.level').forEach(function (el) {
      el.style.display = el.classList.contains(level) ? '' : 'none';
    });
    syncSidebarHeadings(level);
    document.dispatchEvent(new CustomEvent('book:level-changed', { detail: { level: level } }));
  }
  // Sidebar and "On this page" links can point at headings inside a level
  // that is currently hidden; switch to that level so the target is visible.
  // The stored preference is left alone: this is navigation, not a choice.
  function revealTarget(id) {
    if (!id) return false;
    var target = document.getElementById(id);
    if (!target) return false;
    var block = target.closest('.level');
    if (!block || block.style.display !== 'none') return false;
    var level = levelFromClasses(Array.prototype.slice.call(block.classList));
    if (!level) return false;
    apply(level);
    return true;
  }
  function hashId(hash) {
    try { return decodeURIComponent((hash || '').slice(1)); } catch (e) { return (hash || '').slice(1); }
  }
  // The tabs bar is `position: fixed` (see custom.css for why: mdBook's own
  // #mdbook-content wrapper breaks position:sticky). Match it to the
  // content column's own left/width so it reads as part of the page rather
  // than an overlay, and re-run whenever that column's geometry can change.
  function positionTabs() {
    var main = document.querySelector('#mdbook-content main');
    if (!main) return;
    var rect = main.getBoundingClientRect();
    // mdBook's own top menu bar exists in the DOM even when scrolled out of
    // view (it reveals itself again on scroll-up) — check where it actually
    // is, not just whether the element exists.
    var menuBar = document.querySelector('#mdbook-menu-bar');
    var menuBarBottom = menuBar ? Math.max(0, menuBar.getBoundingClientRect().bottom) : 0;
    document.querySelectorAll('[data-levels]').forEach(function (tabs) {
      tabs.style.left = rect.left + 'px';
      tabs.style.width = rect.width + 'px';
      tabs.style.top = menuBarBottom + 'px';
    });
  }
  // Keyboard 1/2/3 switches level, unless the user is typing or focus is in
  // a widget that uses its own keys (quiz letters, flashcards).
  function levelForKey(key) {
    var i = ['1', '2', '3'].indexOf(key);
    return i === -1 ? null : LEVELS[i];
  }
  function isTypingTarget(el) {
    if (!el || !el.tagName) return false;
    var tag = el.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable ||
      !!(el.closest && el.closest('[data-quiz], [data-flashcards]'));
  }
  // How many hands-on items the drill level holds (shown as a badge on its tab).
  function countDrillItems(root) {
    var n = 0;
    root.querySelectorAll('.level.drill').forEach(function (drill) {
      n += drill.querySelectorAll('ul.checklist > li, details.qa, [data-quiz], [data-flashcards]').length;
    });
    return n;
  }
  function addDrillCount() {
    var n = countDrillItems(document);
    if (!n) return;
    document.querySelectorAll('[data-levels] button[data-level="drill"]').forEach(function (btn) {
      if (btn.querySelector('.lt-count')) return;
      var badge = document.createElement('span');
      badge.className = 'lt-count';
      badge.textContent = n;
      badge.setAttribute('aria-label', n + ' exercises');
      btn.appendChild(badge);
    });
  }
  function addKeyHints() {
    document.querySelectorAll('[data-levels] button[data-level]').forEach(function (btn) {
      var i = LEVELS.indexOf(btn.getAttribute('data-level'));
      if (i !== -1 && !btn.title) btn.title = 'Shortcut: ' + (i + 1);
    });
  }
  function isPrintPage() {
    return /(^|\/)print\.html$/.test(location.pathname);
  }
  function wire() {
    // mdBook's print.html inlines every chapter: show every level there and
    // hide the tab bars (custom.css keys off html.bk-print).
    if (isPrintPage()) { document.documentElement.classList.add('bk-print'); return; }
    var level = getStoredLevel();
    addDrillCount();
    addKeyHints();
    document.addEventListener('keydown', function (e) {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      var next = levelForKey(e.key);
      if (!next || !document.querySelector('[data-levels]')) return;
      setStoredLevel(next);
      apply(next);
      positionTabs();
    });
    apply(level);
    positionTabs();
    window.addEventListener('resize', positionTabs);
    window.addEventListener('scroll', positionTabs, { passive: true });
    if ('MutationObserver' in window) {
      new MutationObserver(positionTabs).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }
    if (revealTarget(hashId(location.hash))) {
      document.getElementById(hashId(location.hash)).scrollIntoView();
    }
    // Capture phase, so the level is visible before the browser scrolls.
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href*="#"]');
      if (!a || a.pathname !== location.pathname) return;
      revealTarget(hashId(a.hash));
    }, true);
    window.addEventListener('hashchange', function () {
      if (revealTarget(hashId(location.hash))) {
        document.getElementById(hashId(location.hash)).scrollIntoView();
      }
    });
    document.querySelectorAll('[data-levels] button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var next = btn.getAttribute('data-level');
        setStoredLevel(next);
        apply(next);
      });
    });
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', wire);
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      isValidLevel: isValidLevel,
      levelFromClasses: levelFromClasses,
      LEVELS: LEVELS,
      getStoredLevel: getStoredLevel,
      setStoredLevel: setStoredLevel,
      storageKey: storageKey,
      levelForKey: levelForKey,
      countDrillItems: countDrillItems,
      isInactiveHeading: isInactiveHeading,
    };
  }
})();
