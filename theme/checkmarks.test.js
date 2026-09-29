const test = require('node:test');
const assert = require('node:assert/strict');
const { chapterKey, knownKey, slugFromHref } = require('./checkmarks.js');

test('chapterKey namespaces the slug', () => {
  assert.equal(chapterKey('step-3-spring-mvc-war'), 'learn-api:done:step-3-spring-mvc-war');
});

test('knownKey namespaces the slug and the question position', () => {
  assert.equal(knownKey('step-6-lombok', 0), 'learn-api:known:step-6-lombok:0');
  assert.notEqual(knownKey('step-6-lombok', 1), knownKey('step-6-lombok', 0));
  assert.notEqual(knownKey('step-5-spring-security', 0), knownKey('step-6-lombok', 0));
});

test('slugFromHref strips directories, extension, and anchors', () => {
  assert.equal(slugFromHref('step-3-spring-mvc-war.html'), 'step-3-spring-mvc-war');
  assert.equal(slugFromHref('codebase-walkthroughs/overview.html#section'), 'overview');
  assert.equal(slugFromHref('./how-to-use-this-guide.html'), 'how-to-use-this-guide');
});

test('done/known storage never throws when localStorage is unavailable', () => {
  const { isDone, setDone, isKnown, setKnown } = require('./checkmarks.js');
  const original = global.localStorage;
  global.localStorage = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
  };
  assert.doesNotThrow(() => setDone('step-1-java-syntax', true));
  assert.equal(isDone('step-1-java-syntax'), false);
  assert.doesNotThrow(() => setKnown('step-1-java-syntax', 0, true));
  assert.equal(isKnown('step-1-java-syntax', 0), false);
  global.localStorage = original;
});
