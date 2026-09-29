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

Every step below mixes video/audio with written articles (📖) and ends
with a **Project exercise** on the real code. Each Step chapter has three
levels; pick one with the tabs at the top of the page, and your choice is
remembered as you move between chapters:

- **Overview**: one paragraph on what the step is and why it matters here.
- **Deep Understanding**: the full resource list, with each source's
  verification status and how it maps onto this codebase.
- **Drilling**: the hands-on project exercise, turned into a checklist,
  plus a self-check question.

## How much time will this take?

Drag the sliders. The plan below is a heuristic built from the guide's
own suggested pacing (steps 1-2 in a weekend, step 3 over a week, then
4-6 alongside real reading of the repo), not a rule.

<div class="pace-chooser" data-pace-chooser>
  <div class="pc-row"><label for="pcHours">Hours per week</label><input type="range" id="pcHours" min="1" max="15" value="4"><output></output></div>
  <div class="pc-row"><label for="pcWeeks">Weeks available</label><input type="range" id="pcWeeks" min="1" max="12" value="4"><output></output></div>
  <div class="pc-result" aria-live="polite"></div>
</div>

Step 7 (ecosystem podcasts) is deliberately left out of the plan above:
it's background listening, not a scheduled block.
