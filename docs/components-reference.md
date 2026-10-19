# Component Gallery

Every building block in this template, rendered live, each followed by
the markup that produced it. Copy the snippet, change the words, done.

<div class="callout note">
<div class="callout-label">Two rules before you copy</div>

1. Leave a **blank line** after an opening `<div ...>` and before its
   `</div>` whenever the inside is Markdown. Without it, mdBook treats the
   whole block as raw HTML and your `**bold**` stays literal.
2. In raw HTML (quiz options, flashcards), write `&lt;` for a literal `<`.

The [writing guide](writing-guide.md) has the full list.

</div>

## Command palette

Press <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>K</kbd> anywhere on this page to
open a fuzzy search over every chapter, this page's headings, and any
glossary term defined on it. Arrow keys move the selection, <kbd>Enter</kbd>
jumps.

This one is global and needs no markup: there's nothing to copy, it works
on every page in the book already.

## Heading links

Hover any `##`/`###`/`####` heading on this page (try this one) to reveal
a small 🔗 button that copies a link straight to that section.

Also global and markup-free: every heading already has an id (mdBook
gives it one), so there's nothing to add to a page.

## Reading time

The "~N min read" line right under this chapter's title is computed from
the page's own word count (code blocks excluded) every time it loads.
Global and markup-free, same as the command palette and heading links.

## Callouts

Four flavours: `note` (information), `setup` (prerequisites, installs),
`rule` (a principle or a "do this"), `danger` (a gotcha).

<div class="callout note">
<div class="callout-label">Note</div>

Background information the reader will want, but can skip.

</div>

<div class="callout setup">
<div class="callout-label">Setup</div>

Install `curl` and open your browser's DevTools before you start.

</div>

<div class="callout rule">
<div class="callout-label">Rule of thumb</div>

Fingerprinted assets: cache for a year. HTML: revalidate every time.

</div>

<div class="callout danger">
<div class="callout-label">Gotcha</div>

`no-cache` does **not** mean "don't cache".

</div>

```html
<div class="callout note">
<div class="callout-label">Note</div>

Markdown **works** here thanks to the blank lines.

</div>
```

Swap `note` for `setup`, `rule` or `danger`. The label text is free.

## Tables

mdBook tables get the themed look automatically. Wrap them in
`.table-wrap` so wide tables scroll sideways on phones instead of
breaking the layout.

<div class="table-wrap">

| Directive | Who may store it | Revalidate? |
|---|---|---|
| `no-store` | Nobody | n/a |
| `no-cache` | Everyone | Before every use |
| `private, max-age=60` | Browser only | After 60 s |

</div>

```html
<div class="table-wrap">

| Column | Column |
|---|---|
| cell | cell |

</div>
```

## Checklist

Styled checkboxes for hands-on tasks. Ticks are remembered per page in
the reader's browser.

<ul class="checklist">
<li><label><input type="checkbox"><span>Open the <strong>Network</strong> tab in DevTools.</span></label></li>
<li><label><input type="checkbox"><span>Reload the page and find a <code>304</code> response.</span></label></li>
</ul>

```html
<ul class="checklist">
<li><label><input type="checkbox"><span>A task. <strong>HTML</strong> only in here.</span></label></li>
<li><label><input type="checkbox"><span>Another task.</span></label></li>
</ul>
```

## Level tabs

One chapter, three depths: **Overview**, **Deep Understanding**,
**Drilling**. The bar sticks to the top of the page, the reader's choice
follows them from chapter to chapter, and keys <kbd>1</kbd>
<kbd>2</kbd> <kbd>3</kbd> switch levels. A page can have only **one**
level-tabs bar, so see it live in the
[example chapter](example-chapter.md).

```html
<div class="level-tabs" data-levels>
  <button data-level="overview" aria-pressed="true">Overview</button>
  <button data-level="deep" data-short="Deep">Deep Understanding</button>
  <button data-level="drill">Drilling</button>
</div>

<div class="level overview">

Markdown for the quick version. Blank lines around it!

</div>

<div class="level deep">

### Headings stay Markdown

They show up in "On this page" while their level is active.

</div>

<div class="level drill">

Quiz, flashcards, checklist, self-checks, then the mark-done button.

</div>
```

The level names `overview`, `deep` and `drill` are fixed; the button text
is yours ("Quick look", "In depth", "Practice"...). `data-short` is the
label shown on phones. The drill tab gets a badge counting its exercises
automatically.

## Self-check with "Mark as known"

A question to answer in your head first. Opening it reveals the answer;
"Mark as known" is remembered and turns the card green.

<details class="qa">
<summary>Self-check: what does a <code>304 Not Modified</code> save?</summary>
<div class="ans">
The response body. It does not save the round trip to the server.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

```html
<details class="qa">
<summary>Self-check: the question?</summary>
<div class="ans">
The answer, in HTML.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>
```

Leave out the `<div class="mark">` line for a plain reveal card.

## Quiz

Multiple choice with instant feedback. Wrong picks can be retried, the
`quiz-explain` appears once solved, and a scoreboard above the first quiz
on the page tracks first-try answers (a perfect score earns confetti).
With focus inside a quiz, letter keys <kbd>A</kbd>–<kbd>D</kbd> pick.

An option can also carry its own `quiz-why`/`quiz-whynot` paragraph. Each
stays hidden until that option is picked; solving the question reveals
every option's reasoning at once, not just the one(s) picked.

<div class="quiz" data-quiz>
<p class="quiz-q">Which header value keeps a response out of every cache?</p>
<ol class="quiz-options">
<li><code>no-cache</code><p class="quiz-whynot">Still stores the response and revalidates it, it just won't serve it without asking first.</p></li>
<li data-correct><code>no-store</code><p class="quiz-why">The only value that refuses to persist the response anywhere.</p></li>
<li><code>private</code><p class="quiz-whynot">Only rules out <em>shared</em> caches; the browser's own cache still stores it.</p></li>
</ol>
<p class="quiz-explain"><code>no-cache</code> still stores (and revalidates); <code>private</code> only rules out shared caches.</p>
</div>

```html
<div class="quiz" data-quiz>
<p class="quiz-q">The question?</p>
<ol class="quiz-options">
<li>A wrong answer<p class="quiz-whynot">Why this one's wrong.</p></li>
<li data-correct>The right answer<p class="quiz-why">Why this one's right.</p></li>
<li>Another wrong answer</li>
</ol>
<p class="quiz-explain">Why the right answer is right.</p>
</div>
```

## Flashcards

One card at a time: click or <kbd>Space</kbd> flips, <kbd>&rarr;</kbd>
"got it" removes the card from the round, <kbd>&larr;</kbd> "again" puts
it at the back; <kbd>S</kbd> shuffles, <kbd>R</kbd> restarts.

<div class="flashcards" data-flashcards data-front-label="Status code" data-back-label="Meaning">
<div class="card"><div class="front"><code>200</code></div><div class="back">OK: here is the full response</div></div>
<div class="card"><div class="front"><code>304</code></div><div class="back">Not Modified: your cached copy is still good</div></div>
<div class="card"><div class="front"><code>404</code></div><div class="back">Not Found</div></div>
</div>

```html
<div class="flashcards" data-flashcards data-front-label="Term" data-back-label="Meaning">
<div class="card"><div class="front">Front text</div><div class="back">Back text</div></div>
<div class="card"><div class="front"><code>List&lt;int&gt;</code></div><div class="back">Escape &lt; in HTML</div></div>
</div>
```

`data-front-label` / `data-back-label` default to "Question" / "Answer";
`data-title` (default "Flashcards") names the deck.

## Code compare

Two or more fenced code blocks side by side; on narrow screens they turn
into tabs. Labels come from each block's language.

<div class="code-compare" data-code-compare>

```python
import requests

r = requests.get("https://example.com/")
print(r.headers.get("Cache-Control"))
```

```javascript
const r = await fetch("https://example.com/");
console.log(r.headers.get("Cache-Control"));
```

</div>

````html
<div class="code-compare" data-code-compare>

```python
print("before")
```

```javascript
console.log("after");
```

</div>
````

Optional attributes: `data-labels="Before|After"` replaces the labels,
`data-subs="v1|v2"` adds grey sub-labels, and `data-default="1"` opens
the first pane on phones (the default is the last pane, "the thing being
learned"). With three or four blocks the panes sit side by side on wide
screens.

<div class="code-compare" data-code-compare data-labels="Before|After" data-subs="no caching|cached for a day" data-default="1">

```http
Cache-Control: no-store
```

```http
Cache-Control: public, max-age=86400
```

</div>

## Progress map

The chapters of your book as a journey: done chapters turn green, the
next one pulses, and a button continues where the reader left off. It
reads the same done-state as the **Mark this chapter done** button.

<div data-progress-map data-title="This book">

- [HTTP caching in 20 minutes](example-chapter.md) A worked chapter
- [Component gallery](components.md) This page
- [Writing guide](writing-guide.md) Authoring rules

</div>

```html
<div data-progress-map>

- [Chapter one](chapter-one.md) Short blurb
- [Chapter two](chapter-two.md) Short blurb

</div>
```

Use **Markdown** links (`.md`): mdBook rewrites them to `.html`, but it
does not rewrite `href`s in raw HTML. Optional: `data-title`,
`data-label` (the word before each number, default "Chapter"),
`data-done-text` (the message once everything is done). Up to seven
stops draw as a horizontal road on wide screens.

## Pace chooser

Two sliders turn a list of tasks into a week-by-week plan. Tasks bigger
than a week's budget are split ("part 1/2"), and the reader is told how
many hours they are short.

<div class="pace-chooser" data-pace-chooser>
<ul class="pc-tasks">
<li data-hours="3">Foundations: read and take notes</li>
<li data-hours="5">Practice: exercises and quizzes</li>
<li data-hours="4">Project: build something small</li>
<li data-hours="2">Review: flashcards and self-checks</li>
</ul>
</div>

```html
<div class="pace-chooser" data-pace-chooser data-max-hours="15" data-max-weeks="12">
<ul class="pc-tasks">
<li data-hours="3">Foundations: read and take notes</li>
<li data-hours="5">Practice: exercises and quizzes</li>
</ul>
</div>
```

Text before the colon ("Foundations") labels the bars; set `data-short`
on an `<li>` to choose it yourself. Optional on the container:
`data-max-hours`, `data-max-weeks`, `data-default-hours`,
`data-default-weeks`.

## Layer explorer

A clickable stack of layers with a detail card, arrow-key navigation, and
an animated "Trace a request" dot. Great for architectures, pipelines and
request flows.

<div class="layer-explorer" data-layer-explorer data-entry="HTTP request" data-exit="Database">
<div class="layer" data-name="Controller" data-tag="HTTP in, HTTP out" data-trace="The request lands in the controller, which validates input and calls a service.">
<p>Maps URLs to handlers, parses and validates input, and turns results into responses (status codes, JSON).</p>
<p>Keep it thin: no business rules here.</p>
</div>
<div class="layer" data-name="Service" data-tag="business rules" data-trace="The service applies the business rules and asks the repository for data.">
<p>Where decisions live: permissions, calculations, workflows. Easy to unit test because it knows nothing about HTTP.</p>
</div>
<div class="layer" data-name="Repository" data-tag="data access" data-trace="The repository turns the request into a query, e.g. `SELECT ... WHERE id = ?`.">
<p>The only layer that talks to the database. Swapping storage means changing just this layer.</p>
</div>
</div>

```html
<div class="layer-explorer" data-layer-explorer data-entry="HTTP request" data-exit="Database">
<div class="layer" data-name="Controller" data-tag="HTTP in, HTTP out"
     data-trace="The request lands in the controller.">
<p>Detail HTML shown in the card when this layer is selected.</p>
</div>
<div class="layer" data-name="Service" data-tag="business rules"
     data-trace="Rules run here; `backticks` become code.">
<p>More detail.</p>
</div>
</div>
```

Leave out `data-entry` / `data-exit` to drop the end nodes. Optional:
`data-return` (caption for the trip back up) and `data-trace-label`
(button text).

## Code walkthrough

A fenced code block plus a plain numbered list. Mark the line a note is
about with a trailing `(N)` in a comment; click the badge it turns into
(or press its digit key) to read that note below the code. Works with
`//`, `#`, `--`, `;`, `%`, `/* */` and `<!-- -->`, so it reads the same
regardless of language.

<div class="code-walk" data-code-walk>

```js
function clamp(value, min, max) { // (1)
  if (value < min) return min;    // (2)
  if (value > max) return max;    // (3)
  return value;
}
```

1. Guard clauses instead of nested `if`/`else`: each condition exits immediately.
2. The lower-bound check returns `min` as soon as `value` dips below it.
3. Same idea for the upper bound; falling through both means the value was already in range.

</div>

````html
<div class="code-walk" data-code-walk>

```js
function clamp(value, min, max) { // (1)
  if (value < min) return min;    // (2)
  return value;
}
```

1. First note.
2. Second note.

</div>
````

Numbers are 1-based and must match a note's position in the list below
the code. Write them in whatever order reads best. "Expand all" shows
every note stacked at once, handy for printing or a linear read.
Without JavaScript the page still reads fine: code, then a plain
numbered list of notes underneath it.

## Fill-in-the-blank snippet

A fenced code block with `{{NAME}}` tokens, each one turned into a real
input embedded right in the code. Repeats of the same name stay in sync
as you type. "Copy filled snippet" copies what's actually in the fields.
mdBook's own copy-code button would only ever copy the static
template, so this widget gets its own.

<div class="fill-in" data-fill-in>

```bash
curl https://api.example.com/v1/users \
  -H "Authorization: Bearer {{API_KEY}}" \
  -H "X-Region: {{REGION:us-east-1}}"
```

</div>

````html
<div class="fill-in" data-fill-in>

```bash
curl https://api.example.com/v1/users \
  -H "Authorization: Bearer {{API_KEY}}" \
  -H "X-Region: {{REGION:us-east-1}}"
```

</div>
````

`{{NAME:default text}}` seeds that field's starting value; plain
`{{NAME}}` starts empty with the name itself as a placeholder. Good for
`curl` commands, `.env` files, and any config snippet that needs real
values dropped in before it's actually runnable. Without JavaScript the
`{{NAME}}` tokens stay visible as plain text in the code block, still
legible as "fill this in yourself."

## Mermaid diagram

A plain ` ```mermaid ` fenced block, no wrapper `<div>`. It's the same
convention every mermaid-aware tool already uses. It's themed to match
whichever of the book's five color themes the reader has picked, and
re-renders the instant they switch themes.

```mermaid
flowchart LR
  A[Browser] --> B[Controller]
  B --> C[Service]
  C --> D[(Database)]
  C --> E[Cache]
```

````markdown
```mermaid
flowchart LR
  A[Browser] --> B[Controller]
  B --> C[Service]
  C --> D[(Database)]
```
````

Drag to pan, use the toolbar's `−`/`+`/reset, <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>
+ scroll, or <kbd>+</kbd>/<kbd>-</kbd>/<kbd>0</kbd> once the diagram has
focus. The `</>` button reveals the raw diagram text to copy. A typo in
the diagram shows a themed error card instead of Mermaid's default
output. Mermaid itself loads from a CDN, and only on pages that actually
have a diagram, so most pages pay nothing for it.

## Diff view

One fenced ` ```diff ` block, switchable between three views: **Diff**
(colored +/− lines), **Before** (the file as it was), **After** (the
file as it is now). Paste raw `git diff` output straight in: the
`diff --git`/`index`/`---`/`+++`/`@@` boilerplate lines are recognized
and dropped from every view.

<div class="diff-view" data-diff-view>

```diff
 function clamp(value, min, max) {
-  if (value < min) return value;
+  if (value < min) return min;
   return value;
 }
```

</div>

````html
<div class="diff-view" data-diff-view>

```diff
 unchanged line
-old line
+new line
```

</div>
````

<kbd>←</kbd> <kbd>→</kbd> move between the three tabs once one has focus.
Optional: `data-labels="Before|Diff|After"` renames the buttons,
`data-default="before"` picks which view opens first (default `diff`).
Reach for **code compare** instead when you want two complete,
independently-written blocks side by side; diff view is for a single
small patch.

## Before/after slider

Two stacked images with a draggable divider, for a visual comparison
(a redesign, a chart before and after a fix) rather than text. Raw HTML,
not Markdown: write the two `<img>` tags directly, same as the layer
explorer.

<div class="before-after" data-before-after data-labels="Dense table|Compat matrix">
<img data-before src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='480' height='260'%3E%3Crect width='480' height='260' fill='%2344474f'/%3E%3Ctext x='50%25' y='46%25' fill='white' font-family='sans-serif' font-size='22' text-anchor='middle'%3EDense table%3C/text%3E%3Ctext x='50%25' y='62%25' fill='%23c9ccd4' font-family='sans-serif' font-size='14' text-anchor='middle'%3EPlain text status, no color%3C/text%3E%3C/svg%3E" alt="A plain table with text-only compatibility status, no color">
<img data-after src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='480' height='260'%3E%3Crect width='480' height='260' fill='%231a8fbf'/%3E%3Ctext x='50%25' y='46%25' fill='white' font-family='sans-serif' font-size='22' text-anchor='middle'%3ECompat matrix%3C/text%3E%3Ctext x='50%25' y='62%25' fill='%23d6eef7' font-family='sans-serif' font-size='14' text-anchor='middle'%3EColor-coded, clickable notes%3C/text%3E%3C/svg%3E" alt="The same data as a color-coded compatibility matrix with clickable notes">
</div>

```html
<div class="before-after" data-before-after data-labels="Before|After">
<img data-before src="old.png" alt="Old layout">
<img data-after src="new.png" alt="New layout">
</div>
```

Drag the handle, click anywhere on the image, or focus the handle and use
the arrow keys (<kbd>Home</kbd>/<kbd>End</kbd> jump to either end,
<kbd>Shift</kbd> moves by 10%). `data-labels="Before|After"` is optional.
Without JavaScript both images show full-size, stacked, each still
labeled by its `alt` text.

## Decision table

An ordinary Markdown table where some columns are conditions and the
rest is the outcome. Checkboxes appear above the table, one per
condition column; toggling them highlights the row(s) that match and
dims the rest.

<div class="decision-table" data-decision-table>

| Logged in | Admin role | Outcome |
|---|---|---|
| ✅ | ✅ | Full dashboard |
| ✅ | ❌ | Read-only dashboard |
| ❌ | — | Redirect to login |

</div>

```html
<div class="decision-table" data-decision-table>

| Logged in | Admin role | Outcome |
|---|---|---|
| ✅ | ✅ | Full dashboard |
| ✅ | ❌ | Read-only dashboard |
| ❌ | — | Redirect to login |

</div>
```

A column only becomes a toggle if every one of its body cells is a
recognized glyph: `✅`/`✓` (required), `❌`/`✗` (forbidden), `—`/`-`
(don't care, matches either toggle state). Any other column, like
"Outcome" here, is left exactly as written. Without JavaScript it's
still a plain, readable table.

## Parameter table

An ordinary Markdown table whose `Type` column uses a small type-syntax,
rendered as colored pills: a trailing `?` marks the whole cell optional,
`Name[]` marks a segment an array, and `A\|B` renders a union.

<div class="param-table" data-param-table>

| Name | Type | Description |
|---|---|---|
| `id` | `string` | The resource id. |
| `limit` | `number?` | Max results, default 20. |
| `tags` | `string[]?` | Filter results by tag. |
| `sort` | `"asc"\|"desc"?` | Sort order, default `"asc"`. |

</div>

```html
<div class="param-table" data-param-table>

| Name | Type | Description |
|---|---|---|
| `id` | `string` | The resource id. |
| `limit` | `number?` | Max results, default 20. |
| `tags` | `string[]?` | Filter results by tag. |

</div>
```

The column is matched by header text (`Type`, case-insensitive); known
primitive names (`string`, `number`, `boolean`, `object`, `array`,
`function`, `any`, `null`, `undefined`) get their own color, a custom
type name gets a neutral pill, and a quoted segment (`"asc"`) renders as
a literal. Without JavaScript the column is still plain, readable text.

## Compatibility matrix

An ordinary Markdown table whose status cells start with an emoji you'd
type anyway: ✅ full support, ⚠️ partial, ❌ none. No new markup: the
raw table reads correctly with no JS at all. Text after the emoji is an
optional note; cells that have one become clickable, showing the note
below the table.

<div class="compat-matrix" data-compat-matrix>

| Feature | Chrome | Safari | Firefox |
|---|---|---|---|
| WebGPU | ✅ | ⚠️ Behind a flag until v18 | ❌ |
| Container queries | ✅ | ✅ | ✅ Since Firefox 110 |
| View transitions | ✅ Since Chrome 111 | ❌ | ❌ Tracked in bug 1823896 |

</div>

```html
<div class="compat-matrix" data-compat-matrix>

| Feature | Chrome | Safari | Firefox |
|---|---|---|---|
| WebGPU | ✅ | ⚠️ Behind a flag until v18 | ❌ |

</div>
```

Recognized glyphs: `✅`/`✓` (full), `⚠️`/`🟡` (partial), `❌`/`✗` (none).
The first column and header row are never touched, and a cell with no
recognized leading emoji is left exactly as written.

## Timeline

A plain Markdown list becomes a vertical line of dated stops. Every
entry's text stays fully visible (nothing collapses); the interactivity
is orientation: click or arrow-key a dot to highlight it and scroll it
into view.

<div class="timeline" data-timeline data-title="This template's history">

- **2024-01** First working prototype: a single-file script, no tests.
- **2024-06** Rewritten as a proper CLI with a `node --test` suite.
- **2025-02** v1.0 released, with config file support.
- **2025-11** Plugin system added; three community plugins so far.

</div>

```html
<div class="timeline" data-timeline data-title="Project history">

- **2024-01** First working prototype.
- **2024-06** Rewritten as a proper CLI.

</div>
```

Each item's leading `**bold**` text is the stop's label; the rest is its
body, and can contain inline Markdown like `code` or links. `data-title`
is optional. <kbd>↑</kbd> <kbd>↓</kbd> <kbd>Home</kbd> <kbd>End</kbd> move
between stops once one has focus; "Oldest"/"Latest" jump to either end,
useful once the list is long.

## Reference tree

A nested Markdown list becomes a collapsible outline, good for a file
tree, the shape of an API response, a permissions hierarchy, anything
that's "what contains what." The top level starts open, deeper levels start
collapsed, so a big tree doesn't dump everything on the reader at once.

<div class="ref-tree" data-ref-tree>

- `src/`
  - `components/`
    - `Button.tsx`
    - `Modal.tsx`
  - `pages/`
    - `index.tsx`
- `package.json`
- `README.md`

</div>

```html
<div class="ref-tree" data-ref-tree>

- `src/`
  - `components/`
    - `Button.tsx`
- `package.json`

</div>
```

<kbd>&rarr;</kbd> expands a branch (or moves into its first child if
already open), <kbd>&larr;</kbd> collapses it (or moves to its parent if
already closed), <kbd>&uarr;</kbd> <kbd>&darr;</kbd> move between
whatever's currently visible. Leaf items (no children) are plain text,
no toggle. Optional `data-expanded` on the container starts every branch
open instead of just the top level. Without JavaScript it's still a
perfectly normal nested list.

## Copy as

Two or more fenced blocks that are **equivalent forms of the same
thing**: pick one, see just that one. Unlike code compare, these never
show side by side: showing the yarn command next to the pnpm command
helps no one, the reader just wants the one for their tool. The pick is
remembered for the whole book (not just this block), so choosing "yarn"
once opens every copy-as block on "yarn" from then on, on any page.

<div class="copy-as" data-copy-as data-labels="npm|yarn|pnpm">

```bash
npm install mdbook-template
```

```bash
yarn add mdbook-template
```

```bash
pnpm add mdbook-template
```

</div>

````html
<div class="copy-as" data-copy-as data-labels="npm|yarn|pnpm">

```bash
npm install mdbook-template
```

```bash
yarn add mdbook-template
```

```bash
pnpm add mdbook-template
```

</div>
````

`data-labels` is required (pipe-separated): unlike code compare, labels
can't be guessed from the language: three bash blocks would all just
say "Shell". <kbd>←</kbd> <kbd>→</kbd> move between pills once one has
focus. Optional `data-default="2"` (1-based) picks the starting pane
when the reader has no stored preference yet; defaults to the first.

## Branching scenario

A "what would you do?" prompt with 2-4 choices; each one reveals a result
and either the next prompt or an ending. A breadcrumb trail tracks the
path, and any earlier crumb is clickable to jump back and try a
different branch. Good for incident-response runbooks and "debug this"
exercises.

<div class="scenario" data-scenario data-start="alert-fires">

<div class="sc-node" data-node="alert-fires">
<p class="sc-prompt">A paging alert fires at 2am for high latency on checkout. What do you check first?</p>
<ul class="sc-choices">
<li data-goto="check-deploys">Recent deploys</li>
<li data-goto="check-db">Database load</li>
</ul>
</div>

<div class="sc-node" data-node="check-deploys">
<p class="sc-result">Good instinct. A deploy 20 minutes ago added a synchronous call to a slow endpoint.</p>
<p class="sc-prompt">Roll back, or hotfix forward?</p>
<ul class="sc-choices">
<li data-goto="end-rollback">Roll back</li>
<li data-goto="end-hotfix">Hotfix forward</li>
</ul>
</div>

<div class="sc-node" data-node="check-db" data-end>
<p class="sc-result">Database load is normal. You've burned 10 minutes; the real cause is still live.</p>
</div>

<div class="sc-node" data-node="end-rollback" data-end data-good>
<p class="sc-result">Rollback resolves it in 2 minutes. Low risk, fast recovery under uncertainty.</p>
</div>

<div class="sc-node" data-node="end-hotfix" data-end>
<p class="sc-result">The hotfix takes 25 minutes to write, review and ship while the alert stays open.</p>
</div>

</div>

```html
<div class="scenario" data-scenario data-start="first">

<div class="sc-node" data-node="first">
<p class="sc-prompt">The question?</p>
<ul class="sc-choices">
<li data-goto="good-end">Choice A</li>
<li data-goto="bad-end">Choice B</li>
</ul>
</div>

<div class="sc-node" data-node="good-end" data-end data-good>
<p class="sc-result">What happened, and why it was the right call.</p>
</div>

<div class="sc-node" data-node="bad-end" data-end>
<p class="sc-result">What happened instead.</p>
</div>

</div>
```

Nodes are a **flat list**, not nested. Each one is addressed by
`data-node` and reached through a choice's `data-goto`, so adding a new
branch never means re-indenting existing ones. A node with `data-end`
has no `.sc-choices` and shows "Start over" instead; add `data-good` to
celebrate that ending with a toast. Choices are picked by click or the
same letter keys (<kbd>A</kbd>, <kbd>B</kbd>, ...) the quiz widget uses.
Without JavaScript the nodes still read as plain prompts and choice
lists, just without the branching.

## Glossary term

Mark a word inline with `<dfn data-def="...">`, anywhere in prose, no
wrapper div needed. Hover or focus shows the definition in a small
popover; tap toggles it on touch. Only one popover is open at a time,
and <kbd>Esc</kbd> or a click elsewhere closes it.

A cache entry is **<dfn data-def="Calling it once or many times has the same effect on the server.">idempotent</dfn>** if repeating the request doesn't change the outcome, unlike, say, incrementing a counter, which is <dfn data-def="Each call changes the result: calling it twice is not the same as calling it once.">non-idempotent</dfn>. A <dfn data-def="A response saved so a later identical request can be answered without hitting the origin server again.">cache hit</dfn> skips all of that and just replies from the saved copy.

```html
A cache entry is <dfn data-def="Calling it once or many times has the same effect on the server.">idempotent</dfn> if repeating the request doesn't change the outcome.
```

Drop a `[data-glossary-index]` anywhere, typically a reference chapter,
to collect every `dfn` term already used **on that page**, deduplicated
and sorted:

<div data-glossary-index></div>

```html
<div data-glossary-index></div>
```

No cross-page magic and no build step: it only ever reads the current
page's `dfn` elements. Without JavaScript a `dfn` still reads fine,
browsers already italicize it by default, it just won't pop up a
definition on hover.

## Footnote popovers

Standard Markdown footnotes, shown in a hover/focus popover instead of
jumping to the bottom of the page. No new markup: mdBook already
renders `[^label]` as a clickable reference; this widget only changes
what clicking it does.

Here's a claim that could use a source[^footnote-demo].

[^footnote-demo]: This is the actual footnote definition at the bottom
of the page. Hovering or clicking the `1` above shows this text in a
popover instead of jumping down here.

```markdown
Here's a claim that could use a source[^footnote-demo].

[^footnote-demo]: This is the actual footnote definition.
```

Only one popover is open at a time; <kbd>Esc</kbd>, a click elsewhere,
or losing focus closes it. Without JavaScript it's a normal footnote
link that jumps to its definition.

## Mark this chapter done

One per chapter, usually at the end of the drill level. On pages with
level tabs it moves into the tabs bar so it is always in reach; here it
stays where it is written. It adds a ✓ in the sidebar, updates every
progress map, and celebrates.

<button type="button" data-mark-done>Mark this chapter done</button>

```html
<button type="button" data-mark-done>Mark this chapter done</button>
```

The button text is yours; `data-done-text` sets the text once done.

## Page feedback

A "Was this page helpful?" prompt, usually placed once at the end of a
chapter. A "No" reveals an optional comment box before submitting; either
way the vote is remembered so the question doesn't reappear.

<div class="page-feedback" data-page-feedback></div>

```html
<div class="page-feedback" data-page-feedback></div>
```

Optional `data-webhook="https://example.com/feedback"` POSTs
`{ slug, vote, comment }` as JSON on submit (fire-and-forget; the vote is
saved locally either way). Without a webhook the vote is still recorded
locally, just not sent anywhere, so wire one up to actually collect it.
