const test = require('node:test');
const assert = require('node:assert/strict');
const { langFromClass, splitList, paneSetup } = require('./code-compare.js');

test('labels common languages from mdBook/highlight.js classes', () => {
  assert.equal(langFromClass('language-csharp hljs').label, 'C#');
  assert.equal(langFromClass('language-cs').label, 'C#');
  assert.equal(langFromClass('hljs language-java').label, 'Java');
  assert.equal(langFromClass('language-py').label, 'Python');
  assert.equal(langFromClass('language-ts').label, 'TypeScript');
  assert.equal(langFromClass('language-sh').label, 'Shell');
  assert.equal(langFromClass('language-yaml').label, 'YAML');
  assert.equal(langFromClass('language-cpp').key, 'cpp');
});

test('falls back to the raw language name, or "Code" with none', () => {
  assert.equal(langFromClass('language-zig').label, 'zig');
  assert.equal(langFromClass('').label, 'Code');
  assert.equal(langFromClass(undefined).key, 'code');
});

test('splitList splits on | and trims', () => {
  assert.deepEqual(splitList('Before | After'), ['Before', 'After']);
  assert.deepEqual(splitList(null), []);
});

test('paneSetup: labels override languages, subs are optional, default is the last pane', () => {
  const s = paneSetup(['language-js', 'language-ts'], 'Before|After', '|strict mode', null);
  assert.deepEqual(s.panes.map((p) => p.label), ['Before', 'After']);
  assert.deepEqual(s.panes.map((p) => p.sub), ['', 'strict mode']);
  assert.equal(s.defaultIndex, 1);
});

test('paneSetup: data-default is 1-based and ignored when out of range', () => {
  assert.equal(paneSetup(['language-a', 'language-b', 'language-c'], null, null, '1').defaultIndex, 0);
  assert.equal(paneSetup(['language-a', 'language-b', 'language-c'], null, null, '2').defaultIndex, 1);
  assert.equal(paneSetup(['language-a', 'language-b', 'language-c'], null, null, '9').defaultIndex, 2);
  assert.equal(paneSetup(['language-a', 'language-b'], 'Only one label', null, null).panes[1].label, 'b');
});
