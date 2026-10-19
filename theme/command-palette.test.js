const test = require('node:test');
const assert = require('node:assert/strict');
const { fuzzyScore, filterItems } = require('./command-palette.js');

test('an exact substring match scores higher than a scattered subsequence match', () => {
  const subMatch = fuzzyScore('cache', 'HTTP cache basics');
  const scattered = fuzzyScore('ccb', 'HTTP cache basics');
  assert.ok(subMatch > 0);
  assert.ok(scattered > 0);
  assert.ok(subMatch > scattered);
});

test('an earlier substring match scores higher than a later one', () => {
  const early = fuzzyScore('cache', 'cache invalidation');
  const late = fuzzyScore('cache', 'http response cache');
  assert.ok(early > late);
});

test('returns null when not every character of the query appears in order', () => {
  assert.equal(fuzzyScore('xyz', 'cache'), null);
  assert.equal(fuzzyScore('ecach', 'cache'), null);
});

test('an empty query matches everything with score 0', () => {
  assert.equal(fuzzyScore('', 'anything'), 0);
});

test('consecutive matched characters score higher than scattered ones over the same span', () => {
  const consecutive = fuzzyScore('abc', 'xabcx');
  const scattered = fuzzyScore('abc', 'xaxbxcx');
  assert.ok(consecutive > scattered);
});

test('filterItems ranks and caps results, dropping non-matches', () => {
  const items = [
    { title: 'Writing guide' },
    { title: 'HTTP caching in 20 minutes' },
    { title: 'Component gallery' },
  ];
  const out = filterItems(items, 'cach', 50);
  assert.deepEqual(out.map((i) => i.title), ['HTTP caching in 20 minutes']);
});

test('filterItems with an empty query returns the first `limit` items unranked', () => {
  const items = [{ title: 'A' }, { title: 'B' }, { title: 'C' }];
  assert.deepEqual(filterItems(items, '', 2).map((i) => i.title), ['A', 'B']);
});

test('filterItems breaks score ties by original order', () => {
  const items = [{ title: 'cat' }, { title: 'cab' }];
  const out = filterItems(items, 'ca', 50);
  assert.deepEqual(out.map((i) => i.title), ['cat', 'cab']);
});
