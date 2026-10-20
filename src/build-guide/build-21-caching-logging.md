# 21. Caching and logging

<div class="level-tabs" data-levels>
  <button data-level="overview" aria-pressed="true">Overview</button>
  <button data-level="deep" data-short="Deep">Deep Understanding</button>
  <button data-level="drill">Drilling</button>
</div>

<div class="level overview">

Two pieces of infrastructure the VWO API sets up once and then mostly
forgets: a cache and a logger.

The cache is Ehcache 3, reached through the Java caching standard,
<dfn data-def="JSR-107 (Java Specification Request 107), javax.cache: a standard caching API (CacheManager, Cache, CachingProvider) that Ehcache, Hazelcast and others implement. Spring and Hibernate both talk to it.">JCache</dfn>.
Spring's `@Cacheable` puts method results in it, and Hibernate's second
level cache keeps entities in it between sessions. TechOlympiad caches
the contest dates and the registration fees, which change a few times a
year and are read on every page of a contest website, and lets
Hibernate cache `Scholen`. A `DELETE /api/v1/cache` endpoint, for
administrators, empties the Spring caches, like the VWO's
`CacheController`.

The logger is Log4j2, configured by a `log4j2.xml` that reads its level
and file name from `environment.properties`, so each build profile logs
differently without a second XML file. Lombok's `@Slf4j` gives a class
its logger in one annotation.

**After this chapter you can:**

- wire JCache with Ehcache in Spring XML and declare caches in `ehcache.xml`;
- put `@Cacheable` and `@CacheEvict` on the right methods, and predict their keys;
- explain why a call from inside the same class bypasses the cache;
- turn on Hibernate's second-level cache for one entity;
- switch Spring Boot from Logback to Log4j2 and read a `log4j2.xml`, lookups (its `${...}` placeholders) included.

<div class="code-compare" data-code-compare data-labels="VWO applicationContextAPI.xml|TechOlympiad applicationContextAPI.xml">

```xml
<cache:annotation-driven cache-manager="ehcacheManager"/>

<bean class="org.springframework.cache.jcache.JCacheCacheManager" id="ehcacheManager">
    <property name="cacheManager">
        <bean class="org.springframework.cache.jcache.JCacheManagerFactoryBean"/>
    </property>
</bean>
```

```xml
<cache:annotation-driven cache-manager="ehcacheManager"/>

<bean class="org.springframework.cache.jcache.JCacheCacheManager" id="ehcacheManager">
    <property name="cacheManager">
        <bean class="org.springframework.cache.jcache.JCacheManagerFactoryBean">
            <property name="cacheManagerUri" value="classpath:ehcache.xml"/>
        </bean>
    </property>
</bean>
```

</div>

The one extra property is a bug fix, explained below: without it the
VWO's `ehcache.xml` is never read.

</div>

<div class="level deep">

### Three layers of caching API

Three names show up in the configuration, one inside the other:

<div class="table-wrap">

| Layer | Class | Role |
|---|---|---|
| Spring's cache abstraction | `org.springframework.cache.CacheManager`, here `JCacheCacheManager` | What `@Cacheable` talks to. Knows nothing about Ehcache. |
| JCache (JSR-107) | `javax.cache.CacheManager`, made by `JCacheManagerFactoryBean` | The standard API. Spring and Hibernate both use it. |
| Ehcache 3 | `org.ehcache.jsr107.EhcacheCachingProvider` | The implementation, found on the classpath by `Caching.getCachingProvider()`. Reads `ehcache.xml`. |

</div>

`<cache:annotation-driven cache-manager="ehcacheManager"/>` is the XML
form of `@EnableCaching`: it registers the interceptor that makes
`@Cacheable` work and tells it which Spring `CacheManager` to use.
Because the XML defines a `CacheManager` bean, Spring Boot's own cache
auto-configuration backs off. The JCache support classes live in
`spring-context-support`, which no Spring Boot starter brings, so the
VWO lists it by hand and so will we.

In .NET terms: `IMemoryCache` is the closest thing to a Spring `Cache`,
and there is no standard layer like JCache in between. Hibernate's
second-level cache has no built-in counterpart in EF Core.

### The VWO's cache that is never configured

`JCacheManagerFactoryBean` asks the provider for a cache manager by URI.
The VWO's bean sets no URI, so it gets the provider's default one,
`urn:X-ehcache:jsr107-default-config`. For that URI Ehcache builds an
empty default configuration; only another URI is treated as the location
of an XML file. The VWO's `ehcache.xml`, which defines one cache called
`VwoParticipant`, is therefore never read.

The effect shows on the one method that uses it,
`LeerlingVWORepositoryImpl.findByUsolvitCode`:

```java
@Override
@Transactional(value = "transactionVwoR", readOnly = true)
@Cacheable(value = "VwoParticipant", unless = "#result == null")
public Optional<VwoParticipantInformation> findByUsolvitCode(String code, Configuration.VwoRole edition, byte round) {
```

On the local VWO stack, `GET /api/v1/vwo/participants/usolvit-code/{code}`
answers `500`, and the log says why:

```text
java.lang.IllegalArgumentException: Cannot find cache named 'VwoParticipant' for Builder[public java.util.Optional
be.vwo.common.restAPI.repositories.LeerlingVWORepositoryImpl.findByUsolvitCode(...)] caches=[VwoParticipant] | ...
```

Spring's cache resolver throws when a named cache does not exist; it
does not create one. TechOlympiad passes `cacheManagerUri`, and Spring
converts `classpath:ehcache.xml` into the file's real URI before Ehcache
sees it.

The VWO also ships an `ehcache-failsafe.xml` in the Ehcache 2 format
(`<ehcache><defaultCache .../>`). Ehcache 3 does not read that format,
and nothing refers to the file.

### `ehcache.xml`

An Ehcache 3 cache needs an alias, optionally key and value types, an
expiry and a size:

```xml
<cache alias="ToContestDates">
    <expiry>
        <ttl unit="hours">1</ttl>
    </expiry>
    <resources>
        <heap unit="entries">100</heap>
    </resources>
</cache>
```

<dfn data-def="Time to live: how long an entry stays valid after it was written. Ehcache also offers tti, time to idle, counted from the last read.">TTL</dfn>
bounds how stale a value can be: a date changed directly in the database
is visible within an hour at the latest. The heap limit bounds memory:
the 101st entry evicts one of the others. `heap` keeps live Java objects
in the JVM heap, by reference. The VWO's cache uses `offheap` instead,
memory outside the heap, which stores serialized copies, so every key
and value must be `Serializable`.

`key-type` and `value-type` default to `java.lang.Object`. Declaring them
makes Ehcache check every `put`, and that is easy to get wrong. The
VWO's `VwoParticipant` declares `SimpleKey` as key type, which is only
right for methods with more than one parameter; a one-parameter method
would have its argument itself as key and fail the type check. Ours
leave both out.

### What `@Cacheable` does

`@Cacheable("ToContestDates")` on a method means: compute a key from the
arguments; if the cache has an entry for it, return that without running
the method; otherwise run it and store the result. The key comes from
Spring's `SimpleKeyGenerator`:

<div class="table-wrap">

| Arguments | Key |
|---|---|
| none | `SimpleKey.EMPTY` |
| one, e.g. `findAllByYear((short) 2027)` | the argument itself, `Short 2027` |
| several, e.g. `findByUsolvitCode(code, edition, round)` | `SimpleKey` of all of them |

</div>

So a key class needs a correct `equals` and `hashCode`. The primary-key
classes have them through Lombok's `@EqualsAndHashCode`; without, every
lookup would miss. And two methods sharing one cache must not produce
equal keys: `findById(pk)` and `findAllByYear(year)` share
`ToContestDates` safely because a `WebsiteToWedstrijddatumsPK` never
equals a `Short`. Two methods taking one `short` each would overwrite
each other's entries; give them separate caches or a `key` expression.

`Optional` gets special treatment: Spring caches the value inside it, or
`null` for an empty one, and wraps it again on the way out. In
`unless = "#result == null"`, `#result` is that inner value, so an empty
result is not cached and a date added later is found at the next call.

`@CacheEvict` is the reverse: `@CacheEvict(value = "ToContestDates",
allEntries = true)` on a method that changes dates empties the cache
after the method returns. TechOlympiad has no endpoint that writes dates
or fees, so its eviction is the TTL plus the administrator's `DELETE
/cache`.

### The proxy trap, again

`@Cacheable` works the way `@Transactional` does, as chapter 10
explained: Spring replaces the bean with a proxy, and the proxy checks
the cache before calling the real object. A call that does not go
through the proxy skips the cache:

```java
@Cacheable("ToContestDates")
public Collection<? extends WebsiteToWedstrijddatums> findAllByYear(short year) { ... }

public boolean hasDates(short year) {
    return !findAllByYear(year).isEmpty(); // this.findAllByYear: no proxy, no cache
}
```

`hasDates` calls `this.findAllByYear`, the real object's method, so the
query runs every time. Call it from another bean, or move the cached
method there. The same applies to `private` methods, which a proxy cannot
intercept at all.

Two more consequences of caching by reference: the cached `Collection`
is the same object for every caller, so a caller that modifies it
modifies the cache; and an entity in the cache is detached from any
Hibernate session, so touching one of its lazy associations throws.

### Hibernate's second-level cache

Every Hibernate `Session` has its own first-level cache: within one
transaction, loading the same entity twice runs one query. The
second-level cache is shared by all sessions of a `SessionFactory`.
`hibernate_TO.cfg.xml` turns it on and points it at JCache:

```xml
<property name="hibernate.cache.use_second_level_cache">true</property>
<property name="hibernate.cache.region.factory_class">org.hibernate.cache.jcache.internal.JCacheRegionFactory</property>
<property name="hibernate.javax.cache.provider">org.ehcache.jsr107.EhcacheCachingProvider</property>
```

An entity takes part when it carries Hibernate's
`@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)`. Hibernate keeps it
in a *region*, a JCache cache named after the entity class,
`be.techolympiad.common.dbEntities.Scholen`. `session.get(Scholen.class,
id)` looks there before it queries; an HQL query still runs, but the
entities it returns are put in the region. `READ_WRITE` locks an entry
while a transaction updates it and replaces it at commit, so readers
never see a half-written school.

TechOlympiad has two session factories, `toR` and `toRW`. Both get their
cache manager from the same provider with the same URI, so they share one
`Scholen` region: a `PUT /school` through `toRW` replaces the entry that
`toR` serves to the next `GET`. Two separately configured caches would
serve the old school until the TTL ran out.

`hibernate.javax.cache.uri` points Hibernate at `ehcache.xml`, where the
region gets its limits. The VWO sets no URI, and
`missing_cache_strategy` `create` makes Hibernate create any region it
does not find, with no expiry and no size limit. VWO's entities carry no
`@Cache`, so its regions are only the two query-cache regions that
`use_query_cache` creates, and nothing calls `setCacheable(true)` on a
query. TechOlympiad copies those two settings as they are.

`DELETE /cache` only empties Spring's caches. Hibernate's regions are
emptied with `sessionFactory.getCache().evictAllRegions()`, which our
`CacheRepository` does not call; the TTL handles them.

### Logging: Log4j2 instead of Logback

Java code logs through a facade, usually
<dfn data-def="Simple Logging Facade for Java: the logging API (org.slf4j.Logger) that libraries and application code call. A binding on the classpath sends the calls to an actual logging framework.">SLF4J</dfn>,
and one binding on the classpath decides where the lines go. Spring
Boot's default is Logback, through `spring-boot-starter-logging`, which
every starter pulls in via `spring-boot-starter`. The VWO uses Log4j2:
`spring-boot-starter-log4j2` brings Log4j2 and its SLF4J binding.

Both bindings at once is a problem: SLF4J warns about multiple bindings
and picks one, and Spring Boot's logging system prefers Logback when it
finds it, ignoring `log4j2.xml`. So `spring-boot-starter-logging` has to
go. A Maven exclusion only cuts the path it is declared on, and the
logging starter arrives through `spring-boot-starter` from every other
starter. The VWO's trick is to declare `spring-boot-starter` itself, with
the exclusion: a direct declaration wins over the transitive ones (Maven
picks the nearest), so its exclusion applies everywhere. The VWO's WAR
contains no Logback jar.

`spring-boot-starter-log4j2` 2.7.18 brings Log4j 2.17.2. The VWO declares
`log4j-api`, `log4j-core` and the bindings at 2.24.3 directly, and the
direct declarations win again. It also adds `slf4j-api` 2.0.17 and
`log4j-slf4j2-impl`, the binding for SLF4J 2, next to `log4j-slf4j-impl`,
the one for SLF4J 1.7, which Spring Boot 2.7 uses. TechOlympiad stays on
SLF4J 1.7 with `log4j-slf4j-impl`, one binding, matching Spring Boot.

In .NET this is `ILogger<T>` (the facade) with a provider such as
Serilog behind it, and `appsettings.{Environment}.json` for the levels.

### Reading `log4j2.xml`

A Log4j2 configuration has appenders (where lines go), loggers (which
lines, by logger name and level) and properties:

```xml
<Root level="${bundle:environment:log4j2.logLevel}">
    <AppenderRef ref="CONSOLE"/>
    <AppenderRef ref="FILE"/>
</Root>
<Logger name="org.hibernate.SQL" level="${bundle:environment:log4j2.hibernate}"/>
```

A logger's name is usually the class name, so `org.hibernate.SQL` is one
logger and `org.hibernate` its parent. A logger without appenders of its
own sends its lines to its parent's, up to `Root`. A line is written when
its level is at least the logger's level: `TRACE` < `DEBUG` < `INFO` <
`WARN` < `ERROR`.

`${...}` is a <dfn data-def="Log4j2's ${prefix:key} substitution in configuration files: sys: system properties, env: environment variables, bundle: a ResourceBundle (a .properties file on the classpath), and more.">lookup</dfn>:

- `${sys:catalina.base}` is the system property (a JVM-wide `key=value` setting, usually passed as `-Dkey=value` on the `java` command line) Tomcat sets at startup, its instance folder. In the `tomcat:9-jdk17` image it is `/usr/local/tomcat`, so the log goes to `/usr/local/tomcat/logs`. `catalina.home` is where Tomcat is installed; `catalina.base` is where this instance keeps `conf`, `logs` and `webapps`. In the image they are the same folder.
- `${bundle:environment:log4j2.logLevel}` reads the key `log4j2.logLevel` from the resource bundle `environment`, which is `environment.properties` on the classpath: the file the build profile of chapter 6 copies. `local` logs `INFO` and Hibernate's SQL, `production` only `WARN`. One XML, one value per environment.

A lookup that finds nothing stays in the text as it is. The VWO's
repository shows what that does: its root contains a folder literally
named `${sys:catalina.base}`, with a `logs` folder and a file called
`${bundle:environment:log4j2.appName}.log`. Something ran the code
outside Tomcat (a test, a `main` from the IDE) without
`environment.properties`, and Log4j2 created the paths as written.
TechOlympiad writes `${sys:catalina.base:-.}`: after `:-` comes a default,
the current folder. An unresolved level is worse: Log4j2 cannot parse it
and falls back to `ERROR` for the root logger.

Spring Boot adds a second source of levels. The `logging.level.*` keys
in `application.properties` (the VWO's has
`logging.level.org.springframework.web=WARN`) are applied after Log4j2
has read its file.

The VWO's own `log4j2.xml` has a few things not to copy:

- Its root logger writes only to the file appender; the `CONSOLE` appender is declared and never used. Application logs are in `restapi.log` inside the container, which is why the CI pipeline of [chapter 22](build-22-shipping.md) tails that file. TechOlympiad also logs to the console, so `docker compose logs -f api` shows its lines.
- `%highlight{...}` wraps the whole layout, the file's included, so `restapi.log` is full of ANSI colour codes. Ours colours the console only.
- The file appender has two triggering policies for the same moment, a `CronTriggeringPolicy` at midnight and a `TimeBasedTriggeringPolicy` with a daily pattern. One is enough.
- `LOCALHOST`, `MANAGER` and `HOST-MANAGER` copy Tomcat's own log files. The loggers they listen to belong to Tomcat, which logs through its own JULI framework (Tomcat's variant of the JDK's
built-in `java.util.logging`), outside the web application's Log4j2, so these appenders stay empty.

### `@Slf4j`

```java
@Slf4j
public class ToScoringRepositoryImpl implements ToScoringRepository {
```

Lombok generates
`private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(ToScoringRepositoryImpl.class);`.
The logger is named after the class, so `log4j2.xml` can set its level by
package. Write messages with `{}` placeholders,
`log.info("Scored {} pupils", count)`: the string is only built when the
level is enabled, where `"Scored " + count` would be built every time. An
exception goes last and gets its stack trace printed:
`log.error("Scoring failed for {}", edition, e)`.

</div>

<div class="level drill">

### Tasks

<ul class="checklist">
<li><label><input type="checkbox"><span>pom: add <code>spring-context-support</code>, <code>hibernate-jcache</code> and <code>ehcache</code>; switch logging to Log4j2.</span></label></li>
<li><label><input type="checkbox"><span>Create <code>src/main/resources/ehcache.xml</code>.</span></label></li>
<li><label><input type="checkbox"><span>Add the cache namespace and the cache manager to <code>applicationContextAPI.xml</code>.</span></label></li>
<li><label><input type="checkbox"><span>Add the second-level cache properties to <code>hibernate_TO.cfg.xml</code> and <code>@Cache</code> to <code>Scholen</code>.</span></label></li>
<li><label><input type="checkbox"><span>Put <code>@Cacheable</code> on <code>ToContestDatesRepositoryImpl</code> and <code>RegistrationFeeRepositoryImpl</code>.</span></label></li>
<li><label><input type="checkbox"><span>Create <code>CacheRepository</code>, the <code>CacheController</code> interface and <code>v1/CacheController</code>.</span></label></li>
<li><label><input type="checkbox"><span>Create <code>src/main/resources/log4j2.xml</code> and add the <code>log4j2.*</code> keys to both environment files.</span></label></li>
<li><label><input type="checkbox"><span>Add <code>@Slf4j</code> and log lines to <code>ToScoringRepositoryImpl</code>.</span></label></li>
<li><label><input type="checkbox"><span>Build, restart and work through <em>Run it</em>.</span></label></li>
<li><label><input type="checkbox"><span>Commit: <code>git add -A &amp;&amp; git commit -m "Add caching and logging"</code>.</span></label></li>
</ul>

### The pom

`pom.xml`. The `spring-boot-starter-web` dependency gets an exclusion,
and the rest is new; `spring-context-support` takes its version from the
Spring BOM of chapter 2:

<div class="diff-view" data-diff-view>

```diff
         <dependency>
             <groupId>org.springframework.boot</groupId>
             <artifactId>spring-boot-starter-web</artifactId>
             <version>2.7.18</version>
+            <exclusions>
+                <exclusion>
+                    <groupId>org.springframework.boot</groupId>
+                    <artifactId>spring-boot-starter-logging</artifactId>
+                </exclusion>
+            </exclusions>
+        </dependency>
+        <dependency>
+            <groupId>org.springframework.boot</groupId>
+            <artifactId>spring-boot-starter</artifactId>
+            <version>2.7.18</version>
+            <exclusions>
+                <exclusion>
+                    <groupId>org.springframework.boot</groupId>
+                    <artifactId>spring-boot-starter-logging</artifactId>
+                </exclusion>
+            </exclusions>
+        </dependency>
+        <dependency>
+            <groupId>org.springframework.boot</groupId>
+            <artifactId>spring-boot-starter-log4j2</artifactId>
+            <version>2.7.18</version>
+        </dependency>
+        <dependency>
+            <groupId>org.apache.logging.log4j</groupId>
+            <artifactId>log4j-api</artifactId>
+            <version>2.24.3</version>
+        </dependency>
+        <dependency>
+            <groupId>org.apache.logging.log4j</groupId>
+            <artifactId>log4j-core</artifactId>
+            <version>2.24.3</version>
+        </dependency>
+        <dependency>
+            <groupId>org.apache.logging.log4j</groupId>
+            <artifactId>log4j-slf4j-impl</artifactId>
+            <version>2.24.3</version>
+        </dependency>
+        <dependency>
+            <groupId>org.springframework</groupId>
+            <artifactId>spring-context-support</artifactId>
+        </dependency>
+        <dependency>
+            <groupId>org.hibernate</groupId>
+            <artifactId>hibernate-jcache</artifactId>
+            <version>5.6.15.Final</version>
+        </dependency>
+        <dependency>
+            <groupId>org.ehcache</groupId>
+            <artifactId>ehcache</artifactId>
+            <version>3.10.8</version>
+            <exclusions>
+                <exclusion>
+                    <groupId>org.glassfish.jaxb</groupId>
+                    <artifactId>jaxb-runtime</artifactId>
+                </exclusion>
+            </exclusions>
         </dependency>
```

</div>

The `jaxb-runtime` exclusion is the VWO's: Ehcache asks for any 2.x
version, and `hibernate-core` already brings 2.3.1. Check the result:

```bash
mvn dependency:tree -Dincludes=ch.qos.logback
mvn dependency:tree -Dincludes=org.apache.logging.log4j
```

The first prints no dependency at all, the second only 2.24.3 versions.

### Ehcache and Spring

`src/main/resources/ehcache.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<config xmlns='http://www.ehcache.org/v3'>

    <cache alias="ToContestDates">
        <expiry>
            <ttl unit="hours">1</ttl>
        </expiry>
        <resources>
            <heap unit="entries">100</heap>
        </resources>
    </cache>

    <cache alias="RegistrationFee">
        <expiry>
            <ttl unit="hours">1</ttl>
        </expiry>
        <resources>
            <heap unit="entries">100</heap>
        </resources>
    </cache>

    <cache alias="be.techolympiad.common.dbEntities.Scholen">
        <expiry>
            <ttl unit="hours">1</ttl>
        </expiry>
        <resources>
            <heap unit="entries">100</heap>
        </resources>
    </cache>
</config>
```

The third cache is Hibernate's region for `Scholen`: its alias is the
entity's class name, because that is the region's default name.

`src/main/resources/applicationContextAPI.xml`:

<div class="diff-view" data-diff-view>

```diff
 <beans xmlns="http://www.springframework.org/schema/beans"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xmlns:context="http://www.springframework.org/schema/context"
        xmlns:tx="http://www.springframework.org/schema/tx"
+       xmlns:cache="http://www.springframework.org/schema/cache"
        xsi:schemaLocation="http://www.springframework.org/schema/beans https://www.springframework.org/schema/beans/spring-beans.xsd
                            http://www.springframework.org/schema/context https://www.springframework.org/schema/context/spring-context.xsd
-                           http://www.springframework.org/schema/tx https://www.springframework.org/schema/tx/spring-tx.xsd">
+                           http://www.springframework.org/schema/tx https://www.springframework.org/schema/tx/spring-tx.xsd
+                           http://www.springframework.org/schema/cache https://www.springframework.org/schema/cache/spring-cache.xsd">
 
     <context:component-scan base-package="be.techolympiad"/>
     <tx:annotation-driven/>
+    <cache:annotation-driven cache-manager="ehcacheManager"/>
+
+    <bean class="org.springframework.cache.jcache.JCacheCacheManager" id="ehcacheManager">
+        <property name="cacheManager">
+            <bean class="org.springframework.cache.jcache.JCacheManagerFactoryBean">
+                <property name="cacheManagerUri" value="classpath:ehcache.xml"/>
+            </bean>
+        </property>
+    </bean>
```

</div>

`cacheManagerUri` is a `java.net.URI`. Spring's `URIEditor` resolves the
`classpath:` prefix to the file's location, for example
`file:/usr/local/tomcat/webapps/techolympiad/WEB-INF/classes/ehcache.xml`.

### Hibernate

`src/main/resources/hibernate_TO.cfg.xml`, before the `<mapping>` lines:

<div class="diff-view" data-diff-view>

```diff
+    <property name="hibernate.cache.use_second_level_cache">true</property>
+    <property name="hibernate.cache.region.factory_class">org.hibernate.cache.jcache.internal.JCacheRegionFactory</property>
+    <property name="hibernate.cache.use_query_cache">true</property>
+    <property name="hibernate.javax.cache.provider">org.ehcache.jsr107.EhcacheCachingProvider</property>
+    <property name="hibernate.javax.cache.uri">ehcache.xml</property>
+    <property name="hibernate.javax.cache.missing_cache_strategy">create</property>
+
     <mapping class="be.techolympiad.common.dbEntities.Scholen"/>
```

</div>

Five lines are the VWO's; `hibernate.javax.cache.uri` is ours. Hibernate
looks the name up on the classpath itself, so it takes a plain
`ehcache.xml` without `classpath:`.

`dbEntities/Scholen.java`:

<div class="diff-view" data-diff-view>

```diff
 import lombok.Setter;
+import org.hibernate.annotations.Cache;
+import org.hibernate.annotations.CacheConcurrencyStrategy;
 
 import javax.persistence.*;
@@
 @Entity
 @Table(name = "Scholen", schema = "TechOlympiad")
+@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
```

</div>

`javax.persistence.*` also contains a type called `Cache`. A single-type
import beats an on-demand (`*`) import, so `@Cache` here is Hibernate's.

### `@Cacheable` on the repositories

`restAPI/repositories/ToContestDatesRepositoryImpl.java` (chapter 15;
the method names follow the VWO's `VwoContestDatesRepositoryImpl`, keep
yours):

<div class="diff-view" data-diff-view>

```diff
 import org.springframework.beans.factory.annotation.Autowired;
+import org.springframework.cache.annotation.Cacheable;
 import org.springframework.stereotype.Repository;
@@
     @Override
+    @Cacheable(value = "ToContestDates", unless = "#result == null")
     public Optional<WebsiteToWedstrijddatums> findById(WebsiteToWedstrijddatumsPK pk) {
         return dao.getOptional(pk);
     }
 
     @Override
+    @Cacheable("ToContestDates")
     public Collection<? extends WebsiteToWedstrijddatums> findAllByYear(short year) {
         return dao.getAllByYear(year);
     }
```

</div>

`restAPI/repositories/RegistrationFeeRepositoryImpl.java`:

<div class="diff-view" data-diff-view>

```diff
 import org.springframework.beans.factory.annotation.Autowired;
+import org.springframework.cache.annotation.Cacheable;
 import org.springframework.stereotype.Repository;
@@
     @Override
+    @Cacheable("RegistrationFee")
     public float getAmount(Configuration.ToRole edition) {
```

</div>

The key is the `ToRole` constant; the value the boxed `Float`. A missing
fee throws `NotFoundException` since chapter 18, and an exception is
never cached.

### Clearing the caches

`restAPI/repositories/CacheRepository.java`

```java
package be.techolympiad.common.restAPI.repositories;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Repository;

import java.util.Objects;

@Repository
public class CacheRepository {

    private final CacheManager cacheManager;

    @Autowired
    public CacheRepository(CacheManager cacheManager) {
        this.cacheManager = cacheManager;
    }

    public void evictAll() {
        cacheManager.getCacheNames()
                .forEach(cacheName -> Objects.requireNonNull(cacheManager.getCache(cacheName)).clear());
    }
}
```

This is the VWO's class without its `@EnableScheduling` and the
`@Scheduled(fixedRate = 1000 * 60 * 60 * 6)` method that empties every
cache every six hours: the TTL already bounds every entry. Unlike the
other repositories it is a plain class without interface, as in the VWO.
`getCacheNames()` lists the caches from `ehcache.xml`, the Hibernate
region's name included, but that entry in Spring's cache manager is an
unused copy: Hibernate's region lives in Hibernate's own cache manager.

`restAPI/controllers/CacheController.java`

```java
package be.techolympiad.common.restAPI.controllers;

import be.techolympiad.common.restAPI.repositories.CacheRepository;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;

public interface CacheController {

    CacheRepository getRepository();

    @DeleteMapping
    @Operation(summary = "Clear all caches")
    @PreAuthorize("hasAuthority('ADMIN')")
    default ResponseEntity<Void> evictAll() {
        getRepository().evictAll();
        return ResponseEntity.noContent().build();
    }
}
```

`restAPI/controllers/v1/CacheController.java`

```java
package be.techolympiad.common.restAPI.controllers.v1;

import be.techolympiad.common.restAPI.repositories.CacheRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController("cacheController.v1")
@RequestMapping(path = V1Config.BASE_URL + "/cache")
@Tag(name = "cache-controller")
@Getter
public class CacheController implements be.techolympiad.common.restAPI.controllers.CacheController {

    private final CacheRepository repository;

    @Autowired
    public CacheController(CacheRepository repository) {
        this.repository = repository;
    }
}
```

The VWO's version is `GET /evictCache`, hidden from Swagger, with bean
names `cacheEvictionController.v1` and `.v2`. A `GET` that changes state
is a trap: a browser prefetch, a crawler or a monitoring probe can
trigger it. TechOlympiad uses `DELETE` and leaves it visible, for
administrators only. The explicit name prepares for a `v2` class.

### Logging

`src/main/resources/log4j2.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<Configuration status="warn">
  <Properties>
    <Property name="logdir">${sys:catalina.base:-.}/logs</Property>
    <Property name="appName">${bundle:environment:log4j2.appName}</Property>
    <Property name="layout">%d [%t] %-5p %c.%M - %m%n</Property>
  </Properties>
  <Appenders>
    <Console name="CONSOLE" target="SYSTEM_OUT">
      <PatternLayout pattern="%highlight{${layout}}"/>
    </Console>
    <RollingFile name="FILE"
                 fileName="${logdir}/${appName}.log"
                 filePattern="${logdir}/${appName}.%d{yyyy-MM-dd}.log.gz"
                 append="true">
      <PatternLayout pattern="${layout}"/>
      <TimeBasedTriggeringPolicy/>
      <DefaultRolloverStrategy>
        <Delete basePath="${logdir}" maxDepth="1">
          <IfFileName glob="${appName}.*.log.gz"/>
          <IfAccumulatedFileCount exceeds="10"/>
        </Delete>
      </DefaultRolloverStrategy>
    </RollingFile>
  </Appenders>
  <Loggers>
    <Root level="${bundle:environment:log4j2.logLevel}">
      <AppenderRef ref="CONSOLE"/>
      <AppenderRef ref="FILE"/>
    </Root>
    <Logger name="org.hibernate.SQL" level="${bundle:environment:log4j2.hibernate}"/>
    <Logger name="org.ehcache" level="warn"/>
    <Logger name="com.mchange.v2.c3p0" level="warn"/>
  </Loggers>
</Configuration>
```

<div class="code-walk" data-code-walk>

```xml
<Configuration status="warn">                                        <!-- (1) -->
<Property name="logdir">${sys:catalina.base:-.}/logs</Property>      <!-- (2) -->
<PatternLayout pattern="%highlight{${layout}}"/>                     <!-- (3) -->
filePattern="${logdir}/${appName}.%d{yyyy-MM-dd}.log.gz"             <!-- (4) -->
<IfAccumulatedFileCount exceeds="10"/>                               <!-- (5) -->
<Logger name="org.hibernate.SQL" level="${bundle:environment:log4j2.hibernate}"/> <!-- (6) -->
```

1. The level of Log4j2's own messages about reading this file. The VWO's `info` also prints the informational ones at every start.
2. Tomcat's `catalina.base`, or the current folder when there is none.
3. `%d` date, `%t` thread, `%-5p` level padded to five, `%c.%M` logger and method, `%m%n` message and newline. Colours on the console only.
4. `TimeBasedTriggeringPolicy` rolls over when the date in this pattern changes: once a day, and the old file is gzipped.
5. Keep ten old files, delete the rest.
6. Hibernate logs every SQL statement on this logger at `DEBUG`. `local` sets it to `DEBUG`, `production` to `ERROR`. No appender here: the lines go to the root's appenders.

</div>

`%M`, the method name, makes Log4j2 compute the caller's location for
every line, which is slow. The VWO's layout has it, and for this load it
does not matter.

`environmentAPI.local.properties`, new lines:

```properties
log4j2.logLevel=INFO
log4j2.appName=techolympiad
log4j2.hibernate=DEBUG
```

`environmentAPI.prod.properties`, new lines:

```properties
log4j2.logLevel=WARN
log4j2.appName=techolympiad
log4j2.hibernate=ERROR
```

`restAPI/repositories/ToScoringRepositoryImpl.java` (chapter 16). Add
the annotation, then one `log.info` at the end of each of the three
methods; for `scoreRound`, with the `RoundResult` it returns:

<div class="diff-view" data-diff-view>

```diff
+import lombok.extern.slf4j.Slf4j;
 import org.springframework.beans.factory.annotation.Autowired;
@@
 @Repository
+@Slf4j
 public class ToScoringRepositoryImpl implements ToScoringRepository {
@@
+        log.info("Scored round {} for {}: {} pupils", result.getRound(), result.getEdition(), result.getScored());
         return result;
```

</div>

Use your own variable names; the point is one line per business action,
at `INFO`, with the numbers that matter afterwards.

### Run it

```bash
mvn -q -DskipTests -Plocal package && docker compose restart api
docker compose logs -f api
```

1. The startup lines now have our layout, `2026-10-20 09:12:44,031 [main] INFO  ...`.
   Tomcat's own lines keep Tomcat's format: those go through JULI.
2. The file exists in the container:

   ```bash
   docker exec techolympiad-api ls /usr/local/tomcat/logs
   ```

   `techolympiad.log` sits next to Tomcat's `catalina.*.log` files.
3. Log in as `admin` (chapter 20) and keep the token in `$TOKEN`. In a
   second terminal, call the round dates twice:

   ```bash
   curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:8081/techolympiad/api/v1/date/to/contest/list?year=2027"
   curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:8081/techolympiad/api/v1/date/to/contest/list?year=2027"
   ```

   The log shows one `org.hibernate.SQL` line with a `select` from
   `Website_to_wedstrijddatums`, after the first call only.
4. The same for a school: `GET /api/v1/school/1` twice, one `select`.
   Change its name with `PUT /api/v1/school` and `GET` it again: the new
   name, without a stale read, because both session factories share the
   region.
5. Empty the caches as `admin`:

   ```bash
   curl -i -X DELETE -H "Authorization: Bearer $TOKEN" http://localhost:8081/techolympiad/api/v1/cache
   ```

   `204`. Call the dates again: the `select` is back. As `teacher` the
   same `DELETE` gives `403`.
6. Score a round (`POST /api/v1/to/round/1/score?edition=JTO` as `admin`)
   and find your `log.info` line in the output, with the logger name
   `be.techolympiad.common.restAPI.repositories.ToScoringRepositoryImpl`.
7. Build with `-Pproduction` once, without starting it, and open
   `target/classes/environment.properties`: `log4j2.logLevel=WARN`. The
   same `log4j2.xml` would log a tenth of the lines.

<div class="callout danger">
<div class="callout-label">When it breaks</div>

- **`Cannot find cache named 'ToContestDates'`**: Spring's cache manager did not read `ehcache.xml`, the VWO's bug. Check `cacheManagerUri` and that the file is in `src/main/resources`.
- **`ClassCastException: Invalid key type`** from Ehcache: a cache declares `key-type`, and a method passes something else. Leave the types out.
- **No `org.hibernate.SQL` lines at all**: `log4j2.hibernate` is missing from the environment file, or the WAR was built without `-Plocal`.
- **The log level is `ERROR` whatever you set**: the `bundle:environment` lookup failed, so Log4j2 could not parse the level. There is no `environment.properties` on the classpath.
- **`SLF4J: Class path contains multiple SLF4J bindings`** and `log4j2.xml` is ignored: Logback is still there. Run the `dependency:tree` check; some starter still brings `spring-boot-starter-logging`.
- **A folder called `${sys:catalina.base}` appears in your project**: some code ran Log4j2 outside Tomcat with the VWO's configuration. Ours writes to `./logs` instead; add `/logs/` to `.gitignore` if that happens.
- **The second call still runs the query**: the cached method is called from inside its own class, or it is `private`. Only calls through the proxy are cached.
- **`CacheException: Couldn't load URI from ehcache.xml`**: Hibernate did not find the file. The value is a classpath name, without `classpath:`.

</div>

### Quiz

<div class="quiz" data-quiz>
<p class="quiz-q">The VWO's <code>JCacheManagerFactoryBean</code> has no <code>cacheManagerUri</code>. What happens to its <code>ehcache.xml</code>?</p>
<ol class="quiz-options">
<li>Ehcache finds it on the classpath by its conventional name<p class="quiz-whynot">Ehcache 3 has no such convention for JCache. The default URI means the default, empty configuration.</p></li>
<li data-correct>Nothing reads it, so <code>@Cacheable("VwoParticipant")</code> fails with <code>Cannot find cache named</code><p class="quiz-why">The provider's default URI builds an empty configuration, and Spring's cache resolver refuses unknown cache names.</p></li>
<li>Hibernate loads it, and Spring shares Hibernate's caches<p class="quiz-whynot">The VWO sets no <code>hibernate.javax.cache.uri</code> either, and the cache it needs is not a Hibernate region.</p></li>
</ol>
<p class="quiz-explain">You can see it locally: the usolvit-code lookup answers <code>500</code>. One property, <code>cacheManagerUri</code>, fixes it.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">In the same repository, <code>hasDates(year)</code> calls the <code>@Cacheable</code> method <code>findAllByYear(year)</code>. A controller calls <code>hasDates</code> ten times. How many queries run?</p>
<ol class="quiz-options">
<li>One: the first call fills the cache<p class="quiz-whynot">The cache is checked by the proxy, and a call on <code>this</code> never goes through the proxy.</p></li>
<li data-correct>Ten: the inner call bypasses the cache<p class="quiz-why">The controller enters the proxy for <code>hasDates</code>, which has no annotation; inside, <code>findAllByYear</code> is a plain method call on the real object.</p></li>
<li>None after a restart, because Ehcache persists to disk<p class="quiz-whynot">These caches are heap-only and empty after every restart.</p></li>
</ol>
<p class="quiz-explain">The same self-invocation trap as <code>@Transactional</code>. Put the cached method on another bean, or call it from outside.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">Why does the VWO declare <code>spring-boot-starter</code> itself, with only an exclusion of <code>spring-boot-starter-logging</code>?</p>
<ol class="quiz-options">
<li>Because <code>spring-boot-starter</code> is not otherwise on the classpath<p class="quiz-whynot">Every other starter depends on it.</p></li>
<li data-correct>A direct declaration wins over the transitive ones, so its exclusion removes Logback from every path<p class="quiz-why">Maven keeps the nearest declaration of an artifact. The transitive copies under the other starters are dropped, and with them their route to Logback.</p></li>
<li>To pin Spring Boot's version<p class="quiz-whynot">The starters already carry explicit versions; that is not what this entry adds.</p></li>
</ol>
<p class="quiz-explain">An exclusion on one dependency only cuts that dependency's subtree. Declaring the shared parent directly is the way to cut it everywhere.</p>
</div>

### Flashcards

<div class="flashcards" data-flashcards data-front-label="Term" data-back-label="Meaning">
<div class="card"><div class="front">JCache</div><div class="back">JSR-107, <code>javax.cache</code>: the standard caching API. Ehcache implements it; Spring and Hibernate call it.</div></div>
<div class="card"><div class="front"><code>JCacheCacheManager</code></div><div class="back">Spring's cache manager on top of a JCache <code>CacheManager</code>; what <code>@Cacheable</code> uses here.</div></div>
<div class="card"><div class="front"><code>cacheManagerUri</code></div><div class="back">Where Ehcache reads its XML. Without it, an empty default configuration.</div></div>
<div class="card"><div class="front">Cache key of a one-argument method</div><div class="back">The argument itself; for several arguments a <code>SimpleKey</code> of all.</div></div>
<div class="card"><div class="front"><code>unless = "#result == null"</code></div><div class="back">Do not cache an empty result; with <code>Optional</code>, <code>#result</code> is the value inside.</div></div>
<div class="card"><div class="front">Second-level cache region</div><div class="back">A JCache cache per cached entity, named after its class, shared by all sessions of the factory.</div></div>
<div class="card"><div class="front"><code>${bundle:environment:key}</code></div><div class="back">Log4j2 lookup in <code>environment.properties</code> on the classpath.</div></div>
<div class="card"><div class="front"><code>${sys:catalina.base}</code></div><div class="back">Tomcat's instance folder, a system property; unset outside Tomcat.</div></div>
</div>

### Self-checks

<details class="qa">
<summary>Self-check: you change round 1's date directly in the database. When does <code>GET /date/to/contest/1</code> show it?</summary>
<div class="ans">
At most an hour after the entry was cached (the TTL), or right away after an administrator calls <code>DELETE /api/v1/cache</code>. A date that was not cached yet shows at once.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<details class="qa">
<summary>Self-check: why does the same <code>log4j2.xml</code> log differently in the local and the production build?</summary>
<div class="ans">
Its levels come from <code>${bundle:environment:...}</code>, and <code>environment.properties</code> is the file the build profile copied: <code>environmentAPI.local.properties</code> or <code>environmentAPI.prod.properties</code>.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<details class="qa">
<summary>Self-check: what would go wrong if <code>toR</code> and <code>toRW</code> each had their own <code>Scholen</code> region?</summary>
<div class="ans">
An update through <code>toRW</code> would only refresh <code>toRW</code>'s region. Reads go through <code>toR</code>, whose region would keep serving the old school until its TTL ran out.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<button type="button" data-mark-done>Mark this chapter done</button>

</div>
