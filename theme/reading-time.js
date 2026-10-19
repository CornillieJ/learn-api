// Reading time: a small "~N min read" badge injected right after a
// chapter's title. Global, no authored markup: it's computed from the
// page's own text every time it loads.
//
// Code blocks (`<pre>`) are excluded from the word count; a 40-line
// snippet isn't 40 lines of reading. Everything else on the page counts,
// including content inside level tabs that isn't currently visible (a
// chapter's Overview/Deep/Drill levels are usually similar in length, and
// reading only the visible level would make the estimate change every time
// the reader switches levels).
(function () {
  var WPM = 200; // words per minute, a commonly used average for English prose

  // Pure: raw text -> word count (whitespace-separated runs).
  function countWords(text) {
    var matches = String(text == null ? '' : text).match(/\S+/g);
    return matches ? matches.length : 0;
  }

  // Pure: word count -> minutes, rounded, never less than 1.
  function estimateMinutes(wordCount, wpm) {
    wpm = wpm > 0 ? wpm : WPM;
    return Math.max(1, Math.round(wordCount / wpm));
  }

  function wire() {
    var main = document.querySelector('#mdbook-content main') || document.querySelector('main');
    if (!main) return;
    var h1 = main.querySelector('h1');
    if (!h1) return;

    var clone = main.cloneNode(true);
    clone.querySelectorAll('pre').forEach(function (pre) { pre.remove(); });
    var minutes = estimateMinutes(countWords(clone.textContent), WPM);

    var badge = document.createElement('p');
    badge.className = 'rd-time';
    badge.textContent = '~' + minutes + ' min read';
    h1.insertAdjacentElement('afterend', badge);
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', wire);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { countWords: countWords, estimateMinutes: estimateMinutes };
  }
})();
