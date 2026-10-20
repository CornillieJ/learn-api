# Roadmap

Twenty-two chapters, in four phases. Each chapter builds one piece of
TechOlympiad, names the VWO file it copies, and ends with a call you can
make from the Swagger UI or a command you can run. Open the VWO file next
to yours while you work: comparing the two is half the learning.

Every chapter uses the same three tabs as the rest of this book:

- **Overview**: what we build and why the VWO API needs it.
- **Deep Understanding**: the Java, Spring, Maven or Tomcat concepts behind it.
- **Drilling**: the step-by-step build as a checklist, then a quiz and self-checks.

## Phase 1: a project that runs

<div class="table-wrap">

| # | You build | You learn | Compare with |
|---|---|---|---|
| 1 | The toolbox: JDK 17, Maven, Docker, IntelliJ | <dfn data-def="Java Development Kit: the Java runtime plus the compiler and other developer tools. The counterpart of the .NET SDK.">JDK</dfn> versus runtime, `mise` (a tool version manager) for pinned versions | `~/bin/vwo-local-restart` |
| 2 | An empty Maven WAR project | <dfn data-def="The groupId:artifactId:version triple that names a Maven library, like a NuGet package id plus version.">Coordinates</dfn>, the <dfn data-def="Maven's fixed sequence of build steps (compile, test, package, ...).">lifecycle</dfn>, dependencies and <dfn data-def="A dependency's scope says whether it is needed to compile, to test or at run time, and whether it is packaged.">scopes</dfn>, `target/` (Maven's output folder, like `bin/` and `obj/`) | `pom.xml` |
| 3 | The application class | What Spring Boot <dfn data-def="Spring Boot's habit of setting up beans for you based on the libraries it finds and your properties.">auto-configures</dfn>, `SpringBootServletInitializer`, <dfn data-def="Spring searching your packages for annotated classes and registering them in its dependency injection container.">component scanning</dfn> | `restAPI/OpenApiApplication.java` |
| 4 | Running it on Tomcat 9 in Docker | <dfn data-def="Java web servers that host web apps written against the Servlet API. Tomcat is one.">Servlet containers</dfn>, `webapps/`, how the WAR name becomes the <dfn data-def="The first part of the URL path that selects one app inside Tomcat, like an IIS virtual directory.">context path</dfn>, Tomcat logs | `Dockerfile` |
| 5 | A Hello world controller in Swagger | `DispatcherServlet` (Spring's single entry point that routes requests to controllers), `@RestController`, request mappings (routes), Jackson, springdoc groups | `controllers/v1/V1Config.java`, `application.properties` |
| 6 | Build profiles per environment | Maven profiles and <dfn data-def="Maven does no work itself: every build step (compiling, testing, zipping the WAR) is a goal of a plugin, like an MSBuild task.">plugins</dfn>, phases, how `environment.properties` is chosen at build time | `ant.xml`, `environmentAPI.*.properties` |

</div>

## Phase 2: a database behind it

<div class="table-wrap">

| # | You build | You learn | Compare with |
|---|---|---|---|
| 7 | A MariaDB container with the schema and seed data | Docker Compose, init scripts, rebuilding from files | `~/Coding/vwo-local-db` |
| 8 | Hibernate wired in Spring XML | <dfn data-def="Objects that Spring creates and manages in its dependency injection container, the counterpart of registered services in .NET.">Beans</dfn>, XML versus annotation config, `SessionFactory`, the <dfn data-def="An open-source JDBC connection pool library.">c3p0</dfn> pool, <dfn data-def="The Spring object that begins, commits and rolls back transactions on behalf of @Transactional methods.">transaction managers</dfn> | `applicationContextAPI.xml`, `hibernate_VWO.cfg.xml` |
| 9 | The first entity: `Scholen` | JPA mapping, `Serializable` (a marker interface that allows Java's built-in serialization), Lombok, Jackson and Swagger annotations | `dbEntities/Scholen.java` |
| 10 | The DAO base classes and `ScholenDao` | Generics, `@Transactional` and its <dfn data-def="Generated wrapper objects that Spring puts in front of a bean to add behaviour, such as starting a transaction, around each method call.">proxies</dfn>, read-only versus read-write sessions, HQL | `dao/AbstractDao.java`, `dao/impl/VwoDaoImpl.java`, `dao/impl/ScholenDaoImpl.java` |
| 11 | `ScholenRepository` and `SchoolController` | Interfaces with default methods, constructor injection, `ResponseEntity` (a response body plus status code and headers, like `ActionResult<T>`), `Optional` (a box that holds a value or nothing) | `repositories/ScholenRepositoryImpl.java`, `controllers/SchoolController.java` |

</div>

## Phase 3: the contest

<div class="table-wrap">

| # | You build | You learn | Compare with |
|---|---|---|---|
| 12 | Persons and responsables | Composite keys with `@IdClass`, `equals`/`hashCode`, enums in entities and request parameters, HQL joins | `Functies.java`, `FunctiesDaoImpl.java`, `Configuration.java` |
| 13 | Registering a school for a year | The school year helper, `@RequestBody`, <dfn data-def="The Java standard for validation annotations such as @NotNull and @Size, like C#'s DataAnnotations.">bean validation</dfn>, writing in a read-write transaction | `WedstrijdinfoVwo.java`, `VwoParticipationController.java`, `General.java` |
| 14 | Enrolling pupils | `@MappedSuperclass` (a JPA base class whose mapped fields are inherited by entities), request models, bulk inserts, counting with `GROUP BY` into `Object[]` rows | `LeerlingEersteRonde.java`, `VwoParticipant.java`, `LeerlingVWODaoImpl.java` |
| 15 | The answer key and the round dates | Composite keys again, `set` columns, query parameters with defaults | `Antwoorden.java`, `AnswerStringController.java`, `DatesController.java` |
| 16 | Scoring and selection | A repository method spanning several DAOs in one transaction, <dfn data-def="Java's java.util.stream API for filtering, mapping and grouping collections, the counterpart of LINQ to Objects.">streams</dfn>, a view mapped as an `@Immutable` entity | `LeerlingTweedeRondeFull.java`, `KangoeroePoolsTemporaryAnswersRepositoryImpl.java` |
| 17 | Archiving a year | History tables, <dfn data-def="Plain SQL against tables and columns, sent through Hibernate, as opposed to HQL against entities.">native SQL</dfn> next to HQL, choosing the query by year | `LeerlingVWODaoImpl.java` (`Historiek_*` queries) |

</div>

## Phase 4: the deeper parts

<div class="table-wrap">

| # | You build | You learn | Compare with |
|---|---|---|---|
| 18 | Error handling | `@RestControllerAdvice` (one class that turns exceptions from every controller into responses, like an exception filter), custom exceptions, status codes | `restAPI/ErrorAdvice.java` |
| 19 | API version 2 | A second versioned controller on the same interface, a second Swagger group | `controllers/v2/*`, `OpenApiApplication.java` |
| 20 | Authentication | `API_user`, login, JWT, the token filter, the security filter chain, roles, the bearer button in Swagger | `security/*`, `security/jwt/*` |
| 21 | Caching and logging | <dfn data-def="JSR-107, the standard Java caching API, javax.cache.">JCache</dfn> with Ehcache (a cache library that implements it), `@Cacheable`, the Hibernate <dfn data-def="A cache of entities shared by all Hibernate sessions, so a row read once need not be fetched again.">second-level cache</dfn>, Log4j2 (a logging library) and `@Slf4j` (Lombok's annotation that adds a logger field) | `ehcache.xml`, `CacheController.java`, `log4j2.xml` |
| 22 | Building and shipping | The Docker image, the GitLab pipeline, versioning and releases | `.gitlab-ci.yml`, `.releaserc.json` |

</div>

## How long will this take?

A rough estimate per phase, assuming you type everything yourself and read
the VWO files alongside.

<div class="pace-chooser" data-pace-chooser data-max-hours="15" data-max-weeks="16" data-default-hours="4" data-default-weeks="8">
<ul class="pc-tasks">
<li data-hours="8" data-short="Phase 1">Phase 1: a project that runs</li>
<li data-hours="8" data-short="Phase 2">Phase 2: a database behind it</li>
<li data-hours="12" data-short="Phase 3">Phase 3: the contest</li>
<li data-hours="10" data-short="Phase 4">Phase 4: the deeper parts</li>
</ul>
</div>

<div class="callout note">
<div class="callout-label">Where the code lives</div>

TechOlympiad gets its own folder and repository, `~/Coding/techolympiad`,
next to the VWO API. The chapters in this book describe the steps. The
repository holds the result, with one commit per chapter.

</div>
