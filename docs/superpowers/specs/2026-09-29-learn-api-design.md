# learn-api: design spec

## Purpose

Three sequential sub-projects, in this order:

1. `~/Coding/learn-api` — an mdBook site containing the "Learning Java for
   the VWO API" Notion page as a structured, leveled learning path, plus a
   separate subsection embedding the interactive walkthrough pages from
   `~/Coding/api/`.
2. A skill (`learning-guide-builder`) that packages the pattern from (1) so
   future learning docs can be scaffolded the same way.
3. A GitHub template repo (`mdbook-template`, public, under `CornillieJ`)
   holding just the boilerplate + styling extracted from (1) — no content.

Each sub-project is built, verified, and (for 1) reviewed before the next
starts, since 2 and 3 both extract patterns from 1's finished output.

## Reference material already gathered

- `github.com/CornillieJ/sa` (cloned to scratch) — course mdBook site.
  Its `guide/` folder is a heavier, Python-generated custom-HTML-shell
  system (not what we're building — see decision below). Its **parent**
  site's `project-doc-custom-*.css` is the actual pink/cyan theme
  reference (see Theme section).
- Notion page "Learning Java for the VWO API — a .NET developer's path"
  (id `3e29a137-d71d-8195-a910-fa7258bb5a7d`) — full content already
  fetched in-session: 7 steps, a cheat-sheet table, tips A-D, a personal
  plan, and a fully-verified source appendix.
- `~/Coding/api/walkthrough-*.html` (5 files) — self-contained
  React+Mermaid interactive pages, dark/purple theme, ~365-1060 lines
  each. Kept as-is, embedded via iframe.
- `~/Coding/vwo-docs` — existing mdBook project with the Dockerfile /
  docker-compose.yml pattern to reuse for the template repo.

## Decision: plain mdBook, not sa/guide's iframe-shell system

sa/guide is a **separate Python-built static site** (`build.py` generates
standalone HTML pages, each shipped twice — a `.frame.html` and a
`.html` wrapper that iframes the frame into the mdBook nav). That's a lot
of machinery to reproduce and maintain.

Instead: plain mdBook Markdown chapters, with raw-HTML widgets (mdBook
renders embedded HTML in `.md` files) styled and driven by
`theme/custom.css` + `theme/custom.js` via `book.toml`'s
`additional-css`/`additional-js`. This is simpler, matches the existing
`vwo-docs` convention, and — critically — **is** the styling the
template repo (sub-project 3) will ship, so learn-api becomes the first
real instance of that template rather than a one-off.

## Theme

Source: `sa` repo's `project-doc-custom-5c36c7a3.css` (the parent site's
override, not `guide/_src/base.css`, confirmed against the user's
screenshot).

Tokens to carry over:
- Pink `#EC008C` — `.part-title` (sidebar section headers), `.menu-title`
  (top bar title), `strong` text.
- Cyan `#44C8F5` — headings (h1/h2/h3), table header backgrounds.
- Teal `#26A99E` / yellow accent — reserved for secondary tags/badges,
  used sparingly (levels, chapter-status).
- Base: stock mdBook `light` + `navy` themes, unmodified otherwise
  (`default-theme = "light"`, `default-dark-theme = "navy"` in
  `book.toml`, matching sa's own `book.toml` convention).

`theme/custom.css` adds: the tokens above, plus the widget-specific
classes below (callout, checklist, drill-item/qa, meter/range-row,
hex-wrap/hexsvg) ported from `sa/guide/_src/base.css`'s equivalent rules,
recolored to this palette instead of the paper/blue/violet one.

## Content structure (`src/SUMMARY.md`)

```
# Learning Path
- How to Use This Guide
- Step 1: Java Syntax, Fast (from C#)
- Step 2: Maven
- Step 3: Spring Core, MVC & WAR Deployment
- Step 4: Persistence — Hibernate & HQL
- Step 5: Spring Security
- Step 6: Lombok
- Step 7: Ecosystem & Audio
- Cheat Sheet: Concept → File Map
- Tips: .NET → Java / Spring
- Tips: Learning Any New Stack
- Tips: Entering a Legacy Codebase
- A Short Personal Plan
- Appendix: Sources & Verification Status

# Codebase Walkthroughs
- Overview
- Business Domain
- UML
- Code Flow
- API Endpoints
- Database Schema
```

Each **Step N** chapter carries the Notion content split into three
levels (see below), the cheat-sheet table becomes its own interactive
chapter, and the appendix table is reproduced as-is (already structured).
The 4 "tips" sections (A-D in Notion) become their own chapters so they
aren't buried inside a step. Verified/status markers (✅ 🔎 ⚠️) are kept
verbatim — they're informative, not decorative.

Each **Codebase Walkthrough** chapter is a short Markdown intro (what
you're looking at, 2-3 sentences) followed by a raw `<iframe>` pointing
at the copied asset (`src/codebase-walkthroughs/assets/<file>.html`,
copied verbatim from `~/Coding/api/`, untouched).

## The level system (Overview / Deep Understanding / Drilling)

A tab widget at the top of every "Step" chapter:

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

`custom.js` shows/hides `.level.*` blocks by the active tab and persists
the chosen level in `localStorage` (one global preference, applied on
every chapter load) — mirrors sa/guide's `data-mode` switch.

- **Overview**: one paragraph (the "why this matters here" lede) + that
  step's cheat-sheet row.
- **Deep Understanding**: the resource list, verified-status lines, and
  the code comparison blocks — the bulk of the Notion content, kept
  close to verbatim.
- **Drilling**: the "Project exercise" line turned into a checklist item
  (see checkmarks below) plus one derived self-check question in a
  `<details class="qa">` disclosure with a "mark known" button.

## Checkmarks (sidebar progress)

Each chapter's Drilling level ends with a "Mark this step done" button.
`custom.js`:
- Persists done-state in `localStorage` keyed by chapter path.
- On every page load, walks mdBook's rendered sidebar (`.chapter-item a`)
  and appends a ✓ to any chapter marked done — visible site-wide, not
  just on that page (matches sa/guide's `nav.toc li.done`).

## On-this-page nav

A right-hand sticky mini-TOC per chapter, built client-side from that
page's `h2`/`h3` elements (`custom.js`, ported from sa/guide's
`COMMON_JS` TOC-builder), with `IntersectionObserver`-driven active-link
highlighting as the reader scrolls. Hidden below ~900px viewport width,
same breakpoint sa/guide uses.

## Signature interactive components (priority, not decoration)

Two components, explicitly called out as high-value by the user,
directly modeled on sa/guide's app.js/tradeoffs.js:

1. **Layer explorer** (hexagon-style) — an SVG diagram of
   Controller → Repository → DAO → Hibernate/DB, clickable per layer to
   reveal which annotations/classes/files live there (sourced from the
   Notion cheat-sheet + code snippets), with a flow/dependency view
   toggle. Placed in Step 3 (Spring MVC/WAR) and cross-linked from the
   cheat-sheet chapter. Ported from `graph.js` + the `.hex-wrap`/
   `.hexsvg` CSS, recolored to the new palette.
2. **Study-pace chooser** — range-slider widget (hours/week available,
   weeks until you need to trace an endpoint end-to-end) computing a
   live suggested week-by-week schedule, directly modeled on
   `tradeoffs.js`'s right-sizing chooser (multiple `<input type=range>`
   → live-computed verdict text). Placed in "How to Use This Guide",
   replacing static pacing prose with something interactive.

Both are genuinely interactive (not just styled boxes) and get their own
`custom.js` modules, same pattern as sa/guide's per-page `.js` files.

## Sub-project 2: `learning-guide-builder` skill

Lives at `~/.claude/skills/learning-guide-builder/`. Packages:
- The chapter/level/checkmark/on-this-page/widget scaffold as copyable
  templates (SKILL.md references files under the skill's own
  `assets/`/`references/`, not live symlinks into learn-api).
- Instructions: given a topic + source material (a Notion page, a set of
  docs, or freeform notes), produce the SUMMARY.md structure, split
  content into the three levels, and wire up the checkmark/on-this-page
  JS unchanged.
- Does **not** re-derive the interactive widgets from scratch each time
  — ships the layer-explorer and slider-chooser as ready components the
  skill's instructions say when to reach for.

## Sub-project 3: `mdbook-template` GitHub repo

- Created via `gh repo create CornillieJ/mdbook-template --template
  --public` (confirmed with user: create now, public, template-enabled).
- Contents: `book.toml`, `theme/custom.css`, `theme/custom.js` (the
  level/checkmark/on-this-page machinery, generic — no learn-api
  content-specific bits), a placeholder `src/SUMMARY.md` +
  `src/chapter_1.md`, `Dockerfile` + `docker-compose.yml` (adapted from
  `~/Coding/vwo-docs`), and a concise (not verbose) `README.md`: what
  this is, how to use it (`docker compose up`, or `mdbook serve`
  locally), where the theme tokens live if you want to recolor.
- No content, no learn-api-specific chapters.

## Verification

- `mdbook build` succeeds with zero warnings for learn-api.
- `mdbook serve`, manually click through: level tabs persist across
  chapter navigation, checkmarks appear in the sidebar, on-this-page nav
  highlights on scroll, both interactive widgets respond to input, all 5
  codebase-walkthrough iframes load.
- Template repo: `docker compose up` serves the placeholder book
  correctly on a clean checkout.

## Execution / orchestration

Given the independence of the two content streams, sub-project 1 splits
into two parallel agent tasks followed by an integration pass:
- Agent A: Learning Path chapters (content split + level tabs + cheat
  sheet + checkmarks + on-this-page nav + both signature widgets).
- Agent B: Codebase Walkthroughs subsection (copy assets, write intro
  chapters, iframe wiring) + book.toml/theme scaffold (since B's scope
  is small, it also stands up the shared skeleton A writes content into).
- Integration pass (me or a follow-up agent): merge, wire SUMMARY.md,
  `mdbook build` verification.

Sub-projects 2 and 3 run after 1 is verified, and can run in parallel
with each other (2 depends only on 1's chapter/JS patterns; 3 depends
only on 1's theme + Dockerfile pattern from vwo-docs — they don't depend
on each other).
