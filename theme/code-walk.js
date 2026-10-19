// Code walkthrough: a fenced code block with numbered callouts, built from
// a single code block plus a plain ordered list, inside a `data-code-walk`
// div:
//
//   <div class="code-walk" data-code-walk>
//
//   ```js
//   function clamp(value, min, max) { // (1)
//     if (value < min) return min;    // (2)
//     return value;
//   }
//   ```
//
//   1. First note.
//   2. Second note.
//
//   </div>
//
// Mark the annotated line with a trailing comment containing `(N)` — any of
// `//`, `#`, `--`, `;`, `%`, `/* */`, `<!-- -->` is recognized, so it works
// across languages. N is 1-based and must match that item's position in the
// list below the code block. The marker text stays in the code (so it still
// copies cleanly via mdBook's copy button only once stripped — see below);
// each one becomes a small clickable badge in place.
(function () {
  // One alternation, one capture group (the number), matched anywhere in a
  // text node. Block/HTML comments must close; line comments run to EOL.
  var MARKER = /(?:\/\/|#|--|;|%)[ \t]*\((\d+)\)[ \t]*(?=\n|$)|\/\*[ \t]*\((\d+)\)[ \t]*\*\/|<!--[ \t]*\((\d+)\)[ \t]*-->/g;

  // Pure: find every marker in a plain-text code string.
  // -> [{ number, start, end }], end exclusive, in source order.
  function findMarkers(text) {
    var out = [];
    var re = new RegExp(MARKER.source, 'g');
    var m;
    while ((m = re.exec(String(text || '')))) {
      var n = parseInt(m[1] || m[2] || m[3], 10);
      out.push({ number: n, start: m.index, end: m.index + m[0].length });
    }
    return out;
  }

  // Pure: badges found in the code vs. the note list -> what to render.
  // Badges with no matching note, and notes with no matching badge, are
  // dropped rather than thrown: a typo shouldn't break the whole widget.
  function pairUp(markers, noteCount) {
    var seen = {};
    var pairs = [];
    markers.forEach(function (mk) {
      if (mk.number >= 1 && mk.number <= noteCount && !seen[mk.number]) {
        seen[mk.number] = true;
        pairs.push(mk);
      }
    });
    return pairs;
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Split a text node at [start, end) into before/after, replacing the
  // middle with `el`. Returns the node after `el` (for further splitting).
  function spliceNode(node, start, end, el) {
    var mid = node.splitText(start);
    mid.splitText(end - start);
    node.parentNode.replaceChild(el, mid);
    return el.nextSibling;
  }

  function badgeEl(number) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'cw-badge';
    b.textContent = String(number);
    b.setAttribute('data-cw-note', String(number));
    b.setAttribute('aria-expanded', 'false');
    b.setAttribute('aria-label', 'Note ' + number);
    return b;
  }

  // Walk every text node under `code`, replacing each recognized marker
  // with a badge button. Returns the badges in source order.
  function installBadges(code, noteCount) {
    var texts = [];
    var walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT, null);
    var n;
    while ((n = walker.nextNode())) texts.push(n);

    var badges = [];
    texts.forEach(function (textNode) {
      var node = textNode;
      // Re-scan after every splice: offsets shift once text is removed.
      for (;;) {
        var markers = pairUp(findMarkers(node.nodeValue), noteCount);
        if (!markers.length) break;
        var mk = markers[0];
        var el = badgeEl(mk.number);
        node = spliceNode(node, mk.start, mk.end, el);
        badges.push(el);
      }
    });
    badges.sort(function (a, b) { return Number(a.getAttribute('data-cw-note')) - Number(b.getAttribute('data-cw-note')); });
    return badges;
  }

  function wireOne(root) {
    var pre = root.querySelector(':scope > pre');
    var code = pre && pre.querySelector('code');
    var list = root.querySelector(':scope > ol');
    if (!code || !list) return;

    var notes = Array.prototype.slice.call(list.children).map(function (li) { return li.innerHTML; });
    if (!notes.length) return;
    var badges = installBadges(code, notes.length);
    if (!badges.length) return;

    root.classList.add('cw-ready');
    list.setAttribute('hidden', '');

    var panel = document.createElement('div');
    panel.className = 'cw-panel';
    var count = document.createElement('p');
    count.className = 'cw-count';
    count.textContent = badges.length + (badges.length === 1 ? ' note' : ' notes') + ' — click a number, or press its digit.';
    var card = document.createElement('div');
    card.className = 'cw-card';
    card.setAttribute('aria-live', 'polite');
    var expandBtn = document.createElement('button');
    expandBtn.type = 'button';
    expandBtn.className = 'cw-expand';
    expandBtn.textContent = 'Expand all';
    panel.appendChild(count);
    panel.appendChild(expandBtn);
    panel.appendChild(card);
    root.appendChild(panel);

    var expanded = false;
    var activeNum = null;

    function cardHtml(num) {
      return '<div class="cw-note" data-cw-note="' + num + '"><span class="cw-note-num">' + num + '</span><div class="cw-note-body">' + notes[num - 1] + '</div></div>';
    }

    function showOne(num) {
      activeNum = num;
      badges.forEach(function (b) {
        var n = Number(b.getAttribute('data-cw-note'));
        b.classList.toggle('cw-badge-active', n === num);
        b.setAttribute('aria-expanded', n === num ? 'true' : 'false');
      });
      card.innerHTML = cardHtml(num);
    }

    function clear() {
      activeNum = null;
      badges.forEach(function (b) { b.classList.remove('cw-badge-active'); b.setAttribute('aria-expanded', 'false'); });
      card.innerHTML = '';
    }

    function showAll() {
      activeNum = null;
      badges.forEach(function (b) { b.classList.add('cw-badge-active'); b.setAttribute('aria-expanded', 'true'); });
      card.innerHTML = badges.map(function (b) { return cardHtml(Number(b.getAttribute('data-cw-note'))); }).join('');
    }

    function toggle(num) {
      if (expanded) return;
      if (activeNum === num) clear(); else showOne(num);
    }

    badges.forEach(function (b) {
      b.addEventListener('click', function () { toggle(Number(b.getAttribute('data-cw-note'))); });
      b.addEventListener('keydown', function (e) {
        var i = badges.indexOf(b);
        var next;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % badges.length;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + badges.length) % badges.length;
        else return;
        e.preventDefault();
        badges[next].focus();
      });
    });

    root.addEventListener('keydown', function (e) {
      if (expanded || !/^[1-9]$/.test(e.key)) return;
      var hit = badges.filter(function (b) { return b.getAttribute('data-cw-note') === e.key; })[0];
      if (hit) { toggle(Number(e.key)); hit.focus(); }
    });

    expandBtn.addEventListener('click', function () {
      expanded = !expanded;
      expandBtn.textContent = expanded ? 'Collapse' : 'Expand all';
      root.classList.toggle('cw-expanded', expanded);
      if (expanded) showAll(); else clear();
    });
  }

  function wire() {
    document.querySelectorAll('[data-code-walk]').forEach(wireOne);
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', wire);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { findMarkers: findMarkers, pairUp: pairUp, escapeHtml: escapeHtml };
  }
})();
