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

  function currentSlug() { return slugFromHref(location.pathname); }

  function syncSidebarIn(doc) {
    doc.querySelectorAll('.chapter-item a[href$=".html"]').forEach(function (a) {
      var slug = slugFromHref(a.getAttribute('href'));
      var mark = a.querySelector('.done-mark');
      if (isDone(slug)) {
        if (!mark) {
          mark = doc.createElement('span');
          mark.className = 'done-mark';
          mark.textContent = ' ✓';
          a.appendChild(mark);
        }
      } else if (mark) {
        mark.remove();
      }
    });
  }

  // Reused reference so repeated syncSidebar() calls cannot stack duplicate listeners.
  function onSidebarFrameLoad() {
    try { syncSidebarIn(this.contentDocument); } catch (e) {}
  }

  // mdBook 0.5 renders the sidebar in a same-origin iframe, not in the chapter document.
  function syncSidebar() {
    var iframe = document.querySelector('iframe.sidebar-iframe-outer');
    if (!iframe) return;
    iframe.addEventListener('load', onSidebarFrameLoad);
    try {
      var doc = iframe.contentDocument;
      if (doc && doc.querySelector('.chapter-item')) syncSidebarIn(doc);
    } catch (e) {}
  }

  function wireButton() {
    var btn = document.querySelector('[data-mark-done]');
    if (!btn) return;
    var slug = currentSlug();
    function render() {
      var done = isDone(slug);
      btn.setAttribute('aria-pressed', done ? 'true' : 'false');
      btn.textContent = done ? '✓ Marked done' : 'Mark this step done';
    }
    btn.addEventListener('click', function () {
      setDone(slug, !isDone(slug));
      render();
      syncSidebar();
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
    };
  }
})();
