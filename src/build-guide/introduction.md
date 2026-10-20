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
part of Java, <dfn data-def="The Spring Framework: Java's most used application framework, with dependency injection, a web layer (Spring MVC) and transaction handling. Roughly ASP.NET Core plus its dependency injection container.">Spring</dfn>, <dfn data-def="Java's build tool and package manager in one: it compiles the code, downloads the libraries it needs and packages the result. Roughly MSBuild plus NuGet.">Maven</dfn> or <dfn data-def="Apache Tomcat: a Java web server that hosts one or more WAR files, the way IIS hosts ASP.NET apps. Java calls such a server a servlet container, after the Servlet API that Java web apps are written against.">Tomcat</dfn> makes it work.

<div class="callout rule">
<div class="callout-label">The one rule</div>

Copy how the VWO API does things, even where a fresh <dfn data-def="A layer on top of the Spring Framework that configures it for you from sensible defaults and from the libraries it finds, so you write far less setup code.">Spring Boot</dfn> tutorial
would do it differently. Where TechOlympiad deviates, it is on purpose and
written down.

</div>

## The stack we are copying

<div class="table-wrap">

| Piece | What the VWO API uses |
|---|---|
| Language | Java 17 |
| Build | Maven, packaged as a <dfn data-def="Web application archive: one zip file with your compiled classes and libraries, which a Java web server such as Tomcat deploys. Roughly a published ASP.NET app folder in a single file.">WAR</dfn>, with <dfn data-def="Named sets of build settings in the pom.xml, switched on with -P on the command line, here one per environment. Roughly a build configuration in .NET.">build profiles</dfn> per environment |
| Framework | Spring Boot 2.7 on Spring 5.3, deployed to an external Tomcat 9 |
| API docs | <dfn data-def="springdoc-openapi: a library that builds an OpenAPI (Swagger) description from your Spring controllers and serves the Swagger UI. The Java counterpart of Swashbuckle.">springdoc</dfn> OpenAPI with the Swagger UI, grouped per API version |
| Database | <dfn data-def="An open-source database that started as a fork of MySQL and still speaks the same protocol and SQL dialect.">MariaDB</dfn>, through two <dfn data-def="Java's best-known ORM (object-relational mapper): it maps classes onto tables and turns reads and changes of those objects into SQL. The counterpart of EF Core or NHibernate.">Hibernate</dfn> 5 <dfn data-def="Hibernate's long-lived object that holds the mappings and the database settings and opens sessions. A session is one unit of work with the database, roughly one DbContext instance, so a session factory is close to a configured DbContext factory.">session factories</dfn> (read-only and read-write) set up in <dfn data-def="Spring configuration written as XML files that declare objects and their settings, the older alternative to configuring Spring in Java code.">Spring XML</dfn> |
| Queries | <dfn data-def="Hibernate Query Language: SQL-like, but written against entity classes (classes mapped onto tables) and their fields instead of tables and columns.">HQL</dfn> in <dfn data-def="Data Access Object: the class that knows how to fetch and store one kind of entity.">DAO</dfn> classes |
| Boilerplate | <dfn data-def="A library that runs inside the Java compiler and writes getters, setters, constructors and similar boilerplate for you, driven by annotations on your class. A bit like a C# source generator.">Lombok</dfn> |
| Security | A token <dfn data-def="A servlet filter: code that runs before (and after) every request reaches the application, and can stop it. The counterpart of ASP.NET Core middleware.">filter</dfn> in front of the API, with users and roles in the database |

</div>

If you come from .NET, three of these map almost one to one: JPA is a
standard API for ORMs, close to the style of EF Core's `DbContext` API,
and Hibernate is the library that implements it; Spring plays the role of
ASP.NET Core and its dependency injection; Maven is MSBuild and NuGet in
one tool.

## How a request flows

This is the shape every endpoint in the VWO API follows, and the shape
everything in TechOlympiad will follow. Click a layer, or trace a request
through it.

<div class="layer-explorer" data-layer-explorer data-entry="HTTP request" data-exit="MariaDB" data-return="The entity comes back up and Jackson turns it into JSON.">
<div class="layer" data-name="Controller" data-tag="interface + versioned class" data-trace="The versioned controller (`/api/v1/...`) receives the request; its default method in the shared controller interface handles it.">
<p>Two parts: a shared interface (for example <code>SchoolController</code>) holding the endpoints as <dfn data-def="Interface methods that have a body, so every implementing class gets them for free. C# has the same feature under the name default interface methods.">default methods</dfn> with their Swagger <dfn data-def="Metadata in the form @Name(...) placed on a class, method, field or parameter, which frameworks read at compile time or run time. The Java counterpart of a C# attribute.">annotations</dfn>, and a small <code>@RestController</code> per API version that sets the URL and supplies the repository. <code>@RestController</code> marks a class as a web controller whose return values are written straight into the response body, like <code>[ApiController]</code> on a <code>ControllerBase</code>.</p>
</div>
<div class="layer" data-name="Repository" data-tag="what the API needs" data-trace="The controller asks the repository, for example `getByVwoResponsible(userId)`.">
<p>An interface describing what the API needs, plus an implementation that delegates to one or more DAOs. This is the seam between the web side and the database side.</p>
</div>
<div class="layer" data-name="DAO" data-tag="HQL + transactions" data-trace="The DAO opens the read-only session and runs an HQL query with named parameters.">
<p>The <dfn data-def="Data Access Object: the class that knows how to fetch and store one kind of entity.">DAO</dfn> holds the queries. It extends a generic base class for the common operations and picks the read-only or read-write session factory per method through <code>@Transactional</code>, the Spring annotation that runs a method inside a database transaction.</p>
</div>
<div class="layer" data-name="Entity" data-tag="table mapping" data-trace="Hibernate maps the result rows onto entity objects.">
<p>An <dfn data-def="A class mapped onto a database table, one object per row. The same idea as an entity in EF Core.">entity</dfn> is a plain class mapped onto a table with <dfn data-def="Java Persistence API: the standard set of ORM annotations and interfaces (@Entity, @Table, @Column, EntityManager) in the javax.persistence package. It only describes the mapping; Hibernate is the library that implements it.">JPA</dfn> annotations, which also carries the <dfn data-def="Java's standard JSON library, which turns objects into JSON and back. The counterpart of System.Text.Json or Newtonsoft.Json.">Jackson</dfn> and Swagger annotations that shape the JSON. The Dutch table and column names stay; the JSON names are English.</p>
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
