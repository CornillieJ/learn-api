# Final Challenge

You've done the seven steps. This page checks that it all joins up: a
mixed quiz across every step, then the exercise the whole guide has been
building towards, tracing one request through the real code from
Tomcat to the database and back.

<div class="callout rule">
<div class="callout-label">Rules</div>
No scrolling back to the steps and no searching until you've answered.
Score yourself honestly: 10 or more out of 12 on the quiz and a complete
trace means you're ready to take a real ticket.
</div>

## Part 1: capstone quiz

<div class="quiz" data-quiz>
<p class="quiz-q">1. <code>Short schoolId = 300;</code> is compared with another <code>Short</code> holding 300 using <code>==</code>. Result?</p>
<ol class="quiz-options">
<li><code>true</code></li>
<li data-correct><code>false</code></li>
<li>Compile error</li>
<li>Depends on the JVM flags only</li>
</ol>
<p class="quiz-explain">Reference comparison of two distinct boxed objects (outside the -128..127 cache). Use <code>.equals()</code>.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">2. Which command builds a WAR for the dev database <em>without</em> uploading it anywhere?</p>
<ol class="quiz-options">
<li><code>mvn package -P dev</code></li>
<li data-correct><code>mvn clean package -P gitlab-dev</code></li>
<li><code>mvn package -P production</code></li>
<li><code>mvn deploy</code></li>
</ol>
<p class="quiz-explain">The <code>gitlab-*</code> profiles only copy the env file at <code>compile</code>; <code>dev</code>/<code>production</code> also run the SSH/SCP deploy at <code>package</code>.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">3. Why is the app not started with <code>java -jar</code> in production?</p>
<ol class="quiz-options">
<li>Java 17 can't run jars</li>
<li data-correct>It's packaged as a WAR with Tomcat in <code>provided</code> scope and deployed to an external Tomcat 9</li>
<li>Spring Boot 2.7 doesn't support executable jars</li>
<li>Because of Lombok</li>
</ol>
<p class="quiz-explain"><code>packaging=war</code> + <code>provided</code> Tomcat + <code>SpringBootServletInitializer</code> = the external-container model.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">4. A bean method calls its own <code>@Cacheable</code> method directly. What happens to caching?</p>
<ol class="quiz-options">
<li>The result is cached as usual</li>
<li data-correct>No caching: the call doesn't go through the proxy</li>
<li>Spring throws a <code>BeanCurrentlyInCreationException</code></li>
<li>The cache is cleared</li>
</ol>
<p class="quiz-explain">Self-invocation bypasses proxy-based AOP, which is why <code>KangoeroePoolsParticipantsRepositoryImpl</code> injects itself as <code>self</code>.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">5. How many instances of <code>ScholenRepositoryImpl</code> exist while ten requests run concurrently?</p>
<ol class="quiz-options">
<li>Ten, one per request</li>
<li data-correct>One</li>
<li>One per thread pool thread</li>
<li>Zero; it's static</li>
</ol>
<p class="quiz-explain">Singleton scope is the default, so it must stay stateless.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">6. What does <code>@Transactional(value = transactionR, readOnly = true)</code> on <code>VwoDaoImpl.get</code> select?</p>
<ol class="quiz-options">
<li>A read-only database view</li>
<li data-correct>The read-only transaction manager (and with it the read-only DB identity), in a read-only transaction</li>
<li>The second-level cache region</li>
<li>A retry policy</li>
</ol>
<p class="quiz-explain"><code>value</code> names the transaction manager bean. The repo has two identities, <code>transactionVwoRW</code> and <code>transactionVwoR</code>.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">7. You add an <code>@Entity</code> but forget <code>hibernate_VWO.cfg.xml</code>. When do you find out?</p>
<ol class="quiz-options">
<li>At compile time</li>
<li>When Maven packages the WAR</li>
<li data-correct>At runtime, when a query references the entity ("is not mapped")</li>
<li>Never; Hibernate scans for entities automatically</li>
</ol>
<p class="quiz-explain">Registration is explicit here, and HQL strings are only checked when the query is created.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">8. A DAO method loads a <code>Scholen</code> and returns it; the controller serialises a lazy collection on it. Error?</p>
<ol class="quiz-options">
<li><code>NoSuchElementException</code></li>
<li data-correct><code>LazyInitializationException</code></li>
<li><code>NonUniqueResultException</code></li>
<li>No error; Hibernate reopens the session</li>
</ol>
<p class="quiz-explain">The session closed with the transaction. Fetch inside it or map to a DTO.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">9. A request to <code>/swagger-ui/index.html</code> arrives. Which Spring Security filters run?</p>
<ol class="quiz-options">
<li>All of them, then <code>permitAll</code></li>
<li>Only the JWT filter</li>
<li data-correct>None; the path is in <code>web.ignoring()</code></li>
<li>Only <code>ExceptionTranslationFilter</code></li>
</ol>
<p class="quiz-explain"><code>/swagger-ui/**</code> is listed in <code>web.ignoring()</code> next to <code>/public/**</code>, <code>/v3/api-docs/**</code> and <code>/restapi/**</code>.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">10. The rule is <code>hasAnyAuthority("USER", "ADMIN")</code>. Which granted authority passes?</p>
<ol class="quiz-options">
<li><code>ROLE_USER</code></li>
<li data-correct><code>USER</code></li>
<li><code>user</code></li>
<li><code>ROLE_ADMIN</code></li>
</ol>
<p class="quiz-explain"><code>hasAuthority</code> matches exact strings; no <code>ROLE_</code> prefix is added.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">11. IntelliJ says <code>getRepository()</code> doesn't exist in the v2 <code>SchoolController</code>, yet Maven builds fine. Why?</p>
<ol class="quiz-options">
<li data-correct>The method is generated by Lombok's <code>@Getter(onMethod_ = {@Override})</code> and the IDE isn't running Lombok</li>
<li>It's inherited from a superclass Maven downloads</li>
<li>Maven ignores missing methods</li>
<li>It's defined in <code>applicationContextAPI.xml</code></li>
</ol>
<p class="quiz-explain">Install the Lombok plugin and enable annotation processing.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">12. Which change is <em>not</em> required when this repo moves to Spring Boot 3?</p>
<ol class="quiz-options">
<li><code>javax.*</code> → <code>jakarta.*</code></li>
<li>Replacing <code>WebSecurityConfigurerAdapter</code></li>
<li>Moving off Tomcat 9</li>
<li data-correct>Upgrading from Java 17</li>
</ol>
<p class="quiz-explain">Boot 3 requires Java 17+, which the repo already uses.</p>
</div>

## Part 2: trace an endpoint

The goal of the whole guide: follow `GET /api/v2/school/42` with a valid
JWT, deployed as `database.war`, from the socket to the database and
back. Write each hop down (file, class, what happens) before opening the
answer sketch. Keep Knowledge File §7 and §10 and the
[Code Flow walkthrough](codebase-walkthroughs/code-flow.md) at hand.

<ul class="checklist">
<li><label><input type="checkbox"><span>The full URL the client must call, and why.</span></label></li>
<li><label><input type="checkbox"><span>How Tomcat hands the request to Spring (which class booted the app).</span></label></li>
<li><label><input type="checkbox"><span>The security hops: which chain, which custom filter, which rule authorises it.</span></label></li>
<li><label><input type="checkbox"><span>The controller: which class matches the path, and where the method body actually lives.</span></label></li>
<li><label><input type="checkbox"><span>The data hops: repository facade, DAO, transaction, session, query.</span></label></li>
<li><label><input type="checkbox"><span>The way back: what happens when school 42 doesn't exist.</span></label></li>
</ul>

<details class="qa">
<summary>Answer sketch: the trace (confirm each hop in the code)</summary>
<div class="ans">
<ol>
<li><strong>URL</strong>: <code>/database/api/v2/school/42</code>. The WAR name is the context path; <code>V2Config.BASE_URL + "/school"</code> gives <code>/api/v2/school</code>.</li>
<li><strong>Boot</strong>: Tomcat deployed the WAR and called <code>OpenApiApplication.configure(...)</code> (a <code>SpringBootServletInitializer</code>), which loaded the Spring context plus <code>applicationContextAPI.xml</code>.</li>
<li><strong>Security</strong>: <code>DelegatingFilterProxy</code> → <code>FilterChainProxy</code> → the chain from <code>SecurityConfig</code>. The path is not in <code>web.ignoring()</code>, so the JWT filter (<code>restAuthenticationFilter()</code>, backed by <code>JWTTokenService</code>) authenticates the token and fills the <code>SecurityContextHolder</code>; the authorisation rule for <code>PROTECTED_URLS</code> requires <code>USER</code> or <code>ADMIN</code> (check that <code>PROTECTED_URLS</code> covers this path). No <code>HttpSession</code> is created (<code>STATELESS</code>).</li>
<li><strong>Controller</strong>: the <code>DispatcherServlet</code> routes to the v2 <code>SchoolController</code> (<code>@RestController</code>). Its body is the <code>default getById</code> in the version-less interface <code>controllers/SchoolController.java</code>; <code>getRepository()</code> is generated by Lombok.</li>
<li><strong>Data</strong>: <code>ScholenRepositoryImpl.findById</code> (a singleton facade) delegates to the Hibernate DAO layer (<code>ScholenDao</code>, built on <code>VwoDaoImpl</code>). A read goes through the <code>transactionR</code> transaction manager, so the read-only <code>SessionFactory</code>'s <code>Session</code> loads the entity from MariaDB.</li>
<li><strong>Back</strong>: <code>Optional&lt;Scholen&gt;</code> → <code>.map(ResponseEntity.ok().body(...))</code> → Jackson serialises the entity (watch for lazy associations). If absent, <code>.orElse(ResponseEntity.notFound().build())</code> returns 404.</li>
</ol>
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<details class="qa">
<summary>Bonus: now trace <code>GET /restapi/school/42</code>. What is different?</summary>
<div class="ans">
The security step disappears: <code>/restapi/**</code> is in
<code>web.ignoring()</code>, so no Spring Security filter runs, no token
is checked and there is no security context. Find in the code which
controller serves that path, and whether anything else protects it.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

## Part 3: make a change (on a scratch branch)

<ul class="checklist">
<li><label><input type="checkbox"><span>Add a read-only DAO method with HQL and a named parameter, on <code>transactionR</code>.</span></label></li>
<li><label><input type="checkbox"><span>Expose it through the repository facade and a <code>default</code> method in the version-less controller interface.</span></label></li>
<li><label><input type="checkbox"><span>Build with <code>mvn clean package -P gitlab-dev</code>, deploy to a dev Tomcat, and call it with a JWT.</span></label></li>
<li><label><input type="checkbox"><span>Explain your change to a colleague using only Java/Spring vocabulary. If you can, you're done.</span></label></li>
</ul>

<button type="button" data-mark-done>Mark this step done</button>
