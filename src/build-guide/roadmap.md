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
| 1 | The toolbox: JDK 17, Maven, Docker, IntelliJ | JDK versus runtime, `mise` for pinned versions | `~/bin/vwo-local-restart` |
| 2 | An empty Maven WAR project | Coordinates, the lifecycle, dependencies and scopes, `target/` | `pom.xml` |
| 3 | The application class | What Spring Boot auto-configures, `SpringBootServletInitializer`, component scanning | `restAPI/OpenApiApplication.java` |
| 4 | Running it on Tomcat 9 in Docker | Servlet containers, `webapps/`, how the WAR name becomes the context path, Tomcat logs | `Dockerfile` |
| 5 | A Hello world controller in Swagger | `DispatcherServlet`, `@RestController`, request mappings, Jackson, springdoc groups | `controllers/v1/V1Config.java`, `application.properties` |
| 6 | Build profiles per environment | Maven profiles and plugins, phases, how `environment.properties` is chosen at build time | `ant.xml`, `environmentAPI.*.properties` |

</div>

## Phase 2: a database behind it

<div class="table-wrap">

| # | You build | You learn | Compare with |
|---|---|---|---|
| 7 | A MariaDB container with the schema and seed data | Compose, init scripts, rebuilding from files | `~/Coding/vwo-local-db` |
| 8 | Hibernate wired in Spring XML | Beans, XML versus annotation config, `SessionFactory`, the c3p0 pool, transaction managers | `applicationContextAPI.xml`, `hibernate_VWO.cfg.xml` |
| 9 | The first entity: `Scholen` | JPA mapping, `Serializable`, Lombok, Jackson and Swagger annotations | `dbEntities/Scholen.java` |
| 10 | The DAO base classes and `ScholenDao` | Generics, `@Transactional` and its proxies, read-only versus read-write sessions, HQL | `dao/AbstractDao.java`, `dao/impl/VwoDaoImpl.java`, `dao/impl/ScholenDaoImpl.java` |
| 11 | `ScholenRepository` and `SchoolController` | Interfaces with default methods, constructor injection, `ResponseEntity`, `Optional` | `repositories/ScholenRepositoryImpl.java`, `controllers/SchoolController.java` |

</div>

## Phase 3: the contest

<div class="table-wrap">

| # | You build | You learn | Compare with |
|---|---|---|---|
| 12 | Persons and responsables | Composite keys with `@IdClass`, `equals`/`hashCode`, enums in entities and request parameters, HQL joins | `Functies.java`, `FunctiesDaoImpl.java`, `Configuration.java` |
| 13 | Registering a school for a year | The school year helper, `@RequestBody`, bean validation, writing in a read-write transaction | `WedstrijdinfoVwo.java`, `VwoParticipationController.java`, `General.java` |
| 14 | Enrolling pupils | `@MappedSuperclass`, request models, bulk inserts, counting with `GROUP BY` into `Object[]` rows | `LeerlingEersteRonde.java`, `VwoParticipant.java`, `LeerlingVWODaoImpl.java` |
| 15 | The answer key and the round dates | Composite keys again, `set` columns, query parameters with defaults | `Antwoorden.java`, `AnswerStringController.java`, `DatesController.java` |
| 16 | Scoring and selection | A repository method spanning several DAOs in one transaction, streams, a view mapped as an `@Immutable` entity | `LeerlingTweedeRondeFull.java`, `KangoeroePoolsTemporaryAnswersRepositoryImpl.java` |
| 17 | Archiving a year | History tables, native SQL next to HQL, choosing the query by year | `LeerlingVWODaoImpl.java` (`Historiek_*` queries) |

</div>

## Phase 4: the deeper parts

<div class="table-wrap">

| # | You build | You learn | Compare with |
|---|---|---|---|
| 18 | Error handling | `@RestControllerAdvice`, custom exceptions, status codes | `restAPI/ErrorAdvice.java` |
| 19 | API version 2 | A second versioned controller on the same interface, a second Swagger group | `controllers/v2/*`, `OpenApiApplication.java` |
| 20 | Authentication | `API_user`, login, JWT, the token filter, the security filter chain, roles, the bearer button in Swagger | `security/*`, `security/jwt/*` |
| 21 | Caching and logging | JCache with Ehcache, `@Cacheable`, the Hibernate second-level cache, Log4j2 and `@Slf4j` | `ehcache.xml`, `CacheController.java`, `log4j2.xml` |
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
next to the VWO API. The chapters in this book describe the steps; the
repository holds the result, with one commit per chapter.

</div>
