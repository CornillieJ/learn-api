(function () {
  var PREFIX = 'learn-api:done:';
  var KNOWN_PREFIX = 'learn-api:known:';

  function chapterKey(slug) { return PREFIX + slug; }

  function knownKey(slug, index) { return KNOWN_PREFIX + slug + ':' + index; }

  function slugFromHref(href) {
    return href.replace(/^\.?\//, '').replace(/^.*\//, '').replace(/#.*$/, '').replace(/\.html$/, '');
  }

  function isDone(slug) {
    try { return localStorage.getItem(chapterKey(slug)) === '1'; } catch (e) { return false; }
  }

  function setDone(slug, done) {
    try { localStorage.setItem(chapterKey(slug), done ? '1' : '0'); } catch (e) {}
  }

  function isKnown(slug, index) {
    try { return localStorage.getItem(knownKey(slug, index)) === '1'; } catch (e) { return false; }
  }

  function setKnown(slug, index, known) {
    try { localStorage.setItem(knownKey(slug, index), known ? '1' : '0'); } catch (e) {}
  }

  var STEP_SLUGS = [
    'step-1-java-syntax', 'step-2-maven', 'step-3-spring-mvc-war', 'step-4-persistence-hibernate',
    'step-5-spring-security', 'step-6-lombok', 'step-7-ecosystem-audio',
  ];

  function countDoneSteps() {
    return STEP_SLUGS.filter(isDone).length;
  }

  function currentSlug() { return slugFromHref(location.pathname); }

  function syncSidebar() {
    document.querySelectorAll('#mdbook-sidebar .chapter-item a[href$=".html"]').forEach(function (a) {
      var slug = slugFromHref(a.getAttribute('href'));
      var mark = a.querySelector('.done-mark');
      if (isDone(slug)) {
        if (!mark) {
          mark = document.createElement('span');
          mark.className = 'done-mark';
          mark.textContent = ' ✓';
          a.appendChild(mark);
        }
      } else if (mark) {
        mark.remove();
      }
    });
  }

  function wireButton() {
    var btn = document.querySelector('[data-mark-done]');
    if (!btn) return;
    // Relocate into the sticky level-tabs bar so it's reachable regardless
    // of scroll position or which level (Overview/Deep/Drilling) is active,
    // instead of sitting buried at the bottom of the Drilling level only.
    var tabs = document.querySelector('.level-tabs');
    if (tabs) tabs.appendChild(btn);
    var slug = currentSlug();
    function render() {
      var done = isDone(slug);
      btn.setAttribute('aria-pressed', done ? 'true' : 'false');
      btn.textContent = done ? '✓ Marked done' : 'Mark this step done';
    }
    btn.addEventListener('click', function () {
      var nowDone = !isDone(slug);
      setDone(slug, nowDone);
      render();
      syncSidebar();
      document.dispatchEvent(new CustomEvent('learn-api:done-changed', { detail: { slug: slug, done: nowDone } }));
      if (nowDone) {
        btn.classList.remove('just-done');
        void btn.offsetWidth;
        btn.classList.add('just-done');
        var api = window.LearnApi;
        var count = countDoneSteps();
        if (api && api.celebrate) {
          api.celebrate(btn, { message: count === STEP_SLUGS.length ? 'All 7 steps done. You finished the path!' : 'Step done! ' + count + ' of ' + STEP_SLUGS.length + ' steps complete.', count: count === STEP_SLUGS.length ? 160 : 80 });
        }
      }
    });
    render();
  }

  function wireKnownButtons() {
    var slug = currentSlug();
    document.querySelectorAll('.qa .mark button').forEach(function (btn, index) {
      var qa = btn.closest('.qa');
      if (!qa) return;
      function render() {
        var known = isKnown(slug, index);
        qa.classList.toggle('known', known);
        btn.setAttribute('aria-pressed', known ? 'true' : 'false');
        btn.textContent = known ? '✓ Known' : 'Mark as known';
      }
      btn.addEventListener('click', function () {
        setKnown(slug, index, !isKnown(slug, index));
        render();
      });
      render();
    });
  }

  function init() {
    wireButton();
    wireKnownButtons();
    syncSidebar();
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', init);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      chapterKey: chapterKey,
      knownKey: knownKey,
      slugFromHref: slugFromHref,
      isDone: isDone,
      setDone: setDone,
      isKnown: isKnown,
      setKnown: setKnown,
      STEP_SLUGS: STEP_SLUGS,
      countDoneSteps: countDoneSteps,
    };
  }
})();
