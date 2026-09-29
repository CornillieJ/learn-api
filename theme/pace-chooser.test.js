const test = require('node:test');
const assert = require('node:assert/strict');
const { computeSchedule, TOTAL_HOURS } = require('./pace-chooser.js');

test('rejects non-positive input without dividing by zero', () => {
  const result = computeSchedule({ hoursPerWeek: 0, weeksAvailable: 3 });
  assert.deepEqual(result.weeks, []);
  assert.equal(result.capacityHours, 0);
  assert.match(result.warning, /positive/);
});

test('warns when capacity is below the total hours needed', () => {
  const result = computeSchedule({ hoursPerWeek: 2, weeksAvailable: 2 });
  assert.equal(result.capacityHours, 4);
  assert.ok(result.warning);
  assert.match(result.warning, /week/);
});

test('produces no warning and a full week-by-week plan when capacity covers everything', () => {
  const result = computeSchedule({ hoursPerWeek: 10, weeksAvailable: 4 });
  assert.equal(result.warning, null);
  assert.ok(result.weeks.length > 0);
  assert.ok(result.weeks.every((w) => Array.isArray(w.focus) && w.focus.length > 0));
});

test('TOTAL_HOURS matches the sum of the step budgets', () => {
  assert.equal(TOTAL_HOURS, 25);
});

test('rejects NaN input without producing NaN in output', () => {
  const resultNaNHours = computeSchedule({ hoursPerWeek: NaN, weeksAvailable: 3 });
  assert.deepEqual(resultNaNHours.weeks, []);
  assert.equal(resultNaNHours.capacityHours, 0);
  assert.match(resultNaNHours.warning, /positive/);

  const resultNaNWeeks = computeSchedule({ hoursPerWeek: 5, weeksAvailable: NaN });
  assert.deepEqual(resultNaNWeeks.weeks, []);
  assert.equal(resultNaNWeeks.capacityHours, 0);
  assert.match(resultNaNWeeks.warning, /positive/);
});
