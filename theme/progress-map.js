// Progress map: a journey through your chapters, built from a plain markdown
// list inside a `data-progress-map` div (use MARKDOWN links so mdBook
// rewrites .md to .html):
//
//   <div data-progress-map>
//
//   - [Chapter one](chapter_1.md) Short blurb
//   - [Chapter two](chapter_2.md) Short blurb
//
//   </div>
//
// Optional attributes on the div: data-title ("Your progress"),
// data-label ("Chapter", the word before each stop's number),
// data-done-text (shown once every stop is done).
// Done-state is read from checkmarks.js's localStorage keys.
(function () {
  function prefix() {
    var c = typeof window !== 'undefined' && window.BookConfig;
    return (c && c.storagePrefix) || 'mybook';
  }

  function slugFromHref(href) {
    var s = String(href || '').replace(/[?#].*$/, '').replace(/^\.?\//, '').replace(/^.*\//, '').replace(/\.html$/, '');
    return s || 'index';
  }

  // "— Short blurb" / ": blurb" / "  blurb " -> "blurb"
  function cleanBlurb(text) {
    return String(text || '').replace(/\s+/g, ' ').replace(/^[\s\-–—:·|]+/, '').trim();
  }

  // Pure: one list item's parts -> a stop.
  function parseEntry(href, title, rest) {
    if (!href) return null;
    return { href: href, slug: slugFromHref(href), title: String(title || '').trim() || slugFromHref(href), blurb: cleanBlurb(rest) };
  }

  function isDoneStored(slug) {
    try { return localStorage.getItem(prefix() + ':done:' + slug) === '1'; } catch (e) { return false; }
  }

  // Pure: summary of a done-flags array.
  function journeyState(doneFlags) {
    var next = doneFlags.indexOf(false);
    var doneCount = doneFlags.filter(Boolean).length;
    return {
      doneCount: doneCount,
      total: doneFlags.length,
      nextIndex: next,            // -1 when everything is done
      allDone: next === -1 && doneFlags.length > 0,
      percent: doneFlags.length ? Math.round(100 * doneCount / doneFlags.length) : 0,
    };
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function readEntries(root) {
    var out = [];
    root.querySelectorAll('li').forEach(function (li) {
      var a = li.querySelector('a[href]');
      if (!a) return;
      var clone = li.cloneNode(true);
      var ca = clone.querySelector('a[href]');
      if (ca) ca.remove();
      // a.href is already resolved against the current page.
      var e = parseEntry(a.href, a.textContent, clone.textContent);
      if (e) out.push(e);
    });
    return out;
  }

  function currentSlug() { return slugFromHref(location.pathname); }

  function render(root, stops) {
    var flags = stops.map(function (s) { return isDoneStored(s.slug); });
    var st = journeyState(flags);
    var here = currentSlug();
    var title = root.getAttribute('data-title') || 'Your progress';
    var label = root.getAttribute('data-label') || 'Chapter';
    var html = '<div class="pm-head"><div class="pm-title">' + escapeHtml(title) + '</div>' +
      '<div class="pm-stat"><strong>' + st.doneCount + '</strong> of ' + st.total + ' done</div>' +
      '<div class="pm-meter" role="progressbar" aria-label="' + escapeHtml(title) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + st.percent + '"><span style="width:' + st.percent + '%"></span></div></div>';
    html += '<ol class="pm-path' + (stops.length > 7 ? ' pm-long' : '') + '" style="--pm-n:' + stops.length + '">';
    stops.forEach(function (s, i) {
      var cls = flags[i] ? 'pm-done' : (i === st.nextIndex ? 'pm-next' : 'pm-todo');
      if (s.slug === here) cls += ' pm-here';
      html += '<li class="pm-stop ' + cls + '"><a href="' + escapeHtml(s.href) + '">' +
        '<span class="pm-node" aria-hidden="true">' + (flags[i] ? '&#10003;' : (i + 1)) + '</span>' +
        '<span class="pm-text"><span class="pm-step">' + escapeHtml(label) + ' ' + (i + 1) + '</span>' +
        '<span class="pm-name">' + escapeHtml(s.title) + '</span>' +
        (s.blurb ? '<span class="pm-blurb">' + escapeHtml(s.blurb) + '</span>' : '') + '</span>' +
        (i === st.nextIndex ? '<span class="pm-flag">Up next</span>' : '') +
        '<span class="pm-sr">' + (flags[i] ? ' (done)' : '') + '</span></a></li>';
    });
    html += '</ol>';
    if (st.allDone) {
      html += '<div class="pm-cta pm-finished"><span class="pm-trophy" aria-hidden="true">&#9733;</span><span>' +
        escapeHtml(root.getAttribute('data-done-text') || 'Every chapter done. Nice work!') + '</span></div>';
    } else {
      var n = stops[st.nextIndex];
      var cta = st.doneCount ? 'Continue where you left off' : 'Start';
      html += '<div class="pm-cta"><a class="pm-btn" href="' + escapeHtml(n.href) + '">' + cta +
        ': ' + escapeHtml(n.title) + ' <span aria-hidden="true">&rarr;</span></a></div>';
    }
    root.innerHTML = html;
    root.classList.add('pm-ready');
  }

  function wire() {
    // mdBook's print.html inlines every page and rewrites links to in-page
    // anchors; leave the plain list alone there.
    if (currentSlug() === 'print') return;
    var maps = Array.prototype.slice.call(document.querySelectorAll('[data-progress-map]'));
    if (!maps.length) return;
    var parsed = maps.map(readEntries);
    // Remember which chapters the book tracks, so "N of M done" works on
    // chapter pages too (see checkmarks.js).
    try { localStorage.setItem(prefix() + ':tracked', JSON.stringify(parsed[0].map(function (s) { return s.slug; }))); } catch (e) {}
    function all() { maps.forEach(function (m, i) { if (parsed[i].length) render(m, parsed[i]); }); }
    all();
    document.addEventListener('book:done-changed', all);
    window.addEventListener('storage', all);
    window.addEventListener('pageshow', all);
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', wire);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { journeyState: journeyState, parseEntry: parseEntry, cleanBlurb: cleanBlurb, slugFromHref: slugFromHref };
  }
})();
