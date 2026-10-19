const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCondition, findConditionColumns, rowMatches } = require('./decision-table.js');

test('parseCondition recognizes the true/false/wildcard glyphs', () => {
  assert.equal(parseCondition('✅'), true);
  assert.equal(parseCondition('✓'), true);
  assert.equal(parseCondition('❌'), false);
  assert.equal(parseCondition('✗'), false);
  assert.equal(parseCondition('—'), null);
  assert.equal(parseCondition('-'), null);
});

test('parseCondition trims whitespace and returns undefined for anything else', () => {
  assert.equal(parseCondition('  ✅  '), true);
  assert.equal(parseCondition('Full dashboard'), undefined);
  assert.equal(parseCondition(''), undefined);
});

test('findConditionColumns only accepts columns where every cell is a recognized glyph', () => {
  const columns = [
    ['✅', '✅', '❌'],
    ['✅', '❌', '—'],
    ['Full dashboard', 'Read-only dashboard', 'Redirect to login'],
  ];
  assert.deepEqual(findConditionColumns(columns), [0, 1]);
});

test('findConditionColumns rejects an empty column', () => {
  assert.deepEqual(findConditionColumns([[]]), []);
});

test('rowMatches requires every non-wildcard condition to equal the toggle state', () => {
  assert.equal(rowMatches([true, true], [true, true]), true);
  assert.equal(rowMatches([true, false], [true, true]), false);
});

test('rowMatches treats null as matching either toggle state', () => {
  assert.equal(rowMatches([false, null], [false, true]), true);
  assert.equal(rowMatches([false, null], [false, false]), true);
  assert.equal(rowMatches([true, null], [false, false]), false);
});
