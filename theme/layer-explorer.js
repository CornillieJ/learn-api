// Layer explorer: a clickable stack of layers with a detail card and an
// animated "Trace a request" dot, built from markup:
//
//   <div class="layer-explorer" data-layer-explorer data-entry="HTTP request" data-exit="Database">
//   <div class="layer" data-name="Controller" data-tag="routing + validation"
//        data-trace="The request lands in the controller">Detail HTML for the card.</div>
//   ...
//   </div>
//
// Per layer: data-name (required), data-tag (small chip), data-trace (the
// caption while the trace dot sits on this layer; `backticks` become code).
// On the container, all optional: data-entry / data-exit (end nodes above and
// below the stack; omitted when absent), data-return (caption for the trip
// back up), data-trace-label (button text, default "Trace a request").
// Keys: arrow up/down (and Home/End) move between layers.
(function () {
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Escape text, then turn `backticks` into <code>.
  function inlineCode(text) {
    return escapeHtml(text || '').replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  // Pure: raw attributes -> layer objects (layers without a name are skipped).
  function parseLayers(raw) {
    var out = [];
    (raw || []).forEach(function (r) {
      var name = String(r.name || '').trim();
      if (!name) return;
      out.push({
        id: 'layer-' + out.length,
        name: name,
        tag: String(r.tag || '').trim(),
        trace: String(r.trace || '').trim(),
        html: r.html || '',
      });
    });
    return out;
  }

  function renderLayers(layers) {
    return layers.map(function (l, i) {
      return '<button type="button" class="layer-row" data-layer="' + l.id + '" aria-expanded="false">' +
        '<span class="layer-index">' + (i + 1) + '</span><span class="layer-text"><span class="layer-label">' + escapeHtml(l.name) + '</span>' +
        (l.tag ? '<span class="layer-tag">' + escapeHtml(l.tag) + '</span>' : '') + '</span></button>';
    }).join('');
  }

  function detailCard(layer, index) {
    return '<div class="le-card" data-layer="' + layer.id + '">' +
      '<div class="le-card-head"><span class="le-card-num">' + (index + 1) + '</span><span class="le-card-title">' + escapeHtml(layer.name) + '</span>' +
      (layer.tag ? '<span class="le-card-tag">' + escapeHtml(layer.tag) + '</span>' : '') + '</div>' +
      '<div class="le-card-body">' + layer.html + '</div></div>';
  }

  function reduced() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  function wireOne(widget) {
    var layerEls = Array.prototype.slice.call(widget.querySelectorAll(':scope > .layer'));
    var layers = parseLayers(layerEls.map(function (el) {
      return { name: el.getAttribute('data-name'), tag: el.getAttribute('data-tag'), trace: el.getAttribute('data-trace'), html: el.innerHTML.trim() };
    }));
    if (!layers.length) return;
    layerEls.forEach(function (el) { el.remove(); });
    widget.classList.add('le-enhanced');
    var entry = widget.getAttribute('data-entry');
    var exit = widget.getAttribute('data-exit');
    var traceLabel = widget.getAttribute('data-trace-label') || 'Trace a request';
    var returnText = widget.getAttribute('data-return') || 'And back up: the response travels through every layer on its way out.';

    var layout = document.createElement('div');
    layout.className = 'le-layout';
    var diagram = document.createElement('div');
    diagram.className = 'le-diagram';
    if (entry) {
      var top = document.createElement('div');
      top.className = 'le-endpoint le-entry';
      top.innerHTML = '<span class="le-ep-dot" aria-hidden="true"></span>' + inlineCode(entry);
      diagram.appendChild(top);
    }
    var stack = document.createElement('div');
    stack.className = 'le-stack';
    var rail = document.createElement('div');
    rail.className = 'le-rail';
    rail.innerHTML = '<span class="le-dot" aria-hidden="true"></span>';
    var rows = document.createElement('div');
    rows.className = 'le-rows';
    rows.setAttribute('role', 'group');
    rows.setAttribute('aria-label', 'Layers');
    rows.innerHTML = renderLayers(layers);
    stack.appendChild(rail);
    stack.appendChild(rows);
    diagram.appendChild(stack);
    if (exit) {
      var bottom = document.createElement('div');
      bottom.className = 'le-endpoint le-exit';
      bottom.innerHTML = '<span class="le-db-icon" aria-hidden="true"></span>' + inlineCode(exit);
      diagram.appendChild(bottom);
    }
    layout.appendChild(diagram);
    var side = document.createElement('div');
    side.className = 'le-side';
    var traceBar = document.createElement('div');
    traceBar.className = 'le-trace';
    traceBar.innerHTML = '<button type="button" class="le-trace-btn"></button>' +
      '<p class="le-caption" aria-live="polite"></p>';
    var detailEl = document.createElement('div');
    detailEl.className = 'le-detail';
    detailEl.setAttribute('aria-live', 'polite');
    side.appendChild(traceBar);
    side.appendChild(detailEl);
    layout.appendChild(side);
    widget.appendChild(layout);

    var dot = rail.querySelector('.le-dot');
    var caption = traceBar.querySelector('.le-caption');
    var traceBtn = traceBar.querySelector('.le-trace-btn');
    var tracing = false, timers = [];
    function setBtn(kind, text) {
      traceBtn.innerHTML = '<span class="le-' + kind + '" aria-hidden="true"></span>' + escapeHtml(text);
    }
    setBtn('play', traceLabel);
    caption.textContent = 'Click a layer to inspect it, or trace a request through all ' + layers.length + '.';

    function rowEls() { return Array.prototype.slice.call(rows.querySelectorAll('.layer-row')); }

    function showDetail(idx) {
      rowEls().forEach(function (btn, i) { btn.setAttribute('aria-expanded', i === idx ? 'true' : 'false'); });
      detailEl.innerHTML = detailCard(layers[idx], idx);
      detailEl.firstChild.classList.add('le-pop');
    }

    function moveDotTo(i) {
      var r = rowEls()[i];
      if (r) dot.style.top = (r.offsetTop + r.offsetHeight / 2) + 'px';
    }

    function clearTrace() {
      timers.forEach(clearTimeout);
      timers = [];
      tracing = false;
      widget.classList.remove('le-tracing', 'le-returning');
      rowEls().forEach(function (r) { r.classList.remove('le-active', 'le-visited'); });
      setBtn('play', traceLabel);
    }

    function trace() {
      if (tracing) { clearTrace(); caption.textContent = 'Trace stopped.'; return; }
      clearTrace();
      tracing = true;
      widget.classList.add('le-tracing');
      setBtn('stop', 'Stop');
      var stepMs = reduced() ? 2600 : 2300;
      var els = rowEls();
      dot.style.transition = 'none';
      dot.style.top = '-14px';
      void dot.offsetWidth;
      dot.style.transition = '';
      caption.innerHTML = entry ? inlineCode(entry) + ' arrives&hellip;' : 'Starting at the top&hellip;';
      layers.forEach(function (l, i) {
        timers.push(setTimeout(function () {
          els.forEach(function (r, j) { r.classList.toggle('le-active', j === i); if (j < i) r.classList.add('le-visited'); });
          moveDotTo(i);
          showDetail(i);
          caption.innerHTML = '<strong>' + (i + 1) + '. ' + escapeHtml(l.name) + ':</strong> ' + inlineCode(l.trace || l.tag || '');
        }, 500 + i * stepMs));
      });
      var back = 500 + layers.length * stepMs;
      timers.push(setTimeout(function () {
        widget.classList.add('le-returning');
        els.forEach(function (r) { r.classList.remove('le-active'); r.classList.add('le-visited'); });
        dot.style.top = '-14px';
        caption.innerHTML = '<strong>Response:</strong> ' + inlineCode(returnText);
      }, back));
      timers.push(setTimeout(function () {
        tracing = false;
        widget.classList.remove('le-tracing', 'le-returning');
        setBtn('play', 'Trace again');
      }, back + 1800));
    }

    rows.addEventListener('click', function (e) {
      var btn = e.target.closest('.layer-row');
      if (!btn) return;
      if (tracing) clearTrace();
      var i = rowEls().indexOf(btn);
      showDetail(i);
      moveDotTo(i);
      caption.textContent = 'Layer ' + (i + 1) + ' of ' + layers.length + '. Hit "' + traceLabel + '" to see them work together.';
    });
    rows.addEventListener('keydown', function (e) {
      var els = rowEls();
      var i = els.indexOf(document.activeElement);
      if (i === -1) return;
      var n;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = Math.min(els.length - 1, i + 1);
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = Math.max(0, i - 1);
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = els.length - 1;
      else return;
      e.preventDefault();
      els[n].focus();
      els[n].click();
    });
    traceBtn.addEventListener('click', trace);

    showDetail(0);
    moveDotTo(0);
  }

  function wire() {
    document.querySelectorAll('[data-layer-explorer]').forEach(wireOne);
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', wire);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { parseLayers: parseLayers, renderLayers: renderLayers, detailCard: detailCard, inlineCode: inlineCode };
  }
})();
