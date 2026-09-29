const test = require('node:test');
const assert = require('node:assert/strict');
const { particleSpecs, COLORS } = require('./celebrate.js');

test('generates the requested number of confetti particles with palette colors', () => {
  let i = 0;
  const rand = () => ((i++ * 0.37) % 1);
  const specs = particleSpecs(25, rand);
  assert.equal(specs.length, 25);
  assert.ok(specs.every((s) => COLORS.includes(s.color)));
  assert.ok(specs.every((s) => Number.isFinite(s.dx) && Number.isFinite(s.dy)));
});
