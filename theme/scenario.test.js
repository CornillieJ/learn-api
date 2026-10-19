const test = require('node:test');
const assert = require('node:assert/strict');
const { buildGraph, resolvePath } = require('./scenario.js');

const RAW = [
  {
    slug: 'start',
    prompt: 'What first?',
    choices: [{ label: 'Deploys', goto: 'deploys' }, { label: 'DB', goto: 'db' }],
  },
  {
    slug: 'deploys',
    result: 'Found a bad deploy.',
    choices: [{ label: 'Roll back', goto: 'end-good' }, { label: 'Hotfix', goto: 'end-bad' }],
  },
  { slug: 'db', result: 'DB is fine.', end: true },
  { slug: 'end-good', result: 'Resolved fast.', end: true, good: true },
  { slug: 'end-bad', result: 'Took a while.', end: true },
  { slug: '  ' },
];

test('builds a graph keyed by slug, skipping blank slugs and gotos', () => {
  const graph = buildGraph(RAW);
  assert.deepEqual(Object.keys(graph).sort(), ['db', 'deploys', 'end-bad', 'end-good', 'start']);
  assert.equal(graph.start.choices.length, 2);
  assert.equal(graph.db.end, true);
  assert.equal(graph['end-good'].good, true);
  assert.equal(graph['end-bad'].good, false);
});

test('a choice with no goto is dropped', () => {
  const graph = buildGraph([{ slug: 'x', choices: [{ label: 'ok', goto: 'y' }, { label: 'bad', goto: '' }] }]);
  assert.equal(graph.x.choices.length, 1);
});

test('resolvePath walks a normal multi-step path to an ending', () => {
  const graph = buildGraph(RAW);
  const path = resolvePath(graph, 'start', ['deploys', 'end-good']);
  assert.deepEqual(path, ['start', 'deploys', 'end-good']);
});

test('resolvePath stops at an ending even if more choices are supplied', () => {
  const graph = buildGraph(RAW);
  const path = resolvePath(graph, 'start', ['db', 'end-good']);
  assert.deepEqual(path, ['start', 'db']);
});

test('resolvePath stops gracefully on a goto that does not match an available choice', () => {
  const graph = buildGraph(RAW);
  const path = resolvePath(graph, 'start', ['nowhere']);
  assert.deepEqual(path, ['start']);
});

test('resolvePath stops gracefully when the start node itself is missing', () => {
  const graph = buildGraph(RAW);
  assert.deepEqual(resolvePath(graph, 'nope', ['start']), []);
});

test('resolvePath stops once choiceGotos runs out, without requiring an ending', () => {
  const graph = buildGraph(RAW);
  assert.deepEqual(resolvePath(graph, 'start', []), ['start']);
});
