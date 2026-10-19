const test = require('node:test');
const assert = require('node:assert/strict');
const { feedbackKey, clampComment, buildPayload } = require('./page-feedback.js');

test('feedbackKey namespaces the key by page slug', () => {
  assert.equal(feedbackKey('example-chapter'), 'mybook:feedback:example-chapter');
});

test('clampComment trims whitespace', () => {
  assert.equal(clampComment('  needs more examples  '), 'needs more examples');
});

test('clampComment caps length at the given max', () => {
  const long = 'x'.repeat(50);
  assert.equal(clampComment(long, 10).length, 10);
});

test('clampComment defaults to a 2000 character cap', () => {
  const long = 'x'.repeat(3000);
  assert.equal(clampComment(long).length, 2000);
});

test('clampComment handles missing input', () => {
  assert.equal(clampComment(undefined), '');
  assert.equal(clampComment(null), '');
});

test('buildPayload assembles the webhook body and clamps the comment', () => {
  const payload = buildPayload('example-chapter', 'no', '  too vague  ');
  assert.deepEqual(payload, { slug: 'example-chapter', vote: 'no', comment: 'too vague' });
});
