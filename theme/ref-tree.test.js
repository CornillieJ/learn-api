const test = require('node:test');
const assert = require('node:assert/strict');
const { initialVisible, nextFocusIndex } = require('./ref-tree.js');

test('initialVisible: depth 0 is visible by default, deeper is not', () => {
  assert.equal(initialVisible(0, false), true);
  assert.equal(initialVisible(1, false), false);
  assert.equal(initialVisible(3, false), false);
});

test('initialVisible: expandAllDefault makes every depth visible', () => {
  assert.equal(initialVisible(0, true), true);
  assert.equal(initialVisible(1, true), true);
  assert.equal(initialVisible(5, true), true);
});

test('nextFocusIndex moves forward and backward', () => {
  assert.equal(nextFocusIndex(4, 1, 1), 2);
  assert.equal(nextFocusIndex(4, 1, -1), 0);
});

test('nextFocusIndex wraps past the last and first index', () => {
  assert.equal(nextFocusIndex(4, 3, 1), 0);
  assert.equal(nextFocusIndex(4, 0, -1), 3);
});

test('nextFocusIndex with a single item always stays put', () => {
  assert.equal(nextFocusIndex(1, 0, 1), 0);
  assert.equal(nextFocusIndex(1, 0, -1), 0);
});

test('nextFocusIndex with no visible toggles returns -1', () => {
  assert.equal(nextFocusIndex(0, 0, 1), -1);
});
