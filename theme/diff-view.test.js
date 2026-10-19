const test = require('node:test');
const assert = require('node:assert/strict');
const { parseDiff, linesForView } = require('./diff-view.js');

test('classifies context, add and del lines, stripping the leading marker', () => {
  const parsed = parseDiff(' same\n-old\n+new\n');
  assert.deepEqual(parsed, [
    { type: 'context', text: 'same' },
    { type: 'del', text: 'old' },
    { type: 'add', text: 'new' },
  ]);
});

test('drops diff --git / index / --- / +++ / @@ boilerplate into meta/hunk types', () => {
  const raw = [
    'diff --git a/f.js b/f.js',
    'index abc123..def456 100644',
    '--- a/f.js',
    '+++ b/f.js',
    '@@ -1,3 +1,3 @@',
    ' x',
  ].join('\n');
  const types = parseDiff(raw).map((l) => l.type);
  assert.deepEqual(types, ['meta', 'meta', 'meta', 'meta', 'hunk', 'context']);
});

test('a bare line with no leading marker (hand-typed snippet) is context', () => {
  assert.deepEqual(parseDiff('plain line'), [{ type: 'context', text: 'plain line' }]);
});

test('diff view keeps everything except meta/hunk', () => {
  const parsed = parseDiff('diff --git a b\n@@ -1 +1 @@\n context\n-del\n+add');
  assert.deepEqual(linesForView(parsed, 'diff').map((l) => l.type), ['context', 'del', 'add']);
});

test('before view keeps context + del, drops add', () => {
  const parsed = parseDiff(' context\n-del\n+add');
  assert.deepEqual(linesForView(parsed, 'before').map((l) => l.type), ['context', 'del']);
});

test('after view keeps context + add, drops del', () => {
  const parsed = parseDiff(' context\n-del\n+add');
  assert.deepEqual(linesForView(parsed, 'after').map((l) => l.type), ['context', 'add']);
});

test('a pure-context diff (no +/- lines) is identical across all three views', () => {
  const parsed = parseDiff(' a\n b\n c');
  const before = linesForView(parsed, 'before');
  const diff = linesForView(parsed, 'diff');
  const after = linesForView(parsed, 'after');
  assert.deepEqual(before, diff);
  assert.deepEqual(diff, after);
  assert.equal(before.length, 3);
});

test('an unknown view falls back to the diff view', () => {
  const parsed = parseDiff(' x\n-y\n+z');
  assert.deepEqual(linesForView(parsed, 'nonsense'), linesForView(parsed, 'diff'));
});
