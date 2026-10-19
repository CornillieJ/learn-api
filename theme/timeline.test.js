const test = require('node:test');
const assert = require('node:assert/strict');
const { parseEntries } = require('./timeline.js');

test('splits a leading <strong> label from the rest of the body', () => {
  const [e] = parseEntries(['<strong>2024-01</strong> First prototype.']);
  assert.equal(e.label, '2024-01');
  assert.equal(e.bodyHtml, 'First prototype.');
});

test('an item with no leading <strong> has an empty label and the whole body', () => {
  const [e] = parseEntries(['Just some text, no bold label.']);
  assert.equal(e.label, '');
  assert.equal(e.bodyHtml, 'Just some text, no bold label.');
});

test('preserves inline HTML (code, links) in the body untouched', () => {
  const [e] = parseEntries(['<strong>2025-02</strong> Added <code>--config</code> and a <a href="x.html">guide</a>.']);
  assert.equal(e.bodyHtml, 'Added <code>--config</code> and a <a href="x.html">guide</a>.');
});

test('trims surrounding whitespace from label and body', () => {
  const [e] = parseEntries(['  <strong> 2024-06 </strong>   Rewritten as a CLI.  ']);
  assert.equal(e.label, ' 2024-06 ');
  assert.equal(e.bodyHtml, 'Rewritten as a CLI.');
});

test('an empty list produces an empty array', () => {
  assert.deepEqual(parseEntries([]), []);
  assert.deepEqual(parseEntries(undefined), []);
});

test('handles multiple entries in order', () => {
  const entries = parseEntries([
    '<strong>2024-01</strong> First.',
    '<strong>2024-06</strong> Second.',
    '<strong>2025-02</strong> Third.',
  ]);
  assert.deepEqual(entries.map((e) => e.label), ['2024-01', '2024-06', '2025-02']);
});
