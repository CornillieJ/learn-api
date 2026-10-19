const test = require('node:test');
const assert = require('node:assert/strict');
const { parseType, colorClass } = require('./param-table.js');

test('parses a plain required type', () => {
  assert.deepEqual(parseType('string'), { segments: [{ name: 'string', array: false, literal: false }], optional: false });
});

test('a trailing ? marks the cell optional', () => {
  assert.deepEqual(parseType('number?'), { segments: [{ name: 'number', array: false, literal: false }], optional: true });
});

test('a trailing [] marks a segment as an array', () => {
  assert.deepEqual(parseType('string[]'), { segments: [{ name: 'string', array: true, literal: false }], optional: false });
});

test('combines array and optional', () => {
  assert.deepEqual(parseType('string[]?'), { segments: [{ name: 'string', array: true, literal: false }], optional: true });
});

test('splits a union into multiple segments', () => {
  const out = parseType('string|number');
  assert.deepEqual(out.segments.map((s) => s.name), ['string', 'number']);
  assert.equal(out.optional, false);
});

test('recognizes quoted literal segments', () => {
  const out = parseType('"asc"|"desc"');
  assert.deepEqual(out.segments, [
    { name: 'asc', array: false, literal: true },
    { name: 'desc', array: false, literal: true },
  ]);
});

test('an empty cell has no segments', () => {
  assert.deepEqual(parseType(''), { segments: [], optional: false });
  assert.deepEqual(parseType('   '), { segments: [], optional: false });
});

test('trims whitespace around segments', () => {
  const out = parseType(' string | number ');
  assert.deepEqual(out.segments.map((s) => s.name), ['string', 'number']);
});

test('colorClass recognizes known primitive names case-insensitively', () => {
  assert.equal(colorClass({ name: 'String', literal: false }), 'str');
  assert.equal(colorClass({ name: 'boolean', literal: false }), 'bool');
  assert.equal(colorClass({ name: 'number', literal: false }), 'num');
});

test('colorClass falls back to "other" for unknown type names', () => {
  assert.equal(colorClass({ name: 'User', literal: false }), 'other');
});

test('colorClass treats literal segments as "lit" regardless of name', () => {
  assert.equal(colorClass({ name: 'asc', literal: true }), 'lit');
});
