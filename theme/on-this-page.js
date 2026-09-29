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

  var activeObserver = null;
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
    if (activeObserver) { activeObserver.disconnect(); activeObserver = null; }

    // offsetParent is null for headings hidden inside a non-active level tab
    var headingEls = Array.prototype.slice.call(main.querySelectorAll('h2, h3')).filter(function (h) {
      return h.offsetParent !== null;
    });
    var entries = headingsToToc(headingEls.map(function (h) {
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
    });
    nav.appendChild(label);
    nav.appendChild(ol);
    document.body.appendChild(nav);
    reposition(nav, main);

    if ('IntersectionObserver' in window) {
      var links = {};
      Array.prototype.slice.call(ol.querySelectorAll('li')).forEach(function (li) {
        links[li.querySelector('a').getAttribute('href').slice(1)] = li;
      });
      activeObserver = new IntersectionObserver(function (entriesObserved) {
        entriesObserved.forEach(function (entry) {
          if (entry.isIntersecting) {
            Object.keys(links).forEach(function (k) { links[k].classList.remove('active'); });
            var match = links[entry.target.id];
            if (match) match.classList.add('active');
          }
        });
      }, { rootMargin: '-20% 0px -70% 0px' });
      headingEls.forEach(function (h) { if (h.id) activeObserver.observe(h); });
    }
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
    window.addEventListener('scroll', repositionCurrent, { passive: true });
    // mdBook toggles a class on <html> when the reader opens/closes its own
    // chapter sidebar; that changes how much room is left for this nav.
    if ('MutationObserver' in window) {
      new MutationObserver(repositionCurrent).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { headingsToToc: headingsToToc };
  }
})();
