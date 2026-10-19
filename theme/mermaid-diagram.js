// Mermaid diagrams: a plain ```mermaid fenced code block becomes a themed,
// zoomable, pannable diagram. No new markup to learn — the standard fence
// every other mermaid-aware tool already recognizes:
//
//   ```mermaid
//   flowchart LR
//     A[Request] --> B[Controller] --> C[(Database)]
//   ```
//
// Mermaid itself is lazy-loaded from a CDN, and only on pages that actually
// contain a diagram. Colors come from the same --ia-* tokens interactive.css
// already resolves from the book's theme, so diagrams match light/navy/rust/
// coal/ayu automatically, and re-render themselves the instant the reader
// switches themes (a MutationObserver watches <html class>).
(function () {
  var MERMAID_SRC = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
  var ZOOM_MIN = 0.4, ZOOM_MAX = 3, ZOOM_STEP = 1.2;
  var mermaidPromise = null;

  function loadMermaid() {
    if (mermaidPromise) return mermaidPromise;
    mermaidPromise = new Promise(function (resolve, reject) {
      if (window.mermaid) { resolve(window.mermaid); return; }
      var s = document.createElement('script');
      s.src = MERMAID_SRC;
      s.onload = function () { resolve(window.mermaid); };
      s.onerror = function () { reject(new Error('Could not load Mermaid from the CDN.')); };
      document.head.appendChild(s);
    });
    return mermaidPromise;
  }

  function cssVar(name) {
    try { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); } catch (e) { return ''; }
  }

  // Pure: a CSS-variable getter -> mermaid's `theme: 'base'` themeVariables.
  // Takes a function instead of reading the DOM directly so it's testable.
  function themeVariablesFrom(getVar) {
    var bg = getVar('--bg') || '#fff';
    var fg = getVar('--fg') || '#111';
    var accent = getVar('--ia-accent') || '#CC007A';
    var border = getVar('--ia-border') || 'rgba(127,127,127,0.3)';
    var surface = getVar('--ia-surface') || bg;
    var surface2 = getVar('--ia-surface-2') || surface;
    return {
      background: bg,
      fontFamily: getVar('--font-sans') || getVar('--ia-mono') || 'sans-serif',
      primaryColor: surface,
      primaryTextColor: fg,
      primaryBorderColor: accent,
      secondaryColor: surface2,
      tertiaryColor: surface2,
      lineColor: border,
      textColor: fg,
      mainBkg: surface,
      nodeBorder: accent,
      clusterBkg: surface2,
      clusterBorder: border,
      edgeLabelBackground: bg,
      errorBkgColor: getVar('--ia-danger') || '#c0263a',
      errorTextColor: bg,
    };
  }

  // Pure: clamp a zoom factor between min and max.
  function clampZoom(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function applyTransform(state) {
    state.stage.style.transform = 'translate(' + state.x + 'px, ' + state.y + 'px) scale(' + state.scale + ')';
  }

  function zoomBy(state, factor) {
    state.scale = clampZoom(state.scale * factor, ZOOM_MIN, ZOOM_MAX);
    applyTransform(state);
  }

  function resetView(state) {
    state.scale = 1; state.x = 0; state.y = 0;
    applyTransform(state);
  }

  function buildWidget(pre, id, source) {
    var container = document.createElement('div');
    container.className = 'mmd-diagram';

    var toolbar = document.createElement('div');
    toolbar.className = 'mmd-toolbar';
    toolbar.innerHTML =
      '<button type="button" class="mmd-btn" data-mmd="out" aria-label="Zoom out">−</button>' +
      '<button type="button" class="mmd-btn" data-mmd="reset" aria-label="Reset zoom">⧉</button>' +
      '<button type="button" class="mmd-btn" data-mmd="in" aria-label="Zoom in">+</button>' +
      '<button type="button" class="mmd-btn" data-mmd="source" aria-pressed="false" aria-label="View diagram source">&lt;/&gt;</button>';

    var viewport = document.createElement('div');
    viewport.className = 'mmd-viewport';
    viewport.tabIndex = 0;
    viewport.setAttribute('role', 'img');
    viewport.setAttribute('aria-label', 'Diagram. Drag to pan; plus, minus and 0 to zoom and reset.');

    var stage = document.createElement('div');
    stage.className = 'mmd-stage';
    var status = document.createElement('p');
    status.className = 'mmd-status';
    status.textContent = 'Loading diagram…';
    stage.appendChild(status);
    viewport.appendChild(stage);

    var sourcePre = document.createElement('pre');
    sourcePre.className = 'mmd-source';
    var sourceCode = document.createElement('code');
    sourceCode.className = 'language-mermaid';
    sourceCode.textContent = source;
    sourcePre.appendChild(sourceCode);

    container.appendChild(toolbar);
    container.appendChild(viewport);
    container.appendChild(sourcePre);
    pre.parentNode.replaceChild(container, pre);

    return { id: id, source: source, container: container, viewport: viewport, stage: stage, status: status, toolbar: toolbar };
  }

  function wireControls(w) {
    var state = { scale: 1, x: 0, y: 0, stage: w.stage };
    w.toolbar.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-mmd]');
      if (!btn) return;
      var action = btn.getAttribute('data-mmd');
      if (action === 'in') zoomBy(state, ZOOM_STEP);
      else if (action === 'out') zoomBy(state, 1 / ZOOM_STEP);
      else if (action === 'reset') resetView(state);
      else if (action === 'source') {
        var open = w.container.classList.toggle('mmd-source-open');
        btn.setAttribute('aria-pressed', open ? 'true' : 'false');
      }
    });
    w.viewport.addEventListener('keydown', function (e) {
      if (e.key === '+' || e.key === '=') { zoomBy(state, ZOOM_STEP); e.preventDefault(); }
      else if (e.key === '-' || e.key === '_') { zoomBy(state, 1 / ZOOM_STEP); e.preventDefault(); }
      else if (e.key === '0') { resetView(state); e.preventDefault(); }
    });
    w.viewport.addEventListener('wheel', function (e) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomBy(state, e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP);
    }, { passive: false });

    var dragging = false, startX = 0, startY = 0, origX = 0, origY = 0;
    w.viewport.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true; startX = e.clientX; startY = e.clientY; origX = state.x; origY = state.y;
      w.container.classList.add('mmd-panning');
      try { w.viewport.setPointerCapture(e.pointerId); } catch (err) {}
    });
    w.viewport.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      state.x = origX + (e.clientX - startX);
      state.y = origY + (e.clientY - startY);
      applyTransform(state);
    });
    function endDrag() { dragging = false; w.container.classList.remove('mmd-panning'); }
    w.viewport.addEventListener('pointerup', endDrag);
    w.viewport.addEventListener('pointercancel', endDrag);
  }

  function showError(w, err) {
    w.stage.innerHTML = '';
    var box = document.createElement('div');
    box.className = 'mmd-error';
    var strong = document.createElement('strong');
    strong.textContent = 'This diagram could not be rendered.';
    var pre = document.createElement('pre');
    pre.textContent = (err && err.message) || String(err);
    box.appendChild(strong);
    box.appendChild(pre);
    w.stage.appendChild(box);
  }

  function renderOne(w) {
    return loadMermaid().then(function (mermaid) {
      mermaid.initialize({ startOnLoad: false, theme: 'base', securityLevel: 'strict', themeVariables: themeVariablesFrom(cssVar) });
      return mermaid.render(w.id, w.source);
    }).then(function (result) {
      w.stage.innerHTML = result.svg;
      if (typeof result.bindFunctions === 'function') result.bindFunctions(w.stage);
    }).catch(function (err) { showError(w, err); });
  }

  function wire() {
    var blocks = document.querySelectorAll('pre > code.language-mermaid');
    if (!blocks.length) return;

    var widgets = [];
    Array.prototype.forEach.call(blocks, function (code, i) {
      var w = buildWidget(code.parentNode, 'mmd-diagram-' + i, code.textContent);
      wireControls(w);
      widgets.push(w);
      renderOne(w);
    });

    var timer = null;
    new MutationObserver(function () {
      clearTimeout(timer);
      timer = setTimeout(function () { widgets.forEach(renderOne); }, 60);
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', wire);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { themeVariablesFrom: themeVariablesFrom, clampZoom: clampZoom };
  }
})();
