const test = require('node:test');
const assert = require('node:assert/strict');
const { langFromClass } = require('./code-compare.js');

test('labels C# and Java code blocks from mdBook classes', () => {
  assert.equal(langFromClass('language-csharp hljs').label, 'C#');
  assert.equal(langFromClass('language-cs').label, 'C#');
  assert.equal(langFromClass('hljs language-java').label, 'Java');
  assert.equal(langFromClass('language-java').key, 'java');
});

test('falls back sensibly for other or missing languages', () => {
  assert.equal(langFromClass('language-yaml').label, 'Yaml');
  assert.equal(langFromClass('').label, 'Code');
});
