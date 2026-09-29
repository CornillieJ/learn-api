# Tips: .NET → Java / Spring

Collected from web searches; each source's status is marked. Every tip ends with a note on how it applies to this project.

Sources:

- [Spring Boot vs .NET Core: Complete Developer Migration Guide, DEV (Umesh Kushwaha)](https://dev.to/umesh_kushwaha_6655ba4c0d/spring-boot-vs-net-core-complete-developer-migration-guide-4mfk) ✅ (the DEV copy of a Medium article that returned 403)
- [Getting Started with Spring Boot 3 for .NET Developers, DEV (Bassem Hussein)](https://dev.to/bassem-hussein/getting-started-with-spring-boot-3-for-net-developers-5h46) ✅ (targets Boot 3 / Java 17+; concepts apply, versions differ from this project)
- [Transitioning from .NET to Spring, Medium (Integral)](https://medium.com/@Integral.io/transitioning-from-net-to-spring-8c5fef4e23d8) ⚠️ 403; search summary says it compares CLR vs JVM, notes Java has no delegates/function pointers, and JUnit vs MSTest/NUnit; concludes the move isn't as big as it feels
- [From Senior Front-End Developer to Java Novice, DEV](https://dev.to/griiettner/from-senior-front-end-developer-to-java-novice-my-journey-3e1g) ✅ (a JavaScript to Java story, not .NET; lessons transfer)

1. **Swap the toolchain first:** NuGet → Maven/Gradle, MSBuild → Maven/Gradle, Visual Studio → IntelliJ IDEA or Eclipse, Kestrel → Tomcat, ASP.NET Identity → Spring Security, explicit registration → annotations (`@Service`, `@Repository`, `@Autowired`). (Umesh article, all seven points.) → *This project:* it's Maven + IntelliJ (with the Lombok plugin) + Tomcat 9 + Spring Security 5.7; the two persistence styles (annotations and XML) both matter.

2. **Web/DB/config map (Spring Boot 3 article):** Spring Web is roughly ASP.NET Core REST, Spring Data JPA is roughly EF Core, `application.properties` is roughly `appsettings.json`, Spring DI is roughly the built-in container, Spring Initializr is roughly `dotnet new`. → *This project:* the web and config mappings hold; the EF-like layer is not Spring Data JPA, it's hand-written Hibernate DAOs (Knowledge File §8.3 to §8.4).

3. **Syntax is easy; the tooling and ecosystem are the real curve.** The front-end-to-Java author expected far more setup for IDEs, build tools and dependencies than in JS. → *This project:* budget your first hours for JDK, Maven, IDE and the parent-POM step, not for the language.

4. **Map, don't translate.** Keep a personal cheat-sheet from familiar operations to Java equivalents (the DEV author did this, and it accelerated learning). → *This project:* extend the rosetta table in Knowledge File §18 as you go.

5. **Java's `Optional`/lambdas replace delegates and `?.`/`??`.** (Integral summary via search; approximate.) → *This project:* look for `.map(...).orElse(...)` chains.

6. **Learn the JVM-world vocabulary early:** WAR, servlet container, classpath, `javax` vs `jakarta`, dependency scopes. → *This project:* the Tomcat 9 and `javax.*` pairing is the number one cause of "works locally, dies on deploy".

<div class="callout note">
<div class="callout-label">Quality note</div>
These are blog-level overviews; only points that the code itself confirms were used.
</div>
