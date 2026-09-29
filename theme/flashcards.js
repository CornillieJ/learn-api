// Flashcard decks: <div class="flashcards" data-flashcards><div class="card">
// <div class="front">..</div><div class="back">..</div></div>...</div>
// One card at a time; flip with click/Space; "Again" re-queues, "Got it"
// removes the card from the round.
(function () {
  function shuffle(arr, rand) {
    rand = rand || Math.random;
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function range(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; }

  function makeDeck(n, order) {
    return { total: n, queue: order ? order.slice() : range(n), known: [], again: 0 };
  }

  function current(deck) { return deck.queue.length ? deck.queue[0] : null; }

  function gotIt(deck) {
    if (!deck.queue.length) return deck;
    return { total: deck.total, queue: deck.queue.slice(1), known: deck.known.concat(deck.queue[0]), again: deck.again };
  }

  function again(deck) {
    if (!deck.queue.length) return deck;
    return { total: deck.total, queue: deck.queue.slice(1).concat(deck.queue[0]), known: deck.known.slice(), again: deck.again + 1 };
  }

  function isFinished(deck) { return deck.total > 0 && deck.queue.length === 0; }

  function progressLabel(deck) { return deck.known.length + ' / ' + deck.total; }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  var deckCount = 0;

  function wireDeck(root) {
    var cards = Array.prototype.slice.call(root.querySelectorAll('.card')).map(function (c) {
      var f = c.querySelector('.front'), b = c.querySelector('.back');
      return { front: f ? f.innerHTML : '', back: b ? b.innerHTML : '' };
    });
    if (!cards.length) return;
    var id = 'fc-' + (deckCount++);
    root.innerHTML = '';
    root.classList.add('fc-ready');
    root.setAttribute('tabindex', '0');
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', 'Flashcards: ' + cards.length + ' cards. Space flips, right arrow for got it, left arrow for again.');

    var top = el('div', 'fc-top');
    top.innerHTML = '<span class="fc-title">Flashcards</span>' +
      '<span class="fc-progress"><span class="fc-bar"><span class="fc-fill"></span></span><span class="fc-count"></span></span>' +
      '<span class="fc-tools"><button type="button" class="fc-shuffle" title="Shuffle (S)">Shuffle</button>' +
      '<button type="button" class="fc-restart" title="Restart (R)">Restart</button></span>';
    var stage = el('div', 'fc-stage');
    var card = el('div', 'fc-card');
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '-1');
    card.setAttribute('aria-pressed', 'false');
    card.innerHTML = '<div class="fc-inner">' +
      '<div class="fc-face fc-front"><span class="fc-side">C# / .NET</span><div class="fc-body"></div><span class="fc-tap">tap to flip</span></div>' +
      '<div class="fc-face fc-back"><span class="fc-side">Java / Spring</span><div class="fc-body"></div></div></div>';
    stage.appendChild(card);
    var actions = el('div', 'fc-actions');
    actions.innerHTML = '<button type="button" class="fc-again"><kbd>&larr;</kbd> Again</button>' +
      '<button type="button" class="fc-flip"><kbd>Space</kbd> Flip</button>' +
      '<button type="button" class="fc-got"><kbd>&rarr;</kbd> Got it</button>';
    var done = el('div', 'fc-done');
    done.hidden = true;
    var live = el('div', 'fc-live');
    live.setAttribute('aria-live', 'polite');
    live.className = 'fc-sr';
    root.appendChild(top);
    root.appendChild(stage);
    root.appendChild(actions);
    root.appendChild(done);
    root.appendChild(live);

    var deck = makeDeck(cards.length);
    var flipped = false;

    function render(animate) {
      var fill = top.querySelector('.fc-fill');
      fill.style.width = (100 * deck.known.length / deck.total) + '%';
      top.querySelector('.fc-count').textContent = progressLabel(deck) + ' known';
      if (isFinished(deck)) {
        stage.hidden = true; actions.hidden = true; done.hidden = false;
        var flawless = deck.again === 0;
        done.innerHTML = '<div class="fc-done-big">' + (flawless ? 'Clean sweep!' : 'Deck complete!') + '</div>' +
          '<p>' + deck.total + ' cards, ' + (flawless ? 'no repeats needed.' : deck.again + ' repeat' + (deck.again === 1 ? '' : 's') + ' along the way.') + '</p>' +
          '<button type="button" class="fc-restart2">Go again (shuffled)</button>';
        done.querySelector('.fc-restart2').addEventListener('click', function () { restart(true); });
        var api = window.LearnApi;
        if (api && api.celebrate) api.celebrate(done, { message: flawless ? 'Flashcards: clean sweep!' : 'Deck complete!' });
        live.textContent = 'Deck complete.';
        return;
      }
      stage.hidden = false; actions.hidden = false; done.hidden = true;
      var c = cards[current(deck)];
      card.querySelector('.fc-front .fc-body').innerHTML = c.front;
      card.querySelector('.fc-back .fc-body').innerHTML = c.back;
      setFlipped(false, true);
      if (animate) {
        card.classList.remove('fc-enter');
        void card.offsetWidth;
        card.classList.add('fc-enter');
      }
      live.textContent = 'Card: ' + card.querySelector('.fc-front .fc-body').textContent;
    }

    function setFlipped(v, silent) {
      flipped = v;
      card.classList.toggle('is-flipped', v);
      card.setAttribute('aria-pressed', v ? 'true' : 'false');
      root.classList.toggle('fc-answer-shown', v);
      if (v && !silent) live.textContent = 'Answer: ' + card.querySelector('.fc-back .fc-body').textContent;
    }

    function flip() { if (!isFinished(deck)) setFlipped(!flipped); }
    function onGot() {
      if (isFinished(deck)) return;
      if (!flipped) { setFlipped(true); return; }
      card.classList.add('fc-out-right');
      setTimeout(function () { card.classList.remove('fc-out-right'); deck = gotIt(deck); render(true); }, reduced() ? 0 : 180);
    }
    function onAgain() {
      if (isFinished(deck)) return;
      if (!flipped) { setFlipped(true); return; }
      card.classList.add('fc-out-left');
      setTimeout(function () { card.classList.remove('fc-out-left'); deck = again(deck); render(true); }, reduced() ? 0 : 180);
    }
    function restart(shuffled) {
      deck = makeDeck(cards.length, shuffled ? shuffle(range(cards.length)) : null);
      render(true);
      root.focus({ preventScroll: true });
    }
    function reduced() { return window.LearnApi && window.LearnApi.prefersReducedMotion && window.LearnApi.prefersReducedMotion(); }

    card.addEventListener('click', flip);
    actions.querySelector('.fc-flip').addEventListener('click', flip);
    actions.querySelector('.fc-got').addEventListener('click', onGot);
    actions.querySelector('.fc-again').addEventListener('click', onAgain);
    top.querySelector('.fc-shuffle').addEventListener('click', function () {
      if (isFinished(deck)) { restart(true); return; }
      deck = { total: deck.total, queue: shuffle(deck.queue), known: deck.known, again: deck.again };
      render(true);
    });
    top.querySelector('.fc-restart').addEventListener('click', function () { restart(false); });

    root.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var t = e.target;
      // Let real buttons handle their own Space/Enter.
      var onButton = t && t.tagName === 'BUTTON';
      var k = e.key;
      var handled = true;
      if ((k === ' ' || k === 'Enter') && !onButton) flip();
      else if (k === 'ArrowRight' || k === 'k' || k === 'g') onGot();
      else if (k === 'ArrowLeft' || k === 'j' || k === 'a') onAgain();
      else if (k === 's' || k === 'S') top.querySelector('.fc-shuffle').click();
      else if (k === 'r' || k === 'R') restart(false);
      else handled = false;
      if (handled) { e.preventDefault(); e.stopPropagation(); }
    });

    render(false);
  }

  function wire() {
    document.querySelectorAll('[data-flashcards]').forEach(wireDeck);
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', wire);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      shuffle: shuffle, makeDeck: makeDeck, current: current, gotIt: gotIt, again: again,
      isFinished: isFinished, progressLabel: progressLabel,
    };
  }
})();
