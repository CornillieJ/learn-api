const test = require('node:test');
const assert = require('node:assert/strict');
const { findMarkers, pairUp } = require('./code-walk.js');

test('finds // # -- ; % line-comment markers, anchored at end of line', () => {
  const text = [
    'a(); // (1)',
    'b()  # (2)',
    'c(); -- (3)',
    'd(); ; (4)',
    'e(); % (5)',
  ].join('\n');
  const nums = findMarkers(text).map((m) => m.number);
  assert.deepEqual(nums, [1, 2, 3, 4, 5]);
});

test('finds /* */ and <!-- --> markers anywhere, not just at EOL', () => {
  const nums = findMarkers('int x = 1; /* (1) */ int y = 2;\n<div></div> <!-- (2) -->').map((m) => m.number);
  assert.deepEqual(nums, [1, 2]);
});

test('a line comment marker must be at end of line (trailing code keeps it from matching)', () => {
  assert.deepEqual(findMarkers('x // (1) not actually at eol because of this').length, 0);
});

test('ignores lines with no marker, and text with no comment at all', () => {
  assert.deepEqual(findMarkers('plain code\nmore code'), []);
  assert.deepEqual(findMarkers(''), []);
});

test('reports marker position so the match text can be spliced out', () => {
  const [m] = findMarkers('x(); // (7)');
  assert.equal('x(); // (7)'.slice(m.start, m.end), '// (7)');
});

test('pairUp keeps only markers with a matching note, drops duplicates, preserves order', () => {
  const markers = [{ number: 2, start: 0, end: 1 }, { number: 9, start: 2, end: 3 }, { number: 2, start: 4, end: 5 }, { number: 1, start: 6, end: 7 }];
  const pairs = pairUp(markers, 2);
  assert.deepEqual(pairs.map((m) => m.number), [2, 1]);
});

test('pairUp with no notes or no markers is empty', () => {
  assert.deepEqual(pairUp([], 3), []);
  assert.deepEqual(pairUp([{ number: 1, start: 0, end: 1 }], 0), []);
});
