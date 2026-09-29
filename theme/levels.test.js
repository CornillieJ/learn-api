const test = require('node:test');
const assert = require('node:assert/strict');
const { isValidLevel } = require('./levels.js');

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

test('falls back to overview and never throws when localStorage is unavailable', () => {
  const { getStoredLevel, setStoredLevel } = require('./levels.js');
  const original = global.localStorage;
  global.localStorage = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
  };
  assert.doesNotThrow(() => setStoredLevel('deep'));
  assert.equal(getStoredLevel(), 'overview');
  global.localStorage = original;
});

test('finds the level a hidden block belongs to from its classes', () => {
  const { levelFromClasses } = require('./levels.js');
  assert.equal(levelFromClasses(['level', 'deep']), 'deep');
  assert.equal(levelFromClasses(['level', 'drill']), 'drill');
  assert.equal(levelFromClasses(['level']), null);
});
