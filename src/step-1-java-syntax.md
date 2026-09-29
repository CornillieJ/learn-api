# Step 1: Java Syntax, Fast (from C#)

<div class="level-tabs" data-levels>
  <button data-level="overview" aria-pressed="true">Overview</button>
  <button data-level="deep">Deep Understanding</button>
  <button data-level="drill">Drilling</button>
</div>

<div class="level overview">

Good news first: you can already read about 80% of `vwo-api`. Java and
C# share a grandparent, and classes, interfaces, generics, lambdas and
exceptions look almost identical. This step is about the other 20%, the
differences that make a C# developer stop and squint: `Optional<T>`
instead of `?.`/`??`, no properties, `record`s, `switch` expressions,
wildcard generics, default interface methods, and checked exceptions.
It's a syntax translation, not a Java course.

**After this step you can:**

- read any controller, DAO or entity in the repo without looking up syntax;
- translate `?.` / `??` / LINQ habits into `Optional` and Streams;
- spot the four Java traps that compile fine but behave differently from C#
  (`==` on objects, checked exceptions, type erasure, virtual-by-default).

The repo's most typical line of code, next to what you'd write in ASP.NET Core:

<div class="code-compare" data-code-compare>

```csharp
// C#: ASP.NET Core controller action
[HttpGet("{id}")]
public async Task<ActionResult<School>> GetById(short id)
{
    var school = await _repository.FindByIdAsync(id); // School?
    return school is null ? NotFound() : Ok(school);
}
```

```java
// Java: controllers/SchoolController.java (a default method in an interface)
default ResponseEntity<Scholen> getById(@PathVariable("id") Short id) {
    return getRepository().findById(id)                       // Optional<Scholen>
            .map(person -> ResponseEntity.ok().body(person))
            .orElse(ResponseEntity.notFound().build());
}
```

</div>

Notice: no `async` (a servlet thread blocks per request), `Short` not
`short` (generics and nullable values need the boxed type), and the
"might be missing" case is carried by `Optional` rather than by a
nullable reference.

</div>

<div class="level deep">

### 1.1 Java for C# Developers (YouTube, ABMedia)

[https://www.youtube.com/watch?v=heZJ3iGj3KA](https://www.youtube.com/watch?v=heZJ3iGj3KA)
🔎 title and channel confirmed; a search listing dates it May 2020
(unconfirmed). Watch it at 1.5x: it's a good tour of the vocabulary.

`Optional<T>`, `final`, `record`, `switch` expressions (`Configuration.java`),
wildcard generics (`ResponseEntity<? extends Persoon>`), and the absence
of properties are all in play from line 1 of this repo.

### 1.2 📖 Tips for Java Developers: A Tour of C# (Microsoft Learn)

[https://learn.microsoft.com/en-us/dotnet/csharp/tour-of-csharp/tips-for-java-developers](https://learn.microsoft.com/en-us/dotnet/csharp/tour-of-csharp/tips-for-java-developers)
✅ page last updated 2026-09-18. Written for the opposite direction
(Java → C#): read it backwards, each "C# has X" tells you what Java
lacks or does differently.

<div class="callout note">
<div class="callout-label">Maps onto this repo</div>

- "Properties … in Java are naming conventions for `get`/`set`" → why every entity has Lombok `@Getter @Setter`.
- "Attributes are similar to Java annotations" → the whole project is annotation-driven (`@RestController`, `@Transactional`, `@Entity`, `@JsonProperty`).
- "NuGet … is analogous to Maven" → `pom.xml` (Step 2).
- "C# doesn't have checked exceptions" → signatures like `transfer(...) throws …` must be handled or declared.
- "Records … can be immutable" → the DTOs in `restAPI/models` (`Pool`, `VwoParticipantInformation`) are Java `record`s.

</div>

### 1.3 Mental model: nullability lives in `Optional`, not in the type

C# 8+ has nullable reference types and `?.`/`??`. Java has neither: any
reference can be `null` and the compiler won't warn you. `Optional<T>`
is the library answer, and Hibernate-style repositories return it from
`findById`.

<div class="code-compare" data-code-compare>

```csharp
var name = repo.Find(id)?.Name ?? "unknown";
var school = repo.Find(id) ?? throw new NotFoundException();
```

```java
String name = repo.findById(id).map(School::getName).orElse("unknown");
School school = repo.findById(id).orElseThrow(NotFoundException::new);
```

</div>

<div class="callout danger">
<div class="callout-label">Gotchas</div>

- `optional.get()` on an empty `Optional` throws `NoSuchElementException`. Prefer `orElse`, `orElseGet`, `orElseThrow`.
- `orElse(x)` evaluates `x` **always**, even when a value is present. `orElseGet(() -> x)` is lazy. In `getById` above, `ResponseEntity.notFound().build()` is built on every call; harmless there, expensive if `x` were a DB call.
- `Optional` is meant for return types. Don't use it for fields or parameters.

</div>

(`School::getName` is a method reference, Java's shorthand for
`s -> s.getName()`.)

### 1.4 Mental model: `==` compares references, always

C# overloads `==` for `string` and lets you override it. Java never
does: on objects, `==` is reference identity. Use `.equals()` (or
`Objects.equals(a, b)`, which is null-safe).

<div class="code-compare" data-code-compare>

```csharp
string a = GetCode(); string b = GetCode();
if (a == b) { }            // value comparison
short? x = 200, y = 200;
if (x == y) { }            // true
```

```java
String a = getCode(); String b = getCode();
if (a.equals(b)) { }        // value comparison; a == b is identity
Short x = 200, y = 200;
if (x.equals(y)) { }        // true; x == y is FALSE
```

</div>

<div class="callout danger">
<div class="callout-label">The boxed-id trap</div>
Boxed <code>Short</code>/<code>Integer</code>/<code>Long</code> values between
-128 and 127 are cached, so <code>==</code> happens to work for small ids and
silently breaks above 127. The repo passes school ids around as
<code>Short</code>: always compare them with <code>.equals()</code>.
Same idea for <code>BigDecimal</code> (Java's <code>decimal</code>):
<code>new BigDecimal("1.0").equals(new BigDecimal("1.00"))</code> is
<code>false</code> because scale counts; compare amounts with
<code>compareTo(...) == 0</code>.
</div>

### 1.5 Mental model: checked exceptions

In Java, an exception that extends `Exception` but not
`RuntimeException` is *checked*: the compiler forces every caller to
either `catch` it or declare `throws` it. C# has nothing like this.

<div class="code-compare" data-code-compare>

```csharp
public string Load(string path)
{
    return File.ReadAllText(path); // may throw IOException; nobody is forced to care
}
```

```java
public String load(Path path) throws IOException {   // must declare...
    return Files.readString(path);
}
// ...or catch and wrap in an unchecked exception:
try { return Files.readString(path); }
catch (IOException e) { throw new UncheckedIOException(e); }
```

</div>

Spring and Hibernate mostly throw *unchecked* exceptions
(`DataAccessException`, `HibernateException`), so you'll see fewer
`throws` clauses than you'd fear. This matters again in Step 4: by
default `@Transactional` rolls back on unchecked exceptions only.

### 1.6 Mental model: generics are erased at runtime

C# generics are reified: `typeof(T)` works and `List<int>` is a real
type. Java erases type arguments after compiling: at runtime a
`List<String>` is just a `List`.

- No `new T()`, no `T.class`, no `x instanceof List<String>`.
- You can't overload `f(List<String>)` and `f(List<Integer>)`.
- No primitives in generics: `List<Integer>`, never `List<int>`.
- APIs that need the type ask for a `Class<T>` argument. That's why
  `ScholenDaoImpl` calls `session.createQuery(hql, type)`: `type` is a
  `Class` object standing in for the erased type argument.

Wildcards are Java's variance: `ResponseEntity<? extends Persoon>` reads
like C#'s `IEnumerable<out T>` covariance, but declared at the use site
instead of on the interface.

### 1.7 Mental model: everything is virtual, interfaces can hold code

In C#, methods are non-virtual unless marked `virtual`. In Java every
non-`static`, non-`final`, non-`private` instance method is virtual, and
`@Override` is an optional (but always-use-it) annotation, not a
keyword. Spring leans on this: it creates subclasses at runtime (proxies)
that override your methods (Step 3).

Java 8+ interfaces can hold `default` methods with bodies, like C# 8
default interface members. The repo builds its controllers on this:
the version-less interface `controllers/SchoolController.java` holds the
logic as `default` methods, and the thin v2 class just implements it.

<div class="code-compare" data-code-compare>

```csharp
public interface ISchoolController
{
    IRepository Repository { get; }
    ActionResult<School> GetById(short id) =>
        Repository.Find(id) is { } s ? new OkObjectResult(s) : new NotFoundResult();
}
```

```java
public interface SchoolController {
    ScholenRepository getRepository();
    default ResponseEntity<Scholen> getById(@PathVariable("id") Short id) { ... }
}
// controllers/v2/SchoolController.java implements it; Lombok generates getRepository()
```

</div>

### 1.8 LINQ ↔ Streams in one table

<div class="table-wrap">

| LINQ | Java Stream | Note |
|---|---|---|
| `Where(x => …)` | `filter(x -> …)` | lambda arrow is `->` |
| `Select` | `map` | |
| `SelectMany` | `flatMap` | |
| `First()` / `FirstOrDefault()` | `findFirst()` → `Optional` | then `.orElse(null)` / `.orElseThrow()` |
| `Any` / `All` | `anyMatch` / `allMatch` | |
| `OrderBy(x => x.Name)` | `sorted(Comparator.comparing(X::getName))` | |
| `GroupBy` | `collect(Collectors.groupingBy(...))` | gives a `Map<K, List<V>>` |
| `ToList()` | `collect(Collectors.toList())` or `.toList()` (Java 16+, unmodifiable) | |
| `ToDictionary` | `collect(Collectors.toMap(k, v))` | throws on duplicate keys |
| `Sum(x => x.N)` | `mapToInt(X::getN).sum()` | |
| `Take` / `Skip` | `limit` / `skip` | |

</div>

A stream can be consumed only once, and it never becomes SQL: there is
no `IQueryable`. Database filtering happens in HQL (Step 4).

### 1.9 Quick syntax map

<div class="table-wrap">

| C# | Java 17 |
|---|---|
| `namespace X;` / `using X;` | `package x;` (must match the folder) / `import x.Y;` |
| `var`, `const`, `readonly` | `var` (locals only), `static final`, `final` |
| `internal` | package-private (no modifier); note Java `protected` is also package-visible |
| `sealed class` | `final class` |
| `record Point(int X, int Y)` | `record Point(int x, int y)` with accessors `x()`, `y()` |
| `$"Hi {name}"` | `"Hi %s".formatted(name)` or `String.format(...)` |
| `"""raw"""` | text block `"""` (Java 15+) |
| `switch` expression | `switch` expression with `->` and `yield` (Java 14+) |
| `obj is Foo f` | `obj instanceof Foo f` (Java 16+) |
| `using (var r = …)` / `IDisposable` | `try (var r = …)` / `AutoCloseable` |
| `Func<T,R>`, `Action<T>`, `Func<T>`, `Func<T,bool>` | `Function<T,R>`, `Consumer<T>`, `Supplier<T>`, `Predicate<T>` |
| `[Attribute]` | `@Annotation` |
| `typeof(Foo)` | `Foo.class` |
| `decimal`, `DateTime` | `BigDecimal`, `java.time.LocalDate` / `LocalDateTime` / `Instant` |
| enums are named ints | enums are full classes (fields, methods, constructors) |

</div>

</div>

<div class="level drill">

### Tasks

<ul class="checklist">
<li><label><input type="checkbox"><span>Open <code>restAPI/models/VwoParticipantInformation.java</code> and write the equivalent C# <code>record</code> with <code>[JsonPropertyName]</code>.</span></label></li>
<li><label><input type="checkbox"><span>Find the <code>switch</code> expression in <code>Configuration.java</code> and rewrite it as a C# switch expression on paper.</span></label></li>
<li><label><input type="checkbox"><span>Read <code>getById</code> in <code>controllers/SchoolController.java</code> and rewrite it with an explicit <code>if (opt.isPresent())</code>. Then decide which version you'd rather maintain.</span></label></li>
<li><label><input type="checkbox"><span>Search the repo for <code>==</code> between boxed ids (<code>Short</code>, <code>Integer</code>, <code>Long</code>) or strings. Note any hit as a candidate bug.</span></label></li>
</ul>

### Quiz

<div class="quiz" data-quiz>
<p class="quiz-q">Given <code>Short a = 200; Short b = 200;</code>, what does <code>a == b</code> evaluate to?</p>
<ol class="quiz-options">
<li><code>true</code>, because the values are equal</li>
<li data-correct><code>false</code>, because <code>==</code> compares references and 200 is outside the -128..127 cache</li>
<li>It doesn't compile</li>
<li>It throws a <code>NullPointerException</code></li>
</ol>
<p class="quiz-explain">On objects, <code>==</code> is identity. Boxed values from -128 to 127 are cached (so small ids "work"), 200 creates two distinct objects. Use <code>a.equals(b)</code>.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">A method calls <code>Files.readString(path)</code>, which declares <code>throws IOException</code>. What must the calling method do?</p>
<ol class="quiz-options">
<li>Nothing; exceptions propagate automatically like in C#</li>
<li>Annotate the method with <code>@Throws</code></li>
<li data-correct>Either catch <code>IOException</code> or declare <code>throws IOException</code> itself</li>
<li>Wrap the call in <code>Optional</code></li>
</ol>
<p class="quiz-explain"><code>IOException</code> is a checked exception: the compiler refuses to build until it is caught or declared. Unchecked exceptions (<code>RuntimeException</code> subclasses) have no such rule.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">Which is the Java equivalent of <code>repo.Find(id)?.Name ?? "unknown"</code> when <code>findById</code> returns <code>Optional&lt;School&gt;</code>?</p>
<ol class="quiz-options">
<li><code>repo.findById(id).get().getName() ?? "unknown"</code></li>
<li data-correct><code>repo.findById(id).map(School::getName).orElse("unknown")</code></li>
<li><code>repo.findById(id)?.getName() ?: "unknown"</code></li>
<li><code>repo.findById(id).orElse("unknown").getName()</code></li>
</ol>
<p class="quiz-explain">Java has no <code>?.</code> or <code>??</code> operators. <code>map</code> transforms the value if present; <code>orElse</code> supplies the fallback.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">Why does <code>session.createQuery(hql, type)</code> need a <code>type</code> argument when the method is already generic?</p>
<ol class="quiz-options">
<li>HQL strings must be cast manually</li>
<li data-correct>Type erasure: the type argument doesn't exist at runtime, so the <code>Class</code> object is passed explicitly</li>
<li>It selects which database table to query</li>
<li>It is optional and only improves performance</li>
</ol>
<p class="quiz-explain">Java generics are erased after compilation. Code that needs the type at runtime asks for a <code>Class&lt;T&gt;</code> (the Java counterpart of passing <code>typeof(T)</code>).</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">In Java, which methods can a subclass override without the base class opting in?</p>
<ol class="quiz-options">
<li>Only methods marked <code>virtual</code></li>
<li>Only abstract methods</li>
<li data-correct>Any non-<code>static</code>, non-<code>final</code>, non-<code>private</code> instance method</li>
<li>Only methods annotated <code>@Override</code></li>
</ol>
<p class="quiz-explain">Java methods are virtual by default; <code>final</code> is how you opt out. <code>@Override</code> is just a compile-time check on the overriding side.</p>
</div>

### Flashcards

<div class="flashcards" data-flashcards>
<div class="card"><div class="front"><code>x?.Name ?? "n/a"</code></div><div class="back"><code>opt.map(X::getName).orElse("n/a")</code></div></div>
<div class="card"><div class="front"><code>a == b</code> on strings</div><div class="back"><code>a.equals(b)</code> or <code>Objects.equals(a, b)</code>; <code>==</code> is identity</div></div>
<div class="card"><div class="front"><code>typeof(T)</code></div><div class="back">Not possible (erasure); pass a <code>Class&lt;T&gt;</code></div></div>
<div class="card"><div class="front"><code>using (var r = ...)</code></div><div class="back"><code>try (var r = ...) { }</code> with <code>AutoCloseable</code></div></div>
<div class="card"><div class="front"><code>Func&lt;T,bool&gt;</code></div><div class="back"><code>Predicate&lt;T&gt;</code></div></div>
<div class="card"><div class="front"><code>internal</code></div><div class="back">package-private (no modifier)</div></div>
</div>

### Self-checks

<details class="qa">
<summary>Self-check: why does <code>getById</code> return <code>Optional&lt;Scholen&gt;</code> from the repository instead of a nullable <code>Scholen</code>?</summary>
<div class="ans">
Because Java has no null-conditional operator built into the type
system the way C#'s <code>?.</code>/<code>??</code> do. <code>Optional</code> makes the
"might not exist" case explicit in the method's return type, and
<code>.map(...).orElse(...)</code> is the idiomatic replacement for
<code>?.Select(...) ?? fallback</code>.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<details class="qa">
<summary>Self-check: the v2 <code>SchoolController</code> class has almost no methods. Where does its behaviour come from?</summary>
<div class="ans">
From <code>default</code> methods in the version-less interface
<code>controllers/SchoolController.java</code> that it implements. The
class only supplies what the interface can't: the injected repository,
exposed through a Lombok-generated <code>getRepository()</code>, and the
<code>@RequestMapping</code> base path.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<details class="qa">
<summary>Self-check: why is <code>List&lt;int&gt;</code> a compile error in Java?</summary>
<div class="ans">
Generic type arguments must be reference types, because of erasure:
at runtime every type argument is treated as <code>Object</code>. Use the
boxed type, <code>List&lt;Integer&gt;</code>, and remember boxed values
compare with <code>.equals()</code>.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<button type="button" data-mark-done>Mark this step done</button>

</div>
