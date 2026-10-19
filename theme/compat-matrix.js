// Compatibility matrix: an ordinary Markdown table whose status cells start
// with an emoji you'd type anyway. No new markup: the raw table already
// reads correctly with no JS at all.
//
//   <div class="compat-matrix" data-compat-matrix>
//
//   | Feature | Chrome | Safari | Firefox |
//   |---|---|---|---|
//   | WebGPU | (check) | (warning) Behind a flag until v18 | (cross) |
//
//   </div>
//
// (check)/(check-mark) -> full support, (warning)/yellow-circle -> partial,
// (cross)/(cross-mark) -> none. Anything after the emoji in a cell is an
// optional note: that cell becomes clickable, and the note is shown in a
// single shared detail card below the table (same pattern as the layer
// explorer / code walkthrough widgets). The first column and header row are
// left untouched. Cells with no recognized leading emoji are left alone.
(function () {
  var STATUS = {
    '✅': 'full', '✓': 'full',
    '⚠️': 'partial', '⚠': 'partial', '🟡': 'partial',
    '❌': 'none', '✗': 'none', '✖': 'none', '✖️': 'none',
  };

  var LABEL = { full: 'Full support', partial: 'Partial support', none: 'Not supported' };

  // Longest glyphs first, so e.g. the VS16-suffixed warning sign matches
  // before the bare one.
  var GLYPHS = Object.keys(STATUS).sort(function (a, b) { return b.length - a.length; });

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Pure: a cell's text -> { status, note }. status is null (leave the cell
  // alone) when it doesn't start with a recognized glyph.
  function parseCell(text) {
    var s = String(text == null ? '' : text).trim();
    for (var i = 0; i < GLYPHS.length; i++) {
      var g = GLYPHS[i];
      if (s.indexOf(g) === 0) {
        return { status: STATUS[g], note: s.slice(g.length).trim() };
      }
    }
    return { status: null, note: '' };
  }

  function wireOne(root) {
    var table = root.querySelector(':scope table, :scope .table-wrapper table');
    var rows = table && table.querySelectorAll('tbody tr');
    if (!table || !rows || !rows.length) return;

    root.classList.add('cm-ready');

    var panel = document.createElement('div');
    panel.className = 'cm-panel';
    panel.hidden = true;
    var card = document.createElement('div');
    card.className = 'cm-card';
    card.setAttribute('aria-live', 'polite');
    panel.appendChild(card);
    root.appendChild(panel);

    var active = null;

    function showNote(cell, featureName, status, note) {
      if (active) active.classList.remove('cm-cell-active');
      if (active === cell) {
        active = null;
        panel.hidden = true;
        card.innerHTML = '';
        cell.setAttribute('aria-expanded', 'false');
        return;
      }
      active = cell;
      cell.classList.add('cm-cell-active');
      cell.setAttribute('aria-expanded', 'true');
      card.className = 'cm-card cm-' + status;
      card.innerHTML = '<span class="cm-card-dot"></span>' +
        '<div class="cm-card-body"><strong>' + escapeHtml(featureName) + '</strong><span class="cm-card-status">' + LABEL[status] + '</span><p>' + escapeHtml(note) + '</p></div>';
      panel.hidden = false;
    }

    Array.prototype.forEach.call(rows, function (row) {
      var cells = Array.prototype.slice.call(row.children);
      var featureName = cells[0] ? cells[0].textContent.trim() : '';
      cells.slice(1).forEach(function (cell) {
        var parsed = parseCell(cell.textContent);
        if (!parsed.status) return;
        cell.classList.add('cm-cell', 'cm-' + parsed.status);
        cell.innerHTML = '<span class="cm-dot" aria-hidden="true"></span><span class="cm-sr">' + LABEL[parsed.status] + '</span>';
        if (!parsed.note) return;
        cell.classList.add('cm-has-note');
        cell.setAttribute('tabindex', '0');
        cell.setAttribute('role', 'button');
        cell.setAttribute('aria-expanded', 'false');
        cell.addEventListener('click', function () { showNote(cell, featureName, parsed.status, parsed.note); });
        cell.addEventListener('keydown', function (e) {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          showNote(cell, featureName, parsed.status, parsed.note);
        });
      });
    });
  }

  function wire() {
    document.querySelectorAll('[data-compat-matrix]').forEach(wireOne);
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', wire);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { parseCell: parseCell };
  }
})();
