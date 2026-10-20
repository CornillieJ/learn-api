# 12. Persons and responsables

<div class="level-tabs" data-levels>
  <button data-level="overview" aria-pressed="true">Overview</button>
  <button data-level="deep" data-short="Deep">Deep Understanding</button>
  <button data-level="drill">Drilling</button>
</div>

<div class="level overview">

Phase 3 starts with people. A school takes part in the TechOlympiad
through a teacher, the *responsable*, who registers the school and its
pupils for one edition. The VWO API stores that link in `Functies`: one
row says "person 12 is the JWO responsable of school 345". TechOlympiad
has the same table with the same three key columns, and this chapter maps
it, together with `Persoon`, the person on the other end.

`Functies` is the first table whose primary key has more than one column,
and the first with an enum column. Both need new mapping tools:
<dfn data-def="A JPA annotation that names a separate class holding the fields of a composite primary key. The entity keeps the key fields as ordinary @Id fields.">@IdClass</dfn>
for the key, `@Enumerated` (the JPA annotation that says how an enum is
stored) for the column, and a Spring
<dfn data-def="A Spring object that turns one type into another, here the text of a URL parameter into a Java enum. Registered as a bean, it is used for every @RequestParam and @PathVariable of that target type.">Converter</dfn>
so that `?edition=jto` in a URL becomes `ToRole.JTO`. The chapter ends
with an HQL query that joins `Scholen` to `Functies` without any mapped
relation between them, the way `ScholenDaoImpl` in the VWO does.

**After this chapter you can:**

- map a table with a composite primary key using `@IdClass`, and say when `@EmbeddedId` is the better fit;
- write `equals` and `hashCode` that keep Hibernate and Java collections happy;
- store enums as strings and accept them case-insensitively in URLs;
- join two entities in HQL with an ad hoc `ON` clause.

<div class="code-compare" data-code-compare data-labels="VWO Functies.java|TechOlympiad Functies.java">

```java
@Entity
@Table(name = "Functies", schema = "VWO")
@IdClass(FunctiesPK.class)
public class Functies implements Serializable {
    @Id
    @Column(name = "PERSOON_ID", nullable = false, insertable = false, updatable = false)
    @JsonProperty(value = "personId")
    private Short persoonId;
    @Id
    @Column(name = "SCHOOL_ID")
    private Short schoolId = 0;
    @Id
    @Column(name = "FUNCTIE", nullable = false)
    @JsonProperty(value = "function")
    @Enumerated(EnumType.STRING)
    private Configuration.FunctionOption functie;

    @JsonIgnore
    @MapsId("persoonId")
    @ManyToOne(fetch = FetchType.LAZY, cascade = {CascadeType.PERSIST, CascadeType.MERGE, CascadeType.REFRESH})
    @JoinColumn(name = "PERSOON_ID", referencedColumnName = "PERSOON_ID", nullable = false)
    private Persoon persoonByPersoonId;
    // ... the same again for Scholen
}
```

```java
@Entity
@Table(name = "Functies", schema = "TechOlympiad")
@IdClass(FunctiesPK.class)
@Schema(name = "Function")
public class Functies implements Serializable {
    @Id
    @Column(name = "PERSOON_ID", nullable = false)
    @JsonProperty("personId")
    private Short persoonId;
    @Id
    @Column(name = "SCHOOL_ID", nullable = false)
    @JsonProperty("schoolId")
    private Short schoolId;
    @Id
    @Column(name = "FUNCTIE", nullable = false)
    @Enumerated(EnumType.STRING)
    @JsonProperty("function")
    private Configuration.ToRole functie;
}
```

</div>

The VWO version also maps two lazy `@ManyToOne` associations to `Persoon`
and `Scholen`: fields that point at the related entity, like EF Core
navigation properties, which Hibernate loads only when they are first
read. TechOlympiad leaves them out; the Deep Understanding tab
explains what they cost and why the queries in this chapter do not need
them.

</div>

<div class="level deep">

### A link table with a three-column key

`Functies` connects a person to a school, with a role. In the VWO the
role column holds sixteen different values (`JWO`, `VWO`, seven Kangoeroe
editions, `Schoollid`, `Jury`, ...); in TechOlympiad it holds only `JTO`
or `STO`. A person can be responsable for several schools, a school can
have a responsable per edition, and one person can hold both editions for
the same school. No single column identifies a row, so the key is all
three together: `PRIMARY KEY (PERSOON_ID, SCHOOL_ID, FUNCTIE)`.

<div class="callout note">
<div class="callout-label">A documented deviation</div>

The VWO `Functies` table has no primary key at all. Its `SCHOOL_ID` is
nullable with default `0`, because individual memberships have no school.
The entity still declares the three columns as `@Id`, and Hibernate
cannot tell the difference, which is why `FunctiesRepositoryImpl` has a
`//FIXME: table "Functies" can have null-value for a PK column.` and skips
`null` rows. TechOlympiad makes the key real (see the
[design page](design.md)), so that problem does not exist here.

</div>

### Composite keys: `@IdClass` or `@EmbeddedId`

JPA offers two ways to map a key of several columns. Both need a separate
key class, because `Session.get(type, key)` takes one key object.

<div class="table-wrap">

| | `@IdClass(FunctiesPK.class)` | `@EmbeddedId FunctiesPK id` |
|---|---|---|
| Key fields live in | the entity, each with `@Id` | the key class, marked `@Embeddable` (a class whose fields are stored in the owning entity's table, like an EF Core owned type) |
| The key class | a plain holder with the same field names and types | holds the `@Column` mappings |
| HQL | `f.persoonId` | `f.id.persoonId` |
| JSON, by default | flat: `{"personId": 1, "schoolId": 2, ...}` | nested: `{"id": {...}}`, flattened only with `@JsonUnwrapped` |
| Building a key | `new FunctiesPK(1, 2, JTO)` | the same |
| EF Core equivalent | `HasKey(f => new { f.PersoonId, f.SchoolId, f.Functie })` | an owned type used as the key |

</div>

The VWO uses `@IdClass` almost everywhere: 37 entities in `dbEntities`
declare one, and exactly one, `WebsiteVwoWedstrijddatums`, uses
`@EmbeddedId`. You can see what that choice buys by looking at the odd
one out. Its HQL has to say `w.id.jaar` and its getter needs
`@JsonUnwrapped` to keep the JSON flat. With `@IdClass` an entity reads
and serializes like any other: the key fields are ordinary fields that
happen to carry `@Id`. We follow the majority, and meet the exception
again in [chapter 15](build-15-answer-key-dates.md), where it turns out
to be necessary.

With `@IdClass`, Hibernate reads the mapping from the entity. The key
class only has to match it:

1. same field names and the same types (`Short` in both, not `short` in one and `Short` in the other);
2. `implements Serializable`;
3. a public no-argument constructor;
4. `equals` and `hashCode` over all key fields.

The VWO `FunctiesPK` breaks rule 1 (its `persoonId` is a primitive
`short`), and carries `@Embeddable`, `@Column` and `@Enumerated`
annotations that `@IdClass` never reads. Hibernate is lenient enough to
accept both. Ours is a plain class with four Lombok annotations.

### `equals` and `hashCode`

Java's contract is the same as .NET's for `Equals` and `GetHashCode`:
objects that are `equals` must return the same `hashCode`, and the hash
must not change while the object sits in a `HashSet` or is a `HashMap`
key. Hibernate adds its own reason to care. Every `Session` keeps a
<dfn data-def="The map, kept by every Hibernate Session, from (entity type, primary key) to the one Java object that represents that row in this session. EF Core's change tracker plays the same role.">persistence context</dfn>,
a map from key to entity. For a composite key that map is keyed by your
`FunctiesPK` objects, so without a value-based `equals` and `hashCode`
two lookups of the same row would miss each other. Lombok's
`@EqualsAndHashCode` on the key class generates both over all fields,
which is exactly what a key class needs.

Entities are harder, because the key is not always known.

- `Functies` has an **assigned** key: the three values exist before the
  row is saved and never change. Equality over the three fields is safe.
- `Persoon` has a **generated** key: `persoonId` is `null` until the
  insert, then MariaDB fills it in. A hash computed from the id would
  change at that moment, and the object would be lost inside any
  `HashSet` that already held it.

The usual answer for generated keys is equality on the id (only when it
is set) and a constant hash. The VWO `Persoon.hashCode()` returns `0` for
this reason. We return `getClass().hashCode()`, which is constant too.
Constant hashes make hash lookups linear, which is harmless for the small
collections an entity ends up in.

<div class="callout danger">
<div class="callout-label">Two unsaved persons</div>

The VWO `Persoon.equals` compares ids with `Objects.equals`, which treats
two `null` ids as equal. Two different new persons are then `equals`, and
a `HashSet` keeps only one of them. Our version returns `false` unless
the id is set.

</div>

Avoid Lombok's `@EqualsAndHashCode` and `@Data` on entities: they include
every field, so the hash changes whenever a setter runs, and with mapped
associations they can trigger lazy loading or infinite recursion.

### Enums in a column: `STRING` or `ORDINAL`

`@Enumerated` decides how an enum reaches the database:

- `EnumType.ORDINAL`, the default when you write nothing, stores the
  position: `JTO` is `0`, `STO` is `1`.
- `EnumType.STRING` stores the name: `'JTO'`, `'STO'`.

The column is a MariaDB `ENUM('JTO','STO')`, so `STRING` is the only
correct choice. MariaDB treats a number written into an `ENUM` column as
a 1-based index: `ORDINAL` would write `JTO` as `0`, which strict mode
rejects, and `STO` as `1`, which MariaDB stores as `'JTO'`. Even with a
plain integer column, `ORDINAL` breaks silently the day someone inserts a
new constant in the middle of the enum. Every enum field in the VWO uses
`EnumType.STRING`.

The Java names must match the database values exactly, case included.
That is why `Gender` has the constants `M`, `V` and `X`, and why
`ToRole` is `JTO` and `STO` rather than `Junior` and `Senior`.

### Enums in a URL: Spring converters

The VWO keeps its enums as nested types of one class, `Configuration`,
and so do we. The class is `final` with a private constructor: it is a
namespace, never an object.

When a controller declares `@RequestParam("edition") ToRole edition`,
Spring has to turn the text `JTO` into `ToRole.JTO`. Its built-in
string-to-enum conversion calls `ToRole.valueOf("JTO")`, which is
case-sensitive: `?edition=jto` fails with a `400 Bad Request`. The VWO
fixes that with a small class nested in `Configuration`:

```java
@Component
public static class VwoRoleConverter implements Converter<String, VwoRole> {

    @Override
    public VwoRole convert(String value) {
        return VwoRole.valueOf(value.toUpperCase());
    }
}
```

Nothing registers it explicitly. Component scanning finds the nested
class (a `static` nested class is a class like any other), and Spring
Boot's MVC auto-configuration adds every `Converter` bean in the context
to the conversion service that binds request parameters and path
variables. The VWO XML configuration has no `<mvc:annotation-driven/>`
that would switch that auto-configuration off, and neither does ours.

Two limits are worth knowing:

- The converter only applies to request parameters and path variables.
  A JSON body is read by Jackson, which has its own (case-sensitive) enum
  handling, so `{"function": "jto"}` still fails.
- An unknown value makes `valueOf` throw `IllegalArgumentException`.
  Spring wraps it in a `MethodArgumentTypeMismatchException` and answers
  `400 Bad Request`.

In ASP.NET Core you would reach for a custom `TypeConverter` or a model
binder; here it is one class with one method.

### Joining without an association

The school list of a responsable needs `Scholen` and `Functies` together.
The VWO `ScholenDaoImpl.getByVwoResponsible` does it like this:

```java
String hql = "SELECT s FROM Scholen s "
        + "JOIN Functies f ON s.schoolId = f.schoolId "
        + "WHERE f.persoonId = :userId "
        + "AND (f.functie = 'VWO' OR f.functie = 'JWO')";
```

`JOIN Functies f ON ...` names a second *entity* and gives the join
condition by hand. This is an
<dfn data-def="An HQL join between two entities that have no mapped association, written as JOIN Entity alias ON condition. Supported since Hibernate 5.1; not part of JPA 2.">ad hoc entity join</dfn>,
available since Hibernate 5.1. Hibernate translates it to an SQL
`inner join Functies ... on (...SCHOOL_ID=...SCHOOL_ID)` with its own
generated table aliases. Before 5.1 the only options were a mapped association or a theta-style
join (`FROM Scholen s, Functies f WHERE s.schoolId = f.schoolId`).

The alternative is to map the relation and navigate it: give `Scholen` a
`@OneToMany Set<Functies> functies` and write `JOIN s.functies f`. That
is EF Core's navigation-property style. Here the VWO is mixed. `Functies`
does map both sides as lazy `@ManyToOne` fields (`persoonByPersoonId`,
`schoolBySchoolId`, hidden from JSON with `@JsonIgnore`), and `Persoon`
has the matching `@OneToMany`. Yet the school queries ignore them and use
the ad hoc join. One query in `FunctiesDaoImpl` navigates an association
(`SELECT f.persoonByPersoonId FROM Functies f ...`); the rest filter on
the plain id fields.

<div class="scenario" data-scenario data-start="start">

<div class="sc-node" data-node="start">
<p class="sc-prompt">You are mapping <code>Functies</code>. The VWO version carries two <code>@ManyToOne</code> associations next to the plain id fields. Do you copy them?</p>
<ul class="sc-choices">
<li data-goto="copy">Copy them, they are in the original</li>
<li data-goto="skip">Leave them out and join ad hoc where needed</li>
</ul>
</div>

<div class="sc-node" data-node="copy">
<p class="sc-result">The VWO combines <code>@IdClass</code> with <code>@MapsId</code>, which JPA defines for derived identities (a key that contains the key of a related entity) on top of <code>@EmbeddedId</code>, and maps <code>PERSOON_ID</code> twice (once read-only on the id field, once through the join column). To make that consistent you would have to decide which mapping writes the column, set the association on every new <code>Functies</code>, and keep <code>@JsonIgnore</code> on both fields so Jackson does not touch a lazy proxy outside its session.</p>
<p class="sc-prompt">Is any query in this chapter easier with them?</p>
<ul class="sc-choices">
<li data-goto="copy-end">Check the queries</li>
</ul>
</div>

<div class="sc-node" data-node="copy-end" data-end>
<p class="sc-result">No. Every query here filters on <code>persoonId</code> or <code>schoolId</code>, and the school list is one ad hoc join. You would carry two extra mappings and their pitfalls for nothing.</p>
</div>

<div class="sc-node" data-node="skip" data-end data-good>
<p class="sc-result">The entity stays a flat row with three key fields, which is all the queries use. When a query needs the other table, an ad hoc <code>JOIN ... ON</code> says exactly which columns meet. If a later feature needs navigation, you can still add the association then.</p>
</div>

</div>

Two details of the VWO query are worth not copying. It compares the enum
field with string literals (`f.functie = 'VWO'`), which only works
because Hibernate passes the literal through to SQL; a parameter
(`f.functie = :edition`) is checked against the field type. And a
teacher who is responsable for both editions of the same school matches
two `Functies` rows, so the school comes back twice. Our query says
`SELECT DISTINCT s`.

### Parameter types must match exactly

HQL parameters are checked against the type of the field they are
compared with. `f.persoonId` is a `Short`, so the parameter must be a
`Short` (a `short` autoboxes to one). Passing an `int` fails at runtime:

```text
java.lang.IllegalArgumentException: Parameter value [3] did not match expected type [java.lang.Short (n/a)]
```

That is why VWO's `ScholenDaoImpl.schoolsPerZipcode(int zipcode)` writes
`query.setParameter("postcode", ((short) zipcode))`. Our DAO methods take
`short` parameters, so the problem does not arise as long as you keep
them that way.

</div>

<div class="level drill">

### What you should have

The end state of [chapter 11](build-11-repository-controller.md): the WAR runs on
Tomcat, Swagger shows the `v1` group with the school endpoints, and the
database holds the seed data, including the seeded teachers in `Persoon`
and their rows in `Functies`.

<div class="table-wrap">

| File | Action |
|---|---|
| `Configuration.java` | new: `ToRole`, `ToRound`, `Gender`, `ToRoleConverter` |
| `dbEntities/Persoon.java` | new |
| `dbEntities/Functies.java`, `dbEntities/FunctiesPK.java` | new |
| `dao/PersoonDao.java`, `dao/FunctiesDao.java` and their `impl` | new |
| `dao/ScholenDao.java`, `dao/impl/ScholenDaoImpl.java` | add `getByToResponsible` |
| `restAPI/repositories/PersoonRepository*`, `FunctiesRepository*` | new |
| `restAPI/repositories/ScholenRepository*` | add `getByToResponsible` |
| `restAPI/controllers/FunctionController.java`, `v1/FunctionController.java` | new |
| `restAPI/controllers/SchoolController.java` | add `GET /to/user/{user_id}` |
| `hibernate_TO.cfg.xml` | two `<mapping>` lines |

</div>

All Java paths below are relative to
`src/main/java/be/techolympiad/common/`.

### Tasks

<ul class="checklist">
<li><label><input type="checkbox"><span>Create <code>Configuration.java</code> with the three enums and the converter.</span></label></li>
<li><label><input type="checkbox"><span>Create the <code>Persoon</code> entity.</span></label></li>
<li><label><input type="checkbox"><span>Create <code>FunctiesPK</code>, then the <code>Functies</code> entity that points to it with <code>@IdClass</code>.</span></label></li>
<li><label><input type="checkbox"><span>Register both entities in <code>hibernate_TO.cfg.xml</code>.</span></label></li>
<li><label><input type="checkbox"><span>Create <code>PersoonDao</code>, <code>FunctiesDao</code> and their implementations.</span></label></li>
<li><label><input type="checkbox"><span>Add <code>getByToResponsible</code> to <code>ScholenDao</code>, <code>ScholenDaoImpl</code>, <code>ScholenRepository</code> and <code>ScholenRepositoryImpl</code>.</span></label></li>
<li><label><input type="checkbox"><span>Create <code>PersoonRepository</code> and <code>FunctiesRepository</code> with their implementations.</span></label></li>
<li><label><input type="checkbox"><span>Create the <code>FunctionController</code> interface and its <code>v1</code> class, and add the new endpoint to <code>SchoolController</code>.</span></label></li>
<li><label><input type="checkbox"><span>Build, restart and run the calls under <em>Run it</em>: <code>mvn -q -DskipTests -Plocal package &amp;&amp; docker compose restart api</code>.</span></label></li>
<li><label><input type="checkbox"><span>Commit: <code>git add -A &amp;&amp; git commit -m "Map persons and responsables"</code>.</span></label></li>
</ul>

### Configuration

`Configuration.java`

```java
package be.techolympiad.common;

import com.fasterxml.jackson.annotation.JsonValue;
import org.springframework.core.convert.converter.Converter;
import org.springframework.stereotype.Component;

public final class Configuration {

    private Configuration() {
    }

    public enum ToRole {
        JTO, STO
    }

    public enum ToRound {

        ONE('1'),
        TWO('2'),
        FINAL('F');

        private final char code;

        ToRound(char code) {
            this.code = code;
        }

        @JsonValue
        public char getCode() {
            return code;
        }

        public static ToRound fromCode(char code) {
            return switch (code) {
                case '1' -> ONE;
                case '2' -> TWO;
                case 'F' -> FINAL;
                default -> null;
            };
        }
    }

    public enum Gender {
        M, V, X
    }

    @Component
    public static class ToRoleConverter implements Converter<String, ToRole> {

        @Override
        public ToRole convert(String value) {
            return ToRole.valueOf(value.trim().toUpperCase());
        }
    }
}
```

`ToRound` is not used until [chapter 14](build-14-pupils.md), but it
belongs with the other contest enums. `@JsonValue` makes Jackson write a
round as `"1"`, `"2"` or `"F"` instead of `"ONE"`, matching the
`enum('1','2','F')` column it will map to. The `switch` with arrows is a
Java 14+ switch expression, the same construct the VWO's
`VwoRound.getRound` uses.

### Entities

`dbEntities/Persoon.java`

```java
package be.techolympiad.common.dbEntities;

import be.techolympiad.common.Configuration;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.ColumnTransformer;

import javax.persistence.*;
import java.io.Serializable;

@Entity
@Table(name = "Persoon", schema = "TechOlympiad")
@Schema(name = "Person")
@Getter
@Setter
@NoArgsConstructor
public class Persoon implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "PERSOON_ID")
    @JsonProperty("personId")
    private Short persoonId;

    @Column(name = "NAAM")
    @JsonProperty("lastName")
    private String naam;

    @Column(name = "VOORNAAM")
    @JsonProperty("firstName")
    private String voornaam;

    @Column(name = "EMAIL", unique = true, length = 100)
    @ColumnTransformer(write = "LOWER(?)")
    @JsonProperty("email")
    private String email;

    @Column(name = "GENDER")
    @Enumerated(EnumType.STRING)
    @JsonProperty("gender")
    private Configuration.Gender gender;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Persoon persoon = (Persoon) o;
        return persoonId != null && persoonId.equals(persoon.persoonId);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
```

`@ColumnTransformer(write = "LOWER(?)")` makes Hibernate write
`LOWER(?)` instead of `?` in every `INSERT` and `UPDATE` of that column,
so the database always stores lower-case addresses and the `UNIQUE`
index catches `Ann@School.be` and `ann@school.be` as the same person.
The VWO has the same annotation and, belt and braces, a database trigger
doing the same thing.

`dbEntities/FunctiesPK.java`

```java
package be.techolympiad.common.dbEntities;

import be.techolympiad.common.Configuration;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class FunctiesPK implements Serializable {

    private Short persoonId;
    private Short schoolId;
    private Configuration.ToRole functie;
}
```

<div class="code-walk" data-code-walk>

```java
package be.techolympiad.common.dbEntities;

import be.techolympiad.common.Configuration;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.*;
import java.io.Serializable;
import java.util.Objects;

@Entity
@Table(name = "Functies", schema = "TechOlympiad")
@IdClass(FunctiesPK.class) // (1)
@Schema(name = "Function")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Functies implements Serializable {

    @Id // (2)
    @Column(name = "PERSOON_ID", nullable = false)
    @JsonProperty("personId")
    private Short persoonId;

    @Id
    @Column(name = "SCHOOL_ID", nullable = false)
    @JsonProperty("schoolId")
    private Short schoolId;

    @Id
    @Column(name = "FUNCTIE", nullable = false)
    @Enumerated(EnumType.STRING) // (3)
    @JsonProperty("function")
    private Configuration.ToRole functie;

    @Override
    public boolean equals(Object o) { // (4)
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Functies that = (Functies) o;
        return Objects.equals(persoonId, that.persoonId)
                && Objects.equals(schoolId, that.schoolId)
                && functie == that.functie;
    }

    @Override
    public int hashCode() {
        return Objects.hash(persoonId, schoolId, functie);
    }
}
```

1. The key class. `session.get(Functies.class, new FunctiesPK(...))` now works, and the generic DAO is typed `<Functies, FunctiesPK>`.
2. Three `@Id` fields. Their names and types must be exactly those of the fields in `FunctiesPK`.
3. Store the name, never the position. Without this line Hibernate would use `ORDINAL`.
4. The key is assigned, never generated, so equality over the key fields is stable. Enums compare with `==`: each constant exists once.

</div>

`hibernate_TO.cfg.xml`: the key class is not an entity and gets no
`<mapping>` line.

<div class="diff-view" data-diff-view>

```diff
         <mapping class="be.techolympiad.common.dbEntities.Scholen"/>
+        <mapping class="be.techolympiad.common.dbEntities.Persoon"/>
+        <mapping class="be.techolympiad.common.dbEntities.Functies"/>
     </session-factory>
 </hibernate-configuration>
```

</div>

### DAOs

`dao/PersoonDao.java`

```java
package be.techolympiad.common.dao;

import be.techolympiad.common.dbEntities.Persoon;
import org.springframework.data.repository.NoRepositoryBean;

@NoRepositoryBean
public interface PersoonDao extends TechOlympiadDao<Persoon, Short> {
}
```

`dao/impl/PersoonDaoImpl.java`

```java
package be.techolympiad.common.dao.impl;

import be.techolympiad.common.dao.PersoonDao;
import be.techolympiad.common.dbEntities.Persoon;
import org.springframework.stereotype.Repository;

@Repository
public class PersoonDaoImpl extends TechOlympiadDaoImpl<Persoon, Short> implements PersoonDao {
}
```

An empty DAO is still worth having: it inherits `get`, `getOptional`,
`save` and the rest from the base classes, typed for `Persoon`.

`dao/FunctiesDao.java`

```java
package be.techolympiad.common.dao;

import be.techolympiad.common.Configuration;
import be.techolympiad.common.dbEntities.Functies;
import be.techolympiad.common.dbEntities.FunctiesPK;
import org.springframework.data.repository.NoRepositoryBean;

import java.util.List;

@NoRepositoryBean
public interface FunctiesDao extends TechOlympiadDao<Functies, FunctiesPK> {

    List<Functies> getBySchool(short schoolId, Configuration.ToRole edition);

    List<Functies> getByPerson(short personId);
}
```

`dao/impl/FunctiesDaoImpl.java`

```java
package be.techolympiad.common.dao.impl;

import be.techolympiad.common.Configuration;
import be.techolympiad.common.dao.FunctiesDao;
import be.techolympiad.common.dbEntities.Functies;
import be.techolympiad.common.dbEntities.FunctiesPK;
import org.hibernate.Session;
import org.hibernate.query.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public class FunctiesDaoImpl extends TechOlympiadDaoImpl<Functies, FunctiesPK> implements FunctiesDao {

    @Override
    @Transactional(value = transactionR, readOnly = true)
    public List<Functies> getBySchool(short schoolId, Configuration.ToRole edition) {
        Session session = getFactoryR().getCurrentSession();
        String hql = "SELECT f FROM Functies f "
                + "WHERE f.schoolId = :schoolId "
                + "AND f.functie = :edition";
        Query<Functies> query = session.createQuery(hql, type);
        query.setParameter("schoolId", schoolId);
        query.setParameter("edition", edition);
        return query.getResultList();
    }

    @Override
    @Transactional(value = transactionR, readOnly = true)
    public List<Functies> getByPerson(short personId) {
        Session session = getFactoryR().getCurrentSession();
        String hql = "SELECT f FROM Functies f "
                + "WHERE f.persoonId = :personId";
        Query<Functies> query = session.createQuery(hql, type);
        query.setParameter("personId", personId);
        return query.getResultList();
    }
}
```

The enum goes in as a parameter, and Hibernate binds it as `'JTO'`
because the field says `EnumType.STRING`.

`dao/ScholenDao.java` and `dao/impl/ScholenDaoImpl.java` each get one
method:

<div class="diff-view" data-diff-view>

```diff
 public interface ScholenDao extends TechOlympiadDao<Scholen, Short> {
 
     List<Scholen> findAll();
+
+    List<Scholen> getByToResponsible(short userId);
 }
```

</div>

<div class="diff-view" data-diff-view>

```diff
     @Override
     @Transactional(value = transactionR, readOnly = true)
     public List<Scholen> findAll() {
         Session session = getFactoryR().getCurrentSession();
         String hql = "SELECT s FROM Scholen s";
         Query<Scholen> query = session.createQuery(hql, type);
         return query.getResultList();
     }
+
+    @Override
+    @Transactional(value = transactionR, readOnly = true)
+    public List<Scholen> getByToResponsible(short userId) {
+        Session session = getFactoryR().getCurrentSession();
+        String hql = "SELECT DISTINCT s FROM Scholen s "
+                + "JOIN Functies f ON s.schoolId = f.schoolId "
+                + "WHERE f.persoonId = :userId";
+        Query<Scholen> query = session.createQuery(hql, type);
+        query.setParameter("userId", userId);
+        return query.getResultList();
+    }
 }
```

</div>

Every `Functies` row in TechOlympiad is a contest function, so the VWO's
filter on the role is not needed.

### Repositories

`restAPI/repositories/PersoonRepository.java`

```java
package be.techolympiad.common.restAPI.repositories;

import be.techolympiad.common.dbEntities.Persoon;
import org.springframework.data.repository.NoRepositoryBean;
import org.springframework.data.repository.Repository;

import java.util.Optional;

@NoRepositoryBean
public interface PersoonRepository extends Repository<Persoon, Short> {

    Optional<Persoon> findById(short id);
}
```

`restAPI/repositories/PersoonRepositoryImpl.java`

```java
package be.techolympiad.common.restAPI.repositories;

import be.techolympiad.common.dao.PersoonDao;
import be.techolympiad.common.dbEntities.Persoon;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public class PersoonRepositoryImpl implements PersoonRepository {

    private final PersoonDao persoonDao;

    @Autowired
    public PersoonRepositoryImpl(PersoonDao persoonDao) {
        this.persoonDao = persoonDao;
    }

    @Override
    public Optional<Persoon> findById(short id) {
        return persoonDao.getOptional(id);
    }
}
```

`restAPI/repositories/FunctiesRepository.java`

```java
package be.techolympiad.common.restAPI.repositories;

import be.techolympiad.common.Configuration;
import be.techolympiad.common.dbEntities.Functies;
import be.techolympiad.common.dbEntities.FunctiesPK;
import be.techolympiad.common.dbEntities.Persoon;
import org.springframework.data.repository.NoRepositoryBean;
import org.springframework.data.repository.Repository;

import java.util.List;

@NoRepositoryBean
public interface FunctiesRepository extends Repository<Functies, FunctiesPK> {

    List<Functies> findByPerson(short personId);

    List<Persoon> findResponsibles(short schoolId, Configuration.ToRole edition);

    Functies save(Functies function);

    void deleteById(FunctiesPK id);
}
```

`restAPI/repositories/FunctiesRepositoryImpl.java`

```java
package be.techolympiad.common.restAPI.repositories;

import be.techolympiad.common.Configuration;
import be.techolympiad.common.dao.FunctiesDao;
import be.techolympiad.common.dao.PersoonDao;
import be.techolympiad.common.dbEntities.Functies;
import be.techolympiad.common.dbEntities.FunctiesPK;
import be.techolympiad.common.dbEntities.Persoon;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Repository
public class FunctiesRepositoryImpl implements FunctiesRepository {

    private final FunctiesDao functionsDao;
    private final PersoonDao personDao;

    @Autowired
    public FunctiesRepositoryImpl(FunctiesDao functionsDao, PersoonDao personDao) {
        this.functionsDao = functionsDao;
        this.personDao = personDao;
    }

    @Override
    public List<Functies> findByPerson(short personId) {
        return functionsDao.getByPerson(personId);
    }

    @Override
    public List<Persoon> findResponsibles(short schoolId, Configuration.ToRole edition) {
        return functionsDao.getBySchool(schoolId, edition).stream()
                .map(function -> personDao.get(function.getPersoonId()))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    @Override
    public Functies save(Functies function) {
        return functionsDao.saveOrUpdate(function);
    }

    @Override
    public void deleteById(FunctiesPK id) {
        functionsDao.deleteById(id);
    }
}
```

`findResponsibles` looks up each person separately, one query per
responsable. The VWO's `FunctionController.getRoles` does the same with a
loop over `getPersonRepository().getById(userId)`; for the one or two
responsables a school has, it does not matter. `save` delegates to
`saveOrUpdate`, the VWO's habit for repository `save` methods: posting a
function that already exists is then harmless.
[Chapter 13](build-13-registration.md) takes `save`, `saveOrUpdate`,
`persist` and `merge` apart.

`ScholenRepository` and `ScholenRepositoryImpl` pass the new query
through (your DAO field may have another name, keep yours):

<div class="diff-view" data-diff-view>

```diff
 public interface ScholenRepository extends Repository<Scholen, Short> {
     ...
+
+    List<Scholen> getByToResponsible(short userId);
 }
```

</div>

<div class="diff-view" data-diff-view>

```diff
 public class ScholenRepositoryImpl implements ScholenRepository {
     ...
+
+    @Override
+    public List<Scholen> getByToResponsible(short userId) {
+        return scholenDao.getByToResponsible(userId);
+    }
 }
```

</div>

### Controllers

The endpoints of the new controller:

<div class="param-table" data-param-table>

| Name | Type | Description |
|---|---|---|
| `GET /function/to/school/{schoolId}` | `Person[]` | The responsables of a school; query parameter `edition` (`JTO` or `STO`, any case) is required. |
| `GET /function/to/{personId}` | `PersonFunction` | The person and all their functions; `404` if the person does not exist. |
| `POST /function` | `Function` | Body: a `Function`. Inserts it, or leaves it as it is when it exists. |
| `DELETE /function` | `void` | Body: a `Function`. Deletes it; `204` whether or not it existed. |
| `GET /school/to/user/{user_id}` | `School[]` | The schools a person is responsable for, each once. |

</div>

`restAPI/controllers/FunctionController.java`

```java
package be.techolympiad.common.restAPI.controllers;

import be.techolympiad.common.Configuration;
import be.techolympiad.common.dbEntities.Functies;
import be.techolympiad.common.dbEntities.FunctiesPK;
import be.techolympiad.common.dbEntities.Persoon;
import be.techolympiad.common.restAPI.repositories.FunctiesRepository;
import be.techolympiad.common.restAPI.repositories.PersoonRepository;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.validation.constraints.NotNull;
import java.util.List;

public interface FunctionController {

    FunctiesRepository getFunctionsRepository();

    PersoonRepository getPersonRepository();

    @GetMapping("/to/school/{schoolId}")
    @Operation(summary = "Get the responsables of a school for an edition")
    @ResponseBody
    default ResponseEntity<List<Persoon>> getResponsibles(@PathVariable("schoolId") short schoolId,
                                                          @RequestParam("edition") Configuration.ToRole edition) {
        return ResponseEntity.ok().body(getFunctionsRepository().findResponsibles(schoolId, edition));
    }

    @GetMapping("/to/{personId}")
    @Operation(summary = "Get a person with all their functions")
    @ResponseBody
    default ResponseEntity<PersonFunction> getByPerson(@PathVariable("personId") short personId) {
        return getPersonRepository().findById(personId)
                .map(person -> ResponseEntity.ok().body(new PersonFunction(person, getFunctionsRepository().findByPerson(personId))))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Make a person responsable for a school and edition")
    @ResponseBody
    default ResponseEntity<Functies> create(@RequestBody @NotNull Functies function) {
        return ResponseEntity.ok().body(getFunctionsRepository().save(function));
    }

    @DeleteMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Remove a responsable from a school and edition")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    default void delete(@RequestBody @NotNull Functies function) {
        getFunctionsRepository().deleteById(new FunctiesPK(function.getPersoonId(), function.getSchoolId(), function.getFunctie()));
    }

    record PersonFunction(Persoon user, List<Functies> roles) {
    }
}
```

`PersonFunction` is a Java record (a compact immutable data class, like a
C# positional `record`) nested in the interface, as the VWO's
`FunctionController.PersonFunction` is. Jackson 2.12 and later serialize
records from their components, so it comes out as
`{"user": {...}, "roles": [...]}`. The `DELETE` takes the key in a body,
like the `POST`. HTTP allows a body on `DELETE` and Spring reads it like
any other; the VWO `v1` class instead takes `personId`, `schoolId` and
`function` as query parameters.

`restAPI/controllers/v1/FunctionController.java`

```java
package be.techolympiad.common.restAPI.controllers.v1;

import be.techolympiad.common.restAPI.repositories.FunctiesRepository;
import be.techolympiad.common.restAPI.repositories.PersoonRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController("functionController.v1")
@RequestMapping(path = V1Config.BASE_URL + "/function", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "function-controller")
@Getter
public class FunctionController implements be.techolympiad.common.restAPI.controllers.FunctionController {

    private final FunctiesRepository functionsRepository;
    private final PersoonRepository personRepository;

    @Autowired
    public FunctionController(FunctiesRepository functionsRepository, PersoonRepository personRepository) {
        this.functionsRepository = functionsRepository;
        this.personRepository = personRepository;
    }
}
```

The class has the same simple name as the interface, so `implements`
spells the interface out in full, exactly as the VWO does. The explicit
bean name `"functionController.v1"` matters later: the `v2` class of
[chapter 19](build-19-api-v2.md) is also called `FunctionController`, and two
scanned beans with the default name `functionController` would stop the
application from starting.

`restAPI/controllers/SchoolController.java` gets one default method:

<div class="diff-view" data-diff-view>

```diff
 public interface SchoolController {
 
     ScholenRepository getRepository();
+
+    @GetMapping("/to/user/{user_id}")
+    @Operation(summary = "Get all schools for the TechOlympiad responsable with given ID")
+    default List<Scholen> getByToResponsible(@PathVariable("user_id") short id) {
+        return getRepository().getByToResponsible(id);
+    }
```

</div>

### Run it

Build and restart:

```bash
mvn -q -DskipTests -Plocal package && docker compose restart api
```

Open `http://localhost:8081/techolympiad/public/swagger-ui.html`. A
*function-controller* section appears next to the school endpoints. Work
through it with the seed data:

1. `GET /api/v1/function/to/school/2` with `edition` = `jto` (lower case
   on purpose). Atheneum Kruidenhof's JTO responsable is Eli Willems:

   ```json
   [
     {
       "personId": 5,
       "lastName": "Willems",
       "firstName": "Eli",
       "email": "eli.willems@school.example",
       "gender": "X"
     }
   ]
   ```

   With `edition` = `sto` you get Bram Janssens instead. Try
   `edition` = `XYZ`: `400`.
2. `GET /api/v1/function/to/1`: An Peeters holds both editions of school 1.

   ```json
   {
     "user": { "personId": 1, "lastName": "Peeters", "firstName": "An", "email": "an.peeters@school.example", "gender": "V" },
     "roles": [
       { "personId": 1, "schoolId": 1, "function": "JTO" },
       { "personId": 1, "schoolId": 1, "function": "STO" }
     ]
   }
   ```

   A `personId` that does not exist, such as `999`, gives `404` with an
   empty body.
3. `GET /api/v1/school/to/user/1`: school 1 once. Two `Functies` rows
   match, so without `DISTINCT` it would be listed twice.
4. Make Charlotte Maes (person 3) STO responsable of school 2 with
   `POST /api/v1/function`:

   ```json
   { "personId": 3, "schoolId": 2, "function": "STO" }
   ```

   The response echoes the body. Send it again: still `200`, because
   `saveOrUpdate` sees the row exists.
5. `GET /api/v1/school/to/user/3`: schools 2 and 3.
6. Remove the new function with `DELETE /api/v1/function` and the same
   body: `204`. Or from a terminal:

   ```bash
   curl -i -X DELETE http://localhost:8081/techolympiad/api/v1/function \
     -H 'Content-Type: application/json' \
     -d '{"personId": 3, "schoolId": 2, "function": "STO"}'
   ```

7. Post `{ "personId": 99, "schoolId": 2, "function": "STO" }`: `500`,
   because the foreign key to `Persoon` refuses the row (see below).

<div class="callout danger">
<div class="callout-label">When it breaks</div>

- **`org.hibernate.AnnotationException: Property of @IdClass not found in entity ... : persoonId`** at startup: a field in `FunctiesPK` has a name that is not an `@Id` field of `Functies`. The names must be identical.
- **`IllegalArgumentException: Parameter value [3] did not match expected type [java.lang.Short (n/a)]`**: an HQL parameter got an `int`. Keep the DAO parameters `short`.
- **`400` for `?edition=jto`**: the converter is not registered. Check that `ToRoleConverter` is `static`, annotated `@Component`, and inside `be.techolympiad`, the package the XML `component-scan` covers.
- **`400` with `JSON parse error: Cannot deserialize value of type ToRole from String "jto"`** on the `POST`: bodies are read by Jackson, not by the converter. Send `"JTO"`.
- **`ConflictingBeanDefinitionException: ... 'functionController'`**: two scanned classes got the same default bean name. Give the `v1` class its explicit name.
- **`500` with `DataIntegrityViolationException` in the Tomcat log** on the `POST`: the `personId` or `schoolId` does not exist, and the foreign key refuses the row. Error handling arrives in [chapter 18](build-18-error-handling.md).
- **`org.hibernate.hql.internal.ast.QuerySyntaxException: Functies is not mapped`**: the `<mapping>` line for `Functies` is missing from `hibernate_TO.cfg.xml`.

</div>

### Quiz

<div class="quiz" data-quiz>
<p class="quiz-q">You map <code>FUNCTIE</code> as <code>private Configuration.ToRole functie;</code> with <code>@Column</code> but no <code>@Enumerated</code>. What does Hibernate do when it saves an STO function?</p>
<ol class="quiz-options">
<li>It writes <code>'STO'</code>, because the column is an <code>ENUM</code><p class="quiz-whynot">Hibernate does not read the column type from the database; it follows the mapping, and the default is the position.</p></li>
<li data-correct>It writes the ordinal <code>1</code>, which MariaDB stores as <code>'JTO'</code><p class="quiz-why">The default is <code>EnumType.ORDINAL</code>. MariaDB reads a number in an <code>ENUM</code> column as a 1-based index, so <code>1</code> is the first value.</p></li>
<li>It refuses to start because the mapping is ambiguous<p class="quiz-whynot">Nothing is ambiguous to Hibernate: no annotation means <code>ORDINAL</code>.</p></li>
</ol>
<p class="quiz-explain">This is a silent data corruption bug, which is why every enum field in the VWO and in TechOlympiad says <code>@Enumerated(EnumType.STRING)</code>.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">Why does <code>Persoon.hashCode()</code> return a constant while <code>Functies.hashCode()</code> hashes its key fields?</p>
<ol class="quiz-options">
<li>Because <code>Persoon</code> has more columns<p class="quiz-whynot">The number of columns plays no role; only the key does.</p></li>
<li data-correct><code>Persoon</code>'s id is generated at insert time, so a hash over it would change; <code>Functies</code>'s key is known before the insert and never changes<p class="quiz-why">The hash must stay the same while the object is in a hash-based collection, from before the insert to after it.</p></li>
<li>Hibernate requires a constant <code>hashCode</code> on entities with <code>@GeneratedValue</code><p class="quiz-whynot">Hibernate requires nothing of the kind; it is a choice that keeps Java's contract intact.</p></li>
</ol>
<p class="quiz-explain">The VWO makes the same choice (<code>Persoon.hashCode()</code> returns <code>0</code>), for the same reason.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">A teacher is JTO and STO responsable of school 2. Without <code>DISTINCT</code>, what does <code>SELECT s FROM Scholen s JOIN Functies f ON s.schoolId = f.schoolId WHERE f.persoonId = :userId</code> return for that teacher?</p>
<ol class="quiz-options">
<li>School 2 once, because the result is a list of entities<p class="quiz-whynot">A join returns one row per matching pair, and Hibernate turns each row into a list element, even when two rows point to the same entity.</p></li>
<li data-correct>School 2 twice, the same object both times<p class="quiz-why">Two <code>Functies</code> rows match, so the SQL returns two rows. The persistence context maps both to the same <code>Scholen</code> instance, and the list holds it twice.</p></li>
<li>An error, because the join has no mapped association<p class="quiz-whynot">Ad hoc entity joins are valid HQL since Hibernate 5.1.</p></li>
</ol>
<p class="quiz-explain">The VWO's <code>getByVwoResponsible</code> has exactly this behaviour for a teacher holding both JWO and VWO. <code>SELECT DISTINCT s</code> fixes it.</p>
</div>

### Flashcards

<div class="flashcards" data-flashcards data-front-label="Term" data-back-label="Meaning">
<div class="card"><div class="front"><code>@IdClass</code></div><div class="back">Composite key with the key fields in the entity, each <code>@Id</code>; a separate class with the same fields serves as the key object. The VWO's default.</div></div>
<div class="card"><div class="front"><code>@EmbeddedId</code></div><div class="back">Composite key held in one <code>@Embeddable</code> field; HQL says <code>e.id.field</code>, and JSON nests unless you add <code>@JsonUnwrapped</code>.</div></div>
<div class="card"><div class="front">Key class rules</div><div class="back">Same names and types as the <code>@Id</code> fields, <code>Serializable</code>, public no-argument constructor, <code>equals</code> and <code>hashCode</code> over all fields.</div></div>
<div class="card"><div class="front"><code>EnumType.STRING</code></div><div class="back">Stores the constant's name. The only safe choice for an <code>ENUM</code> column, and for any column once the enum may grow.</div></div>
<div class="card"><div class="front"><code>Converter&lt;String, T&gt;</code> bean</div><div class="back">Spring Boot adds it to the MVC conversion service; it converts request parameters and path variables, never JSON bodies.</div></div>
<div class="card"><div class="front">Ad hoc entity join</div><div class="back"><code>JOIN Other o ON a.x = o.x</code> in HQL, with no mapped association. Hibernate 5.1 and later.</div></div>
<div class="card"><div class="front">Persistence context</div><div class="back">The per-session map from key to entity instance. Composite keys are its map keys, so their <code>equals</code>/<code>hashCode</code> must be value-based.</div></div>
</div>

### Self-checks

<details class="qa">
<summary>Self-check: the VWO <code>FunctiesPK</code> declares <code>private short persoonId</code> while <code>Functies</code> has <code>private Short persoonId</code>. Why does it still work, and why do we not copy it?</summary>
<div class="ans">
Hibernate builds the key mapping from the entity's <code>@Id</code> fields and copies values into the key class by name, unboxing where it has to. JPA requires the types to match, and a primitive cannot hold <code>null</code>, so a key object built from a half-filled entity would get <code>0</code> instead of "unknown". Matching wrapper types avoid both issues.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<details class="qa">
<summary>Self-check: you call <code>GET /function/to/school/2?edition=sto</code>. Trace how <code>sto</code> becomes <code>ToRole.STO</code>.</summary>
<div class="ans">
The <code>DispatcherServlet</code> finds the handler, and the argument resolver for <code>@RequestParam</code> asks the MVC conversion service to convert the <code>String</code> to <code>ToRole</code>. Spring Boot put <code>ToRoleConverter</code> into that service because it is a <code>Converter</code> bean found by component scanning. The converter trims, upper-cases and calls <code>ToRole.valueOf("STO")</code>.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<details class="qa">
<summary>Self-check: name one thing the VWO's <code>@ManyToOne</code> associations on <code>Functies</code> would give you, and one risk they bring.</summary>
<div class="ans">
They allow navigation in HQL (<code>SELECT f.persoonByPersoonId FROM Functies f</code>) and in Java (<code>function.getPersoonByPersoonId()</code>). The risks: a lazy proxy touched after the session closed throws <code>LazyInitializationException</code>, Jackson would try to serialize it without <code>@JsonIgnore</code>, and the column is mapped twice, so you must decide which mapping writes it.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<button type="button" data-mark-done>Mark this chapter done</button>

</div>
