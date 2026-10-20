# 15. Answer key and round dates

<div class="level-tabs" data-levels>
  <button data-level="overview" aria-pressed="true">Overview</button>
  <button data-level="deep" data-short="Deep">Deep Understanding</button>
  <button data-level="drill">Drilling</button>
</div>

<div class="level overview">

Before anyone can be scored, two facts about a contest year must be
known: the correct answer to each of the 30 questions, and when each
round takes place. The VWO API serves both to its websites. Its
`AnswerStringController` returns the answer key as one string of 30
letters (`GET /answer-string/vwo?round=1`), and its `DatesController`
returns the date and hour of each round. TechOlympiad builds the same
two read-only endpoints on `Antwoorden` and `Website_to_wedstrijddatums`.

Both tables have composite keys again, and each brings a column type that
does not map one to one onto Java. `ANTWOORD` is a MariaDB `SET`, which
can hold several letters at once. `RONDE` is an `ENUM('1','2','F')` whose
values are not valid Java names, so it needs a JPA
<dfn data-def="A JPA class implementing AttributeConverter&lt;X, Y&gt; that turns an entity attribute of type X into a column value of type Y and back. Applied with @Convert or automatically with @Converter(autoApply = true).">AttributeConverter</dfn>.
That converter is also the reason the dates entity uses `@EmbeddedId`
instead of `@IdClass`. It is our only entity with `@EmbeddedId`, and
the VWO's version of this entity is its only one too.

**After this chapter you can:**

- map a `SET` column and build a fixed-length answer string from rows;
- write an `AttributeConverter` and say how it differs from the Spring `Converter` of chapter 12;
- explain why a converted key attribute needs `@EmbeddedId`;
- give query parameters sensible defaults, including ones that are not constants.

<div class="code-compare" data-code-compare data-labels="VWO AntwoordenDaoImpl + AntwoordenRepositoryImpl|TechOlympiad AntwoordenDaoImpl">

```java
// AntwoordenDaoImpl
public List<Character> getAnswers(Configuration.VwoKangoeroeRole edition, short year, byte round) {
    List<Character> result = new ArrayList<>();
    ...
    List<Antwoorden> resultList = q.getResultList();
    for (Antwoorden answer : resultList) {
        result.add(answer.getAntwoord().name().charAt(0));
    }
    return result;
}

// AntwoordenRepositoryImpl
public String getVwo(byte round, Short schoolYear) {
    List<Character> answers = getMcDao().getAnswers(Configuration.VwoKangoeroeRole.VWO, schoolYear, round);
    return StringUtils.join(answers, null);
}
```

```java
@Override
@Transactional(value = transactionR, readOnly = true)
public String getAnswerString(Configuration.ToRole edition, byte round, short year) {
    return getAnswers(edition, round, year).stream()
            .map(Antwoorden::getAntwoord)
            .map(answer -> answer.length() == 1 ? answer : MULTIPLE_ANSWERS)
            .collect(Collectors.joining());
}
```

</div>

The VWO builds a `List<Character>` in the DAO and joins it in the
repository, with one method per edition (`getJwo`, `getVwo`). We take the
edition as a parameter and let the DAO return the finished string.

</div>

<div class="level deep">

### The answer key as rows and as a string

`Antwoorden` has one row per question: year, edition, round, question
number, and the correct answer. The key of a row is the first four
columns, so the entity gets an `@IdClass` with four fields, exactly as in
chapter 12. For the websites and for scoring, the 30 rows are more
useful as one string: position 1 is question 1, and so on.

```text
JTO, round 1, 2027:  BDACEABDCECEABDDBECAEACDBACBED
```

The DAO orders the rows by `VRAAG` and concatenates the letters. Java
streams make that one expression: `map` each row to its answer and
`Collectors.joining()` glues the strings together, the counterpart of
`string.Concat(rows.Select(r => r.Antwoord))` in C#. The VWO calls
`StringUtils.join(answers, null)` on a `List<Character>`. `StringUtils`
comes from Apache Commons, a widely used Java utility library. The call
does the same thing in the style from before streams.

### A `SET` column

`ANTWOORD set('A','B','C','D','E')` is a MariaDB type that holds any
combination of the listed values. `'B'` is a valid value, and so is
`'A,C'`. MariaDB stores it as a bitmask and returns it as a
comma-separated string in the order of the definition. A `SET` gives the
jury a way to accept two answers for a flawed question without changing
the schema.

The VWO maps the column to an enum:

```java
@Basic
@Column(name = "ANTWOORD", nullable = false)
@Enumerated(EnumType.STRING)
private Answer antwoord;
```

That works as long as every row holds one letter. A row with `'A,C'`
would make Hibernate call `Answer.valueOf("A,C")`, which throws
`IllegalArgumentException: No enum constant ... A,C`, and the whole query
would fail. TechOlympiad maps it as a `String`, the type the driver
returns, and lets the code decide. In the answer string, a question with
several accepted answers becomes `*`. The scorer of chapter 16 reads the
rows themselves and accepts any of the letters. The seed has one letter
per question, so the strings you will see contain no `*`.

<div class="callout note">
<div class="callout-label">Not everything in the VWO entity is meaningful</div>

The VWO's `Antwoorden` and `AntwoordenPK` put
`@GeneratedValue(strategy = GenerationType.IDENTITY)` on all four key
fields. A composite key cannot be generated, and none of these columns
is `AUTO_INCREMENT`. It does no harm only because the API never inserts
answers. Leave it out.

</div>

### Two kinds of converter

Chapter 12 wrote a Spring `Converter<String, ToRole>` for URLs. This
chapter needs a JPA `AttributeConverter<ToRound, String>` for a column.
They solve the same kind of problem at different borders:

<div class="table-wrap">

| | Spring `Converter<S, T>` | JPA `AttributeConverter<X, Y>` |
|---|---|---|
| Package | `org.springframework.core.convert.converter` | `javax.persistence` |
| Used by | Spring MVC data binding (`@RequestParam`, `@PathVariable`) | Hibernate, when it reads or writes a column |
| Direction | one way, `S` to `T` | both ways: `convertToDatabaseColumn`, `convertToEntityAttribute` |
| Registered by | being a Spring bean | `@Convert(converter = ...)` on the field, or `@Converter(autoApply = true)` |
| EF Core | a custom `TypeConverter` or model binder | a `ValueConverter` in `HasConversion` |

</div>

### Why `RONDE` needs a converter

The column is `enum('1','2','F')`, and the Java enum is
`ToRound { ONE('1'), TWO('2'), FINAL('F') }`. Neither built-in enum
mapping fits:

- `EnumType.STRING` writes `'ONE'`, which is not one of the column's
  values: strict mode refuses it with `Data truncated for column 'RONDE'`.
- `EnumType.ORDINAL` writes `0`, `1` or `2`. MariaDB reads those as
  1-based indexes, so `TWO` (ordinal `1`) would be stored as `'1'`.

`ToRoundConverter` maps each constant to its `code` and back. Note the
`null` checks: Hibernate calls the converter for `null` values too.

### Converters and keys: why this entity uses `@EmbeddedId`

`RONDE` is part of the primary key. Here the choice between `@IdClass`
and `@EmbeddedId` from chapter 12 matters. JPA states that converters do not apply to id attributes, and
Hibernate 5 follows that for any attribute annotated `@Id`: it skips the
converter and falls back to its default enum mapping. With `@IdClass`,
every key field in the entity carries `@Id`, so a converter on `ronde`
would be ignored and reading a round would fail.

With `@EmbeddedId` the key fields live in an `@Embeddable` class and are
ordinary columns there, without `@Id`. Hibernate applies the converter
to them. (The JPA specification excludes embedded-id attributes too, so
this relies on Hibernate's behaviour, not on the standard.) This is the
VWO's exact shape: `WebsiteVwoWedstrijddatums` is its only entity with
`@EmbeddedId`, and its key class holds the converted round:

```java
@Column(name = "RONDE")
@Basic
@JsonProperty("round")
@Convert(converter = VwoRoundConverter.class, attributeName = "round")
private Configuration.VwoRound ronde;
```

Two details there are not worth copying:

1. `attributeName`. This attribute names a sub-attribute when `@Convert`
   sits on an embedded or map attribute. On a basic field it names
   nothing. The converter still applies because the VWO also declares it
   `@Converter(autoApply = true)`. That makes Hibernate use it for every
   `VwoRound` attribute.
2. The target type. The VWO converts to `Character`. We convert to
   `String`, which is what the driver returns for an `ENUM` column anyway.

The costs of `@EmbeddedId` are the ones from chapter 12's table. HQL
reaches the key through the field, `w.pk.jaar` (the VWO writes `w.id.jaar`,
using HQL's special `id` alias for the identifier). And Jackson would
nest the key as `"pk": {...}` unless the field carries `@JsonUnwrapped`,
which pulls `year` and `round` up into the date object.

### Query parameters with defaults

The answer string endpoint takes `round` and `year` as query parameters.
For `round` a constant default works, and `@RequestParam` converts it
like a value that was sent:

```java
@RequestParam(value = "round", defaultValue = "1") byte round
```

For `year` it does not, as chapter 13 showed: the default is computed per
request with `Objects.requireNonNullElse(year, General.getCurrentSchoolYear())`.
The VWO's `AnswerStringController` has no `year` parameter at all and
always serves the current school year. Adding the parameter costs one
line and lets you ask for last year's key.

### Plain text responses

The answer string is not JSON. It is 30 letters. The VWO's `v1`
`AnswerStringController` therefore says
`produces = MediaType.TEXT_PLAIN_VALUE`, and Spring writes the returned
`String` as is, with its `StringHttpMessageConverter`.

Our other controllers say `APPLICATION_JSON_VALUE`. With that value,
Spring still picks the same converter, because it does so for any
`String` return value. The converter still writes the raw letters, but
it labels them `application/json`, and a strict client cannot parse
them. So this controller follows the VWO and deviates from our usual
`produces`.

### Literal paths win over variables

`DatesController` maps both `GET /contest/list` and
`GET /contest/{round}`. A request for `/contest/list` matches both
patterns. Spring sorts candidate patterns by specificity, and a pattern
with fewer variables is more specific, so the literal one wins and
`list` never reaches the `{round}` method. The VWO has the same pair
(`/vwo/contest/list` and `/vwo/contest/{round}`).

</div>

<div class="level drill">

### What you should have

The end state of [chapter 14](build-14-pupils.md): pupils can be
enrolled and counted. The seed has the 2027 answer keys for both
editions and both rounds in `Antwoorden`, and three 2027 rows in
`Website_to_wedstrijddatums`.

Paths are relative to `src/main/java/be/techolympiad/common/`.

### Tasks

<ul class="checklist">
<li><label><input type="checkbox"><span>Add <code>NUMBER_OF_QUESTIONS</code> to <code>Configuration</code>.</span></label></li>
<li><label><input type="checkbox"><span>Create <code>AntwoordenPK</code> and <code>Antwoorden</code>.</span></label></li>
<li><label><input type="checkbox"><span>Create <code>ToRoundConverter</code>, <code>WebsiteToWedstrijddatumsPK</code> and <code>WebsiteToWedstrijddatums</code>.</span></label></li>
<li><label><input type="checkbox"><span>Map both entities in <code>hibernate_TO.cfg.xml</code>.</span></label></li>
<li><label><input type="checkbox"><span>Create <code>AntwoordenDao</code>, <code>WebsiteToWedstrijddatumsDao</code> and their implementations.</span></label></li>
<li><label><input type="checkbox"><span>Create <code>AntwoordenRepository</code>, <code>ToContestDatesRepository</code> and their implementations.</span></label></li>
<li><label><input type="checkbox"><span>Create <code>AnswerStringController</code> and <code>DatesController</code> with their <code>v1</code> classes.</span></label></li>
<li><label><input type="checkbox"><span>Build, restart, and run the calls under <em>Run it</em>.</span></label></li>
<li><label><input type="checkbox"><span>Commit: <code>git add -A &amp;&amp; git commit -m "Serve the answer key and round dates"</code>.</span></label></li>
</ul>

### Configuration

<div class="diff-view" data-diff-view>

```diff
 public final class Configuration {
 
+    public static final int NUMBER_OF_QUESTIONS = 30;
+
     private Configuration() {
     }
```

</div>

### Entities

`dbEntities/AntwoordenPK.java`

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
public class AntwoordenPK implements Serializable {

    private short jaar;
    private Configuration.ToRole editie;
    private byte ronde;
    private byte vraag;
}
```

`dbEntities/Antwoorden.java`

```java
package be.techolympiad.common.dbEntities;

import be.techolympiad.common.Configuration;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.*;
import java.io.Serializable;
import java.util.Objects;

@Entity
@Table(name = "Antwoorden", schema = "TechOlympiad")
@IdClass(AntwoordenPK.class)
@Schema(name = "Answer")
@Getter
@Setter
@NoArgsConstructor
public class Antwoorden implements Serializable {

    @Id
    @Column(name = "JAAR", nullable = false)
    @JsonProperty("year")
    private short jaar;

    @Id
    @Column(name = "EDITIE", nullable = false)
    @Enumerated(EnumType.STRING)
    @JsonProperty("edition")
    private Configuration.ToRole editie;

    @Id
    @Column(name = "RONDE", nullable = false)
    @JsonProperty("round")
    @Schema(type = "integer")
    private byte ronde;

    @Id
    @Column(name = "VRAAG", nullable = false)
    @JsonProperty("question")
    @Schema(type = "integer")
    private byte vraag;

    @Column(name = "ANTWOORD", nullable = false)
    @JsonProperty("answer")
    @Schema(description = "One or more of A-E, comma-separated", example = "B")
    private String antwoord;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Antwoorden that = (Antwoorden) o;
        return jaar == that.jaar && ronde == that.ronde && vraag == that.vraag && editie == that.editie;
    }

    @Override
    public int hashCode() {
        return Objects.hash(jaar, editie, ronde, vraag);
    }
}
```

`dbEntities/ToRoundConverter.java`

```java
package be.techolympiad.common.dbEntities;

import be.techolympiad.common.Configuration;

import javax.persistence.AttributeConverter;
import javax.persistence.Converter;

@Converter
public class ToRoundConverter implements AttributeConverter<Configuration.ToRound, String> {

    @Override
    public String convertToDatabaseColumn(Configuration.ToRound round) {
        return round == null ? null : String.valueOf(round.getCode());
    }

    @Override
    public Configuration.ToRound convertToEntityAttribute(String code) {
        return code == null || code.isEmpty() ? null : Configuration.ToRound.fromCode(code.charAt(0));
    }
}
```

The VWO nests its converter inside the key class. A top-level class is
easier to find and reuse, and since it is referenced by `@Convert` on the
field, it needs no `<mapping>` line: Hibernate instantiates it when it
reads that annotation.

<div class="code-walk" data-code-walk>

```java
package be.techolympiad.common.dbEntities;

import be.techolympiad.common.Configuration;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.Column;
import javax.persistence.Convert;
import javax.persistence.Embeddable;
import java.io.Serializable;

@Embeddable // (1)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class WebsiteToWedstrijddatumsPK implements Serializable {

    @Column(name = "JAAR", nullable = false)
    @JsonProperty("year")
    private short jaar;

    @Column(name = "RONDE", nullable = false)
    @Convert(converter = ToRoundConverter.class) // (2)
    @JsonProperty("round")
    private Configuration.ToRound ronde;
}
```

1. An embeddable is a group of columns owned by an entity. Here it is the whole key, so the mappings live in this class and the entity holds one field of this type.
2. The field has no `@Id`, so Hibernate applies the converter. `ToRound`'s `@JsonValue` makes the JSON `"1"`, `"2"` or `"F"`, matching the column.

</div>

`dbEntities/WebsiteToWedstrijddatums.java`

```java
package be.techolympiad.common.dbEntities;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonUnwrapped;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.*;
import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Objects;

@Entity
@Table(name = "Website_to_wedstrijddatums", schema = "TechOlympiad")
@Schema(name = "ContestDate")
@Getter
@Setter
@NoArgsConstructor
public class WebsiteToWedstrijddatums implements Serializable {

    @EmbeddedId
    @JsonUnwrapped
    private WebsiteToWedstrijddatumsPK pk;

    @Column(name = "DATUM", nullable = false)
    @JsonProperty("date")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate datum;

    @Column(name = "UUR", nullable = false)
    @JsonProperty("hour")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "HH:mm")
    private LocalTime uur;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        return Objects.equals(pk, ((WebsiteToWedstrijddatums) o).pk);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(pk);
    }
}
```

`DATE` maps to `LocalDate` and `TIME` to `LocalTime` without further
annotations: Hibernate 5.2 and later know the `java.time` types. The
`@JsonFormat` patterns are the VWO's; without them a time would come out
as `"10:00:00"`.

`hibernate_TO.cfg.xml`:

<div class="diff-view" data-diff-view>

```diff
         <mapping class="be.techolympiad.common.dbEntities.LeerlingEersteRonde"/>
+        <mapping class="be.techolympiad.common.dbEntities.Antwoorden"/>
+        <mapping class="be.techolympiad.common.dbEntities.WebsiteToWedstrijddatums"/>
     </session-factory>
```

</div>

### DAOs

`dao/AntwoordenDao.java`

```java
package be.techolympiad.common.dao;

import be.techolympiad.common.Configuration;
import be.techolympiad.common.dbEntities.Antwoorden;
import be.techolympiad.common.dbEntities.AntwoordenPK;
import org.springframework.data.repository.NoRepositoryBean;

import java.util.List;

@NoRepositoryBean
public interface AntwoordenDao extends TechOlympiadDao<Antwoorden, AntwoordenPK> {

    List<Antwoorden> getAnswers(Configuration.ToRole edition, byte round, short year);

    String getAnswerString(Configuration.ToRole edition, byte round, short year);
}
```

`dao/impl/AntwoordenDaoImpl.java`

```java
package be.techolympiad.common.dao.impl;

import be.techolympiad.common.Configuration;
import be.techolympiad.common.dao.AntwoordenDao;
import be.techolympiad.common.dbEntities.Antwoorden;
import be.techolympiad.common.dbEntities.AntwoordenPK;
import org.hibernate.Session;
import org.hibernate.query.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Repository
public class AntwoordenDaoImpl extends TechOlympiadDaoImpl<Antwoorden, AntwoordenPK> implements AntwoordenDao {

    private static final String MULTIPLE_ANSWERS = "*";

    @Override
    @Transactional(value = transactionR, readOnly = true)
    public List<Antwoorden> getAnswers(Configuration.ToRole edition, byte round, short year) {
        Session session = getFactoryR().getCurrentSession();
        String hql = "SELECT a FROM Antwoorden a "
                + "WHERE a.editie = :edition "
                + "AND a.jaar = :year "
                + "AND a.ronde = :round "
                + "ORDER BY a.vraag";
        Query<Antwoorden> query = session.createQuery(hql, type);
        query.setParameter("edition", edition);
        query.setParameter("year", year);
        query.setParameter("round", round);
        return query.getResultList();
    }

    @Override
    @Transactional(value = transactionR, readOnly = true)
    public String getAnswerString(Configuration.ToRole edition, byte round, short year) {
        return getAnswers(edition, round, year).stream()
                .map(Antwoorden::getAntwoord)
                .map(answer -> answer.length() == 1 ? answer : MULTIPLE_ANSWERS)
                .collect(Collectors.joining());
    }
}
```

`getAnswerString` calls `getAnswers` on `this`, which bypasses the
transactional proxy, so `getAnswers`'s own `@Transactional` has no effect
on that call. That is fine here: `getAnswerString` is itself transactional
on the same manager, so a read-only session is bound when `getAnswers`
asks for it. A `byte` parameter matches the `byte` field exactly; passing
an `int` such as `1` would fail with the type mismatch of chapter 12.

`dao/WebsiteToWedstrijddatumsDao.java`

```java
package be.techolympiad.common.dao;

import be.techolympiad.common.dbEntities.WebsiteToWedstrijddatums;
import be.techolympiad.common.dbEntities.WebsiteToWedstrijddatumsPK;
import org.springframework.data.repository.NoRepositoryBean;

import java.util.Collection;

@NoRepositoryBean
public interface WebsiteToWedstrijddatumsDao extends TechOlympiadDao<WebsiteToWedstrijddatums, WebsiteToWedstrijddatumsPK> {

    Collection<? extends WebsiteToWedstrijddatums> getAllByYear(short year);
}
```

`dao/impl/WebsiteToWedstrijddatumsDaoImpl.java`

```java
package be.techolympiad.common.dao.impl;

import be.techolympiad.common.dao.WebsiteToWedstrijddatumsDao;
import be.techolympiad.common.dbEntities.WebsiteToWedstrijddatums;
import be.techolympiad.common.dbEntities.WebsiteToWedstrijddatumsPK;
import org.hibernate.Session;
import org.hibernate.query.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;

@Repository
public class WebsiteToWedstrijddatumsDaoImpl extends TechOlympiadDaoImpl<WebsiteToWedstrijddatums, WebsiteToWedstrijddatumsPK> implements WebsiteToWedstrijddatumsDao {

    @Override
    @Transactional(value = transactionR, readOnly = true)
    public Collection<? extends WebsiteToWedstrijddatums> getAllByYear(short year) {
        Session session = getFactoryR().getCurrentSession();
        String hql = "SELECT w FROM WebsiteToWedstrijddatums w "
                + "WHERE w.pk.jaar = :year "
                + "ORDER BY w.datum";
        Query<WebsiteToWedstrijddatums> query = session.createQuery(hql, type);
        query.setParameter("year", year);
        return query.getResultList();
    }
}
```

### Repositories

`restAPI/repositories/AntwoordenRepository.java`

```java
package be.techolympiad.common.restAPI.repositories;

import be.techolympiad.common.Configuration;
import be.techolympiad.common.dbEntities.Antwoorden;
import be.techolympiad.common.dbEntities.AntwoordenPK;
import org.springframework.data.repository.NoRepositoryBean;
import org.springframework.data.repository.Repository;

@NoRepositoryBean
public interface AntwoordenRepository extends Repository<Antwoorden, AntwoordenPK> {

    String getAnswerString(Configuration.ToRole edition, byte round, short year);
}
```

`restAPI/repositories/AntwoordenRepositoryImpl.java`

```java
package be.techolympiad.common.restAPI.repositories;

import be.techolympiad.common.Configuration;
import be.techolympiad.common.dao.AntwoordenDao;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

@Repository
public class AntwoordenRepositoryImpl implements AntwoordenRepository {

    private final AntwoordenDao dao;

    @Autowired
    public AntwoordenRepositoryImpl(AntwoordenDao dao) {
        this.dao = dao;
    }

    @Override
    public String getAnswerString(Configuration.ToRole edition, byte round, short year) {
        return dao.getAnswerString(edition, round, year);
    }
}
```

The VWO's interface is declared `Repository<CorrectAnswer, Integer>`,
naming a model class as its entity. The type arguments of the Spring Data
marker are never checked because of `@NoRepositoryBean`, so it compiles
and runs. Our interface names the entity it actually serves.

`restAPI/repositories/ToContestDatesRepository.java`

```java
package be.techolympiad.common.restAPI.repositories;

import be.techolympiad.common.dbEntities.WebsiteToWedstrijddatums;
import be.techolympiad.common.dbEntities.WebsiteToWedstrijddatumsPK;
import org.springframework.data.repository.NoRepositoryBean;
import org.springframework.data.repository.Repository;

import java.util.Collection;
import java.util.Optional;

@NoRepositoryBean
public interface ToContestDatesRepository extends Repository<WebsiteToWedstrijddatums, WebsiteToWedstrijddatumsPK> {

    Optional<WebsiteToWedstrijddatums> findById(WebsiteToWedstrijddatumsPK pk);

    Collection<? extends WebsiteToWedstrijddatums> findAllByYear(short year);
}
```

`restAPI/repositories/ToContestDatesRepositoryImpl.java`

```java
package be.techolympiad.common.restAPI.repositories;

import be.techolympiad.common.dao.WebsiteToWedstrijddatumsDao;
import be.techolympiad.common.dbEntities.WebsiteToWedstrijddatums;
import be.techolympiad.common.dbEntities.WebsiteToWedstrijddatumsPK;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.Optional;

@Repository
public class ToContestDatesRepositoryImpl implements ToContestDatesRepository {

    private final WebsiteToWedstrijddatumsDao dao;

    @Autowired
    public ToContestDatesRepositoryImpl(WebsiteToWedstrijddatumsDao dao) {
        this.dao = dao;
    }

    @Override
    public Optional<WebsiteToWedstrijddatums> findById(WebsiteToWedstrijddatumsPK pk) {
        return dao.getOptional(pk);
    }

    @Override
    public Collection<? extends WebsiteToWedstrijddatums> findAllByYear(short year) {
        return dao.getAllByYear(year);
    }
}
```

The `Collection<? extends WebsiteToWedstrijddatums>` return type is the
VWO's (`VwoContestDatesRepository.findAllByYear`). It promises only
something to iterate, which leaves the implementation free to return
any collection, such as a cached one. Round dates change once a year,
and every page of a contest website reads them. The VWO caches this
repository for that reason, and chapter 21 adds `@Cacheable` here.

### Controllers

<div class="param-table" data-param-table>

| Name | Type | Description |
|---|---|---|
| `GET /answer-string/{edition}` | `string` | `text/plain`, 30 characters; query `round` (default `1`) and `year` (default current); `404` when no key exists. |
| `GET /date/to/contest/{round}` | `ContestDate` | `round` is `1`, `2` or `F`; query `year` optional; `404` when the date is not set. |
| `GET /date/to/contest/list` | `ContestDate[]` | All round dates of a year, in date order. |

</div>

`restAPI/controllers/AnswerStringController.java`

```java
package be.techolympiad.common.restAPI.controllers;

import be.techolympiad.common.Configuration;
import be.techolympiad.common.General;
import be.techolympiad.common.restAPI.repositories.AntwoordenRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.Objects;

public interface AnswerStringController {

    AntwoordenRepository getRepository();

    @GetMapping("/{edition}")
    @Operation(summary = "Get the correct answers of a round as one string, one character per question")
    @ResponseBody
    default ResponseEntity<String> get(
            @PathVariable("edition") Configuration.ToRole edition,
            @RequestParam(value = "round", defaultValue = "1") @Parameter(schema = @Schema(type = "integer", allowableValues = {"1", "2"})) byte round,
            @RequestParam(value = "year", required = false) @Parameter(description = "School year; current school year if empty") Short year) {
        short schoolYear = Objects.requireNonNullElse(year, General.getCurrentSchoolYear());
        String result = getRepository().getAnswerString(edition, round, schoolYear);
        if (result.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok().body(result);
    }
}
```

`restAPI/controllers/v1/AnswerStringController.java`

```java
package be.techolympiad.common.restAPI.controllers.v1;

import be.techolympiad.common.restAPI.repositories.AntwoordenRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController("answerStringController.v1")
@RequestMapping(path = V1Config.BASE_URL + "/answer-string", produces = MediaType.TEXT_PLAIN_VALUE)
@Tag(name = "answer-string-controller")
@Getter
public class AnswerStringController implements be.techolympiad.common.restAPI.controllers.AnswerStringController {

    private final AntwoordenRepository repository;

    @Autowired
    public AnswerStringController(AntwoordenRepository repository) {
        this.repository = repository;
    }
}
```

`restAPI/controllers/DatesController.java`

```java
package be.techolympiad.common.restAPI.controllers;

import be.techolympiad.common.Configuration;
import be.techolympiad.common.General;
import be.techolympiad.common.dbEntities.WebsiteToWedstrijddatums;
import be.techolympiad.common.dbEntities.WebsiteToWedstrijddatumsPK;
import be.techolympiad.common.restAPI.repositories.ToContestDatesRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.Collection;
import java.util.Objects;

public interface DatesController {

    ToContestDatesRepository getRepository();

    @GetMapping("/contest/list")
    @Operation(summary = "Get all contest dates of a school year")
    @ResponseBody
    default ResponseEntity<Collection<? extends WebsiteToWedstrijddatums>> getContestDates(
            @RequestParam(value = "year", required = false) @Parameter(description = "School year; current school year if empty") Short year) {
        short schoolYear = Objects.requireNonNullElse(year, General.getCurrentSchoolYear());
        return ResponseEntity.ok().body(getRepository().findAllByYear(schoolYear));
    }

    @GetMapping("/contest/{round}")
    @Operation(summary = "Get the date of one round")
    @ResponseBody
    default ResponseEntity<WebsiteToWedstrijddatums> getContestDate(
            @PathVariable("round") @Parameter(schema = @Schema(allowableValues = {"1", "2", "F"})) char roundChar,
            @RequestParam(value = "year", required = false) @Parameter(description = "School year; current school year if empty") Short year) {
        Configuration.ToRound round = Configuration.ToRound.fromCode(roundChar);
        if (round == null) {
            return ResponseEntity.badRequest().build();
        }
        WebsiteToWedstrijddatumsPK pk = new WebsiteToWedstrijddatumsPK();
        pk.setJaar(Objects.requireNonNullElse(year, General.getCurrentSchoolYear()));
        pk.setRonde(round);
        return getRepository().findById(pk)
                .map(date -> ResponseEntity.ok().body(date))
                .orElse(ResponseEntity.notFound().build());
    }
}
```

The round arrives as a `char`, like in the VWO's `getVwoContestDate`:
Spring converts a one-character path segment to `char`, and a longer one
(`/contest/12`) fails conversion with `400`.

`restAPI/controllers/v1/DatesController.java`

```java
package be.techolympiad.common.restAPI.controllers.v1;

import be.techolympiad.common.restAPI.repositories.ToContestDatesRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController("datesController.v1")
@RequestMapping(path = V1Config.BASE_URL + "/date/to", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "dates-controller")
@Getter
public class DatesController implements be.techolympiad.common.restAPI.controllers.DatesController {

    private final ToContestDatesRepository repository;

    @Autowired
    public DatesController(ToContestDatesRepository repository) {
        this.repository = repository;
    }
}
```

### Run it

```bash
mvn -q -DskipTests -Plocal package && docker compose restart api
```

1. `GET /api/v1/answer-string/jto`: round 1 of the current year (2027),
   as plain text:

   ```text
   BDACEABDCECEABDDBECAEACDBACBED
   ```

   With `round` = `2`: `EACBDDCABEBDEACCEBADADBCEEBDAC`. For `sto`,
   round 1: `CABEDDCEABBEDACACDBEEDBCABACED`.
2. The same with `year` = `2026`: `404`, the seed has no key for 2026.
3. Accept two answers for question 1 and look again:

   ```bash
   docker compose exec db mariadb -uroot -pdevpass TechOlympiad \
     -e "UPDATE Antwoorden SET ANTWOORD = 'B,D' WHERE JAAR = 2027 AND EDITIE = 'JTO' AND RONDE = 1 AND VRAAG = 1"
   ```

   The string now starts with `*`. Set it back to `'B'` before chapter 16.
4. `GET /api/v1/date/to/contest/1`:

   ```json
   { "year": 2027, "round": "1", "date": "2027-01-14", "hour": "10:00" }
   ```

   `/contest/F` gives the final on `2027-04-24`; `/contest/f` gives `400`,
   because `fromCode` only knows the upper-case `F`.
5. `GET /api/v1/date/to/contest/list`: the three dates, round 1 first.

<div class="callout danger">
<div class="callout-label">When it breaks</div>

- **`Data truncated for column 'RONDE'`**, or `No enum constant ... ToRound.1` when reading: the converter is not applied. Check that `@Convert` sits on the field in the `@Embeddable` key class and that the field has no `@Id`.
- **`could not resolve property: jaar of: ...WebsiteToWedstrijddatums`**: with `@EmbeddedId` the year is `w.pk.jaar`, not `w.jaar`.
- **The JSON has a nested `"pk": {...}`**: `@JsonUnwrapped` is missing on the key field.
- **`IllegalArgumentException: Parameter value [1] did not match expected type [java.lang.Byte (n/a)]`**: an `int` passed for `ronde` or `vraag`. Keep the parameters `byte`.
- **Swagger shows the answer string with quotes, or the client complains about JSON**: the `v1` class says `APPLICATION_JSON_VALUE`. It must produce `TEXT_PLAIN_VALUE`.
- **`IllegalArgumentException: No enum constant`** on the answer key: `antwoord` is mapped as an enum while a row holds several letters. Map it as `String`.

</div>

### Quiz

<div class="quiz" data-quiz>
<p class="quiz-q">Why does <code>WebsiteToWedstrijddatums</code> use <code>@EmbeddedId</code> while every other composite key in TechOlympiad uses <code>@IdClass</code>?</p>
<ol class="quiz-options">
<li>Because it is the only key with a date in it<p class="quiz-whynot">The key is <code>JAAR</code> and <code>RONDE</code>; the date is an ordinary column.</p></li>
<li data-correct>Because <code>RONDE</code> needs an <code>AttributeConverter</code>, and Hibernate does not apply converters to <code>@Id</code> attributes, which <code>@IdClass</code> requires<p class="quiz-why">In an <code>@Embeddable</code> key the fields carry no <code>@Id</code>, so the converter is applied, which is how the VWO's only <code>@EmbeddedId</code> entity works.</p></li>
<li>Because <code>@IdClass</code> cannot hold an enum<p class="quiz-whynot"><code>FunctiesPK</code> and <code>AntwoordenPK</code> hold <code>ToRole</code> enums without trouble; they use <code>@Enumerated</code>, not a converter.</p></li>
</ol>
<p class="quiz-explain"><code>@Enumerated</code> is part of the basic type mapping and works on ids; an <code>AttributeConverter</code> is not, and JPA excludes ids from it.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">You map <code>RONDE enum('1','2','F')</code> as <code>@Enumerated(EnumType.ORDINAL) ToRound ronde</code>. What is stored for <code>ToRound.TWO</code>?</p>
<ol class="quiz-options">
<li><code>'2'</code>, because the ordinal of <code>TWO</code> is 2<p class="quiz-whynot">Ordinals start at 0: <code>ONE</code> is 0, <code>TWO</code> is 1.</p></li>
<li data-correct><code>'1'</code><p class="quiz-why">Hibernate writes the ordinal <code>1</code>, and MariaDB reads a number in an <code>ENUM</code> column as a 1-based index into its values.</p></li>
<li><code>'TWO'</code><p class="quiz-whynot">That is <code>EnumType.STRING</code>, which strict mode would reject.</p></li>
</ol>
<p class="quiz-explain">Neither built-in enum mapping matches values that are not Java names. An <code>AttributeConverter</code> maps each constant explicitly.</p>
</div>

### Flashcards

<div class="flashcards" data-flashcards data-front-label="Term" data-back-label="Meaning">
<div class="card"><div class="front">MariaDB <code>SET</code></div><div class="back">Any combination of listed values, returned as <code>'A,C'</code>. Map it as a <code>String</code>.</div></div>
<div class="card"><div class="front"><code>AttributeConverter&lt;X, Y&gt;</code></div><div class="back">JPA: converts an attribute to a column value and back. Not applied to <code>@Id</code> attributes.</div></div>
<div class="card"><div class="front"><code>@Embeddable</code> + <code>@EmbeddedId</code></div><div class="back">The key as one embedded object; the key class holds the column mappings. HQL: <code>w.pk.jaar</code>.</div></div>
<div class="card"><div class="front"><code>@JsonUnwrapped</code></div><div class="back">Jackson writes the fields of the annotated object directly into the parent, without a nested object.</div></div>
<div class="card"><div class="front"><code>Collectors.joining()</code></div><div class="back">Concatenates a stream of strings, with an optional separator. C#'s <code>string.Concat</code> / <code>string.Join</code>.</div></div>
<div class="card"><div class="front"><code>produces = TEXT_PLAIN_VALUE</code></div><div class="back">For endpoints that return a bare <code>String</code>; Spring writes it as is with the right content type.</div></div>
</div>

### Self-checks

<details class="qa">
<summary>Self-check: <code>getAnswerString</code> calls <code>getAnswers</code> on <code>this</code>. Which <code>@Transactional</code> is in effect during that call, and why does it work?</summary>
<div class="ans">
Only <code>getAnswerString</code>'s. Spring's transaction proxy wraps calls that come in from outside the bean; a call on <code>this</code> goes straight to the method. Since <code>getAnswerString</code> already opened a <code>transactionToR</code> transaction, <code>getFactoryR().getCurrentSession()</code> inside <code>getAnswers</code> finds that session.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<details class="qa">
<summary>Self-check: why does <code>ToRoundConverter</code> need no <code>&lt;mapping&gt;</code> line in <code>hibernate_TO.cfg.xml</code>?</summary>
<div class="ans">
It is named explicitly by <code>@Convert(converter = ToRoundConverter.class)</code>, and Hibernate creates it when it binds that field. Only a converter with <code>autoApply = true</code> has to be known up front, because Hibernate must find it without any field pointing to it.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<details class="qa">
<summary>Self-check: what would the VWO's <code>AnswerStringController</code> return if one VWO answer row held <code>'A,C'</code>?</summary>
<div class="ans">
An error. <code>Antwoorden.antwoord</code> is <code>@Enumerated(EnumType.STRING) Answer</code>, so reading the row calls <code>Answer.valueOf("A,C")</code>, which throws <code>IllegalArgumentException</code>; the query fails and the client gets a <code>500</code>.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<button type="button" data-mark-done>Mark this chapter done</button>

</div>
