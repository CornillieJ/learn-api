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
  function wire() {
    var level = getStoredLevel();
    apply(level);
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
    };
  }
})();
