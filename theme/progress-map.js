// Journey map of the 7 steps: <div data-progress-map></div>
// Reads done-state from checkmarks.js's localStorage keys.
(function () {
  var STEPS = [
    { slug: 'step-1-java-syntax', short: 'Java syntax', hours: 3, blurb: 'C# to Java, fast' },
    { slug: 'step-2-maven', short: 'Maven', hours: 3, blurb: 'csproj + NuGet, Java style' },
    { slug: 'step-3-spring-mvc-war', short: 'Spring MVC & WAR', hours: 8, blurb: 'Controllers, DI, deployment' },
    { slug: 'step-4-persistence-hibernate', short: 'Hibernate & HQL', hours: 6, blurb: 'The EF Core of this repo' },
    { slug: 'step-5-spring-security', short: 'Spring Security', hours: 3, blurb: 'Filters and auth' },
    { slug: 'step-6-lombok', short: 'Lombok', hours: 2, blurb: 'Where the getters went' },
    { slug: 'step-7-ecosystem-audio', short: 'Ecosystem audio', hours: 0, blurb: 'Background listening' },
  ];

  function isDoneStored(slug) {
    try { return localStorage.getItem('learn-api:done:' + slug) === '1'; } catch (e) { return false; }
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

  function rootPath() {
    return (typeof path_to_root !== 'undefined' && path_to_root) ? path_to_root : ''; // eslint-disable-line no-undef
  }

  function currentSlug() {
    return location.pathname.replace(/^.*\//, '').replace(/\.html$/, '');
  }

  function render(root) {
    var flags = STEPS.map(function (s) { return isDoneStored(s.slug); });
    var st = journeyState(flags);
    var here = currentSlug();
    var html = '<div class="pm-head"><div class="pm-title">Your journey</div>' +
      '<div class="pm-stat"><strong>' + st.doneCount + '</strong> of ' + st.total + ' steps done</div>' +
      '<div class="pm-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + st.percent + '"><span style="width:' + st.percent + '%"></span></div></div>';
    html += '<ol class="pm-path">';
    STEPS.forEach(function (s, i) {
      var cls = flags[i] ? 'pm-done' : (i === st.nextIndex ? 'pm-next' : 'pm-todo');
      if (s.slug === here) cls += ' pm-here';
      var title = s.short;
      html += '<li class="pm-stop ' + cls + '"><a href="' + rootPath() + s.slug + '.html">' +
        '<span class="pm-node" aria-hidden="true">' + (flags[i] ? '&#10003;' : (i + 1)) + '</span>' +
        '<span class="pm-text"><span class="pm-step">Step ' + (i + 1) + '<span class="pm-h">' + (s.hours ? ' &middot; ~' + s.hours + 'h' : ' &middot; ongoing') + '</span></span>' +
        '<span class="pm-name">' + title + '</span>' +
        '<span class="pm-blurb">' + s.blurb + '</span></span>' +
        (i === st.nextIndex ? '<span class="pm-flag">Up next</span>' : '') +
        '<span class="pm-sr">' + (flags[i] ? ' (done)' : '') + '</span></a></li>';
    });
    html += '</ol>';
    if (st.allDone) {
      html += '<div class="pm-cta pm-finished"><span>Every step done. Time to ship some Java.</span>' +
        '<a class="pm-btn" href="' + rootPath() + 'cheat-sheet.html">Open the cheat sheet</a></div>';
    } else {
      var n = STEPS[st.nextIndex];
      var label = st.doneCount ? 'Continue where you left off' : 'Start the journey';
      html += '<div class="pm-cta"><a class="pm-btn" href="' + rootPath() + n.slug + '.html">' + label +
        ': Step ' + (st.nextIndex + 1) + ' <span aria-hidden="true">&rarr;</span></a></div>';
    }
    root.innerHTML = html;
    root.classList.add('pm-ready');
  }

  function wire() {
    var maps = document.querySelectorAll('[data-progress-map]');
    if (!maps.length) return;
    function all() { maps.forEach(render); }
    all();
    document.addEventListener('learn-api:done-changed', all);
    window.addEventListener('storage', all);
    window.addEventListener('pageshow', all);
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', wire);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { STEPS: STEPS, journeyState: journeyState };
  }
})();
