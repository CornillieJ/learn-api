const test = require('node:test');
const assert = require('node:assert/strict');
const { headingsToToc, activeIndexFromTops } = require('./on-this-page.js');

test('maps h2/h3 headings to a flat, ordered toc list', () => {
  const headings = [
    { id: 'intro', tagName: 'H2', textContent: 'Intro' },
    { id: 'detail', tagName: 'H3', textContent: 'Detail' },
  ];
  assert.deepEqual(headingsToToc(headings), [
    { id: 'intro', text: 'Intro' },
    { id: 'detail', text: 'Detail' },
  ]);
});

test('skips headings without an id (can\'t be linked to)', () => {
  const headings = [{ id: '', tagName: 'H2', textContent: 'No anchor' }];
  assert.deepEqual(headingsToToc(headings), []);
});

test('returns an empty list for fewer than two headings', () => {
  assert.deepEqual(headingsToToc([{ id: 'only', tagName: 'H2', textContent: 'Only' }]), []);
});

test('activeIndexFromTops picks the last heading at or above the trigger line', () => {
  // Landed via a click-triggered jump: the target heading sits right at
  // the top of the viewport (top: 4), well above a lower trigger line —
  // this must still resolve to that heading, not -1. This is exactly the
  // case an IntersectionObserver on the heading itself gets wrong (see the
  // comment above activeIndexFromTops).
  assert.equal(activeIndexFromTops([4, 620], 160), 0);
});

test('activeIndexFromTops returns -1 when every heading is still below the line', () => {
  assert.equal(activeIndexFromTops([300, 620], 160), -1);
});

test('activeIndexFromTops picks the deepest heading the reader has scrolled past', () => {
  assert.equal(activeIndexFromTops([-400, -50, 90, 500], 160), 2);
});
