// "Was this page helpful?": thumbs up/down, author-placed once per page.
// A "No" reveals an optional comment box before submitting. The reader's
// vote is remembered (so the question doesn't reappear), the same
// per-browser localStorage approach as the rest of the theme.
//
//   <div class="page-feedback" data-page-feedback></div>
//
// Optional `data-webhook="https://example.com/feedback"`: on submit, POSTs
// `{ slug, vote, comment }` as JSON (fire-and-forget; a failed request
// doesn't block the thank-you message, since the vote is already saved
// locally). Without a webhook the vote is still recorded locally; wire one
// up if you want to actually collect it somewhere.
(function () {
  function prefix() {
    var c = typeof window !== 'undefined' && window.BookConfig;
    return (c && c.storagePrefix) || 'mybook';
  }

  // Pure: the localStorage key for a page's feedback record.
  function feedbackKey(slug) { return prefix() + ':feedback:' + slug; }

  // Pure: trim a comment and cap its length so a runaway paste can't bloat
  // localStorage or a webhook payload.
  function clampComment(text, max) {
    max = max || 2000;
    return String(text == null ? '' : text).trim().slice(0, max);
  }

  // Pure: the JSON-ready payload sent to an optional webhook.
  function buildPayload(slug, vote, comment) {
    return { slug: slug, vote: vote, comment: clampComment(comment) };
  }

  function slugFromHref(href) {
    var s = String(href || '').replace(/[?#].*$/, '').replace(/^\.?\//, '').replace(/^.*\//, '').replace(/\.html$/, '');
    return s || 'index';
  }
  function currentSlug() { return slugFromHref(location.pathname); }

  function readRecord(slug) {
    try { return JSON.parse(localStorage.getItem(feedbackKey(slug)) || 'null'); } catch (e) { return null; }
  }
  function writeRecord(slug, record) {
    try { localStorage.setItem(feedbackKey(slug), JSON.stringify(record)); } catch (e) {}
  }

  function sendWebhook(url, payload) {
    if (!url) return;
    try {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(function () {});
    } catch (e) {}
  }

  function renderThanks(root) {
    root.innerHTML = '<p class="pf-thanks">Thanks for the feedback!</p>';
  }

  function renderPrompt(root, slug, webhook) {
    root.innerHTML =
      '<p class="pf-question">Was this page helpful?</p>' +
      '<div class="pf-votes">' +
      '<button type="button" class="pf-vote" data-vote="yes" aria-label="Yes, this page was helpful">👍 Yes</button>' +
      '<button type="button" class="pf-vote" data-vote="no" aria-label="No, this page was not helpful">👎 No</button>' +
      '</div>';

    function submit(vote, comment) {
      var record = { vote: vote, comment: clampComment(comment) };
      writeRecord(slug, record);
      sendWebhook(webhook, buildPayload(slug, vote, comment));
      renderThanks(root);
      var api = window.Book;
      if (api && api.toast) api.toast('Thanks for the feedback!');
    }

    root.querySelector('[data-vote="yes"]').addEventListener('click', function () {
      submit('yes', '');
    });
    root.querySelector('[data-vote="no"]').addEventListener('click', function () {
      root.innerHTML =
        '<p class="pf-question">Sorry to hear that. What went wrong? (optional)</p>' +
        '<textarea class="pf-comment" rows="3" placeholder="What were you looking for?"></textarea>' +
        '<div class="pf-actions">' +
        '<button type="button" class="pf-send">Send</button>' +
        '<button type="button" class="pf-skip">Skip</button>' +
        '</div>';
      root.querySelector('.pf-send').addEventListener('click', function () {
        submit('no', root.querySelector('.pf-comment').value);
      });
      root.querySelector('.pf-skip').addEventListener('click', function () {
        submit('no', '');
      });
    });
  }

  function wireOne(root) {
    root.classList.add('pf-ready');
    var slug = currentSlug();
    var webhook = root.getAttribute('data-webhook') || '';
    var existing = readRecord(slug);
    if (existing) renderThanks(root);
    else renderPrompt(root, slug, webhook);
  }

  function wire() {
    document.querySelectorAll('[data-page-feedback]').forEach(wireOne);
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', wire);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { feedbackKey: feedbackKey, clampComment: clampComment, buildPayload: buildPayload };
  }
})();
