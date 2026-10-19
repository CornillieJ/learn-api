const test = require('node:test');
const assert = require('node:assert/strict');
const { extractPlaceholders, fillTemplate } = require('./fill-in.js');

test('finds a plain {{NAME}} token with no default', () => {
  const [t] = extractPlaceholders('Bearer {{API_KEY}}');
  assert.equal(t.name, 'API_KEY');
  assert.equal(t.default, '');
});

test('finds {{NAME:default}} and keeps the default text', () => {
  const [t] = extractPlaceholders('{{REGION:us-east-1}}');
  assert.equal(t.name, 'REGION');
  assert.equal(t.default, 'us-east-1');
});

test('a repeated name keeps the FIRST default seen', () => {
  const tokens = extractPlaceholders('{{HOST:api.example.com}} ... {{HOST}} ... {{HOST:other}}');
  assert.deepEqual(tokens.map((t) => t.default), ['api.example.com', 'api.example.com', 'api.example.com']);
});

test('multiple distinct placeholders are returned in source order', () => {
  const tokens = extractPlaceholders('{{A}} then {{B:bee}} then {{C}}');
  assert.deepEqual(tokens.map((t) => t.name), ['A', 'B', 'C']);
});

test('text with no placeholders yields an empty array', () => {
  assert.deepEqual(extractPlaceholders('plain text, no tokens here'), []);
  assert.deepEqual(extractPlaceholders(''), []);
});

test('reports token position so the match text can be spliced out', () => {
  const text = 'x={{N}}';
  const [t] = extractPlaceholders(text);
  assert.equal(text.slice(t.start, t.end), '{{N}}');
});

test('fillTemplate uses a given value when present', () => {
  assert.equal(fillTemplate('Bearer {{API_KEY}}', { API_KEY: 'sk-123' }), 'Bearer sk-123');
});

test('fillTemplate falls back to the default when no value is given', () => {
  assert.equal(fillTemplate('{{REGION:us-east-1}}', {}), 'us-east-1');
});

test('fillTemplate falls back to empty string with no value and no default', () => {
  assert.equal(fillTemplate('[{{X}}]', {}), '[]');
});

test('fillTemplate fills a repeated name consistently everywhere it appears', () => {
  const out = fillTemplate('{{HOST}}/a and {{HOST}}/b', { HOST: 'example.com' });
  assert.equal(out, 'example.com/a and example.com/b');
});
