const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCell } = require('./compat-matrix.js');

test('recognizes the three status emoji, with and without a trailing note', () => {
  assert.deepEqual(parseCell('✅'), { status: 'full', note: '' });
  assert.deepEqual(parseCell('✅ Since Chrome 111'), { status: 'full', note: 'Since Chrome 111' });
  assert.deepEqual(parseCell('⚠️ Behind a flag until v18'), { status: 'partial', note: 'Behind a flag until v18' });
  assert.deepEqual(parseCell('❌'), { status: 'none', note: '' });
  assert.deepEqual(parseCell('❌ Tracked in bug 1823896'), { status: 'none', note: 'Tracked in bug 1823896' });
});

test('recognizes the plain-glyph alternates (no variation selector)', () => {
  assert.equal(parseCell('✓ done').status, 'full');
  assert.equal(parseCell('🟡 mostly').status, 'partial');
  assert.equal(parseCell('⚠ careful').status, 'partial');
  assert.equal(parseCell('✗ nope').status, 'none');
});

test('leaves plain text and empty cells alone', () => {
  assert.deepEqual(parseCell('WebGPU'), { status: null, note: '' });
  assert.deepEqual(parseCell(''), { status: null, note: '' });
  assert.deepEqual(parseCell('   '), { status: null, note: '' });
  assert.deepEqual(parseCell(null), { status: null, note: '' });
});

test('trims surrounding whitespace from the cell and the note', () => {
  assert.deepEqual(parseCell('  ✅   Since v2  '), { status: 'full', note: 'Since v2' });
});
