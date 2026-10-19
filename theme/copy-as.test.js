const test = require('node:test');
const assert = require('node:assert/strict');
const { splitList, preferredIndex } = require('./copy-as.js');

test('splitList splits on | and trims', () => {
  assert.deepEqual(splitList('npm | yarn | pnpm'), ['npm', 'yarn', 'pnpm']);
  assert.deepEqual(splitList(null), []);
  assert.deepEqual(splitList(''), []);
});

test('preferredIndex: a stored label that matches wins over data-default', () => {
  assert.equal(preferredIndex(['npm', 'yarn', 'pnpm'], 'yarn', '1'), 1);
  assert.equal(preferredIndex(['npm', 'yarn', 'pnpm'], 'pnpm', null), 2);
});

test('preferredIndex: a stored label that matches nothing falls back to data-default', () => {
  assert.equal(preferredIndex(['npm', 'yarn', 'pnpm'], 'bun', '2'), 1);
});

test('preferredIndex: no stored label uses data-default', () => {
  assert.equal(preferredIndex(['npm', 'yarn', 'pnpm'], null, '3'), 2);
  assert.equal(preferredIndex(['npm', 'yarn', 'pnpm'], '', '2'), 1);
});

test('preferredIndex: data-default is 1-based, out of range or absent falls back to 0', () => {
  assert.equal(preferredIndex(['npm', 'yarn'], null, null), 0);
  assert.equal(preferredIndex(['npm', 'yarn'], null, '0'), 0);
  assert.equal(preferredIndex(['npm', 'yarn'], null, '9'), 0);
});
