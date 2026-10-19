const test = require('node:test');
const assert = require('node:assert/strict');
const { stripBacklinks } = require('./footnote.js');

test('removes a single backlink anchor', () => {
  const html = '<p>Some definition. <a href="#fr-a-1">↩</a></p>';
  assert.equal(stripBacklinks(html), '<p>Some definition.</p>');
});

test('removes multiple backlink anchors when a footnote is referenced more than once', () => {
  const html = '<p>Shared definition. <a href="#fr-a-1">↩</a> <a href="#fr-a-2">↩2</a></p>';
  assert.equal(stripBacklinks(html), '<p>Shared definition.</p>');
});

test('leaves ordinary links in the definition untouched', () => {
  const html = '<p>See <a href="https://example.com">the docs</a>. <a href="#fr-a-1">↩</a></p>';
  assert.equal(stripBacklinks(html), '<p>See <a href="https://example.com">the docs</a>.</p>');
});

test('trims surrounding whitespace', () => {
  assert.equal(stripBacklinks('  <p>Text</p>  '), '<p>Text</p>');
});

test('handles missing or empty input', () => {
  assert.equal(stripBacklinks(''), '');
  assert.equal(stripBacklinks(null), '');
  assert.equal(stripBacklinks(undefined), '');
});
