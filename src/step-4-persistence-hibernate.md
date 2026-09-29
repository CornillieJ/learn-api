# Step 4: Persistence, Hibernate & HQL

<div class="level-tabs" data-levels>
  <button data-level="overview" aria-pressed="true">Overview</button>
  <button data-level="deep">Deep Understanding</button>
  <button data-level="drill">Drilling</button>
</div>

<div class="level overview">

If you know EF Core, you already know 70% of Hibernate: a unit of work
that tracks entities, a query language over objects, lazy loading,
transactions. The surprise is *how* this repo uses it: **native
Hibernate 5.6** (`SessionFactory`/`Session`) with hand-written DAOs, not
Spring Data JPA, so anything you read about `JpaRepository` will not
match. There are two `SessionFactory`s (read-write and read-only),
chosen per method with `@Transactional`; entities can have composite
keys via `@IdClass`; every custom query is an **HQL string**; and a
second-level cache is configured through JCache/Ehcache, though it
caches less than it looks like it does.

**After this step you can:**

- map `DbContext`, `DbSet`, LINQ, `SaveChanges` and `Include` to their Hibernate counterparts;
- read and write an HQL query in a DAO, with named parameters;
- pick the right transaction (`transactionR` vs `transactionRW`) for a new DAO method;
- explain and avoid `LazyInitializationException`.

<div class="code-compare" data-code-compare>

```csharp
// EF Core: LINQ, compiled and type-checked
var schools = await db.Schools
    .Where(s => db.Functies.Any(f =>
        f.SchoolId == s.SchoolId && f.PersoonId == userId &&
        (f.Functie == "VWO" || f.Functie == "JWO")))
    .ToListAsync();
```

```java
// dao/impl/ScholenDaoImpl.java: HQL, a string checked at runtime
String hql = "SELECT s FROM Scholen s "
           + "JOIN Functies f ON s.schoolId = f.schoolId "
           + "WHERE f.persoonId = :userId AND (f.functie = 'VWO' OR f.functie = 'JWO')";
Query<Scholen> query = session.createQuery(hql, type);
query.setParameter("userId", userId);
```

</div>

</div>

<div class="level deep">

### 4.1 📖 Hibernate ORM 5.6.15.Final User Guide (official docs)

[https://docs.hibernate.org/orm/5.6/userguide/html_single/Hibernate_User_Guide.html](https://docs.hibernate.org/orm/5.6/userguide/html_single/Hibernate_User_Guide.html)
✅ title reads "Hibernate ORM 5.6.15.Final User Guide", exactly the
version in `pom.xml`. Covers `SessionFactory` (thread-safe, immutable,
factory for `Session`s), HQL (ch. 15), transactions (ch. 8), composite
identifiers including `@IdClass` (§2.6.2), and caching (ch. 13)
including JCache/Ehcache providers.

```java
@Entity @Table(name = "Gln") @IdClass(GlnId.class)          // composite id (§2.6.2)
public class Gln implements Serializable { @Id short schoolId; @Id ContestRole contest; ... }
```

```xml
<!-- hibernate_VWO.cfg.xml: second-level cache via JCache/Ehcache (ch. 13) -->
<property name="hibernate.cache.region.factory_class">org.hibernate.cache.jcache.internal.JCacheRegionFactory</property>
```

### 4.2 Hibernate 5 tutorials on YouTube (two playlists)

| Playlist | Link | Verified |
|---|---|---|
| "Hibernate 5 Tutorial" (Java Guides) | [https://www.youtube.com/playlist?list=PLGRDMO4rOGcMrHnQoSg3pK4PpxCV6pzmO](https://www.youtube.com/playlist?list=PLGRDMO4rOGcMrHnQoSg3pK4PpxCV6pzmO) | 🔎 title + channel |
| "Hibernate 5 Tutorials" (KK JavaTutorials) | [https://www.youtube.com/playlist?list=PLzS3AYzXBoj_o6sOu2CUnnSEk1e8Sb1op](https://www.youtube.com/playlist?list=PLzS3AYzXBoj_o6sOu2CUnnSEk1e8Sb1op) | 🔎 title + channel |

Found via search and confirmed through YouTube metadata; contents and
length not reviewed, so sample the first episodes. Take from them:
`SessionFactory` vs `Session`, entity mapping, CRUD, relationships, and
lazy vs eager fetching.

```java
// dao/impl/VwoDaoImpl.java: two DB identities, chosen per transaction
protected static final String transactionRW = "transactionVwoRW";
protected static final String transactionR  = "transactionVwoR";
@Override @Transactional(value = transactionR, readOnly = true)
public E get(K key) { return super.get(key); }
```

<div class="callout danger">
<div class="callout-label">Watch out</div>
Every entity must be registered in <code>hibernate_VWO.cfg.xml</code>;
adding a new <code>@Entity</code> class without listing it there means
Hibernate never sees it.
</div>

### 4.3 HQL (Hibernate Query Language) Tutorial with Examples (YouTube, channel realNameHidden)

[https://www.youtube.com/watch?v=UoykY15IdPQ](https://www.youtube.com/watch?v=UoykY15IdPQ)
🔎 title and channel confirmed; content itself unverified. All custom
queries in the project are HQL strings: SQL-like, but over entities and
fields, not tables and columns.

```java
// dao/impl/ScholenDaoImpl.java
String hql = "SELECT s FROM Scholen s "
           + "JOIN Functies f ON s.schoolId = f.schoolId "
           + "WHERE f.persoonId = :userId AND (f.functie = 'VWO' OR f.functie = 'JWO')";
Query<Scholen> query = session.createQuery(hql, type);
query.setParameter("userId", userId);
```

Logins use the same mechanism with a DB function called from HQL:
`WHERE w.wachtwoord = sha2(:password, 256)` (Knowledge File §8.4,
§19.1).

### 4.4 📖 HQL and SessionFactory written tutorials

| Article | Verified | Use it for / caveat |
|---|---|---|
| [Hibernate Query Language (HQL) Example, CodeJava](https://www.codejava.net/frameworks/hibernate/hibernate-query-language-hql-example) | ✅ SELECT/INSERT-SELECT/UPDATE/DELETE, JOINs, aggregates, pagination and sorting, parameter binding, date-range filters | HQL syntax matching the named-parameter style (`:userId`) used in the repo |
| [Hibernate SessionFactory Tutorial, JavaGuides](https://www.javaguides.net/2024/05/hibernate-sessionfactory-tutorial.html) | ✅ Maven setup, XML config, entities, CRUD, application-wide singleton `SessionFactory` and pooling | Uses Hibernate 6.4.0 and Jakarta Persistence 3.1: concepts apply, but imports (`jakarta.persistence`) differ from this project's `javax.persistence` |
| [HQL Example Tutorial, DigitalOcean](https://www.digitalocean.com/community/tutorials/hibernate-query-language-hql-example-tutorial) | ⚠️ page fetched, but only site chrome rendered, not read | not verified |

The JavaGuides article's XML-config plus `SessionFactory` approach is
the closest written match to `hibernate_VWO.cfg.xml` and
`LocalSessionFactoryBean`; CodeJava's JOIN and parameter examples map
directly onto `ScholenDaoImpl`.

### 4.5 Mental model: `Session` is your `DbContext`

<div class="table-wrap">

| EF Core | Hibernate 5.6 (this repo) |
|---|---|
| `DbContextOptions` / factory, built once | `SessionFactory`: thread-safe, expensive, one per database identity (here: RW and R) |
| `DbContext` (per request, not thread-safe) | `Session`: per transaction, not thread-safe, holds the first-level cache |
| `DbSet<T>` | no equivalent; the DAO hierarchy (`AbstractDao` → `VwoDao` → ~60 per-entity DAOs) plays that role |
| change tracking + `SaveChanges()` | dirty checking + **flush**, which happens automatically before commit |
| `AsNoTracking()` | a read-only transaction (`readOnly = true`) |
| `Include(x => x.Children)` | `JOIN FETCH` in HQL |
| `[Key]`, composite `HasKey(a, b)` | `@Id`; composite with `@IdClass` (here `Gln` + `GlnId`) or `@EmbeddedId` |
| model built from `DbSet`s / `OnModelCreating` | every entity listed in `hibernate_VWO.cfg.xml` |
| migrations | none built into Hibernate |

</div>

<div class="callout danger">
<div class="callout-label">Dirty checking surprise</div>
Load an entity inside a read-write transaction, change a field, and
return: Hibernate writes an <code>UPDATE</code> at commit even though you
never called <code>save</code>/<code>update</code>. It's EF's change
tracker plus an automatic <code>SaveChanges()</code>. Only modify managed
entities when you mean to persist the change.
</div>

### 4.6 Mental model: HQL is not LINQ

- **Strings, not expressions.** A typo in an entity or field name
  compiles fine and fails at runtime when the query is created. Run
  every new query once against a dev DB.
- **Entities and fields, not tables and columns.** `FROM Scholen s`
  names the Java class; `s.schoolId` names the Java field. The
  `@Table`/`@Column` mapping translates to SQL.
- **Always named parameters** (`:userId` + `setParameter`). Never
  concatenate input into the string; that's SQL injection, same as
  `FromSqlRaw` with interpolation.
- `JOIN Functies f ON ...` joins two entities that have no mapped
  relationship (supported since Hibernate 5.1). The repo needs this
  because many foreign keys exist only as matching column names, with
  no `@ManyToOne` to navigate.
- There is no `IQueryable` composition: you build a new string (or use
  the Criteria API) instead of chaining `.Where()`.

### 4.7 Mental model: transactions and rollback rules

<div class="code-compare" data-code-compare>

```csharp
await using var tx = await db.Database.BeginTransactionAsync();
try { /* work */ await db.SaveChangesAsync(); await tx.CommitAsync(); }
catch { await tx.RollbackAsync(); throw; }   // ANY exception rolls back
```

```java
// dao/impl/VwoDaoImpl.java
@Override @Transactional(value = transactionR, readOnly = true)
public E get(K key) { return super.get(key); }
// value = which transaction manager (so which SessionFactory / DB identity)
// Rollback by default: RuntimeException and Error only.
// A CHECKED exception commits unless you add rollbackFor = Exception.class.
```

</div>

- `value = transactionR` / `transactionRW` picks the transaction manager
  bean, and with it the database identity. Reads go through R, writes
  through RW.
- `readOnly = true` is a hint: with Spring's Hibernate integration it
  switches the session to manual flushing, so changes you make to
  entities are not written.
- The proxy rules from Step 3 apply: `@Transactional` on a private
  method or on a method called via `this` does nothing.

### 4.8 Mental model: `LazyInitializationException`

In JPA mappings, `@OneToMany`/`@ManyToMany` are **lazy** by default and
`@ManyToOne`/`@OneToOne` are **eager**. A lazy association is a proxy
that loads on first access, which only works while the `Session` is
open. Access it after the `@Transactional` DAO method has returned (for
example while Jackson serialises the entity in the controller) and you
get `LazyInitializationException: could not initialize proxy - no
Session`.

EF Core with lazy-loading proxies would just run the query (or return
an empty navigation without them). Hibernate refuses. Fixes, best first:
fetch what you need inside the transaction (`JOIN FETCH`), map to a DTO
inside the transaction, or initialise the association explicitly
(`Hibernate.initialize(...)`). Don't count on Boot's
"open session in view": it belongs to Boot's JPA auto-configuration, and
this repo wires native Hibernate by hand in XML.

</div>

<div class="level drill">

### Tasks

<ul class="checklist">
<li><label><input type="checkbox"><span>Read <code>dbEntities/Gln.java</code> and <code>GlnId.java</code>, then <code>dao/impl/GlnDaoImpl.java</code>, then <code>InvoiceRepositoryImpl.setGln</code> (update-if-exists / insert / delete).</span></label></li>
<li><label><input type="checkbox"><span>On paper, add a DAO method "schools in a postal-code range" by copying <code>schoolsPerZipcode</code> and changing the HQL. Decide whether it gets <code>transactionR</code> or <code>transactionRW</code>.</span></label></li>
<li><label><input type="checkbox"><span>Pick one entity in <code>dbEntities/</code> and find its line in <code>hibernate_VWO.cfg.xml</code>.</span></label></li>
<li><label><input type="checkbox"><span>In <code>VwoDaoImpl</code>, list which methods use <code>transactionR</code> and which use <code>transactionRW</code>. Does every write go through RW?</span></label></li>
</ul>

### Quiz

<div class="quiz" data-quiz>
<p class="quiz-q">Which Hibernate type plays the role of EF Core's <code>DbContext</code>?</p>
<ol class="quiz-options">
<li><code>SessionFactory</code></li>
<li data-correct><code>Session</code></li>
<li><code>Query</code></li>
<li><code>LocalSessionFactoryBean</code></li>
</ol>
<p class="quiz-explain">A <code>Session</code> is the short-lived, non-thread-safe unit of work with its own identity map. The <code>SessionFactory</code> is the long-lived, thread-safe thing that creates sessions.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">Inside a read-write <code>@Transactional</code> method you load an entity and call a setter on it, but never call <code>save</code> or <code>update</code>. What happens at commit?</p>
<ol class="quiz-options">
<li>Nothing; Hibernate needs an explicit save</li>
<li data-correct>Hibernate detects the change (dirty checking), flushes, and issues an <code>UPDATE</code></li>
<li>An exception is thrown because the entity is detached</li>
<li>The change is kept only in the second-level cache</li>
</ol>
<p class="quiz-explain">Managed entities are change-tracked. The flush before commit writes every dirty entity, like an implicit <code>SaveChanges()</code>.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">A method annotated <code>@Transactional</code> (no other attributes) throws a checked <code>Exception</code> after writing to the database. What happens by default?</p>
<ol class="quiz-options">
<li>The transaction rolls back</li>
<li data-correct>The transaction commits; only <code>RuntimeException</code> and <code>Error</code> trigger a rollback by default</li>
<li>Spring wraps it in a <code>RuntimeException</code> and rolls back</li>
<li>The write is retried</li>
</ol>
<p class="quiz-explain">Spring's default rollback rule follows EJB convention. Use <code>rollbackFor = Exception.class</code> if a checked exception should undo the work.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">In <code>SELECT s FROM Scholen s WHERE s.schoolId = :id</code>, what are <code>Scholen</code> and <code>schoolId</code>?</p>
<ol class="quiz-options">
<li>The table name and the column name</li>
<li data-correct>The entity class name and the Java field name</li>
<li>A view and a stored-procedure parameter</li>
<li>The DAO class and its method</li>
</ol>
<p class="quiz-explain">HQL is written against the object model. Hibernate translates entity and field names to tables and columns using the mapping annotations.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">A controller returns an entity; Jackson serialises it and touches a lazy <code>@OneToMany</code> collection after the DAO's transaction has ended. What do you get?</p>
<ol class="quiz-options">
<li>An empty list</li>
<li>A second query that loads the collection</li>
<li data-correct><code>LazyInitializationException</code> (no Session)</li>
<li><code>NullPointerException</code></li>
</ol>
<p class="quiz-explain">The lazy proxy needs an open session to load. Fetch it inside the transaction (<code>JOIN FETCH</code>) or map to a DTO before returning.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">You add a new <code>@Entity</code> class under <code>dbEntities/</code> and query it with HQL. It fails with an "is not mapped" error. Most likely cause in this repo?</p>
<ol class="quiz-options">
<li>Missing <code>@Repository</code> annotation</li>
<li data-correct>The class isn't listed in <code>hibernate_VWO.cfg.xml</code></li>
<li>The table name contains uppercase letters</li>
<li>The second-level cache is stale</li>
</ol>
<p class="quiz-explain">Here entities are registered explicitly in the Hibernate config file; an unlisted class is invisible to Hibernate.</p>
</div>

### Flashcards

<div class="flashcards" data-flashcards>
<div class="card"><div class="front"><code>DbContext</code></div><div class="back"><code>Session</code> (unit of work, first-level cache)</div></div>
<div class="card"><div class="front"><code>SaveChanges()</code></div><div class="back">flush, automatic at commit (dirty checking)</div></div>
<div class="card"><div class="front"><code>.Include(x =&gt; x.Items)</code></div><div class="back"><code>JOIN FETCH</code> in HQL</div></div>
<div class="card"><div class="front"><code>AsNoTracking()</code></div><div class="back"><code>@Transactional(readOnly = true)</code> (here with <code>transactionR</code>)</div></div>
<div class="card"><div class="front"><code>HasKey(x =&gt; new { x.A, x.B })</code></div><div class="back"><code>@IdClass(GlnId.class)</code> + two <code>@Id</code> fields</div></div>
<div class="card"><div class="front"><code>FromSqlRaw</code></div><div class="back"><code>session.createNativeQuery(sql)</code></div></div>
</div>

### Self-checks

<details class="qa">
<summary>Self-check: why is the second-level cache "enabled but effectively caches nothing"?</summary>
<div class="ans">
This isn't something the resources above resolve on their own; open
Knowledge File §9.5, which explains the specific reason for this
project, and check your answer against it rather than guessing from
the Hibernate caching chapter alone.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<details class="qa">
<summary>Self-check: why does <code>ScholenDaoImpl</code> use <code>JOIN Functies f ON ...</code> instead of navigating a property like <code>s.functies</code>?</summary>
<div class="ans">
An ad hoc entity join (<code>JOIN Entity alias ON condition</code>) needs
no mapped relationship. That matters in this schema, where many foreign
keys exist only as matching column names, with no
<code>@OneToMany</code>/<code>@ManyToOne</code> to navigate. Check
<code>Scholen</code> for a mapped collection to confirm it for this case.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<details class="qa">
<summary>Self-check: where does password hashing happen for logins?</summary>
<div class="ans">
In the database. The login HQL calls the DB function
<code>sha2(:password, 256)</code> inside the <code>WHERE</code> clause, so
the comparison happens in SQL, not in Java. Knowledge File §8.4 and
§19.1 cover how it is used and what the Knowledge File says about it.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<button type="button" data-mark-done>Mark this step done</button>

</div>
