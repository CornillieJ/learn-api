const test = require('node:test');
const assert = require('node:assert/strict');
const cm = require('./checkmarks.js');

test('keys are namespaced with the default storage prefix', () => {
  assert.equal(cm.chapterKey('example-chapter'), 'mybook:done:example-chapter');
  assert.equal(cm.knownKey('example-chapter', 2), 'mybook:known:example-chapter:2');
  assert.equal(cm.checkKey('example-chapter', 0), 'mybook:check:example-chapter:0');
  assert.equal(cm.trackedKey(), 'mybook:tracked');
});

test('keys follow BookConfig.storagePrefix so two books do not share progress', () => {
  global.window = { BookConfig: { storagePrefix: 'other-book' } };
  try {
    assert.equal(cm.chapterKey('intro'), 'other-book:done:intro');
  } finally {
    delete global.window;
  }
});

test('knownKey distinguishes pages and question positions', () => {
  assert.notEqual(cm.knownKey('a', 1), cm.knownKey('a', 0));
  assert.notEqual(cm.knownKey('a', 0), cm.knownKey('b', 0));
});

test('slugFromHref strips directories, extension, query and anchors', () => {
  assert.equal(cm.slugFromHref('example-chapter.html'), 'example-chapter');
  assert.equal(cm.slugFromHref('guides/overview.html#section'), 'overview');
  assert.equal(cm.slugFromHref('./writing-guide.html?x=1'), 'writing-guide');
  assert.equal(cm.slugFromHref('https://me.github.io/book/components.html'), 'components');
  assert.equal(cm.slugFromHref('/book/'), 'index');
});

test('resolveTracked prefers the page map, then config, then the stored list', () => {
  assert.deepEqual(cm.resolveTracked(['a', 'b'], ['c'], ['d']), ['a', 'b']);
  assert.deepEqual(cm.resolveTracked(null, ['c'], ['d']), ['c']);
  assert.deepEqual(cm.resolveTracked([], null, ['d']), ['d']);
  assert.equal(cm.resolveTracked(null, null, null), null);
});

test('doneMessage counts when it can and stays generic when it cannot', () => {
  assert.equal(cm.doneMessage(0, 0), 'Chapter done!');
  assert.equal(cm.doneMessage(2, 5), 'Chapter done! 2 of 5 complete.');
  assert.match(cm.doneMessage(5, 5), /All 5 chapters done/);
});

test('done/known storage never throws when localStorage is unavailable', () => {
  const original = global.localStorage;
  global.localStorage = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
  };
  try {
    assert.doesNotThrow(() => cm.setDone('intro', true));
    assert.equal(cm.isDone('intro'), false);
    assert.doesNotThrow(() => cm.setKnown('intro', 0, true));
    assert.equal(cm.isKnown('intro', 0), false);
  } finally {
    global.localStorage = original;
  }
});
