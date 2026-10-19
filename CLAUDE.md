# CLAUDE.md

This repo is a template for interactive mdBook sites (learning guides
especially). Readers get level tabs, quizzes, flashcards, code compares,
self-checks, a progress map, a pace chooser, a layer explorer, an annotated
code walkthrough, themed Mermaid diagrams, a three-way diff view, an
emoji-driven compatibility matrix, a history timeline, a "copy as"
picker, a branching "what would you do?" scenario, hover-term glossary
definitions, a collapsible reference tree, a fill-in-the-blank snippet,
a Ctrl/Cmd+K command palette, a checkbox-driven decision table, a
before/after image slider, footnote popovers, "was this page helpful?"
feedback, copy-link-to-heading buttons, a colored-pill parameter table
and a reading-time estimate, all driven by markup in the Markdown pages
(the command palette, heading links and reading time are global and
need none). **Writing a book never requires editing JS.**

## Where things live

- `book.toml`: title/authors, themes, `site-url`, and the ordered list of
  theme CSS/JS (`book-config.js` first, `celebrate.js` second).
- `theme/book-config.js`: `window.BookConfig`. Set `storagePrefix` to a
  unique slug per book (localStorage keys are `<prefix>:level`,
  `<prefix>:done:<slug>`, `<prefix>:known:<slug>:<i>`,
  `<prefix>:check:<slug>:<i>`, `<prefix>:tracked`, `<prefix>:copyas-pref`).
  Optional `trackedChapters: ['slug', ...]`.
- `theme/custom.css`: design tokens (recolor ONLY in the token block at the
  top: `--brand-1..4`, `--bk-confetti`, per-theme `--bk-*` for light, rust,
  navy, coal, ayu) + base styles. `theme/interactive.css`: widget styles.
- `theme/*.js`: one widget per file; pure helpers exported for
  `theme/*.test.js` (node:test, no deps). Custom events: `book:level-changed`,
  `book:done-changed`. Shared helpers: `window.Book.celebrate/toast`.
- `src/`: the book. `src/components.md` is the live gallery with the markup
  for every widget; `src/writing-guide.md` has the authoring rules.
- `templates/chapter.md`: starter for a new chapter (copy into `src/`).

## Creating a book from this template

1. Edit `book.toml` (title, authors; `site-url = "/<repo>/"` for GitHub Pages
   project sites) and `storagePrefix` in `theme/book-config.js`.
2. Replace `src/example-chapter.md` with real chapters: run
   `scripts/new-chapter.sh "Title"` (copies `templates/chapter.md`, wires
   it into `src/SUMMARY.md` and the progress map). Keep or drop
   `components.md`/`writing-guide.md`.
3. Optionally recolor via the token block in `theme/custom.css`.
4. Optionally `git config core.hooksPath .githooks` once, so every
   commit runs the widget tests and a full build first.

## Markup contract (see src/components.md for full examples)

- Callout: `<div class="callout note|setup|rule|danger"><div class="callout-label">Label</div>` + blank line + Markdown + blank line + `</div>`.
- Table: Markdown table, optionally inside `<div class="table-wrap">` (blank lines).
- Checklist: `<ul class="checklist"><li><label><input type="checkbox"><span>HTML</span></label></li></ul>` (ticks persist).
- Level tabs (max one per page): `<div class="level-tabs" data-levels>` with `<button data-level="overview|deep|drill">` (first has `aria-pressed="true"`, optional `data-short` phone label), then `<div class="level overview|deep|drill">` blocks with blank lines inside.
- Self-check: `<details class="qa"><summary>Q</summary><div class="ans">A<div class="mark"><button type="button">Mark as known</button></div></div></details>`.
- Mark done (one per chapter, end of drill): `<button type="button" data-mark-done>Mark this chapter done</button>`; optional `data-done-text`.
- Quiz: `<div class="quiz" data-quiz><p class="quiz-q">Q</p><ol class="quiz-options"><li>..<p class="quiz-whynot">..</p></li><li data-correct>..<p class="quiz-why">..</p></li></ol><p class="quiz-explain">Why</p></div>`. `quiz-why`/`quiz-whynot` are optional, per-option: each stays hidden until that option is picked, and all become visible once the question is solved (same reveal condition as `quiz-explain`, just per-option instead of once for the whole question).
- Flashcards: `<div class="flashcards" data-flashcards data-front-label="" data-back-label="">` + `<div class="card"><div class="front">..</div><div class="back">..</div></div>`; optional `data-title`.
- Code compare: `<div class="code-compare" data-code-compare>` + blank line + 2-4 fenced blocks + blank line + `</div>`; optional `data-labels="A|B"`, `data-subs="a|b"`, `data-default="1"` (1-based; default = last pane).
- Progress map: `<div data-progress-map>` + blank line + Markdown list `- [Title](file.md) blurb` + blank line + `</div>`; optional `data-title`, `data-label`, `data-done-text`.
- Pace chooser: `<div class="pace-chooser" data-pace-chooser><ul class="pc-tasks"><li data-hours="6">Short: Long label</li></ul></div>`; optional `data-short` on li, `data-max-hours`, `data-max-weeks`, `data-default-hours`, `data-default-weeks`.
- Layer explorer: `<div class="layer-explorer" data-layer-explorer data-entry=".." data-exit="..">` + `<div class="layer" data-name=".." data-tag=".." data-trace="..">detail HTML</div>`; optional `data-return`, `data-trace-label`; `backticks` in entry/exit/trace/return become code.
- Code walkthrough: `<div class="code-walk" data-code-walk>` + blank line + a fenced code block with `// (1)`-style trailing markers (`//`, `#`, `--`, `;`, `%`, `/* */`, `<!-- -->` all recognized) + blank line + a plain `<ol>` of explanations, numbered to match + blank line + `</div>`. No JS: still reads as code + a numbered list.
- Mermaid diagram: a plain ` ```mermaid ` fenced code block, no wrapper div. Lazy-loads mermaid from a CDN only on pages that use it; themed from `--ia-*`/`--bg`/`--fg`, re-renders on theme switch. Zoom buttons, ctrl/cmd+wheel, drag-to-pan, keyboard `+`/`-`/`0`, and a "view source" toggle.
- Diff view: `<div class="diff-view" data-diff-view>` + blank line + a fenced ` ```diff ` block (raw `git diff` output works — `diff --git`/`index`/`---`/`+++`/`@@` lines are stripped) + blank line + `</div>`. Three tabs: Before/Diff/After. Optional `data-labels="Before|Diff|After"`, `data-default="before|diff|after"` (default `diff`).
- Compatibility matrix: `<div class="compat-matrix" data-compat-matrix>` + blank line + a plain Markdown table whose cells start with `✅`/`✓` (full), `⚠️`/`🟡` (partial) or `❌`/`✗` (none) + blank line + `</div>`. Text after the emoji is a note; cells with one become clickable, showing the note in a shared card below the table. First column and header untouched.
- Timeline: `<div class="timeline" data-timeline>` + blank line + a Markdown list `- **label** body` + blank line + `</div>`; optional `data-title`. Every entry stays visible (no collapsing); click/arrow-key a dot to highlight + scroll to it.
- Copy as: `<div class="copy-as" data-copy-as data-labels="A|B|C">` + blank line + 2+ fenced blocks (one shown at a time, never side by side) + blank line + `</div>`. `data-labels` is required (not guessed from language). Optional `data-default="2"` (1-based). The reader's pick is remembered site-wide (`<prefix>:copyas-pref`), so it carries over to every copy-as block on every page.
- Branching scenario: `<div class="scenario" data-scenario data-start="slug">` + a FLAT list of `<div class="sc-node" data-node="slug">` (not nested): `<p class="sc-prompt">`, `<ul class="sc-choices"><li data-goto="slug">label</li></ul>`, optional `<p class="sc-result">`; a node with `data-end` has no choices (shows "Start over"), optional `data-good` toasts via `window.Book.toast`. Choices pick by click or letter keys (A, B, ...), breadcrumb trail is clickable to rewind.
- Glossary term: `<dfn data-def="...">word</dfn>` inline, anywhere in prose, no wrapper. Hover/focus shows the definition in a popover; tap toggles on touch; only one open at a time. Optional `<div data-glossary-index></div>` anywhere on a page collects every `dfn` already on THAT page (no cross-page magic) into a sorted, deduplicated list.
- Reference tree: `<div class="ref-tree" data-ref-tree>` + blank line + a nested Markdown list (`- item` with indented sub-lists) + blank line + `</div>`. Top level starts expanded, deeper levels start collapsed; optional `data-expanded` starts everything open. Arrow keys: Right expand/move into first child, Left collapse/move to parent, Up/Down between visible toggles. No JS: still a plain nested list.
- Fill-in-the-blank snippet: `<div class="fill-in" data-fill-in>` + blank line + a single fenced code block containing `{{NAME}}` or `{{NAME:default}}` tokens + blank line + `</div>`. Each token becomes a real `<input>` embedded in the code; repeats of the same NAME stay in sync. "Copy filled snippet" copies the current values (mdBook's own copy button would only copy the static template).
- Command palette: no markup, global. `Ctrl`/`Cmd`+`K` fuzzy-searches chapter titles (from the sidebar), the current page's `h2`/`h3` headings, and `dfn[data-def]` glossary terms on it; arrow keys move, Enter jumps.
- Decision table: `<div class="decision-table" data-decision-table>` + blank line + a plain Markdown table + blank line + `</div>`. A column becomes a checkbox toggle only if every body cell in it is `✅`/`✓` (required), `❌`/`✗` (forbidden) or `—`/`-` (either); toggling highlights matching rows and dims the rest. Any other column (an outcome) is left untouched.
- Before/after slider: `<div class="before-after" data-before-after data-labels="Before|After">` + raw `<img data-before src="..">` + `<img data-after src="..">` + `</div>` (raw HTML, not Markdown). Drag the handle or click to compare; `data-labels` is optional.
- Footnote popovers: standard Markdown footnotes (`text[^label]` + `[^label]: definition`). No new markup: this only changes what clicking the rendered footnote reference does, showing the definition in a popover instead of jumping to the page bottom.
- Page feedback: `<div class="page-feedback" data-page-feedback></div>`, usually once at the end of a chapter. Thumbs up/down; "No" reveals an optional comment box. The vote is remembered locally so the question doesn't reappear. Optional `data-webhook="https://.."` POSTs `{ slug, vote, comment }` on submit.
- Heading links: no markup, global. Hovering any `h2`/`h3`/`h4` with an id reveals a 🔗 button that copies that section's URL.
- Reading time: no markup, global. A "~N min read" line injected after a chapter's `h1`, computed from the page's own word count (code blocks excluded) at ~200 words/minute.
- Parameter table: `<div class="param-table" data-param-table>` + blank line + a plain Markdown table with a `Type` column + blank line + `</div>`. That column's cells use a small type-syntax: trailing `?` marks the cell optional, `Name[]` marks a segment an array, `A\|B` (escaped, like any Markdown table cell with a literal pipe) renders a union of colored pills.

## Authoring rules

- Blank line after an opening `<div>` and before `</div>` whenever the inside is Markdown.
- Raw-HTML widgets contain HTML, not Markdown: `<code>`, `<strong>`, and `&lt;` for `<`.
- Headings inside levels stay Markdown (`### Title`) with blank lines around them.
- Links: Markdown `[text](page.md)` (mdBook rewrites `.md` → `.html` only in Markdown, never in raw-HTML `href`s). The progress map must use Markdown links.
- Chapter file names are progress keys: don't rename published chapters casually.
- Keep content accurate; prefer quiz distractors that are real misconceptions.

## Verify before finishing

```sh
mdbook build             # must produce zero warnings (mdBook v0.5.4)
npm test                 # = node --test theme/*.test.js, all must pass
mdbook serve --open      # click through each widget you used, also at ~390px width
```

`book/` is build output and gitignored.
