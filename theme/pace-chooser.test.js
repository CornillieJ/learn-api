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

test('warns at the widget defaults, where every step still gets scheduled', () => {
  const result = computeSchedule({ hoursPerWeek: 4, weeksAvailable: 4 });
  assert.equal(result.capacityHours, 16);
  assert.ok(result.warning, 'capacity of 16h against 25h of work must warn');
  assert.match(result.warning, /9h more/);
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

test('never puts more hours into a week than the weekly budget', () => {
  for (const hpw of [1, 2, 3, 4, 5, 7, 10, 15]) {
    const result = computeSchedule({ hoursPerWeek: hpw, weeksAvailable: 12 });
    for (const w of result.weeks) {
      const sum = w.segments.reduce((s, seg) => s + seg.hours, 0);
      assert.ok(sum <= hpw + 1e-9, `week ${w.week} at ${hpw}h/week has ${sum}h`);
    }
  }
});

test('splits an 8h step at 4h/week across weeks as labelled parts', () => {
  const result = computeSchedule({ hoursPerWeek: 4, weeksAvailable: 10 });
  const step3 = result.weeks.flatMap((w) => w.segments.map((s) => ({ ...s, week: w.week }))).filter((s) => s.label.startsWith('Step 3'));
  // Steps 1-2 take 6h: week 1 (4h) + 2h of week 2, so Step 3 gets 2h, 4h, 2h.
  assert.deepEqual(step3.map((s) => s.hours), [2, 4, 2]);
  assert.equal(step3.reduce((a, s) => a + s.hours, 0), 8);
  assert.ok(step3.every((s) => s.parts === 3));
  assert.match(result.weeks[step3[0].week - 1].focus.join(' '), /Step 3.*part 1\/3/);
});

test('schedules every hour exactly once when capacity suffices', () => {
  const result = computeSchedule({ hoursPerWeek: 4, weeksAvailable: 7 });
  const total = result.weeks.reduce((s, w) => s + w.segments.reduce((a, seg) => a + seg.hours, 0), 0);
  assert.equal(total, TOTAL_HOURS);
  assert.equal(result.unscheduled.length, 0);
  assert.equal(result.weeks.length, 7);
  assert.equal(result.weeksNeeded, 7);
});

test('reports the unscheduled remainder when weeks run out', () => {
  const result = computeSchedule({ hoursPerWeek: 4, weeksAvailable: 4 });
  const left = result.unscheduled.reduce((s, u) => s + u.hours, 0);
  assert.equal(left, TOTAL_HOURS - 16);
});
