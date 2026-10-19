const test = require('node:test');
const assert = require('node:assert/strict');
const { buildHeadingUrl } = require('./heading-link.js');

test('appends the heading id as a hash', () => {
  assert.equal(buildHeadingUrl('https://example.com/page.html', 'setup'), 'https://example.com/page.html#setup');
});

test('replaces an existing hash rather than appending another one', () => {
  assert.equal(buildHeadingUrl('https://example.com/page.html#old', 'new'), 'https://example.com/page.html#new');
});

test('handles a missing href', () => {
  assert.equal(buildHeadingUrl('', 'setup'), '#setup');
  assert.equal(buildHeadingUrl(undefined, 'setup'), '#setup');
});
