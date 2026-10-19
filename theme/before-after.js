// Before/after slider: two stacked images with a draggable divider. Distinct
// from diff-view/code-compare, which are both text; this is for visuals (a
// redesign, a chart before/after a fix, a photo edit).
//
//   <div class="before-after" data-before-after data-labels="Before|After">
//   <img data-before src="old.png" alt="Old layout">
//   <img data-after src="new.png" alt="New layout">
//   </div>
//
// Raw HTML, not Markdown (same as the layer explorer): write `<img>` tags
// directly. Drag the handle, click anywhere on the image, or focus the
// handle and use the arrow keys (Home/End jump to either end). Without
// JavaScript both images show full-size, stacked, each still labeled by its
// alt text.
(function () {
  // Pure: clamp a percentage into [0, 100].
  function clampPct(pct) {
    return Math.max(0, Math.min(100, pct));
  }

  // Pure: pointer x position + the element's bounding box -> split
  // percentage (0 = all "before", 100 = all "after").
  function pctFromPointer(clientX, rect) {
    if (rect.width <= 0) return 0;
    return clampPct(100 * (clientX - rect.left) / rect.width);
  }

  // Pure: current percentage + an arrow-key direction (-1/1) + step size ->
  // the next percentage, clamped.
  function stepPct(pct, direction, step) {
    return clampPct(pct + direction * step);
  }

  function wireOne(root) {
    var before = root.querySelector('img[data-before]');
    var after = root.querySelector('img[data-after]');
    if (!before || !after) return;

    root.classList.add('ba-ready');
    var labels = (root.getAttribute('data-labels') || 'Before|After').split('|');

    var frame = document.createElement('div');
    frame.className = 'ba-frame';
    var beforeTag = document.createElement('span');
    beforeTag.className = 'ba-tag ba-tag-before';
    beforeTag.textContent = labels[0] || 'Before';
    var afterTag = document.createElement('span');
    afterTag.className = 'ba-tag ba-tag-after';
    afterTag.textContent = labels[1] || 'After';
    var afterWrap = document.createElement('div');
    afterWrap.className = 'ba-after-wrap';
    var handle = document.createElement('button');
    handle.type = 'button';
    handle.className = 'ba-handle';
    handle.setAttribute('aria-label', 'Drag to compare ' + (labels[0] || 'before') + ' and ' + (labels[1] || 'after'));
    handle.innerHTML = '<span class="ba-grip" aria-hidden="true"></span>';

    frame.appendChild(before);
    afterWrap.appendChild(after);
    frame.appendChild(afterWrap);
    frame.appendChild(beforeTag);
    frame.appendChild(afterTag);
    frame.appendChild(handle);
    root.appendChild(frame);

    var pct = 50;
    function render() {
      afterWrap.style.clipPath = 'inset(0 0 0 ' + pct + '%)';
      handle.style.left = pct + '%';
      handle.setAttribute('aria-valuenow', Math.round(pct));
    }
    handle.setAttribute('role', 'slider');
    handle.setAttribute('aria-valuemin', '0');
    handle.setAttribute('aria-valuemax', '100');
    render();

    function setFromPointer(clientX) {
      pct = pctFromPointer(clientX, frame.getBoundingClientRect());
      render();
    }

    var dragging = false;
    handle.addEventListener('pointerdown', function (e) {
      dragging = true;
      handle.setPointerCapture(e.pointerId);
      setFromPointer(e.clientX);
    });
    handle.addEventListener('pointermove', function (e) {
      if (dragging) setFromPointer(e.clientX);
    });
    handle.addEventListener('pointerup', function () { dragging = false; });
    frame.addEventListener('click', function (e) {
      if (e.target === handle || handle.contains(e.target)) return;
      setFromPointer(e.clientX);
    });
    handle.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? 10 : 2;
      if (e.key === 'ArrowLeft') { e.preventDefault(); pct = stepPct(pct, -1, step); render(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); pct = stepPct(pct, 1, step); render(); }
      else if (e.key === 'Home') { e.preventDefault(); pct = 0; render(); }
      else if (e.key === 'End') { e.preventDefault(); pct = 100; render(); }
    });
  }

  function wire() {
    document.querySelectorAll('[data-before-after]').forEach(wireOne);
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', wire);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { clampPct: clampPct, pctFromPointer: pctFromPointer, stepPct: stepPct };
  }
})();
