# Step 6: Lombok (why the code has almost no getters/setters)

<div class="level-tabs" data-levels>
  <button data-level="overview" aria-pressed="true">Overview</button>
  <button data-level="deep">Deep Understanding</button>
  <button data-level="drill">Drilling</button>
</div>

<div class="level overview">

Entities and controllers across the project depend on Lombok to
generate getters, setters, constructors, and builders at compile time.
Without the Lombok IDE plugin installed, your editor will show phantom
"cannot find symbol" errors for methods that do exist once Lombok has
run. This step covers what Lombok generates and where.

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

</div>

<div class="level drill">

<ul class="checklist">
<li><label><input type="checkbox"><span>In IntelliJ, use <em>Delombok</em> on <code>ApiUser</code> to see the code Lombok actually generates.</span></label></li>
</ul>

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

<button type="button" data-mark-done>Mark this step done</button>

</div>
