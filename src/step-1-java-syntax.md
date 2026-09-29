# Step 1: Java Syntax, Fast (from C#)

<div class="level-tabs" data-levels>
  <button data-level="overview" aria-pressed="true">Overview</button>
  <button data-level="deep">Deep Understanding</button>
  <button data-level="drill">Drilling</button>
</div>

<div class="level overview">

Every file in the repo is plain Java, and the differences that trip a C#
developer show up immediately: `Optional<T>`, `final`, `record`, `switch`
expressions, wildcard generics, and the absence of properties (getters
and setters come from Lombok, covered in Step 6). This step is a fast
syntax translation, not a Java course.

</div>

<div class="level deep">

### 1.1 Java for C# Developers (YouTube, ABMedia)

[https://www.youtube.com/watch?v=heZJ3iGj3KA](https://www.youtube.com/watch?v=heZJ3iGj3KA)
🔎 title and channel confirmed; a search listing dates it May 2020
(unconfirmed).

See how the project models a "nullable result":

```java
// controllers/SchoolController.java
default ResponseEntity<Scholen> getById(@PathVariable("id") Short id) {
    return getRepository().findById(id)                       // Optional<Scholen>
            .map(person -> ResponseEntity.ok().body(person))  // like ?.Select / Map
            .orElse(ResponseEntity.notFound().build());       // like ?? fallback
}
```

`Optional<T>`, `final`, `record`, `switch` expressions (`Configuration.java`),
wildcard generics (`ResponseEntity<? extends Persoon>`), and the absence
of properties are all in play from line 1.

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

</div>

<div class="level drill">

<ul class="checklist">
<li><label><input type="checkbox"><span>Open <code>restAPI/models/VwoParticipantInformation.java</code> and write the equivalent C# <code>record</code> with <code>[JsonPropertyName]</code>.</span></label></li>
</ul>

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

<button type="button" data-mark-done>Mark this step done</button>

</div>
