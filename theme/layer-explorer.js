(function () {
  var LAYERS = [
    { id: 'controller', label: 'Controller',
      annotations: '@RestController, @RequestMapping, @GetMapping/@PostMapping, @PathVariable, @RequestBody',
      files: 'restAPI/controllers/**, e.g. controllers/v2/SchoolController.java',
      csharpShort: 'ASP.NET Core controller',
      csharp: 'An ASP.NET Core [ApiController]: [Route], [HttpGet("{id}")], [FromRoute] / [FromBody] do the same jobs as the Spring annotations.',
      trace: 'The request lands here. @GetMapping matches the URL, @PathVariable binds the id, and getById asks the repository: getRepository().findById(id).' },
    { id: 'repository', label: 'Repository',
      annotations: '@Repository, @Transactional(value = transactionR|transactionRW), constructor @Autowired',
      files: '*RepositoryImpl, e.g. ScholenRepositoryImpl.java',
      csharpShort: 'service layer',
      csharp: 'Your service layer: a DI-registered class (constructor injection) that owns the unit of work. @Transactional is like wrapping the method in a DbContext transaction / TransactionScope.',
      trace: 'The repository opens a transaction (read-only transactionR for a lookup) and delegates the actual query to its DAO.' },
    { id: 'dao', label: 'DAO',
      annotations: 'Hand-written HQL via Session.createQuery(...), not Spring Data JPA',
      files: 'dao/impl/*DaoImpl.java, e.g. ScholenDaoImpl.java',
      csharpShort: 'DbContext queries',
      csharp: 'The code where you would write LINQ against your DbContext (or FromSqlRaw). Here the queries are HQL strings run through a Hibernate Session.',
      trace: 'The DAO builds an HQL query with Session.createQuery(...) and runs it.' },
    { id: 'hibernate', label: 'Hibernate / DB',
      annotations: '@Entity, @Table, @Id / @IdClass, native Hibernate SessionFactory',
      files: 'dbEntities/**, hibernate_VWO.cfg.xml',
      csharpShort: 'EF Core',
      csharp: 'EF Core itself: entities with [Table] / [Key], the model and connection setup. SessionFactory is roughly your configured DbContext factory.',
      trace: 'Hibernate translates HQL to SQL, hits the database, and maps the row onto the @Entity class.' },
  ];
  var RESPONSE_TRACE = 'And back up: the entity travels up as Optional<Scholen>, and the controller answers ResponseEntity.ok(body), or notFound() if it was empty.';

  function renderLayers(layers) {
    return layers.map(function (l, i) {
      return '<button class="layer-row" data-layer="' + l.id + '" aria-expanded="false">' +
        '<span class="layer-index">' + (i + 1) + '</span><span class="layer-label">' + l.label + '</span>' +
        (l.csharpShort ? '<span class="layer-cs">&asymp; ' + l.csharpShort + '</span>' : '') + '</button>';
    }).join('');
  }

  function detailFor(layers, id, view) {
    var layer = layers.filter(function (l) { return l.id === id; })[0];
    if (!layer) return null;
    return view === 'files' ? layer.files : layer.annotations;
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Wrap @Annotations, file paths and Foo.java names in <code>.
  function codeify(text) {
    return escapeHtml(text).replace(/(@[A-Za-z]+(?:\([^)]*\))?|[\w*./-]+\.(?:java|xml)|[\w]+\/\*\*|Session\.createQuery\(\.\.\.\)|\*RepositoryImpl)/g, '<code>$1</code>');
  }

  function detailCard(layer, index) {
    return '<div class="le-card" data-layer="' + layer.id + '">' +
      '<div class="le-card-head"><span class="le-card-num">' + (index + 1) + '</span><span class="le-card-title">' + layer.label + '</span>' +
      '<span class="le-card-cs">C# &asymp; ' + escapeHtml(layer.csharpShort) + '</span></div>' +
      '<dl class="le-facts">' +
      '<dt>Annotations</dt><dd>' + codeify(layer.annotations) + '</dd>' +
      '<dt>Where in the repo</dt><dd>' + codeify(layer.files) + '</dd>' +
      '<dt>In .NET terms</dt><dd>' + escapeHtml(layer.csharp) + '</dd>' +
      '</dl></div>';
  }

  function reduced() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  function wire() {
    var widget = document.querySelector('[data-layer-explorer]');
    if (!widget) return;
    var rows = widget.querySelector('.le-rows');
    var detailEl = widget.querySelector('.le-detail');
    if (!rows || !detailEl) return;
    widget.classList.add('le-enhanced');

    // Build the diagram around the existing .le-rows container.
    var layout = document.createElement('div');
    layout.className = 'le-layout';
    var diagram = document.createElement('div');
    diagram.className = 'le-diagram';
    var client = document.createElement('div');
    client.className = 'le-endpoint le-client';
    client.innerHTML = '<span class="le-ep-dot"></span>HTTP request <code>GET</code> one school';
    var stack = document.createElement('div');
    stack.className = 'le-stack';
    var rail = document.createElement('div');
    rail.className = 'le-rail';
    rail.innerHTML = '<span class="le-dot" aria-hidden="true"></span>';
    var db = document.createElement('div');
    db.className = 'le-endpoint le-db';
    db.innerHTML = '<span class="le-db-icon" aria-hidden="true"></span>Database';
    rows.parentNode.insertBefore(layout, rows);
    stack.appendChild(rail);
    stack.appendChild(rows);
    diagram.appendChild(client);
    diagram.appendChild(stack);
    diagram.appendChild(db);
    layout.appendChild(diagram);
    var side = document.createElement('div');
    side.className = 'le-side';
    var traceBar = document.createElement('div');
    traceBar.className = 'le-trace';
    traceBar.innerHTML = '<button type="button" class="le-trace-btn"><span class="le-play" aria-hidden="true"></span>Trace a request</button>' +
      '<p class="le-caption" aria-live="polite">Click a layer to inspect it, or trace a request through all four.</p>';
    side.appendChild(traceBar);
    side.appendChild(detailEl);
    layout.appendChild(side);

    rows.innerHTML = renderLayers(LAYERS);
    var dot = rail.querySelector('.le-dot');
    var caption = traceBar.querySelector('.le-caption');
    var traceBtn = traceBar.querySelector('.le-trace-btn');
    var tracing = false, timers = [];

    function rowEls() { return Array.prototype.slice.call(rows.querySelectorAll('.layer-row')); }

    function showDetail(id) {
      var idx = 0;
      rowEls().forEach(function (btn, i) {
        var on = btn.getAttribute('data-layer') === id;
        if (on) idx = i;
        btn.setAttribute('aria-expanded', on ? 'true' : 'false');
      });
      detailEl.innerHTML = detailCard(LAYERS[idx], idx);
      var card = detailEl.firstChild;
      card.classList.add('le-pop');
    }

    function moveDotTo(i) {
      var r = rowEls()[i];
      if (!r) return;
      var top = r.offsetTop + r.offsetHeight / 2;
      dot.style.top = top + 'px';
    }

    function clearTrace() {
      timers.forEach(clearTimeout);
      timers = [];
      tracing = false;
      widget.classList.remove('le-tracing', 'le-returning');
      rowEls().forEach(function (r) { r.classList.remove('le-active', 'le-visited'); });
      traceBtn.innerHTML = '<span class="le-play" aria-hidden="true"></span>Trace a request';
    }

    function trace() {
      if (tracing) { clearTrace(); caption.textContent = 'Trace stopped.'; return; }
      clearTrace();
      tracing = true;
      widget.classList.add('le-tracing');
      traceBtn.innerHTML = '<span class="le-stop" aria-hidden="true"></span>Stop';
      var stepMs = reduced() ? 2600 : 2300;
      var els = rowEls();
      dot.style.transition = 'none';
      dot.style.top = '-14px';
      void dot.offsetWidth;
      dot.style.transition = '';
      caption.textContent = 'An HTTP GET for one school arrives at the application...';
      LAYERS.forEach(function (l, i) {
        timers.push(setTimeout(function () {
          els.forEach(function (r, j) { r.classList.toggle('le-active', j === i); if (j < i) r.classList.add('le-visited'); });
          moveDotTo(i);
          showDetail(l.id);
          caption.innerHTML = '<strong>' + (i + 1) + '. ' + l.label + ':</strong> ' + codeify(l.trace);
        }, 500 + i * stepMs));
      });
      var back = 500 + LAYERS.length * stepMs;
      timers.push(setTimeout(function () {
        widget.classList.add('le-returning');
        els.forEach(function (r) { r.classList.remove('le-active'); r.classList.add('le-visited'); });
        dot.style.top = '-14px';
        caption.innerHTML = '<strong>Response:</strong> ' + codeify(RESPONSE_TRACE);
      }, back));
      timers.push(setTimeout(function () {
        tracing = false;
        widget.classList.remove('le-tracing', 'le-returning');
        traceBtn.innerHTML = '<span class="le-play" aria-hidden="true"></span>Trace again';
      }, back + 1800));
    }

    rows.addEventListener('click', function (e) {
      var btn = e.target.closest('.layer-row');
      if (!btn) return;
      if (tracing) clearTrace();
      showDetail(btn.getAttribute('data-layer'));
      var i = rowEls().indexOf(btn);
      moveDotTo(i);
      caption.textContent = 'Layer ' + (i + 1) + ' of 4. Hit "Trace a request" to see them work together.';
    });
    rows.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      var els = rowEls();
      var i = els.indexOf(document.activeElement);
      if (i === -1) return;
      e.preventDefault();
      var n = els[Math.max(0, Math.min(els.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))];
      n.focus();
      n.click();
    });
    traceBtn.addEventListener('click', trace);

    showDetail(LAYERS[0].id);
    dot.style.top = '-14px';
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', wire);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LAYERS: LAYERS, renderLayers: renderLayers, detailFor: detailFor, codeify: codeify };
  }
})();
