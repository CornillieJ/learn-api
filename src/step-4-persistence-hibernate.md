# Step 4: Persistence, Hibernate & HQL

<div class="level-tabs" data-levels>
  <button data-level="overview" aria-pressed="true">Overview</button>
  <button data-level="deep">Deep Understanding</button>
  <button data-level="drill">Drilling</button>
</div>

<div class="level overview">

The project uses native Hibernate 5.6 (`SessionFactory`/`Session`), not
Spring Data JPA, so anything you read about `JpaRepository` will not
match this code. Entities can have composite identifiers via
`@IdClass`, and a second-level cache is configured through
JCache/Ehcache, though it caches less than it looks like it does. This
step covers `SessionFactory` vs `Session`, entity mapping, HQL, and the
caching config.

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

</div>

<div class="level drill">

<ul class="checklist">
<li><label><input type="checkbox"><span>Read <code>dbEntities/Gln.java</code> and <code>GlnId.java</code>, then <code>dao/impl/GlnDaoImpl.java</code>, then <code>InvoiceRepositoryImpl.setGln</code> (update-if-exists / insert / delete).</span></label></li>
<li><label><input type="checkbox"><span>On paper, add a DAO method "schools in a postal-code range" by copying <code>schoolsPerZipcode</code> and changing the HQL.</span></label></li>
</ul>

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

<button type="button" data-mark-done>Mark this step done</button>

</div>
