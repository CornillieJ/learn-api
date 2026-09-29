# learn-api mdBook Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `learn-api` mdBook site: a leveled (Overview/Deep Understanding/Drilling) learning path from the "Learning Java for the VWO API" Notion page, plus a separate "Codebase Walkthroughs" subsection embedding the existing interactive HTML explainers from `~/Coding/api/`.

**Architecture:** Plain mdBook Markdown chapters styled and driven by `theme/custom.css` + five small `theme/*.js` modules (levels, checkmarks, on-this-page nav, pace-chooser widget, layer-explorer widget), on stock mdBook `light`/`navy` themes with a pink (`#EC008C`)/cyan (`#44C8F5`) override. No custom build step — mdBook renders the Markdown directly, including raw embedded HTML for widgets and iframes.

**Tech Stack:** mdBook v0.5.4 (already installed at `~/.local/bin/mdbook`), vanilla JS (no framework, no bundler), Node's built-in `node:test` for the two modules with real computational logic, `git`.

**Spec:** `docs/superpowers/specs/2026-09-29-learn-api-design.md`

## Global Constraints

- Plain mdBook Markdown chapters; do not build sa/guide's Python-generated custom-HTML-shell/iframe-into-nav system.
- Theme tokens: pink `#EC008C` for `.part-title`/`.menu-title`/`strong`; cyan `#44C8F5` for h1/h2/h3 and table headers; base themes `light` + `navy` (`book.toml`: `default-theme = "light"`, `default-dark-theme = "navy"`).
- Every "Step" chapter has exactly three level blocks: Overview, Deep Understanding, Drilling — plus a "Mark this step done" button in Drilling.
- Codebase Walkthrough HTML files are copied verbatim from `~/Coding/api/` and embedded via `<iframe>` — never rewritten or restyled.
- No new runtime dependency beyond what's already installed (mdbook, node, git). No jsdom, no bundler, no CSS/JS framework.
- Source content for every Learning Path chapter comes from the Notion page id `3e29a137-d71d-8195-a910-fa7258bb5a7d` ("Learning Java for the VWO API — a .NET developer's path"), fetched fresh via the `mcp__notion__notion-fetch` tool at the start of each content task — do not paraphrase from memory, use the fetched text's exact section under the heading named in that task.

## Review Focus

- A chapter with no JS levels wired up (missing `data-levels`/`.level` markup) would silently show all three levels stacked with no tabs — every content task's grep check must confirm the tab markup is present, not just that the file exists.
- `localStorage` disabled or unavailable (private browsing, some embedded webviews) must not throw and break the page — every JS module wraps storage access in try/catch and degrades to "nothing persisted" rather than a JS error.
- A reader opening a chapter directly (not via the sidebar) must still get a correctly highlighted sidebar checkmark state and a working on-this-page nav — both must run from `DOMContentLoaded`, not from a sidebar-click handler.
- The pace-chooser must not divide by zero or produce `NaN`/`Infinity` in its output when a slider is at its minimum — pin this with an explicit test, since range inputs can be dragged to their floor.
- The five iframed walkthrough HTML files must actually be reachable at the path the `<iframe src>` uses relative to the chapter — an `mdbook build` smoke check must confirm the copied asset exists at that exact relative path, not just that the source file was copied somewhere.

---

## File Structure

```
learn-api/
  book.toml
  .gitignore
  src/
    SUMMARY.md
    how-to-use-this-guide.md
    step-1-java-syntax.md
    step-2-maven.md
    step-3-spring-mvc-war.md
    step-4-persistence-hibernate.md
    step-5-spring-security.md
    step-6-lombok.md
    step-7-ecosystem-audio.md
    cheat-sheet.md
    tips-dotnet-to-java.md
    tips-learning-new-stack.md
    tips-legacy-codebase.md
    personal-plan.md
    appendix-sources.md
    codebase-walkthroughs/
      overview.md
      business-domain.md
      uml.md
      code-flow.md
      api-endpoints.md
      database-schema.md
      assets/
        walkthrough-domain.html
        walkthrough-uml.html
        walkthrough-code-flow.html
        walkthrough-api-endpoints.html
        walkthrough-db-schema.html
  theme/
    custom.css
    levels.js
    levels.test.js
    checkmarks.js
    checkmarks.test.js
    on-this-page.js
    on-this-page.test.js
    pace-chooser.js
    pace-chooser.test.js
    layer-explorer.js
    layer-explorer.test.js
```

---

### Task 1: Scaffold the book

**Files:**
- Create: `book.toml`
- Create: `.gitignore`
- Create: `src/SUMMARY.md`
- Create: `src/how-to-use-this-guide.md` through `src/appendix-sources.md` (13 placeholder files, one `# <Title>` heading each)
- Create: `src/codebase-walkthroughs/overview.md` through `database-schema.md` (6 placeholder files)

**Interfaces:**
- Produces: the exact chapter file paths every later content task writes into. No other task may introduce a chapter file not listed here.

- [ ] **Step 1: Write `book.toml`**

```toml
[book]
title = "Learning Java for the VWO API"
authors = ["Jeffrey Cornillie"]
language = "en"
src = "src"

[output.html]
default-theme = "light"
default-dark-theme = "navy"
additional-css = ["theme/custom.css"]
additional-js = [
    "theme/levels.js",
    "theme/checkmarks.js",
    "theme/on-this-page.js",
    "theme/pace-chooser.js",
    "theme/layer-explorer.js",
]
```

- [ ] **Step 2: Write `.gitignore`**

```
/book
node_modules/
```

- [ ] **Step 3: Write `src/SUMMARY.md`**

```markdown
# Summary

[Learning Java for the VWO API](how-to-use-this-guide.md)

# Learning Path

- [How to Use This Guide](how-to-use-this-guide.md)
- [Step 1: Java Syntax, Fast (from C#)](step-1-java-syntax.md)
- [Step 2: Maven](step-2-maven.md)
- [Step 3: Spring Core, MVC & WAR Deployment](step-3-spring-mvc-war.md)
- [Step 4: Persistence — Hibernate & HQL](step-4-persistence-hibernate.md)
- [Step 5: Spring Security](step-5-spring-security.md)
- [Step 6: Lombok](step-6-lombok.md)
- [Step 7: Ecosystem & Audio](step-7-ecosystem-audio.md)
- [Cheat Sheet: Concept → File Map](cheat-sheet.md)
- [Tips: .NET → Java / Spring](tips-dotnet-to-java.md)
- [Tips: Learning Any New Stack](tips-learning-new-stack.md)
- [Tips: Entering a Legacy Codebase](tips-legacy-codebase.md)
- [A Short Personal Plan](personal-plan.md)
- [Appendix: Sources & Verification Status](appendix-sources.md)

# Codebase Walkthroughs

- [Overview](codebase-walkthroughs/overview.md)
- [Business Domain](codebase-walkthroughs/business-domain.md)
- [UML](codebase-walkthroughs/uml.md)
- [Code Flow](codebase-walkthroughs/code-flow.md)
- [API Endpoints](codebase-walkthroughs/api-endpoints.md)
- [Database Schema](codebase-walkthroughs/database-schema.md)
```

- [ ] **Step 4: Create the 13 Learning Path placeholder files**

Each file's entire content is a single line, e.g. `src/how-to-use-this-guide.md`:

```markdown
# How to Use This Guide
```

Repeat for: `step-1-java-syntax.md` (`# Step 1: Java Syntax, Fast (from C#)`), `step-2-maven.md` (`# Step 2: Maven`), `step-3-spring-mvc-war.md` (`# Step 3: Spring Core, MVC & WAR Deployment`), `step-4-persistence-hibernate.md` (`# Step 4: Persistence — Hibernate & HQL`), `step-5-spring-security.md` (`# Step 5: Spring Security`), `step-6-lombok.md` (`# Step 6: Lombok`), `step-7-ecosystem-audio.md` (`# Step 7: Ecosystem & Audio`), `cheat-sheet.md` (`# Cheat Sheet: Concept → File Map`), `tips-dotnet-to-java.md` (`# Tips: .NET → Java / Spring`), `tips-learning-new-stack.md` (`# Tips: Learning Any New Stack`), `tips-legacy-codebase.md` (`# Tips: Entering a Legacy Codebase`), `personal-plan.md` (`# A Short Personal Plan`), `appendix-sources.md` (`# Appendix: Sources & Verification Status`).

- [ ] **Step 5: Create the 6 Codebase Walkthrough placeholder files**

`src/codebase-walkthroughs/overview.md` (`# Codebase Walkthroughs`), `business-domain.md` (`# Business Domain`), `uml.md` (`# UML`), `code-flow.md` (`# Code Flow`), `api-endpoints.md` (`# API Endpoints`), `database-schema.md` (`# Database Schema`).

- [ ] **Step 6: Create empty theme files so the build doesn't fail on missing additional-css/js**

```bash
touch theme/custom.css theme/levels.js theme/checkmarks.js theme/on-this-page.js theme/pace-chooser.js theme/layer-explorer.js
```

- [ ] **Step 7: Verify the build**

Run: `mdbook build`
Expected: exits 0, no warnings, `book/` created with 19 HTML pages.

- [ ] **Step 8: Commit**

```bash
git add book.toml .gitignore src theme
git commit -m "Scaffold learn-api mdBook skeleton"
```

---

### Task 2: Theme tokens and shared component CSS

**Files:**
- Modify: `theme/custom.css`

**Interfaces:**
- Produces: CSS classes every later content/widget task relies on: `.callout` (+ `.callout.setup`, `.callout.note`, `.callout.rule`, `.callout.danger`), `.checklist`, `.qa` (+ `.qa[open]`, `.qa .mark`), `.table-wrap`.

- [ ] **Step 1: Write the tokens and shared component rules**

```css
:root {
  --pink: #EC008C;
  --cyan: #44C8F5;
  --teal: #26A99E;
  --yellow: #FFD400;
}

.part-title, .menu-title, strong:not(th strong):not(td strong) {
  color: var(--pink) !important;
}

h1, h2, h3 { color: var(--cyan) !important; }

.table-wrap { overflow-x: auto; margin: 1rem 0; }
.table-wrap table { width: 100%; border-collapse: collapse; }
.table-wrap thead { background: var(--cyan); color: white; }
.table-wrap th, .table-wrap td { padding: 0.5rem 0.8rem; border: 1px solid var(--sidebar-non-existant, #ccc); text-align: left; }

.callout { border-radius: 8px; padding: 0.8rem 1rem; margin: 1rem 0; border: 1px solid var(--sidebar-non-existant, #ccc); background: var(--theme-hover, #f5f5f5); }
.callout-label { font-weight: 700; text-transform: uppercase; font-size: 0.72rem; letter-spacing: 0.06em; margin-bottom: 0.4rem; }
.callout.setup { border-color: var(--yellow); }
.callout.note { border-color: var(--cyan); }
.callout.rule { border-color: var(--teal); }
.callout.danger { border-color: #c0392b; }

.checklist { list-style: none; padding: 0; margin: 1rem 0; display: grid; gap: 0.4rem; }
.checklist label { display: flex; gap: 0.6rem; align-items: flex-start; border: 1px solid var(--sidebar-non-existant, #ccc); border-radius: 8px; padding: 0.5rem 0.75rem; cursor: pointer; }
.checklist input:checked + span { text-decoration: line-through; opacity: 0.7; }

.qa { border: 1px solid var(--sidebar-non-existant, #ccc); border-radius: 8px; margin-bottom: 0.5rem; }
.qa summary { cursor: pointer; padding: 0.6rem 0.8rem; font-weight: 600; }
.qa .ans { padding: 0 0.8rem 0.7rem; }
.qa .mark button { border: 1px solid var(--sidebar-non-existant, #ccc); background: transparent; border-radius: 999px; padding: 0.15rem 0.7rem; font-size: 0.78rem; cursor: pointer; }
.qa.known { border-color: var(--teal); }
.qa.known .mark button { background: var(--teal); color: white; border-color: var(--teal); }
```

- [ ] **Step 2: Verify**

Run: `mdbook build && grep -c "part-title" book/theme/custom.css`
Expected: build exits 0; grep prints a count ≥ 1 (confirms the CSS file was copied into the output, not just present in source).

- [ ] **Step 3: Commit**

```bash
git add theme/custom.css
git commit -m "Add theme tokens and shared component CSS"
```

---

### Task 3: Level tabs (Overview / Deep Understanding / Drilling)

**Files:**
- Create: `theme/levels.js`
- Create: `theme/levels.test.js`
- Modify: `theme/custom.css` (append level-tab rules)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `isValidLevel(value)` (pure, exported), the markup contract every Step chapter must use:
  ```html
  <div class="level-tabs" data-levels>
    <button data-level="overview" aria-pressed="true">Overview</button>
    <button data-level="deep">Deep Understanding</button>
    <button data-level="drill">Drilling</button>
  </div>
  <div class="level overview">...</div>
  <div class="level deep">...</div>
  <div class="level drill">...</div>
  ```
  and the `localStorage` key `"learn-api:level"`.

- [ ] **Step 1: Write the failing test**

```javascript
// theme/levels.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { isValidLevel } = require('./levels.js');

test('accepts the three known levels', () => {
  assert.equal(isValidLevel('overview'), true);
  assert.equal(isValidLevel('deep'), true);
  assert.equal(isValidLevel('drill'), true);
});

test('rejects anything else, including corrupted storage values', () => {
  assert.equal(isValidLevel('advanced'), false);
  assert.equal(isValidLevel(null), false);
  assert.equal(isValidLevel(undefined), false);
  assert.equal(isValidLevel(''), false);
});

test('falls back to overview and never throws when localStorage is unavailable', () => {
  const { getStoredLevel, setStoredLevel } = require('./levels.js');
  const original = global.localStorage;
  global.localStorage = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
  };
  assert.doesNotThrow(() => setStoredLevel('deep'));
  assert.equal(getStoredLevel(), 'overview');
  global.localStorage = original;
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test theme/levels.test.js`
Expected: FAIL — `Cannot find module './levels.js'`.

- [ ] **Step 3: Write `theme/levels.js`**

```javascript
(function () {
  var LEVELS = ['overview', 'deep', 'drill'];
  var KEY = 'learn-api:level';

  function isValidLevel(v) { return LEVELS.indexOf(v) !== -1; }

  function getStoredLevel() {
    try {
      var v = localStorage.getItem(KEY);
      return isValidLevel(v) ? v : 'overview';
    } catch (e) { return 'overview'; }
  }

  function setStoredLevel(level) {
    if (!isValidLevel(level)) return;
    try { localStorage.setItem(KEY, level); } catch (e) {}
  }

  function apply(level) {
    document.querySelectorAll('[data-levels]').forEach(function (tabs) {
      tabs.querySelectorAll('button').forEach(function (btn) {
        btn.setAttribute('aria-pressed', btn.getAttribute('data-level') === level ? 'true' : 'false');
      });
    });
    document.querySelectorAll('.level').forEach(function (el) {
      el.style.display = el.classList.contains(level) ? '' : 'none';
    });
  }

  function wire() {
    var level = getStoredLevel();
    apply(level);
    document.querySelectorAll('[data-levels] button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var next = btn.getAttribute('data-level');
        setStoredLevel(next);
        apply(next);
      });
    });
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', wire);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      isValidLevel: isValidLevel,
      LEVELS: LEVELS,
      getStoredLevel: getStoredLevel,
      setStoredLevel: setStoredLevel,
    };
  }
})();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test theme/levels.test.js`
Expected: PASS, 3 tests.

- [ ] **Step 5: Append level-tab CSS to `theme/custom.css`**

```css
.level-tabs { display: flex; gap: 0.5rem; margin: 1rem 0; flex-wrap: wrap; }
.level-tabs button { border: 1px solid var(--sidebar-non-existant, #ccc); background: transparent; border-radius: 999px; padding: 0.35rem 0.9rem; cursor: pointer; font-size: 0.85rem; }
.level-tabs button[aria-pressed="true"] { background: var(--pink); border-color: var(--pink); color: white; font-weight: 600; }
```

- [ ] **Step 6: Verify markup contract compiles**

Run: `node --check theme/levels.js && mdbook build`
Expected: both exit 0.

- [ ] **Step 7: Commit**

```bash
git add theme/levels.js theme/levels.test.js theme/custom.css
git commit -m "Add level-tabs widget with tested level validation"
```

---

### Task 4: Sidebar checkmarks

**Files:**
- Create: `theme/checkmarks.js`
- Create: `theme/checkmarks.test.js`
- Modify: `theme/custom.css` (append `.done-mark` rule)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `chapterKey(slug)` and `slugFromHref(href)` (pure, exported), the markup contract every Step chapter's Drilling level must include: `<button data-mark-done>Mark this step done</button>`.

- [ ] **Step 1: Write the failing test**

```javascript
// theme/checkmarks.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { chapterKey, slugFromHref } = require('./checkmarks.js');

test('chapterKey namespaces the slug', () => {
  assert.equal(chapterKey('step-3-spring-mvc-war'), 'learn-api:done:step-3-spring-mvc-war');
});

test('slugFromHref strips directories, extension, and anchors', () => {
  assert.equal(slugFromHref('step-3-spring-mvc-war.html'), 'step-3-spring-mvc-war');
  assert.equal(slugFromHref('codebase-walkthroughs/overview.html#section'), 'overview');
  assert.equal(slugFromHref('./how-to-use-this-guide.html'), 'how-to-use-this-guide');
});

test('isDone/setDone never throw when localStorage is unavailable', () => {
  const { isDone, setDone } = require('./checkmarks.js');
  const original = global.localStorage;
  global.localStorage = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
  };
  assert.doesNotThrow(() => setDone('step-1-java-syntax', true));
  assert.equal(isDone('step-1-java-syntax'), false);
  global.localStorage = original;
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test theme/checkmarks.test.js`
Expected: FAIL — `Cannot find module './checkmarks.js'`.

- [ ] **Step 3: Write `theme/checkmarks.js`**

```javascript
(function () {
  var PREFIX = 'learn-api:done:';

  function chapterKey(slug) { return PREFIX + slug; }

  function slugFromHref(href) {
    return href.replace(/^\.?\//, '').replace(/^.*\//, '').replace(/\.html$/, '').replace(/#.*$/, '');
  }

  function isDone(slug) {
    try { return localStorage.getItem(chapterKey(slug)) === '1'; } catch (e) { return false; }
  }

  function setDone(slug, done) {
    try { localStorage.setItem(chapterKey(slug), done ? '1' : '0'); } catch (e) {}
  }

  function currentSlug() { return slugFromHref(location.pathname); }

  function syncSidebar() {
    document.querySelectorAll('#mdbook-sidebar .chapter-item a[href]').forEach(function (a) {
      var slug = slugFromHref(a.getAttribute('href'));
      var mark = a.querySelector('.done-mark');
      if (isDone(slug)) {
        if (!mark) {
          mark = document.createElement('span');
          mark.className = 'done-mark';
          mark.textContent = ' ✓';
          a.appendChild(mark);
        }
      } else if (mark) {
        mark.remove();
      }
    });
  }

  function wireButton() {
    var btn = document.querySelector('[data-mark-done]');
    if (!btn) return;
    var slug = currentSlug();
    function render() {
      var done = isDone(slug);
      btn.setAttribute('aria-pressed', done ? 'true' : 'false');
      btn.textContent = done ? '✓ Marked done' : 'Mark this step done';
    }
    btn.addEventListener('click', function () {
      setDone(slug, !isDone(slug));
      render();
      syncSidebar();
    });
    render();
  }

  function init() {
    wireButton();
    syncSidebar();
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', init);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      chapterKey: chapterKey,
      slugFromHref: slugFromHref,
      isDone: isDone,
      setDone: setDone,
    };
  }
})();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test theme/checkmarks.test.js`
Expected: PASS, 3 tests.

- [ ] **Step 5: Append checkmark CSS to `theme/custom.css`**

```css
.done-mark { color: var(--teal); font-weight: 700; }
[data-mark-done] { border: 1px solid var(--teal); background: transparent; border-radius: 999px; padding: 0.4rem 1rem; cursor: pointer; margin-top: 1rem; }
[data-mark-done][aria-pressed="true"] { background: var(--teal); color: white; }
```

- [ ] **Step 6: Verify**

Run: `node --check theme/checkmarks.js && mdbook build`
Expected: both exit 0.

- [ ] **Step 7: Commit**

```bash
git add theme/checkmarks.js theme/checkmarks.test.js theme/custom.css
git commit -m "Add sidebar checkmark widget with tested slug parsing"
```

---

### Task 5: On-this-page nav

**Files:**
- Create: `theme/on-this-page.js`
- Create: `theme/on-this-page.test.js`
- Modify: `theme/custom.css` (append `.on-this-page` rules)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `headingsToToc(headings)` (pure, exported, takes an array of `{ id, tagName, textContent }` descriptors), the markup contract: a `<nav class="on-this-page"><div class="otp-label">On this page</div><ol></ol></nav>` element is auto-populated per chapter (content tasks don't need to write it manually — it's injected by this script if the page has ≥ 2 headings).

- [ ] **Step 1: Write the failing test**

```javascript
// theme/on-this-page.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { headingsToToc } = require('./on-this-page.js');

test('maps h2/h3 headings to toc entries with depth', () => {
  const headings = [
    { id: 'intro', tagName: 'H2', textContent: 'Intro' },
    { id: 'detail', tagName: 'H3', textContent: 'Detail' },
  ];
  assert.deepEqual(headingsToToc(headings), [
    { id: 'intro', text: 'Intro', depth: 2 },
    { id: 'detail', text: 'Detail', depth: 3 },
  ]);
});

test('skips headings without an id (can\'t be linked to)', () => {
  const headings = [{ id: '', tagName: 'H2', textContent: 'No anchor' }];
  assert.deepEqual(headingsToToc(headings), []);
});

test('returns an empty list for fewer than two headings', () => {
  assert.deepEqual(headingsToToc([{ id: 'only', tagName: 'H2', textContent: 'Only' }]), []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test theme/on-this-page.test.js`
Expected: FAIL — `Cannot find module './on-this-page.js'`.

- [ ] **Step 3: Write `theme/on-this-page.js`**

```javascript
(function () {
  function headingsToToc(headings) {
    var withIds = headings.filter(function (h) { return h.id; });
    if (withIds.length < 2) return [];
    return withIds.map(function (h) {
      return { id: h.id, text: h.textContent, depth: h.tagName === 'H3' ? 3 : 2 };
    });
  }

  function build() {
    var main = document.querySelector('#mdbook-content main');
    if (!main) return;
    var headingEls = Array.prototype.slice.call(main.querySelectorAll('h2, h3'));
    var entries = headingsToToc(headingEls.map(function (h) {
      return { id: h.id, tagName: h.tagName, textContent: h.textContent };
    }));
    if (!entries.length) return;

    var nav = document.createElement('nav');
    nav.className = 'on-this-page';
    var label = document.createElement('div');
    label.className = 'otp-label';
    label.textContent = 'On this page';
    var ol = document.createElement('ol');
    ol.innerHTML = entries.map(function (e) {
      return '<li data-depth="' + e.depth + '"><a href="#' + e.id + '">' + e.text + '</a></li>';
    }).join('');
    nav.appendChild(label);
    nav.appendChild(ol);
    main.parentElement.insertBefore(nav, main);

    if ('IntersectionObserver' in window) {
      var links = {};
      Array.prototype.slice.call(ol.querySelectorAll('li')).forEach(function (li) {
        links[li.querySelector('a').getAttribute('href').slice(1)] = li;
      });
      var io = new IntersectionObserver(function (entriesObserved) {
        entriesObserved.forEach(function (entry) {
          if (entry.isIntersecting) {
            Object.keys(links).forEach(function (k) { links[k].classList.remove('active'); });
            var match = links[entry.target.id];
            if (match) match.classList.add('active');
          }
        });
      }, { rootMargin: '-20% 0px -70% 0px' });
      headingEls.forEach(function (h) { if (h.id) io.observe(h); });
    }
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', build);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { headingsToToc: headingsToToc };
  }
})();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test theme/on-this-page.test.js`
Expected: PASS, 3 tests.

- [ ] **Step 5: Append on-this-page CSS to `theme/custom.css`**

```css
.on-this-page { position: sticky; top: 2rem; float: right; width: 12rem; margin-left: 1.5rem; font-size: 0.8rem; }
.otp-label { text-transform: uppercase; letter-spacing: 0.06em; font-size: 0.68rem; color: var(--icons, #888); margin-bottom: 0.5rem; }
.on-this-page ol { list-style: none; margin: 0; padding: 0; border-left: 1px solid var(--sidebar-non-existant, #ccc); }
.on-this-page li { padding-left: 0.7rem; }
.on-this-page li[data-depth="3"] { padding-left: 1.4rem; }
.on-this-page li.active a { color: var(--pink); font-weight: 600; }
@media (max-width: 900px) { .on-this-page { display: none; } }
```

- [ ] **Step 6: Verify**

Run: `node --check theme/on-this-page.js && mdbook build`
Expected: both exit 0.

- [ ] **Step 7: Commit**

```bash
git add theme/on-this-page.js theme/on-this-page.test.js theme/custom.css
git commit -m "Add on-this-page nav with tested heading-to-toc mapping"
```

---

### Task 6: Study-pace chooser widget

**Files:**
- Create: `theme/pace-chooser.js`
- Create: `theme/pace-chooser.test.js`
- Modify: `theme/custom.css` (append `.pace-chooser` rules)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `computeSchedule({ hoursPerWeek, weeksAvailable })` (pure, exported), the markup contract for "How to Use This Guide" (Task 9):
  ```html
  <div class="pace-chooser" data-pace-chooser>
    <div class="pc-row"><label for="pcHours">Hours per week</label><input type="range" id="pcHours" min="1" max="15" value="4"><output></output></div>
    <div class="pc-row"><label for="pcWeeks">Weeks available</label><input type="range" id="pcWeeks" min="1" max="12" value="4"><output></output></div>
    <div class="pc-result" aria-live="polite"></div>
  </div>
  ```

- [ ] **Step 1: Write the failing test**

```javascript
// theme/pace-chooser.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { computeSchedule, TOTAL_HOURS } = require('./pace-chooser.js');

test('rejects non-positive input without dividing by zero', () => {
  const result = computeSchedule({ hoursPerWeek: 0, weeksAvailable: 3 });
  assert.deepEqual(result.weeks, []);
  assert.equal(result.capacityHours, 0);
  assert.match(result.warning, /positive/);
});

test('warns when capacity is below the total hours needed', () => {
  const result = computeSchedule({ hoursPerWeek: 2, weeksAvailable: 2 });
  assert.equal(result.capacityHours, 4);
  assert.ok(result.warning);
  assert.match(result.warning, /week/);
});

test('produces no warning and a full week-by-week plan when capacity covers everything', () => {
  const result = computeSchedule({ hoursPerWeek: 10, weeksAvailable: 4 });
  assert.equal(result.warning, null);
  assert.ok(result.weeks.length > 0);
  assert.ok(result.weeks.every((w) => Array.isArray(w.focus) && w.focus.length > 0));
});

test('TOTAL_HOURS matches the sum of the step budgets', () => {
  assert.equal(TOTAL_HOURS, 25);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test theme/pace-chooser.test.js`
Expected: FAIL — `Cannot find module './pace-chooser.js'`.

- [ ] **Step 3: Write `theme/pace-chooser.js`**

```javascript
(function () {
  var STEP_HOURS = [
    { label: 'Steps 1-2: Java syntax + Maven', hours: 6 },
    { label: 'Step 3: Spring core, MVC, WAR', hours: 8 },
    { label: 'Step 4: Persistence (Hibernate & HQL)', hours: 6 },
    { label: 'Step 5: Spring Security', hours: 3 },
    { label: 'Step 6: Lombok', hours: 2 },
  ];
  var TOTAL_HOURS = STEP_HOURS.reduce(function (sum, s) { return sum + s.hours; }, 0);

  function computeSchedule(input) {
    var hoursPerWeek = input.hoursPerWeek, weeksAvailable = input.weeksAvailable;
    if (hoursPerWeek <= 0 || weeksAvailable <= 0) {
      return { weeks: [], totalHours: TOTAL_HOURS, capacityHours: 0, warning: 'Enter a positive number of hours and weeks.' };
    }
    var capacityHours = hoursPerWeek * weeksAvailable;
    var remaining = STEP_HOURS.slice();
    var weeks = [];
    var weekIndex = 1;
    while (remaining.length && weekIndex <= weeksAvailable) {
      var budget = hoursPerWeek;
      var focus = [];
      while (remaining.length && (budget > 0 || focus.length === 0)) {
        var next = remaining[0];
        focus.push(next.label);
        budget -= next.hours;
        remaining.shift();
        if (budget <= 0) break;
      }
      weeks.push({ week: weekIndex, focus: focus });
      weekIndex++;
    }
    var warning = null;
    if (remaining.length) {
      var shortfall = TOTAL_HOURS - capacityHours;
      warning = 'At ' + hoursPerWeek + 'h/week you will not reach "' + remaining[0].label + '" within ' + weeksAvailable + ' week(s) — add about ' + Math.ceil(shortfall) + 'h more capacity or extend the timeline.';
    }
    return { weeks: weeks, totalHours: TOTAL_HOURS, capacityHours: capacityHours, warning: warning };
  }

  function render(result) {
    var el = document.querySelector('.pace-chooser .pc-result');
    if (!el) return;
    if (!result.weeks.length && !result.warning) { el.innerHTML = ''; return; }
    var html = '';
    if (result.warning) html += '<p class="pc-warning">' + result.warning + '</p>';
    html += '<ol class="pc-weeks">' + result.weeks.map(function (w) {
      return '<li><strong>Week ' + w.week + '</strong>: ' + w.focus.join('; ') + '</li>';
    }).join('') + '</ol>';
    el.innerHTML = html;
  }

  function wire() {
    var widget = document.querySelector('[data-pace-chooser]');
    if (!widget) return;
    var hours = widget.querySelector('#pcHours');
    var weeks = widget.querySelector('#pcWeeks');
    function run() {
      var result = computeSchedule({ hoursPerWeek: +hours.value, weeksAvailable: +weeks.value });
      widget.querySelectorAll('output')[0].textContent = hours.value + 'h';
      widget.querySelectorAll('output')[1].textContent = weeks.value + ' wk';
      render(result);
    }
    hours.addEventListener('input', run);
    weeks.addEventListener('input', run);
    run();
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', wire);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { computeSchedule: computeSchedule, TOTAL_HOURS: TOTAL_HOURS, STEP_HOURS: STEP_HOURS };
  }
})();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test theme/pace-chooser.test.js`
Expected: PASS, 4 tests.

- [ ] **Step 5: Append pace-chooser CSS to `theme/custom.css`**

```css
.pace-chooser { border: 1px solid var(--sidebar-non-existant, #ccc); border-radius: 10px; padding: 1rem 1.2rem; margin: 1.2rem 0; }
.pc-row { display: grid; grid-template-columns: 10rem 1fr 4rem; gap: 0.6rem; align-items: center; margin-bottom: 0.5rem; }
.pc-row input[type="range"] { accent-color: var(--pink); width: 100%; }
.pc-weeks { list-style: none; padding: 0; margin: 0.8rem 0 0; display: grid; gap: 0.35rem; }
.pc-warning { color: #b45309; font-weight: 600; }
```

- [ ] **Step 6: Verify**

Run: `node --check theme/pace-chooser.js && mdbook build`
Expected: both exit 0.

- [ ] **Step 7: Commit**

```bash
git add theme/pace-chooser.js theme/pace-chooser.test.js theme/custom.css
git commit -m "Add study-pace chooser widget with tested scheduling logic"
```

---

### Task 7: Layer-explorer widget

**Note on spec deviation:** the spec called for a "flow/dependency view toggle," modeled on sa/guide's hexagon. This codebase is a straight layered WAR (Controller→Repository→DAO→Hibernate), where flow and dependency direction are identical — that toggle would be contentless here. Instead the toggle switches each layer's revealed detail between **Annotations** and **File locations**, which is the genuinely useful distinction for this codebase. The interaction shape (click a layer, toggle a view mode, see detail update) is preserved.

**Files:**
- Create: `theme/layer-explorer.js`
- Create: `theme/layer-explorer.test.js`
- Modify: `theme/custom.css` (append `.layer-explorer` rules)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `LAYERS` (exported array), `renderLayers(layers)` and `detailFor(layers, id, view)` (pure, exported), the markup contract for Step 3 (Task 11):
  ```html
  <div class="layer-explorer" data-layer-explorer>
    <div class="le-view-toggle">
      <button data-view="annotations" aria-pressed="true">Annotations</button>
      <button data-view="files">File locations</button>
    </div>
    <div class="le-rows"></div>
    <div class="le-detail" aria-live="polite"></div>
  </div>
  ```

- [ ] **Step 1: Write the failing test**

```javascript
// theme/layer-explorer.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { LAYERS, renderLayers, detailFor } = require('./layer-explorer.js');

test('renders exactly one row per layer with a data-layer attribute', () => {
  const html = renderLayers(LAYERS);
  assert.equal((html.match(/data-layer="/g) || []).length, LAYERS.length);
  assert.ok(html.includes('Controller'));
  assert.ok(html.includes('Hibernate'));
});

test('detailFor returns the annotations view by default', () => {
  const detail = detailFor(LAYERS, 'dao', 'annotations');
  assert.match(detail, /HQL/);
});

test('detailFor returns the files view when asked', () => {
  const detail = detailFor(LAYERS, 'dao', 'files');
  assert.match(detail, /DaoImpl/);
});

test('detailFor returns null for an unknown layer id', () => {
  assert.equal(detailFor(LAYERS, 'nope', 'annotations'), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test theme/layer-explorer.test.js`
Expected: FAIL — `Cannot find module './layer-explorer.js'`.

- [ ] **Step 3: Write `theme/layer-explorer.js`**

```javascript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test theme/layer-explorer.test.js`
Expected: PASS, 4 tests.

- [ ] **Step 5: Append layer-explorer CSS to `theme/custom.css`**

```css
.layer-explorer { border: 1px solid var(--sidebar-non-existant, #ccc); border-radius: 10px; padding: 1rem 1.2rem; margin: 1.2rem 0; }
.le-view-toggle { display: flex; gap: 0.5rem; margin-bottom: 0.8rem; }
.le-view-toggle button { border: 1px solid var(--sidebar-non-existant, #ccc); background: transparent; border-radius: 999px; padding: 0.3rem 0.8rem; cursor: pointer; font-size: 0.8rem; }
.le-view-toggle button[aria-pressed="true"] { background: var(--cyan); border-color: var(--cyan); color: white; }
.le-rows { display: flex; flex-direction: column; }
.layer-row { display: flex; gap: 0.6rem; align-items: center; border: 1px solid var(--sidebar-non-existant, #ccc); background: transparent; border-radius: 8px; padding: 0.5rem 0.8rem; cursor: pointer; text-align: left; font: inherit; }
.layer-row:not(:last-child) { margin-bottom: 0.6rem; position: relative; }
.layer-row:not(:last-child)::after { content: "\2193"; position: absolute; left: 1.1rem; bottom: -1.1rem; color: var(--icons, #888); }
.layer-row[aria-expanded="true"] { border-color: var(--pink); }
.layer-index { font-family: monospace; color: var(--icons, #888); }
.le-detail { margin-top: 0.9rem; padding: 0.7rem 0.9rem; border-left: 3px solid var(--pink); background: var(--theme-hover, #f5f5f5); font-size: 0.9rem; }
```

- [ ] **Step 6: Verify**

Run: `node --check theme/layer-explorer.js && mdbook build`
Expected: both exit 0.

- [ ] **Step 7: Commit**

```bash
git add theme/layer-explorer.js theme/layer-explorer.test.js theme/custom.css
git commit -m "Add layer-explorer widget with tested layer/detail lookup"
```

---

### Task 8: Run every JS test suite together

**Files:** none created; verification only.

- [ ] **Step 1: Run the whole theme test suite**

Run: `node --test theme/`
Expected: PASS, 17 tests total (3 + 3 + 3 + 4 + 4 from Tasks 3-7), 0 failures.

- [ ] **Step 2: Run a full build**

Run: `mdbook build`
Expected: exits 0, no warnings.

No commit — this task is a checkpoint before content work begins.

---

### Task 9: "How to Use This Guide" chapter + pace-chooser

**Files:**
- Modify: `src/how-to-use-this-guide.md`

**Interfaces:**
- Consumes: `.pace-chooser`/`data-pace-chooser` markup contract from Task 6; `.callout` from Task 2.

- [ ] **Step 1: Fetch the source content**

Use `mcp__notion__notion-fetch` with id `3e29a137-d71d-8195-a910-fa7258bb5a7d`. Read the section under the heading `## How to use this path` (the four bullet points about Java 17/Spring 5.3/Boot 2.7/Hibernate 5.6, preferring Boot 2.x-era resources, the video+article+exercise structure, and the suggested pacing).

- [ ] **Step 2: Write `src/how-to-use-this-guide.md`**

```markdown
# How to Use This Guide

This is a companion to the VWO API's Knowledge File — that page explains
*what the project is*; this one tells you *what to learn, in what order,
and why it matters for this exact codebase* (`~/Coding/vwo-api`).

<div class="callout note">
<div class="callout-label">Stack, exactly</div>
Java 17 + Spring Framework 5.3.39 + Spring Boot 2.7.18 (WAR on Tomcat 9) +
Hibernate 5.6.15. Prefer resources from the Boot 2.x / <code>javax.*</code>
era — material for Boot 3/4 teaches <code>jakarta.*</code>, Spring 6/7 and
Hibernate 6, which will not match this code.
</div>

Every step below mixes video/audio with written articles (📖) and ends
with a **Project exercise** on the real code. Each Step chapter has three
levels — pick one with the tabs at the top of the page, your choice is
remembered as you move between chapters:

- **Overview** — one paragraph on what the step is and why it matters here.
- **Deep Understanding** — the full resource list, with each source's
  verification status and how it maps onto this codebase.
- **Drilling** — the hands-on project exercise, turned into a checklist,
  plus a self-check question.

## How much time will this take?

Drag the sliders — the plan below is a heuristic built from the guide's
own suggested pacing (steps 1-2 in a weekend, step 3 over a week, then
4-6 alongside real reading of the repo), not a rule.

<div class="pace-chooser" data-pace-chooser>
  <div class="pc-row"><label for="pcHours">Hours per week</label><input type="range" id="pcHours" min="1" max="15" value="4"><output></output></div>
  <div class="pc-row"><label for="pcWeeks">Weeks available</label><input type="range" id="pcWeeks" min="1" max="12" value="4"><output></output></div>
  <div class="pc-result" aria-live="polite"></div>
</div>

Step 7 (ecosystem podcasts) is deliberately left out of the plan above —
it's background listening, not a scheduled block.
```

- [ ] **Step 3: Verify**

Run: `mdbook build && grep -q "data-pace-chooser" book/how-to-use-this-guide.html && echo OK`
Expected: prints `OK`.

- [ ] **Step 4: Commit**

```bash
git add src/how-to-use-this-guide.md
git commit -m "Write How to Use This Guide chapter with pace-chooser"
```

---

### Task 10: Steps 1-2 chapters (Java syntax, Maven)

**Files:**
- Modify: `src/step-1-java-syntax.md`
- Modify: `src/step-2-maven.md`

**Interfaces:**
- Consumes: `.level-tabs`/`.level` markup contract (Task 3), `.checklist`/`.qa` (Task 2), `[data-mark-done]` (Task 4).

- [ ] **Step 1: Fetch the source content**

Use `mcp__notion__notion-fetch` with id `3e29a137-d71d-8195-a910-fa7258bb5a7d`. Read `## Step 1 — Java syntax, fast (from C#)` (subsections 1.1, 1.2) through `## Step 2 — Maven (the csproj + NuGet + MSBuild of Java)` (subsections 2.1, 2.2, 2.3), stopping before `## Step 3`. Also read the matching rows of `## Cheat-sheet: which concept you'll meet in which file` for the Overview level's one-liner.

- [ ] **Step 2: Write `src/step-1-java-syntax.md`**

```markdown
# Step 1: Java Syntax, Fast (from C#)

<div class="level-tabs" data-levels>
  <button data-level="overview" aria-pressed="true">Overview</button>
  <button data-level="deep">Deep Understanding</button>
  <button data-level="drill">Drilling</button>
</div>

<div class="level overview">

Every file in the repo is plain Java, and the differences that trip a C#
developer show up immediately: `Optional<T>`, `final`, `record`, `switch`
expressions, wildcard generics, and the absence of properties (getters
and setters come from Lombok — Step 6). This step is a fast syntax
translation, not a Java course.

</div>

<div class="level deep">

### 1.1 Java for C# Developers (YouTube, ABMedia)

[https://www.youtube.com/watch?v=heZJ3iGj3KA](https://www.youtube.com/watch?v=heZJ3iGj3KA)
— 🔎 title and channel confirmed; a search listing dates it May 2020
(unconfirmed).

See how the project models a "nullable result":

```java
// controllers/SchoolController.java
default ResponseEntity<Scholen> getById(@PathVariable("id") Short id) {
    return getRepository().findById(id)                       // Optional<Scholen>
            .map(person -> ResponseEntity.ok().body(person))  // like ?.Select / Map
            .orElse(ResponseEntity.notFound().build());       // like ?? fallback
}
```

`Optional<T>`, `final`, `record`, `switch` expressions (`Configuration.java`),
wildcard generics (`ResponseEntity<? extends Persoon>`), and the absence
of properties are all in play from line 1.

### 1.2 📖 Tips for Java Developers — A tour of C# (Microsoft Learn)

[https://learn.microsoft.com/en-us/dotnet/csharp/tour-of-csharp/tips-for-java-developers](https://learn.microsoft.com/en-us/dotnet/csharp/tour-of-csharp/tips-for-java-developers)
— ✅ page last updated 2026-09-18. Written for the opposite direction
(Java → C#): read it backwards, each "C# has X" tells you what Java
lacks or does differently.

<div class="callout note">
<div class="callout-label">Maps onto this repo</div>

- "Properties … in Java are naming conventions for `get`/`set`" → why every entity has Lombok `@Getter @Setter`.
- "Attributes are similar to Java annotations" → the whole project is annotation-driven (`@RestController`, `@Transactional`, `@Entity`, `@JsonProperty`).
- "NuGet … is analogous to Maven" → `pom.xml` (Step 2).
- "C# doesn't have checked exceptions" → signatures like `transfer(...) throws …` must be handled or declared.
- "Records … can be immutable" → the DTOs in `restAPI/models` (`Pool`, `VwoParticipantInformation`) are Java `record`s.

</div>

</div>

<div class="level drill">

<ul class="checklist">
<li><label><input type="checkbox"><span>Open <code>restAPI/models/VwoParticipantInformation.java</code> and write the equivalent C# <code>record</code> with <code>[JsonPropertyName]</code>.</span></label></li>
</ul>

<details class="qa">
<summary>Self-check: why does <code>getById</code> return <code>Optional&lt;Scholen&gt;</code> from the repository instead of a nullable <code>Scholen</code>?</summary>
<div class="ans">
Because Java has no null-conditional operator built into the type
system the way C#'s <code>?.</code>/<code>??</code> do — <code>Optional</code> makes the
"might not exist" case explicit in the method's return type, and
<code>.map(...).orElse(...)</code> is the idiomatic replacement for
<code>?.Select(...) ?? fallback</code>.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<button type="button" data-mark-done>Mark this step done</button>

</div>
```

- [ ] **Step 3: Write `src/step-2-maven.md`**

```markdown
# Step 2: Maven

<div class="level-tabs" data-levels>
  <button data-level="overview" aria-pressed="true">Overview</button>
  <button data-level="deep">Deep Understanding</button>
  <button data-level="drill">Drilling</button>
</div>

<div class="level overview">

Maven is this project's `csproj` + NuGet + MSBuild. You cannot build the
WAR without understanding its non-obvious parent POM (gitignored,
generated from a template) and the profiles that choose the target
environment at build time.

</div>

<div class="level deep">

### 2.1 Simple Explanation of Maven and pom.xml (YouTube, Brandan Jones)

[https://www.youtube.com/watch?v=KNGQ9JBQWhQ](https://www.youtube.com/watch?v=KNGQ9JBQWhQ)
— 🔎 title and channel confirmed; covers groupId/artifactId/version,
parent, effective POM, dependencies, plugins (not independently confirmed).

```xml
<!-- pom.xml -->
<packaging>war</packaging>
<parent>
    <groupId>be.vwo</groupId><artifactId>serverInfo</artifactId><version>1.0-SNAPSHOT</version>
    <relativePath>pom-userProperties.xml</relativePath>   <!-- created from pom-userProperties.xml.tmpl -->
</parent>
```

and profiles that choose the environment at build time:

```xml
<profile><id>gitlab-prod</id> … <ant antfile="ant.xml" target="properties-APIprod"/> …</profile>
```

`mvn clean package -P gitlab-prod` bakes the production DB settings into
the WAR.

### 2.2 Maven Tutorials 04 (YouTube, gontuseries)

[https://www.youtube.com/watch?v=1cz8VPc-1Vw](https://www.youtube.com/watch?v=1cz8VPc-1Vw)
— 🔎 title and channel confirmed; part 4 of an older series, a supplement.

Dependency scopes decide what ends up in the WAR:

```xml
<artifactId>spring-boot-starter-tomcat</artifactId><version>2.7.18</version><scope>provided</scope>
```

This one line is why the app is a WAR on external Tomcat and not a
`java -jar`.

### 2.3 📖 Maven Tutorial for Beginners in 5 Steps (springboottutorial.com)

[https://www.springboottutorial.com/maven-tutorial-for-beginners](https://www.springboottutorial.com/maven-tutorial-for-beginners)
— ✅ covers Spring Initializr, POM structure, the build lifecycle
(validate → compile → test → package → integration-test → verify →
install → deploy), repositories, and core commands.

The lifecycle explains *when* this project's odd build steps run: the
Ant env-file copy is bound to `compile`, the SSH/SCP deploy to `package`:

```xml
<execution><id>set_env</id><phase>compile</phase> … target="properties-APIdev" …
<execution><id>clydesv-dev</id><phase>package</phase> … target="api-dev" …
```

Knowing the phases is how you predict that `mvn package -P dev` uploads
to a server (don't do it by accident), while `-P gitlab-dev` does not.

Also seen in search (⚠️ 403, not read): Baeldung's Apache Maven
tutorial — [https://www.baeldung.com/maven](https://www.baeldung.com/maven).

</div>

<div class="level drill">

<ul class="checklist">
<li><label><input type="checkbox"><span>Build with <code>mvn clean package -P gitlab-dev</code> (JDK ≥ 21 + Maven required) and compare <code>target/classes/environment.properties</code> for dev vs prod.</span></label></li>
<li><label><input type="checkbox"><span>Find every <code>&lt;exclusion&gt;</code> of <code>spring-boot-starter-logging</code> in <code>pom.xml</code> and explain why Log4j2 is used instead of Logback.</span></label></li>
<li><label><input type="checkbox"><span>List, in order, which plugin executions fire for <code>mvn clean package -P gitlab-prod</code>.</span></label></li>
</ul>

<details class="qa">
<summary>Self-check: why does <code>mvn package -P dev</code> potentially deploy to a real server, when <code>-P gitlab-dev</code> doesn't?</summary>
<div class="ans">
Because the SSH/SCP deploy execution is bound to the <code>package</code>
phase only under the <code>dev</code>/<code>production</code> profiles —
the <code>gitlab-*</code> profiles only run the Ant env-file copy at
<code>compile</code> and stop there, so <code>package</code> under
<code>gitlab-dev</code> produces a WAR without uploading it anywhere.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<button type="button" data-mark-done>Mark this step done</button>

</div>
```

- [ ] **Step 4: Verify**

Run: `mdbook build && grep -q 'data-level="overview"' book/step-1-java-syntax.html && grep -q 'data-level="overview"' book/step-2-maven.html && echo OK`
Expected: prints `OK`.

- [ ] **Step 5: Commit**

```bash
git add src/step-1-java-syntax.md src/step-2-maven.md
git commit -m "Write Step 1 and Step 2 chapters"
```

---

### Task 11: Step 3 chapter (Spring MVC/WAR) + layer-explorer

**Files:**
- Modify: `src/step-3-spring-mvc-war.md`

**Interfaces:**
- Consumes: `.level-tabs`/`.level` (Task 3), `data-layer-explorer` markup contract (Task 7), `[data-mark-done]` (Task 4).

- [ ] **Step 1: Fetch the source content**

Use `mcp__notion__notion-fetch` with id `3e29a137-d71d-8195-a910-fa7258bb5a7d`. Read `## Step 3 — Spring core, MVC, and deploying as a WAR` in full (subsections 3.1-3.4, including the four-article WAR-deployment comparison table).

- [ ] **Step 2: Write `src/step-3-spring-mvc-war.md`**

```markdown
# Step 3: Spring Core, MVC & WAR Deployment

<div class="level-tabs" data-levels>
  <button data-level="overview" aria-pressed="true">Overview</button>
  <button data-level="deep">Deep Understanding</button>
  <button data-level="drill">Drilling</button>
</div>

<div class="level overview">

Every object in the API is a Spring bean wired by dependency injection,
singleton by default (unlike .NET's per-request "scoped" lifetime), and
the whole thing runs as a WAR on an external Tomcat 9 — not
`dotnet run`, not an embedded-Tomcat `.jar`. Click through the layers
below to see which annotations and files belong to each one.

<div class="layer-explorer" data-layer-explorer>
  <div class="le-view-toggle">
    <button data-view="annotations" aria-pressed="true">Annotations</button>
    <button data-view="files">File locations</button>
  </div>
  <div class="le-rows"></div>
  <div class="le-detail" aria-live="polite"></div>
</div>

</div>

<div class="level deep">

### 3.1 📖 Spring Framework 5.3.39 Reference — Core Technologies

[https://docs.spring.io/spring-framework/docs/5.3.x/reference/html/core.html](https://docs.spring.io/spring-framework/docs/5.3.x/reference/html/core.html)
— ✅ header reads "Core Technologies — version 5.3.39", the exact
version in `pom.xml`. The authoritative reference for how the project is
wired, including the XML style still used in `applicationContextAPI.xml`:

```xml
<!-- applicationContextAPI.xml -->
<context:component-scan base-package="be.vwo"/>
<tx:annotation-driven/>
<cache:annotation-driven cache-manager="ehcacheManager"/>
<bean id="vwoRW" class="org.springframework.orm.hibernate5.LocalSessionFactoryBean"> … </bean>
```

<div class="callout danger">
<div class="callout-label">Watch out</div>
The default URL (docs.spring.io/spring-framework/reference/...) now
documents Spring 7.0.9. Use the <code>5.3.x</code> link above for this
project.
</div>

### 3.2 Modern Spring From Scratch (Java Brains) — paid

[https://javabrains.io/courses/modern-spring-from-scratch](https://javabrains.io/courses/modern-spring-from-scratch)
— ✅ 4 hours / 37 lessons, \$50 one-time or \$8.99/month, one free
preview lesson.

```java
@Repository
public class ScholenRepositoryImpl implements ScholenRepository {
    private final ScholenDao scholenDao;                       // constructor injection
    @Autowired
    public ScholenRepositoryImpl(ScholenDao scholenDao, ScholenFacturatieDao invoiceDao) { ... }
}
```

Component scanning (`@SpringBootApplication(scanBasePackages = "be.vwo.common")`)
finds every `@Repository/@RestController/@Service` — like auto-registering
services in `Program.cs`. Beans are singletons by default. Proxies:
`@Transactional`/`@Cacheable` work through generated proxies; a call on
`this` skips them, hence `@Resource @Lazy private XImpl self;` in
`KangoeroePoolsParticipantsRepositoryImpl`.

Free alternative: 3.1 above (the official reference).

### 3.3 Spring Boot Tutorial for Beginners (freeCodeCamp / Amigoscode)

Video: [https://www.youtube.com/watch?v=vtPkZShrvXQ](https://www.youtube.com/watch?v=vtPkZShrvXQ)
· Write-up: [https://www.freecodecamp.org/news/spring-boot-tutorial/](https://www.freecodecamp.org/news/spring-boot-tutorial/)
— ✅ write-up dated 6 Sep 2019, 2-hour course, HTTP methods, in-memory
DB, N-tier architecture, DI via autowired beans, interfaces, Postman.
Predates Boot 3, so `javax.*` era.

```java
@RestController
@RequestMapping(path = {V2Config.BASE_URL + "/school"})     // "/api/v2/school"
public class SchoolController implements be.vwo.common.restAPI.controllers.SchoolController { ... }
```

`@RestController`, `@RequestMapping`, `@GetMapping`, `@PathVariable`,
`@RequestParam`, `@RequestBody`, `ResponseEntity` = `[ApiController]`,
`[HttpGet]`, `[FromRoute]`, `[FromQuery]`, `[FromBody]`, `ActionResult`.

<div class="callout note">
<div class="callout-label">Caveat</div>
The course runs a <code>.jar</code> with embedded Tomcat and no real DB;
this project is a WAR on external Tomcat with Hibernate.
</div>

### 3.4 📖 Deploying a Spring Boot app as a WAR on external Tomcat

| Article | Verified | Generation |
|---|---|---|
| [Okta Developer](https://developer.okta.com/blog/2019/04/16/spring-boot-tomcat) | ✅ Java 11, Boot 2.4.4, Tomcat 9.0.19; WAR + `provided` Tomcat; Tomcat Manager deploy | **closest match to this project** |
| [HowToDoInJava](https://howtodoinjava.com/spring-boot/deploy-spring-boot-traditional-war-on-tomcat/) | ✅ (Dec 2022) `packaging=war`, extend `SpringBootServletInitializer` | version-agnostic |
| [TutorialsPoint](https://www.tutorialspoint.com/spring_boot/spring_boot_tomcat_deployment.htm) | ✅ same recipe; Boot 3.5.6 / Java 21 ⇒ `jakarta.*` | Boot 3 (differs!) |
| [JavaInUse](https://www.javainuse.com/spring/boot-war) | ✅ same recipe; Boot 1.4.1 / Java 1.8 | very old, recipe unchanged |
| [Baeldung](https://www.baeldung.com/spring-boot-war-tomcat-deploy) / [mkyong](https://mkyong.com/spring-boot/spring-boot-deploy-war-file-to-tomcat/) | ⚠️ 403 on fetch; search confirms title + Servlet 3.0 contract | — |

This *is* the project's runtime model — the biggest surprise for someone
used to `dotnet run`:

```java
// restAPI/OpenApiApplication.java
@SpringBootApplication(exclude = {DataSourceAutoConfiguration.class}, scanBasePackages = "be.vwo.common")
@ImportResource("classpath:applicationContextAPI.xml")
public class OpenApiApplication extends SpringBootServletInitializer {
    @Override
    protected SpringApplicationBuilder configure(SpringApplicationBuilder application) {
        return application.sources(OpenApiApplication.class);   // Tomcat calls this on WAR startup
    }
}
```

The WAR file name is the context path (`Dockerfile`: `COPY target/restAPI.war …/webapps/${WAR_FILENAME}`,
default `database.war`) — so a WAR named `restAPI.war` would get a
different URL entirely.

</div>

<div class="level drill">

<ul class="checklist">
<li><label><input type="checkbox"><span>With the Knowledge File §7 open, trace <code>GET /api/v2/school/{id}</code> and name the bean at each hop.</span></label></li>
<li><label><input type="checkbox"><span>In <code>Dockerfile</code> and <code>.gitlab-ci.yml</code> find where <code>database.war</code> is named, then say what URL a WAR named <code>restAPI.war</code> would get.</span></label></li>
</ul>

<details class="qa">
<summary>Self-check: why must repositories/DAOs be stateless singletons?</summary>
<div class="ans">
Spring beans are singletons by default — one shared instance serves
every request. If a repository or DAO kept per-request state in an
instance field, concurrent requests would corrupt each other's data;
all request-scoped state has to live in method parameters/locals or the
Hibernate <code>Session</code>, never in bean fields.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<button type="button" data-mark-done>Mark this step done</button>

</div>
```

- [ ] **Step 3: Verify**

Run: `mdbook build && grep -q "data-layer-explorer" book/step-3-spring-mvc-war.html && echo OK`
Expected: prints `OK`.

- [ ] **Step 4: Commit**

```bash
git add src/step-3-spring-mvc-war.md
git commit -m "Write Step 3 chapter with layer-explorer widget"
```

---

### Task 12: Steps 4-5 chapters (Persistence, Security)

**Files:**
- Modify: `src/step-4-persistence-hibernate.md`
- Modify: `src/step-5-spring-security.md`

**Interfaces:**
- Consumes: `.level-tabs`/`.level` (Task 3), `.checklist`/`.qa` (Task 2), `[data-mark-done]` (Task 4).

- [ ] **Step 1: Fetch the source content**

Use `mcp__notion__notion-fetch` with id `3e29a137-d71d-8195-a910-fa7258bb5a7d`. Read `## Step 4 — Persistence: Hibernate 5 and HQL` (4.1-4.4) through `## Step 5 — Spring Security (the auth code in security/)` (5.1), stopping before `## Step 6`.

- [ ] **Step 2: Write `src/step-4-persistence-hibernate.md`** following the same structure as Task 10/11 (level-tabs, overview/deep/drill divs, mark-done button), using:
  - Overview: native Hibernate 5.6 (not Spring Data JPA), `SessionFactory`/`Session`, composite IDs, second-level cache.
  - Deep Understanding: 4.1 (Hibernate ORM 5.6.15.Final User Guide, with the `@IdClass` composite-key snippet and the `hibernate_VWO.cfg.xml` cache config snippet), 4.2 (the two YouTube playlists, with the `dao/impl/VwoDaoImpl.java` two-SessionFactory snippet and the "every entity must be registered in `hibernate_VWO.cfg.xml`" quirk), 4.3 (HQL tutorial, with the `ScholenDaoImpl` HQL string snippet and the `sha2(:password, 256)` login-query note), 4.4 (CodeJava + JavaGuides + DigitalOcean, noting JavaGuides uses Hibernate 6.4.0/`jakarta.persistence` — imports differ from this project's `javax.persistence`).
  - Drilling: read `dbEntities/Gln.java` + `GlnId.java`, `dao/impl/GlnDaoImpl.java`, then `InvoiceRepositoryImpl.setGln`; on paper, add a DAO method "schools in a postal-code range" by copying `schoolsPerZipcode`. Self-check question: why is the L2 cache "enabled but effectively caches nothing" (derive the answer from the Knowledge File §9.5 reference — if not resolvable from the Notion text alone, phrase the self-check to point the reader at Knowledge File §9.5 rather than inventing an unverified answer).

- [ ] **Step 3: Write `src/step-5-spring-security.md`** following the same structure, using:
  - Overview: the JWT layer is a custom filter placed in Spring Security's standard chain; ignored paths get no security filters at all.
  - Deep Understanding: 5.1 (Spring Security 5.7 Servlet Architecture, with the `SecurityConfig.java` filter-chain snippet and the `web.ignoring().antMatchers(...)` line), noting the stable docs URL is now 6.x — use the 5.7-SNAPSHOT link given in the source.
  - Drilling: with Knowledge File §10 open, draw the filter chain for `GET /api/v2/school/1` and for `GET /restapi/school/1`. Self-check question: why does `/restapi/**` get no security filters at all (answer: `web.ignoring()` removes the path from the filter chain entirely, rather than applying a permissive rule within it — it's excluded before Spring Security evaluates anything).

- [ ] **Step 4: Verify**

Run: `mdbook build && grep -q 'data-level="overview"' book/step-4-persistence-hibernate.html && grep -q 'data-level="overview"' book/step-5-spring-security.html && echo OK`
Expected: prints `OK`.

- [ ] **Step 5: Commit**

```bash
git add src/step-4-persistence-hibernate.md src/step-5-spring-security.md
git commit -m "Write Step 4 and Step 5 chapters"
```

---

### Task 13: Steps 6-7 chapters (Lombok, Ecosystem)

**Files:**
- Modify: `src/step-6-lombok.md`
- Modify: `src/step-7-ecosystem-audio.md`

**Interfaces:**
- Consumes: `.level-tabs`/`.level` (Task 3), `.checklist`/`.qa` (Task 2), `[data-mark-done]` (Task 4).

- [ ] **Step 1: Fetch the source content**

Use `mcp__notion__notion-fetch` with id `3e29a137-d71d-8195-a910-fa7258bb5a7d`. Read `## Step 6 — Lombok (why the code has almost no getters/setters)` (6.1) through `## Step 7 — Keeping your ear on the ecosystem (audio)` (7.1, 7.2), stopping before `## Cheat-sheet`.

- [ ] **Step 2: Write `src/step-6-lombok.md`** following the same structure, using:
  - Overview: entities and controllers depend on Lombok; without the IDE plugin you'll see phantom "cannot find symbol" errors.
  - Deep Understanding: 6.1 (Lombok features, official docs), the `ApiUser.java` `@Entity @Getter @Setter @NoArgsConstructor` snippet, the `@Getter(onMethod_ = {@Override})` snippet from `SchoolController.java`, `@Slf4j` giving a `log` field, `security/User.java`'s `@Value @Builder`.
  - Drilling: in IntelliJ, use *Delombok* on `ApiUser` to see the generated code. Self-check: what does `@Getter(onMethod_ = {@Override})` generate, and why is `@Override` needed there (it generates a getter method that also satisfies an interface's abstract getter — the interface declares the getter, so the generated implementation must be marked `@Override`).
  - Note this step has no "Mark this step done" driven by a project exercise in the source beyond Delombok — still include the `[data-mark-done]` button for consistency with every other Step chapter.

- [ ] **Step 3: Write `src/step-7-ecosystem-audio.md`** following the same structure, using:
  - Overview: background listening, not how-to for today's code — tells you where the ecosystem is headed (Boot 3+/Spring 7 migration talk).
  - Deep Understanding: 7.1 (Spring Office Hours podcast — weekly, Dan Vega/DaShaun Carter, 140+ episodes), 7.2 (JetBrains "Top 12 Podcasts for Java Developers in 2024" — *A Bootiful Podcast* and *airhacks.fm* singled out as most relevant to this project's enterprise-Java traits).
  - Drilling: no project exercise in the source for this step — instead, a checklist item "Listen to one Spring Office Hours or A Bootiful Podcast episode and write one unfamiliar term you heard into the Knowledge File." Still include `[data-mark-done]`.

- [ ] **Step 4: Verify**

Run: `mdbook build && grep -q 'data-level="overview"' book/step-6-lombok.html && grep -q 'data-level="overview"' book/step-7-ecosystem-audio.html && echo OK`
Expected: prints `OK`.

- [ ] **Step 5: Commit**

```bash
git add src/step-6-lombok.md src/step-7-ecosystem-audio.md
git commit -m "Write Step 6 and Step 7 chapters"
```

---

### Task 14: Cheat Sheet, Tips (A-C), Personal Plan, Appendix

**Files:**
- Modify: `src/cheat-sheet.md`
- Modify: `src/tips-dotnet-to-java.md`
- Modify: `src/tips-learning-new-stack.md`
- Modify: `src/tips-legacy-codebase.md`
- Modify: `src/personal-plan.md`
- Modify: `src/appendix-sources.md`

**Interfaces:**
- Consumes: `.table-wrap`/`.callout` (Task 2). These five chapters do not use the level-tabs system (they aren't "Step" chapters) — they're single-level reference/reading material, matching the spec's content structure.

- [ ] **Step 1: Fetch the source content**

Use `mcp__notion__notion-fetch` with id `3e29a137-d71d-8195-a910-fa7258bb5a7d`. Read `## Cheat-sheet: which concept you'll meet in which file` (the table), the full `# Tips & tricks: moving from .NET to Java, and learning big unfamiliar stacks` section (subsections A, B, C — D is handled separately below), and `## Appendix — every source and its status` (the full table).

- [ ] **Step 2: Write `src/cheat-sheet.md`**

Reproduce the Notion cheat-sheet table (Concept → Where it lives in the repo) inside a `<div class="table-wrap">` wrapping a standard Markdown table, plus the "Remaining gap" callout about JWT/springdoc-openapi verbatim, plus a closing link-style paragraph: "See the interactive layer breakdown in [Step 3](step-3-spring-mvc-war.md#L)." (link to the chapter, mdBook resolves relative links between chapters automatically).

- [ ] **Step 3: Write `src/tips-dotnet-to-java.md`**

Reproduce section "A. Specifically: .NET → Java / Spring" — the source list with verification marks, and all 6 numbered tips with their "→ *This project:*" lines, each numbered tip as its own paragraph (not a checklist — these are reading material, not exercises). Include the closing "Quality note" line as a `<div class="callout note">`.

- [ ] **Step 4: Write `src/tips-learning-new-stack.md`**

Reproduce section "B. Learning any new language/framework as an experienced developer" the same way — 7 numbered tips with their "→" project-specific lines.

- [ ] **Step 5: Write `src/tips-legacy-codebase.md`**

Reproduce section "C. Getting into an existing (legacy) codebase" the same way — 6 numbered tips with their "→" project-specific lines.

- [ ] **Step 6: Write `src/personal-plan.md`**

Reproduce section "D. A short personal plan" as a numbered Markdown list (it's already a 6-item sequential plan in the source — keep it sequential, not a `.checklist`, since it's a reading order not independent tasks).

- [ ] **Step 7: Write `src/appendix-sources.md`**

Reproduce the full "every source and its status" table inside a `<div class="table-wrap">` wrapping a standard Markdown table (columns: #, Source, Type, Status) — this is long (30+ rows), transcribe it completely, don't truncate or summarize it.

- [ ] **Step 8: Verify**

Run: `mdbook build && grep -q "table-wrap" book/cheat-sheet.html && grep -q "table-wrap" book/appendix-sources.html && echo OK`
Expected: prints `OK`.

- [ ] **Step 9: Commit**

```bash
git add src/cheat-sheet.md src/tips-dotnet-to-java.md src/tips-learning-new-stack.md src/tips-legacy-codebase.md src/personal-plan.md src/appendix-sources.md
git commit -m "Write cheat sheet, tips, personal plan, and appendix chapters"
```

---

### Task 15: Codebase Walkthroughs subsection

**Files:**
- Create: `src/codebase-walkthroughs/assets/walkthrough-domain.html` (copied)
- Create: `src/codebase-walkthroughs/assets/walkthrough-uml.html` (copied)
- Create: `src/codebase-walkthroughs/assets/walkthrough-code-flow.html` (copied)
- Create: `src/codebase-walkthroughs/assets/walkthrough-api-endpoints.html` (copied)
- Create: `src/codebase-walkthroughs/assets/walkthrough-db-schema.html` (copied)
- Modify: `src/codebase-walkthroughs/overview.md`
- Modify: `src/codebase-walkthroughs/business-domain.md`
- Modify: `src/codebase-walkthroughs/uml.md`
- Modify: `src/codebase-walkthroughs/code-flow.md`
- Modify: `src/codebase-walkthroughs/api-endpoints.md`
- Modify: `src/codebase-walkthroughs/database-schema.md`

**Interfaces:**
- Consumes: nothing from earlier tasks (these chapters are plain intro + iframe, no level-tabs).

- [ ] **Step 1: Copy the assets verbatim**

```bash
mkdir -p src/codebase-walkthroughs/assets
cp ~/Coding/api/walkthrough-domain.html src/codebase-walkthroughs/assets/
cp ~/Coding/api/walkthrough-uml.html src/codebase-walkthroughs/assets/
cp ~/Coding/api/walkthrough-code-flow.html src/codebase-walkthroughs/assets/
cp ~/Coding/api/walkthrough-api-endpoints.html src/codebase-walkthroughs/assets/
cp ~/Coding/api/walkthrough-db-schema.html src/codebase-walkthroughs/assets/
```

- [ ] **Step 2: Read each copied file's `<title>` tag and its `SUMMARY` constant**

Run: `grep -m1 '<title>' src/codebase-walkthroughs/assets/*.html` and `grep -m1 'const SUMMARY' src/codebase-walkthroughs/assets/*.html`
Use these to write an accurate 2-3 sentence intro per chapter in the next step — don't invent a description, use what the file itself says it covers.

- [ ] **Step 3: Write `src/codebase-walkthroughs/overview.md`**

```markdown
# Codebase Walkthroughs

These five pages are interactive, clickable diagrams of the actual
`vwo-api` codebase — generated separately from this guide, kept exactly
as they are (their own dark/purple theme, their own React + Mermaid
rendering). Click a node in any diagram to open a detail panel; nothing
here is graded or leveled, they're reference material to explore
alongside the Learning Path.

- [Business Domain](business-domain.md) — the VWO/Kangoeroe contest model.
- [UML](uml.md) — class-level structure.
- [Code Flow](code-flow.md) — how a request moves through the layers.
- [API Endpoints](api-endpoints.md) — the REST surface.
- [Database Schema](database-schema.md) — the persistence model.
```

- [ ] **Step 4: Write the 5 wrapper chapters**

Each follows this exact shape, e.g. `src/codebase-walkthroughs/business-domain.md`:

```markdown
# Business Domain

<!-- 2-3 sentence intro written from this file's own <title>/SUMMARY, per Step 2 -->

<iframe src="assets/walkthrough-domain.html" style="width:100%;height:85vh;border:0;border-radius:8px;" title="Business Domain walkthrough"></iframe>
```

Repeat for `uml.md` (`assets/walkthrough-uml.html`), `code-flow.md`
(`assets/walkthrough-code-flow.html`), `api-endpoints.md`
(`assets/walkthrough-api-endpoints.html`), `database-schema.md`
(`assets/walkthrough-db-schema.html`) — each with its own 2-3 sentence
intro from Step 2's findings.

- [ ] **Step 5: Verify the assets land at the path the iframes use**

Run:
```bash
mdbook build
for f in domain uml code-flow api-endpoints db-schema; do
  test -f "book/codebase-walkthroughs/assets/walkthrough-$f.html" && echo "OK $f" || echo "MISSING $f"
done
```
Expected: `OK domain`, `OK uml`, `OK code-flow`, `OK api-endpoints`, `OK db-schema` — no `MISSING` lines. This directly checks the Review Focus item about the iframe's relative path actually resolving in the built output, not just that the source file exists somewhere.

- [ ] **Step 6: Commit**

```bash
git add src/codebase-walkthroughs
git commit -m "Add Codebase Walkthroughs subsection embedding the existing interactive explainers"
```

---

### Task 16: Final full-site verification

**Files:** none created; verification and a fix-up pass only.

- [ ] **Step 1: Full clean build**

Run: `rm -rf book && mdbook build`
Expected: exits 0, zero warnings (mdBook warns on broken internal links — fix any that appear before proceeding).

- [ ] **Step 2: Confirm every SUMMARY.md entry has non-placeholder content**

Run: `grep -L 'level-tabs\|iframe\|table-wrap\|callout' src/*.md src/codebase-walkthroughs/*.md`
Expected: no output (every chapter file contains at least one of the widget/structural markers, meaning none were left as the bare Task 1 placeholder heading).

- [ ] **Step 3: Run the full JS test suite one more time**

Run: `node --test theme/`
Expected: PASS, 17 tests, 0 failures.

- [ ] **Step 4: Manual QA in a browser**

Run: `mdbook serve` and open `http://localhost:3000`. Walk through:
- Switch levels on a Step chapter, navigate to another Step chapter, confirm the same level is still selected.
- Click "Mark this step done" on Step 1, confirm a ✓ appears next to "Step 1" in the left sidebar immediately (no reload needed).
- Reload the page, confirm the ✓ persisted and the button still reads "Marked done".
- On a chapter with ≥ 2 headings, confirm the on-this-page nav appears on the right and highlights the section currently in view while scrolling.
- On "How to Use This Guide", drag both pace-chooser sliders to their minimum, confirm a warning renders (not a blank/NaN result); drag both to maximum, confirm the warning disappears.
- On Step 3, click through all four layer-explorer rows in both "Annotations" and "File locations" view, confirm the detail panel updates each time.
- Open each of the 5 Codebase Walkthrough chapters, confirm the iframe loads and is interactive (click a diagram node).
- Toggle the mdBook theme to `navy` (moon icon), confirm the pink/cyan tokens are still legible against the dark background.

- [ ] **Step 5: Commit any fixes found during manual QA, then tag the milestone**

```bash
git add -A
git commit -m "Fix issues found during manual QA" --allow-empty
git tag v1-learn-api-site
```

(If Step 4 found no issues, the `--allow-empty` commit is still fine as a checkpoint marker; otherwise it carries the real fixes.)
