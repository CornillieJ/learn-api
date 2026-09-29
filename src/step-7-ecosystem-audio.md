# Step 7: Keeping Your Ear on the Ecosystem (Audio)

<div class="level-tabs" data-levels>
  <button data-level="overview" aria-pressed="true">Overview</button>
  <button data-level="deep">Deep Understanding</button>
  <button data-level="drill">Drilling</button>
</div>

<div class="level overview">

This step is background listening, not a how-to for today's code. The
Spring world has moved on to Boot 3/4 and Spring 6/7 while `vwo-api`
sits on Boot 2.7 and Spring 5.3. Podcasts are the cheapest way to learn
the vocabulary of that gap, so that when someone says "we need the
jakarta migration" you know exactly which files in this repo it touches.
Think of it as the .NET Framework → .NET Core conversation, Java edition.

**After this step you can:**

- name the four big changes a Boot 3 migration would force on this repo;
- follow a Spring podcast episode without getting lost in the terminology;
- tell at a glance whether a tutorial is written for this codebase's generation.

</div>

<div class="level deep">

### 7.1 Spring Office Hours (podcast)

[https://springofficehours.io/](https://springofficehours.io/)
✅ weekly deep dive on Spring Framework/Boot, hosted by Dan Vega and
DaShaun Carter, with new episodes on Mondays; 140+ episodes averaging
about an hour, available on Apple Podcasts, Spotify, YouTube, and
Amazon Music.

Current episodes cover Boot 4/Spring 7, newer than this project's
Boot 2.7/Spring 5.3, which is exactly why it's useful: listen for
migration talk, since this codebase will eventually need Boot 3+
(`javax` to `jakarta`, removing `WebSecurityConfigurerAdapter` in
`security/SecurityConfig.java`, Hibernate 6).

### 7.2 Top 12 Podcasts for Java Developers in 2024 (JetBrains blog)

[https://blog.jetbrains.com/idea/2024/09/top-12-podcasts-for-java-developers-in-2024/](https://blog.jetbrains.com/idea/2024/09/top-12-podcasts-for-java-developers-in-2024/)
✅ lists Duke's Corner, *A Bootiful Podcast* (Spring interviews),
Foojay, Java Off-Heap, Spring Office Hours, *airhacks.fm* ("enterprise
software, cloud technologies, and Java"), Java Pub House, and others.

*A Bootiful Podcast* and *airhacks.fm* are singled out here because
they discuss enterprise-Java thinking, servlet containers, layered
DAO/service architecture, connection pooling, and caching: the exact
traits of this project. Hearing practitioners explain them tells you
why the codebase looks the way it does.

### 7.3 What a Boot 3 migration would touch in this repo

<div class="table-wrap">

| Change | Why | Where in `vwo-api` |
|---|---|---|
| `javax.*` → `jakarta.*` | Jakarta EE 9 renamed the packages; Boot 3 / Spring 6 require it | every `@Entity` import, servlet and validation imports |
| Tomcat 9 → a Jakarta-era Tomcat (Boot 3 is built against 10.1) | Tomcat 9 implements `javax.servlet` | `Dockerfile`, the target servers |
| `WebSecurityConfigurerAdapter` removed, `antMatchers` gone | Spring Security 6 uses `SecurityFilterChain` beans and `requestMatchers` | `security/SecurityConfig.java` |
| Hibernate 5.6 → 6.x | new query engine, stricter HQL, changed APIs | `dao/impl/**`, `hibernate_VWO.cfg.xml` |
| Java 17 baseline | Boot 3 requires Java 17+ | already met |

</div>

<div class="callout note">
<div class="callout-label">Spot the generation of a tutorial in 5 seconds</div>
<code>import jakarta.persistence</code>, <code>SecurityFilterChain</code>
beans, <code>requestMatchers(...)</code> or Hibernate 6 mean Boot 3+.
<code>import javax.persistence</code>, <code>extends
WebSecurityConfigurerAdapter</code> and <code>antMatchers(...)</code> mean
the same generation as this repo.
</div>

</div>

<div class="level drill">

### Tasks

<ul class="checklist">
<li><label><input type="checkbox"><span>Listen to one Spring Office Hours or A Bootiful Podcast episode and write one unfamiliar term you heard into the Knowledge File.</span></label></li>
<li><label><input type="checkbox"><span>Count the files in the repo that import <code>javax.</code>: that's the minimum size of the jakarta migration.</span></label></li>
<li><label><input type="checkbox"><span>Pick any Spring Security tutorial you've used so far and classify it as "this repo's generation" or "Boot 3+" using the callout above.</span></label></li>
</ul>

### Quiz

<div class="quiz" data-quiz>
<p class="quiz-q">The repo is upgraded to Spring Boot 3 and still deployed as a WAR. What has to change on the servers?</p>
<ol class="quiz-options">
<li>Nothing; Tomcat 9 runs Boot 3 WARs</li>
<li data-correct>They need a Jakarta-era Tomcat (10.1, which Boot 3 is built against), because Boot 3 code uses <code>jakarta.servlet</code> and Tomcat 9 only provides <code>javax.servlet</code></li>
<li>They must stop using Tomcat, since Boot 3 only runs as an executable jar</li>
<li>They must upgrade to Java 21</li>
</ol>
<p class="quiz-explain">The framework upgrade and the container move together. WAR deployment is still supported in Boot 3, and Java 17 is still enough.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">A tutorial's security config declares <code>@Bean SecurityFilterChain filterChain(HttpSecurity http)</code> and uses <code>requestMatchers(...)</code>. What does that tell you?</p>
<ol class="quiz-options">
<li>It is written for Spring Security 4</li>
<li data-correct>It uses the component-based style that replaces <code>WebSecurityConfigurerAdapter</code>, typical of Spring Security 6 / Boot 3</li>
<li>It will compile unchanged against <code>SecurityConfig.java</code></li>
<li>It is for Spring WebFlux only</li>
</ol>
<p class="quiz-explain">The adapter was deprecated in 5.7 and removed in 6. Concepts carry over; code needs adapting to this repo's adapter style.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">Which Java version requirement of Spring Boot 3 does <code>vwo-api</code> already meet?</p>
<ol class="quiz-options">
<li>Java 8</li>
<li>Java 11</li>
<li data-correct>Java 17</li>
<li>Java 21</li>
</ol>
<p class="quiz-explain">Boot 3 requires Java 17 or newer, and the repo already targets Java 17.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">The closest .NET analogy to the <code>javax</code> → <code>jakarta</code> move is:</p>
<ol class="quiz-options">
<li>Upgrading a NuGet package by one minor version</li>
<li data-correct>A namespace-level break across the platform, like moving from <code>System.Web</code> (.NET Framework) to ASP.NET Core</li>
<li>Switching from <code>Newtonsoft.Json</code> to <code>System.Text.Json</code> in one class</li>
<li>Changing the target framework moniker with no code changes</li>
</ol>
<p class="quiz-explain">It touches imports everywhere and forces the libraries and the server to move with it. Mechanical, but project-wide.</p>
</div>

### Self-checks

<details class="qa">
<summary>Self-check: name the four areas of this repo a Boot 3 migration would force you to change.</summary>
<div class="ans">
<code>javax.*</code> imports (to <code>jakarta.*</code>); the servlet container
(Tomcat 9 to a Jakarta-era Tomcat); <code>security/SecurityConfig.java</code>
(no more <code>WebSecurityConfigurerAdapter</code>/<code>antMatchers</code>);
and the Hibernate layer (5.6 to 6.x: DAOs, HQL, config).
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<details class="qa">
<summary>Self-check: why is a Boot 4 podcast useful for a Boot 2.7 codebase?</summary>
<div class="ans">
Because the gap is the work ahead. Hearing practitioners talk about the
jakarta move, the security DSL and Hibernate 6 gives you the vocabulary
and the pitfalls before you face the migration, and explains why this
code looks old-fashioned in places.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<button type="button" data-mark-done>Mark this step done</button>

</div>
