// Shared "fun" helpers: confetti bursts and toasts. Other widgets call
// window.Book.celebrate(originEl, { message, count }) and
// window.Book.toast(text). Load this right after book-config.js.
//
// Confetti colors come from the --bk-confetti CSS token (a comma-separated
// list in custom.css), so recoloring the theme recolors the confetti too.
(function () {
  var COLORS = ['#EC008C', '#44C8F5', '#26A99E', '#FFD400', '#8e6cf0', '#ff7a45'];

  function prefersReducedMotion() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  // "#f0a, rgb(1,2,3) , teal" -> ['#f0a', 'rgb(1,2,3)', 'teal']. Commas
  // inside parentheses do not split.
  function parseColorList(str) {
    var out = [], depth = 0, cur = '';
    String(str || '').split('').forEach(function (ch) {
      if (ch === '(') depth++;
      if (ch === ')') depth = Math.max(0, depth - 1);
      if (ch === ',' && depth === 0) { if (cur.trim()) out.push(cur.trim()); cur = ''; return; }
      cur += ch;
    });
    if (cur.trim()) out.push(cur.trim());
    return out;
  }

  function themeColors() {
    try {
      var list = parseColorList(getComputedStyle(document.documentElement).getPropertyValue('--bk-confetti'));
      return list.length ? list : COLORS;
    } catch (e) { return COLORS; }
  }

  // Deterministic-friendly particle spec generator (rand injectable for tests).
  function particleSpecs(count, rand, colors) {
    rand = rand || Math.random;
    colors = colors && colors.length ? colors : COLORS;
    var out = [];
    for (var i = 0; i < count; i++) {
      var angle = -Math.PI / 2 + (rand() - 0.5) * Math.PI * 1.1; // mostly upwards
      var speed = 180 + rand() * 260;
      out.push({
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        rot: (rand() - 0.5) * 900,
        color: colors[Math.floor(rand() * colors.length)],
        w: 6 + Math.round(rand() * 6),
        h: 8 + Math.round(rand() * 8),
        round: rand() < 0.3,
        delay: Math.round(rand() * 120),
      });
    }
    return out;
  }

  var toastEl = null, toastTimer = null;
  function toast(text, kind) {
    if (typeof document === 'undefined') return;
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'bk-toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = text;
    toastEl.setAttribute('data-kind', kind || 'ok');
    toastEl.classList.remove('show');
    void toastEl.offsetWidth;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2600);
  }

  function celebrate(origin, opts) {
    opts = opts || {};
    if (opts.message) toast(opts.message, 'party');
    if (prefersReducedMotion() || typeof document === 'undefined') return;
    var x = window.innerWidth / 2, y = window.innerHeight / 2;
    if (origin && origin.getBoundingClientRect) {
      var r = origin.getBoundingClientRect();
      x = r.left + r.width / 2; y = r.top + r.height / 2;
    }
    var layer = document.createElement('div');
    layer.className = 'bk-confetti';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
    var specs = particleSpecs(opts.count || 70, null, themeColors());
    specs.forEach(function (s) {
      var p = document.createElement('i');
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      p.style.width = s.w + 'px';
      p.style.height = s.h + 'px';
      p.style.background = s.color;
      if (s.round) p.style.borderRadius = '50%';
      layer.appendChild(p);
      if (p.animate) {
        p.animate([
          { transform: 'translate(-50%,-50%) translate(0,0) rotate(0deg)', opacity: 1 },
          { transform: 'translate(-50%,-50%) translate(' + s.dx * 0.8 + 'px,' + s.dy * 0.8 + 'px) rotate(' + s.rot / 2 + 'deg)', opacity: 1, offset: 0.45 },
          { transform: 'translate(-50%,-50%) translate(' + s.dx + 'px,' + (s.dy + 420) + 'px) rotate(' + s.rot + 'deg)', opacity: 0 },
        ], { duration: 1300 + s.delay * 4, delay: s.delay, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' });
      }
    });
    setTimeout(function () { layer.remove(); }, 2200);
  }

  if (typeof window !== 'undefined') {
    window.Book = window.Book || {};
    window.Book.celebrate = celebrate;
    window.Book.toast = toast;
    window.Book.prefersReducedMotion = prefersReducedMotion;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { particleSpecs: particleSpecs, parseColorList: parseColorList, COLORS: COLORS };
  }
})();
