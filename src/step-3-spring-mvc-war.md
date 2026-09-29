# Step 3: Spring Core, MVC & WAR Deployment

<div class="level-tabs" data-levels>
  <button data-level="overview" aria-pressed="true">Overview</button>
  <button data-level="deep">Deep Understanding</button>
  <button data-level="drill">Drilling</button>
</div>

<div class="level overview">

This is the step where `vwo-api` stops looking like magic. Every object
in the API is a Spring **bean**: created, wired and wrapped by the
container, like services registered in `Program.cs`, except found by
scanning annotations. Two things differ sharply from ASP.NET Core:
beans are **singletons by default** (there is no per-request "scoped"
`DbContext`-style lifetime doing the work for you), and the app runs as
a **WAR inside an external Tomcat 9**, not `dotnet run` and not a
self-hosted jar.

**After this step you can:**

- name the bean at every hop of `GET /api/v2/school/{id}`;
- map every ASP.NET Core MVC attribute to its Spring annotation;
- explain why calling a `@Transactional` method on `this` silently does nothing;
- work out the real URL of an endpoint from the WAR file name.

<div class="code-compare" data-code-compare>

```csharp
// Program.cs + a controller
builder.Services.AddScoped<IScholenRepository, ScholenRepository>();

[ApiController, Route("api/v2/school")]
public class SchoolController(IScholenRepository repository) : ControllerBase
{
    [HttpGet("{id}")]
    public ActionResult<School> GetById([FromRoute] short id) => ...;
}
```

```java
// No registration file: @Repository / @RestController are found by component scan
@RestController
@RequestMapping(path = {V2Config.BASE_URL + "/school"})     // "/api/v2/school"
public class SchoolController implements be.vwo.common.restAPI.controllers.SchoolController {
    @Getter(onMethod_ = {@Override})
    private final ScholenRepository repository;             // injected, singleton
}
```

</div>

Click through the layers below to see which annotations and files
belong to each one.

<div class="layer-explorer" data-layer-explorer>
  <div class="le-view-toggle">
    <button data-view="annotations" aria-pressed="true">Annotations</button>
    <button data-view="files">File locations</button>
  </div>
  <div class="le-rows"></div>
  <div class="le-detail" aria-live="polite"></div>
</div>

</div>

<div class="level deep">

### 3.1 📖 Spring Framework 5.3.39 Reference: Core Technologies

[https://docs.spring.io/spring-framework/docs/5.3.x/reference/html/core.html](https://docs.spring.io/spring-framework/docs/5.3.x/reference/html/core.html)
✅ header reads "Core Technologies: version 5.3.39", the exact version
in `pom.xml`. This is the authoritative reference for how the project
is wired, including the XML style still used in `applicationContextAPI.xml`:

```xml
<!-- applicationContextAPI.xml -->
<context:component-scan base-package="be.vwo"/>
<tx:annotation-driven/>
<cache:annotation-driven cache-manager="ehcacheManager"/>
<bean id="vwoRW" class="org.springframework.orm.hibernate5.LocalSessionFactoryBean"> … </bean>
```

<div class="callout danger">
<div class="callout-label">Watch out</div>
The default URL (docs.spring.io/spring-framework/reference/...) now
documents Spring 7.0.9. Use the <code>5.3.x</code> link above for this
project.
</div>

### 3.2 Modern Spring From Scratch (Java Brains, paid)

[https://javabrains.io/courses/modern-spring-from-scratch](https://javabrains.io/courses/modern-spring-from-scratch)
✅ 4 hours / 37 lessons, \$50 one-time or \$8.99/month, one free
preview lesson.

```java
@Repository
public class ScholenRepositoryImpl implements ScholenRepository {
    private final ScholenDao scholenDao;                       // constructor injection
    @Autowired
    public ScholenRepositoryImpl(ScholenDao scholenDao, ScholenFacturatieDao invoiceDao) { ... }
}
```

Component scanning (`@SpringBootApplication(scanBasePackages = "be.vwo.common")`)
finds every `@Repository/@RestController/@Service`, like
auto-registering services in `Program.cs`. Beans are singletons by
default. Proxies: `@Transactional`/`@Cacheable` work through generated
proxies; a call on `this` skips them, hence `@Resource @Lazy private
XImpl self;` in `KangoeroePoolsParticipantsRepositoryImpl`.

Free alternative: 3.1 above (the official reference).

### 3.3 Spring Boot Tutorial for Beginners (freeCodeCamp / Amigoscode)

Video: [https://www.youtube.com/watch?v=vtPkZShrvXQ](https://www.youtube.com/watch?v=vtPkZShrvXQ)
· Write-up: [https://www.freecodecamp.org/news/spring-boot-tutorial/](https://www.freecodecamp.org/news/spring-boot-tutorial/)
✅ write-up dated 6 Sep 2019, 2-hour course, HTTP methods, in-memory
DB, N-tier architecture, DI via autowired beans, interfaces, Postman.
Predates Boot 3, so it's `javax.*` era.

```java
@RestController
@RequestMapping(path = {V2Config.BASE_URL + "/school"})     // "/api/v2/school"
public class SchoolController implements be.vwo.common.restAPI.controllers.SchoolController { ... }
```

`@RestController`, `@RequestMapping`, `@GetMapping`, `@PathVariable`,
`@RequestParam`, `@RequestBody`, `ResponseEntity` = `[ApiController]`,
`[HttpGet]`, `[FromRoute]`, `[FromQuery]`, `[FromBody]`, `ActionResult`.

<div class="callout note">
<div class="callout-label">Caveat</div>
The course runs a <code>.jar</code> with embedded Tomcat and no real DB;
this project is a WAR on external Tomcat with Hibernate.
</div>

### 3.4 📖 Deploying a Spring Boot app as a WAR on external Tomcat

| Article | Verified | Generation |
|---|---|---|
| [Okta Developer](https://developer.okta.com/blog/2019/04/16/spring-boot-tomcat) | ✅ Java 11, Boot 2.4.4, Tomcat 9.0.19; WAR + `provided` Tomcat; Tomcat Manager deploy | **closest match to this project** |
| [HowToDoInJava](https://howtodoinjava.com/spring-boot/deploy-spring-boot-traditional-war-on-tomcat/) | ✅ (Dec 2022) `packaging=war`, extend `SpringBootServletInitializer` | version-agnostic |
| [TutorialsPoint](https://www.tutorialspoint.com/spring_boot/spring_boot_tomcat_deployment.htm) | ✅ same recipe; Boot 3.5.6 / Java 21 ⇒ `jakarta.*` | Boot 3 (differs!) |
| [JavaInUse](https://www.javainuse.com/spring/boot-war) | ✅ same recipe; Boot 1.4.1 / Java 1.8 | very old, recipe unchanged |
| [Baeldung](https://www.baeldung.com/spring-boot-war-tomcat-deploy) / [mkyong](https://mkyong.com/spring-boot/spring-boot-deploy-war-file-to-tomcat/) | ⚠️ 403 on fetch; search confirms title + Servlet 3.0 contract | not verified |

This *is* the project's runtime model: the biggest surprise for
someone used to `dotnet run`.

```java
// restAPI/OpenApiApplication.java
@SpringBootApplication(exclude = {DataSourceAutoConfiguration.class}, scanBasePackages = "be.vwo.common")
@ImportResource("classpath:applicationContextAPI.xml")
public class OpenApiApplication extends SpringBootServletInitializer {
    @Override
    protected SpringApplicationBuilder configure(SpringApplicationBuilder application) {
        return application.sources(OpenApiApplication.class);   // Tomcat calls this on WAR startup
    }
}
```

The WAR file name is the context path (`Dockerfile`:
`COPY target/restAPI.war …/webapps/${WAR_FILENAME}`, default
`database.war`), so a WAR named `restAPI.war` would get a different
URL entirely.

### 3.5 Mental model: singletons, not scoped services

<div class="table-wrap">

| ASP.NET Core lifetime | Spring scope | In this repo |
|---|---|---|
| `AddSingleton` | `singleton` (the **default**) | every controller, repository, DAO |
| `AddScoped` (per request) | `request` scope (rarely used) | not relied on; per-request state lives in the Hibernate `Session` bound to the transaction |
| `AddTransient` | `prototype` | |

</div>

In .NET you'd register `DbContext` as scoped and let it hold per-request
state. Here the DAO is a singleton shared by every thread, and the
per-request unit of work is the Hibernate `Session` that Spring binds to
the current transaction (Step 4). Any mutable instance field on a bean is
a concurrency bug waiting to happen.

Constructor injection works like in .NET. Since Spring 4.3 a class with a
single constructor doesn't even need `@Autowired`; `ScholenRepositoryImpl`
has it anyway, which is harmless.

### 3.6 Mental model: proxies and self-invocation

`@Transactional` and `@Cacheable` are not compiled into your method.
Spring wraps the bean in a runtime **proxy** (a generated subclass or
interface implementation) and the proxy starts the transaction or checks
the cache *before* delegating to your code. Other beans receive the
proxy; your own `this` is the raw object.

<div class="code-compare" data-code-compare>

```csharp
// .NET: a decorator (e.g. Scrutor) behaves the same way.
// Calls that go through the interface are decorated;
// calls inside the class on `this` are not.
public void Outer() => Inner();     // no decorator involved
```

```java
// The `self` field is real (KangoeroePoolsParticipantsRepositoryImpl);
// outer()/inner() are illustrative.
public class KangoeroePoolsParticipantsRepositoryImpl ... {
    @Resource @Lazy private KangoeroePoolsParticipantsRepositoryImpl self; // the proxy

    public void outer() {
        inner();        // on `this`: @Transactional / @Cacheable on inner() IGNORED
        self.inner();   // through the proxy: annotations apply
    }
}
```

</div>

<div class="callout danger">
<div class="callout-label">Silent failures (Spring 5.3)</div>

- `@Transactional` / `@Cacheable` on a **private** method: ignored. In Spring 5.3 annotation-driven transactions apply to public methods only.
- On a **`final`** method: a subclass proxy can't override it, so nothing is intercepted.
- **Self-invocation** (`this.inner()`): bypasses the proxy. Fix by moving the method to another bean, or inject the proxy into itself as the repo does with `@Resource @Lazy ... self` (the `@Lazy` breaks the circular reference at startup).
- None of these produce an error or a warning. You just get no transaction.

</div>

### 3.7 Mental model: the WAR and the context path

Tomcat serves each WAR in `webapps/` under a path equal to its file name:
`webapps/database.war` answers at `/database/...`, and only a file called
`ROOT.war` is served at `/`. So the full URL of the v2 school endpoint on
a server that deploys `database.war` is `/database/api/v2/school/{id}`.

<div class="callout note">
<div class="callout-label">.NET gotcha</div>
<code>server.servlet.context-path</code> and <code>server.port</code> in
Spring Boot properties configure the <em>embedded</em> server. In a WAR on
external Tomcat they are ignored: Tomcat's own config and the WAR name
decide. It's the IIS-application-path situation, not the Kestrel one.
</div>

</div>

<div class="level drill">

### Tasks

<ul class="checklist">
<li><label><input type="checkbox"><span>With the Knowledge File §7 open, trace <code>GET /api/v2/school/{id}</code> and name the bean at each hop.</span></label></li>
<li><label><input type="checkbox"><span>In <code>Dockerfile</code> and <code>.gitlab-ci.yml</code> find where <code>database.war</code> is named, then say what URL a WAR named <code>restAPI.war</code> would get.</span></label></li>
<li><label><input type="checkbox"><span>In <code>applicationContextAPI.xml</code>, find the component scan, <code>tx:annotation-driven</code> and the <code>vwoRW</code> <code>LocalSessionFactoryBean</code>; say which of them a .NET app would put in <code>Program.cs</code>.</span></label></li>
<li><label><input type="checkbox"><span>In <code>KangoeroePoolsParticipantsRepositoryImpl</code>, find every call made through <code>self</code> and, for one of them, explain what would break if it were called on <code>this</code>.</span></label></li>
</ul>

### Quiz

<div class="quiz" data-quiz>
<p class="quiz-q">What is the default scope of a Spring bean such as <code>ScholenRepositoryImpl</code>?</p>
<ol class="quiz-options">
<li>Request-scoped, one per HTTP request</li>
<li>Prototype, a new instance per injection</li>
<li data-correct>Singleton, one shared instance per application context</li>
<li>Session-scoped</li>
</ol>
<p class="quiz-explain">Singleton is the default. Treat every bean like an <code>AddSingleton</code> service: no per-request state in fields.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">A public method <code>a()</code> calls <code>this.b()</code>, and <code>b()</code> is annotated <code>@Transactional</code>. Nothing else calls <code>b()</code>. What happens?</p>
<ol class="quiz-options">
<li><code>b()</code> runs in a new transaction</li>
<li>Startup fails with a proxy error</li>
<li data-correct><code>b()</code> runs without the transactional behaviour from its own annotation, because the call never passes through the proxy</li>
<li>Spring rewrites the bytecode so it works anyway</li>
</ol>
<p class="quiz-explain">Proxy-based AOP only intercepts calls that come in through the proxy. Self-invocation skips it silently. That is what the <code>@Lazy self</code> field in <code>KangoeroePoolsParticipantsRepositoryImpl</code> works around.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">Which Spring annotation corresponds to ASP.NET Core's <code>[FromQuery]</code>?</p>
<ol class="quiz-options">
<li><code>@PathVariable</code></li>
<li data-correct><code>@RequestParam</code></li>
<li><code>@RequestBody</code></li>
<li><code>@QueryValue</code></li>
</ol>
<p class="quiz-explain"><code>@PathVariable</code> = <code>[FromRoute]</code>, <code>@RequestParam</code> = <code>[FromQuery]</code>, <code>@RequestBody</code> = <code>[FromBody]</code>.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">Tomcat deploys <code>webapps/database.war</code>. Where does <code>GET /api/v2/school/1</code> answer?</p>
<ol class="quiz-options">
<li><code>/api/v2/school/1</code></li>
<li data-correct><code>/database/api/v2/school/1</code></li>
<li><code>/restAPI/api/v2/school/1</code></li>
<li>Wherever <code>server.servlet.context-path</code> says</li>
</ol>
<p class="quiz-explain">The WAR file name becomes the context path. <code>server.servlet.*</code> settings only apply to an embedded server.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">Why does <code>OpenApiApplication</code> extend <code>SpringBootServletInitializer</code>?</p>
<ol class="quiz-options">
<li>To enable component scanning</li>
<li>To start an embedded Tomcat</li>
<li data-correct>So that an external servlet container (Tomcat) can bootstrap the Spring application from the WAR</li>
<li>To register the security filter chain</li>
</ol>
<p class="quiz-explain">When Tomcat deploys the WAR it calls <code>configure(...)</code>, which hands it the application sources. There is no <code>main</code>-driven startup in production.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">You put <code>@Transactional</code> on a <code>private</code> helper method. In Spring 5.3, what does it do?</p>
<ol class="quiz-options">
<li>Starts a transaction when the helper is called</li>
<li>Causes a compile error</li>
<li data-correct>Nothing: annotation-driven transactions only apply to public methods, and private methods can't be intercepted by the proxy</li>
<li>Makes the whole class transactional</li>
</ol>
<p class="quiz-explain">No error, no warning, no transaction. Put the annotation on a public method of a bean that is called from another bean.</p>
</div>

### Flashcards

<div class="flashcards" data-flashcards>
<div class="card"><div class="front"><code>[ApiController]</code> + <code>[Route]</code></div><div class="back"><code>@RestController</code> + <code>@RequestMapping</code></div></div>
<div class="card"><div class="front"><code>[HttpGet("{id}")]</code></div><div class="back"><code>@GetMapping("/{id}")</code></div></div>
<div class="card"><div class="front"><code>ActionResult&lt;T&gt;</code></div><div class="back"><code>ResponseEntity&lt;T&gt;</code></div></div>
<div class="card"><div class="front"><code>builder.Services.AddScoped&lt;I, T&gt;()</code></div><div class="back">Annotate <code>T</code> with <code>@Service</code>/<code>@Repository</code>; component scan registers it (singleton)</div></div>
<div class="card"><div class="front"><code>IServiceProvider</code></div><div class="back"><code>ApplicationContext</code></div></div>
<div class="card"><div class="front">Exception filter / <code>UseExceptionHandler</code></div><div class="back"><code>@ControllerAdvice</code> + <code>@ExceptionHandler</code></div></div>
</div>

### Self-checks

<details class="qa">
<summary>Self-check: why must repositories/DAOs be stateless singletons?</summary>
<div class="ans">
Spring beans are singletons by default: one shared instance serves
every request. If a repository or DAO kept per-request state in an
instance field, concurrent requests would corrupt each other's data;
all request-scoped state has to live in method parameters/locals or the
Hibernate <code>Session</code>, never in bean fields.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<details class="qa">
<summary>Self-check: <code>OpenApiApplication</code> excludes <code>DataSourceAutoConfiguration</code>. Why would it?</summary>
<div class="ans">
Because the database wiring is not left to Boot: it is defined by hand
in <code>applicationContextAPI.xml</code> (imported with
<code>@ImportResource</code>), including the <code>LocalSessionFactoryBean</code>s.
Excluding the auto-configuration stops Boot from trying to build its own
<code>DataSource</code> from properties that aren't there.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<details class="qa">
<summary>Self-check: what does <code>@Lazy</code> add to <code>@Resource @Lazy private XImpl self;</code>?</summary>
<div class="ans">
The bean depends on itself, which is a circular reference at creation
time. <code>@Lazy</code> injects a lazy-resolution proxy instead of the
real bean, so the actual lookup happens on first use, after the bean
(and its transactional/caching proxy) exists.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<button type="button" data-mark-done>Mark this step done</button>

</div>
