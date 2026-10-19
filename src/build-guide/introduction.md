# Build Guide: TechOlympiad

The chapters before this one are about reading. This section is about
building. Step by step, we create **TechOlympiad**, a small REST API for an
imaginary programming contest, from an empty folder. It uses the same
stack, the same layers and the same naming conventions as the VWO API
(`~/Coding/api`), and its domain is the VWO Olympiad shrunk down: schools
register for a contest year, each school has responsables, pupils take part
in rounds, they submit answers, and those answers are scored.

The aim is that by the end you have built every kind of file the VWO API
has, at least once, by hand. Then any file in the real API is familiar: you
know where it sits in the flow, why it looks the way it does, and which
part of Java, Spring, Maven or Tomcat makes it work.

<div class="callout rule">
<div class="callout-label">The one rule</div>

Copy how the VWO API does things, even where a fresh Spring Boot tutorial
would do it differently. Where TechOlympiad deviates, it is on purpose and
written down.

</div>

## The stack we are copying

<div class="table-wrap">

| Piece | What the VWO API uses |
|---|---|
| Language | Java 17 |
| Build | Maven, packaged as a <dfn data-def="Web application archive: a zip with your classes and libraries that a servlet container such as Tomcat deploys.">WAR</dfn>, with build profiles per environment |
| Framework | Spring Boot 2.7 on Spring 5.3, deployed to an external Tomcat 9 |
| API docs | springdoc OpenAPI with the Swagger UI, grouped per API version |
| Database | MariaDB, through two Hibernate 5 session factories (read-only and read-write) set up in Spring XML |
| Queries | <dfn data-def="Hibernate Query Language: SQL-like, but written against entity classes and their fields instead of tables and columns.">HQL</dfn> in DAO classes |
| Boilerplate | Lombok |
| Security | A token filter in front of the API, with users and roles in the database |

</div>

## How a request flows

This is the shape every endpoint in the VWO API follows, and the shape
everything in TechOlympiad will follow. Click a layer, or trace a request
through it.

<div class="layer-explorer" data-layer-explorer data-entry="HTTP request" data-exit="MariaDB" data-return="The entity comes back up and Jackson turns it into JSON.">
<div class="layer" data-name="Controller" data-tag="interface + versioned class" data-trace="The versioned controller (`/api/v1/...`) receives the request; its default method in the shared controller interface handles it.">
<p>Two parts: a shared interface (for example <code>SchoolController</code>) holding the endpoints as default methods with their Swagger annotations, and a small <code>@RestController</code> per API version that sets the URL and supplies the repository.</p>
</div>
<div class="layer" data-name="Repository" data-tag="what the API needs" data-trace="The controller asks the repository, for example `getByVwoResponsible(userId)`.">
<p>An interface describing what the API needs, plus an implementation that delegates to one or more DAOs. This is the seam between the web side and the database side.</p>
</div>
<div class="layer" data-name="DAO" data-tag="HQL + transactions" data-trace="The DAO opens the read-only session and runs an HQL query with named parameters.">
<p>The <dfn data-def="Data Access Object: the class that knows how to fetch and store one kind of entity.">DAO</dfn> holds the queries. It extends a generic base class for the common operations and picks the read-only or read-write session factory per method through <code>@Transactional</code>.</p>
</div>
<div class="layer" data-name="Entity" data-tag="table mapping" data-trace="Hibernate maps the result rows onto entity objects.">
<p>A plain class mapped onto a table with JPA annotations, which also carries the Jackson and Swagger annotations that shape the JSON. The Dutch table and column names stay; the JSON names are English.</p>
</div>
</div>

## The plan

First we [design](design.md) TechOlympiad: which VWO tables it copies,
what they are called and where we deviate. Then the [roadmap](roadmap.md)
builds it in four phases, each ending with something you can call from the
Swagger UI:

1. **A project that runs.** A Maven WAR project with the VWO package
   layout, run on Tomcat the way the VWO API runs locally, with a Hello
   world controller in Swagger.
2. **A database behind it.** A MariaDB container, Hibernate wired up the
   way the VWO API wires it, and a first endpoint that returns schools.
3. **The contest.** Responsables, registrations, pupils, rounds, answers
   and scoring, each going through the full flow above: entity, DAO with
   HQL, repository, controller interface, versioned controller.
4. **The deeper parts.** Error handling, API versioning, authentication,
   caching, logging and shipping.
