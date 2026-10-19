const test = require('node:test');
const assert = require('node:assert/strict');
const { isValidLevel, storageKey } = require('./levels.js');

test('accepts the three known levels', () => {
  assert.equal(isValidLevel('overview'), true);
  assert.equal(isValidLevel('deep'), true);
  assert.equal(isValidLevel('drill'), true);
});

test('rejects anything else, including corrupted storage values', () => {
  assert.equal(isValidLevel('advanced'), false);
  assert.equal(isValidLevel(null), false);
  assert.equal(isValidLevel(undefined), false);
  assert.equal(isValidLevel(''), false);
});

test('the storage key uses BookConfig.storagePrefix, with a default', () => {
  assert.equal(storageKey(), 'mybook:level');
  global.window = { BookConfig: { storagePrefix: 'git-guide' } };
  try {
    assert.equal(storageKey(), 'git-guide:level');
  } finally {
    delete global.window;
  }
});

test('falls back to overview and never throws when localStorage is unavailable', () => {
  const { getStoredLevel, setStoredLevel } = require('./levels.js');
  const original = global.localStorage;
  global.localStorage = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
  };
  try {
    assert.doesNotThrow(() => setStoredLevel('deep'));
    assert.equal(getStoredLevel(), 'overview');
  } finally {
    global.localStorage = original;
  }
});

test('finds the level a hidden block belongs to from its classes', () => {
  const { levelFromClasses } = require('./levels.js');
  assert.equal(levelFromClasses(['level', 'deep']), 'deep');
  assert.equal(levelFromClasses(['level', 'drill']), 'drill');
  assert.equal(levelFromClasses(['level']), null);
});

test('number keys 1/2/3 map to the three levels, anything else to null', () => {
  const { levelForKey } = require('./levels.js');
  assert.equal(levelForKey('1'), 'overview');
  assert.equal(levelForKey('2'), 'deep');
  assert.equal(levelForKey('3'), 'drill');
  assert.equal(levelForKey('4'), null);
  assert.equal(levelForKey('a'), null);
});

test('a sidebar sub-heading dims only when it belongs to a level that is not active', () => {
  const { isInactiveHeading } = require('./levels.js');
  assert.equal(isInactiveHeading('drill', 'overview'), true);
  assert.equal(isInactiveHeading('drill', 'drill'), false);
  assert.equal(isInactiveHeading(null, 'overview'), false, 'ungated headings are never dimmed');
});
