// Branching scenario: a "what would you do?" prompt with 2-4 choices, each
// leading to another prompt or an ending, inside a `data-scenario` div:
//
//   <div class="scenario" data-scenario data-start="alert-fires">
//
//   <div class="sc-node" data-node="alert-fires">
//   <p class="sc-prompt">A paging alert fires. What do you check first?</p>
//   <ul class="sc-choices">
//   <li data-goto="check-deploys">Recent deploys</li>
//   <li data-goto="check-db">Database load</li>
//   </ul>
//   </div>
//
//   <div class="sc-node" data-node="check-db" data-end>
//   <p class="sc-result">Database load is normal.</p>
//   </div>
//
//   </div>
//
// Nodes are a FLAT list (not nested), each addressed by data-node and
// reached via a choice's data-goto. A node with data-end has no choices
// and shows "Start over" instead; add data-good to trigger a toast via
// celebrate.js. A breadcrumb trail above the current node tracks the path
// taken; clicking an earlier crumb jumps back and abandons anything after
// it. Choices are picked by click or the same letter keys (A, B, ...) the
// quiz widget uses.
(function () {
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Pure: raw node data (plain objects, not live elements) -> a lookup
  // graph keyed by slug. Nodes with no slug are skipped.
  function buildGraph(raw) {
    var graph = {};
    (raw || []).forEach(function (n) {
      var slug = String(n.slug || '').trim();
      if (!slug) return;
      graph[slug] = {
        prompt: n.prompt || '',
        result: n.result || '',
        end: !!n.end,
        good: !!n.good,
        choices: (n.choices || []).map(function (c) {
          return { label: c.label || '', goto: String(c.goto || '').trim() };
        }).filter(function (c) { return c.goto; }),
      };
    });
    return graph;
  }

  // Pure: walk `graph` from `startSlug`, following each goto in
  // `choiceGotos` in turn. Stops (without throwing) at a missing node, an
  // ending, or once choiceGotos runs out. Returns the slugs visited.
  function resolvePath(graph, startSlug, choiceGotos) {
    var path = [];
    var cur = startSlug;
    var i = 0;
    while (cur && graph[cur]) {
      path.push(cur);
      var node = graph[cur];
      if (node.end) break;
      var goto_ = (choiceGotos || [])[i++];
      if (goto_ === undefined) break;
      var valid = node.choices.some(function (c) { return c.goto === goto_; });
      if (!valid) break;
      cur = goto_;
    }
    return path;
  }

  function parseNodeEl(el) {
    var choices = Array.prototype.slice.call(el.querySelectorAll(':scope > .sc-choices > li')).map(function (li) {
      return { label: li.innerHTML.trim(), goto: li.getAttribute('data-goto') };
    });
    var prompt = el.querySelector(':scope > .sc-prompt');
    var result = el.querySelector(':scope > .sc-result');
    return {
      slug: el.getAttribute('data-node'),
      prompt: prompt ? prompt.innerHTML.trim() : '',
      result: result ? result.innerHTML.trim() : '',
      end: el.hasAttribute('data-end'),
      good: el.hasAttribute('data-good'),
      choices: choices,
    };
  }

  var LETTERS = 'ABCDEFGH';

  function wireOne(root) {
    var start = root.getAttribute('data-start');
    var nodeEls = Array.prototype.slice.call(root.querySelectorAll(':scope > .sc-node'));
    if (!start || !nodeEls.length) return;
    var graph = buildGraph(nodeEls.map(parseNodeEl));
    if (!graph[start]) return;
    nodeEls.forEach(function (el) { el.remove(); });

    root.classList.add('sc-ready');
    var crumbs = document.createElement('div');
    crumbs.className = 'sc-crumbs';
    crumbs.setAttribute('aria-label', 'Path so far');
    var stage = document.createElement('div');
    stage.className = 'sc-stage';
    stage.setAttribute('aria-live', 'polite');
    root.appendChild(crumbs);
    root.appendChild(stage);

    var path = [start];

    function crumbLabel(slug) {
      var node = graph[slug];
      var text = node.prompt || node.result || slug;
      var tmp = document.createElement('div');
      tmp.innerHTML = text;
      return (tmp.textContent || slug).trim();
    }

    // Only the PAST steps are shown — the current node's prompt/result is
    // already on the stage right below, so a "current" crumb would just
    // repeat it. With one node visited so far there's nothing to show yet.
    function renderCrumbs() {
      var past = path.slice(0, -1);
      if (!past.length) { crumbs.innerHTML = ''; crumbs.hidden = true; return; }
      crumbs.hidden = false;
      crumbs.innerHTML = past.map(function (slug, i) {
        var label = escapeHtml(crumbLabel(slug));
        return '<button type="button" class="sc-crumb" data-sc-jump="' + i + '">' + label + '</button><span class="sc-crumb-sep" aria-hidden="true">›</span>';
      }).join('');
      crumbs.querySelectorAll('[data-sc-jump]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var i = Number(btn.getAttribute('data-sc-jump'));
          path = path.slice(0, i + 1);
          render();
        });
      });
    }

    function render() {
      renderCrumbs();
      var node = graph[path[path.length - 1]];
      var html = '';
      if (node.result) html += '<p class="sc-result">' + node.result + '</p>';
      if (node.end) {
        html += '<button type="button" class="sc-restart">Start over</button>';
        stage.innerHTML = html;
        stage.querySelector('.sc-restart').addEventListener('click', function () {
          path = [start];
          render();
          root.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        if (node.good) {
          var api = window.Book;
          if (api && api.toast) api.toast('Nice call!', 'ok');
        }
        return;
      }
      html += '<p class="sc-prompt">' + node.prompt + '</p><ul class="sc-choices" role="group">' +
        node.choices.map(function (c, i) {
          return '<li><button type="button" class="sc-choice" data-goto="' + escapeHtml(c.goto) + '">' +
            '<span class="sc-letter" aria-hidden="true">' + (LETTERS[i] || i + 1) + '</span>' +
            '<span class="sc-choice-text">' + c.label + '</span></button></li>';
        }).join('') + '</ul>';
      stage.innerHTML = html;
      stage.querySelectorAll('.sc-choice').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var goto_ = btn.getAttribute('data-goto');
          if (!graph[goto_]) return;
          path.push(goto_);
          render();
        });
      });
    }

    // Attached once: re-reads the current choice buttons from `stage` on
    // every keypress instead of being re-registered (and piling up) per render.
    stage.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
      var idx = LETTERS.indexOf(e.key.toUpperCase());
      var btns = stage.querySelectorAll('.sc-choice');
      if (idx >= 0 && idx < btns.length) {
        e.preventDefault();
        btns[idx].click();
      }
    });

    render();
  }

  function wire() {
    document.querySelectorAll('[data-scenario]').forEach(wireOne);
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', wire);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { buildGraph: buildGraph, resolvePath: resolvePath, escapeHtml: escapeHtml };
  }
})();
