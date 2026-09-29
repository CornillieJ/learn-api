# Step 7: Keeping Your Ear on the Ecosystem (Audio)

<div class="level-tabs" data-levels>
  <button data-level="overview" aria-pressed="true">Overview</button>
  <button data-level="deep">Deep Understanding</button>
  <button data-level="drill">Drilling</button>
</div>

<div class="level overview">

This step is background listening, not a how-to for today's code. It
tells you where the Spring ecosystem is headed, so migration talk
about Boot 3+/Spring 7 makes sense in context when this codebase
eventually needs to move.

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

</div>

<div class="level drill">

<ul class="checklist">
<li><label><input type="checkbox"><span>Listen to one Spring Office Hours or A Bootiful Podcast episode and write one unfamiliar term you heard into the Knowledge File.</span></label></li>
</ul>

<button type="button" data-mark-done>Mark this step done</button>

</div>
