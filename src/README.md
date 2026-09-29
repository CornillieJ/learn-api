# Start Here

You already know how to build web APIs. You know DI, ORMs, middleware,
async, NuGet and `appsettings.json`. This guide doesn't teach you to
program again: it maps what you know in C#/.NET onto the Java stack that
runs `vwo-api`, then drills you on the real code until you can **trace
and safely change one endpoint end to end**.

<div class="callout setup">
<div class="callout-label">The stack you are learning</div>
Java 17 · Spring Framework 5.3.39 · Spring Boot 2.7.18 (a WAR on an
external Tomcat 9) · Hibernate 5.6.15 (<code>javax.*</code> era) ·
Spring Security 5.7 + JWT (jjwt 0.9) · Lombok · Maven.
Anything written for Boot 3+, Spring 6+ or Hibernate 6 uses
<code>jakarta.*</code> and will not match this code.
</div>

## Why this path works

- **Translation, not tutorial.** Every new concept is introduced next to
  the C# you would have written. Side-by-side code compares do most of
  the talking.
- **Real code from step one.** Every example is lifted from `vwo-api`:
  `SchoolController`, `ScholenDaoImpl`, `SecurityConfig`, `pom.xml`.
- **Gotchas up front.** The things that bite .NET developers (checked
  exceptions, `==` on strings, proxies that silently skip
  `@Transactional`, lazy loading after the session closes) are called
  out where they happen, not discovered in production.
- **You find out what stuck.** Quizzes, flashcards and self-checks at
  the end of every step tell you honestly whether you are ready to
  move on.

## Your progress

<div data-progress-map></div>

Progress lives in your browser only. Mark a step done at the bottom of
its **Drilling** level and it lights up here and in the sidebar.

## How each step is built

Every Step has three levels. Pick one with the tabs at the top of the
page; your choice follows you from chapter to chapter.

<div class="table-wrap">

| Level | What you get | Time |
|---|---|---|
| **Overview** | Why this step matters for `vwo-api`, what you can do afterwards, and one C# → Java compare | 5 min |
| **Deep Understanding** | Curated resources (with verification markers), mental-model shifts, and .NET gotchas | 1-4 h |
| **Drilling** | Tasks on the real repo, quizzes, flashcards, self-checks, then "Mark this step done" | 30-60 min |

</div>

The markers next to each resource are honest about what was checked:
✅ read and confirmed, 🔎 title/channel confirmed but content not
reviewed, ⚠️ could not be read.

## The widgets, in one line each

- **Code compare**: C# on one side, the Java you will meet on the other.
- **Quiz**: pick an answer; the explanation tells you *why*.
- **Flashcards**: click to flip. Great for the ten minutes before a
  stand-up.
- **Self-checks**: answer in your head, open to compare, then
  "Mark as known".
- **Checklists**: tick tasks off as you do them in the repo.

## The route

1. [Java syntax, fast](step-1-java-syntax.md): the 20% of Java that is
   different from C#.
2. [Maven](step-2-maven.md): the `csproj` + NuGet + MSBuild of this
   world, and the build profiles that pick the environment.
3. [Spring Core, MVC & WAR](step-3-spring-mvc-war.md): DI, controllers,
   proxies, and why there is no `dotnet run`.
4. [Hibernate & HQL](step-4-persistence-hibernate.md): `Session` instead
   of `DbContext`, HQL instead of LINQ.
5. [Spring Security](step-5-spring-security.md): the filter chain and the
   JWT filter.
6. [Lombok](step-6-lombok.md): where all the getters went.
7. [Ecosystem audio](step-7-ecosystem-audio.md): background listening
   for the eventual Boot 3 migration.

Then prove it in the [Final Challenge](final-challenge.md), and keep the
[Cheat Sheet](cheat-sheet.md) and [Flashcards](flashcards.md) open while
you work.

<div class="callout rule">
<div class="callout-label">Ready?</div>
Set your pace in <a href="how-to-use-this-guide.html">How to Use This Guide</a>
(two sliders, ten seconds), then
<strong><a href="step-1-java-syntax.html">start with Step 1</a></strong>.
</div>
