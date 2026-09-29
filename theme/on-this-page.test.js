const test = require('node:test');
const assert = require('node:assert/strict');
const { headingsToToc } = require('./on-this-page.js');

test('maps h2/h3 headings to toc entries with depth', () => {
  const headings = [
    { id: 'intro', tagName: 'H2', textContent: 'Intro' },
    { id: 'detail', tagName: 'H3', textContent: 'Detail' },
  ];
  assert.deepEqual(headingsToToc(headings), [
    { id: 'intro', text: 'Intro', depth: 2 },
    { id: 'detail', text: 'Detail', depth: 3 },
  ]);
});

test('skips headings without an id (can\'t be linked to)', () => {
  const headings = [{ id: '', tagName: 'H2', textContent: 'No anchor' }];
  assert.deepEqual(headingsToToc(headings), []);
});

test('returns an empty list for fewer than two headings', () => {
  assert.deepEqual(headingsToToc([{ id: 'only', tagName: 'H2', textContent: 'Only' }]), []);
});
