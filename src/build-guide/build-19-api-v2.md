# 19. API version 2

<div class="level-tabs" data-levels>
  <button data-level="overview" aria-pressed="true">Overview</button>
  <button data-level="deep" data-short="Deep">Deep Understanding</button>
  <button data-level="drill">Drilling</button>
</div>

<div class="level overview">

The VWO API answers on three roots at once: `/restapi` (the oldest),
`/api/v1` and `/api/v2`. Each resource has one controller interface with
the endpoints as `default` methods, and one small `@RestController` per
version that implements it and adds a base path. Most `v2` classes add
nothing at all. The ones that do show the three ways a version can
differ: a method is overridden, a method exists only in that class, or
the class maps a different path.

TechOlympiad gets a `v2` package with its own `V2Config`, a second
Swagger group, and three `v2` controllers that cover those cases:

- `v2/SchoolController`: identical to `v1`, under `/api/v2/school`.
- `v2/FunctionController`: retires `v1`'s `DELETE` with a JSON body (`410 Gone`) and adds a `DELETE` with the key in the path.
- `v2/RegistrationFeeController`: adds `GET /api/v2/registration-fee`, all fees at once, which `v1` does not have.

**After this chapter you can:**

- explain how one interface produces endpoints under several base paths;
- change, retire or add an endpoint in one version without touching the other;
- predict and fix the bean name collision between two classes with the same simple name;
- set up a Swagger group per version and mark endpoints deprecated or hidden.

<div class="code-compare" data-code-compare data-labels="VWO v2/SchoolController|TechOlympiad v2/SchoolController">

```java
@RestController
@RequestMapping(path = {V2Config.BASE_URL + "/school"})
@Tag(name = "schools-controller")
public class SchoolController implements be.vwo.common.restAPI.controllers.SchoolController {

    @Getter(onMethod_ = {@Override})
    private final ScholenRepository repository;

    @Autowired
    public SchoolController(ScholenRepository repository) {
        this.repository = repository;
    }

}
```

```java
@RestController
@RequestMapping(path = V2Config.BASE_URL + "/school", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "schools-controller")
@Getter
public class SchoolController implements be.techolympiad.common.restAPI.controllers.SchoolController {

    private final ScholenRepository repository;

    @Autowired
    public SchoolController(ScholenRepository repository) {
        this.repository = repository;
    }
}
```

</div>

</div>

<div class="level deep">

### Why the VWO has more than one version

The API's clients are separate programs: the VWO website, the
registration and bookkeeping tools, the Kangoeroe apps. They are not
released together with the API, so a URL or a JSON shape cannot simply
change. When the VWO wanted cleaner URLs, it added them in a new version
and left the old ones in place:

<div class="table-wrap">

| Resource | `v1` paths | `v2` path |
|---|---|---|
| VWO registration | `/api/v1/vwo-participation`, `/restapi/vwo-participation` | `/api/v2/vwo/participation` |
| Answer string | `/api/v1/answer-string`, `/api/v1/answerString` and both under `/restapi` | `/api/v2/answer-string`, `/api/v2/answer/string` |
| Kangoeroe classes | `/api/v1/kangoeroeklassenPerSchool`, `/api/v1/kangoeroeClass` | `/api/v2/kangoeroe/class` |

</div>

A `v1` class lists every old spelling in its `@RequestMapping` path
array, with `V1Config.OLD_BASE_URL` (`/restapi`) for the oldest clients.
TechOlympiad has no old clients, so its `V1Config` has only `BASE_URL`.

### One interface, several mappings

Spring MVC's `RequestMappingHandlerMapping` looks at every bean whose
class carries `@Controller` (which `@RestController` includes) or a
type-level `@RequestMapping`. For each such class it walks all methods,
including the `default` methods inherited from interfaces, and looks for
a mapping annotation on the method or on the interface method it
implements. The method's path is then combined with the class's
type-level path.

The interface itself has no type-level `@RequestMapping`, so it never
contributes a base path. That is the whole trick: the same `default`
method is registered once per class that implements the interface, each
time under that class's base path, and each time bound to that bean.
After this chapter the registry holds, among others:

<div class="table-wrap">

| Mapping | Bean | Method |
|---|---|---|
| `GET /api/v1/school/{schoolId}` | `scholenController` | `SchoolController.getById` (inherited) |
| `GET /api/v2/school/{schoolId}` | `schoolController` | `SchoolController.getById` (inherited) |
| `DELETE /api/v1/function` | `functionController.v1` | `FunctionController.delete` (inherited) |
| `DELETE /api/v2/function` | `functionController` | `v2.FunctionController.delete` (overridden) |
| `DELETE /api/v2/function/{personId}/{schoolId}/{function}` | `functionController` | `v2.FunctionController.deleteByKey` |

</div>

Two classes that end up with the same method and path fail at startup
with `IllegalStateException: Ambiguous mapping. Cannot map '...' method
... There is already '...' bean method mapped`. That is the error you get
when a new `v2` class is copied from `v1` and the `V1Config` import is
left in.

Parameter annotations travel the same way. Since Spring 5.1, a
`@RequestBody` or `@PathVariable` declared on the interface method also
applies to an overriding method that does not repeat it.

### Four ways two versions differ

<div class="table-wrap">

| How | VWO example | TechOlympiad example |
|---|---|---|
| Not at all: the class only adds a base path | `v2/SchoolController`, `v2/RegistrationFeeController`, most of `v2` | `v2/SchoolController` |
| Override a `default` method | `v1/FunctionController.update` and `getById` throw `NotImplementedException`, answered `410 Gone` by a local `@ExceptionHandler` | `v2/FunctionController.delete` |
| Add a method only in the class | `v2/UserController.get` and `getByEmail` return a `PersonExtended` record that `v1` does not know | `v2/FunctionController.deleteByKey`, `v2/RegistrationFeeController.getAll` |
| Different paths or a different interface | `v2/VwoParticipationController` at `/vwo/participation`; `v1/LeerlingVWOController` and `v2/VwoParticipantsController` both implement `VwoParticipantsController` | none |

</div>

### Retiring an inherited endpoint

Overriding a `default` method does not remove its mapping. Spring finds
the `@DeleteMapping` on the interface method no matter what the
override says, so the endpoint stays. To take it out of a version you
override it with a body that refuses, and hide it from the docs.
The VWO's `v1/FunctionController` does exactly this:

```java
@ResponseStatus(HttpStatus.GONE)
@ExceptionHandler({NotImplementedException.class})
public ResponseEntity<Void> handle(NotImplementedException ex) {
    return ResponseEntity.status(HttpStatus.GONE).build();
}

@PutMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
@Operation(hidden = true)
@Deprecated
public ResponseEntity<Functies> update(@NotNull Functies entity) {
    throw new NotImplementedException();
}
```

`NotImplementedException` comes from commons-lang3 (Apache Commons Lang,
a general utility library) and is an unchecked exception.
The `@ExceptionHandler` sits in the controller class, so it only applies
to this controller: elsewhere a `NotImplementedException` would still be
a `500`. `410 Gone` tells a client the endpoint existed and will not come
back, which is more useful than a `404`.

TechOlympiad's `v2/FunctionController` uses the pattern for `DELETE
/function` with a body. A `DELETE` request body has no defined meaning in
HTTP, and some proxies and client libraries drop it, so `v2` moves the
key into the path instead.

### Bean names, and the collision

Component scanning names each bean with `AnnotationBeanNameGenerator`:
the value of `@RestController("...")` if there is one, otherwise the
simple class name with a lower-case first letter. The package plays no
part. `v1.FunctionController` and `v2.FunctionController` would both be
`functionController`, and the scan stops:

```text
ConflictingBeanDefinitionException: Annotation-specified bean name 'functionController'
for bean class [be.techolympiad.common.restAPI.controllers.v2.FunctionController] conflicts
with existing, non-compatible bean definition of same name and class
[be.techolympiad.common.restAPI.controllers.v1.FunctionController]
```

The VWO avoids it in three ways, all visible in its `v1` and `v2`
packages:

- **Name the `v1` bean.** `@RestController("functionController.v1")`, `"registrationFeeController.v1"`, `"datesController.v1"` and a dozen more. The `v2` class keeps the default name. Chapter 12 and 13 already did this for TechOlympiad's `v1` classes, in preparation for this chapter.
- **Name both.** `answerController.v1` and `answerController.v2`, `teamController.v1` and `teamController.v2`. Equally correct, more symmetric.
- **Use different class names.** `v1/ScholenController` and `v2/SchoolController`; `v1/LeerlingVWOController` and `v2/VwoParticipantsController`. No collision, at the price of two names for one thing.

The names are not consistent (`VwoParticipationController.v1` starts
with a capital), and nothing depends on them except uniqueness: Spring
MVC never uses a controller's bean name for routing.

#### What `allow-bean-definition-overriding` does and does not do

`application.properties` sets `spring.main.allow-bean-definition-overriding=true`,
copied from the VWO. Since Spring Boot 2.1 the default is `false`: a
second bean definition registered under an existing name fails with
`BeanDefinitionOverrideException`. With `true`, the later definition
silently replaces the earlier one. That applies to definitions that are
registered, such as `@Bean` methods or `<bean id="...">` elements in XML.

It does not apply to component scanning. The scanner checks every
candidate against the registry itself and throws
`ConflictingBeanDefinitionException` for a different class under a taken
name, whatever the flag says. So the flag cannot rescue two
`FunctionController`s. Only distinct names can.

The VWO probably needs the flag for another reason:

1. Its `security/Application.java` is a second `@SpringBootApplication`
   inside the scanned package.
2. So the main context also picks it up as a configuration class.
3. Its `@ImportResource("classpath:applicationContextAPI.xml")` then
   loads the XML a second time.
4. Every XML bean is registered twice under the same id. The flag
   permits exactly this.

TechOlympiad has no such class, so the flag is harmless here. Be aware
that it would also hide a genuine duplicate: the second bean wins,
without a word.

### A Swagger group per version

springdoc builds one OpenAPI document per `GroupedOpenApi` bean, from the
handler methods whose path matches the group's `pathsToMatch`:

```java
@Bean
public GroupedOpenApi v2Api() {
    String[] paths = {"/api/v2/**"};
    return GroupedOpenApi.builder().group("v2").pathsToMatch(paths)
            .build();
}
```

Each group is served at `/v3/api-docs/{group}`, and the Swagger UI shows
a *Select a definition* drop-down with one entry per group. The VWO has
three: `v1`, `v2`, and a `v1-restapi` group for `/restapi/**` whose bean
method is marked `@Deprecated`. That annotation is a note to Java
readers. springdoc still builds the group.

Tags (`@Tag(name = "function-controller")`) are per document, so the
same tag name in `v1` and `v2` gives one section in each group, which is
what you want.

### Deprecated and hidden

Three annotations, three audiences:

<div class="table-wrap">

| Annotation | Effect on Java code | Effect in Swagger | Effect on HTTP |
|---|---|---|---|
| `@Deprecated` (Java) | Compiler warning for Java callers | springdoc marks the operation `deprecated: true`, shown struck through | None: it still answers |
| `@Operation(hidden = true)` or `@Hidden` | None | The operation is left out of the document | None: it still answers |
| `@Deprecated(forRemoval = true)` | A stronger warning: it will be deleted | As `@Deprecated` | None |

</div>

A client never sees a Java annotation. Hiding or deprecating an endpoint
only changes what new clients learn from the docs. To stop old clients,
the endpoint has to answer differently, as the `410` above does. The VWO
puts both `@Deprecated` and `@Hidden` on the interface method
`SchoolController.create`. So the endpoint is gone from Swagger in every
version, but it still works for clients that already call it.

<div class="callout note">
<div class="callout-label">The <code>/restapi</code> root</div>

Every VWO `v1` class also maps `/restapi/...`, and the security
configuration of [chapter 20](build-20-authentication.md) lists
`/restapi/**` among the paths Spring Security ignores, with
`//TODO: block restapi` next to it. The oldest API root is therefore
reachable without a token. TechOlympiad has no `/restapi` root to begin
with.

</div>

### The same idea in ASP.NET Core

ASP.NET Core usually versions with the `Asp.Versioning` package:
`[ApiVersion("2.0")]` on a controller, a route template with
`v{version:apiVersion}`, and one Swagger document per version. Two
controllers called `FunctionController` in namespaces `V1` and `V2` are
no problem there, because the DI container registers types, not names.
Spring's container is keyed by bean name, which is why the collision
above exists at all. Java shares endpoints between versions through
`default` methods on an interface. That is close to a C# interface with
default implementations, but ASP.NET Core does not use those for
routing. In ASP.NET Core, a shared abstract base controller plays that
role.

</div>

<div class="level drill">

### Tasks

<ul class="checklist">
<li><label><input type="checkbox"><span>Create <code>restAPI/controllers/v2/V2Config.java</code>.</span></label></li>
<li><label><input type="checkbox"><span>Create <code>v2/SchoolController</code>, with no endpoints of its own.</span></label></li>
<li><label><input type="checkbox"><span>Check that commons-lang3 is in the pom (<code>NotImplementedException</code> comes from it), then create <code>v2/FunctionController</code>.</span></label></li>
<li><label><input type="checkbox"><span>Create <code>v2/RegistrationFeeController</code> with the extra <code>GET</code>.</span></label></li>
<li><label><input type="checkbox"><span>Add the <code>v2Api()</code> group to <code>OpenApiApplication</code>.</span></label></li>
<li><label><input type="checkbox"><span>Build, restart and work through <em>Run it</em>, including breaking the bean name on purpose.</span></label></li>
<li><label><input type="checkbox"><span>Commit: <code>git add -A &amp;&amp; git commit -m "Add API version 2"</code>.</span></label></li>
</ul>

### Configuration

`restAPI/controllers/v2/V2Config.java`

```java
package be.techolympiad.common.restAPI.controllers.v2;

public class V2Config {

    static final String BASE_URL = "/api/v2";

}
```

`BASE_URL` is package-private, like the VWO's, so only classes in `v2`
can use it. The same holds for `V1Config.BASE_URL` in `v1`, so a `v2`
class cannot use the `v1` constant by accident.

If `mvn dependency:tree -Dincludes=org.apache.commons:commons-lang3`
shows nothing, add the dependency the spec copies from the VWO:

```xml
<dependency>
    <groupId>org.apache.commons</groupId>
    <artifactId>commons-lang3</artifactId>
    <version>3.17.0</version>
</dependency>
```

### The three controllers

`restAPI/controllers/v2/SchoolController.java`

```java
package be.techolympiad.common.restAPI.controllers.v2;

import be.techolympiad.common.restAPI.repositories.ScholenRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(path = V2Config.BASE_URL + "/school", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "schools-controller")
@Getter
public class SchoolController implements be.techolympiad.common.restAPI.controllers.SchoolController {

    private final ScholenRepository repository;

    @Autowired
    public SchoolController(ScholenRepository repository) {
        this.repository = repository;
    }
}
```

The class has the interface's simple name, so `implements` spells the
interface out in full. Its bean name is `schoolController`. The `v1`
class is `ScholenController`, with the bean name `scholenController`, so
the two names do not collide.
Use the same `@Tag` name as your `v1` class.

`restAPI/controllers/v2/FunctionController.java`

```java
package be.techolympiad.common.restAPI.controllers.v2;

import be.techolympiad.common.Configuration;
import be.techolympiad.common.dbEntities.Functies;
import be.techolympiad.common.dbEntities.FunctiesPK;
import be.techolympiad.common.restAPI.repositories.FunctiesRepository;
import be.techolympiad.common.restAPI.repositories.PersoonRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Getter;
import org.apache.commons.lang3.NotImplementedException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(path = V2Config.BASE_URL + "/function", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "function-controller")
@Getter
public class FunctionController implements be.techolympiad.common.restAPI.controllers.FunctionController {

    private final FunctiesRepository functionsRepository;
    private final PersoonRepository personRepository;

    @Autowired
    public FunctionController(FunctiesRepository functionsRepository, PersoonRepository personRepository) {
        this.functionsRepository = functionsRepository;
        this.personRepository = personRepository;
    }

    @ResponseStatus(HttpStatus.GONE)
    @ExceptionHandler(NotImplementedException.class)
    public ResponseEntity<Void> handle(NotImplementedException ex) {
        return ResponseEntity.status(HttpStatus.GONE).build();
    }

    @Override
    @Operation(hidden = true)
    @Deprecated
    public void delete(Functies function) {
        throw new NotImplementedException("Use DELETE /function/{personId}/{schoolId}/{function}");
    }

    @DeleteMapping("/{personId}/{schoolId}/{function}")
    @Operation(summary = "Remove a responsable from a school and edition")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteByKey(@PathVariable("personId") short personId,
                            @PathVariable("schoolId") short schoolId,
                            @PathVariable("function") Configuration.ToRole function) {
        getFunctionsRepository().deleteById(new FunctiesPK(personId, schoolId, function));
    }
}
```

<div class="code-walk" data-code-walk>

```java
public class FunctionController implements be.techolympiad.common.restAPI.controllers.FunctionController { // (1)
    @ExceptionHandler(NotImplementedException.class)                                                      // (2)
    @Override                                                                                             // (3)
    @Operation(hidden = true)                                                                             // (4)
    public void delete(Functies function) {                                                               // (5)
    @DeleteMapping("/{personId}/{schoolId}/{function}")                                                   // (6)
        getFunctionsRepository().deleteById(new FunctiesPK(personId, schoolId, function));                // (7)
```

1. No explicit bean name: this is `functionController`, and `v1`'s is `functionController.v1` since chapter 12.
2. Local to this class: `v1`'s inherited `delete` still answers `204`.
3. The `@DeleteMapping(consumes = JSON)` and `@ResponseStatus(NO_CONTENT)` of the interface method still apply, so `DELETE /api/v2/function` is still mapped. Only the body changes.
4. Removes the operation from the `v2` document. The interface's `@Operation(summary = ...)` is not consulted because this one is found first.
5. No `@RequestBody` here. The one on the interface parameter is inherited, so a body is still read (and required) before the method throws.
6. A method that exists only in `v2`. Its path is combined with the class's `/api/v2/function`.
7. The two `short`s are boxed to the `Short` fields of `FunctiesPK`'s all-arguments constructor. `{function}` goes through `ToRoleConverter`, so `sto` works.

</div>

`restAPI/controllers/v2/RegistrationFeeController.java`

```java
package be.techolympiad.common.restAPI.controllers.v2;

import be.techolympiad.common.Configuration;
import be.techolympiad.common.restAPI.repositories.RegistrationFeeRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.EnumMap;
import java.util.Map;

@RestController
@RequestMapping(path = V2Config.BASE_URL + "/registration-fee", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "registration-fee-controller")
@Getter
public class RegistrationFeeController implements be.techolympiad.common.restAPI.controllers.RegistrationFeeController {

    private final RegistrationFeeRepository repository;

    @Autowired
    public RegistrationFeeController(RegistrationFeeRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    @Operation(summary = "Get the registration fee of every edition")
    @ResponseBody
    public ResponseEntity<Map<Configuration.ToRole, Float>> getAll() {
        Map<Configuration.ToRole, Float> fees = new EnumMap<>(Configuration.ToRole.class);
        for (Configuration.ToRole edition : Configuration.ToRole.values()) {
            fees.put(edition, getRepository().getAmount(edition));
        }
        return ResponseEntity.ok().body(fees);
    }
}
```

`EnumMap` keeps its keys in declaration order, and Jackson writes enum
keys by name, so the body is `{"JTO":2.5,"STO":3.0}`. Since chapter 18,
`getAmount` throws `NotFoundException` for an edition without a fee, so
this endpoint answers `404` until both fees exist. The `v1` class from
chapter 13 is already named `registrationFeeController.v1`.

### The Swagger group

`restAPI/OpenApiApplication.java`:

<div class="diff-view" data-diff-view>

```diff
     @Bean
     public GroupedOpenApi v1Api() {
         String[] paths = {"/api/v1/**"};
         return GroupedOpenApi.builder().group("v1").pathsToMatch(paths)
                 .build();
     }
 
+    @Bean
+    public GroupedOpenApi v2Api() {
+        String[] paths = {"/api/v2/**"};
+        return GroupedOpenApi.builder().group("v2").pathsToMatch(paths)
+                .build();
+    }
+
     @Override
     protected SpringApplicationBuilder configure(SpringApplicationBuilder application) {
```

</div>

### Run it

```bash
mvn -q -DskipTests -Plocal package && docker compose restart api
```

1. Open `http://localhost:8081/techolympiad/public/swagger-ui.html`. The
   *Select a definition* drop-down at the top right now offers `v1` and
   `v2`. In `v2` you see three sections. The `function-controller`
   section has no plain `DELETE /api/v2/function`, and does have
   `DELETE /api/v2/function/{personId}/{schoolId}/{function}`.
2. Same data, two roots:

   ```bash
   curl -s http://localhost:8081/techolympiad/api/v1/school/1
   curl -s http://localhost:8081/techolympiad/api/v2/school/1
   ```

   Both print the same school.
3. A `v2`-only endpoint, and its absence in `v1`:

   ```bash
   curl -s http://localhost:8081/techolympiad/api/v2/registration-fee
   curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8081/techolympiad/api/v1/registration-fee
   ```

   The first prints `{"JTO":2.5,"STO":3.0}`, the second `404`.
4. The retired endpoint. Add a function, then try to delete it the `v1`
   way under `v2`, then the `v2` way:

   ```bash
   curl -s -X POST http://localhost:8081/techolympiad/api/v2/function \
     -H 'Content-Type: application/json' -d '{"personId": 1, "schoolId": 3, "function": "STO"}'
   curl -s -o /dev/null -w '%{http_code}\n' -X DELETE http://localhost:8081/techolympiad/api/v2/function \
     -H 'Content-Type: application/json' -d '{"personId": 1, "schoolId": 3, "function": "STO"}'
   curl -s -o /dev/null -w '%{http_code}\n' -X DELETE http://localhost:8081/techolympiad/api/v2/function/1/3/sto
   ```

   `410`, then `204`. The same body `DELETE` under `/api/v1/function`
   still answers `204`.
5. Break the bean name on purpose. In `v1/FunctionController`, change
   `@RestController("functionController.v1")` to `@RestController`,
   build and restart. `docker compose logs api` shows the
   `ConflictingBeanDefinitionException` from above, and every URL now
   answers `404`: the application did not start, although
   `allow-bean-definition-overriding` is `true`. Put the name back.

<div class="callout danger">
<div class="callout-label">When it breaks</div>

- **`Ambiguous mapping. Cannot map 'functionController' method`**: a `v2` class still uses `V1Config.BASE_URL`, or two `v2` methods map the same method and path. Check the imports and the `@RequestMapping` of the new class.
- **`ConflictingBeanDefinitionException`**: a `v1` and a `v2` class share a simple name and neither has an explicit bean name. Name the `v1` one, `"xxxController.v1"`.
- **The `v2` drop-down entry is missing**: the `v2Api()` method lacks `@Bean`, or its path pattern has a typo. `http://localhost:8081/techolympiad/v3/api-docs/v2` must return JSON.
- **`DELETE /api/v2/function` answers `400` instead of `410`**: you sent no body. The inherited `@RequestBody` is required, and binding fails before the method runs.
- **`cannot find symbol: class NotImplementedException`**: commons-lang3 is not in the pom.

</div>

### Quiz

<div class="quiz" data-quiz>
<p class="quiz-q">You override <code>delete</code> in <code>v2/FunctionController</code> without any annotation. Is <code>DELETE /api/v2/function</code> still mapped?</p>
<ol class="quiz-options">
<li>No: an override without <code>@DeleteMapping</code> removes the mapping<p class="quiz-whynot">Spring looks for the mapping on the interface method too, and finds it there.</p></li>
<li data-correct>Yes: the mapping on the interface method still applies, only the body is new<p class="quiz-why">Mapping annotations are searched through the method's hierarchy, so an override inherits them.</p></li>
<li>Startup fails with an ambiguous mapping<p class="quiz-whynot">There is only one method, the override; the interface method is the same method in the hierarchy, not a second handler.</p></li>
</ol>
<p class="quiz-explain">That is why retiring an endpoint means overriding it with a body that refuses, such as the <code>410</code> through <code>NotImplementedException</code>.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q"><code>spring.main.allow-bean-definition-overriding=true</code> is set. Two scanned classes, <code>v1.FunctionController</code> and <code>v2.FunctionController</code>, have no explicit names. What happens?</p>
<ol class="quiz-options">
<li>The <code>v2</code> bean replaces the <code>v1</code> bean, and <code>/api/v1/function</code> disappears<p class="quiz-whynot">That is what the flag would do for two registered definitions, such as <code>@Bean</code> methods. The scanner does not get that far.</p></li>
<li data-correct>Startup fails with <code>ConflictingBeanDefinitionException</code><p class="quiz-why">The component scanner checks each candidate's name itself and refuses a different class under a taken name, regardless of the flag.</p></li>
<li>Both beans exist, because they are in different packages<p class="quiz-whynot">The default bean name is the simple class name; the package is not part of it.</p></li>
</ol>
<p class="quiz-explain">Distinct bean names are the only fix: an explicit name on one of them, or different class names.</p>
</div>

### Flashcards

<div class="flashcards" data-flashcards data-front-label="Term" data-back-label="Meaning">
<div class="card"><div class="front"><code>RequestMappingHandlerMapping</code></div><div class="back">Registers every mapped method of every controller bean, including inherited interface methods, under the class's base path.</div></div>
<div class="card"><div class="front">Default bean name</div><div class="back">The simple class name with a lower-case first letter. The package does not count.</div></div>
<div class="card"><div class="front"><code>ConflictingBeanDefinitionException</code></div><div class="back">Two scanned classes want the same bean name. Not fixed by <code>allow-bean-definition-overriding</code>.</div></div>
<div class="card"><div class="front"><code>allow-bean-definition-overriding</code></div><div class="back">Lets a later registered definition (<code>@Bean</code>, XML) replace one with the same name, silently.</div></div>
<div class="card"><div class="front"><code>GroupedOpenApi</code></div><div class="back">One OpenAPI document per group, built from the paths it matches; one drop-down entry in Swagger UI.</div></div>
<div class="card"><div class="front"><code>@Operation(hidden = true)</code></div><div class="back">Leaves the operation out of the docs. It still answers requests.</div></div>
<div class="card"><div class="front"><code>410 Gone</code></div><div class="back">The resource existed and is gone for good. How the VWO answers a retired endpoint.</div></div>
</div>

### Self-checks

<details class="qa">
<summary>Self-check: the <code>v1</code> and <code>v2</code> controllers share one interface. How does Spring know that <code>getById</code> belongs under <code>/api/v1/school</code> for one bean and <code>/api/v2/school</code> for the other?</summary>
<div class="ans">
It registers handler methods per bean. For each controller bean it finds the inherited <code>@GetMapping("/{schoolId}")</code> and combines it with that bean's class-level <code>@RequestMapping</code> path. The interface has no class-level path of its own.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<details class="qa">
<summary>Self-check: why does marking an endpoint <code>@Deprecated</code> not protect anyone from it?</summary>
<div class="ans">
HTTP clients never see Java annotations. springdoc shows the operation struck through, but the endpoint answers exactly as before. Only a different response, such as <code>410</code>, changes what old clients experience.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<details class="qa">
<summary>Self-check: why does TechOlympiad's <code>v2/SchoolController</code> need no explicit bean name, but <code>v2/FunctionController</code> relies on <code>v1</code> having one?</summary>
<div class="ans">
The <code>v1</code> school class is called <code>ScholenController</code>, so its bean is <code>scholenController</code> and the <code>v2</code> one <code>schoolController</code>. Both function classes are called <code>FunctionController</code>; without <code>"functionController.v1"</code> on the <code>v1</code> class, both would be <code>functionController</code>.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<button type="button" data-mark-done>Mark this chapter done</button>

</div>
