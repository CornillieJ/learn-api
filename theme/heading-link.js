// Copy-link-to-heading: every h2/h3/h4 with an id (mdBook gives every
// heading one automatically) gets a small link icon, visible on hover or
// focus, that copies that heading's URL to the clipboard.
//
// Global, no authored markup. Without JavaScript the headings are
// unchanged; the ids are still there for anyone who copies the page's own
// URL bar after clicking a heading link elsewhere.
(function () {
  // Pure: the current page URL + a heading id -> that heading's shareable
  // URL, replacing whatever hash (if any) is already there.
  function buildHeadingUrl(href, id) {
    return String(href || '').replace(/#.*$/, '') + '#' + id;
  }

  function wireHeading(h) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hl-link';
    btn.setAttribute('aria-label', 'Copy link to this section');
    btn.innerHTML = '<span aria-hidden="true">🔗</span>';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var url = buildHeadingUrl(location.href, h.id);
      var done = function () {
        btn.classList.add('hl-copied');
        setTimeout(function () { btn.classList.remove('hl-copied'); }, 1200);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, done);
      } else {
        done();
      }
    });
    h.classList.add('hl-heading');
    h.appendChild(btn);
  }

  function wire() {
    var main = document.querySelector('#mdbook-content main') || document.querySelector('main');
    if (!main) return;
    main.querySelectorAll('h2[id], h3[id], h4[id]').forEach(wireHeading);
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', wire);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { buildHeadingUrl: buildHeadingUrl };
  }
})();
