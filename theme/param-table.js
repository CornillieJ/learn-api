// API parameter table: an ordinary Markdown table whose "Type" column uses
// a small type-expression syntax, rendered as colored pills:
//
//   <div class="param-table" data-param-table>
//
//   | Name | Type | Description |
//   |---|---|---|
//   | `id` | `string` | The resource id. |
//   | `limit` | `number?` | Max results, default 20. |
//   | `tags` | `string[]?` | Filter by tag. |
//
//   </div>
//
// A trailing `?` marks the whole cell optional (omit it for required).
// `Name[]` marks that segment an array. `A\|B` (escaped, same as any
// Markdown table cell with a literal pipe) renders a union of pills.
// Known primitive names (string, number, boolean, object, array,
// function, any, null, undefined) get their own color; anything else
// (a custom type name) gets a neutral pill. No JS: the column is still
// plain text, exactly as written.
(function () {
  var KNOWN = {
    string: 'str', number: 'num', boolean: 'bool', bool: 'bool',
    object: 'obj', array: 'arr', function: 'fn', any: 'any',
    null: 'null', undefined: 'undef',
  };

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Pure: a "Type" cell's text -> { segments: [{name, array, literal}],
  // optional }. A trailing `?` (outside any segment) marks the cell
  // optional; `Name[]` marks a segment an array; a quoted segment
  // ("asc") is a literal type.
  function parseType(text) {
    var s = String(text == null ? '' : text).trim();
    var optional = /\?$/.test(s);
    if (optional) s = s.slice(0, -1).trim();
    if (!s) return { segments: [], optional: optional };
    var segments = s.split('|').map(function (raw) {
      var p = raw.trim();
      if (!p) return null;
      var array = /\[\]$/.test(p);
      if (array) p = p.slice(0, -2).trim();
      var literal = /^".*"$|^'.*'$/.test(p);
      var name = literal ? p.slice(1, -1) : p;
      return { name: name, array: array, literal: literal };
    }).filter(Boolean);
    return { segments: segments, optional: optional };
  }

  // Pure: a parsed segment -> which color class to use.
  function colorClass(seg) {
    if (seg.literal) return 'lit';
    return KNOWN[String(seg.name).toLowerCase()] || 'other';
  }

  function renderCell(text) {
    var parsed = parseType(text);
    if (!parsed.segments.length) return null;
    var html = parsed.segments.map(function (seg, i) {
      var sep = i > 0 ? '<span class="pt-or">or</span>' : '';
      return sep + '<span class="pt-pill pt-' + colorClass(seg) + '">' +
        escapeHtml(seg.name) + (seg.array ? '[]' : '') + '</span>';
    }).join('');
    html += '<span class="pt-flag pt-' + (parsed.optional ? 'optional' : 'required') + '">' +
      (parsed.optional ? 'optional' : 'required') + '</span>';
    return html;
  }

  function wireOne(root) {
    var table = root.querySelector(':scope table, :scope .table-wrapper table');
    var headerCells = table && table.querySelectorAll('thead th');
    if (!table || !headerCells || !headerCells.length) return;

    var typeCol = -1;
    Array.prototype.forEach.call(headerCells, function (th, i) {
      if (typeCol === -1 && /^type$/i.test(th.textContent.trim())) typeCol = i;
    });
    if (typeCol === -1) return;

    var rows = table.querySelectorAll('tbody tr');
    var any = false;
    Array.prototype.forEach.call(rows, function (row) {
      var cell = row.children[typeCol];
      if (!cell) return;
      var html = renderCell(cell.textContent);
      if (!html) return;
      cell.innerHTML = html;
      any = true;
    });
    if (any) root.classList.add('pt-ready');
  }

  function wire() {
    document.querySelectorAll('[data-param-table]').forEach(wireOne);
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', wire);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { parseType: parseType, colorClass: colorClass };
  }
})();
