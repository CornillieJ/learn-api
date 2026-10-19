const test = require('node:test');
const assert = require('node:assert/strict');
const { particleSpecs, parseColorList, COLORS } = require('./celebrate.js');

test('generates the requested number of confetti particles with palette colors', () => {
  let i = 0;
  const rand = () => ((i++ * 0.37) % 1);
  const specs = particleSpecs(25, rand);
  assert.equal(specs.length, 25);
  assert.ok(specs.every((s) => COLORS.includes(s.color)));
  assert.ok(specs.every((s) => Number.isFinite(s.dx) && Number.isFinite(s.dy)));
});

test('uses a custom palette when one is given', () => {
  const specs = particleSpecs(10, () => 0.5, ['red', 'blue']);
  assert.ok(specs.every((s) => ['red', 'blue'].includes(s.color)));
});

test('parses the --bk-confetti token, keeping commas inside color functions', () => {
  assert.deepEqual(parseColorList(' #f0a, rgb(1, 2, 3) ,teal '), ['#f0a', 'rgb(1, 2, 3)', 'teal']);
  assert.deepEqual(parseColorList(''), []);
  assert.deepEqual(parseColorList(undefined), []);
});
