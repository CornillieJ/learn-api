const test = require('node:test');
const assert = require('node:assert/strict');
const { parseLayers, renderLayers, detailCard, inlineCode } = require('./layer-explorer.js');

const RAW = [
  { name: 'Browser', tag: 'client', trace: 'Sends `GET /`', html: '<p>Detail</p>' },
  { name: '  ', tag: 'ignored' },
  { name: 'Server', tag: '', trace: '', html: 'Server <b>detail</b>' },
];

test('parses layers from markup attributes, skipping nameless ones', () => {
  const layers = parseLayers(RAW);
  assert.equal(layers.length, 2);
  assert.deepEqual(layers.map((l) => l.id), ['layer-0', 'layer-1']);
  assert.equal(layers[0].tag, 'client');
  assert.equal(parseLayers(undefined).length, 0);
});

test('renders exactly one row per layer, with a tag chip only when given', () => {
  const html = renderLayers(parseLayers(RAW));
  assert.equal((html.match(/data-layer="/g) || []).length, 2);
  assert.equal((html.match(/layer-tag/g) || []).length, 1);
  assert.ok(html.includes('Browser') && html.includes('Server'));
});

test('escapes names so markup in attributes cannot break the widget', () => {
  const html = renderLayers(parseLayers([{ name: '<script>' }]));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
});

test('the detail card carries the author HTML untouched', () => {
  const [, server] = parseLayers(RAW);
  const card = detailCard(server, 1);
  assert.match(card, /le-card-num">2</);
  assert.match(card, /Server <b>detail<\/b>/);
});

test('inlineCode escapes HTML and turns backticks into <code>', () => {
  assert.equal(inlineCode('Sends `GET /` & waits <1s'), 'Sends <code>GET /</code> &amp; waits &lt;1s');
  assert.equal(inlineCode(null), '');
});
