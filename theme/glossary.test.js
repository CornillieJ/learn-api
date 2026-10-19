const test = require('node:test');
const assert = require('node:assert/strict');
const { collectTerms } = require('./glossary.js');

test('sorts entries alphabetically by term, case-insensitively', () => {
  const out = collectTerms([
    { term: 'zebra', def: 'z' },
    { term: 'Apple', def: 'a' },
    { term: 'banana', def: 'b' },
  ]);
  assert.deepEqual(out.map((e) => e.term), ['Apple', 'banana', 'zebra']);
});

test('deduplicates by term case-insensitively, keeping the first definition', () => {
  const out = collectTerms([
    { term: 'Idempotent', def: 'first def' },
    { term: 'idempotent', def: 'second def' },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].def, 'first def');
});

test('skips entries with an empty or missing term', () => {
  const out = collectTerms([{ term: '  ', def: 'x' }, { term: '', def: 'y' }, { def: 'z' }]);
  assert.deepEqual(out, []);
});

test('an empty list produces an empty array', () => {
  assert.deepEqual(collectTerms([]), []);
  assert.deepEqual(collectTerms(undefined), []);
});

test('trims whitespace around term and definition', () => {
  const out = collectTerms([{ term: '  cache  ', def: '  stores a response  ' }]);
  assert.equal(out[0].term, 'cache');
  assert.equal(out[0].def, 'stores a response');
});
