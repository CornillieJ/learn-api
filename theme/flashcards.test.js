const test = require('node:test');
const assert = require('node:assert/strict');
const fc = require('./flashcards.js');

test('a new deck starts at the first card with nothing known', () => {
  const d = fc.makeDeck(3);
  assert.equal(fc.current(d), 0);
  assert.equal(fc.progressLabel(d), '0 / 3');
  assert.equal(fc.isFinished(d), false);
});

test('"Got it" removes the card from the round', () => {
  let d = fc.makeDeck(3);
  d = fc.gotIt(d);
  assert.deepEqual(d.queue, [1, 2]);
  assert.deepEqual(d.known, [0]);
  assert.equal(fc.progressLabel(d), '1 / 3');
});

test('"Again" re-queues the card at the back and counts the repeat', () => {
  let d = fc.makeDeck(3);
  d = fc.again(d);
  assert.deepEqual(d.queue, [1, 2, 0]);
  assert.equal(d.again, 1);
  assert.equal(d.known.length, 0);
});

test('the round finishes once every card is known, however many repeats', () => {
  let d = fc.makeDeck(2);
  d = fc.again(d); d = fc.gotIt(d); d = fc.again(d); d = fc.gotIt(d);
  assert.equal(fc.isFinished(d), true);
  assert.equal(fc.current(d), null);
  assert.deepEqual(d.known.sort(), [0, 1]);
  assert.equal(fc.gotIt(d), d, 'no-op on an empty queue');
});

test('shuffle is a permutation and does not mutate its input', () => {
  const input = [0, 1, 2, 3, 4, 5];
  const out = fc.shuffle(input, () => 0.3);
  assert.deepEqual(input, [0, 1, 2, 3, 4, 5]);
  assert.deepEqual([...out].sort(), input);
});

test('a deck can start from a custom order', () => {
  const d = fc.makeDeck(3, [2, 0, 1]);
  assert.equal(fc.current(d), 2);
});

test('side labels come from data attributes, with Question/Answer defaults', () => {
  assert.deepEqual(fc.sideLabels('Term', 'Meaning'), { front: 'Term', back: 'Meaning' });
  assert.deepEqual(fc.sideLabels(null, undefined), { front: 'Question', back: 'Answer' });
  assert.deepEqual(fc.sideLabels('  ', 'Git'), { front: 'Question', back: 'Git' });
});
