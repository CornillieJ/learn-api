const test = require('node:test');
const assert = require('node:assert/strict');
const { themeVariablesFrom, clampZoom } = require('./mermaid-diagram.js');

function fakeVars(map) {
  return function (name) { return map[name] || ''; };
}

test('maps book CSS variables onto mermaid theme variables', () => {
  const vars = themeVariablesFrom(fakeVars({
    '--bg': '#111', '--fg': '#eee', '--ia-accent': '#f0a', '--ia-border': '#333',
    '--ia-surface': '#222', '--ia-surface-2': '#2a2a2a',
  }));
  assert.equal(vars.background, '#111');
  assert.equal(vars.textColor, '#eee');
  assert.equal(vars.primaryBorderColor, '#f0a');
  assert.equal(vars.nodeBorder, '#f0a');
  assert.equal(vars.lineColor, '#333');
  assert.equal(vars.primaryColor, '#222');
  assert.equal(vars.clusterBkg, '#2a2a2a');
});

test('falls back to sane defaults when a variable is missing', () => {
  const vars = themeVariablesFrom(fakeVars({}));
  assert.equal(vars.background, '#fff');
  assert.equal(vars.textColor, '#111');
  assert.equal(vars.primaryBorderColor, '#CC007A');
  assert.equal(vars.fontFamily, 'sans-serif');
});

test('prefers --font-sans for fontFamily, then --ia-mono, then the default', () => {
  assert.equal(themeVariablesFrom(fakeVars({ '--font-sans': 'Georgia' })).fontFamily, 'Georgia');
  assert.equal(themeVariablesFrom(fakeVars({ '--ia-mono': 'Menlo' })).fontFamily, 'Menlo');
  assert.equal(themeVariablesFrom(fakeVars({})).fontFamily, 'sans-serif');
});

test('clampZoom keeps the value within [min, max]', () => {
  assert.equal(clampZoom(1, 0.4, 3), 1);
  assert.equal(clampZoom(0.1, 0.4, 3), 0.4);
  assert.equal(clampZoom(10, 0.4, 3), 3);
});
