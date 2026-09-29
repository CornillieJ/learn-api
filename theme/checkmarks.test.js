const test = require('node:test');
const assert = require('node:assert/strict');
const { chapterKey, slugFromHref } = require('./checkmarks.js');

test('chapterKey namespaces the slug', () => {
  assert.equal(chapterKey('step-3-spring-mvc-war'), 'learn-api:done:step-3-spring-mvc-war');
});

test('slugFromHref strips directories, extension, and anchors', () => {
  assert.equal(slugFromHref('step-3-spring-mvc-war.html'), 'step-3-spring-mvc-war');
  assert.equal(slugFromHref('codebase-walkthroughs/overview.html#section'), 'overview');
  assert.equal(slugFromHref('./how-to-use-this-guide.html'), 'how-to-use-this-guide');
});

test('isDone/setDone never throw when localStorage is unavailable', () => {
  const { isDone, setDone } = require('./checkmarks.js');
  const original = global.localStorage;
  global.localStorage = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
  };
  assert.doesNotThrow(() => setDone('step-1-java-syntax', true));
  assert.equal(isDone('step-1-java-syntax'), false);
  global.localStorage = original;
});
