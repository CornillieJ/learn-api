const test = require('node:test');
const assert = require('node:assert/strict');
const { countWords, estimateMinutes } = require('./reading-time.js');

test('countWords counts whitespace-separated runs', () => {
  assert.equal(countWords('one two three'), 3);
  assert.equal(countWords('  extra   whitespace  '), 2);
});

test('countWords returns 0 for empty or missing text', () => {
  assert.equal(countWords(''), 0);
  assert.equal(countWords('   '), 0);
  assert.equal(countWords(null), 0);
  assert.equal(countWords(undefined), 0);
});

test('estimateMinutes divides by the words-per-minute rate and rounds', () => {
  assert.equal(estimateMinutes(400, 200), 2);
  assert.equal(estimateMinutes(450, 200), 2);
  assert.equal(estimateMinutes(550, 200), 3);
});

test('estimateMinutes never returns less than 1', () => {
  assert.equal(estimateMinutes(0, 200), 1);
  assert.equal(estimateMinutes(10, 200), 1);
});

test('estimateMinutes falls back to the default rate for an invalid rate', () => {
  assert.equal(estimateMinutes(400, 0), 2);
  assert.equal(estimateMinutes(400, -5), 2);
  assert.equal(estimateMinutes(400), 2);
});
