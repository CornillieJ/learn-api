# Step 6: Lombok (why the code has almost no getters/setters)

<div class="level-tabs" data-levels>
  <button data-level="overview" aria-pressed="true">Overview</button>
  <button data-level="deep">Deep Understanding</button>
  <button data-level="drill">Drilling</button>
</div>

<div class="level overview">

C# gave you `{ get; set; }` and `record`. Java 17 has records but no
properties, so for every field you'd write a getter and a setter by
hand. This repo doesn't: **Lombok** generates getters, setters,
constructors, builders and loggers at compile time from annotations.
It's a compiler plugin, so the methods never appear in the source.
Without the Lombok IDE plugin installed, your editor will show phantom
"cannot find symbol" errors for methods that do exist once Lombok has
run.

**After this step you can:**

- say exactly which methods an entity like `ApiUser` has, without seeing them;
- choose between `@Getter @Setter`, `@Value`, `@Builder` and a Java `record`;
- avoid the Lombok annotations that hurt Hibernate entities.

<div class="code-compare" data-code-compare>

```csharp
public class ApiUser
{
    public ApiUser() { }
    public int Id { get; set; }
    public string Name { get; set; }
}
```

```java
// dbEntities/ApiUser.java (fields illustrative)
@Entity @Getter @Setter @NoArgsConstructor
public class ApiUser {
    @Id private Integer id;     // getId() / setId(...) generated
    private String name;        // getName() / setName(...) generated
}
```

</div>

</div>

<div class="level deep">

### 6.1 📖 Lombok features (official docs)

[https://projectlombok.org/features/](https://projectlombok.org/features/)
✅ lists `@Getter`/`@Setter`, `@Data`, `@Value`, `@Builder`,
`@Log`/`@Slf4j`-style logging, and
`@NoArgsConstructor`/`@RequiredArgsConstructor`/`@AllArgsConstructor`.

```java
// dbEntities/ApiUser.java
@Entity @Getter @Setter @NoArgsConstructor
public class ApiUser { ... }
```

```java
// controllers/v2/SchoolController.java
@Getter(onMethod_ = {@Override})                      // generates an @Override getRepository()
private final ScholenRepository repository;
```

Entities and controllers depend on Lombok this way throughout the
project; without the IDE plugin you'll see phantom "cannot find
symbol" errors on fields and methods that Lombok generates for you.

`@Slf4j` (`General.java`) gives the class a `log` field with no
explicit declaration. `security/User.java` uses `@Value @Builder` to
model an immutable user: `@Value` makes every field `private final`
and generates getters (no setters), and `@Builder` adds a fluent
builder for construction.

### 6.2 Mental model: Lombok ↔ C# features

<div class="table-wrap">

| C# | Lombok / Java | Generates |
|---|---|---|
| `{ get; set; }` | `@Getter @Setter` | `getX()`/`setX()` per field (`isX()` for a primitive `boolean`) |
| `{ get; init; }` + `record` | `@Value` (or a Java `record`) | `private final` fields, getters, `equals`/`hashCode`/`toString`, all-args constructor; the class becomes `final` |
| object initializer `new X { A = 1 }` | `@Builder` | `X.builder().a(1).build()` |
| primary constructor / DI constructor | `@RequiredArgsConstructor` | a constructor for every `final` field, which is perfect for constructor injection |
| parameterless constructor | `@NoArgsConstructor` | required by Hibernate for entities |
| `ILogger<T>` injected | `@Slf4j` | `private static final Logger log = LoggerFactory.getLogger(...)` |
| record's `Equals`/`ToString` | `@Data` | getters, setters, `equals`/`hashCode`, `toString`, required-args constructor |

</div>

`security/User.java` uses `@Value @Builder`: an immutable user built
fluently. The DTOs in `restAPI/models` use plain Java `record`s instead.
Entities can't be records: Hibernate needs a no-args constructor and
mutable, non-final classes it can proxy.

<div class="callout danger">
<div class="callout-label">.NET gotchas</div>

- **Don't put `@Data` on an entity.** Its `equals`/`hashCode`/`toString` touch every field, including lazy associations: that can trigger extra queries, `LazyInitializationException`, or infinite recursion between two entities that reference each other. The repo's entities use `@Getter @Setter`, which avoids this.
- **`boolean` vs `Boolean` getters.** A primitive `boolean active` gets `isActive()`; a boxed `Boolean active` gets `getActive()`. Jackson derives JSON names from these, so the choice changes the API.
- **The IDE needs annotation processing.** Install the Lombok plugin and enable annotation processing in IntelliJ, otherwise the editor reports errors that `mvn` doesn't.
- **Generated code can't be stepped into**, and "Find usages" on a field won't show callers of its getter. Delombok when you need to see it.

</div>

</div>

<div class="level drill">

### Tasks

<ul class="checklist">
<li><label><input type="checkbox"><span>In IntelliJ, use <em>Delombok</em> on <code>ApiUser</code> to see the code Lombok actually generates.</span></label></li>
<li><label><input type="checkbox"><span>Open <code>security/User.java</code> and write the C# <code>record</code> it corresponds to. Then search the repo for <code>User.builder()</code> to see how it is constructed.</span></label></li>
<li><label><input type="checkbox"><span>In <code>controllers/v2/SchoolController.java</code>, find the interface method that <code>@Getter(onMethod_ = {@Override})</code> implements.</span></label></li>
<li><label><input type="checkbox"><span>Open <code>General.java</code>, find <code>@Slf4j</code>, and confirm that the <code>log</code> field is never declared in the source.</span></label></li>
</ul>

### Quiz

<div class="quiz" data-quiz>
<p class="quiz-q">Which methods does <code>@Value</code> generate for a class with fields <code>id</code> and <code>name</code>?</p>
<ol class="quiz-options">
<li>Getters and setters</li>
<li data-correct>Getters, an all-args constructor, <code>equals</code>/<code>hashCode</code>/<code>toString</code>; no setters</li>
<li>Only a builder</li>
<li>Setters only</li>
</ol>
<p class="quiz-explain"><code>@Value</code> is the immutable variant of <code>@Data</code>: every field becomes <code>private final</code>, and the class itself becomes <code>final</code>.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">Why is <code>@Data</code> a poor choice on a Hibernate entity?</p>
<ol class="quiz-options">
<li>It doesn't generate getters</li>
<li>Hibernate refuses to load classes with Lombok annotations</li>
<li data-correct>Its generated <code>equals</code>/<code>hashCode</code>/<code>toString</code> use all fields, including lazy associations, causing extra loads, exceptions or recursion</li>
<li>It makes the class <code>final</code></li>
</ol>
<p class="quiz-explain">Use <code>@Getter @Setter</code> on entities (as <code>ApiUser</code> does) and write <code>equals</code>/<code>hashCode</code> deliberately if you need them.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">A field is declared <code>private boolean active;</code> with <code>@Getter</code>. What is the generated getter called?</p>
<ol class="quiz-options">
<li><code>getActive()</code></li>
<li data-correct><code>isActive()</code></li>
<li><code>active()</code></li>
<li><code>getIsActive()</code></li>
</ol>
<p class="quiz-explain">Primitive <code>boolean</code> fields get the <code>is</code> prefix. A boxed <code>Boolean</code> gets <code>getActive()</code>. (<code>active()</code> is the naming of a <code>record</code> accessor.)</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">The project builds with <code>mvn package</code>, but IntelliJ shows "cannot find symbol: method getRepository()". Most likely cause?</p>
<ol class="quiz-options">
<li>The method really doesn't exist</li>
<li data-correct>The Lombok plugin / annotation processing isn't enabled in the IDE</li>
<li>Maven skipped compilation</li>
<li>The interface needs a <code>default</code> implementation</li>
</ol>
<p class="quiz-explain">Lombok runs as an annotation processor during compilation. Maven runs it; an unconfigured IDE doesn't, so it can't see the generated methods.</p>
</div>

### Flashcards

<div class="flashcards" data-flashcards>
<div class="card"><div class="front"><code>public string Name { get; set; }</code></div><div class="back"><code>private String name;</code> + <code>@Getter @Setter</code></div></div>
<div class="card"><div class="front"><code>record User(string Name)</code></div><div class="back">Java <code>record</code>, or Lombok <code>@Value</code> (+ <code>@Builder</code>)</div></div>
<div class="card"><div class="front"><code>new X { A = 1 }</code></div><div class="back"><code>X.builder().a(1).build()</code> with <code>@Builder</code></div></div>
<div class="card"><div class="front"><code>ILogger&lt;T&gt; _log</code></div><div class="back"><code>@Slf4j</code> gives a static <code>log</code> field</div></div>
</div>

### Self-checks

<details class="qa">
<summary>Self-check: what does <code>@Getter(onMethod_ = {@Override})</code> generate, and why is <code>@Override</code> needed there?</summary>
<div class="ans">
It generates a getter method that also satisfies an interface's
abstract getter; signature matching alone is what makes it satisfy that
interface. The <code>@Override</code> passed into the Lombok config is
a compile-time safety net: it makes the build fail if the generated
method doesn't actually match the interface method it's meant to
implement, catching a signature mismatch early instead of at runtime.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<details class="qa">
<summary>Self-check: why are the DTOs in <code>restAPI/models</code> records while the entities in <code>dbEntities</code> are Lombok classes?</summary>
<div class="ans">
DTOs are immutable data carriers, which is exactly what a
<code>record</code> is. Entities must have a no-args constructor, mutable
fields and a non-final class so Hibernate can instantiate, populate and
proxy them; records give you none of those, so entities use
<code>@Getter @Setter @NoArgsConstructor</code>.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<button type="button" data-mark-done>Mark this step done</button>

</div>
