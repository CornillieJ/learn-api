# Step 5: Spring Security

<div class="level-tabs" data-levels>
  <button data-level="overview" aria-pressed="true">Overview</button>
  <button data-level="deep">Deep Understanding</button>
  <button data-level="drill">Drilling</button>
</div>

<div class="level overview">

In ASP.NET Core you'd write `AddJwtBearer(...)`, `UseAuthentication()`,
`UseAuthorization()` and be done. Spring Security gives you the same
pipeline idea, but as a **chain of servlet filters** that you configure
in one class. The auth code in `security/` is a JWT layer implemented as
a custom filter dropped into that standard chain, not a bespoke
authentication scheme. The twist worth learning early: some paths are
**excluded from the chain entirely** (`web.ignoring()`) rather than
allowed within it, so those paths get no security filters at all.

**After this step you can:**

- draw the filter chain for a protected request and for an ignored one;
- explain where the JWT filter sits and what it sets for the rest of the request;
- tell `hasAuthority` from `hasRole`, and `web.ignoring()` from `permitAll()`.

<div class="code-compare" data-code-compare>

```csharp
// Program.cs
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o => { /* key, issuer ... */ });
builder.Services.AddAuthorization(o =>
    o.AddPolicy("User", p => p.RequireRole("USER", "ADMIN")));
app.UseAuthentication();
app.UseAuthorization();
```

```java
// security/SecurityConfig.java
http.sessionManagement().sessionCreationPolicy(STATELESS)
    .and().exceptionHandling().defaultAuthenticationEntryPointFor(forbiddenEntryPoint(), PROTECTED_URLS)
    .and().authenticationProvider(provider)
    .addFilterBefore(restAuthenticationFilter(), AnonymousAuthenticationFilter.class)
    .authorizeRequests().requestMatchers(PROTECTED_URLS).hasAnyAuthority("USER", "ADMIN") ...
```

</div>

</div>

<div class="level deep">

### 5.1 📖 Spring Security 5.7, Servlet Architecture (official docs)

[https://docs.enterprise.spring.io/spring-security/reference/5.7-SNAPSHOT/servlet/architecture.html](https://docs.enterprise.spring.io/spring-security/reference/5.7-SNAPSHOT/servlet/architecture.html)
✅ page shows version 5.7.24-SNAPSHOT, the 5.7 line this project uses
through Boot 2.7. Explains `DelegatingFilterProxy` (bridges the servlet
container and Spring's `ApplicationContext`), `FilterChainProxy` and
`SecurityFilterChain` (which filters run for which request, chosen by
`RequestMatcher`), and `ExceptionTranslationFilter` (turns
`AccessDeniedException`/`AuthenticationException` into HTTP responses).

<div class="callout danger">
<div class="callout-label">Watch out</div>
The stable docs URL (docs.spring.io/spring-security/reference/servlet/architecture.html)
now documents version 6.x. The <code>5.7-SNAPSHOT</code> link above is
a mirror that still serves the 5.7 docs this project needs; the plain
<code>5.7/…</code> path on docs.spring.io returns 404.
</div>

The JWT layer is a custom filter placed in that chain:

```java
// security/SecurityConfig.java
http.sessionManagement().sessionCreationPolicy(STATELESS)
    .and().exceptionHandling().defaultAuthenticationEntryPointFor(forbiddenEntryPoint(), PROTECTED_URLS)
    .and().authenticationProvider(provider)
    .addFilterBefore(restAuthenticationFilter(), AnonymousAuthenticationFilter.class)
    .authorizeRequests().requestMatchers(PROTECTED_URLS).hasAnyAuthority("USER", "ADMIN") ...
```

And the line that excludes whole paths from the chain instead of
authorizing them within it:

```java
web.ignoring().antMatchers("/public/**", "/swagger-ui/**", "/v3/api-docs/**", "/restapi/**")
```

The doc's chain model (`FilterChainProxy` deciding which
`SecurityFilterChain` applies per request) is why paths matched here
get no security filters at all, rather than a permissive one (Knowledge
File §19.1-1).

### 5.2 Mental model: filter chain vs middleware

<div class="table-wrap">

| ASP.NET Core | Spring Security 5.7 |
|---|---|
| middleware pipeline, ordered in `Program.cs` | servlet filters; one `FilterChainProxy` (behind `DelegatingFilterProxy`) runs the matching `SecurityFilterChain` |
| `app.UseMiddleware<T>()` at a position | `addFilterBefore/After(filter, KnownFilter.class)`, positioned relative to Spring's built-in filters |
| `AddJwtBearer` handler | the custom `restAuthenticationFilter()` + `authenticationProvider(provider)` + `JWTTokenService` |
| `HttpContext.User` (`ClaimsPrincipal`) | `SecurityContextHolder.getContext().getAuthentication()` (thread-bound) |
| claim / role | `GrantedAuthority` |
| `[Authorize(Roles = "ADMIN")]` / policies | `authorizeRequests()...hasAnyAuthority(...)`, or `@PreAuthorize` on methods |
| challenge / forbid results | `AuthenticationEntryPoint` / `AccessDeniedHandler`, invoked by `ExceptionTranslationFilter` |
| no cookie auth, bearer only | `SessionCreationPolicy.STATELESS`: no `HttpSession`, every request re-authenticates from its token |

</div>

The JWT filter is added *before* `AnonymousAuthenticationFilter`: if the
token is valid it puts an `Authentication` into the security context;
if not, the anonymous filter fills in an anonymous one and the
authorisation rule for `PROTECTED_URLS` rejects the request.

### 5.3 .NET gotchas

<div class="callout danger">
<div class="callout-label">Watch for these</div>

- **`hasAuthority` vs `hasRole`.** `hasRole("ADMIN")` checks for the authority string `ROLE_ADMIN`; `hasAuthority("ADMIN")` checks for exactly `ADMIN`. This repo uses `hasAnyAuthority("USER", "ADMIN")`, so the JWT's authorities must be the bare strings.
- **`web.ignoring()` is not `permitAll()`.** Ignored paths skip the whole chain: no security context, no security headers, no CSRF or CORS handling from Spring Security. `permitAll()` runs the chain and then allows the request.
- **Thread-bound context.** `SecurityContextHolder` uses a `ThreadLocal` by default. Code that hops to another thread (`@Async`, a `CompletableFuture` pool) doesn't see the user unless you propagate it.
- **`WebSecurityConfigurerAdapter` is deprecated in 5.7** and removed in Spring Security 6. `SecurityConfig` still uses the adapter style; tutorials that declare a `SecurityFilterChain` `@Bean` show the newer style and the future migration target.

</div>

### 5.4 JWT with jjwt 0.9

No verified resource was found for jjwt 0.9 specifically. Read
`security/jwt/JWTTokenService.java` with Knowledge File §10 open, and
try the `curl` example in §10.1 against a dev instance. Be aware that
jjwt changed a lot after 0.9 (the library was split into
`jjwt-api`/`jjwt-impl` modules in 0.10 and the parser API changed again
in 0.11 and 0.12), so newer blog posts often won't compile against this
code.

</div>

<div class="level drill">

### Tasks

<ul class="checklist">
<li><label><input type="checkbox"><span>With Knowledge File §10 open, draw the filter chain for <code>GET /api/v2/school/1</code>.</span></label></li>
<li><label><input type="checkbox"><span>Draw the filter chain for <code>GET /restapi/school/1</code> and compare the two diagrams.</span></label></li>
<li><label><input type="checkbox"><span>In <code>SecurityConfig.java</code>, find what <code>PROTECTED_URLS</code> matches and what <code>forbiddenEntryPoint()</code> returns. Which HTTP status does an unauthenticated call get?</span></label></li>
<li><label><input type="checkbox"><span>Run the JWT <code>curl</code> example from Knowledge File §10.1 against a dev instance, once with a token and once without.</span></label></li>
</ul>

### Quiz

<div class="quiz" data-quiz>
<p class="quiz-q">What is the difference between <code>web.ignoring().antMatchers("/restapi/**")</code> and <code>.antMatchers("/restapi/**").permitAll()</code>?</p>
<ol class="quiz-options">
<li>None; both are ways to allow anonymous access</li>
<li data-correct><code>ignoring()</code> removes the path from the security filter chain entirely; <code>permitAll()</code> runs the chain and then allows the request</li>
<li><code>permitAll()</code> skips the chain; <code>ignoring()</code> requires a valid JWT</li>
<li><code>ignoring()</code> only applies to static files</li>
</ol>
<p class="quiz-explain">With <code>ignoring()</code> no Spring Security filter runs for that path at all, so there is no security context either.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">A user's token carries the authority <code>ADMIN</code>. Which rule lets them through?</p>
<ol class="quiz-options">
<li><code>hasRole("ROLE_ADMIN")</code></li>
<li><code>hasRole("admin")</code></li>
<li data-correct><code>hasAuthority("ADMIN")</code></li>
<li>All of the above</li>
</ol>
<p class="quiz-explain"><code>hasRole("X")</code> looks for the authority <code>ROLE_X</code> (in URL rules it even refuses an argument that already starts with <code>ROLE_</code>). <code>hasAuthority</code> compares the exact string, which is what this repo relies on.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">What does <code>SessionCreationPolicy.STATELESS</code> mean here?</p>
<ol class="quiz-options">
<li>The JWT is stored in the <code>HttpSession</code></li>
<li data-correct>Spring Security never creates or uses an <code>HttpSession</code>; each request is authenticated from its own token</li>
<li>Beans are recreated for every request</li>
<li>The Hibernate session is closed after each request</li>
</ol>
<p class="quiz-explain">Like a bearer-only API in ASP.NET Core: no cookie session, every request must carry its token.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">Which component turns an <code>AuthenticationException</code> thrown during a request into an HTTP response?</p>
<ol class="quiz-options">
<li><code>DelegatingFilterProxy</code></li>
<li><code>AnonymousAuthenticationFilter</code></li>
<li data-correct><code>ExceptionTranslationFilter</code>, via the configured <code>AuthenticationEntryPoint</code></li>
<li>The controller's <code>@ExceptionHandler</code></li>
</ol>
<p class="quiz-explain">In this repo the entry point for <code>PROTECTED_URLS</code> is <code>forbiddenEntryPoint()</code>.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">Where is the currently authenticated user available during a request?</p>
<ol class="quiz-options">
<li><code>HttpContext.User</code></li>
<li data-correct><code>SecurityContextHolder.getContext().getAuthentication()</code></li>
<li>A request-scoped <code>User</code> bean</li>
<li>The <code>HttpSession</code></li>
</ol>
<p class="quiz-explain">The security context is thread-bound (a <code>ThreadLocal</code> by default) and set by the authentication filter for the duration of the request.</p>
</div>

### Flashcards

<div class="flashcards" data-flashcards>
<div class="card"><div class="front"><code>app.UseMiddleware&lt;T&gt;()</code></div><div class="back"><code>http.addFilterBefore(filter, SomeFilter.class)</code></div></div>
<div class="card"><div class="front"><code>HttpContext.User</code></div><div class="back"><code>SecurityContextHolder.getContext().getAuthentication()</code></div></div>
<div class="card"><div class="front"><code>[Authorize(Roles = "ADMIN")]</code></div><div class="back"><code>@PreAuthorize("hasAuthority('ADMIN')")</code> or a URL rule in <code>SecurityConfig</code></div></div>
<div class="card"><div class="front"><code>[AllowAnonymous]</code></div><div class="back"><code>permitAll()</code> (chain runs) vs <code>web.ignoring()</code> (chain skipped)</div></div>
</div>

### Self-checks

<details class="qa">
<summary>Self-check: why does <code>/restapi/**</code> get no security filters at all?</summary>
<div class="ans">
Because <code>web.ignoring()</code> removes the path from the filter
chain entirely, rather than applying a permissive rule within it. The
request is excluded before Spring Security evaluates anything, unlike
a path that is matched and then allowed by an authorization rule.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<details class="qa">
<summary>Self-check: why is the JWT filter added before <code>AnonymousAuthenticationFilter</code>?</summary>
<div class="ans">
The anonymous filter only sets an anonymous <code>Authentication</code>
if nothing has authenticated the request yet. Running the JWT filter
first gives a valid token the chance to set the real user; without a
token the request falls through to anonymous and is rejected by the
<code>PROTECTED_URLS</code> rule.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<button type="button" data-mark-done>Mark this step done</button>

</div>
