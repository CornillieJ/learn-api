const test = require('node:test');
const assert = require('node:assert/strict');
const { journeyState, parseEntry, cleanBlurb, slugFromHref } = require('./progress-map.js');

test('parses a rendered markdown list item into a stop', () => {
  const e = parseEntry('http://localhost/book/example-chapter.html', ' Git in 20 minutes ', ' — Commit, branch, undo');
  assert.deepEqual(e, {
    href: 'http://localhost/book/example-chapter.html',
    slug: 'example-chapter',
    title: 'Git in 20 minutes',
    blurb: 'Commit, branch, undo',
  });
});

test('items without a link are skipped; a missing title falls back to the slug', () => {
  assert.equal(parseEntry('', 'x', 'y'), null);
  assert.equal(parseEntry('intro.html', '', '').title, 'intro');
});

test('cleanBlurb strips leading separators and collapses whitespace', () => {
  assert.equal(cleanBlurb(':  one\n two '), 'one two');
  assert.equal(cleanBlurb('- dash'), 'dash');
  assert.equal(cleanBlurb(''), '');
});

test('the landing page (README.md -> index.html or /) has slug "index"', () => {
  assert.equal(slugFromHref('index.html'), 'index');
  assert.equal(slugFromHref('/book/'), 'index');
});

test('"continue" points to the first chapter not done, even with gaps', () => {
  const s = journeyState([true, true, false, true, false]);
  assert.equal(s.nextIndex, 2);
  assert.equal(s.doneCount, 3);
  assert.equal(s.allDone, false);
});

test('all done has no next chapter and 100%', () => {
  const s = journeyState([true, true, true]);
  assert.equal(s.nextIndex, -1);
  assert.equal(s.allDone, true);
  assert.equal(s.percent, 100);
});

test('nothing done starts at the first chapter; an empty map is not "all done"', () => {
  const s = journeyState([false, false]);
  assert.equal(s.nextIndex, 0);
  assert.equal(s.percent, 0);
  assert.equal(journeyState([]).allDone, false);
});
