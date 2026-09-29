(function () {
  function headingsToToc(headings) {
    var withIds = headings.filter(function (h) { return h.id; });
    if (withIds.length < 2) return [];
    return withIds.map(function (h) {
      return { id: h.id, text: h.textContent, depth: h.tagName === 'H3' ? 3 : 2 };
    });
  }

  var activeObserver = null;

  function build() {
    var main = document.querySelector('#mdbook-content main');
    if (!main) return;
    var previous = main.parentElement.querySelector('nav.otp-nav');
    if (previous) previous.remove();
    if (activeObserver) { activeObserver.disconnect(); activeObserver = null; }

    // offsetParent is null for headings hidden inside a non-active level tab
    var headingEls = Array.prototype.slice.call(main.querySelectorAll('h2, h3')).filter(function (h) {
      return h.offsetParent !== null;
    });
    var entries = headingsToToc(headingEls.map(function (h) {
      return { id: h.id, tagName: h.tagName, textContent: h.textContent };
    }));
    if (!entries.length) return;

    var nav = document.createElement('nav');
    nav.className = 'otp-nav';
    var label = document.createElement('div');
    label.className = 'otp-label';
    label.textContent = 'On this page';
    var ol = document.createElement('ol');
    entries.forEach(function (e) {
      var li = document.createElement('li');
      li.setAttribute('data-depth', String(e.depth));
      var a = document.createElement('a');
      a.setAttribute('href', '#' + e.id);
      a.textContent = e.text;
      li.appendChild(a);
      ol.appendChild(li);
    });
    nav.appendChild(label);
    nav.appendChild(ol);
    main.parentElement.insertBefore(nav, main);

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
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { headingsToToc: headingsToToc };
  }
})();
