(function () {
  var LAYERS = [
    { id: 'controller', label: 'Controller',
      annotations: '@RestController, @RequestMapping, @GetMapping/@PostMapping, @PathVariable, @RequestBody',
      files: 'restAPI/controllers/**, e.g. controllers/v2/SchoolController.java' },
    { id: 'repository', label: 'Repository',
      annotations: '@Repository, @Transactional(value = transactionR|transactionRW), constructor @Autowired',
      files: '*RepositoryImpl, e.g. ScholenRepositoryImpl.java' },
    { id: 'dao', label: 'DAO',
      annotations: 'Hand-written HQL via Session.createQuery(...) — not Spring Data JPA',
      files: 'dao/impl/*DaoImpl.java, e.g. ScholenDaoImpl.java' },
    { id: 'hibernate', label: 'Hibernate / DB',
      annotations: '@Entity, @Table, @Id / @IdClass, native Hibernate SessionFactory',
      files: 'dbEntities/**, hibernate_VWO.cfg.xml' },
  ];

  function renderLayers(layers) {
    return layers.map(function (l, i) {
      return '<button class="layer-row" data-layer="' + l.id + '" aria-expanded="false">' +
        '<span class="layer-index">' + (i + 1) + '</span><span class="layer-label">' + l.label + '</span></button>';
    }).join('');
  }

  function detailFor(layers, id, view) {
    var layer = layers.filter(function (l) { return l.id === id; })[0];
    if (!layer) return null;
    return view === 'files' ? layer.files : layer.annotations;
  }

  function wire() {
    var widget = document.querySelector('[data-layer-explorer]');
    if (!widget) return;
    var rows = widget.querySelector('.le-rows');
    var detailEl = widget.querySelector('.le-detail');
    rows.innerHTML = renderLayers(LAYERS);
    var view = 'annotations';

    function showDetail(id) {
      Array.prototype.slice.call(rows.querySelectorAll('.layer-row')).forEach(function (btn) {
        btn.setAttribute('aria-expanded', btn.getAttribute('data-layer') === id ? 'true' : 'false');
      });
      detailEl.textContent = detailFor(LAYERS, id, view);
    }

    rows.addEventListener('click', function (e) {
      var btn = e.target.closest('.layer-row');
      if (!btn) return;
      showDetail(btn.getAttribute('data-layer'));
    });

    widget.querySelectorAll('.le-view-toggle button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        view = btn.getAttribute('data-view');
        widget.querySelectorAll('.le-view-toggle button').forEach(function (b) {
          b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        var active = rows.querySelector('.layer-row[aria-expanded="true"]');
        if (active) showDetail(active.getAttribute('data-layer'));
      });
    });

    showDetail(LAYERS[0].id);
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', wire);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LAYERS: LAYERS, renderLayers: renderLayers, detailFor: detailFor };
  }
})();
