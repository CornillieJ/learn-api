# 5. Hello world in Swagger

<div class="level-tabs" data-levels>
  <button data-level="overview" aria-pressed="true">Overview</button>
  <button data-level="deep" data-short="Deep">Deep Understanding</button>
  <button data-level="drill">Drilling</button>
</div>

<div class="level overview">

The VWO API is used through its Swagger UI: the backend team tries
endpoints there, and its users read the documentation there. This chapter
gives TechOlympiad the same UI with its first endpoint, `GET /api/v1/hello`,
and ends with you pressing *Execute* and reading `Hello world`.

Six pieces, each a copy of a VWO piece:

<div class="table-wrap">

| Piece | VWO original | What it does |
|---|---|---|
| `springdoc-openapi-ui` and `swagger-core` in `pom.xml` | the same two dependencies | Generate the OpenAPI document and serve the Swagger UI |
| `OpenAPI toAPI(...)` bean | `OpenAPI vwoAPI(...)` | Title, description, version and servers of the document |
| `GroupedOpenApi v1Api()` bean | the same | The `v1` entry in the UI's definition list |
| `application.properties` | the same file | Where the UI lives and how it sorts |
| `controllers/v1/V1Config` | the same class | The `/api/v1` prefix |
| `controllers/v1/HelloController` | none; deleted again in chapter 11 | Something to call |

</div>

**After this chapter you can:**

- trace a request from Tomcat through the `DispatcherServlet` to a controller method and back;
- write a `@RestController` with class- and method-level mappings;
- explain which message converter writes a response, and when Jackson is involved;
- configure springdoc with an `OpenAPI` bean, groups and properties, and explain each Swagger UI URL.

<div class="code-compare" data-code-compare data-labels="VWO OpenApiApplication|TechOlympiad OpenApiApplication">

```java
@Bean
public OpenAPI vwoAPI(@Value("${application-description}") String title, @Value("${application-description}") String appDesciption, @Value("1") String appVersion, @Value("${apiPomVersion}") String apiPomVersion) {

    Server currentServer = new Server();
    currentServer.setDescription("current");
    currentServer.setUrl("/");

    Server testServer = new Server();
    testServer.setDescription("default");
    testServer.setUrl("/database");
    // ... two more servers, the security scheme ...

    return new OpenAPI()
            // .addSecurityItem(...).components(...)
            .info(new Info()
                    .title(title)
                    .version(appVersion)
                    .description(appDesciption)
                    .termsOfService("https://swagger.io/terms/")
                    .license(new License().name("Apache 2.0").url("http://springdoc.org"))
            )
            .servers(Arrays.asList(currentServer, testServer, devServer, productionServer));
}

@Bean
public GroupedOpenApi v1Api() {
    String[] paths = {"/api/v1/**"};
    return GroupedOpenApi.builder().group("v1").pathsToMatch(paths)
            .build();
}
```

```java
@Bean
public OpenAPI toAPI(@Value("${application-description}") String title, @Value("${application-description}") String appDescription, @Value("${apiPomVersion}") String apiPomVersion) {

    Server currentServer = new Server();
    currentServer.setDescription("current");
    currentServer.setUrl("/");

    Server localServer = new Server();
    localServer.setDescription("local");
    localServer.setUrl("/techolympiad");

    return new OpenAPI()
            .info(new Info()
                    .title(title)
                    .version(apiPomVersion)
                    .description(appDescription)
            )
            .servers(Arrays.asList(currentServer, localServer));
}

@Bean
public GroupedOpenApi v1Api() {
    String[] paths = {"/api/v1/**"};
    return GroupedOpenApi.builder().group("v1").pathsToMatch(paths)
            .build();
}
```

</div>

</div>

<div class="level deep">

### The `DispatcherServlet`

Spring MVC is built around one servlet, the
<dfn data-def="Spring MVC's front controller: the single servlet that receives every request and hands it to the right controller method.">DispatcherServlet</dfn>.
Spring Boot's `DispatcherServletAutoConfiguration` registers it in Tomcat
at `/`, so it receives every request for `/techolympiad/*`. It does not
handle requests itself; it finds a handler, calls it, and turns the result
into a response. ASP.NET Core does the same with its routing and endpoint
middleware.

```mermaid
sequenceDiagram
    participant T as Tomcat (context /techolympiad)
    participant D as DispatcherServlet
    participant M as RequestMappingHandlerMapping
    participant C as HelloController
    participant V as HttpMessageConverter
    T->>D: GET /api/v1/hello (context path removed)
    D->>M: which method handles GET /api/v1/hello?
    M-->>D: HelloController.hello()
    D->>C: hello()
    C-->>D: "Hello world"
    D->>V: write String, client accepts text/plain
    V-->>T: 200, Content-Type text/plain;charset=UTF-8
```

At startup, `RequestMappingHandlerMapping` reads the `@RequestMapping`
annotations of every controller bean into a table of path, HTTP method,
`produces` and `consumes`. A request is looked up in that table. No match
means 404; a path match with the wrong method means 405 Method Not
Allowed; a match whose `produces` the client does not accept means 406.

### `@RestController` and mappings

`@RestController` is `@Controller` plus `@ResponseBody`: the class is a
component (so scanning finds it, see [chapter 3](build-03-application-class.md)),
and what its methods return is the response body. A plain `@Controller`
would treat a returned `String` as the name of a view template instead.

Mappings combine. `@RequestMapping(path = "/api/v1/hello")` on the class
sets the prefix for every method; `@GetMapping` on a method with no path
adds nothing, so the method answers `GET /api/v1/hello`. `@GetMapping` is
`@RequestMapping(method = RequestMethod.GET)`; there are `@PostMapping`,
`@PutMapping` and `@DeleteMapping` too. `produces` on the class applies to
all methods. The VWO puts both on the class:

```java
@RestController("registrationFeeController.v1")
@RequestMapping(path = {V1Config.BASE_URL + "/registration-fee", V1Config.OLD_BASE_URL + "/registration-fee"}, produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "registration-fee-controller")
public class RegistrationFeeController implements be.vwo.common.restAPI.controllers.RegistrationFeeController {
```

Two things to notice for later. The bean gets an explicit name ending in
`.v1`, because a `v2` class with the same simple name would otherwise
produce a second bean called `registrationFeeController` (chapter 19).
And the second path, under `OLD_BASE_URL` (`/restapi`), keeps an old URL
scheme alive; TechOlympiad has no old clients, so its `V1Config` has only
`BASE_URL`.

### `V1Config`

```java
public class V1Config {

    static final String BASE_URL = "/api/v1";
    static final String OLD_BASE_URL = "/restapi";

}
```

A holder for constants. `static final` makes `BASE_URL` a compile-time
constant, which is required: annotation values must be constants, so
`V1Config.BASE_URL + "/hello"` is allowed inside `@RequestMapping`, while
a value read from a property at run time would not be. No modifier means
*package-private*: visible only inside `controllers.v1`, which is exactly
where the v1 controllers live. C# has no direct counterpart; `internal` is
per assembly, this is per package.

### Message converters, and where Jackson comes in

A method's return value is written by the first
<dfn data-def="A Spring MVC component that writes a Java object to the HTTP response body (or reads a request body into one) for given media types. Jackson's MappingJackson2HttpMessageConverter handles JSON.">HttpMessageConverter</dfn>
that can write that Java type in a media type the request accepts and the
mapping produces. Spring Boot registers them in this order, among others:

<div class="table-wrap">

| Converter | Writes | Media types |
|---|---|---|
| `ByteArrayHttpMessageConverter` | `byte[]` | any |
| `StringHttpMessageConverter` | `String` | `text/plain` and any other |
| `ResourceHttpMessageConverter` | files and other resources | any |
| `MappingJackson2HttpMessageConverter` | any object | `application/json`, `application/*+json` |

</div>

Jackson writes everything that is not a `String` or bytes: an entity, a
`List`, a `Map`, an `Optional`'s content. Spring Boot's
`JacksonAutoConfiguration` creates the `ObjectMapper` it uses. That is
what the VWO's entities rely on from chapter 9: their `@JsonProperty`
annotations are read by this converter.

A `String` takes another route. `StringHttpMessageConverter` comes first
and writes the characters as they are. Return `"Hello world"` from a method
that `produces = MediaType.APPLICATION_JSON_VALUE`, and the response says
`application/json` but contains `Hello world` without quotes, which is not
JSON. So the Hello controller says `produces = MediaType.TEXT_PLAIN_VALUE`,
and the header matches the body. ASP.NET Core behaves the same: its
`StringOutputFormatter` writes a returned string as `text/plain`.

### OpenAPI, springdoc and Swagger UI

An <dfn data-def="A JSON (or YAML) description of an HTTP API: its paths, operations, parameters, schemas and servers. Formerly called the Swagger specification.">OpenAPI document</dfn>
describes an API in JSON. The Swagger UI is a static web page that reads
such a document and turns it into the interactive documentation you know.
<dfn data-def="The library that generates an OpenAPI document from a Spring MVC application at run time and serves the Swagger UI. springdoc-openapi 1.x is for Spring Boot 2.">springdoc</dfn>
connects the two for Spring: on the first request for the document it
walks the `RequestMappingHandlerMapping` table, reads the Swagger
annotations (`@Tag`, `@Operation`, `@Schema`, ...), and builds the
document. It is Swashbuckle for Spring.

<div class="table-wrap">

| springdoc | Swashbuckle (ASP.NET Core) |
|---|---|
| `springdoc-openapi-ui` dependency | `Swashbuckle.AspNetCore` package |
| an `OpenAPI` bean | `AddSwaggerGen(c => c.SwaggerDoc(...))` |
| a `GroupedOpenApi` bean per group | one `SwaggerDoc` per document |
| `/v3/api-docs/v1` | `/swagger/v1/swagger.json` |
| `springdoc.swagger-ui.path` | `UseSwaggerUI(c => c.RoutePrefix = ...)` |
| `@Operation(summary = ...)` | XML doc comments or `[SwaggerOperation]` |

</div>

springdoc 1.x is the line for Spring Boot 2 and `javax`; springdoc 2.x
needs Spring Boot 3. The UI itself comes as a
<dfn data-def="A jar that contains a web front end (here the Swagger UI's HTML, CSS and JavaScript) so it can be served from the classpath.">webjar</dfn>,
`org.webjars:swagger-ui`, which springdoc serves from the classpath.

### The URLs springdoc adds

With `springdoc.swagger-ui.path=/public/swagger-ui.html`:

<div class="table-wrap">

| URL under `/techolympiad` | What answers |
|---|---|
| `/public/swagger-ui.html` | A springdoc controller that redirects (302) to the UI page |
| `/public/swagger-ui/index.html` | The UI, from the webjar; springdoc takes the folder from the configured path |
| `/v3/api-docs/swagger-config` | The UI's configuration: the sort settings and the list of groups |
| `/v3/api-docs/v1` | The OpenAPI document of group `v1` |

</div>

The UI lives under `/public` because of security. In chapter 20 every
URL needs a token except `/public/**` (and the documents under
`/v3/api-docs/**`); a UI that requires a login before you can log in
would be useless.

### The `OpenAPI` bean

springdoc starts from an `OpenAPI` bean when one exists and adds the
generated paths to it. The VWO's bean sets the title and the description
from the same property, `application-description`, and a list of servers.
It also takes `apiPomVersion`, but then shows a literal: `@Value("1")`
feeds the version, and the `apiPomVersion` parameter is never used, so the
VWO's Swagger page always says version 1. We use `apiPomVersion`, which is
clearly what the parameter was for. We leave out `termsOfService` and the
license, which point at swagger.io and springdoc.org and say nothing about
the API. The security scheme follows in chapter 20.

`@OpenAPIDefinition` on the class is the annotation alternative to the
bean. Without attributes it adds nothing, since the bean already provides
everything; the VWO has it, so we add it.

### Servers, and why "current" fails here

The Servers list tells the UI where to send requests. A relative URL is
resolved against the address of the OpenAPI document, here
`http://localhost:8081/techolympiad/v3/api-docs/v1`, the way a browser
resolves a link:

<div class="table-wrap">

| Server | Resolves to | Request for `/api/v1/hello` goes to | Result |
|---|---|---|---|
| `/` current | `http://localhost:8081/` | `http://localhost:8081/api/v1/hello` | Tomcat 404: no context matches |
| `/techolympiad` local | `http://localhost:8081/techolympiad` | `http://localhost:8081/techolympiad/api/v1/hello` | 200 |

</div>

The paths in the document never include the context path, because the
application never sees it ([chapter 4](build-04-tomcat.md)). `/` only works
when the API is deployed as `ROOT` or behind a proxy that maps the root to
it. The UI preselects the first server, so in this setup you switch to
`/techolympiad` once; the choice sticks until you reload the page. The
VWO's list works the same way: `/database` "default" is what you pick
locally.

### Groups

A `GroupedOpenApi` bean defines one document. `group("v1")` names it,
`pathsToMatch("/api/v1/**")` selects which endpoints it contains (`**`
matches any number of path segments). With groups, the UI shows a
*Select a definition* list at the top, with one entry per group. The VWO
has `v1`, `v2` and a deprecated `v1-restapi` group for the `/restapi`
paths. We start with `v1`; chapter 19 adds `v2` with a second bean.

### `application.properties`

Spring Boot reads `application.properties` from the classpath on its own;
no `@PropertySource` is needed. We copy the VWO's springdoc lines and one
Spring line:

<div class="table-wrap">

| Property | Effect |
|---|---|
| `springdoc.swagger-ui.path=/public/swagger-ui.html` | Where the UI lives, see above |
| `springdoc.swagger-ui.tagsSorter=alpha` | Controllers (tags) in alphabetical order |
| `springdoc.swagger-ui.operations-sorter=alpha` | Endpoints within a tag sorted by path |
| `springdoc.swagger-ui.docExpansion=none` | Every tag starts collapsed |
| `spring.main.allow-bean-definition-overriding=true` | A second bean definition with the same name replaces the first instead of stopping startup |

</div>

The VWO spells one key `tagsSorter` and the other `operations-sorter`.
Both work: Spring Boot's
<dfn data-def="Spring Boot matching property names loosely: tagsSorter, tags-sorter and TAGS_SORTER all bind to the same setting.">relaxed binding</dfn>
treats camel case, kebab case and underscores as the same name. Kebab
case is the documented style; we keep the VWO's spelling so the files can
be compared line by line.

Bean overriding has been off by default since Spring Boot 2.1. It
matters from chapter 8, when Spring XML starts defining beans next to the
annotated ones: with overriding off, any name defined twice stops startup
with a `BeanDefinitionOverrideException`. It has to be in
`application.properties`, because `spring.main.*` is read before any
`@PropertySource` file is loaded.

The VWO file also has logging levels, JPA settings and a session timeout;
none of them has anything to configure yet.

### `${application-description}` for now

`@Value("${application-description}")` asks the Environment for that key
when the bean is created. If no property source has it, startup fails
with `Could not resolve placeholder 'application-description' in value "${application-description}"`.
In the VWO the key lives in the environment files (`environmentAPI.dev.properties`
and `environmentAPI.prod.properties`), which arrive in
[chapter 6](build-06-build-profiles.md). Until then we put it in
`api.properties`; chapter 6 moves it.

### Lining up Jackson

springdoc 1.8.0 brings `swagger-core` 2.2.20, which wants Jackson 2.16,
including `jackson-dataformat-yaml` 2.16.0 (springdoc builds a YAML mapper
at startup). Spring Boot's JSON starter brings Jackson 2.13.5. By nearest
wins ([chapter 2](build-02-maven-project.md)), `jackson-databind` and
`jackson-core` stay at 2.13.5 because they sit higher in the tree, while
`jackson-dataformat-yaml` only appears under swagger-core and comes in at
2.16.0. A Jackson module expects a core of its own minor version or
newer, so that mix is asking for a `NoSuchMethodError` at startup.

The VWO declares `swagger-core` 2.2.30 directly. At depth 1 it beats
everything, and its own dependencies (`jackson-databind`,
`jackson-dataformat-yaml`, `jackson-datatype-jsr310` 2.18.2) sit at depth
2, above Spring Boot's at depth 3 and 4. The core of the Jackson family
lines up at 2.18.2. We copy the declaration, before springdoc, as the VWO
orders it. The VWO also lists `springdoc-openapi-webmvc-core` 1.8.0;
`springdoc-openapi-ui` already depends on it, so we leave that out.

</div>

<div class="level drill">

You should have the end state of [chapter 4](build-04-tomcat.md): the WAR
deploys in the `techolympiad-api` container, and
`curl http://localhost:8081/techolympiad/` returns Spring's JSON 404.

### Tasks

<ul class="checklist">
<li><label><input type="checkbox"><span>Add <code>swagger-core</code> and <code>springdoc-openapi-ui</code> to <code>pom.xml</code> (diff below).</span></label></li>
<li><label><input type="checkbox"><span>Add <code>application-description</code> to <code>api.properties</code> (diff below).</span></label></li>
<li><label><input type="checkbox"><span>Create <code>src/main/resources/application.properties</code>.</span></label></li>
<li><label><input type="checkbox"><span>Replace <code>OpenApiApplication.java</code> with the new version.</span></label></li>
<li><label><input type="checkbox"><span>Create <code>V1Config.java</code> and <code>HelloController.java</code> in <code>src/main/java/be/techolympiad/common/restAPI/controllers/v1/</code>.</span></label></li>
<li><label><input type="checkbox"><span>Build and redeploy: <code>mvn -q package &amp;&amp; docker compose restart api</code>, then follow <code>docker compose logs -f api</code> until <code>Started OpenApiApplication</code>.</span></label></li>
<li><label><input type="checkbox"><span>Call the endpoint with <code>curl -i</code> and read the <code>Content-Type</code>. Then call it with <code>-H 'Accept: application/json'</code> and read the status.</span></label></li>
<li><label><input type="checkbox"><span>Open <code>http://localhost:8081/techolympiad/public/swagger-ui.html</code> and note the URL it redirects to.</span></label></li>
<li><label><input type="checkbox"><span>In the UI, check the title, the version and the <em>Select a definition</em> list (<code>v1</code>). In <em>Servers</em>, choose <code>/techolympiad - local</code>.</span></label></li>
<li><label><input type="checkbox"><span>Expand <em>hello-controller</em>, open <code>GET /api/v1/hello</code>, press <em>Try it out</em>, then <em>Execute</em>. Read the curl command, the request URL, the response body <code>Hello world</code> and the response headers.</span></label></li>
<li><label><input type="checkbox"><span>Switch the server to <code>/ - current</code> and execute again. Explain the 404.</span></label></li>
<li><label><input type="checkbox"><span>Read the documents themselves: <code>/techolympiad/v3/api-docs/v1</code> and <code>/techolympiad/v3/api-docs/swagger-config</code>.</span></label></li>
<li><label><input type="checkbox"><span>Check the Jackson versions: <code>mvn dependency:tree -Dincludes=com.fasterxml.jackson.core,com.fasterxml.jackson.dataformat</code>.</span></label></li>
<li><label><input type="checkbox"><span>Commit: <code>git add -A &amp;&amp; git commit -m "Add Hello world in Swagger"</code>.</span></label></li>
</ul>

### The changes

`pom.xml`, in `<dependencies>` after Lombok:

<div class="diff-view" data-diff-view>

```diff
         <dependency>
             <groupId>org.projectlombok</groupId>
             <artifactId>lombok</artifactId>
             <version>1.18.38</version>
             <scope>provided</scope>
         </dependency>
+        <dependency>
+            <groupId>io.swagger.core.v3</groupId>
+            <artifactId>swagger-core</artifactId>
+            <version>2.2.30</version>
+        </dependency>
+        <dependency>
+            <groupId>org.springdoc</groupId>
+            <artifactId>springdoc-openapi-ui</artifactId>
+            <version>1.8.0</version>
+        </dependency>
     </dependencies>
```

</div>

`src/main/resources/api.properties`:

<div class="diff-view" data-diff-view>

```diff
 apiPomVersion=0.1.0
+application-description=TechOlympiad API
```

</div>

`src/main/resources/application.properties`:

```properties
spring.main.allow-bean-definition-overriding=true
springdoc.swagger-ui.tagsSorter=alpha
springdoc.swagger-ui.operations-sorter=alpha
springdoc.swagger-ui.docExpansion=none
springdoc.swagger-ui.path=/public/swagger-ui.html
```

`src/main/java/be/techolympiad/common/restAPI/OpenApiApplication.java`,
the full new version:

```java
package be.techolympiad.common.restAPI;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.servers.Server;
import org.springdoc.core.GroupedOpenApi;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.PropertySource;

import java.util.Arrays;

@OpenAPIDefinition
@SpringBootApplication(exclude = {DataSourceAutoConfiguration.class}, scanBasePackages = "be.techolympiad.common")
@PropertySource("classpath:api.properties")
public class OpenApiApplication extends SpringBootServletInitializer {
    public static void main(String[] args) {
        SpringApplication.run(OpenApiApplication.class, args);
    }

    @Bean
    public OpenAPI toAPI(@Value("${application-description}") String title, @Value("${application-description}") String appDescription, @Value("${apiPomVersion}") String apiPomVersion) {

        Server currentServer = new Server();
        currentServer.setDescription("current");
        currentServer.setUrl("/");

        Server localServer = new Server();
        localServer.setDescription("local");
        localServer.setUrl("/techolympiad");

        return new OpenAPI()
                .info(new Info()
                        .title(title)
                        .version(apiPomVersion)
                        .description(appDescription)
                )
                .servers(Arrays.asList(currentServer, localServer));
    }

    @Bean
    public GroupedOpenApi v1Api() {
        String[] paths = {"/api/v1/**"};
        return GroupedOpenApi.builder().group("v1").pathsToMatch(paths)
                .build();
    }

    @Override
    protected SpringApplicationBuilder configure(SpringApplicationBuilder application) {
        return application.sources(OpenApiApplication.class);
    }
}
```

`OpenApiApplication` is a `@Configuration` through `@SpringBootApplication`,
so its `@Bean` methods run when the context starts. Spring resolves each
`@Value` parameter from the Environment before it calls the method. The
`swagger` imports are the model classes from `swagger-core` (`io.swagger.v3.oas.models`)
and the annotation from `swagger-annotations` (`io.swagger.v3.oas.annotations`);
`GroupedOpenApi` is springdoc's own.

`src/main/java/be/techolympiad/common/restAPI/controllers/v1/V1Config.java`:

```java
package be.techolympiad.common.restAPI.controllers.v1;

public class V1Config {

    static final String BASE_URL = "/api/v1";

}
```

`src/main/java/be/techolympiad/common/restAPI/controllers/v1/HelloController.java`:

```java
package be.techolympiad.common.restAPI.controllers.v1;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(path = V1Config.BASE_URL + "/hello", produces = MediaType.TEXT_PLAIN_VALUE)
@Tag(name = "hello-controller")
public class HelloController {

    @GetMapping
    @Operation(summary = "Say hello")
    public String hello() {
        return "Hello world";
    }
}
```

<div class="code-walk" data-code-walk>

```java
@RestController                                              // (1)
@RequestMapping(path = V1Config.BASE_URL + "/hello",         // (2)
        produces = MediaType.TEXT_PLAIN_VALUE)               // (3)
@Tag(name = "hello-controller")                              // (4)
public class HelloController {

    @GetMapping                                              // (5)
    @Operation(summary = "Say hello")                        // (6)
    public String hello() {
        return "Hello world";                                // (7)
    }
}
```

1. A component (found by the scan of `be.techolympiad.common`) whose return values are response bodies.
2. A compile-time constant plus a literal, so it is a valid annotation value: `/api/v1/hello`.
3. The method writes plain text; the header says so, and clients asking only for JSON get 406.
4. The heading this endpoint is listed under in the Swagger UI. The VWO names its tags in kebab case after the controller.
5. `GET` on the class path itself.
6. The one-line description next to the endpoint in Swagger.
7. Written by `StringHttpMessageConverter`; Jackson is not involved.

</div>

### Run it

```bash
mvn -q package && docker compose restart api
curl -i http://localhost:8081/techolympiad/api/v1/hello
```

```text
HTTP/1.1 200
Content-Type: text/plain;charset=UTF-8
Content-Length: 11
...

Hello world
```

```bash
curl -s -o /dev/null -w '%{http_code}\n' -H 'Accept: application/json' http://localhost:8081/techolympiad/api/v1/hello
```

```text
406
```

The mapping produces only `text/plain`, the client accepts only JSON:
406 Not Acceptable, before the method is even called.

Open `http://localhost:8081/techolympiad/public/swagger-ui.html`. The
browser lands on `http://localhost:8081/techolympiad/public/swagger-ui/index.html`.
You see:

- the title **TechOlympiad API** with the version `0.1.0` and an OAS 3 badge, and the description below it;
- *Select a definition* at the top right, set to `v1`;
- *Servers*, set to `/ - current`. Switch it to `/techolympiad - local`;
- one collapsed tag, **hello-controller**.

Expand it, open `GET /api/v1/hello`, press *Try it out* and *Execute*.
Swagger shows the request it sent:

```bash
curl -X 'GET' \
  'http://localhost:8081/techolympiad/api/v1/hello' \
  -H 'accept: text/plain'
```

and the server response: code `200`, response body `Hello world`, and
the header `content-type: text/plain;charset=UTF-8`. The UI asked for
`text/plain` because the document says that is what this operation
produces.

Switch the server to `/ - current` and execute again: the request URL is
now `http://localhost:8081/api/v1/hello`, and the 404 comes with Tomcat's
HTML error page as its body.

The document behind the page, formatted:

```bash
curl -s http://localhost:8081/techolympiad/v3/api-docs/v1 | jq
```

```json
{
  "openapi": "3.0.1",
  "info": {
    "title": "TechOlympiad API",
    "description": "TechOlympiad API",
    "version": "0.1.0"
  },
  "servers": [
    { "url": "/", "description": "current" },
    { "url": "/techolympiad", "description": "local" }
  ],
  "paths": {
    "/api/v1/hello": {
      "get": {
        "tags": ["hello-controller"],
        "summary": "Say hello",
        "operationId": "hello",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "text/plain": { "schema": { "type": "string" } }
            }
          }
        }
      }
    }
  },
  "components": {}
}
```

The `operationId` is the method name. `/techolympiad/v3/api-docs/swagger-config`
holds the UI settings from `application.properties` and the group list,
`"urls":[{"url":"/techolympiad/v3/api-docs/v1","name":"v1"}]`.

Finally the Jackson check:

```bash
mvn dependency:tree -Dincludes=com.fasterxml.jackson.core,com.fasterxml.jackson.dataformat
```

`jackson-databind`, `jackson-core`, `jackson-annotations` and
`jackson-dataformat-yaml` all report 2.18.2, under `swagger-core`. Remove
the `swagger-core` dependency for a moment and run it again to see
`jackson-dataformat-yaml` at 2.16.0 next to a 2.13.5 core; then put it
back.

<div class="callout danger">
<div class="callout-label">When it breaks</div>

- **`Could not resolve placeholder 'application-description'`**: the key is missing from `api.properties`, or misspelled in the file or in `@Value`. The context stops, so every URL gives Spring's 404 or Tomcat's.
- **404 on `/techolympiad/swagger-ui.html`**: the UI lives at `/public/swagger-ui.html`, as `springdoc.swagger-ui.path` says.
- **Execute gives 404 with an HTML body**: the server is set to `/ - current`. Choose `/techolympiad - local`.
- **"No operations defined in spec!"**: springdoc found no endpoint for the group. Either `HelloController` is outside `be.techolympiad.common` (not scanned), or its path does not match `/api/v1/**`. Check the package line and `V1Config.BASE_URL`.
- **"Failed to load API definition" with a 500, and a `NoSuchMethodError` or `NoClassDefFoundError` from `com.fasterxml.jackson` in the log**: mixed Jackson versions. Check that `swagger-core` 2.2.30 is declared and run the dependency tree above.
- **`element value must be a constant expression`** when compiling: `BASE_URL` lost its `static final`, so it is no longer a compile-time constant.
- **406 in your own client**: it sends `Accept: application/json` only. This endpoint produces `text/plain`; the JSON endpoints come in chapter 11.

</div>

### Quiz

<div class="quiz" data-quiz>
<p class="quiz-q">You change <code>hello()</code> to return <code>Map.of("message", "Hello world")</code> and set <code>produces</code> to JSON. What writes the response?</p>
<ol class="quiz-options">
<li><code>StringHttpMessageConverter</code>, calling <code>toString()</code> on the map<p class="quiz-whynot">That converter only handles <code>String</code>. Converters are chosen by the Java type and the media type.</p></li>
<li data-correct><code>MappingJackson2HttpMessageConverter</code>, which writes <code>{"message":"Hello world"}</code><p class="quiz-why">A <code>Map</code> is not a <code>String</code> or bytes, so Jackson is the first converter that can write it as <code>application/json</code>.</p></li>
<li>springdoc, because the endpoint is documented<p class="quiz-whynot">springdoc only describes endpoints; it is not involved in answering them.</p></li>
</ol>
<p class="quiz-explain">The same route serves every entity from chapter 9 on: the controller returns an object and Jackson turns it into JSON, guided by the entity's <code>@JsonProperty</code> annotations.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">The Swagger UI is opened at <code>http://localhost:8081/techolympiad/...</code>. Why does the server <code>/</code> send requests to <code>http://localhost:8081/api/v1/hello</code>?</p>
<ol class="quiz-options">
<li>springdoc forgets the context path when it generates the paths<p class="quiz-whynot">Leaving the context path out of the paths is correct; the application never sees it. The server URL is supposed to supply it.</p></li>
<li data-correct>A relative server URL is resolved against the document's address, and <code>/</code> resolves to the root of the host<p class="quiz-why">Like a link <code>href="/"</code> on any page of a site, it drops the whole path, context path included.</p></li>
<li>Tomcat strips the context path from the Swagger UI's requests<p class="quiz-whynot">Tomcat strips it inside the application, after routing. The UI's request never contained it.</p></li>
</ol>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">Why is <code>BASE_URL</code> declared <code>static final</code>?</p>
<ol class="quiz-options">
<li>To keep other packages from changing it<p class="quiz-whynot"><code>final</code> does prevent reassignment, but package-private visibility already keeps other packages away. The real reason is the annotation.</p></li>
<li data-correct>Annotation values must be compile-time constants, and only a <code>static final</code> field with a constant initializer is one<p class="quiz-why">Then <code>V1Config.BASE_URL + "/hello"</code> is itself a constant expression and allowed in <code>@RequestMapping</code>.</p></li>
<li>Spring only scans <code>static</code> fields for paths<p class="quiz-whynot">Spring reads the annotation's value; it never looks at <code>V1Config</code> itself.</p></li>
</ol>
</div>

### Flashcards

<div class="flashcards" data-flashcards data-front-label="Term" data-back-label="Meaning">
<div class="card"><div class="front"><code>DispatcherServlet</code></div><div class="back">Spring MVC's single servlet at <code>/</code>: finds the handler method, calls it, writes the result.</div></div>
<div class="card"><div class="front"><code>@RestController</code></div><div class="back"><code>@Controller</code> + <code>@ResponseBody</code>: a component whose return values are the response body.</div></div>
<div class="card"><div class="front"><code>produces</code></div><div class="back">The media types a mapping can return. A client that accepts none of them gets 406.</div></div>
<div class="card"><div class="front">HttpMessageConverter</div><div class="back">Writes a return value for a media type. <code>String</code>: <code>StringHttpMessageConverter</code>; objects: Jackson.</div></div>
<div class="card"><div class="front">springdoc</div><div class="back">Generates the OpenAPI document from the handler mappings and serves the Swagger UI. 1.x for Boot 2.</div></div>
<div class="card"><div class="front"><code>GroupedOpenApi</code></div><div class="back">One OpenAPI document (an entry in <em>Select a definition</em>), selected by paths, at <code>/v3/api-docs/{group}</code>.</div></div>
<div class="card"><div class="front">Relaxed binding</div><div class="back"><code>tagsSorter</code>, <code>tags-sorter</code> and <code>TAGS_SORTER</code> are the same property to Spring Boot.</div></div>
<div class="card"><div class="front">Server URL <code>/</code></div><div class="back">Resolves to the host root, so it drops the context path. Pick <code>/techolympiad</code> locally.</div></div>
</div>

### Self-checks

<details class="qa">
<summary>Self-check: which version does the VWO's Swagger page show, and why?</summary>
<div class="ans">
Always <code>1</code>. The bean's version parameter is <code>@Value("1") String appVersion</code>, a literal; the <code>apiPomVersion</code> parameter is injected but never used. TechOlympiad passes <code>apiPomVersion</code> to <code>Info.version</code>.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<details class="qa">
<summary>Self-check: why does <code>spring.main.allow-bean-definition-overriding</code> have to be in <code>application.properties</code> and not in <code>api.properties</code>?</summary>
<div class="ans">
<code>spring.main.*</code> settings are bound to the <code>SpringApplication</code> before the context reads any configuration class, and <code>@PropertySource</code> files are only added while the configuration classes are processed. By then it is too late. <code>application.properties</code> is loaded first.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<details class="qa">
<summary>Self-check: what are the four requests the browser makes before you see the Swagger UI?</summary>
<div class="ans">
<code>/public/swagger-ui.html</code> (a 302 from springdoc), <code>/public/swagger-ui/index.html</code> and its scripts and styles (from the webjar), <code>/v3/api-docs/swagger-config</code> (settings and groups), and <code>/v3/api-docs/v1</code> (the document of the selected group).
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<button type="button" data-mark-done>Mark this chapter done</button>

</div>
