# Step 5: Spring Security

<div class="level-tabs" data-levels>
  <button data-level="overview" aria-pressed="true">Overview</button>
  <button data-level="deep">Deep Understanding</button>
  <button data-level="drill">Drilling</button>
</div>

<div class="level overview">

The auth code in `security/` is a JWT layer implemented as a custom
filter dropped into Spring Security's standard filter chain, not a
bespoke authentication scheme. Some paths are excluded from that chain
entirely rather than made permissive within it, which means ignored
paths get no security filters at all.

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

</div>

<div class="level drill">

<ul class="checklist">
<li><label><input type="checkbox"><span>With Knowledge File §10 open, draw the filter chain for <code>GET /api/v2/school/1</code>.</span></label></li>
<li><label><input type="checkbox"><span>Draw the filter chain for <code>GET /restapi/school/1</code> and compare the two diagrams.</span></label></li>
</ul>

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

<button type="button" data-mark-done>Mark this step done</button>

</div>
