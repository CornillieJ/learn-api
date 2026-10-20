# 9. The first entity

<div class="level-tabs" data-levels>
  <button data-level="overview" aria-pressed="true">Overview</button>
  <button data-level="deep" data-short="Deep">Deep Understanding</button>
  <button data-level="drill">Drilling</button>
</div>

<div class="level overview">

Hibernate is running, but it knows no tables. This chapter gives it the
first one: `Scholen`, as a Java class with one field per column. The
class carries four kinds of annotation, each read by a different
library:

- JPA (`@Entity`, `@Table`, `@Id`, `@Column`), the standard Java ORM annotations, tells Hibernate which table and columns the class maps to.
- Lombok (`@Getter`, `@Setter`, `@NoArgsConstructor`) writes the boilerplate at compile time: the getter and setter methods Java uses instead of C# properties, and a constructor.
- Jackson (`@JsonProperty`) gives the JSON its English names.
- Swagger (`@Schema`) names the model in the API documentation.

Every VWO entity has this shape, so once `Scholen` is clear, the other
seventy-odd entities in `be.vwo.common.dbEntities` read the same way. The
chapter ends with a `<mapping>` line in `hibernate_TO.cfg.xml` and a
startup in which Hibernate accepts the class. The entity becomes visible
in Swagger in [chapter 11](build-11-repository-controller.md), when a
controller returns it.

**After this chapter you can:**

- map a class to a table with JPA annotations, and say what each one does;
- explain what Lombok generates and how to see it;
- name JSON properties independently of Java field names;
- choose between `Short` and `short` for a field or a parameter, and say why.

<div class="code-compare" data-code-compare data-labels="VWO: dbEntities/Scholen.java|TechOlympiad">

```java
@Entity
@Table(name = "Scholen", schema = "VWO")
@JsonTypeName(value = "School")
@Schema(name = "School")
@XmlRootElement
@Getter
@Setter
@NoArgsConstructor
public class Scholen implements Serializable {

    @Id
    @Basic(optional = false)
    @NotNull
    @Column(name = "SCHOOL_ID")
    @JsonProperty(value = "id", index = 0)
    private Short schoolId;

    @Size(max = 128)
    @Column(name = "INSTITUUT")
    @JsonProperty(value = "institution", index = 2)
    private String instituut;

    @Column(name = "POSTCODE")
    @JsonProperty(value = "postalCode", index = 4)
    private Short postcode;

    // ... 14 more columns and a @OneToOne

    @Override
    public boolean equals(Object o) { ... }

    @Override
    public int hashCode() { ... }
}
```

```java
@Entity
@Table(name = "Scholen", schema = "TechOlympiad")
@Schema(name = "School")
@Getter
@Setter
@NoArgsConstructor
public class Scholen implements Serializable {

    @Id
    @Column(name = "SCHOOL_ID")
    @JsonProperty(value = "id", index = 0)
    private Short schoolId;

    @Column(name = "INSTITUUT")
    @JsonProperty(value = "institution", index = 1)
    private String instituut;

    @Column(name = "POSTCODE")
    @JsonProperty(value = "postalCode", index = 3)
    private Short postcode;

    // ... straat, gemeente, provincie

    @Override
    public boolean equals(Object o) { ... }

    @Override
    public int hashCode() { ... }
}
```

</div>

</div>

<div class="level deep">

### What an entity is

An <dfn data-def="A class whose instances Hibernate loads from and saves to a table. Annotated @Entity and registered with the session factory.">entity</dfn>
is a plain class that Hibernate maps to a table: one instance per row,
one field per column. It is what an EF Core entity class is, with the
mapping written as annotations on the class instead of in
`OnModelCreating`.

The annotations come from
<dfn data-def="Jakarta (formerly Java) Persistence API: the standard ORM interfaces and annotations. Hibernate is one implementation. In the javax era its package is javax.persistence.">JPA</dfn>,
the standard ORM API, and Hibernate is the implementation that reads
them. On Spring Boot 2.7 and Hibernate 5 they live in
`javax.persistence`; on Boot 3 the same annotations moved to
`jakarta.persistence`. The jar that provides them, pulled in by
`spring-boot-starter-data-jpa`, is called `jakarta.persistence-api`
version 2.2.3, which still contains the old `javax.persistence` package.
The name of the jar changed before the package did.

### The mapping annotations

<div class="code-walk" data-code-walk>

```java
@Entity                                              // (1)
@Table(name = "Scholen", schema = "TechOlympiad")    // (2)
public class Scholen implements Serializable {

    @Id                                              // (3)
    @Column(name = "SCHOOL_ID")                      // (4)
    private Short schoolId;

    @Column(name = "INSTITUUT")
    private String instituut;
```

1. Marks the class as an entity. Its entity name, the name HQL uses in [chapter 10](build-10-dao-layer.md), is the simple class name: `Scholen`.
2. The table. With the MariaDB dialect, Hibernate 5 does not put the `schema` into its SQL: it generates `from Scholen`, and MariaDB resolves the table in the database named in the JDBC URL. The attribute is documentation here, kept because every VWO entity has it.
3. The primary key. Placing `@Id` on a field tells Hibernate to read and write fields directly, not through getters. There is no `@GeneratedValue`: `SCHOOL_ID` is not auto-increment, so the caller assigns the id.
4. The column name. Without `@Column`, Hibernate would use the field name, `schoolId`, which is not a column. Our columns are Dutch UPPER_SNAKE and our fields Dutch camelCase, so every field needs one.

</div>

The VWO adds `@Basic(optional = false)` and `@NotNull` to the id.
`@Basic(optional = false)` repeats what `@Id` already implies, and
`@NotNull` and `@Size(max = 128)` are Bean Validation constraints, a
separate library that checks values at runtime.
[Chapter 13](build-13-registration.md) introduces validation; until then
these annotations would only suggest a check that is not wired up, so
TechOlympiad leaves them out.

Hibernate does not check the class against the table at startup (that
would take `hibernate.hbm2ddl.auto=validate`, which neither the VWO nor
we turn on). A misspelled column name passes startup and fails on the
first query with `Unknown column`. What Hibernate does check at startup
is the mapping itself: an entity without `@Id` stops the deployment.

### Registering the class

Hibernate only maps classes it is told about. The VWO tells it in the
config file, one line per entity:

```xml
<mapping class="be.vwo.common.dbEntities.Scholen"/>
```

Both session factories read the same file, so both know `Scholen`.
`LocalSessionFactoryBean` can also scan a package
(`packagesToScan`), which is how many Spring projects do it. The VWO's
explicit list has one advantage you will meet often in this book: a new
entity is invisible until you add its line, and the error that tells you
so, `Scholen is not mapped`, is easy to recognise.

### Lombok

The class has six private fields and no getters or setters in the
source, yet Hibernate, Jackson and every caller use `getInstituut()` and
`setInstituut(...)`.
<dfn data-def="A compile-time annotation processor that generates getters, setters, constructors and more into the class file, so the source stays short.">Lombok</dfn>
writes them. It runs inside `javac` as an
<dfn data-def="A plug-in for the Java compiler that runs during compilation and can read annotations, report errors or generate code.">annotation processor</dfn>
and adds methods to the class while it is being compiled:

<div class="table-wrap">

| Annotation | Generates | C# counterpart |
|---|---|---|
| `@Getter` on the class | `public Short getSchoolId()` and one getter per field (`isX()` for a `boolean`) | the `get;` of an auto-property |
| `@Setter` on the class | `public void setSchoolId(Short schoolId)` per non-final field | the `set;` |
| `@NoArgsConstructor` | `public Scholen() { }` | a parameterless constructor |

</div>

Hibernate needs that no-argument constructor to create an instance
before it fills the fields from a row, and Jackson needs it to create an
instance before it fills it from JSON. A class without any constructor
gets one from the compiler anyway, so here `@NoArgsConstructor` only
states the requirement. It becomes necessary as soon as a class declares
another constructor.

Because Lombok works at compile time, the WAR does not contain it: the
dependency is `provided` since [chapter 2](build-02-maven-project.md). The
`-proc:full` compiler argument from the same chapter explicitly allows
annotation processors to run. Newer JDKs no longer run processors found on
the classpath without such a flag, so the VWO's pom sets it to keep
Lombok working on any JDK.

To see what Lombok produced, read the compiled class with `javap`, as in
[chapter 1](build-01-toolbox.md), or let Lombok print the expanded source
with its `delombok` command. IntelliJ does the same under
*Refactor → Delombok*, which is also the way out if a project ever wants
to drop Lombok.

<div class="callout danger">
<div class="callout-label">Gotcha</div>

Lombok's `@Data` and `@EqualsAndHashCode` generate `equals` and
`hashCode` over *all* fields. On an entity that is a trap: the hash
changes when any column changes, so an entity put in a `HashSet` is lost
in it after an update, and with lazy relations (related entities that
Hibernate loads only when first touched, like lazy loading in EF Core)
`hashCode` can load half the database. The VWO writes `equals` and `hashCode` by hand on its
entities, based on the id alone, and so do we. Lombok's
`@EqualsAndHashCode` is fine on the small key classes of
[chapter 12](build-12-responsables.md), whose fields are the identity.

</div>

### equals and hashCode by id

Two `Scholen` objects are the same school when they have the same id.
VWO's implementation compares `getClass()` and then `schoolId`, and
returns 0 as the hash of an entity without an id. One caveat comes with
`getClass()`: a lazily loaded Hibernate proxy (what `session.load` in
chapter 10 returns) is a generated subclass, so it is never `equals` to
a real `Scholen` with the same id. TechOlympiad does not compare proxies
with real instances, and copying the VWO's version keeps the two
codebases the same.

### Short or short

Java has eight
<dfn data-def="Java's built-in value types: byte, short, int, long, float, double, char, boolean. They cannot be null.">primitive types</dfn>,
and each has a wrapper class: `short` and `Short`, `byte` and `Byte`.
The wrapper is an object reference, so it can be `null`; the primitive
cannot. The compiler converts between them automatically (autoboxing),
which hides a few sharp edges.

<div class="table-wrap">

| Java | C# | Notes |
|---|---|---|
| `short` | `short` | 16 bits, -32768 to 32767 |
| `Short` | `short?` | `null` possible; a `null` unboxed to `short` throws `NullPointerException` |
| `byte` / `Byte` | `sbyte` / `sbyte?` | Java's `byte` is **signed**, -128 to 127. C#'s `byte` is unsigned |
| `Integer` | `int?` | |

</div>

The rule the VWO follows, and we copy:

- **Entity fields use wrappers.** A column can be `NULL`, and a new
  entity has no id yet. Hibernate needs a way to express "no value",
  and only a wrapper can.
- **Method parameters use primitives where a value is required.** VWO
  DAO and repository methods take `short userId` and `short schoolId`:
  passing `null` there is a compile error instead of a runtime one.

`POSTCODE smallint` fits a `Short` because Belgian postal codes run from
1000 to 9999. `PROVINCIE tinyint` is a `Byte`. In the VWO, `PROVINCIE`
is a `set('1',...,'7')` mapped to a `String`; ours is a plain number.

<div class="callout danger">
<div class="callout-label">Gotcha</div>

Never compare wrappers with `==`. `Short.valueOf((short) 100) == Short.valueOf((short) 100)`
is `true` because Java caches the values from -128 to 127, while the same
comparison with 1000 is `false`: two different objects. Use `equals`, or
`Objects.equals(a, b)` when either may be `null`, as `Scholen.equals`
does.

</div>

### Serializable

`Scholen implements Serializable` has no methods to implement; it marks
the class as convertible to bytes by Java serialization. Three things
in this stack care about that marker:

1. Hibernate 5's `Session.get(Class<T> entityType, Serializable id)` and
   `Session.load(...)` take the id as `Serializable`. A `Short` is
   `Serializable`, which is why the DAOs of chapter 10 declare their key
   type as `K extends Serializable`.
2. The DAOs declare the entity type as `E extends Serializable` too, so
   every entity must implement it to be used with them at all.
3. Composite key classes (chapter 12) must be `Serializable` by the JPA
   specification, and the second-level cache of chapter 21 may store
   entities in serialized form.

Neither the VWO nor we declare a `serialVersionUID`. Java computes one
from the class structure when needed, and nothing here stores
serialized entities across versions of the code.

### JSON names with Jackson

Spring MVC turns returned objects into JSON with
<dfn data-def="The JSON library Spring MVC uses by default, the counterpart of System.Text.Json.">Jackson</dfn>.
By default Jackson finds properties through getters, so `getInstituut()`
would become `"instituut"`. The VWO keeps Dutch names in the Java code
and the database, and English names in the API.
`@JsonProperty(value = "institution", index = 1)` does both jobs:

- `value` renames the property. Jackson links the annotated field
  `instituut` with the getter `getInstituut()` and the setter
  `setInstituut(...)` because they share the logical name `instituut`, so
  the renaming applies to reading and writing. The JSON has
  `"institution"` and never `"instituut"`.
- `index` fixes the order of the properties in the output. Without it,
  Jackson's order is not guaranteed to follow the source.

It is the counterpart of `[JsonPropertyName("institution")]` and
`[JsonPropertyOrder(1)]` in System.Text.Json.

The VWO entity also carries `@JsonTypeName(value = "School")`. That
annotation only matters for polymorphic JSON configured with
`@JsonTypeInfo`, which the VWO never uses, so it changes nothing.
`@XmlRootElement` is for JAXB, the XML binding; the API only produces
JSON. TechOlympiad leaves both out.

### The Swagger name

springdoc builds the OpenAPI document from the classes your controllers
return, and names each model after its class by default. `Scholen` would
appear as a schema called `Scholen`.
`@Schema(name = "School")` names it `School`, in line with the English
JSON. springdoc reads the property names from Jackson, so the schema's
properties are `id`, `institution`, `street` and so on.

</div>

<div class="level drill">

### Before you start

You should have the end state of [chapter 8](build-08-hibernate-xml.md):
two session factories that start, with five connections each, and an
empty `hibernate_TO.cfg.xml` mapping list. Lombok is already in the
`pom.xml` since chapter 2, so no dependency changes this time.

### Tasks

<ul class="checklist">
<li><label><input type="checkbox"><span>Create the package folder <code>src/main/java/be/techolympiad/common/dbEntities</code>.</span></label></li>
<li><label><input type="checkbox"><span>Write <code>Scholen.java</code> (below). Compare each field with the <code>Scholen</code> table in <code>01-schema.sql</code>: name, type, nullability.</span></label></li>
<li><label><input type="checkbox"><span>Add the <code>&lt;mapping&gt;</code> line to <code>hibernate_TO.cfg.xml</code>.</span></label></li>
<li><label><input type="checkbox"><span>Build: <code>mvn -q -DskipTests -Plocal package</code>.</span></label></li>
<li><label><input type="checkbox"><span>Read what Lombok generated: <code>javap -p -cp target/classes be.techolympiad.common.dbEntities.Scholen</code>.</span></label></li>
<li><label><input type="checkbox"><span>Optional: print the delomboked source (commands under <em>Run it</em>).</span></label></li>
<li><label><input type="checkbox"><span>Restart: <code>docker compose restart api</code>, and check the deployment still finishes.</span></label></li>
<li><label><input type="checkbox"><span>Break it on purpose: comment out <code>@Id</code>, build, restart, read the error. Restore it.</span></label></li>
<li><label><input type="checkbox"><span>Commit: <code>git add -A &amp;&amp; git commit -m "Map the Scholen entity"</code>.</span></label></li>
</ul>

### The entity

`src/main/java/be/techolympiad/common/dbEntities/Scholen.java`:

```java
package be.techolympiad.common.dbEntities;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;
import java.io.Serializable;
import java.util.Objects;

@Entity
@Table(name = "Scholen", schema = "TechOlympiad")
@Schema(name = "School")
@Getter
@Setter
@NoArgsConstructor
public class Scholen implements Serializable {

    @Id
    @Column(name = "SCHOOL_ID")
    @JsonProperty(value = "id", index = 0)
    private Short schoolId;

    @Column(name = "INSTITUUT")
    @JsonProperty(value = "institution", index = 1)
    private String instituut;

    @Column(name = "STRAAT")
    @JsonProperty(value = "street", index = 2)
    private String straat;

    @Column(name = "POSTCODE")
    @JsonProperty(value = "postalCode", index = 3)
    private Short postcode;

    @Column(name = "GEMEENTE")
    @JsonProperty(value = "place", index = 4)
    private String gemeente;

    @Column(name = "PROVINCIE")
    @JsonProperty(value = "province", index = 5)
    private Byte provincie;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Scholen scholen = (Scholen) o;
        return Objects.equals(schoolId, scholen.schoolId);
    }

    @Override
    public int hashCode() {
        return schoolId != null ? schoolId.hashCode() : 0;
    }
}
```

The JSON names are the VWO's: `id`, `institution`, `street`,
`postalCode`, `place` (for `gemeente`) and `province`.

### The mapping

`src/main/resources/hibernate_TO.cfg.xml`:

<div class="diff-view" data-diff-view>

```diff
         <property name="hibernate.c3p0.idle_test_period">60</property>
         <property name="hibernate.c3p0.timeout">30</property>
+
+        <mapping class="be.techolympiad.common.dbEntities.Scholen"/>
     </session-factory>
 </hibernate-configuration>
```

</div>

### Run it

```bash
mvn -q -DskipTests -Plocal package
javap -p -cp target/classes be.techolympiad.common.dbEntities.Scholen
```

```text
public class be.techolympiad.common.dbEntities.Scholen implements java.io.Serializable {
  private java.lang.Short schoolId;
  private java.lang.String instituut;
  private java.lang.String straat;
  private java.lang.Short postcode;
  private java.lang.String gemeente;
  private java.lang.Byte provincie;
  public boolean equals(java.lang.Object);
  public int hashCode();
  public java.lang.Short getSchoolId();
  public java.lang.String getInstituut();
  ...
  public void setSchoolId(java.lang.Short);
  public void setInstituut(java.lang.String);
  ...
  public be.techolympiad.common.dbEntities.Scholen();
}
```

Twelve methods and a constructor that are not in your source. To see
them as Java source, give Lombok the project's classpath so it can
resolve the other annotations:

```bash
mvn -q dependency:build-classpath -Dmdep.outputFile=target/cp.txt
java -jar ~/.m2/repository/org/projectlombok/lombok/1.18.38/lombok-1.18.38.jar \
  delombok -p --classpath="$(cat target/cp.txt)" \
  src/main/java/be/techolympiad/common/dbEntities/Scholen.java
```

The output starts with `// Generated by delombok` and contains, among
the rest:

```java
    public Short getSchoolId() {
        return this.schoolId;
    }

    public void setSchoolId(final Short schoolId) {
        this.schoolId = schoolId;
    }
```

Restart and watch the deployment:

```bash
docker compose restart api
docker compose logs -f api | grep -E "HHH000400|Deployment of|ERROR"
```

The dialect line appears twice and the deployment finishes, as in
chapter 8. Hibernate now holds the metadata of one entity in each
factory; nothing has queried it yet. That is chapter 10.

Now comment out `@Id`, rebuild and restart. The deployment fails, and
the log contains:

```text
org.hibernate.AnnotationException: No identifier specified for entity: be.techolympiad.common.dbEntities.Scholen
```

Restore `@Id`, rebuild and restart before you commit.

<div class="callout danger">
<div class="callout-label">When it breaks</div>

- **`package javax.persistence does not exist`**: `spring-boot-starter-data-jpa` from chapter 8 is missing. If you see `jakarta.persistence` in an import, you copied from a Boot 3 source: use `javax.persistence`.
- **`cannot find symbol: method getInstituut()`** elsewhere in the code, while the class looks fine: Lombok did not run. Check that `lombok` is a dependency and that `-proc:full` is still in the compiler plugin. In IntelliJ, also enable annotation processing (*Settings → Build → Compiler → Annotation Processors*).
- **`AnnotationException: No identifier specified for entity`**: no `@Id`, or `@Id` imported from `org.springframework.data.annotation` instead of `javax.persistence`.
- **The deployment succeeds but chapter 10's first query fails with `Unknown column`**: a typo in a `@Column` name. Startup does not compare columns with the table.
- **`Scholen is not mapped`** (from chapter 10 on): the `<mapping>` line is missing or has the wrong package.

</div>

### Quiz

<div class="quiz" data-quiz>
<p class="quiz-q">Why is <code>schoolId</code> a <code>Short</code> and not a <code>short</code>?</p>
<ol class="quiz-options">
<li><code>short</code> cannot hold the values of a <code>smallint</code><p class="quiz-whynot">Both are 16 bits with the same range. The difference is <code>null</code>.</p></li>
<li data-correct>A wrapper can be <code>null</code>, which an entity needs for "no value" in a nullable column or a not-yet-assigned id<p class="quiz-why">Only an object reference can be <code>null</code>, so entity fields use wrappers throughout.</p></li>
<li>JPA forbids primitive fields<p class="quiz-whynot">JPA allows them; a primitive field just cannot represent <code>NULL</code>, so a <code>NULL</code> column fails to load into it.</p></li>
</ol>
<p class="quiz-explain">The VWO uses wrappers in entities and primitives in method parameters where a value is mandatory, such as <code>findById(short id)</code> in chapter 11.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">The response JSON contains <code>"institution"</code>. Which name does the Java code use, and which one does the HQL in chapter 10 use?</p>
<ol class="quiz-options">
<li>Both use <code>institution</code><p class="quiz-whynot"><code>@JsonProperty</code> only affects Jackson. Java and Hibernate never see the JSON name.</p></li>
<li data-correct>Java uses <code>getInstituut()</code>; HQL uses the field name <code>instituut</code><p class="quiz-why">HQL works with entity and attribute names, which are the class and field names. The column name <code>INSTITUUT</code> appears only in the generated SQL.</p></li>
<li>HQL uses the column name <code>INSTITUUT</code><p class="quiz-whynot">That is SQL. HQL is written against the Java model.</p></li>
</ol>
<p class="quiz-explain">One property, three names: the column (<code>INSTITUUT</code>), the Java attribute (<code>instituut</code>) and the JSON property (<code>institution</code>). Each annotation maps one pair.</p>
</div>

### Flashcards

<div class="flashcards" data-flashcards data-front-label="Annotation" data-back-label="What it does">
<div class="card"><div class="front"><code>@Entity</code></div><div class="back">Marks a class Hibernate maps to a table. Its entity name, used in HQL, is the class name.</div></div>
<div class="card"><div class="front"><code>@Table(name, schema)</code></div><div class="back">The table. With the MariaDB dialect, Hibernate 5 leaves <code>schema</code> out of the SQL; the URL's database applies.</div></div>
<div class="card"><div class="front"><code>@Id</code> on a field</div><div class="back">The primary key, and field access for the whole entity. Without <code>@GeneratedValue</code> the id is assigned by the caller.</div></div>
<div class="card"><div class="front"><code>@Column(name)</code></div><div class="back">The column a field maps to. Needed whenever the column name differs from the field name.</div></div>
<div class="card"><div class="front"><code>@Getter @Setter @NoArgsConstructor</code></div><div class="back">Lombok: generates getters, setters and a public no-argument constructor at compile time.</div></div>
<div class="card"><div class="front"><code>@JsonProperty(value, index)</code></div><div class="back">Jackson: the JSON name of the property and its position in the output.</div></div>
<div class="card"><div class="front"><code>@Schema(name = "School")</code></div><div class="back">Swagger: the name of the model in the OpenAPI document.</div></div>
<div class="card"><div class="front"><code>&lt;mapping class="..."/&gt;</code></div><div class="back">Registers an entity with every session factory that reads the config file.</div></div>
</div>

### Self-checks

<details class="qa">
<summary>Self-check: your <code>Scholen.java</code> has no getters, yet Hibernate and Jackson call <code>getInstituut()</code>. Where does the method exist?</summary>
<div class="ans">
In the compiled class file. Lombok runs as an annotation processor inside <code>javac</code> and adds the methods during compilation. <code>javap -p</code> on <code>target/classes</code> shows them; the source never contains them.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<details class="qa">
<summary>Self-check: you misspell <code>@Column(name = "GEMEENTEE")</code>. When do you find out?</summary>
<div class="ans">
At the first query that selects the column, with an <code>Unknown column</code> error from MariaDB. Hibernate does not compare the mapping with the table at startup, because <code>hbm2ddl.auto</code> is not set.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<details class="qa">
<summary>Self-check: why write <code>equals</code> and <code>hashCode</code> by hand instead of adding Lombok's <code>@EqualsAndHashCode</code>?</summary>
<div class="ans">
Lombok's version uses every field, so the hash changes whenever a column changes, and on entities with lazy relations it can trigger loads. An entity's identity is its id, so the VWO compares the id only.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<button type="button" data-mark-done>Mark this chapter done</button>

</div>
