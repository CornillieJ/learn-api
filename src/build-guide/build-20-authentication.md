# 20. Authentication

<div class="level-tabs" data-levels>
  <button data-level="overview" aria-pressed="true">Overview</button>
  <button data-level="deep" data-short="Deep">Deep Understanding</button>
  <button data-level="drill">Drilling</button>
</div>

<div class="level overview">

Until now anyone who can reach port 8081 can archive a contest year.
This chapter puts a login in front of the API, the way the VWO API does
it. A client posts a username and password to `/public/users/login` and
gets a signed token back, a
<dfn data-def="JSON Web Token: three base64url parts (header, payload, signature) joined by dots. The payload carries claims such as the issuer, the expiry and the username; the signature proves the server issued it.">JWT</dfn>.
Every other request carries that token in an `Authorization: Bearer ...`
header. A filter in Spring Security's chain checks it, and the user's
roles from the `API_user_roles` table decide what they may call.

TechOlympiad copies the VWO's `security` package class for class: the
token filter, the provider, the JWT service, the in-memory user store
and the `WebSecurityConfigurerAdapter`. Two things change on purpose.
Passwords are checked with bcrypt, where the VWO's HQL compares against
`sha2(:password, 512)` and cannot match the bcrypt hashes production
stores. And write endpoints get `@PreAuthorize("hasAuthority('ADMIN')")`,
where the VWO enables method security (permission checks on individual
methods) but never uses it.

**After this chapter you can:**

- follow a request through the servlet filter chain into Spring Security's `FilterChainProxy` and out again;
- explain how `AbstractAuthenticationProcessingFilter`, `AuthenticationManager` and an `AuthenticationProvider` cooperate;
- read, build and verify a JWT with jjwt 0.9.1;
- store and check bcrypt password hashes, and seed users into the database;
- protect endpoints by role and log in through Swagger's *Authorize* button.

<div class="code-compare" data-code-compare data-labels="VWO ApiUserDaoImpl.getUser|TechOlympiad login check">

```java
@Override
@Transactional(value = transactionR, readOnly = true)
public Optional<ApiUser> getUser(String username, String password) {
    Session session = getFactoryR().getCurrentSession();
    String hql = "SELECT a FROM ApiUser a "
            + "WHERE a.user = :username "
            + "AND a.password = sha2(:password, 512)";
    Query<ApiUser> query = session.createQuery(hql, type);
    query.setParameter("username", username);
    query.setParameter("password", password);
    return query.uniqueResultOptional();
}
```

```java
// ApiUserDaoImpl: find the user only
String hql = "SELECT a FROM ApiUser a WHERE a.user = :username";

// JwtAuthenticationService: compare in Java, with bcrypt
Optional<ApiUser> userOpt = apiUserDao.findByUsername(username)
        .filter(apiUser -> passwordEncoder.matches(password, apiUser.getPassword()));
```

</div>

</div>

<div class="level deep">

### Filters come before servlets

Tomcat hands every request to a chain of servlet
<dfn data-def="A javax.servlet.Filter: code that runs around a servlet. doFilter(request, response, chain) can inspect or change the request, answer it itself, or call chain.doFilter to pass it on.">filters</dfn>
before the `DispatcherServlet` sees it. Each filter decides to pass the
request on with `chain.doFilter(request, response)` or to answer it
itself. That is ASP.NET Core's middleware pipeline, with `chain.doFilter`
in the role of `await next()`.

Spring Security is one entry in that chain: a `DelegatingFilterProxy`
named `springSecurityFilterChain`, which Spring Boot registers for the
`REQUEST`, `ERROR` and `ASYNC` dispatcher types. It delegates to a bean,
`FilterChainProxy`, which holds one or more
<dfn data-def="An ordered list of Spring Security filters plus a request matcher. FilterChainProxy runs the filters of the first chain whose matcher accepts the request.">SecurityFilterChain</dfn>s
and runs the first one whose matcher accepts the request. The
`web.ignoring()` paths each get a chain with no filters at all.

With the VWO's configuration, the chain for every other request holds
these filters, in this order. Click one to see what it does here:

<div class="layer-explorer" data-layer-explorer data-entry="Request `GET /api/v1/school`, header `Authorization: Bearer eyJ...`" data-exit="`DispatcherServlet`">
<div class="layer" data-name="WebAsyncManagerIntegrationFilter" data-tag="plumbing" data-trace="Makes the security context available to async request processing.">
<p>Copies the security context into async processing. Nothing we use.</p>
</div>
<div class="layer" data-name="SecurityContextPersistenceFilter" data-tag="stateless here" data-trace="Starts with an empty SecurityContext: STATELESS means no session is read or written.">
<p>Normally loads the logged-in user from the HTTP session and saves it back afterwards. With <code>SessionCreationPolicy.STATELESS</code> it starts every request empty and clears the context at the end.</p>
</div>
<div class="layer" data-name="HeaderWriterFilter" data-tag="response headers" data-trace="Adds security headers such as `X-Content-Type-Options` and `Cache-Control: no-cache` to the response.">
<p>Adds <code>X-Content-Type-Options</code>, <code>X-Frame-Options</code>, <code>Cache-Control</code> and similar headers.</p>
</div>
<div class="layer" data-name="RequestCacheAwareFilter, SecurityContextHolderAwareRequestFilter" data-tag="plumbing" data-trace="Wraps the request so that `request.getUserPrincipal()` works.">
<p>Make <code>HttpServletRequest.getUserPrincipal()</code> and <code>isUserInRole()</code> answer from Spring Security.</p>
</div>
<div class="layer" data-name="TokenAuthenticationFilter" data-tag="ours" data-trace="Reads the bearer token, has the AuthenticationManager check it, stores the User in the SecurityContext. A missing or bad token ends the request here with `401`.">
<p>The VWO's own filter, added with <code>addFilterBefore(..., AnonymousAuthenticationFilter.class)</code>. It runs for every protected URL. Success puts an authenticated token in the <code>SecurityContextHolder</code>; failure answers <code>401</code> immediately.</p>
</div>
<div class="layer" data-name="AnonymousAuthenticationFilter" data-tag="fallback" data-trace="A user is already set, so it does nothing.">
<p>If nobody is authenticated by now, it sets an anonymous user. With our filter in front, that never happens on a protected URL.</p>
</div>
<div class="layer" data-name="SessionManagementFilter, ExceptionTranslationFilter" data-tag="errors" data-trace="Watches for AccessDeniedException and AuthenticationException thrown further down.">
<p><code>ExceptionTranslationFilter</code> turns an <code>AuthenticationException</code> thrown later into the entry point's response, and an <code>AccessDeniedException</code> into <code>403</code>.</p>
</div>
<div class="layer" data-name="FilterSecurityInterceptor" data-tag="URL rules" data-trace="Checks `hasAnyAuthority('USER', 'ADMIN')` against the user's authorities, then lets the request through to the DispatcherServlet.">
<p>Applies the <code>authorizeRequests()</code> rules: protected URLs need <code>USER</code> or <code>ADMIN</code>.</p>
</div>
</div>

You can check the list yourself: Spring Security logs it at startup at
`INFO`, as `Will secure any request with [...]`.

### Authentication: manager, provider, token

Spring Security separates reading credentials from checking them:

- An <dfn data-def="An object implementing Authentication: before checking it carries the credentials, after checking it carries the principal (the user) and its authorities, with isAuthenticated() true.">Authentication</dfn> object travels in. Here a `UsernamePasswordAuthenticationToken` whose principal and credentials are both the raw JWT string.
- The `AuthenticationManager` (a `ProviderManager`) asks each `AuthenticationProvider` that supports that type.
- The provider returns a new, authenticated `Authentication` with the user and their `GrantedAuthority` list, or throws an `AuthenticationException`.

The VWO's `TokenAuthenticationProvider` extends
`AbstractUserDetailsAuthenticationProvider`, the base class Spring's
username-and-password provider uses. It implements `retrieveUser` by
treating the credentials as a token: verify it, take the `username`
claim, look the user up. `additionalAuthenticationChecks`, which
normally compares the password, is empty, because a valid signature is
the proof. The base class then checks that the account is enabled and
not locked, and builds the authenticated token with the user's
authorities.

`TokenAuthenticationFilter` extends `AbstractAuthenticationProcessingFilter`,
the base class of Spring's form-login filter. For each request its
`RequestMatcher` accepts (here: every protected URL) it calls
`attemptAuthentication`, which reads the header and hands a token to the
manager. On success the base class stores the result in the
`SecurityContextHolder` and calls the success handler. The VWO overrides
`successfulAuthentication` to call `chain.doFilter` afterwards, because
the base class, written for a login form, would otherwise stop the chain
and redirect. The `NoRedirectStrategy` given to the success handler turns
that redirect into a no-op.

On failure the base class calls its failure handler. The default one,
with no failure URL set, answers `401 Unauthorized` itself. That is what
a request without a token gets, in the VWO and in TechOlympiad. The
`HttpStatusEntryPoint(FORBIDDEN)` the configuration also registers is a
safety net: it only answers when a request reaches the URL rules without
being authenticated, which the filter in front prevents.

```mermaid
sequenceDiagram
    participant C as Client
    participant L as PublicUsersController
    participant A as JwtAuthenticationService
    participant D as ApiUserDao
    participant S as ApiUsers (in memory)
    participant F as TokenAuthenticationFilter
    participant P as TokenAuthenticationProvider
    participant API as Controller
    Note over C,L: /public/** is ignored: no security filters
    C->>L: POST /public/users/login (username, password)
    L->>A: login(username, password)
    A->>D: findByUsername
    D-->>A: ApiUser with bcrypt hash and roles
    A->>A: bcrypt matches? sign JWT
    A-->>L: token + User
    L->>S: save(User)
    L-->>C: 200, the JWT as text
    C->>F: GET /api/v1/school, Authorization: Bearer JWT
    F->>P: authenticate(token)
    P->>A: findByToken(JWT)
    A->>A: verify signature, issuer, expiry
    A->>S: findByUsername(claim)
    S-->>P: User with authorities
    P-->>F: authenticated
    F->>API: chain.doFilter
    API-->>C: 200 with the schools
```

### The user store is in memory

Look closely at the second half of the diagram: the request is
authenticated against `ApiUsers`, a `HashMap` that the login filled, not
against the database. The VWO copied this design from a tutorial
(`package-info.java` names it). Three consequences:

- After a Tomcat restart the map is empty, so every token issued before the restart gets `401` although its signature is fine. Clients have to log in again.
- In the VWO, `PublicUsersController` only saves the user when the map has no entry yet, so a role added in the database takes effect at the next restart. TechOlympiad saves on every login, so it takes effect at the next login.
- The map is shared by all request threads. The VWO's `HashMap` is not safe for concurrent writes; TechOlympiad uses a `ConcurrentHashMap`.

The VWO also has `InMemoryUsers`, a second implementation of the same
interface, which is why `ApiUsers` needs `@Primary` (the annotation that
marks which bean to inject when several match the type). TechOlympiad has one
implementation and no `@Primary`.

### What is in a JWT

A token from TechOlympiad's login looks like this:

```text
eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJ0ZWNob2x5bXBpYWQiLCJpYXQiOjE3OTI0MDA0MDAsImV4cCI6MTc5MjQ0MzYwMCwidXNlcm5hbWUiOiJ0ZWFjaGVyIn0.RGsHBxh-TTAM6qy3a-8QE1jsSpdeDh1oV3HwvHHiI7k
```

Three base64url parts, separated by dots. The first two are plain JSON
that anybody can read:

```json
{"alg":"HS256"}
{"iss":"techolympiad","iat":1792400400,"exp":1792443600,"username":"teacher"}
```

The third is an HMAC-SHA256 of the first two, computed with the server's
secret. Without the secret nobody can produce a matching signature, so
the server can trust the payload without storing anything. That is also
the limit: the payload is signed, not encrypted, so it must never hold a
password, and a token cannot be revoked before its `exp`. The VWO's
`logout` method does nothing for that reason.

jjwt 0.9.1 is the library the VWO uses. Its API is older than the
current jjwt 0.12, so tutorials will not match it:

<div class="table-wrap">

| Call | What it does |
|---|---|
| `Jwts.claims().setIssuer(...).setIssuedAt(...).setExpiration(...)` | Standard claims `iss`, `iat`, `exp` |
| `Jwts.builder().setClaims(claims).signWith(HS256, key).compact()` | Sign and serialise; `key` is a base64 string |
| `Jwts.parser().requireIssuer(...).setSigningKey(key).parseClaimsJws(token)` | Verify signature, issuer and expiry, or throw a `JwtException` |
| `TextCodec.BASE64.encode(secret)` | The VWO's way to turn the configured secret into the base64 key the two calls above expect |

</div>

Two more facts about this version. It does not check the key length;
jjwt 0.10 and later refuse an HS256 key shorter than 256 bits, so use a
secret of at least 32 characters anyway. And it encodes base64 with
`javax.xml.bind.DatatypeConverter`, which Java 11 removed from the JDK;
it works here only because `hibernate-core` brings `jaxb-api` along.

The VWO's `JWTTokenService` also compresses the token with gzip and
implements jjwt's `Clock` interface. TechOlympiad leaves out both.
Compression makes a payload this small longer, and the `zip` header is a
JWE (JSON Web Encryption) feature that other JWT libraries refuse on a signed token. The
custom `Clock` returns the same time as jjwt's default one.

<div class="callout danger">
<div class="callout-label">Not to copy: the VWO's signing key</div>

The VWO reads `@Value("${jwt.secret:secret}")`, and none of its
environment files sets `jwt.secret`. Its tokens are therefore signed
with the hard-coded fallback in the source, and anyone who has read the
source can mint a valid token for any username in the user store.
TechOlympiad's `@Value("${jwt.secret}")` has no fallback: without the
property the application refuses to start.

</div>

### Passwords: bcrypt, and the VWO bug

A password is stored as a hash, never as itself. A general-purpose hash
such as SHA-512 is the wrong tool: it is designed to be fast, so an
attacker with a stolen table can try billions of guesses per second.
<dfn data-def="A password hashing function built on the Blowfish cipher, deliberately slow, with a random salt and a cost factor stored in the hash itself: $2a$12$ means version 2a, 2^12 rounds.">bcrypt</dfn>
is slow on purpose, salts every hash, and stores its own cost:

```text
$2a$12$1ToyN3cqSJu7xOdCI8VCv.iQDo600scm6q/0uJrvKlK.7vDJuac66
 |  |  |                     |
 |  |  22 characters of salt 31 characters of hash
 |  cost 12: 2^12 rounds
 version
```

The result is always 60 characters. A `varchar(72)` column, which the
VWO's production `API_user.password` is, holds it with room to spare (72
is also the longest password bcrypt reads, which is probably where the
size came from).

The VWO's code does not use bcrypt. `ApiUser.password` carries
`@ColumnTransformer(write = "sha2(?, 512)")` and `ApiUserDaoImpl.getUser`
compares `a.password = sha2(:password, 512)` in HQL. SHA-512 in hex is
128 characters: it does not fit the production column, and it never
equals a bcrypt hash. The local VWO database works around it by widening
the column to 128 and seeding SHA-512 hashes. TechOlympiad keeps the
production column and fixes the code: the DAO only finds the user, and
`BCryptPasswordEncoder.matches` compares in Java. It reads the version,
cost and salt from the stored hash, hashes the given password the same
way, and compares in constant time.

Spring Security's `BCryptPasswordEncoder` accepts the `$2a$`, `$2b$` and
`$2y$` prefixes, so hashes from other tools work as they are.

### Roles: authorities, not roles

`User.getAuthorities()` turns each `API_user_roles.role` value into a
`SimpleGrantedAuthority`: `"USER"`, `"ADMIN"`. The URL rule is
`hasAnyAuthority("USER", "ADMIN")`, and the method rule is
`hasAuthority('ADMIN')`.

`hasRole('ADMIN')` would not work. Spring Security's role checks add the
prefix `ROLE_` and look for the authority `ROLE_ADMIN`. The VWO's old,
commented-out `SpringSecurityConfig` uses `.hasRole("ADMIN")` with
in-memory users defined through `.roles(...)`, which adds the prefix on
the way in; the database roles have none.

### Method security

`@EnableGlobalMethodSecurity(prePostEnabled = true)` turns on
`@PreAuthorize`. Spring wraps every bean with such an annotation in a
proxy, the same mechanism `@Transactional` uses, and evaluates the
expression before the method runs. A failed check throws
`AccessDeniedException`.

The annotation may sit on an interface method; Spring Security looks at
the implementing method, then the class, then the interface. On the
`default` methods of the controller interfaces it therefore applies to
`v1` and `v2` alike. Spring Boot creates class-based (CGLIB) proxies by
default, so the proxied controllers keep their annotations and Spring
MVC still finds their mappings.

The VWO enables `prePostEnabled` and has not one `@PreAuthorize`: any
authenticated `USER` may call every endpoint, including the writes.
TechOlympiad puts `hasAuthority('ADMIN')` on every write endpoint and on
the archive. `@EnableGlobalMethodSecurity` was succeeded by
`@EnableMethodSecurity` in Spring Security 5.6; the old one still works
in 5.7 and is what the VWO uses.

An `AccessDeniedException` from method security is thrown inside the
controller call, so Spring MVC's resolvers see it first. Without a
handler it travels on to `ExceptionTranslationFilter`, which answers
`403`. The VWO's `ErrorAdvice` has a handler for it, and so will ours,
to keep the JSON body shape of [chapter 18](build-18-error-handling.md).

### `WebSecurityConfigurerAdapter` is deprecated

The VWO configures all of this by extending `WebSecurityConfigurerAdapter`
and overriding three `configure` methods: one for the
`AuthenticationManagerBuilder`, one for `WebSecurity` (the ignored
paths), one for `HttpSecurity` (the filter chain). Spring Security 5.7,
the version Spring Boot 2.7.18 brings, deprecated that class in favour of
declaring a `SecurityFilterChain` bean and a `WebSecurityCustomizer`
bean. The compiler says so, because chapter 2 turned on
`showDeprecation`. TechOlympiad keeps the adapter, as the VWO does: it
still works on 5.7, and reading the VWO requires knowing it. It is gone
in Spring Security 6.

Spring Security 5.7 also logs a warning for every `web.ignoring()`
pattern: *This is not recommended -- please use permitAll via
HttpSecurity#authorizeHttpRequests instead.* Ignored paths skip every
filter, including the security headers. That is fine for the Swagger UI
and the login, and it is why the login cannot use the token filter's
error handling: a failed login is answered by our own code.

Spring Boot also stops doing two things once this configuration exists.
It drops its default chain (the one that protects everything with a
login form), and, because `TokenAuthenticationProvider` is a bean, it
stops generating the `Using generated security password` user.

### The VWO's leftovers

The VWO's security code holds several earlier attempts. None of them are
copied:

- `restAPI/SpringSecurityConfig.java`: commented out. HTTP Basic with two in-memory users, one of them `admin` with a plain-text password in the source, rules on `/restapi/**` per HTTP method.
- `restAPI/AuthTokenSecurityConfig.java` and `PreAuthTokenHeaderFilter.java`: commented out. A fixed API key in a header, with a `TODO: retrieve this token value from data source`.
- `security/simple/UUIDAuthenticationService.java` and `jwt/TokenAuthenticationService.java`: commented out, from the tutorial.
- `security/Application.java`: a second `@SpringBootApplication` and `SpringBootServletInitializer`. Tomcat finds it as a second web application initializer, so the VWO's log shows a second Spring application starting right after `OpenApiApplication`, and the main context also imports the XML a second time (see [chapter 19](build-19-api-v2.md)).
- `SecurityConfig.configure(WebSecurity)` ignores `/restapi/**` with `//TODO: block restapi`: the whole legacy root works without a token.
- `Configuration.AES_B64_KEY`: an encryption key as a constant in the source. Keys belong in the environment, as `jwt.secret` does here.

</div>

<div class="level drill">

### Tasks

<ul class="checklist">
<li><label><input type="checkbox"><span>Add <code>spring-boot-starter-security</code>, <code>jjwt</code> and (if chapter 19 did not) <code>commons-lang3</code> to the pom.</span></label></li>
<li><label><input type="checkbox"><span>Add <code>API_user</code> and <code>API_user_roles</code> to <code>db/initdb/01-schema.sql</code>, generate two bcrypt hashes, seed the users in <code>03-seed.sql</code>, and rebuild the database with <code>docker compose down -v</code>.</span></label></li>
<li><label><input type="checkbox"><span>Add <code>ApiRole</code> to <code>Configuration</code>, the entities <code>ApiUser</code>, <code>ApiUserRoles</code>, <code>ApiUserRolesPK</code>, and their mappings.</span></label></li>
<li><label><input type="checkbox"><span>Create <code>ApiUserDao</code> and <code>ApiUserDaoImpl</code>.</span></label></li>
<li><label><input type="checkbox"><span>Create the <code>security</code> package: <code>User</code>, <code>UserCrudService</code>, <code>ApiUsers</code>, <code>UserAuthenticationService</code>, <code>NoRedirectStrategy</code>, <code>TokenAuthenticationFilter</code>, <code>TokenAuthenticationProvider</code>, <code>PublicUsersController</code>, <code>SecurityConfig</code>.</span></label></li>
<li><label><input type="checkbox"><span>Create <code>security/jwt</code>: <code>TokenService</code>, <code>JWTTokenService</code>, <code>JwtAuthenticationService</code>. Add <code>jwt.secret</code> to both environment files.</span></label></li>
<li><label><input type="checkbox"><span>Add the bearer scheme to <code>OpenApiApplication</code>.</span></label></li>
<li><label><input type="checkbox"><span>Put <code>@PreAuthorize("hasAuthority('ADMIN')")</code> on every write endpoint and on the archive; add the <code>AccessDeniedException</code> handler to <code>ErrorAdvice</code>.</span></label></li>
<li><label><input type="checkbox"><span>Build, restart and work through <em>Run it</em>.</span></label></li>
<li><label><input type="checkbox"><span>Commit: <code>git add -A &amp;&amp; git commit -m "Add authentication"</code>.</span></label></li>
</ul>

### Dependencies

`pom.xml`, at the end of `<dependencies>`:

<div class="diff-view" data-diff-view>

```diff
+        <dependency>
+            <groupId>org.springframework.boot</groupId>
+            <artifactId>spring-boot-starter-security</artifactId>
+            <version>2.7.18</version>
+        </dependency>
+        <dependency>
+            <groupId>io.jsonwebtoken</groupId>
+            <artifactId>jjwt</artifactId>
+            <version>0.9.1</version>
+        </dependency>
     </dependencies>
```

</div>

The starter brings Spring Security 5.7.11. The moment it is on the
classpath, Spring Boot protects every URL, so add the configuration of
this chapter before you restart Tomcat. The VWO also depends on Guava
(Google's general Java utility library), for `ImmutableMap` and an `AUTHORIZATION` constant; TechOlympiad uses
`Map.of` and Spring's `HttpHeaders.AUTHORIZATION` instead.

### The tables and the users

`db/initdb/01-schema.sql`, at the end:

```sql
CREATE TABLE API_user (
    id         int          NOT NULL AUTO_INCREMENT,
    user       varchar(16)  NOT NULL,
    password   varchar(72)  NOT NULL,
    email      varchar(100) NOT NULL,
    last_login datetime     DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY user (user),
    UNIQUE KEY email (email)
);

CREATE TABLE API_user_roles (
    user_id int                  NOT NULL,
    role    enum('USER','ADMIN') NOT NULL,
    PRIMARY KEY (user_id, role),
    CONSTRAINT API_user_roles_ibfk_1 FOREIGN KEY (user_id) REFERENCES API_user (id) ON DELETE CASCADE
);
```

`user` is a keyword in MariaDB but not a reserved one, so it works as a
column name without backticks, as it does in the VWO's table.

Generate a bcrypt hash for each password. Either with Spring's own
encoder in `jshell`, using the jars Maven already downloaded:

```bash
CP=~/.m2/repository/org/springframework/security/spring-security-crypto/5.7.11/spring-security-crypto-5.7.11.jar:~/.m2/repository/org/springframework/spring-jcl/5.3.39/spring-jcl-5.3.39.jar
printf 'System.out.println(new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder(12).encode("adminpass"));\n/exit\n' > /tmp/bcrypt.jsh
jshell --class-path "$CP" /tmp/bcrypt.jsh
```

or with Apache's `htpasswd`, here from the `httpd` image so nothing is
installed:

```bash
docker run --rm httpd:2.4 htpasswd -bnBC 12 "" adminpass | tr -d ':\n'; echo
```

`-B` selects bcrypt, `-C 12` the cost, `-n` prints instead of writing a
file, and the empty username leaves a leading `:` that `tr` removes.
Every run prints a different hash, because the salt is random; any of
them matches the password.

`db/initdb/03-seed.sql`, at the end. The hashes below are for
`adminpass` and `teacherpass`; yours will differ and work just as well:

```sql
INSERT INTO API_user (id, user, password, email)
VALUES (1, 'admin', '$2a$12$1ToyN3cqSJu7xOdCI8VCv.iQDo600scm6q/0uJrvKlK.7vDJuac66', 'admin@techolympiad.example'),
       (2, 'teacher', '$2a$12$okeFyo1d/IQz2Fs4PO1/Eu6ctqzRQMtOLKUxjTx6lq36W0Qnd2rvK', 'teacher@techolympiad.example');

INSERT INTO API_user_roles (user_id, role)
VALUES (1, 'USER'),
       (1, 'ADMIN'),
       (2, 'USER');
```

The init scripts only run on an empty data volume, so rebuild it:

```bash
docker compose down -v && docker compose up -d
```

That throws away every row you changed by hand in earlier chapters.

### Configuration and entities

`Configuration.java`, next to the other enums:

<div class="diff-view" data-diff-view>

```diff
     public enum Gender {
         M, V, X
     }
+
+    public enum ApiRole {
+        USER, ADMIN
+    }
```

</div>

`dbEntities/ApiUser.java`

```java
package be.techolympiad.common.dbEntities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.*;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Set;

@Entity
@Table(name = "API_user", schema = "TechOlympiad")
@Getter
@Setter
@NoArgsConstructor
public class ApiUser implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer id;

    @Column(name = "user", nullable = false, unique = true)
    private String user;

    @JsonIgnore
    @Column(name = "password", nullable = false)
    private String password;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "last_login")
    private LocalDateTime lastLogin;

    @OneToMany(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private Set<ApiUserRoles> apiUserRoles;
}
```

<div class="code-walk" data-code-walk>

```java
@GeneratedValue(strategy = GenerationType.IDENTITY)    // (1)
@JsonIgnore                                            // (2)
@OneToMany(fetch = FetchType.EAGER)                    // (3)
@JoinColumn(name = "user_id", insertable = false, updatable = false) // (4)
```

1. The database's `AUTO_INCREMENT`. The VWO writes a bare `@GeneratedValue`, which in Hibernate 5 means a sequence called `hibernate_sequence`; it only goes unnoticed because the API never inserts users.
2. The hash never leaves the server, should the entity ever be serialised.
3. The roles are needed after the DAO's transaction has ended, when `new User(apiUser)` reads them. A lazy collection would throw `LazyInitializationException` there, because its session is closed.
4. A one-way association: the foreign key column lives in `API_user_roles`, and this side only reads it. The VWO maps it both ways, with a `@ManyToOne ApiUser` inside the role's key.

</div>

`dbEntities/ApiUserRoles.java`

```java
package be.techolympiad.common.dbEntities;

import be.techolympiad.common.Configuration;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.*;
import java.io.Serializable;

@Entity
@Table(name = "API_user_roles", schema = "TechOlympiad")
@IdClass(ApiUserRolesPK.class)
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode
public class ApiUserRoles implements Serializable {

    @Id
    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Id
    @Column(name = "role", nullable = false)
    @Enumerated(EnumType.STRING)
    private Configuration.ApiRole role;
}
```

`dbEntities/ApiUserRolesPK.java`

```java
package be.techolympiad.common.dbEntities;

import be.techolympiad.common.Configuration;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class ApiUserRolesPK implements Serializable {

    private Integer userId;
    private Configuration.ApiRole role;
}
```

The entity's `equals` and `hashCode` cover the whole key, as chapter 12
explained, so the roles behave in the `Set`.

`hibernate_TO.cfg.xml`:

<div class="diff-view" data-diff-view>

```diff
+    <mapping class="be.techolympiad.common.dbEntities.ApiUser"/>
+    <mapping class="be.techolympiad.common.dbEntities.ApiUserRoles"/>
   </session-factory>
 </hibernate-configuration>
```

</div>

### The DAO

`dao/ApiUserDao.java`

```java
package be.techolympiad.common.dao;

import be.techolympiad.common.dbEntities.ApiUser;
import org.springframework.data.repository.NoRepositoryBean;

import java.util.Optional;

@NoRepositoryBean
public interface ApiUserDao extends TechOlympiadDao<ApiUser, Integer> {

    Optional<ApiUser> findByUsername(String username);

    void updateLastLogin(String username);
}
```

`dao/impl/ApiUserDaoImpl.java`

```java
package be.techolympiad.common.dao.impl;

import be.techolympiad.common.dao.ApiUserDao;
import be.techolympiad.common.dbEntities.ApiUser;
import org.hibernate.Session;
import org.hibernate.query.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public class ApiUserDaoImpl extends TechOlympiadDaoImpl<ApiUser, Integer> implements ApiUserDao {

    @Override
    @Transactional(value = transactionR, readOnly = true)
    public Optional<ApiUser> findByUsername(String username) {
        Session session = getFactoryR().getCurrentSession();
        String hql = "SELECT a FROM ApiUser a WHERE a.user = :username";
        Query<ApiUser> query = session.createQuery(hql, type);
        query.setParameter("username", username);
        return query.uniqueResultOptional();
    }

    @Override
    @Transactional(value = transactionRW)
    public void updateLastLogin(String username) {
        Session session = getFactoryRW().getCurrentSession();
        String hql = "UPDATE ApiUser a SET a.lastLogin = :date WHERE a.user = :username";
        session.createQuery(hql)
                .setParameter("date", LocalDateTime.now())
                .setParameter("username", username)
                .executeUpdate();
    }
}
```

The read goes through `toR`, the update of `last_login` through `toRW`,
exactly as the VWO's `getUser` and `updateUser`. `to_write` has `UPDATE`
on the whole schema since chapter 7, so no new grant is needed.

### The user and its store

`security/User.java`

```java
package be.techolympiad.common.security;

import be.techolympiad.common.dbEntities.ApiUser;
import lombok.ToString;
import lombok.Value;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Set;
import java.util.stream.Collectors;

@Value
public class User implements UserDetails {
    private static final long serialVersionUID = 1L;

    String id;
    String username;
    @ToString.Exclude
    String password;
    Set<String> roles;

    public User(ApiUser apiUser) {
        this.id = apiUser.getUser();
        this.username = apiUser.getUser();
        this.password = apiUser.getPassword();
        this.roles = apiUser.getApiUserRoles().stream()
                .map(apiUserRoles -> apiUserRoles.getRole().name())
                .collect(Collectors.toUnmodifiableSet());
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return roles.stream().map(SimpleGrantedAuthority::new).collect(Collectors.toList());
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
```

Lombok's `@Value` makes the fields `private final`, generates the
getters (`getUsername()` and `getPassword()` implement `UserDetails`),
`equals`, `hashCode` and `toString`, and no constructor because there is
an explicit one. `@ToString.Exclude` keeps the hash out of log lines.
The VWO's `User` also has a Jackson constructor and a builder, for the
`register` and `/users/current` endpoints of the tutorial, which
TechOlympiad does not have.

`security/UserCrudService.java`

```java
package be.techolympiad.common.security;

import java.util.Optional;

public interface UserCrudService {

    User save(User user);

    Optional<User> find(String id);

    Optional<User> findByUsername(String username);
}
```

`security/ApiUsers.java`

```java
package be.techolympiad.common.security;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import static java.util.Optional.ofNullable;

@Service
final class ApiUsers implements UserCrudService {

    private final Map<String, User> users = new ConcurrentHashMap<>();

    @Override
    public User save(final User user) {
        users.put(user.getId(), user);
        return user;
    }

    @Override
    public Optional<User> find(final String id) {
        return ofNullable(users.get(id));
    }

    @Override
    public Optional<User> findByUsername(final String username) {
        return users.values().stream()
                .filter(u -> Objects.equals(username, u.getUsername()))
                .findFirst();
    }
}
```

The VWO's `save` returns `users.put(...)`, which is the previous value,
so `null` on a first save. Nothing reads it, but ours returns the user.
The class is package-private and `final`, like the VWO's; Spring creates
it through reflection all the same.

### The JWT service

`security/jwt/TokenService.java`

```java
package be.techolympiad.common.security.jwt;

import java.util.Map;

/**
 * Creates and validates tokens.
 */
public interface TokenService {

    String expiring(Map<String, String> attributes);

    Map<String, String> verify(String token);
}
```

The VWO's interface also has `permanent` (a token without expiry) and
`untrusted` (read a token without checking its signature). Nothing calls
them; they are left out.

`security/jwt/JWTTokenService.java`

```java
package be.techolympiad.common.security.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jwts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import static io.jsonwebtoken.SignatureAlgorithm.HS256;
import static io.jsonwebtoken.impl.TextCodec.BASE64;
import static java.util.Objects.requireNonNull;

@Service
final class JWTTokenService implements TokenService {

    private final String issuer;
    private final int expirationSec;
    private final int clockSkewSec;
    private final String secretKey;

    JWTTokenService(@Value("${jwt.issuer:techolympiad}") final String issuer,
                    @Value("${jwt.expiration-sec:43200}") final int expirationSec,
                    @Value("${jwt.clock-skew-sec:300}") final int clockSkewSec,
                    @Value("${jwt.secret}") final String secret) {
        this.issuer = requireNonNull(issuer);
        this.expirationSec = expirationSec;
        this.clockSkewSec = clockSkewSec;
        this.secretKey = BASE64.encode(requireNonNull(secret));
    }

    @Override
    public String expiring(final Map<String, String> attributes) {
        final Instant now = Instant.now();
        final Claims claims = Jwts.claims()
                .setIssuer(issuer)
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(now.plusSeconds(expirationSec)));
        claims.putAll(attributes);
        return Jwts.builder()
                .setClaims(claims)
                .signWith(HS256, secretKey)
                .compact();
    }

    @Override
    public Map<String, String> verify(final String token) {
        final JwtParser parser = Jwts.parser()
                .requireIssuer(issuer)
                .setAllowedClockSkewSeconds(clockSkewSec)
                .setSigningKey(secretKey);
        try {
            final Map<String, String> attributes = new HashMap<>();
            parser.parseClaimsJws(token).getBody()
                    .forEach((key, value) -> attributes.put(key, String.valueOf(value)));
            return attributes;
        } catch (IllegalArgumentException | JwtException e) {
            return Map.of();
        }
    }
}
```

<div class="code-walk" data-code-walk>

```java
@Value("${jwt.expiration-sec:43200}") final int expirationSec,   // (1)
@Value("${jwt.secret}") final String secret) {                     // (2)
this.secretKey = BASE64.encode(requireNonNull(secret));            // (3)
claims.putAll(attributes);                                         // (4)
parser.parseClaimsJws(token)                                       // (5)
} catch (IllegalArgumentException | JwtException e) {              // (6)
```

1. `:43200` is the default when the property is absent: 12 hours. The VWO's default is 86400, a day.
2. No default: a missing secret fails the startup with `Could not resolve placeholder 'jwt.secret'`.
3. jjwt 0.9.1's `signWith(alg, String)` and `setSigningKey(String)` expect base64. Encoding the secret's UTF-8 bytes makes those bytes the HMAC key.
4. The custom claim, `username`. `Claims` is a `Map<String, Object>`.
5. `parseClaimsJws` (with an *s*) requires a signature. `parseClaimsJwt` would accept an unsigned token, the trap the VWO's `untrusted` method walks into on purpose.
6. An expired, tampered or malformed token, or one from another issuer, ends here. An empty map means: no `username`, no user.

</div>

`security/jwt/JwtAuthenticationService.java`

```java
package be.techolympiad.common.security.jwt;

import be.techolympiad.common.dao.ApiUserDao;
import be.techolympiad.common.dbEntities.ApiUser;
import be.techolympiad.common.security.User;
import be.techolympiad.common.security.UserAuthenticationService;
import be.techolympiad.common.security.UserCrudService;
import org.apache.commons.lang3.tuple.Pair;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;

@Service
final class JwtAuthenticationService implements UserAuthenticationService {

    private final TokenService tokens;
    private final UserCrudService users;
    private final ApiUserDao apiUserDao;
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Autowired
    JwtAuthenticationService(TokenService tokens, UserCrudService users, ApiUserDao apiUserDao) {
        this.tokens = tokens;
        this.users = users;
        this.apiUserDao = apiUserDao;
    }

    @Override
    public Optional<Pair<String, User>> login(final String username, final String password) {
        Optional<ApiUser> userOpt = apiUserDao.findByUsername(username)
                .filter(apiUser -> passwordEncoder.matches(password, apiUser.getPassword()));
        if (userOpt.isEmpty()) {
            return Optional.empty();
        }
        ApiUser apiUser = userOpt.get();
        apiUserDao.updateLastLogin(apiUser.getUser());
        String token = tokens.expiring(Map.of("username", username));
        return Optional.of(Pair.of(token, new User(apiUser)));
    }

    @Override
    public Optional<User> findByToken(final String token) {
        return Optional.ofNullable(tokens.verify(token).get("username"))
                .flatMap(users::findByUsername);
    }
}
```

The encoder is a field, not a bean. A `PasswordEncoder` bean declared in
`SecurityConfig` would make a cycle: `SecurityConfig` needs the provider,
the provider needs this service, and this service would need
`SecurityConfig` to exist first. Spring Boot 2.6 and later refuse such
cycles at startup.

`security/UserAuthenticationService.java`

```java
package be.techolympiad.common.security;

import org.apache.commons.lang3.tuple.Pair;

import java.util.Optional;

public interface UserAuthenticationService {

    /**
     * Logs in with the given username and password; the token and the user when it succeeds.
     */
    Optional<Pair<String, User>> login(String username, String password);

    Optional<User> findByToken(String token);
}
```

The VWO's interface also declares `logout`, implemented as `// Nothing
to doy`. A JWT cannot be logged out, so the method goes.

### The filter, the provider, the configuration

`security/NoRedirectStrategy.java`

```java
package be.techolympiad.common.security;

import org.springframework.security.web.RedirectStrategy;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

class NoRedirectStrategy implements RedirectStrategy {

    @Override
    public void sendRedirect(final HttpServletRequest request, final HttpServletResponse response, final String url) {
        // A REST API answers the request itself; nothing to redirect to
    }
}
```

`security/TokenAuthenticationFilter.java`

```java
package be.techolympiad.common.security;

import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.AbstractAuthenticationProcessingFilter;
import org.springframework.security.web.util.matcher.RequestMatcher;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

import static java.util.Optional.ofNullable;
import static org.apache.commons.lang3.StringUtils.removeStart;
import static org.springframework.http.HttpHeaders.AUTHORIZATION;

final class TokenAuthenticationFilter extends AbstractAuthenticationProcessingFilter {
    private static final String BEARER = "Bearer";

    TokenAuthenticationFilter(final RequestMatcher requiresAuth) {
        super(requiresAuth);
    }

    @Override
    public Authentication attemptAuthentication(final HttpServletRequest request, final HttpServletResponse response) {
        final String token = ofNullable(request.getHeader(AUTHORIZATION))
                .map(value -> removeStart(value, BEARER))
                .map(String::trim)
                .orElseThrow(() -> new BadCredentialsException("Missing Authentication Token"));

        final Authentication auth = new UsernamePasswordAuthenticationToken(token, token);
        return getAuthenticationManager().authenticate(auth);
    }

    @Override
    protected void successfulAuthentication(final HttpServletRequest request,
                                            final HttpServletResponse response,
                                            final FilterChain chain,
                                            final Authentication authResult) throws IOException, ServletException {
        super.successfulAuthentication(request, response, chain, authResult);
        chain.doFilter(request, response);
    }
}
```

The VWO's filter also accepts the token as a query parameter `t`. A URL
ends up in Tomcat's access log, the browser history and proxy logs, so a
token in it leaks; TechOlympiad reads the header only. The local VWO
copy also has a branch that accepts HTTP Basic credentials; it is a
local addition and not part of what we mirror.

`security/TokenAuthenticationProvider.java`

```java
package be.techolympiad.common.security;

import lombok.AllArgsConstructor;
import lombok.NonNull;
import lombok.experimental.FieldDefaults;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authentication.dao.AbstractUserDetailsAuthenticationProvider;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;

import java.util.Optional;

import static lombok.AccessLevel.PACKAGE;
import static lombok.AccessLevel.PRIVATE;

@Component
@AllArgsConstructor(access = PACKAGE)
@FieldDefaults(level = PRIVATE, makeFinal = true)
final class TokenAuthenticationProvider extends AbstractUserDetailsAuthenticationProvider {
    @NonNull
    UserAuthenticationService auth;

    @Override
    protected void additionalAuthenticationChecks(final UserDetails d, final UsernamePasswordAuthenticationToken auth) {
        // The token's signature is the check; there is no password to compare
    }

    @Override
    protected UserDetails retrieveUser(final String username, final UsernamePasswordAuthenticationToken authentication) {
        final Object token = authentication.getCredentials();
        return Optional.ofNullable(token)
                .map(String::valueOf)
                .flatMap(auth::findByToken)
                .orElseThrow(() -> new UsernameNotFoundException("Cannot find a user for the authentication token"));
    }
}
```

`@FieldDefaults(level = PRIVATE, makeFinal = true)` makes every field
`private final`, and `@AllArgsConstructor(access = PACKAGE)` writes the
constructor Spring injects through; Lombok's `@NonNull` adds a null
check to it. The VWO's message puts the token itself in the exception
text, where it can end up in a log; ours does not.
`AbstractUserDetailsAuthenticationProvider` turns the
`UsernameNotFoundException` into a `BadCredentialsException`, so the
filter answers `401` either way.

`security/PublicUsersController.java`

```java
package be.techolympiad.common.security;

import lombok.AllArgsConstructor;
import lombok.NonNull;
import lombok.experimental.FieldDefaults;
import org.apache.commons.lang3.tuple.Pair;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import static lombok.AccessLevel.PACKAGE;
import static lombok.AccessLevel.PRIVATE;

@RestController
@RequestMapping("/public/users")
@FieldDefaults(level = PRIVATE, makeFinal = true)
@AllArgsConstructor(access = PACKAGE)
final class PublicUsersController {
    @NonNull
    UserAuthenticationService authentication;
    @NonNull
    UserCrudService users;

    @PostMapping("/login")
    String login(@RequestParam("username") final String username,
                 @RequestParam("password") final String password) {
        Pair<String, User> login = authentication.login(username, password)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid login and/or password"));
        users.save(login.getValue());
        return login.getKey();
    }
}
```

The VWO throws a plain `RuntimeException` for a wrong password, which
reaches the client as `500`. `ResponseStatusException` goes through
`ResponseStatusExceptionResolver` from chapter 18 and becomes `401`.
`@RequestParam` reads query parameters and form fields alike; send them
as a form body, so the password does not appear in Tomcat's access log.
The path is not under `/api/v1/**` or `/api/v2/**`, so neither Swagger
group shows it, as in the VWO.

`security/SecurityConfig.java`

```java
package be.techolympiad.common.security;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.method.configuration.EnableGlobalMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.builders.WebSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.security.web.util.matcher.NegatedRequestMatcher;
import org.springframework.security.web.util.matcher.OrRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;

import static java.util.Objects.requireNonNull;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.security.config.http.SessionCreationPolicy.STATELESS;

@Configuration
@EnableWebSecurity
@EnableGlobalMethodSecurity(prePostEnabled = true)
class SecurityConfig extends WebSecurityConfigurerAdapter {
    private static final RequestMatcher PUBLIC_URLS = new OrRequestMatcher(
            new AntPathRequestMatcher("/public/**")
    );
    private static final RequestMatcher PROTECTED_URLS = new NegatedRequestMatcher(PUBLIC_URLS);

    private final TokenAuthenticationProvider provider;

    SecurityConfig(final TokenAuthenticationProvider provider) {
        super();
        this.provider = requireNonNull(provider);
    }

    @Override
    protected void configure(final AuthenticationManagerBuilder auth) {
        auth.authenticationProvider(provider);
    }

    @Override
    public void configure(final WebSecurity web) {
        web.ignoring().antMatchers("/public/**", "/swagger-ui/**", "/v3/api-docs/**");
    }

    @Override
    protected void configure(final HttpSecurity http) throws Exception {
        http
                .sessionManagement()
                .sessionCreationPolicy(STATELESS)
                .and()
                .exceptionHandling()
                .defaultAuthenticationEntryPointFor(forbiddenEntryPoint(), PROTECTED_URLS)
                .and()
                .addFilterBefore(restAuthenticationFilter(), AnonymousAuthenticationFilter.class)
                .authorizeRequests()
                .requestMatchers(PROTECTED_URLS)
                .hasAnyAuthority("USER", "ADMIN")
                .anyRequest()
                .authenticated()
                .and()
                .csrf().disable()
                .formLogin().disable()
                .httpBasic().disable()
                .logout().disable();
    }

    @Bean
    TokenAuthenticationFilter restAuthenticationFilter() throws Exception {
        final TokenAuthenticationFilter filter = new TokenAuthenticationFilter(PROTECTED_URLS);
        filter.setAuthenticationManager(authenticationManager());
        filter.setAuthenticationSuccessHandler(successHandler());
        return filter;
    }

    @Bean
    SimpleUrlAuthenticationSuccessHandler successHandler() {
        final SimpleUrlAuthenticationSuccessHandler successHandler = new SimpleUrlAuthenticationSuccessHandler();
        successHandler.setRedirectStrategy(new NoRedirectStrategy());
        return successHandler;
    }

    @Bean
    FilterRegistrationBean<TokenAuthenticationFilter> disableAutoRegistration(final TokenAuthenticationFilter filter) {
        final FilterRegistrationBean<TokenAuthenticationFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    AuthenticationEntryPoint forbiddenEntryPoint() {
        return new HttpStatusEntryPoint(FORBIDDEN);
    }
}
```

<div class="code-walk" data-code-walk>

```java
private static final RequestMatcher PROTECTED_URLS = new NegatedRequestMatcher(PUBLIC_URLS); // (1)
protected void configure(final AuthenticationManagerBuilder auth) {                           // (2)
web.ignoring().antMatchers("/public/**", "/swagger-ui/**", "/v3/api-docs/**");               // (3)
.sessionCreationPolicy(STATELESS)                                                             // (4)
.addFilterBefore(restAuthenticationFilter(), AnonymousAuthenticationFilter.class)             // (5)
.csrf().disable()                                                                             // (6)
filter.setAuthenticationManager(authenticationManager());                                     // (7)
registration.setEnabled(false);                                                               // (8)
```

1. Everything that is not `/public/**`. Matchers see the path inside the application, so `/techolympiad` is not part of it.
2. The `AuthenticationManager` this adapter builds holds only our provider. The VWO also calls `http.authenticationProvider(provider)`, which adds it a second time to another manager nobody uses; we skip that.
3. No filters at all for the login, the Swagger UI (springdoc serves it under `/public/swagger-ui.html` and `/swagger-ui/...`) and the API documents. The VWO's list also has `/restapi/**`.
4. No HTTP session is created or read; the token is the only state.
5. Our filter sits right before the anonymous fallback.
6. CSRF (cross-site request forgery: another site making the browser send a request with your cookies) protection defends cookie-based sessions. A bearer header is never sent by a browser on its own, so there is nothing to defend.
7. `authenticationManager()` is the adapter's method that returns the manager from step 2.
8. Every `Filter` bean is registered by Spring Boot as a servlet filter for all URLs. Without this, the token filter would also run outside Spring Security, in front of the login and the Swagger UI.

</div>

### The secret

Both environment files get one line. In
`environmentAPI.local.properties` a value of your own, at least 32
characters, for example:

```properties
jwt.secret=techolympiad-local-development-secret-0123456789
```

In `environmentAPI.prod.properties` the same kind of placeholder as the
database passwords there, which the real environment replaces.

### Swagger's Authorize button

`restAPI/OpenApiApplication.java`, complete:

```java
package be.techolympiad.common.restAPI;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springdoc.core.GroupedOpenApi;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ImportResource;
import org.springframework.context.annotation.PropertySource;

import java.util.Arrays;

@OpenAPIDefinition
@SpringBootApplication(exclude = {DataSourceAutoConfiguration.class}, scanBasePackages = "be.techolympiad.common")
@PropertySource("classpath:environment.properties")
@PropertySource("classpath:api.properties")
@ImportResource("classpath:applicationContextAPI.xml")
public class OpenApiApplication extends SpringBootServletInitializer {
    public static void main(String[] args) {
        SpringApplication.run(OpenApiApplication.class, args);
    }

    private static final String SECURITY_SCHEME_NAME = "Bearer oAuth Token";

    @Bean
    public OpenAPI toAPI(@Value("${application-description}") String title, @Value("${application-description}") String appDescription, @Value("${apiPomVersion}") String apiPomVersion) {

        Server currentServer = new Server();
        currentServer.setDescription("current");
        currentServer.setUrl("/");

        Server localServer = new Server();
        localServer.setDescription("local");
        localServer.setUrl("/techolympiad");

        return new OpenAPI()
                .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME_NAME))
                .components(
                        new Components()
                                .addSecuritySchemes(SECURITY_SCHEME_NAME,
                                        new SecurityScheme()
                                                .name(SECURITY_SCHEME_NAME)
                                                .type(SecurityScheme.Type.HTTP)
                                                .scheme("bearer")
                                                .bearerFormat("JWT")
                                )
                )
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

    @Bean
    public GroupedOpenApi v2Api() {
        String[] paths = {"/api/v2/**"};
        return GroupedOpenApi.builder().group("v2").pathsToMatch(paths)
                .build();
    }

    @Override
    protected SpringApplicationBuilder configure(SpringApplicationBuilder application) {
        return application.sources(OpenApiApplication.class);
    }
}
```

The scheme says: HTTP authentication, `bearer` scheme. Swagger UI shows
an *Authorize* button, asks for the token, and sends
`Authorization: Bearer <token>` with every call; you paste the token
without the word `Bearer`. `addSecurityItem` applies the scheme to every
operation, so each shows a padlock. This is the VWO's code, scheme name
included.

### Protecting the writes

`restAPI/controllers/FunctionController.java`:

<div class="diff-view" data-diff-view>

```diff
 import io.swagger.v3.oas.annotations.Operation;
 import org.springframework.http.HttpStatus;
 import org.springframework.http.MediaType;
 import org.springframework.http.ResponseEntity;
+import org.springframework.security.access.prepost.PreAuthorize;
 import org.springframework.web.bind.annotation.*;
@@
     @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
     @Operation(summary = "Make a person responsable for a school and edition")
     @ResponseBody
+    @PreAuthorize("hasAuthority('ADMIN')")
     default ResponseEntity<Functies> create(@RequestBody @NotNull Functies function) {
@@
     @DeleteMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
     @Operation(summary = "Remove a responsable from a school and edition")
     @ResponseStatus(HttpStatus.NO_CONTENT)
+    @PreAuthorize("hasAuthority('ADMIN')")
     default void delete(@RequestBody @NotNull Functies function) {
```

</div>

`restAPI/controllers/v2/FunctionController.java`, the `v2`-only method:

<div class="diff-view" data-diff-view>

```diff
+import org.springframework.security.access.prepost.PreAuthorize;
@@
     @DeleteMapping("/{personId}/{schoolId}/{function}")
     @Operation(summary = "Remove a responsable from a school and edition")
     @ResponseStatus(HttpStatus.NO_CONTENT)
+    @PreAuthorize("hasAuthority('ADMIN')")
     public void deleteByKey(@PathVariable("personId") short personId,
```

</div>

The same one-line addition, with the import, goes on every other write, the archive included:

<div class="table-wrap">

| Interface | Methods |
|---|---|
| `SchoolController` | `POST`, `PUT` |
| `ToParticipationController` | `create` (`POST`), `update` (`PUT`) |
| `ToParticipantsController` | `POST`, `PUT`, `DELETE /{pupilId}` |
| `ScoringController` | the three `POST`s |
| `ArchiveController` | `POST` |

</div>

Reads stay open to every authenticated user, `USER` or `ADMIN`.

`restAPI/ErrorAdvice.java`, a handler like the VWO's, with our body:

<div class="diff-view" data-diff-view>

```diff
 import org.springframework.http.ResponseEntity;
+import org.springframework.security.access.AccessDeniedException;
 import org.springframework.web.bind.MethodArgumentNotValidException;
@@
+    @ResponseStatus(HttpStatus.FORBIDDEN)
+    @ExceptionHandler(AccessDeniedException.class)
+    public ResponseEntity<Map<String, String>> handle(AccessDeniedException ex) {
+        return error(HttpStatus.FORBIDDEN, ex.getMessage(), ex.toString());
+    }
+
     private ResponseEntity<Map<String, String>> error(HttpStatus status, String message, String description) {
```

</div>

### Run it

```bash
mvn -q -DskipTests -Plocal package && docker compose restart api
docker compose logs api | grep "Will secure"
```

The second line lists the ignored paths with `[]` and the filter chain of
everything else, `TokenAuthenticationFilter` among them.

1. No token, no data:

   ```bash
   curl -i http://localhost:8081/techolympiad/api/v1/school
   ```

   `401` with Spring Boot's body,
   `{"timestamp":"...","status":401,"error":"Unauthorized","path":"/techolympiad/api/v1/school"}`.
   In the Swagger UI, *Try it out* gives the same.
2. A wrong password:

   ```bash
   curl -i -X POST -d username=teacher -d password=wrong \
     http://localhost:8081/techolympiad/public/users/login
   ```

   `401`.
3. Log in as the teacher and look inside the token:

   ```bash
   TOKEN=$(curl -s -X POST -d username=teacher -d password=teacherpass \
     http://localhost:8081/techolympiad/public/users/login)
   echo "$TOKEN"
   p=$(cut -d. -f2 <<< "$TOKEN"); while (( ${#p} % 4 )); do p+="="; done; basenc --base64url -d <<< "$p"; echo
   ```

   The last line prints the payload,
   `{"iss":"techolympiad","iat":...,"exp":...,"username":"teacher"}`, with
   `exp` twelve hours after `iat`. The loop adds the `=` padding base64url
   leaves out.
4. Read with the token:

   ```bash
   curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8081/techolympiad/api/v1/school
   ```

   `200` and the four schools.
5. Write as a `USER`:

   ```bash
   curl -i -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
     -d '{"personId": 1, "schoolId": 3, "function": "STO"}' \
     http://localhost:8081/techolympiad/api/v1/function
   ```

   `403` with `"message":"Access is denied"`.
6. In the Swagger UI: log in as `admin` with the `curl` from step 3, click
   *Authorize*, paste the token, *Authorize*, *Close*. The same `POST
   /api/v1/function` now answers `200`. Remove it again with the `v2`
   `DELETE /api/v2/function/1/3/STO`: `204`.
7. `docker exec techolympiad-db mariadb -uroot -pdevpass TechOlympiad -e "SELECT user, last_login FROM API_user"`
   shows when each user last logged in.
8. Restart Tomcat (`docker compose restart api`) and repeat step 4 with
   the old token: `401`. The signature is still valid, but the in-memory
   store forgot the user. Log in again.

<div class="callout danger">
<div class="callout-label">When it breaks</div>

- **Every URL, the Swagger UI included, answers `401`, and the log shows `Using generated security password`**: Spring Security is on the classpath but `SecurityConfig` was not picked up. It must be in `be.techolympiad.common.security`, annotated `@Configuration` and `@EnableWebSecurity`.
- **`Could not resolve placeholder 'jwt.secret'`**: the property is missing from the environment file the build profile copied, or you built without `-Plocal`.
- **Login always `401` with the right password**: the hash in the database is not the one you generated. A `$` in an unquoted shell heredoc (`cat >> 03-seed.sql <<EOF`) starts a variable, so `$2a$12$...` loses pieces; edit the file in your editor or quote the marker (`<<'EOF'`). Check with `SELECT password FROM API_user`, then `docker compose down -v` and up again.
- **`LazyInitializationException: failed to lazily initialize a collection of role: ...apiUserRoles`**: the collection is not `FetchType.EAGER`.
- **`403` for the admin on a write**: the role check says `hasRole('ADMIN')`, which looks for `ROLE_ADMIN`. Use `hasAuthority`.
- **`The dependencies of some of the beans in the application context form a cycle`**: a `PasswordEncoder` bean was moved into `SecurityConfig`. Keep it a field of `JwtAuthenticationService`.
- **`NoClassDefFoundError: javax/xml/bind/DatatypeConverter`** on login: `jaxb-api` is missing. It normally comes with `hibernate-core`; check `mvn dependency:tree -Dincludes=javax.xml.bind`.
- **`401` with a token you just got**: it was issued before a restart, or you pasted it into Swagger with `Bearer ` in front, which Swagger then sends as `Bearer Bearer ...`.

</div>

### Quiz

<div class="quiz" data-quiz>
<p class="quiz-q">A request to <code>/api/v1/school</code> arrives without an <code>Authorization</code> header. Which component answers, and with which status?</p>
<ol class="quiz-options">
<li>The <code>HttpStatusEntryPoint</code>, with <code>403</code><p class="quiz-whynot">The entry point would only answer if the request reached the URL rules unauthenticated. The token filter stops it earlier.</p></li>
<li data-correct><code>TokenAuthenticationFilter</code>'s default failure handler, with <code>401</code><p class="quiz-why"><code>attemptAuthentication</code> throws <code>BadCredentialsException</code>, and <code>SimpleUrlAuthenticationFailureHandler</code> without a failure URL sends <code>401</code>.</p></li>
<li>The controller, with an empty <code>200</code><p class="quiz-whynot">The request never reaches the <code>DispatcherServlet</code>.</p></li>
</ol>
<p class="quiz-explain">The VWO behaves the same way: <code>401</code> for a missing or invalid token. <code>403</code> appears only for an authenticated user who lacks a role.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">Why can the VWO's <code>a.password = sha2(:password, 512)</code> never succeed against production's <code>API_user</code> table?</p>
<ol class="quiz-options">
<li>MariaDB has no <code>sha2</code> function<p class="quiz-whynot">It has; <code>SHA2(str, 512)</code> returns a 128-character hex string.</p></li>
<li data-correct>Production stores bcrypt hashes, and a SHA-512 hex digest is never equal to one<p class="quiz-why">The stored value is <code>$2a$...</code>, 60 characters, salted. The query compares it with a 128-character unsalted digest.</p></li>
<li>HQL cannot call SQL functions<p class="quiz-whynot">Hibernate passes unknown functions such as <code>sha2</code> through to the database.</p></li>
</ol>
<p class="quiz-explain">bcrypt cannot be compared in SQL at all, because the salt and cost are inside the stored hash. The check has to load the hash and use <code>BCryptPasswordEncoder.matches</code>.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">You restart Tomcat. A client still holds a token issued an hour ago, with eleven hours left. What does its next request get?</p>
<ol class="quiz-options">
<li><code>200</code>: the signature and expiry are fine, and JWTs are stateless<p class="quiz-whynot">The token is verified, but the user is then looked up in the in-memory store, which the restart emptied.</p></li>
<li data-correct><code>401</code>, until the client logs in again<p class="quiz-why"><code>findByToken</code> reads the <code>username</code> claim and asks <code>ApiUsers</code>, which only the login fills.</p></li>
<li><code>403</code>: the roles are gone<p class="quiz-whynot">There is no user at all, so authentication fails before roles matter.</p></li>
</ol>
<p class="quiz-explain">The design is half stateless: the token proves who you are, the store holds what you may do. It is the VWO's design, kept here so its behaviour stays recognisable.</p>
</div>

### Flashcards

<div class="flashcards" data-flashcards data-front-label="Term" data-back-label="Meaning">
<div class="card"><div class="front"><code>FilterChainProxy</code></div><div class="back">The bean behind <code>springSecurityFilterChain</code>: picks the first matching <code>SecurityFilterChain</code> and runs its filters.</div></div>
<div class="card"><div class="front"><code>AbstractAuthenticationProcessingFilter</code></div><div class="back">Base class for filters that read credentials, hand them to the <code>AuthenticationManager</code> and store the result. Failure answers <code>401</code> by default.</div></div>
<div class="card"><div class="front"><code>AuthenticationProvider</code></div><div class="back">Checks one kind of <code>Authentication</code> and returns an authenticated one, or throws.</div></div>
<div class="card"><div class="front"><code>web.ignoring()</code></div><div class="back">Paths that skip Spring Security entirely: no filters, no headers.</div></div>
<div class="card"><div class="front">JWT</div><div class="back"><code>header.payload.signature</code>, base64url. Signed, not encrypted; cannot be revoked before <code>exp</code>.</div></div>
<div class="card"><div class="front">bcrypt</div><div class="back">A slow, salted password hash; <code>$2a$12$</code> plus 22 characters of salt and 31 of hash, 60 in all.</div></div>
<div class="card"><div class="front"><code>hasAuthority</code> versus <code>hasRole</code></div><div class="back"><code>hasRole('X')</code> checks <code>ROLE_X</code>. Our database roles have no prefix, so we use <code>hasAuthority</code>.</div></div>
<div class="card"><div class="front"><code>WebSecurityConfigurerAdapter</code></div><div class="back">The VWO's way to configure Spring Security; deprecated in 5.7, removed in 6.</div></div>
</div>

### Self-checks

<details class="qa">
<summary>Self-check: why does <code>SecurityConfig</code> disable the automatic registration of its own filter bean?</summary>
<div class="ans">
Spring Boot registers every <code>Filter</code> bean as a servlet filter for all URLs. The token filter would then run twice for protected URLs, and also in front of the login and the Swagger UI, which <code>web.ignoring()</code> meant to keep free of security.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<details class="qa">
<summary>Self-check: the login endpoint is under <code>/public/**</code>, which Spring Security ignores. Where does the password get checked?</summary>
<div class="ans">
In our own code: <code>PublicUsersController</code> calls <code>JwtAuthenticationService.login</code>, which loads the user through <code>ApiUserDao</code> and compares with <code>BCryptPasswordEncoder.matches</code>. No Spring Security filter is involved; a failure becomes <code>401</code> through <code>ResponseStatusException</code>.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<details class="qa">
<summary>Self-check: anyone can decode the token's payload. Why can nobody change <code>"username":"teacher"</code> to <code>"admin"</code>?</summary>
<div class="ans">
The signature is an HMAC over header and payload with the server's secret. A changed payload no longer matches it, <code>parseClaimsJws</code> throws a <code>SignatureException</code>, and <code>verify</code> returns an empty map. Without the secret nobody can compute a new valid signature, which is why the secret must not be a default in the source.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<button type="button" data-mark-done>Mark this chapter done</button>

</div>
