(function () {
  // Flat, ordered list — matches https://github.com/CornillieJ/sa's guide
  // nav (section.chapter + data-title, numbered 01/02/...). Our headings
  // are all one level (h3) in practice, so no depth/indentation to track.
  function headingsToToc(headings) {
    var withIds = headings.filter(function (h) { return h.id; });
    if (withIds.length < 2) return [];
    return withIds.map(function (h) {
      return { id: h.id, text: h.textContent };
    });
  }

  // Given each heading's current top position (viewport px, in document
  // order) and a trigger line, returns the index of the last heading at or
  // above that line — i.e. "which section the reader is currently in."
  // Returns -1 if every heading is still below the line.
  //
  // This is deliberately NOT an IntersectionObserver watching the headings
  // themselves: sa's guide (https://github.com/CornillieJ/sa) observes
  // whole `section.chapter` blocks, which are tall enough to overlap its
  // trigger band no matter where a reader lands. Our headings are single
  // thin lines (~25px) — a click-triggered jump lands one at/near the very
  // top of the viewport, which never overlaps a band that starts lower
  // down, so the equivalent IntersectionObserver setup never fires on
  // click, only on some later manual scroll. A threshold crossing-point
  // check has no minimum-height requirement and is correct immediately
  // after a click as well as during an ordinary scroll.
  function activeIndexFromTops(tops, threshold) {
    var idx = -1;
    for (var i = 0; i < tops.length; i++) {
      if (tops[i] <= threshold) idx = i; else break;
    }
    return idx;
  }

  var TRIGGER_LINE = 160; // px from the top of the viewport
  var headingEls = [];
  var tocLis = [];

  function updateActive() {
    var tops = headingEls.map(function (h) { return h.getBoundingClientRect().top; });
    var activeIndex = activeIndexFromTops(tops, TRIGGER_LINE);
    tocLis.forEach(function (li, i) { li.classList.toggle('active', i === activeIndex); });
  }

  var NAV_WIDTH = 208; // px, matches .toc's CSS width (13rem)
  var GAP = 24; // px, breathing room between the real sidebar/content and this nav
  var MIN_LEFT = 16; // px, don't pin the nav closer than this to the viewport edge

  // Positions the nav in the empty gutter to the left of the centered
  // content column, fixed in place (not floated, not scrolling with the
  // page). Hides itself if there isn't enough room — e.g. narrow viewports,
  // or mdBook's own chapter sidebar is open and would overlap it.
  function reposition(nav, main) {
    var mainLeft = main.getBoundingClientRect().left;
    var sidebarRight = 0;
    var sidebarEl = document.querySelector('#mdbook-sidebar');
    if (sidebarEl && getComputedStyle(sidebarEl).display !== 'none') {
      sidebarRight = sidebarEl.getBoundingClientRect().right;
    }
    var left = mainLeft - GAP - NAV_WIDTH;
    if (left < Math.max(MIN_LEFT, sidebarRight + GAP)) {
      nav.style.display = 'none';
      return;
    }
    nav.style.display = '';
    nav.style.left = left + 'px';
    // Sit below both mdBook's own top menu bar (which exists in the DOM
    // even when scrolled out of view — it reveals itself again on
    // scroll-up, so check where it actually is, not just whether the
    // element exists) and this page's own fixed level-tabs bar, if present.
    var menuBar = document.querySelector('#mdbook-menu-bar');
    var menuBarBottom = menuBar ? Math.max(0, menuBar.getBoundingClientRect().bottom) : 0;
    var tabs = document.querySelector('.level-tabs');
    var tabsBottom = tabs ? Math.max(0, tabs.getBoundingClientRect().bottom) : 0;
    nav.style.top = (Math.max(menuBarBottom, tabsBottom) + 16) + 'px';
  }

  function build() {
    var main = document.querySelector('#mdbook-content main');
    if (!main) return;
    var previous = document.body.querySelector('nav.toc');
    if (previous) previous.remove();
    headingEls = [];
    tocLis = [];

    // offsetParent is null for headings hidden inside a non-active level tab
    var visibleHeadingEls = Array.prototype.slice.call(main.querySelectorAll('h2, h3')).filter(function (h) {
      return h.offsetParent !== null;
    });
    var entries = headingsToToc(visibleHeadingEls.map(function (h) {
      return { id: h.id, textContent: h.textContent };
    }));
    if (!entries.length) return;

    var nav = document.createElement('nav');
    nav.className = 'toc';
    nav.setAttribute('aria-label', 'Contents');
    var label = document.createElement('div');
    label.className = 'toc-label';
    label.textContent = 'On this page';
    var ol = document.createElement('ol');
    ol.id = 'tocList';
    entries.forEach(function (e, i) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.setAttribute('href', '#' + e.id);
      var n = document.createElement('span');
      n.className = 'n';
      n.textContent = ('0' + (i + 1)).slice(-2);
      a.appendChild(n);
      a.appendChild(document.createTextNode(e.text));
      li.appendChild(a);
      ol.appendChild(li);
      headingEls.push(document.getElementById(e.id));
      tocLis.push(li);
    });
    nav.appendChild(label);
    nav.appendChild(ol);
    document.body.appendChild(nav);
    reposition(nav, main);
    updateActive();
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', build);
    document.addEventListener('learn-api:level-changed', build);
    var repositionCurrent = function () {
      var nav = document.body.querySelector('nav.toc');
      var main = document.querySelector('#mdbook-content main');
      if (nav && main) reposition(nav, main);
    };
    window.addEventListener('resize', repositionCurrent);
    window.addEventListener('resize', updateActive);
    window.addEventListener('scroll', repositionCurrent, { passive: true });
    window.addEventListener('scroll', updateActive, { passive: true });
    // Clicking a toc/sidebar link to a same-page #fragment moves the
    // reader without necessarily firing a 'scroll' event our listener
    // above can react to in time — same underlying issue levels.js's
    // revealTarget works around for level-switching. Recompute directly
    // once the browser's own jump has settled.
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href*="#"]');
      if (!a || a.pathname !== location.pathname) return;
      setTimeout(updateActive, 0);
    });
    window.addEventListener('hashchange', function () {
      setTimeout(updateActive, 0);
    });
    // mdBook toggles a class on <html> when the reader opens/closes its own
    // chapter sidebar; that changes how much room is left for this nav.
    if ('MutationObserver' in window) {
      new MutationObserver(repositionCurrent).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { headingsToToc: headingsToToc, activeIndexFromTops: activeIndexFromTops };
  }
})();
