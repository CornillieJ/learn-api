(function () {
  var LEVELS = ['overview', 'deep', 'drill'];
  var KEY = 'learn-api:level';
  function isValidLevel(v) { return LEVELS.indexOf(v) !== -1; }
  function getStoredLevel() {
    try {
      var v = localStorage.getItem(KEY);
      return isValidLevel(v) ? v : 'overview';
    } catch (e) { return 'overview'; }
  }
  function setStoredLevel(level) {
    if (!isValidLevel(level)) return;
    try { localStorage.setItem(KEY, level); } catch (e) {}
  }
  // The level a hidden `.level` block belongs to, from its class names.
  function levelFromClasses(classNames) {
    for (var i = 0; i < classNames.length; i++) {
      if (isValidLevel(classNames[i])) return classNames[i];
    }
    return null;
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
    document.dispatchEvent(new CustomEvent('learn-api:level-changed', { detail: { level: level } }));
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
  // How many hands-on items the Drilling level holds.
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
  function wire() {
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
      levelForKey: levelForKey,
      countDrillItems: countDrillItems,
    };
  }
})();
