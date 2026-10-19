// Reference tree: a nested Markdown list becomes a collapsible outline, for
// hierarchical reference material (a file tree, a JSON/API shape, a
// permissions hierarchy, a taxonomy):
//
//   <div class="ref-tree" data-ref-tree>
//
//   - `src/`
//     - `components/`
//       - `Button.tsx`
//   - `package.json`
//
//   </div>
//
// Every item with a nested list gets a toggle; leaf items are plain text.
// Depth 0 (the top level) starts expanded, everything deeper starts
// collapsed, unless data-expanded is set on the container. Keys on a
// focused toggle: Right expands (or moves into the first child if already
// expanded), Left collapses (or moves to the parent if already collapsed),
// Up/Down move between the currently visible toggles.
(function () {
  // Pure: is a node at this depth visible by default?
  // depth is 0-based (top-level items are depth 0).
  function initialVisible(depth, expandAllDefault) {
    return !!expandAllDefault || depth === 0;
  }

  // Pure: wrap an index by `direction` (1 or -1) within [0, count).
  function nextFocusIndex(count, currentIndex, direction) {
    if (count <= 0) return -1;
    return (currentIndex + direction + count) % count;
  }

  function toggleBtn() {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'rt-toggle';
    b.setAttribute('aria-expanded', 'false');
    b.innerHTML = '<span class="rt-chevron" aria-hidden="true"></span>';
    return b;
  }

  function setExpanded(btn, sublist, expanded) {
    btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    sublist.hidden = !expanded;
  }

  function wireOne(root) {
    var topList = root.querySelector(':scope > ul, :scope > ol');
    if (!topList) return;
    var expandAllDefault = root.hasAttribute('data-expanded');
    var pairs = []; // { btn, sublist }

    function enhance(list, depth) {
      Array.prototype.forEach.call(list.children, function (li) {
        if (li.tagName !== 'LI') return;
        var sublist = li.querySelector(':scope > ul, :scope > ol');
        if (!sublist) return; // leaf: nothing to do
        var btn = toggleBtn();
        li.insertBefore(btn, li.firstChild);
        var visible = initialVisible(depth, expandAllDefault);
        setExpanded(btn, sublist, visible);
        pairs.push({ btn: btn, sublist: sublist });
        enhance(sublist, depth + 1);
      });
    }
    enhance(topList, 0);
    if (!pairs.length) return;

    root.classList.add('rt-ready');

    var controls = document.createElement('div');
    controls.className = 'rt-controls';
    var expandAllBtn = document.createElement('button');
    expandAllBtn.type = 'button';
    expandAllBtn.className = 'rt-all';
    expandAllBtn.textContent = 'Expand all';
    var collapseAllBtn = document.createElement('button');
    collapseAllBtn.type = 'button';
    collapseAllBtn.className = 'rt-all';
    collapseAllBtn.textContent = 'Collapse all';
    controls.appendChild(expandAllBtn);
    controls.appendChild(collapseAllBtn);
    root.insertBefore(controls, topList);

    expandAllBtn.addEventListener('click', function () {
      pairs.forEach(function (p) { setExpanded(p.btn, p.sublist, true); });
    });
    collapseAllBtn.addEventListener('click', function () {
      pairs.forEach(function (p) { setExpanded(p.btn, p.sublist, false); });
    });

    function pairFor(btn) {
      for (var i = 0; i < pairs.length; i++) if (pairs[i].btn === btn) return pairs[i];
      return null;
    }

    function visibleToggles() {
      return pairs.map(function (p) { return p.btn; }).filter(function (b) { return b.offsetParent !== null; });
    }

    function childToggleOf(sublist) {
      return sublist.querySelector(':scope > li > .rt-toggle');
    }

    function parentToggleOf(btn) {
      var li = btn.closest('li');
      var parentList = li && li.parentElement;
      var parentLi = parentList && parentList.closest('li');
      return parentLi ? parentLi.querySelector(':scope > .rt-toggle') : null;
    }

    root.addEventListener('click', function (e) {
      var btn = e.target.closest('.rt-toggle');
      if (!btn) return;
      var p = pairFor(btn);
      if (!p) return;
      setExpanded(btn, p.sublist, btn.getAttribute('aria-expanded') !== 'true');
    });

    root.addEventListener('keydown', function (e) {
      var btn = e.target.closest('.rt-toggle');
      if (!btn) return;
      var p = pairFor(btn);
      if (!p) return;
      var expanded = btn.getAttribute('aria-expanded') === 'true';

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (!expanded) { setExpanded(btn, p.sublist, true); return; }
        var child = childToggleOf(p.sublist);
        if (child) child.focus();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (expanded) { setExpanded(btn, p.sublist, false); return; }
        var parent = parentToggleOf(btn);
        if (parent) parent.focus();
        return;
      }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      var vis = visibleToggles();
      var i = vis.indexOf(btn);
      if (i === -1) return;
      var n = nextFocusIndex(vis.length, i, e.key === 'ArrowDown' ? 1 : -1);
      if (n >= 0) vis[n].focus();
    });
  }

  function wire() {
    document.querySelectorAll('[data-ref-tree]').forEach(wireOne);
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', wire);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initialVisible: initialVisible, nextFocusIndex: nextFocusIndex };
  }
})();
