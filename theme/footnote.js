// Footnote popovers: standard Markdown footnotes...
//
//   A cache hit skips the origin server entirely[^cache-hit].
//
//   [^cache-hit]: A response saved so a later identical request can be
//   answered without hitting the origin server again.
//
// ...shown in a hover/focus popover instead of jumping to the bottom of the
// page. No new markup: mdBook/pulldown-cmark already renders `[^label]` as
// `<sup class="footnote-reference">` linking to a `<li id="footnote-label">`
// definition; this widget only changes what clicking that link does. The
// same popover mechanics as the glossary term widget. Without JavaScript a
// footnote reference is still a normal link that jumps to its definition.
(function () {
  // Pure: a footnote definition's innerHTML -> the same HTML with its
  // generated "jump back up" links (`<a href="#fr-...">`) removed, since
  // those only make sense at the bottom of the page.
  function stripBacklinks(html) {
    return String(html == null ? '' : html)
      .replace(/\s*<a[^>]*href="#fr-[^"]*"[^>]*>.*?<\/a>/gi, '')
      .trim();
  }

  var openState = null; // { trigger, popover }

  function closePopover() {
    if (!openState) return;
    openState.popover.remove();
    openState.trigger.setAttribute('aria-expanded', 'false');
    openState = null;
  }

  function positionPopover(trigger, popover) {
    document.body.appendChild(popover);
    var r = trigger.getBoundingClientRect();
    var pw = popover.offsetWidth;
    var ph = popover.offsetHeight;
    var left = Math.min(Math.max(8, r.left), window.innerWidth - pw - 8);
    var above = r.bottom + ph + 10 > window.innerHeight;
    var top = above ? r.top - ph - 8 : r.bottom + 8;
    popover.style.left = (left + window.scrollX) + 'px';
    popover.style.top = (top + window.scrollY) + 'px';
    popover.classList.toggle('fn-above', above);
  }

  function openPopover(trigger, html) {
    if (openState && openState.trigger === trigger) return;
    closePopover();
    var id = trigger.id || ('fn-trigger-' + Math.random().toString(36).slice(2));
    trigger.id = id;
    var popoverId = id + '-pop';
    var popover = document.createElement('div');
    popover.className = 'fn-popover';
    popover.id = popoverId;
    popover.setAttribute('role', 'tooltip');
    popover.innerHTML = html;
    trigger.setAttribute('aria-describedby', popoverId);
    trigger.setAttribute('aria-expanded', 'true');
    positionPopover(trigger, popover);
    openState = { trigger: trigger, popover: popover };
  }

  function wireRef(sup) {
    var link = sup.querySelector('a[href^="#footnote-"]');
    if (!link) return;
    var defEl = document.getElementById(link.getAttribute('href').slice(1));
    if (!defEl) return;
    var html = stripBacklinks(defEl.innerHTML);
    if (!html) return;

    sup.classList.add('fn-ref');
    link.setAttribute('aria-expanded', 'false');

    var hoverTimer = null;
    function scheduleOpen() {
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(function () { openPopover(link, html); }, 120);
    }
    function scheduleClose() {
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(function () {
        if (openState && openState.trigger === link) closePopover();
      }, 150);
    }

    link.addEventListener('mouseenter', scheduleOpen);
    link.addEventListener('mouseleave', scheduleClose);
    link.addEventListener('focus', function () { openPopover(link, html); });
    link.addEventListener('blur', function () {
      setTimeout(function () {
        if (openState && openState.trigger === link) closePopover();
      }, 0);
    });
    link.addEventListener('click', function (e) {
      e.preventDefault();
      if (openState && openState.trigger === link) closePopover();
      else openPopover(link, html);
    });
  }

  function wireGlobalClose() {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && openState) {
        openState.trigger.focus();
        closePopover();
      }
    });
    document.addEventListener('click', function (e) {
      if (openState && e.target !== openState.trigger && !openState.trigger.contains(e.target)) closePopover();
    });
    window.addEventListener('scroll', closePopover, true);
    window.addEventListener('resize', closePopover);
  }

  function wire() {
    var refs = document.querySelectorAll('sup.footnote-reference');
    if (!refs.length) return;
    refs.forEach(wireRef);
    wireGlobalClose();
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', wire);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { stripBacklinks: stripBacklinks };
  }
})();
