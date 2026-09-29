# Tips: .NET → Java / Spring

Six habits that shorten the switch. Each ends with **Do this**, a
concrete action in `vwo-api`. For the full equivalents table see the
[Cheat Sheet](cheat-sheet.md).

1. **Swap the toolchain first.** NuGet → Maven, MSBuild → Maven, Visual
   Studio → IntelliJ IDEA, Kestrel → Tomcat, ASP.NET Identity → Spring
   Security, explicit registration → annotations (`@Service`,
   `@Repository`, `@Autowired`). (Umesh article.)
   **Do this:** install JDK, Maven and IntelliJ *with the Lombok plugin*
   before reading any code, and get one `-P gitlab-dev` build green.

2. **Know which mappings hold and which don't.** Spring Web ≈ ASP.NET Core
   REST, `application.properties` ≈ `appsettings.json`, Spring DI ≈ the
   built-in container. (Boot 3 article.) But the EF-like layer here is
   *not* Spring Data JPA: it's hand-written Hibernate DAOs (Knowledge File
   §8.3 to §8.4), and the environment is chosen at build time.
   **Do this:** ignore any tutorial that starts with `JpaRepository`.

3. **The language is easy; the ecosystem is the curve.** The front-end-to-Java
   author expected far more setup for IDEs, build tools and dependencies
   than for the language itself.
   **Do this:** budget your first hours for JDK, Maven, IDE and the
   parent-POM step (Step 2), not for syntax.

4. **Map, don't translate.** Keep a personal table from familiar
   operations to Java equivalents; the DEV author credits this for
   learning fast.
   **Do this:** extend the rosetta table in Knowledge File §18 every time
   you look something up, and drill the [Flashcards](flashcards.md).

5. **Unlearn four C# reflexes.** `==` on objects, ignoring exceptions
   (Java has checked ones), `typeof(T)` (erased), and "methods aren't
   virtual unless I say so". (`Optional`/lambdas replacing `?.`/`??` and
   delegates is from the Integral summary via search; approximate.)
   **Do this:** grep the repo for `==` between boxed ids or strings;
   look for `.map(...).orElse(...)` chains.

6. **Learn the JVM-world vocabulary early:** WAR, servlet container,
   classpath, `javax` vs `jakarta`, dependency scopes, proxy.
   **Do this:** before trusting any resource, check it imports `javax.*`.
   The Tomcat 9 + `javax.*` pairing is the number one cause of "works
   locally, dies on deploy".

## Sources

- [Spring Boot vs .NET Core: Complete Developer Migration Guide, DEV (Umesh Kushwaha)](https://dev.to/umesh_kushwaha_6655ba4c0d/spring-boot-vs-net-core-complete-developer-migration-guide-4mfk) ✅ (the DEV copy of a Medium article that returned 403)
- [Getting Started with Spring Boot 3 for .NET Developers, DEV (Bassem Hussein)](https://dev.to/bassem-hussein/getting-started-with-spring-boot-3-for-net-developers-5h46) ✅ (targets Boot 3 / Java 17+; concepts apply, versions differ from this project)
- [Transitioning from .NET to Spring, Medium (Integral)](https://medium.com/@Integral.io/transitioning-from-net-to-spring-8c5fef4e23d8) ⚠️ 403; search summary says it compares CLR vs JVM, notes Java has no delegates/function pointers, and JUnit vs MSTest/NUnit; concludes the move isn't as big as it feels
- [From Senior Front-End Developer to Java Novice, DEV](https://dev.to/griiettner/from-senior-front-end-developer-to-java-novice-my-journey-3e1g) ✅ (a JavaScript to Java story, not .NET; lessons transfer)

<div class="callout note">
<div class="callout-label">Quality note</div>
These are blog-level overviews; only points that the code itself confirms were used.
</div>
