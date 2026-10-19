// Progress you can feel, stored per browser in localStorage:
// - `<button type="button" data-mark-done>Mark this chapter done</button>`
//   toggles the chapter's done state. It is moved into the fixed
//   `.level-tabs` bar (when the page has one) so it is always reachable.
// - Sidebar links of done chapters get a small ✓ badge.
// - `.qa` self-checks with `<div class="mark"><button>` get "Mark as known".
// - Ticks in `ul.checklist` are remembered per page.
// Fires `book:done-changed` ({ slug, done }) on document when a chapter flips.
(function () {
  function prefix() {
    var c = typeof window !== 'undefined' && window.BookConfig;
    return (c && c.storagePrefix) || 'mybook';
  }

  function chapterKey(slug) { return prefix() + ':done:' + slug; }
  function knownKey(slug, index) { return prefix() + ':known:' + slug + ':' + index; }
  function checkKey(slug, index) { return prefix() + ':check:' + slug + ':' + index; }
  function trackedKey() { return prefix() + ':tracked'; }

  function slugFromHref(href) {
    var s = String(href || '').replace(/[?#].*$/, '').replace(/^\.?\//, '').replace(/^.*\//, '').replace(/\.html$/, '');
    return s || 'index';
  }

  function getFlag(key) {
    try { return localStorage.getItem(key) === '1'; } catch (e) { return false; }
  }
  function setFlag(key, on) {
    try { localStorage.setItem(key, on ? '1' : '0'); } catch (e) {}
  }

  function isDone(slug) { return getFlag(chapterKey(slug)); }
  function setDone(slug, done) { setFlag(chapterKey(slug), done); }
  function isKnown(slug, index) { return getFlag(knownKey(slug, index)); }
  function setKnown(slug, index, known) { setFlag(knownKey(slug, index), known); }

  // Which chapters count towards "N of M done"? First non-empty list wins:
  // a progress map on this page, BookConfig.trackedChapters, the list the
  // last progress map the reader saw stored. Null means "don't count".
  function resolveTracked(pageSlugs, configSlugs, storedSlugs) {
    var lists = [pageSlugs, configSlugs, storedSlugs];
    for (var i = 0; i < lists.length; i++) {
      if (Array.isArray(lists[i]) && lists[i].length) return lists[i].slice();
    }
    return null;
  }

  function readStoredTracked() {
    try {
      var v = JSON.parse(localStorage.getItem(trackedKey()) || 'null');
      return Array.isArray(v) ? v : null;
    } catch (e) { return null; }
  }

  function pageTracked() {
    var map = document.querySelector('[data-progress-map]');
    if (!map) return null;
    var slugs = [];
    map.querySelectorAll('li a[href]').forEach(function (a) { slugs.push(slugFromHref(a.getAttribute('href'))); });
    return slugs;
  }

  function trackedChapters() {
    var c = window.BookConfig || {};
    return resolveTracked(pageTracked(), c.trackedChapters, readStoredTracked());
  }

  // Toast text after marking a chapter done.
  function doneMessage(doneCount, total) {
    if (!total) return 'Chapter done!';
    if (doneCount >= total) return 'All ' + total + ' chapters done. You finished the book!';
    return 'Chapter done! ' + doneCount + ' of ' + total + ' complete.';
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
          mark.setAttribute('aria-label', 'done');
          mark.textContent = '✓';
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
    // Relocate into the fixed level-tabs bar so it's reachable regardless of
    // scroll position or which level is active.
    var tabs = document.querySelector('.level-tabs');
    if (tabs) tabs.appendChild(btn);
    var slug = currentSlug();
    var idle = btn.textContent.trim() || 'Mark this chapter done';
    var doneText = btn.getAttribute('data-done-text') || '✓ Marked done';
    btn.setAttribute('title', idle);
    function render() {
      var done = isDone(slug);
      btn.setAttribute('aria-pressed', done ? 'true' : 'false');
      btn.textContent = done ? doneText : idle;
    }
    btn.addEventListener('click', function () {
      var nowDone = !isDone(slug);
      setDone(slug, nowDone);
      render();
      syncSidebar();
      document.dispatchEvent(new CustomEvent('book:done-changed', { detail: { slug: slug, done: nowDone } }));
      if (!nowDone) return;
      btn.classList.remove('just-done');
      void btn.offsetWidth;
      btn.classList.add('just-done');
      var tracked = trackedChapters();
      var count = tracked ? tracked.filter(isDone).length : 0;
      var total = tracked ? tracked.length : 0;
      var all = total > 0 && count >= total;
      var api = window.Book;
      if (api && api.celebrate) api.celebrate(btn, { message: doneMessage(count, total), count: all ? 160 : 80 });
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

  function wireChecklists() {
    var slug = currentSlug();
    document.querySelectorAll('ul.checklist input[type="checkbox"]').forEach(function (box, index) {
      if (getFlag(checkKey(slug, index))) box.checked = true;
      box.addEventListener('change', function () { setFlag(checkKey(slug, index), box.checked); });
    });
  }

  function init() {
    if (currentSlug() === 'print') return; // mdBook's all-chapters print page
    wireButton();
    wireKnownButtons();
    wireChecklists();
    syncSidebar();
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', init);
    // Another tab can change done-state; keep the sidebar in step.
    window.addEventListener('storage', function () { syncSidebar(); });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      chapterKey: chapterKey,
      knownKey: knownKey,
      checkKey: checkKey,
      trackedKey: trackedKey,
      slugFromHref: slugFromHref,
      isDone: isDone,
      setDone: setDone,
      isKnown: isKnown,
      setKnown: setKnown,
      resolveTracked: resolveTracked,
      doneMessage: doneMessage,
    };
  }
})();
