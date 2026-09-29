# Step 3: Spring Core, MVC & WAR Deployment

<div class="level-tabs" data-levels>
  <button data-level="overview" aria-pressed="true">Overview</button>
  <button data-level="deep">Deep Understanding</button>
  <button data-level="drill">Drilling</button>
</div>

<div class="level overview">

Every object in the API is a Spring bean wired by dependency injection,
singleton by default (unlike .NET's per-request "scoped" lifetime), and
the whole thing runs as a WAR on an external Tomcat 9, not `dotnet run`
and not an embedded-Tomcat `.jar`. Click through the layers below to
see which annotations and files belong to each one.

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

</div>

<div class="level drill">

<ul class="checklist">
<li><label><input type="checkbox"><span>With the Knowledge File §7 open, trace <code>GET /api/v2/school/{id}</code> and name the bean at each hop.</span></label></li>
<li><label><input type="checkbox"><span>In <code>Dockerfile</code> and <code>.gitlab-ci.yml</code> find where <code>database.war</code> is named, then say what URL a WAR named <code>restAPI.war</code> would get.</span></label></li>
</ul>

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

<button type="button" data-mark-done>Mark this step done</button>

</div>
