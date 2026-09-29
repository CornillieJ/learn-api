// Multiple-choice quizzes: <div class="quiz" data-quiz> ... </div>
// Options become buttons with instant feedback, a wrong pick can be retried,
// and a per-page scoreboard counts first-try answers.
(function () {
  var LETTERS = 'ABCDEFGH';

  // results: array of null (unanswered) | 'first' (right on first try)
  //          | 'retry' (solved after a miss) | 'missed' (wrong, not yet solved)
  function scoreQuizzes(results) {
    var total = results.length, answered = 0, correct = 0, solved = 0;
    results.forEach(function (r) {
      if (r !== null && r !== undefined) answered++;
      if (r === 'first') correct++;
      if (r === 'first' || r === 'retry') solved++;
    });
    return {
      total: total,
      answered: answered,
      correct: correct,
      solved: solved,
      remaining: total - answered,
      complete: total > 0 && solved === total,
      perfect: total > 0 && correct === total,
    };
  }

  // Next state for one quiz after a pick.
  function nextResult(current, pickedCorrect) {
    if (current === 'first' || current === 'retry') return current;
    if (pickedCorrect) return current === 'missed' ? 'retry' : 'first';
    return 'missed';
  }

  function scoreMessage(s) {
    if (!s.total) return '';
    if (s.perfect) return 'Perfect score! ' + s.correct + '/' + s.total + ' on the first try.';
    if (s.complete) return 'All solved: ' + s.correct + '/' + s.total + ' on the first try. Reset and go again for a clean sweep?';
    if (!s.answered) return s.total + ' question' + (s.total === 1 ? '' : 's') + ' on this page. Pick an answer to start.';
    return s.correct + '/' + s.answered + ' right first time, ' + (s.total - s.solved) + ' to go.';
  }

  function wire() {
    var quizzes = Array.prototype.slice.call(document.querySelectorAll('[data-quiz]'));
    if (!quizzes.length) return;
    var results = quizzes.map(function () { return null; });
    var celebrated = false;

    // Scoreboard before the first quiz.
    var board = document.createElement('div');
    board.className = 'quiz-score';
    board.innerHTML = '<div class="qs-head"><span class="qs-chip"><span class="qs-icon" aria-hidden="true">?</span> Quiz <strong class="qs-num">0/' + quizzes.length + '</strong></span>' +
      '<span class="qs-dots"></span><button type="button" class="qs-reset">Reset</button></div>' +
      '<div class="qs-msg" aria-live="polite"></div>';
    quizzes[0].parentNode.insertBefore(board, quizzes[0]);
    var dots = board.querySelector('.qs-dots');
    quizzes.forEach(function (q, i) {
      var d = document.createElement('button');
      d.type = 'button';
      d.className = 'qs-dot';
      d.setAttribute('aria-label', 'Go to question ' + (i + 1));
      d.textContent = i + 1;
      d.addEventListener('click', function () {
        revealLevelOf(q);
        q.scrollIntoView({ behavior: 'smooth', block: 'center' });
        var first = q.querySelector('.quiz-opt:not([disabled])');
        if (first) first.focus({ preventScroll: true });
      });
      dots.appendChild(d);
    });

    // Result banner after the last quiz.
    var banner = document.createElement('div');
    banner.className = 'quiz-result';
    banner.hidden = true;
    var last = quizzes[quizzes.length - 1];
    last.parentNode.insertBefore(banner, last.nextSibling);

    function revealLevelOf(el) {
      var block = el.closest('.level');
      if (block && block.style.display === 'none') {
        var btn = document.querySelector('[data-levels] button[data-level="' +
          ['overview', 'deep', 'drill'].filter(function (l) { return block.classList.contains(l); })[0] + '"]');
        if (btn) btn.click();
      }
    }

    function update() {
      var s = scoreQuizzes(results);
      board.querySelector('.qs-num').textContent = s.correct + '/' + s.total;
      board.querySelector('.qs-msg').textContent = scoreMessage(s);
      board.classList.toggle('perfect', s.perfect);
      Array.prototype.forEach.call(dots.children, function (d, i) {
        d.setAttribute('data-state', results[i] || 'todo');
      });
      if (s.complete) {
        banner.hidden = false;
        banner.className = 'quiz-result' + (s.perfect ? ' perfect' : '');
        banner.innerHTML = '<div class="qr-big">' + s.correct + '<span>/' + s.total + '</span></div>' +
          '<div class="qr-text"><strong>' + (s.perfect ? 'Flawless.' : s.correct / s.total >= 0.6 ? 'Nice work.' : 'Good practice.') + '</strong> ' +
          (s.perfect ? 'Every question right on the first try.' : 'First-try score. Missed ones are worth a second read.') +
          '</div><button type="button" class="qr-again">Try again</button>';
        banner.querySelector('.qr-again').addEventListener('click', resetAll);
        if (s.perfect && !celebrated) {
          celebrated = true;
          var api = window.LearnApi;
          if (api && api.celebrate) api.celebrate(banner, { message: 'Perfect quiz score!', count: 110 });
        }
      } else {
        banner.hidden = true;
      }
    }

    function resetQuiz(q) {
      q.classList.remove('solved', 'missed');
      q.querySelectorAll('.quiz-opt').forEach(function (b) {
        b.disabled = false;
        b.classList.remove('is-correct', 'is-wrong', 'reveal');
        b.removeAttribute('aria-pressed');
      });
      var fb = q.querySelector('.quiz-feedback');
      if (fb) fb.textContent = '';
    }

    function resetAll() {
      results = results.map(function () { return null; });
      celebrated = false;
      quizzes.forEach(resetQuiz);
      update();
      revealLevelOf(quizzes[0]);
      board.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    board.querySelector('.qs-reset').addEventListener('click', resetAll);

    quizzes.forEach(function (q, qi) {
      q.setAttribute('role', 'group');
      var qText = q.querySelector('.quiz-q');
      if (qText) {
        var tag = document.createElement('span');
        tag.className = 'quiz-tag';
        tag.textContent = 'Question ' + (qi + 1) + ' of ' + quizzes.length;
        q.insertBefore(tag, q.firstChild);
        if (!qText.id) qText.id = 'quiz-q-' + qi;
        q.setAttribute('aria-labelledby', qText.id);
      }
      var explain = q.querySelector('.quiz-explain');
      var feedback = document.createElement('p');
      feedback.className = 'quiz-feedback';
      feedback.setAttribute('aria-live', 'polite');
      var list = q.querySelector('.quiz-options');
      if (list) list.parentNode.insertBefore(feedback, list.nextSibling);
      var opts = Array.prototype.slice.call(q.querySelectorAll('.quiz-options > li'));
      opts.forEach(function (li, oi) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quiz-opt';
        var correct = li.hasAttribute('data-correct');
        if (correct) btn.setAttribute('data-correct', '');
        var letter = document.createElement('span');
        letter.className = 'quiz-letter';
        letter.setAttribute('aria-hidden', 'true');
        letter.textContent = LETTERS[oi] || oi + 1;
        var body = document.createElement('span');
        body.className = 'quiz-opt-text';
        while (li.firstChild) body.appendChild(li.firstChild);
        btn.appendChild(letter);
        btn.appendChild(body);
        li.appendChild(btn);
        btn.addEventListener('click', function () { pick(btn, correct); });
      });

      function pick(btn, correct) {
        if (q.classList.contains('solved')) return;
        results[qi] = nextResult(results[qi], correct);
        btn.setAttribute('aria-pressed', 'true');
        if (correct) {
          btn.classList.add('is-correct');
          q.classList.remove('missed');
          q.classList.add('solved');
          q.querySelectorAll('.quiz-opt').forEach(function (b) { b.disabled = true; });
          feedback.textContent = results[qi] === 'first' ? pickOne(['Correct!', 'Spot on.', 'Yes! Nailed it.', 'Exactly right.']) : 'Got it on the retry.';
          feedback.setAttribute('data-kind', 'ok');
        } else {
          btn.classList.add('is-wrong');
          btn.disabled = true;
          q.classList.add('missed');
          feedback.textContent = pickOne(['Not quite, try another one.', 'Close, but no. Have another go.', 'Nope. Think about how the repo does it.']);
          feedback.setAttribute('data-kind', 'bad');
          var left = q.querySelectorAll('.quiz-opt:not([disabled])');
          if (left.length === 1) { left[0].focus(); }
        }
        update();
      }

      // Letter keys pick an option while focus is inside this quiz.
      q.addEventListener('keydown', function (e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        var idx = LETTERS.indexOf((e.key || '').toUpperCase());
        var btns = q.querySelectorAll('.quiz-opt');
        if (idx >= 0 && idx < btns.length && e.key.length === 1) {
          e.preventDefault();
          e.stopPropagation();
          if (!btns[idx].disabled) { btns[idx].focus(); btns[idx].click(); }
        }
      });
      if (explain) explain.setAttribute('aria-live', 'polite');
    });

    update();
  }

  function pickOne(list) { return list[Math.floor(Math.random() * list.length)]; }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', wire);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { scoreQuizzes: scoreQuizzes, nextResult: nextResult, scoreMessage: scoreMessage };
  }
})();
