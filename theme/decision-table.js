// Decision table: an ordinary Markdown table where some columns are
// conditions (✅ required, ❌ forbidden, — don't care) and the rest are the
// outcome. Checkboxes appear above the table, one per condition column;
// toggling them highlights the row(s) whose conditions match the reader's
// current picks and dims the rest. No JS: it's still a perfectly readable
// plain table, conditions and outcome side by side.
//
//   <div class="decision-table" data-decision-table>
//
//   | Logged in | Admin role | Outcome |
//   |---|---|---|
//   | ✅ | ✅ | Full dashboard |
//   | ✅ | ❌ | Read-only dashboard |
//   | ❌ | — | Redirect to login |
//
//   </div>
//
// A column only becomes a toggle if every one of its body cells is a
// recognized glyph (✅/✓, ❌/✗, —/-). Any other column (the outcome here) is
// left exactly as written.
(function () {
  var TRUE_GLYPHS = ['✅', '✓'];
  var FALSE_GLYPHS = ['❌', '✗'];
  var WILD_GLYPHS = ['—', '-'];

  // Pure: a cell's text -> true, false, null (wildcard), or undefined (not a
  // recognized glyph at all, so this column can't be a condition column).
  function parseCondition(text) {
    var s = String(text == null ? '' : text).trim();
    if (TRUE_GLYPHS.indexOf(s) !== -1) return true;
    if (FALSE_GLYPHS.indexOf(s) !== -1) return false;
    if (WILD_GLYPHS.indexOf(s) !== -1) return null;
    return undefined;
  }

  // Pure: columns (each a list of cell strings, header excluded) -> indices
  // of the columns where every cell parses as a condition glyph.
  function findConditionColumns(columns) {
    var out = [];
    for (var c = 0; c < columns.length; c++) {
      var ok = columns[c].length > 0;
      for (var r = 0; r < columns[c].length && ok; r++) {
        if (parseCondition(columns[c][r]) === undefined) ok = false;
      }
      if (ok) out.push(c);
    }
    return out;
  }

  // Pure: does this row match the reader's current toggle state? `row` is
  // the row's parsed condition values (true/false/null) for the condition
  // columns, in the same order as `toggles` (true/false per column).
  function rowMatches(row, toggles) {
    for (var i = 0; i < row.length; i++) {
      if (row[i] === null) continue; // wildcard: matches either state
      if (row[i] !== toggles[i]) return false;
    }
    return true;
  }

  function wireOne(root) {
    var table = root.querySelector(':scope table, :scope .table-wrapper table');
    var headerCells = table && table.querySelectorAll('thead th');
    var bodyRows = table && table.querySelectorAll('tbody tr');
    if (!table || !headerCells || !headerCells.length || !bodyRows || !bodyRows.length) return;

    var nCols = headerCells.length;
    var columnsText = [];
    for (var c = 0; c < nCols; c++) columnsText.push([]);
    Array.prototype.forEach.call(bodyRows, function (row) {
      Array.prototype.forEach.call(row.children, function (cell, c) {
        if (c < nCols) columnsText[c].push(cell.textContent);
      });
    });
    var condCols = findConditionColumns(columnsText);
    if (!condCols.length) return;

    root.classList.add('dt-ready');

    var toggles = condCols.map(function () { return false; });
    var controls = document.createElement('div');
    controls.className = 'dt-controls';
    condCols.forEach(function (c, i) {
      var label = headerCells[c].textContent.trim();
      var id = 'dtToggle' + Math.random().toString(36).slice(2);
      var wrap = document.createElement('label');
      wrap.className = 'dt-toggle';
      wrap.innerHTML = '<input type="checkbox" id="' + id + '"><span>' + label.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span>';
      controls.appendChild(wrap);
      wrap.querySelector('input').addEventListener('change', function (e) {
        toggles[i] = e.target.checked;
        update();
      });
    });
    root.insertBefore(controls, table);

    function update() {
      Array.prototype.forEach.call(bodyRows, function (row) {
        var rowVals = condCols.map(function (c) {
          return parseCondition(row.children[c].textContent);
        });
        var match = rowMatches(rowVals, toggles);
        row.classList.toggle('dt-match', match);
        row.classList.toggle('dt-nomatch', !match);
      });
    }
    update();
  }

  function wire() {
    document.querySelectorAll('[data-decision-table]').forEach(wireOne);
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', wire);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      parseCondition: parseCondition,
      findConditionColumns: findConditionColumns,
      rowMatches: rowMatches,
    };
  }
})();
