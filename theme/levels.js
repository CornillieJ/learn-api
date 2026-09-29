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
  function wire() {
    var level = getStoredLevel();
    apply(level);
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
      LEVELS: LEVELS,
      getStoredLevel: getStoredLevel,
      setStoredLevel: setStoredLevel,
    };
  }
})();
