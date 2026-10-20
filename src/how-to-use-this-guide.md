# How to Use This Guide

This is a companion to the VWO API's Knowledge File. That page explains
*what the project is*; this one tells you *what to learn, in what order,
and why it matters for this exact codebase* (`~/Coding/vwo-api`).

<div class="callout note">
<div class="callout-label">Stack, exactly</div>
Java 17 + Spring Framework 5.3.39 + Spring Boot 2.7.18 (WAR on Tomcat 9) +
Hibernate 5.6.15. Prefer resources from the Boot 2.x / <code>javax.*</code>
era. Material for Boot 3/4 teaches <code>jakarta.*</code>, Spring 6/7 and
Hibernate 6, which will not match this code.
</div>

Every step mixes video/audio with written articles (📖) and ends with
work on the real code. Each Step chapter has three levels. Pick one with
the tabs at the top of the page. The guide remembers your choice when you
move between chapters:

- **Overview**: why the step matters here, what you can do afterwards,
  and a side-by-side C# → Java compare.
- **Deep Understanding**: the resources with their verification status,
  how each maps onto this codebase, and the mental-model shifts and
  gotchas that trip .NET developers.
- **Drilling**: tasks on the repo, quizzes, a small flashcard deck and
  self-checks. Finish with **Mark this step done**.

<div class="callout rule">
<div class="callout-label">A loop that works</div>

1. Read the **Overview** and say out loud what you expect to be different from .NET.
2. Work through **Deep Understanding** with the repo open next to it.
3. Do the **Drilling** tasks in the repo, then the quizzes *without* scrolling back up.
4. Write anything you got wrong on a sticky note. Re-test it tomorrow with the [Flashcards](flashcards.md).

</div>

## How much time will this take?

Drag the sliders. The plan below is a heuristic built from the guide's
own suggested pacing (steps 1-2 in a weekend, step 3 over a week, then
4-6 alongside real reading of the repo), not a rule.

<div class="pace-chooser" data-pace-chooser data-max-hours="15" data-max-weeks="12" data-default-hours="4" data-default-weeks="4">
<ul class="pc-tasks">
<li data-hours="6" data-short="Steps 1-2">Steps 1-2: Java syntax + Maven</li>
<li data-hours="8" data-short="Step 3">Step 3: Spring core, MVC, WAR</li>
<li data-hours="6" data-short="Step 4">Step 4: Persistence (Hibernate &amp; HQL)</li>
<li data-hours="3" data-short="Step 5">Step 5: Spring Security</li>
<li data-hours="2" data-short="Step 6">Step 6: Lombok</li>
</ul>
</div>

The plan above leaves out Step 7 (ecosystem podcasts) on purpose. It is
background listening, so it needs no scheduled block.
