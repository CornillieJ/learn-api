const test = require('node:test');
const assert = require('node:assert/strict');
const { computeSchedule, parseTasks, totalHours } = require('./pace-chooser.js');

// Same shape as a real list: 6 + 8 + 6 + 3 + 2 = 25h.
const TASKS = parseTasks([
  { label: 'Part 1: Basics', hours: '6' },
  { label: 'Part 2: Going deeper', hours: '8' },
  { label: 'Part 3: Practice', hours: '6' },
  { label: 'Part 4: Project', hours: '3' },
  { label: 'Part 5: Review', hours: '2' },
]);
const TOTAL = totalHours(TASKS);

test('parseTasks reads hours, derives short labels, and drops bad rows', () => {
  const t = parseTasks([
    { label: '  Part 1:  Basics ', hours: '6' },
    { label: 'No colon', hours: '1.5' },
    { label: 'Custom', hours: '2', short: 'C' },
    { label: 'Zero', hours: '0' },
    { label: 'NaN', hours: 'abc' },
    { label: '', hours: '3' },
  ]);
  assert.deepEqual(t.map((x) => x.short), ['Part 1', 'No colon', 'C']);
  assert.equal(t[0].label, 'Part 1: Basics');
  assert.equal(t[1].hours, 1.5);
});

test('totalHours sums the task budgets', () => {
  assert.equal(TOTAL, 25);
});

test('rejects non-positive input without dividing by zero', () => {
  const result = computeSchedule({ hoursPerWeek: 0, weeksAvailable: 3 }, TASKS);
  assert.deepEqual(result.weeks, []);
  assert.equal(result.capacityHours, 0);
  assert.match(result.warning, /positive/);
});

test('rejects NaN input without producing NaN in output', () => {
  for (const input of [{ hoursPerWeek: NaN, weeksAvailable: 3 }, { hoursPerWeek: 5, weeksAvailable: NaN }]) {
    const r = computeSchedule(input, TASKS);
    assert.deepEqual(r.weeks, []);
    assert.equal(r.capacityHours, 0);
    assert.match(r.warning, /positive/);
  }
});

test('warns with the exact shortfall when capacity is below the total', () => {
  const result = computeSchedule({ hoursPerWeek: 4, weeksAvailable: 4 }, TASKS);
  assert.equal(result.capacityHours, 16);
  assert.match(result.warning, /9h more/);
});

test('produces no warning and a full week-by-week plan when capacity covers everything', () => {
  const result = computeSchedule({ hoursPerWeek: 10, weeksAvailable: 4 }, TASKS);
  assert.equal(result.warning, null);
  assert.ok(result.weeks.length > 0);
  assert.ok(result.weeks.every((w) => Array.isArray(w.focus) && w.focus.length > 0));
});

test('never puts more hours into a week than the weekly budget', () => {
  for (const hpw of [1, 2, 3, 4, 5, 7, 10, 15]) {
    const result = computeSchedule({ hoursPerWeek: hpw, weeksAvailable: 12 }, TASKS);
    for (const w of result.weeks) {
      const sum = w.segments.reduce((s, seg) => s + seg.hours, 0);
      assert.ok(sum <= hpw + 1e-9, `week ${w.week} at ${hpw}h/week has ${sum}h`);
    }
  }
});

test('splits an 8h task at 4h/week across weeks as labelled parts', () => {
  const result = computeSchedule({ hoursPerWeek: 4, weeksAvailable: 10 }, TASKS);
  const p2 = result.weeks.flatMap((w) => w.segments.map((s) => ({ ...s, week: w.week }))).filter((s) => s.label.startsWith('Part 2'));
  // Part 1 takes 6h: week 1 (4h) + 2h of week 2, so Part 2 gets 2h, 4h, 2h.
  assert.deepEqual(p2.map((s) => s.hours), [2, 4, 2]);
  assert.ok(p2.every((s) => s.parts === 3));
  assert.match(result.weeks[p2[0].week - 1].focus.join(' '), /Part 2.*part 1\/3/);
});

test('schedules every hour exactly once when capacity suffices', () => {
  const result = computeSchedule({ hoursPerWeek: 4, weeksAvailable: 7 }, TASKS);
  const total = result.weeks.reduce((s, w) => s + w.segments.reduce((a, seg) => a + seg.hours, 0), 0);
  assert.equal(total, TOTAL);
  assert.equal(result.unscheduled.length, 0);
  assert.equal(result.weeks.length, 7);
  assert.equal(result.weeksNeeded, 7);
});

test('reports the unscheduled remainder when weeks run out, counting the cut task as split', () => {
  const result = computeSchedule({ hoursPerWeek: 4, weeksAvailable: 4 }, TASKS);
  const left = result.unscheduled.reduce((s, u) => s + u.hours, 0);
  assert.equal(left, TOTAL - 16);
  const cut = result.weeks[3].segments.at(-1);
  assert.ok(cut.parts > cut.part, 'the task cut off by week 4 is labelled as unfinished');
});

test('an empty task list is harmless', () => {
  const r = computeSchedule({ hoursPerWeek: 4, weeksAvailable: 4 }, []);
  assert.equal(r.totalHours, 0);
  assert.equal(r.warning, null);
  assert.deepEqual(r.weeks, []);
});
