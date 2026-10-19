const test = require('node:test');
const assert = require('node:assert/strict');
const { clampPct, pctFromPointer, stepPct } = require('./before-after.js');

test('clampPct keeps values inside [0, 100]', () => {
  assert.equal(clampPct(-5), 0);
  assert.equal(clampPct(150), 100);
  assert.equal(clampPct(42), 42);
});

test('pctFromPointer maps the pointer position across the element width', () => {
  const rect = { left: 100, width: 200 };
  assert.equal(pctFromPointer(100, rect), 0);
  assert.equal(pctFromPointer(300, rect), 100);
  assert.equal(pctFromPointer(200, rect), 50);
});

test('pctFromPointer clamps pointer positions outside the element', () => {
  const rect = { left: 100, width: 200 };
  assert.equal(pctFromPointer(0, rect), 0);
  assert.equal(pctFromPointer(1000, rect), 100);
});

test('pctFromPointer returns 0 for a zero-width element instead of dividing by zero', () => {
  assert.equal(pctFromPointer(50, { left: 0, width: 0 }), 0);
});

test('stepPct moves by step in the given direction and clamps at the edges', () => {
  assert.equal(stepPct(50, 1, 2), 52);
  assert.equal(stepPct(50, -1, 2), 48);
  assert.equal(stepPct(99, 1, 2), 100);
  assert.equal(stepPct(1, -1, 2), 0);
});
