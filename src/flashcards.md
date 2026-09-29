# Flashcards: C# → Java

Click a card to flip it. The front is what you know from C#/.NET; the
back is what you'll meet in `vwo-api`'s stack. Do one deck a day, or all
of them the morning before you pick up your first ticket.

<div class="callout rule">
<div class="callout-label">How to use them</div>
Say the answer out loud before you flip. If you hesitate, it isn't
known yet: re-read the step it came from (numbers in brackets).
</div>

## Syntax and language (Step 1)

<div class="flashcards" data-flashcards>
<div class="card"><div class="front"><code>namespace Vwo.Api;</code> + <code>using X;</code></div><div class="back"><code>package be.vwo.common;</code> + <code>import x.Y;</code>; the package must match the folder</div></div>
<div class="card"><div class="front"><code>public string Name { get; set; }</code></div><div class="back"><code>private String name;</code> + <code>getName()</code>/<code>setName()</code> (Lombok <code>@Getter @Setter</code>)</div></div>
<div class="card"><div class="front"><code>x?.Name ?? "n/a"</code></div><div class="back"><code>opt.map(X::getName).orElse("n/a")</code></div></div>
<div class="card"><div class="front"><code>s1 == s2</code> (strings)</div><div class="back"><code>s1.equals(s2)</code>; <code>==</code> compares references</div></div>
<div class="card"><div class="front"><code>decimal</code></div><div class="back"><code>BigDecimal</code>; compare with <code>compareTo</code>, not <code>equals</code></div></div>
<div class="card"><div class="front"><code>$"Hi {name}"</code></div><div class="back"><code>"Hi %s".formatted(name)</code> or <code>String.format</code></div></div>
<div class="card"><div class="front"><code>typeof(T)</code></div><div class="back">Impossible for a type parameter (erasure); pass a <code>Class&lt;T&gt;</code></div></div>
<div class="card"><div class="front"><code>List&lt;int&gt;</code></div><div class="back"><code>List&lt;Integer&gt;</code>; no primitives in generics</div></div>
<div class="card"><div class="front"><code>virtual</code> method</div><div class="back">The default: every non-static, non-final, non-private method is virtual</div></div>
<div class="card"><div class="front"><code>using var r = ...;</code></div><div class="back"><code>try (var r = ...) { }</code> with <code>AutoCloseable</code></div></div>
<div class="card"><div class="front">Exceptions you may ignore</div><div class="back">Only unchecked ones (<code>RuntimeException</code>); checked ones must be caught or declared with <code>throws</code></div></div>
</div>

## Collections and LINQ ↔ Streams (Step 1)

<div class="flashcards" data-flashcards>
<div class="card"><div class="front"><code>Dictionary&lt;K,V&gt;</code></div><div class="back"><code>Map&lt;K,V&gt;</code> (usually <code>HashMap</code>)</div></div>
<div class="card"><div class="front"><code>.Where(x =&gt; ...).Select(x =&gt; ...)</code></div><div class="back"><code>.stream().filter(x -&gt; ...).map(x -&gt; ...)</code></div></div>
<div class="card"><div class="front"><code>.FirstOrDefault()</code></div><div class="back"><code>.findFirst().orElse(null)</code></div></div>
<div class="card"><div class="front"><code>.GroupBy(x =&gt; x.Key)</code></div><div class="back"><code>.collect(Collectors.groupingBy(X::getKey))</code></div></div>
<div class="card"><div class="front"><code>IQueryable</code> translated to SQL</div><div class="back">No equivalent; streams run in memory. Write HQL for DB queries</div></div>
</div>

## Build: NuGet/MSBuild ↔ Maven (Step 2)

<div class="flashcards" data-flashcards>
<div class="card"><div class="front"><code>.csproj</code></div><div class="back"><code>pom.xml</code></div></div>
<div class="card"><div class="front"><code>dotnet publish</code></div><div class="back"><code>mvn package</code> (runs every earlier phase too)</div></div>
<div class="card"><div class="front">Framework reference supplied by the host</div><div class="back"><code>&lt;scope&gt;provided&lt;/scope&gt;</code> (Tomcat here)</div></div>
<div class="card"><div class="front"><code>appsettings.Production.json</code></div><div class="back">In this repo: <code>-P gitlab-prod</code> copies the prod <code>environment.properties</code> into the WAR at build time</div></div>
</div>

## DI and web (Step 3)

<div class="flashcards" data-flashcards>
<div class="card"><div class="front"><code>AddScoped</code> by default</div><div class="back">Spring beans are <strong>singletons</strong> by default</div></div>
<div class="card"><div class="front">Registering services in <code>Program.cs</code></div><div class="back">Component scan finds <code>@Repository</code>/<code>@Service</code>/<code>@RestController</code></div></div>
<div class="card"><div class="front"><code>[FromRoute]</code> / <code>[FromQuery]</code> / <code>[FromBody]</code></div><div class="back"><code>@PathVariable</code> / <code>@RequestParam</code> / <code>@RequestBody</code></div></div>
<div class="card"><div class="front"><code>ActionResult&lt;T&gt;</code>, <code>NotFound()</code></div><div class="back"><code>ResponseEntity&lt;T&gt;</code>, <code>ResponseEntity.notFound().build()</code></div></div>
<div class="card"><div class="front"><code>dotnet run</code> on Kestrel</div><div class="back">WAR deployed to external Tomcat 9; <code>SpringBootServletInitializer</code> boots it</div></div>
<div class="card"><div class="front">Decorator skipped on <code>this.Method()</code></div><div class="back">Self-invocation bypasses the Spring proxy: <code>@Transactional</code>/<code>@Cacheable</code> ignored</div></div>
<div class="card"><div class="front"><code>IOptions&lt;T&gt;</code> / <code>IConfiguration["x"]</code></div><div class="back"><code>@ConfigurationProperties</code> / <code>@Value("${x}")</code></div></div>
<div class="card"><div class="front"><code>async Task&lt;T&gt;</code></div><div class="back"><code>CompletableFuture&lt;T&gt;</code>; but this API is synchronous, one servlet thread per request</div></div>
</div>

## Persistence: EF Core ↔ Hibernate (Step 4)

<div class="flashcards" data-flashcards>
<div class="card"><div class="front"><code>DbContext</code></div><div class="back"><code>Session</code></div></div>
<div class="card"><div class="front"><code>SaveChanges()</code></div><div class="back">Flush, automatic before commit; changed managed entities are written (dirty checking)</div></div>
<div class="card"><div class="front">LINQ query</div><div class="back">HQL string over entity and field names, with <code>:named</code> parameters</div></div>
<div class="card"><div class="front"><code>.Include()</code></div><div class="back"><code>JOIN FETCH</code></div></div>
<div class="card"><div class="front">Transaction rolls back on any exception</div><div class="back"><code>@Transactional</code> rolls back on unchecked exceptions only, unless <code>rollbackFor</code></div></div>
<div class="card"><div class="front">Lazy navigation after the context is disposed</div><div class="back"><code>LazyInitializationException</code>: no Session</div></div>
</div>

## Security, Lombok, testing (Steps 5-6)

<div class="flashcards" data-flashcards>
<div class="card"><div class="front">Middleware pipeline</div><div class="back">Servlet filter chain; <code>addFilterBefore(filter, X.class)</code></div></div>
<div class="card"><div class="front"><code>HttpContext.User</code></div><div class="back"><code>SecurityContextHolder.getContext().getAuthentication()</code></div></div>
<div class="card"><div class="front"><code>[AllowAnonymous]</code></div><div class="back"><code>permitAll()</code>; this repo also uses <code>web.ignoring()</code>, which skips the chain entirely</div></div>
<div class="card"><div class="front"><code>record</code> with <code>init</code> properties</div><div class="back">Lombok <code>@Value</code> (+ <code>@Builder</code>), or a Java <code>record</code></div></div>
<div class="card"><div class="front">xUnit <code>[Fact]</code> / <code>[Theory]</code></div><div class="back">JUnit 5 <code>@Test</code> / <code>@ParameterizedTest</code></div></div>
<div class="card"><div class="front">Moq</div><div class="back">Mockito: <code>mock(X.class)</code>, <code>when(...).thenReturn(...)</code>, <code>verify(...)</code></div></div>
</div>
