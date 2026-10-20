# 8. Hibernate in Spring XML

<div class="level-tabs" data-levels>
  <button data-level="overview" aria-pressed="true">Overview</button>
  <button data-level="deep" data-short="Deep">Deep Understanding</button>
  <button data-level="drill">Drilling</button>
</div>

<div class="level overview">

The database runs; now the application gets a way in. This chapter adds
Hibernate, wired the way the VWO API wires it: in a Spring XML file,
`applicationContextAPI.xml`, imported into the Spring Boot application
with one annotation. The XML declares two Hibernate session factories,
one that logs in as `to_read` and one that logs in as `to_write`, and a
<dfn data-def="The Spring object that begins, commits and rolls back transactions for one resource, here one session factory. @Transactional methods use it.">transaction manager</dfn>
for each. A second file, `hibernate_TO.cfg.xml`, holds the Hibernate
settings both factories share: the SQL
<dfn data-def="A Hibernate class that knows the SQL flavour of one database (its types, functions and paging syntax), so Hibernate generates SQL that database understands. Like the database provider choice in EF Core.">dialect</dfn>,
the <dfn data-def="JDBC (Java Database Connectivity) is Java's standard low-level database API, roughly ADO.NET. The JDBC driver is the database-specific implementation of it, like an ADO.NET provider; Hibernate uses it underneath.">JDBC driver</dfn>
and the <dfn data-def="c3p0 is an open-source JDBC connection pool library: it keeps database connections open and reuses them, like ADO.NET's built-in pooling.">c3p0</dfn> connection pool.

No entity exists yet, so nothing is queried. The result of this chapter
is a Tomcat log that shows two connection pools starting, and a MariaDB
process list with five connections per user.

**After this chapter you can:**

- read a Spring XML bean file and say what each element registers;
- explain what a `LocalSessionFactoryBean` produces and where its settings come from;
- configure a c3p0 pool through Hibernate and say which settings Hibernate translates;
- explain why the VWO API has two session factories and what actually enforces read-only access.

<div class="code-compare" data-code-compare data-labels="VWO: applicationContextAPI.xml|TechOlympiad">

```xml
<context:component-scan base-package="be.vwo"/>
<tx:annotation-driven/>
<cache:annotation-driven cache-manager="ehcacheManager"/>

<bean id="vwoRW" class="org.springframework.orm.hibernate5.LocalSessionFactoryBean">
    <property name="configLocation" value="classpath:hibernate_VWO.cfg.xml"/>
    <property name="hibernateProperties">
        <props>
            <prop key="hibernate.connection.url">${database.VWO.url}</prop>
            <prop key="hibernate.connection.username">${database.VWO.readWrite.username}</prop>
            <prop key="hibernate.connection.password">${database.VWO.readWrite.password}</prop>
        </props>
    </property>
</bean>

<bean id="transactionManagerVwoRW"
      class="org.springframework.orm.jpa.JpaTransactionManager">
    <property name="entityManagerFactory" ref="vwoRW"/>
    <qualifier value="transactionVwoRW"/>
</bean>
```

```xml
<context:component-scan base-package="be.techolympiad"/>
<tx:annotation-driven/>

<bean id="toRW" class="org.springframework.orm.hibernate5.LocalSessionFactoryBean">
    <property name="configLocation" value="classpath:hibernate_TO.cfg.xml"/>
    <property name="hibernateProperties">
        <props>
            <prop key="hibernate.connection.url">${database.TO.url}</prop>
            <prop key="hibernate.connection.username">${database.TO.readWrite.username}</prop>
            <prop key="hibernate.connection.password">${database.TO.readWrite.password}</prop>
        </props>
    </property>
</bean>

<bean id="transactionManagerToRW" class="org.springframework.orm.jpa.JpaTransactionManager">
    <property name="entityManagerFactory" ref="toRW"/>
    <qualifier value="transactionToRW"/>
</bean>
```

</div>

Both files also declare the read-only twins (`vwoR` / `toR` and
`transactionManagerVwoR` / `transactionManagerToR`). The cache lines are
for [chapter 21](roadmap.md).

</div>

<div class="level deep">

### Beans and the application context

Spring's <dfn data-def="Spring's dependency injection container: it creates the application's objects (beans), wires them together and manages their lifecycle. The counterpart of .NET's IServiceProvider plus the service registrations.">application context</dfn>
holds every object the application is built from. Each of those objects is a
<dfn data-def="An object created and managed by the Spring container, registered under a name. Singleton by default: one instance for the whole application.">bean</dfn>:
a name, a class, and instructions for building it. In .NET terms, the
context is the `IServiceProvider` and each bean definition is one
`services.Add...` call, with one difference that matters later: Spring
beans are singletons unless you say otherwise, and they are registered
under a name as well as a type.

Spring reads bean definitions from three places, and the VWO API uses
all three:

<div class="table-wrap">

| Source | Looks like | VWO example |
|---|---|---|
| Component scanning | `@Component`, `@Repository`, `@RestController` on a class | every DAO, repository and controller |
| `@Bean` methods | a method in a `@Configuration` class that returns the object | `OpenAPI vwoAPI(...)`, `GroupedOpenApi v1Api()` in `OpenApiApplication` |
| XML | `<bean id="..." class="...">` in a file the context loads | the session factories and transaction managers |

</div>

All three end up as the same thing inside the context, so a bean
declared in XML can be injected into an annotated class and the other
way around. The XML file is simply another way to write registrations.
For comparison, here is the read factory and its transaction manager as
Java configuration. It is not part of TechOlympiad: we keep the VWO's XML.

<div class="code-compare" data-code-compare data-labels="XML (what we write)|Java config (equivalent)">

```xml
<bean id="toR" class="org.springframework.orm.hibernate5.LocalSessionFactoryBean">
    <property name="configLocation" value="classpath:hibernate_TO.cfg.xml"/>
    <property name="hibernateProperties">
        <props>
            <prop key="hibernate.connection.url">${database.TO.url}</prop>
            <prop key="hibernate.connection.username">${database.TO.readonly.username}</prop>
            <prop key="hibernate.connection.password">${database.TO.readonly.password}</prop>
        </props>
    </property>
</bean>

<bean id="transactionManagerToR" class="org.springframework.orm.jpa.JpaTransactionManager">
    <property name="entityManagerFactory" ref="toR"/>
    <qualifier value="transactionToR"/>
</bean>
```

```java
@Configuration
public class HibernateConfig {

    @Bean
    public LocalSessionFactoryBean toR(@Value("${database.TO.url}") String url,
                                       @Value("${database.TO.readonly.username}") String username,
                                       @Value("${database.TO.readonly.password}") String password) {
        LocalSessionFactoryBean factory = new LocalSessionFactoryBean();
        factory.setConfigLocation(new ClassPathResource("hibernate_TO.cfg.xml"));
        Properties properties = new Properties();
        properties.setProperty("hibernate.connection.url", url);
        properties.setProperty("hibernate.connection.username", username);
        properties.setProperty("hibernate.connection.password", password);
        factory.setHibernateProperties(properties);
        return factory;
    }

    @Bean
    @Qualifier("transactionToR")
    public JpaTransactionManager transactionManagerToR(SessionFactory toR) {
        return new JpaTransactionManager(toR);
    }
}
```

</div>

`<property name="configLocation" value="...">` is a setter call:
Spring calls `setConfigLocation(...)` and converts the string
`classpath:hibernate_TO.cfg.xml` to a `Resource` on the way.
`ref="toR"` passes another bean instead of a value. The bean `id` is the
bean name, the same name a `@Bean` method gets from its method name.

### Reading applicationContextAPI.xml

<div class="code-walk" data-code-walk>

```xml
<beans xmlns="http://www.springframework.org/schema/beans"
       xmlns:context="http://www.springframework.org/schema/context"
       xmlns:tx="http://www.springframework.org/schema/tx" ...> <!-- (1) -->

    <context:component-scan base-package="be.techolympiad"/> <!-- (2) -->
    <tx:annotation-driven/> <!-- (3) -->

    <bean class="org.springframework.context.support.PropertySourcesPlaceholderConfigurer"> <!-- (4) -->
        ...
    </bean>

    <bean id="toRW" class="org.springframework.orm.hibernate5.LocalSessionFactoryBean"> <!-- (5) -->
        <property name="configLocation" value="classpath:hibernate_TO.cfg.xml"/>
        <property name="hibernateProperties"> <!-- (6) -->
            <props>
                <prop key="hibernate.connection.url">${database.TO.url}</prop>
                ...
            </props>
        </property>
    </bean>

    <bean id="transactionManagerToRW" class="org.springframework.orm.jpa.JpaTransactionManager">
        <property name="entityManagerFactory" ref="toRW"/> <!-- (7) -->
        <qualifier value="transactionToRW"/> <!-- (8) -->
    </bean>
</beans>
```

1. Each `xmlns:` prefix brings in a Spring XML namespace. `beans` holds plain bean definitions. `context` and `tx` hold shorthand elements, and each element registers a set of infrastructure beans. `xsi:schemaLocation` maps every namespace to its XSD so the parser can validate the file. Spring resolves those XSDs from its own jars, so no network is needed at startup.
2. Scans `be.techolympiad` and its subpackages for `@Component` classes. `@SpringBootApplication(scanBasePackages = "be.techolympiad.common")` already scans the same classes. Scanning a class twice yields the same bean definition, and Spring accepts that. The VWO has the same overlap (`be.vwo` here, `be.vwo.common` in `OpenApiApplication`).
3. Turns on `@Transactional`: Spring wraps every bean with `@Transactional` methods in a proxy that starts and ends transactions. [Chapter 10](build-10-dao-layer.md) opens that proxy up.
4. Resolves `${...}` placeholders in bean definitions. It reads the locations listed here plus every property source in Spring's `Environment`, which is where `environment.properties` lands through `@PropertySource`. Spring Boot registers its own placeholder configurer only when none exists, so this one replaces it.
5. A `LocalSessionFactoryBean` is a factory for the real bean, a Hibernate `SessionFactory`. The bean named `toRW` is that `SessionFactory`.
6. Properties set here are added after the config file is read, so they override it. The shared settings live in `hibernate_TO.cfg.xml`; only what differs per factory (the credentials) and what differs per environment (the URL) lives here.
7. The transaction manager gets the session factory it manages. The property is called `entityManagerFactory` because this is the JPA transaction manager. A Hibernate 5 `SessionFactory` is also a JPA `EntityManagerFactory`, so it fits.
8. A qualifier is an extra label for selecting a bean. `@Transactional("transactionToRW")` finds this manager through it.

</div>

### Where the placeholders come from

`${database.TO.url}` passes through three hands before Hibernate sees a
URL:

1. At build time, the `local` profile of [chapter 6](build-06-build-profiles.md) copies
   `environmentAPI.local.properties` to `target/classes/environment.properties`.
2. At startup, `@PropertySource("classpath:environment.properties")` on
   `OpenApiApplication` adds that file to Spring's `Environment`.
3. While loading the XML, the placeholder configurer replaces every
   `${...}` in the bean definitions with the value from the `Environment`,
   before any bean is created.

So the database a WAR talks to is decided when it is built, not when it
is deployed. A WAR built with `-Plocal` always connects to `db:3306` with
the local passwords.

### The SessionFactory and the Session

Hibernate has two central types:

<div class="table-wrap">

| Hibernate | EF Core counterpart | Lifetime | What it holds |
|---|---|---|---|
| `SessionFactory` | the `DbContextOptions` and model, plus the connection pool | one per database login, for the life of the application | the mapping metadata of every entity, the configuration, the connection pool |
| `Session` | a `DbContext` instance | one per transaction (here: per DAO call) | a unit of work: the loaded entities, their changes, one JDBC connection |

</div>

Building a `SessionFactory` is expensive: Hibernate reads every mapped
class, builds its metadata and starts the pool. That is why it is a
singleton bean. A `Session` is cheap and short-lived. You never create
one in TechOlympiad code; [chapter 10](build-10-dao-layer.md) shows how
Spring hands you the right one.

`LocalSessionFactoryBean` is a Spring
<dfn data-def="A bean that is itself a factory: Spring calls its getObject() and registers the result under the bean's name. The factory itself is reachable as &name.">FactoryBean</dfn>.
At startup, Spring does this with it:

1. Spring creates the `LocalSessionFactoryBean` and sets its properties.
2. Spring calls `afterPropertiesSet()`. In that method, the factory bean builds the `SessionFactory`.
3. Spring registers the result of `getObject()` under the bean name.

Injecting a `SessionFactory` named `toR` therefore gives you the
Hibernate object, never the Spring factory.

`LocalSessionFactoryBean` also sets
`hibernate.current_session_context_class` to Spring's own
`SpringSessionContext`. That one setting makes
`sessionFactory.getCurrentSession()` return the session of the running
Spring transaction. Because the factory bean already sets it, neither
the VWO configuration nor ours sets it.

### hibernate_TO.cfg.xml

The VWO's `hibernate_VWO.cfg.xml` holds the dialect, the driver, the pool
settings, the second-level cache settings and a `<mapping>` line for
each of its 75 entities. Ours starts with the first three groups and no
mappings; [chapter 9](build-09-first-entity.md) adds the first one.

- `hibernate.dialect` tells Hibernate which SQL to generate.
  `MariaDB103Dialect` is the one the VWO uses. Hibernate 5.6 also has a
  `MariaDB106Dialect`, but the differences do not touch anything this
  API does, and staying identical to the VWO is worth more.
- `hibernate.connection.driver_class` names the JDBC driver class,
  `org.mariadb.jdbc.Driver` from `mariadb-java-client`.

The URL, user and password are deliberately missing: they come from
`applicationContextAPI.xml`, per factory.

### The c3p0 connection pool

Opening a database connection costs a network round trip, a login and
some server memory. A
<dfn data-def="A set of open database connections that are lent out to code that needs one and returned afterwards, instead of being opened and closed every time.">connection pool</dfn>
keeps a few connections open and lends them out. In .NET the pool is
built into the ADO.NET provider and configured in the connection string
(`Maximum Pool Size=...`). Hibernate leaves it to a plug-in, and the VWO
uses <dfn data-def="An old, stable JDBC connection pool library. Hibernate integrates it through the hibernate-c3p0 module.">c3p0</dfn>.

Hibernate picks its connection provider at startup. It switches to
c3p0 when the `hibernate-c3p0` module is on the classpath and at least
one `hibernate.c3p0.*` property is set. Otherwise it falls back to a
built-in pool and logs `HHH10001002: Using Hibernate built-in connection
pool (not for production use!)`. Each `SessionFactory` gets its own pool,
so TechOlympiad runs two.

Hibernate translates six of its own property names into c3p0's names.
Every other `hibernate.c3p0.X` is handed to c3p0 as `c3p0.X` unchanged,
so it must already be c3p0's own camelCase name:

<div class="table-wrap">

| Property | c3p0 name | Ours | Meaning |
|---|---|---|---|
| `hibernate.c3p0.min_size` | `minPoolSize` | 5 | Connections kept open at all times (also the initial size) |
| `hibernate.c3p0.max_size` | `maxPoolSize` | 20 | Upper limit; a caller waits when all are lent out |
| `hibernate.c3p0.acquire_increment` | `acquireIncrement` | 5 | How many to open at once when the pool runs dry |
| `hibernate.c3p0.timeout` | `maxIdleTime` | 30 | Seconds an idle connection may sit before it is closed (the pool refills to the minimum) |
| `hibernate.c3p0.idle_test_period` | `idleConnectionTestPeriod` | 60 | Every 60 seconds, test idle connections |
| `hibernate.c3p0.preferredTestQuery` | (passed through) | `SELECT 1` | The query used for that test |
| `hibernate.c3p0.unreturnedConnectionTimeout` | (passed through) | 30 | Take back a connection that was borrowed for longer than 30 seconds |
| `hibernate.c3p0.debugUnreturnedConnectionStackTraces` | (passed through) | `true` | When that happens, log the stack trace of whoever borrowed it |

</div>

The VWO runs `min_size` 10 and `max_size` 50; TechOlympiad is smaller.
With two factories the database sees up to 40 connections from one
Tomcat, well below MariaDB's default limit of 151.

<div class="callout danger">
<div class="callout-label">Gotcha</div>

`unreturnedConnectionTimeout` 30 is a leak detector with teeth. Any
transaction that holds its connection for more than 30 seconds loses it
in the middle of its work, and the next statement fails. Nothing in
TechOlympiad comes close, but remember this setting when a long
archiving run in [chapter 17](roadmap.md) dies after exactly half a
minute.

</div>

Some lines of `hibernate_VWO.cfg.xml` do not come along:

- `hibernate.connection.pool_size` (25) configures the built-in pool. Once c3p0 is in use, nothing reads it.
- `connection.autoReconnectForPools` and `connection.is-connection-validation-required` are options of an old MySQL driver. Neither is an option of MariaDB Connector/J 3 (MariaDB's JDBC driver, the `mariadb-java-client` artifact), and c3p0's idle test already covers dropped connections.
- `hibernate.c3p0.max_statements_per_connection` is not one of the six translated names, so it reaches c3p0 as `c3p0.max_statements_per_connection`. c3p0's own name for that setting is `maxStatementsPerConnection`. We leave statement caching out.
- `hibernate.jdbc.lob.non_contextual_creation` is about creating LOBs (large objects: `BLOB` and `CLOB` columns), which no TechOlympiad column needs.
- The second-level cache properties return in [chapter 21](roadmap.md).
- The commented-out connection block at the top of the VWO file still holds a real host, user and password. It is a good example of why credentials belong in the environment files: comments are committed too.

### Transaction managers and qualifiers

Spring's `@Transactional` needs a
<dfn data-def="The Spring object that begins, commits and rolls back transactions for one resource. Spring's PlatformTransactionManager interface; here a JpaTransactionManager per session factory.">transaction manager</dfn>
to do the actual begin and commit. With two session factories there are
two, and every `@Transactional` must say which one it means. The VWO
gives each manager a qualifier and uses it in every annotation:

```java
@Transactional(value = transactionR, readOnly = true)   // transactionR = "transactionVwoR"
```

Spring resolves that value against the qualifier first and the bean
name second, so `"transactionToR"` and `"transactionManagerToR"` would
both find the same manager. The qualifier is the shorter, stable label.
An `@Transactional` without a value asks for *the* transaction manager,
finds two, and fails on the first call with
`NoUniqueBeanDefinitionException: No qualifying bean of type
'org.springframework.transaction.TransactionManager' available: expected
single matching bean but found 2`.

When a `@Transactional` method starts, `JpaTransactionManager`:

1. opens a `Session` on its factory;
2. begins a JDBC transaction on that session;
3. binds the session to the current thread.

When the method returns, the manager:

1. flushes the session's changes (sends the pending `INSERT`s and `UPDATE`s as SQL, like `SaveChanges` without the commit);
2. commits;
3. unbinds the session from the thread.

That binding is how `getCurrentSession()` finds "the current" session
in chapter 10.

### Why two factories

A read-only and a read-write factory look like double work, and they do
cost twice the connections. The VWO's reason is
<dfn data-def="Give every component only the rights it needs. Here: code paths that only read use a database account that can only read.">least privilege</dfn>
at the database level. In chapter 10, every read method uses `toR` and
every write method uses `toRW`. A read path that sends an `UPDATE`, through
a bug or an injected query, reaches MariaDB as `to_read` and is refused.

You might expect `@Transactional(readOnly = true)` to provide that
protection on its own. In this setup it does not. To begin a
transaction, Spring's `JpaTransactionManager` calls a "JPA dialect".
The manager gets Hibernate's JPA dialect only when its factory comes
from Spring's JPA factory beans. A plain Hibernate `SessionFactory`,
like ours, gets the default JPA dialect, and the default one ignores
`readOnly`. Spring still records the flag
(`TransactionSynchronizationManager.isCurrentTransactionReadOnly()`
returns `true`). But the Hibernate session flushes changes as usual,
and the JDBC connection is not marked read-only. What keeps data safe is
the database account behind `toR`.

<div class="callout note">
<div class="callout-label">Seen in a test run</div>

A method annotated `@Transactional(value = "transactionToR", readOnly = true)`
that calls `session.save(...)` on the read factory: Hibernate sends the
`INSERT` at commit, and MariaDB answers
`INSERT command denied to user 'to_read'`. Spring also has a
`HibernateTransactionManager`, which does switch the session to manual
flushing for read-only transactions. The VWO uses the JPA one.

</div>

### Why DataSourceAutoConfiguration is excluded

`OpenApiApplication` has excluded `DataSourceAutoConfiguration` since
chapter 3, and this is the chapter where it starts to matter.
`spring-boot-starter-data-jpa` puts a JDBC pool (HikariCP) and Spring
Boot's JPA support on the classpath. Without the exclusion, Spring Boot
would try to build a `DataSource` from `spring.datasource.*` properties,
find none, and stop the deployment with
`Failed to configure a DataSource: 'url' attribute is not specified and
no embedded datasource could be configured.` With the exclusion, there
is no `DataSource` bean at all. Boot's auto-configuration for Hibernate
and for Spring Data JPA (Spring's library that generates repository
classes from interfaces) needs a `DataSource` bean, so it stays off too.
Our two pools live inside the session factories, where Boot does not
look.

<div class="callout note">
<div class="callout-label">The older way, still in the VWO</div>

`be.vwo.common.VWOQueryFactory` builds a `SessionFactory` in a static
initialiser (a `static { ... }` block that runs once when the class is
loaded, like a C# static constructor) from the same `hibernate_VWO.cfg.xml`, outside Spring. Two
old DAOs (`WachtwoordenDao`, `SchoolLidmaatschapDao`) still use it, which
means the VWO runs a third pool once they are first called. Its twin
`VWOQueryFactoryReadOnly` is used nowhere. TechOlympiad has neither.

</div>

</div>

<div class="level drill">

### Before you start

You should have the end state of [chapter 7](build-07-mariadb.md): the
`db` service running and healthy, with the `to_read` and `to_write`
users. The `pom.xml` of chapters 2 to 6 has the web and Tomcat starters,
Lombok, swagger-core and springdoc, and no persistence dependencies yet.

### Tasks

<ul class="checklist">
<li><label><input type="checkbox"><span>Add the four persistence dependencies to <code>pom.xml</code> (diff below). Run <code>mvn -q dependency:tree | grep -E "hibernate|mariadb|c3p0"</code> to see what came along.</span></label></li>
<li><label><input type="checkbox"><span>Add the database keys to <code>environmentAPI.local.properties</code> and placeholders to <code>environmentAPI.prod.properties</code>.</span></label></li>
<li><label><input type="checkbox"><span>Create <code>src/main/resources/hibernate_TO.cfg.xml</code>.</span></label></li>
<li><label><input type="checkbox"><span>Create <code>src/main/resources/applicationContextAPI.xml</code>.</span></label></li>
<li><label><input type="checkbox"><span>Add <code>@ImportResource("classpath:applicationContextAPI.xml")</code> to <code>OpenApiApplication</code>.</span></label></li>
<li><label><input type="checkbox"><span>Build and restart: <code>mvn -q -DskipTests -Plocal package &amp;&amp; docker compose restart api</code>.</span></label></li>
<li><label><input type="checkbox"><span>Read the Hibernate lines in the Tomcat log and find which user each pool logs in as.</span></label></li>
<li><label><input type="checkbox"><span>Count the pooled connections per user in MariaDB.</span></label></li>
<li><label><input type="checkbox"><span>Break it on purpose once: change <code>database.TO.readonly.password</code> to something wrong, rebuild, restart, and read the error. Put it back.</span></label></li>
<li><label><input type="checkbox"><span>Commit: <code>git add -A &amp;&amp; git commit -m "Wire Hibernate in Spring XML"</code>.</span></label></li>
</ul>

### The dependencies

`pom.xml`, at the end of `<dependencies>`:

<div class="diff-view" data-diff-view>

```diff
+        <dependency>
+            <groupId>org.springframework.boot</groupId>
+            <artifactId>spring-boot-starter-data-jpa</artifactId>
+            <version>2.7.18</version>
+        </dependency>
+        <dependency>
+            <groupId>org.hibernate</groupId>
+            <artifactId>hibernate-core</artifactId>
+            <version>5.6.15.Final</version>
+        </dependency>
+        <dependency>
+            <groupId>org.hibernate</groupId>
+            <artifactId>hibernate-c3p0</artifactId>
+            <version>5.6.15.Final</version>
+        </dependency>
+        <dependency>
+            <groupId>org.mariadb.jdbc</groupId>
+            <artifactId>mariadb-java-client</artifactId>
+            <version>3.5.3</version>
+        </dependency>
     </dependencies>
```

</div>

The starter brings `spring-orm` (`LocalSessionFactoryBean`,
`JpaTransactionManager`), `spring-data-jpa` (the `Repository` marker of
[chapter 11](build-11-repository-controller.md)) and Hibernate itself.
Declaring `hibernate-core` again pins the version the VWO pins. It is the
same 5.6.15 the starter would pick. The VWO also declares
`hibernate-entitymanager`, which since Hibernate 5.2 is an empty
artifact pointing at `hibernate-core`, so we skip it.

### The environment files

`src/main/resources/environmentAPI.local.properties`:

<div class="diff-view" data-diff-view>

```diff
 application-description=TechOlympiad API
+database.TO.url=jdbc:mariadb://db:3306/TechOlympiad
+database.TO.readonly.username=to_read
+database.TO.readonly.password=readpass
+database.TO.readWrite.username=to_write
+database.TO.readWrite.password=writepass
```

</div>

`src/main/resources/environmentAPI.prod.properties`:

<div class="diff-view" data-diff-view>

```diff
 application-description=TechOlympiad API
+database.TO.url=jdbc:mariadb://CHANGE_ME:3306/TechOlympiad
+database.TO.readonly.username=CHANGE_ME
+database.TO.readonly.password=CHANGE_ME
+database.TO.readWrite.username=CHANGE_ME
+database.TO.readWrite.password=CHANGE_ME
```

</div>

The key names copy the VWO's (`database.VWO.readonly.username`,
`database.VWO.readWrite.password`, ...) with `TO` in place of `VWO`,
including the mixed `readonly` / `readWrite` spelling.

### The Hibernate configuration

`src/main/resources/hibernate_TO.cfg.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE hibernate-configuration SYSTEM "hibernate-configuration-3.0.dtd">
<hibernate-configuration>
    <session-factory>
        <property name="hibernate.dialect">org.hibernate.dialect.MariaDB103Dialect</property>
        <property name="hibernate.connection.driver_class">org.mariadb.jdbc.Driver</property>

        <property name="hibernate.c3p0.preferredTestQuery">SELECT 1</property>
        <property name="hibernate.c3p0.unreturnedConnectionTimeout">30</property>
        <property name="hibernate.c3p0.debugUnreturnedConnectionStackTraces">true</property>

        <property name="hibernate.c3p0.min_size">5</property>
        <property name="hibernate.c3p0.max_size">20</property>
        <property name="hibernate.c3p0.acquire_increment">5</property>
        <property name="hibernate.c3p0.idle_test_period">60</property>
        <property name="hibernate.c3p0.timeout">30</property>
    </session-factory>
</hibernate-configuration>
```

The `DOCTYPE` line is the VWO's. Hibernate resolves the DTD from its own
jar, so the file loads without network access.

### The Spring XML

`src/main/resources/applicationContextAPI.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xmlns:context="http://www.springframework.org/schema/context"
       xmlns:tx="http://www.springframework.org/schema/tx"
       xsi:schemaLocation="http://www.springframework.org/schema/beans https://www.springframework.org/schema/beans/spring-beans.xsd
                           http://www.springframework.org/schema/context https://www.springframework.org/schema/context/spring-context.xsd
                           http://www.springframework.org/schema/tx https://www.springframework.org/schema/tx/spring-tx.xsd">

    <context:component-scan base-package="be.techolympiad"/>
    <tx:annotation-driven/>

    <bean class="org.springframework.context.support.PropertySourcesPlaceholderConfigurer">
        <property name="locations">
            <list>
                <value>classpath:application.properties</value>
            </list>
        </property>
    </bean>

    <bean id="toRW" class="org.springframework.orm.hibernate5.LocalSessionFactoryBean">
        <property name="configLocation" value="classpath:hibernate_TO.cfg.xml"/>
        <property name="hibernateProperties">
            <props>
                <prop key="hibernate.connection.url">${database.TO.url}</prop>
                <prop key="hibernate.connection.username">${database.TO.readWrite.username}</prop>
                <prop key="hibernate.connection.password">${database.TO.readWrite.password}</prop>
            </props>
        </property>
    </bean>

    <bean id="toR" class="org.springframework.orm.hibernate5.LocalSessionFactoryBean">
        <property name="configLocation" value="classpath:hibernate_TO.cfg.xml"/>
        <property name="hibernateProperties">
            <props>
                <prop key="hibernate.connection.url">${database.TO.url}</prop>
                <prop key="hibernate.connection.username">${database.TO.readonly.username}</prop>
                <prop key="hibernate.connection.password">${database.TO.readonly.password}</prop>
            </props>
        </property>
    </bean>

    <bean id="transactionManagerToR" class="org.springframework.orm.jpa.JpaTransactionManager">
        <property name="entityManagerFactory" ref="toR"/>
        <qualifier value="transactionToR"/>
    </bean>

    <bean id="transactionManagerToRW" class="org.springframework.orm.jpa.JpaTransactionManager">
        <property name="entityManagerFactory" ref="toRW"/>
        <qualifier value="transactionToRW"/>
    </bean>

</beans>
```

Three VWO details are left out on purpose:

- The VWO's schema locations point at versioned files such as
  `spring-beans-4.0.xsd`. Spring 5 maps every version to its current
  schema, so the unversioned names say what actually happens.
- The VWO declares a `DeviceResolverHandlerInterceptor` bean (from the
  old Spring Mobile library). It never adds that bean to Spring MVC's
  interceptor list (code that runs around controller calls, like an MVC
  action filter), so the bean never runs.
- The cache lines wait for chapter 21.

### The application class

`src/main/java/be/techolympiad/common/restAPI/OpenApiApplication.java`:

<div class="diff-view" data-diff-view>

```diff
 import org.springframework.context.annotation.Bean;
+import org.springframework.context.annotation.ImportResource;
 import org.springframework.context.annotation.PropertySource;
@@
 @OpenAPIDefinition
 @SpringBootApplication(exclude = {DataSourceAutoConfiguration.class}, scanBasePackages = "be.techolympiad.common")
 @PropertySource("classpath:environment.properties")
 @PropertySource("classpath:api.properties")
+@ImportResource("classpath:applicationContextAPI.xml")
 public class OpenApiApplication extends SpringBootServletInitializer {
```

</div>

### Run it

```bash
mvn -q -DskipTests -Plocal package && docker compose restart api
docker compose logs -f api | grep -E "HHH|Deployment of"
```

Each factory logs its own block, the read-write one first because it is
declared first:

```text
HHH000412: Hibernate ORM core version 5.6.15.Final
HHH010002: C3P0 using driver: org.mariadb.jdbc.Driver at URL: jdbc:mariadb://db:3306/TechOlympiad
HHH10001001: Connection properties: {password=****, user=to_write}
HHH000400: Using dialect: org.hibernate.dialect.MariaDB103Dialect
HHH010002: C3P0 using driver: org.mariadb.jdbc.Driver at URL: jdbc:mariadb://db:3306/TechOlympiad
HHH10001001: Connection properties: {password=****, user=to_read}
HHH000400: Using dialect: org.hibernate.dialect.MariaDB103Dialect
Deployment of web application archive [/usr/local/tomcat/webapps/techolympiad.war] has finished in [...] ms
```

Each real line starts with a timestamp and a logger name. A few other
`HHH` lines appear in between, such as the one about the JTA platform.
JTA is the Java Transaction API for distributed transactions, like
`System.Transactions`, and this API does not use it.

Now ask MariaDB who is connected:

```bash
docker exec techolympiad-db mariadb -uroot -pdevpass -e \
  "SELECT user, COUNT(*) FROM information_schema.PROCESSLIST GROUP BY user"
```

```text
user      COUNT(*)
root      1
to_read   5
to_write  5
```

Five connections per pool, the `min_size`, and one for your own query.
The Swagger UI still shows `GET /api/v1/hello`, which still answers.

<div class="callout danger">
<div class="callout-label">When it breaks</div>

- **`Failed to configure a DataSource: 'url' attribute is not specified`**: the `exclude = {DataSourceAutoConfiguration.class}` is missing from `@SpringBootApplication`.
- **`Could not resolve placeholder 'database.TO.url'`**: the key is missing or misspelled in the environment file, or the WAR was built without `-Plocal` and holds an old `environment.properties`. Check with `unzip -p target/techolympiadAPI.war WEB-INF/classes/environment.properties`.
- **`Access denied for user 'to_read'@'172...' (using password: YES)`**: wrong password in the environment file, or a database volume from before chapter 7's `02-users.sql`. Compare with `02-users.sql`; if in doubt, `docker compose down -v` and `up -d`.
- **The deployment hangs for about 30 seconds, then fails with a connection error mentioning `db`**: the database is not running or not reachable. c3p0 retries 30 times, one second apart, before giving up. Check `docker compose ps`.
- **`HHH10001002: Using Hibernate built-in connection pool`** instead of the `C3P0 using driver` line: `hibernate-c3p0` is not in the WAR. Check the dependency.
- **`HHH010003: JDBC Driver class not found: org.mariadb.jdbc.Driver`**: `mariadb-java-client` is missing.
- **`cvc-elt.1.a: Cannot find the declaration of element 'beans'`** or a similar `cvc-` error: a typo in a namespace URI or in `xsi:schemaLocation`.

</div>

### Quiz

<div class="quiz" data-quiz>
<p class="quiz-q">A DAO method annotated <code>@Transactional(value = "transactionToR", readOnly = true)</code> accidentally calls <code>session.update(school)</code> on the read factory. What stops the change?</p>
<ol class="quiz-options">
<li><code>readOnly = true</code>: Spring makes the session refuse writes<p class="quiz-whynot">With a plain <code>SessionFactory</code>, <code>JpaTransactionManager</code> uses its default JPA dialect, which ignores <code>readOnly</code>. Hibernate flushes the update as usual.</p></li>
<li>Hibernate, because the factory is called <code>toR</code><p class="quiz-whynot">Bean names mean nothing to Hibernate. Both factories are built from the same configuration file.</p></li>
<li data-correct>MariaDB: the read factory logs in as <code>to_read</code>, which has only <code>SELECT</code><p class="quiz-why">The <code>UPDATE</code> is sent at commit and refused by the server with "UPDATE command denied".</p></li>
</ol>
<p class="quiz-explain">This is the reason for two factories. The guarantee lives in the database account, where no Java bug can switch it off.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">Where does the value for <code>${database.TO.url}</code> in <code>applicationContextAPI.xml</code> come from at runtime?</p>
<ol class="quiz-options">
<li>From <code>application.properties</code>, the location listed in the placeholder configurer<p class="quiz-whynot">That file is searched too, but it holds no database keys.</p></li>
<li data-correct>From <code>environment.properties</code>, copied at build time by the Maven profile and added to the Environment by <code>@PropertySource</code><p class="quiz-why">The placeholder configurer consults Spring's Environment as well as its own locations.</p></li>
<li>From an environment variable set in <code>docker-compose.yml</code><p class="quiz-whynot">The <code>api</code> service sets only <code>TZ</code>. The URL is baked into the WAR when it is built.</p></li>
</ol>
<p class="quiz-explain">Which database a WAR uses is decided by the profile it was built with. That is why the VWO's deploy profiles both build and copy.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">You inject <code>SessionFactory toR</code> somewhere. Which object do you get?</p>
<ol class="quiz-options">
<li>The <code>LocalSessionFactoryBean</code><p class="quiz-whynot">That is the factory bean, reachable only as <code>&amp;toR</code>.</p></li>
<li data-correct>The Hibernate <code>SessionFactory</code> the factory bean built<p class="quiz-why">For a <code>FactoryBean</code>, Spring registers the result of <code>getObject()</code> under the bean name.</p></li>
<li>A new <code>Session</code><p class="quiz-whynot">Sessions are per transaction and come from <code>getCurrentSession()</code>, not from injection.</p></li>
</ol>
<p class="quiz-explain">The factory bean pattern lets Spring configure an object it cannot construct itself, here a Hibernate object built through Hibernate's own bootstrap API.</p>
</div>

### Flashcards

<div class="flashcards" data-flashcards data-front-label="Term" data-back-label="Meaning">
<div class="card"><div class="front">Bean</div><div class="back">An object managed by the Spring container, with a name and a type. Singleton by default.</div></div>
<div class="card"><div class="front"><code>@ImportResource</code></div><div class="back">Loads bean definitions from an XML file into an annotation-configured context.</div></div>
<div class="card"><div class="front"><code>LocalSessionFactoryBean</code></div><div class="back">Spring factory bean that builds a Hibernate <code>SessionFactory</code> from a config file plus extra properties.</div></div>
<div class="card"><div class="front"><code>SessionFactory</code></div><div class="back">Hibernate's expensive, application-wide object: mappings, configuration and the connection pool. One per database login.</div></div>
<div class="card"><div class="front"><code>Session</code></div><div class="back">Hibernate's unit of work with one connection. One per transaction. The counterpart of a <code>DbContext</code> instance.</div></div>
<div class="card"><div class="front">c3p0</div><div class="back">The JDBC connection pool behind each session factory, enabled by any <code>hibernate.c3p0.*</code> property plus the <code>hibernate-c3p0</code> module.</div></div>
<div class="card"><div class="front"><code>&lt;qualifier value="transactionToR"/&gt;</code></div><div class="back">Extra label on a bean. <code>@Transactional("transactionToR")</code> selects the transaction manager by it.</div></div>
<div class="card"><div class="front"><code>JpaTransactionManager</code></div><div class="back">Begins and commits transactions on one factory and binds the session to the thread, so <code>getCurrentSession()</code> finds it.</div></div>
</div>

### Self-checks

<details class="qa">
<summary>Self-check: the XML scans <code>be.techolympiad</code> and <code>@SpringBootApplication</code> scans <code>be.techolympiad.common</code>. Does every DAO end up registered twice?</summary>
<div class="ans">
No. Both scans produce the same bean name for the same class, and Spring treats a second, identical definition from scanning as already registered. There is one instance of each bean.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<details class="qa">
<summary>Self-check: why are the URL, user and password not in <code>hibernate_TO.cfg.xml</code>?</summary>
<div class="ans">
The config file is shared by both factories and by every environment. The credentials differ per factory and the URL differs per environment, so they come from the environment properties through the <code>hibernateProperties</code> of each <code>LocalSessionFactoryBean</code>, which override the file.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<details class="qa">
<summary>Self-check: the process list shows exactly 5 connections for each user, even though nothing has queried anything. Why 5, and why already?</summary>
<div class="ans">
<code>hibernate.c3p0.min_size</code> is 5, and Hibernate also uses it as c3p0's initial pool size. Hibernate takes a connection while building the factory (to read the database's metadata), which starts the pool at its initial size.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<button type="button" data-mark-done>Mark this chapter done</button>

</div>
