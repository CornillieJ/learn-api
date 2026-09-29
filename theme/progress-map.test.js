const test = require('node:test');
const assert = require('node:assert/strict');
const { STEPS, journeyState } = require('./progress-map.js');

test('covers the seven step chapters in order', () => {
  assert.equal(STEPS.length, 7);
  assert.equal(STEPS[0].slug, 'step-1-java-syntax');
  assert.equal(STEPS[6].slug, 'step-7-ecosystem-audio');
});

test('"continue" points to the first step not done, even with gaps', () => {
  const s = journeyState([true, true, false, true, false, false, false]);
  assert.equal(s.nextIndex, 2);
  assert.equal(s.doneCount, 3);
  assert.equal(s.allDone, false);
});

test('all done has no next step and 100%', () => {
  const s = journeyState([true, true, true]);
  assert.equal(s.nextIndex, -1);
  assert.equal(s.allDone, true);
  assert.equal(s.percent, 100);
});

test('nothing done starts at step 1', () => {
  const s = journeyState([false, false]);
  assert.equal(s.nextIndex, 0);
  assert.equal(s.percent, 0);
});
