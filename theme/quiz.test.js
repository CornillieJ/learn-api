const test = require('node:test');
const assert = require('node:assert/strict');
const { scoreQuizzes, nextResult, scoreMessage } = require('./quiz.js');

test('first-try right counts as correct; a retry solves but does not score', () => {
  assert.equal(nextResult(null, true), 'first');
  assert.equal(nextResult(null, false), 'missed');
  assert.equal(nextResult('missed', false), 'missed');
  assert.equal(nextResult('missed', true), 'retry');
  assert.equal(nextResult('first', false), 'first', 'a solved quiz is locked');
});

test('scores a page of quizzes', () => {
  const s = scoreQuizzes(['first', 'retry', 'missed', null, 'first']);
  assert.equal(s.total, 5);
  assert.equal(s.answered, 4);
  assert.equal(s.correct, 2);
  assert.equal(s.solved, 3);
  assert.equal(s.complete, false);
  assert.equal(s.perfect, false);
});

test('perfect only when every quiz was right first time', () => {
  assert.equal(scoreQuizzes(['first', 'first']).perfect, true);
  assert.equal(scoreQuizzes(['first', 'retry']).perfect, false);
  assert.equal(scoreQuizzes(['first', 'retry']).complete, true);
  assert.equal(scoreQuizzes([]).perfect, false);
});

test('score message reflects progress', () => {
  assert.match(scoreMessage(scoreQuizzes([null, null])), /2 questions/);
  assert.match(scoreMessage(scoreQuizzes(['first', null])), /1\/1 right first time, 1 to go/);
  assert.match(scoreMessage(scoreQuizzes(['first', 'first'])), /Perfect/);
});
