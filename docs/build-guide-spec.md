# Build guide spec: TechOlympiad's final code

The single source of truth for every name, path, port and signature the
build-guide chapters use. Chapters introduce these pieces gradually, but a
name never changes between chapters. If a chapter needs something not
listed here, add it here first.

VWO paths below are relative to
`~/Coding/api copy for local learn/src/main/java/be/vwo/common` unless noted.

## Project

- Folder and git repo: `~/Coding/techolympiad` (created in chapter 1, with `mise.toml` pinning `java = "temurin-17.0.20+8"`, `maven = "3.9.16"`, and a `.gitignore` with `/target/`, `/.idea`, `*.iml`).
- One commit per chapter, short subject, e.g. `Add the Maven WAR project`.
- `pom.xml`: `groupId` `be.techolympiad`, `artifactId` `techolympiadAPI`, `version` `0.1.0`, `packaging` `war`. No parent pom (VWO's parent `pom-userProperties.xml` only holds deploy-server properties; chapter 22 explains it). Build output: `target/techolympiadAPI.war`.
- Versions copied from the VWO `pom.xml`: Spring Boot 2.7.18 starters (web, tomcat as `provided`, validation, security, data-jpa, log4j2, with `spring-boot-starter-logging` excluded), springdoc-openapi-ui 1.8.0, hibernate-core / hibernate-c3p0 / hibernate-jcache 5.6.15.Final, ehcache 3.10.8, mariadb-java-client 3.5.3, lombok 1.18.38 (`provided`), jjwt 0.9.1, commons-lang3 3.17.0, commons-collections4 4.4. `dependencyManagement` imports `org.springframework:spring-framework-bom:5.3.39` (Boot 2.7.18 alone would give Spring 5.3.31; VWO pins 18 modules by hand). `io.swagger.core.v3:swagger-core:2.2.30` before springdoc, as VWO. `<finalName>techolympiadAPI</finalName>`, UTF-8 `sourceEncoding`. Logback stays until ch 21, which excludes `spring-boot-starter-logging` and adds the log4j2 starter. No `spring-boot-maven-plugin`. Plugins: maven-compiler-plugin 3.14.0 (`<release>17</release>`, `-proc:full`), maven-war-plugin 3.3.2 (`failOnMissingWebXml` false), properties-maven-plugin 1.1.0 (reads `src/main/resources/api.properties` at `initialize`), maven-antrun-plugin 3.1.0 (profiles, chapter 6).
- Folder layout:

```text
techolympiad/
  mise.toml  .gitignore  pom.xml  ant.xml  docker-compose.yml  Dockerfile (ch 22)  .releaserc.json (ch 22)  .gitlab-ci.yml (ch 22, read-only comparison)
  db/initdb/01-schema.sql  02-users.sql  03-seed.sql
  src/main/java/be/techolympiad/common/...
  src/main/resources/api.properties  application.properties  environmentAPI.local.properties  environmentAPI.prod.properties
                     applicationContextAPI.xml  hibernate_TO.cfg.xml  ehcache.xml (ch 21)  log4j2.xml (ch 21)
  src/main/webapp/WEB-INF/web.xml   (near-empty, like VWO's)
```

## Running locally

- `docker-compose.yml` in the repo root, two services:
  - `db`: `mariadb:11.8`, container `techolympiad-db`, `MARIADB_ROOT_PASSWORD: devpass`, `TZ: Europe/Brussels`, port `127.0.0.1:3308:3306`, volume `to-data:/var/lib/mysql`, `./db/initdb:/docker-entrypoint-initdb.d:ro`, healthcheck `healthcheck.sh --connect --innodb_initialized` (added in chapter 7).
  - `api`: `tomcat:9-jdk17`, container `techolympiad-api`, `TZ: Europe/Brussels`, port `8081:8080`, volume `./target/techolympiadAPI.war:/usr/local/tomcat/webapps/techolympiad.war:ro`, `depends_on: db: condition: service_healthy` (from chapter 7). Added in chapter 4.
- Context path: `/techolympiad` (the WAR is renamed at deploy time, exactly like VWO's `restAPI.war` → `database.war`).
- Build: `mvn -q -DskipTests -Plocal package` (profile `local` from chapter 6; before that plain `mvn package`).
- Restart after a build: `docker compose restart api`. Logs: `docker compose logs -f api`.
- Ports 8080 and 3307 belong to the VWO local stack; never use them.
- Swagger UI: `http://localhost:8081/techolympiad/public/swagger-ui.html`. API docs JSON: `/techolympiad/v3/api-docs`.

## Database

- Database `TechOlympiad`, created in `01-schema.sql` with `utf8mb4`.
- Two DB users, like VWO's readonly and readWrite users, in `02-users.sql`: `to_read` / `readpass` (SELECT) and `to_write` / `writepass` (SELECT, INSERT, UPDATE, DELETE) on `TechOlympiad.*`.
- Fictional seed data only (`03-seed.sql`): 4 schools, 5 teachers, responsables, registrations for 2027, an answer key, cut-offs and round dates for 2027, some round 1 pupils, and a few 2026 rows in the history table. Never real VWO data.
- School year: `JAAR smallint`, the year the school year ends in. 2026-2027 is `2027`.
- Tables (Dutch, UPPER_SNAKE columns), introduced in the chapter in brackets:

| Table | Columns | Key | Ch |
|---|---|---|---|
| `Scholen` | `SCHOOL_ID smallint`, `INSTITUUT varchar(100)`, `STRAAT varchar(100)`, `POSTCODE smallint`, `GEMEENTE varchar(50)`, `PROVINCIE tinyint` | `SCHOOL_ID` | 7 |
| `Persoon` | `PERSOON_ID smallint AUTO_INCREMENT`, `NAAM`, `VOORNAAM`, `EMAIL varchar(100) UNIQUE`, `GENDER enum('M','V','X')` | `PERSOON_ID` | 7 |
| `Functies` | `PERSOON_ID smallint`, `SCHOOL_ID smallint`, `FUNCTIE enum('JTO','STO')` | PK(`PERSOON_ID`,`SCHOOL_ID`,`FUNCTIE`), FKs to `Persoon`, `Scholen` | 7 |
| `Wedstrijdinfo_to` | `JAAR smallint`, `SCHOOL_ID smallint`, `EDITIE enum('JTO','STO')`, `DIGITALE_DEELNAME tinyint(1)` | PK(`JAAR`,`SCHOOL_ID`,`EDITIE`) | 7 |
| `Inschrijvingsgeld` | `EDITIE enum('JTO','STO')`, `BEDRAG decimal(4,2)` | `EDITIE` | 7 |
| `Leerling_eerste_ronde` | `PERSOON_ID mediumint AUTO_INCREMENT`, `DEELNEMERSNUMMER int UNIQUE`, `SCHOOL_ID smallint`, `NAAM`, `VOORNAAM`, `GENDER enum('M','V','X')`, `LEERJAAR tinyint`, `ROL enum('JTO','STO')`, `RESULTAAT tinyint NULL`, `ANTWOORDEN char(30) NULL`, `INSCHRIJFDATUM datetime DEFAULT current_timestamp()` | `PERSOON_ID` | 7 |
| `Leerling_tweede_ronde` | `PERSOON_ID mediumint`, `RESULTAAT tinyint NULL`, `ANTWOORDEN char(30) NULL` | `PERSOON_ID` | 7 |
| `Leerling_finale` | `PERSOON_ID mediumint`, `VRAAG1`..`VRAAG4 tinyint NULL` | `PERSOON_ID` | 7 |
| view `Leerling_tweede_ronde_full` | round 1 columns + `RESULTAAT_TWEEDE_RONDE`, `ANTWOORDEN_TWEEDE_RONDE` | view | 7 |
| `Antwoorden` | `JAAR smallint`, `EDITIE enum('JTO','STO')`, `RONDE tinyint`, `VRAAG tinyint`, `ANTWOORD set('A','B','C','D','E')` | PK(all but `ANTWOORD`) | 7 |
| `Cesuren` | `JAAR`, `EDITIE`, `RONDE tinyint`, `CESUUR tinyint` | PK(`JAAR`,`EDITIE`,`RONDE`) | 7 |
| `Website_to_wedstrijddatums` | `JAAR smallint`, `RONDE enum('1','2','F')`, `DATUM date`, `UUR time` | PK(`JAAR`,`RONDE`) | 7 |
| `Historiek_leerling_eerste_ronde` | `JAAR year(4)` + every `Leerling_eerste_ronde` column | PK(`JAAR`,`PERSOON_ID`) | 7 |
| `API_user` | `id int AUTO_INCREMENT`, `user varchar(16) UNIQUE`, `password varchar(72)` (bcrypt), `email varchar(100) UNIQUE`, `last_login datetime NULL` | `id` | 20 (schema file gets them in ch 20) |
| `API_user_roles` | `user_id int`, `role enum('USER','ADMIN')` | PK(both), FK to `API_user` | 20 |

All tables except `API_user*` are in `01-schema.sql` from chapter 7, so the
schema is designed once (as in the design page) and the Java side catches up
chapter by chapter. Chapter 20 adds the `API_user*` tables and a seeded `admin`
(ADMIN+USER) and `teacher` (USER) with bcrypt hashes; the chapter shows how
to generate a hash.

## Java

Base package `be.techolympiad.common` (VWO: `be.vwo.common`).

### Configuration and helpers

- `Configuration` (final class of nested enums and constants, like VWO's): `enum ToRole { JTO, STO }`, `enum ToRound { ONE('1'), TWO('2'), FINAL('F') }` with a `char code` and `fromCode`, `enum Gender { M, V, X }`, `enum ApiRole { USER, ADMIN }` (ch 20), `int NUMBER_OF_QUESTIONS = 30`.
- `ToRoleConverter implements Converter<String, ToRole>` (case-insensitive request params), registered as a `@Component` (VWO: `VwoRoleConverter`). Ch 12.
- `General.getCurrentSchoolYear()` returns `Short`: the current year, plus one from 1 September on (VWO: `General.getCurrentSchoolYear`). Ch 13.

### Application and web

- `restAPI.OpenApiApplication`: `@OpenAPIDefinition`, `@SpringBootApplication(exclude = {DataSourceAutoConfiguration.class}, scanBasePackages = "be.techolympiad.common")`, `@PropertySource("classpath:environment.properties")`, `@PropertySource("classpath:api.properties")`, `@ImportResource("classpath:applicationContextAPI.xml")` (from ch 8), extends `SpringBootServletInitializer`, `main` + `configure`. Beans: `OpenAPI toAPI(...)` (title and description from `${application-description}`, version from `${apiPomVersion}`, servers `/` "current" then `/techolympiad` "local" in VWO's order, the reader picks "local" in Swagger (ch 5 explains why "current" fails); VWO uses `@Value("1")` as version and never uses `apiPomVersion`), `GroupedOpenApi v1Api()` (`/api/v1/**`), `GroupedOpenApi v2Api()` (ch 19), bearer security scheme `"Bearer oAuth Token"` (ch 20). The `@PropertySource("classpath:environment.properties")` line arrives in ch 6; ch 3 starts with `api.properties` only.
- `api.properties`: `apiPomVersion=0.1.0`. `application.properties`: springdoc settings copied from VWO (`springdoc.swagger-ui.path=/public/swagger-ui.html`, sorters, `docExpansion=none`), `spring.main.allow-bean-definition-overriding=true`.
- `environmentAPI.local.properties` / `.prod.properties` (ch 6, DB keys from ch 8): `database.TO.url=jdbc:mariadb://db:3306/TechOlympiad`, `database.TO.readonly.username/password`, `database.TO.readWrite.username/password`, `application-description=TechOlympiad API`, `jwt.secret=...` (ch 20), `log4j2.logLevel`, `log4j2.appName=techolympiad` (ch 21). Prod file holds placeholders only, never real secrets. VWO commits both env files with real credentials and ships them in every WAR; ch 6 says so as a thing not to copy.
- `ant.xml` (ch 6): `copy-properties` macro and targets `properties-APIlocal` / `properties-APIprod`, copying `environmentAPI.<env>.properties` to `${project.build.outputDirectory}/environment.properties`. Profiles `local` and `production` in the pom run them at `compile`. VWO has four profiles (`dev`, `production`, `gitlab-dev`, `gitlab-prod`). No deploy targets (VWO's `api-dev`/`api-production` scp to servers; ch 6 and 22 explain why we skip them, and why the VWO's `-Pdev` must never be used locally).
- `controllers/v1/V1Config` (`BASE_URL = "/api/v1"`), `controllers/v2/V2Config` (`"/api/v2"`, ch 19). No `/restapi` alias (VWO legacy, mentioned only).
- `controllers/v1/HelloController` at `GET /api/v1/hello` returning `"Hello world"` (ch 5), deleted in ch 11.
- `restAPI.ErrorAdvice` (`@RestControllerAdvice`, ch 18) plus exceptions in `restAPI`: `NotFoundException` (404), `RoundClosedException` (409). Handles `javax.validation.ConstraintViolationException` and `MethodArgumentNotValidException` (400), Hibernate `ConstraintViolationException` (409).

### Spring XML and Hibernate (ch 8)

- `applicationContextAPI.xml`: `context:component-scan base-package="be.techolympiad"`, `tx:annotation-driven`, `cache:annotation-driven cache-manager="ehcacheManager"` + `JCacheCacheManager` bean (ch 21), `PropertySourcesPlaceholderConfigurer` for `classpath:application.properties`, two `LocalSessionFactoryBean`s `toRW` and `toR` (`configLocation` `classpath:hibernate_TO.cfg.xml`, url/username/password from `${database.TO...}`), and `JpaTransactionManager`s `transactionManagerToR` / `transactionManagerToRW` with qualifiers `transactionToR` / `transactionToRW`.
- `hibernate_TO.cfg.xml`: `MariaDB103Dialect`, `org.mariadb.jdbc.Driver`, c3p0 settings copied from VWO (min 5, max 20 for us), `current_session_context_class` as VWO has it, second-level cache properties (ch 21), and one `<mapping class="..."/>` per entity, added chapter by chapter.

### Entities (`dbEntities`)

Lombok `@Getter @Setter @NoArgsConstructor`, `implements Serializable`, `@Entity @Table(name = "...", schema = "TechOlympiad")`, Jackson `@JsonProperty` English names (with a Dutch `@JsonAlias` where VWO has one), Swagger `@Schema(name = "...")`. Composite keys use `@IdClass` with a `*PK` class (`Serializable`, `equals`/`hashCode`, Lombok `@EqualsAndHashCode`).

| Entity | Table | JSON name | Notes | Ch |
|---|---|---|---|---|
| `Scholen` | `Scholen` | `School` | `schoolId` Short → `id` | 9 |
| `Persoon` | `Persoon` | `Person` | `@ColumnTransformer(write = "LOWER(?)")` on email | 12 |
| `Functies` + `FunctiesPK` | `Functies` | `Function` | `@Enumerated(EnumType.STRING) ToRole functie` | 12 |
| `WedstrijdinfoTo` + `WedstrijdinfoToPK` | `Wedstrijdinfo_to` | `ToParticipation` | `jaar`, `schoolId`, `editie`, `digitaleDeelname` | 13 |
| `Inschrijvingsgeld` | `Inschrijvingsgeld` | `RegistrationFee` | `BigDecimal bedrag` | 13 |
| `ToParticipant` | `@MappedSuperclass` | | `persoonId` Integer, `schoolId`, `naam`, `voornaam`, `gender`, `leerjaar` Byte, `rol` ToRole, `resultaat` Byte, `antwoorden` String (VWO: `VwoParticipant`) | 14 |
| `LeerlingEersteRonde extends ToParticipant` | `Leerling_eerste_ronde` | `ToPupil` | + `deelnemersnummer` Integer, `inschrijfdatum` LocalDateTime | 14 |
| `Antwoorden` + `AntwoordenPK` | `Antwoorden` | `Answer` | `jaar`, `editie`, `ronde` byte, `vraag` byte, `antwoord` String | 15 |
| `Cesuren` + `CesurenPK` | `Cesuren` | `CutOff` | | 16 |
| `WebsiteToWedstrijddatums` + `WebsiteToWedstrijddatumsPK` | `Website_to_wedstrijddatums` | `ContestDate` | `ronde` mapped with an `AttributeConverter<ToRound, String>` (`ToRoundConverter`) | 15 |
| `LeerlingTweedeRonde` | `Leerling_tweede_ronde` | | | 16 |
| `LeerlingTweedeRondeFull extends ToParticipant` | view | `ToPupilSecondRound` | `@Immutable` | 16 |
| `ApiUser`, `ApiUserRoles` + `ApiUserRolesPK` | `API_user`, `API_user_roles` | | password `@JsonIgnore` | 20 |

`Leerling_finale` and `Historiek_leerling_eerste_ronde` get no entity: the
final is read with native SQL in ch 17 only if needed, and the history table
is read with native SQL, exactly as VWO does.

### DAOs (`dao`, `dao.impl`)

- `AbstractDao<E extends Serializable, K extends Serializable>`: `get`, `getOptional`, `load`, `merge`, `persist`, `save`, `saveAll`, `update`, `saveOrUpdate`, `delete`, `deleteById` (VWO's exact list).
- `TechOlympiadDao<E, K> extends AbstractDao<E, K>` adds `addAll` (VWO: `VwoDao`).
- `AbstractDaoImpl` (type resolved with `GenericTypeResolver`, `factoryRW`/`factoryR` fields, protected setters) → `TechOlympiadDaoImpl` (constants `transactionRW = "transactionToRW"`, `transactionR = "transactionToR"`, `@Autowired setFactoryRW(SessionFactory toRW)` / `setFactoryR(SessionFactory toR)` resolving by bean name, `@Transactional` overrides) → one `XxxDaoImpl extends TechOlympiadDaoImpl<E, K> implements XxxDao`, annotated `@Repository`.
- DAOs: `ScholenDao` (ch 10: `findAll`; ch 12: `getByToResponsible(short userId)`), `PersoonDao` (12), `FunctiesDao` (12: `getBySchool(short schoolId, ToRole)`, `getByPerson(short personId)`), `WedstrijdinfoToDao` (13: `getByYear(short year)`, `getBySchool(short schoolId, short year)`), `InschrijvingsgeldDao` (13), `LeerlingToDao` (14, VWO: `LeerlingVWODao`: `getBySchoolAndEdition`, `count(ToRole)`, `countPerSchool(ToRole)` → `Map<Short, Long>` from `Object[]` rows; ch 16: `getSecondRound(...)`; ch 17: `countHistoric(short year, ToRole)` and `countPerSchoolHistoric` with native SQL, `archive(short year)`), `AntwoordenDao` (15: `getAnswerString(ToRole, byte round, short year)`), `WebsiteToWedstrijddatumsDao` (15), `CesurenDao` (16), `LeerlingTweedeRondeDao` (16), `ApiUserDao` (20: `findByUsername`).

### Repositories (`restAPI.repositories`)

Interfaces annotated `@NoRepositoryBean`, extending Spring Data's
`Repository<E, K>` marker, with a hand-written `*RepositoryImpl` annotated
`@Repository`, constructor-injected DAOs (`@Autowired` constructor, as VWO).
`ScholenRepository` (11), `PersoonRepository` (12), `FunctiesRepository`
(12), `ToParticipationRepository` (13), `RegistrationFeeRepository` (13),
`LeerlingToRepository` (14, VWO: `LeerlingVWORepository`), `AntwoordenRepository`
(15), `ToContestDatesRepository` (15, `@Cacheable` from ch 21),
`ToScoringRepository` (16: `submitAnswers`, `scoreRound`, `selectForNextRound`,
each `@Transactional(value = "transactionToRW", rollbackFor = Exception.class)`).

### Controllers

Shared interfaces in `restAPI.controllers` with `default` endpoint methods and
Swagger `@Operation(summary = ...)`, each exposing `getRepository()` (or
several getters); thin `@RestController` classes in `v1` (and `v2` from ch 19)
with `@RequestMapping(path = V1Config.BASE_URL + "/...", produces = MediaType.APPLICATION_JSON_VALUE)`,
`@Tag(name = "...")`, Lombok `@Getter` and an `@Autowired` constructor.

| Interface | v1 class | Base path | Endpoints | Ch |
|---|---|---|---|---|
| `SchoolController` | `v1/ScholenController` | `/school` | `GET`, `GET /{schoolId}`, `POST`, `PUT`; ch 12 adds `GET /to/user/{user_id}` | 11, 12 |
| `FunctionController` | `v1/FunctionController` | `/function` | `GET /to/school/{schoolId}?edition=`, `GET /to/{personId}`, `POST`, `DELETE` (body) | 12 |
| `ToParticipationController` | `v1/ToParticipationController` | `/to/participation` | `GET ?year=`, `GET /{schoolId}?year=`, `POST`, `PUT` | 13 |
| `RegistrationFeeController` | `v1/RegistrationFeeController` | `/registration-fee` | `GET /{edition}` | 13 |
| `ToParticipantsController` | `v1/ToParticipantsController` | `/to/participants` | `GET ?schoolId=&edition=&round=`, `POST` (body `ParticipantRegistration`), `PUT`, `DELETE /{pupilId}`, `GET /count?edition=&year=`, `GET /school-counts?edition=&year=` | 14, 16, 17 |
| `AnswerStringController` | `v1/AnswerStringController` | `/answer-string` | `GET /{edition}?round=&year=` | 15 |
| `DatesController` | `v1/DatesController` | `/date/to` | `GET /contest/{round}?year=`, `GET /contest/list?year=` | 15 |
| `ScoringController` | `v1/ScoringController` | `/to/round` | `POST /{round}/answers?edition=` (body `List<PupilAnswers>`), `POST /{round}/score?edition=`, `POST /{round}/select?edition=` | 16 |
| `ArchiveController` | `v1/ArchiveController` | `/to/archive` | `POST ?year=` (ADMIN from ch 20) | 17 |
| `CacheController` | `v1/CacheController` | `/cache` | `DELETE` clears all caches (ADMIN) | 21 |

Models (`restAPI.models`, Lombok `@Getter @Setter @NoArgsConstructor`, Swagger
`@Schema`): `PupilData` (ch 14), `ParticipantRegistration` `{schoolId, edition, pupilData[]}` (14),
`PupilAnswers` `{participantId, answers}` (16), `RoundResult` `{round, edition, scored, selected}` (16).

### Security (`security`, ch 20)

Mirrors VWO's `security` package; read VWO's files before writing:
`User implements UserDetails`, `UserCrudService` + `ApiUsers`,
`UserAuthenticationService`, `jwt/TokenService` + `jwt/JWTTokenService`
(jjwt 0.9.1, secret `${jwt.secret}`, 12 h expiry), `jwt/JwtAuthenticationService`
(checks the password with `BCryptPasswordEncoder` against `ApiUserDao`, loads
roles; this is the documented deviation from VWO's `sha2(...)` HQL),
`TokenAuthenticationFilter`, `TokenAuthenticationProvider`, `NoRedirectStrategy`,
`SecurityConfig` (stateless, public URLs `/public/**`, `web.ignoring()` for
`/public/**`, `/swagger-ui/**`, `/v3/api-docs/**`, protected URLs need
`USER` or `ADMIN`, `@EnableGlobalMethodSecurity(prePostEnabled = true)`),
`PublicUsersController` at `POST /public/users/login` (params `username`,
`password`, returns the token). Write endpoints get `@PreAuthorize("hasAuthority('ADMIN')")`.
VWO's leftover `restAPI/SpringSecurityConfig` (in-memory `admin`/`password`)
and `AuthTokenSecurityConfig` are explained, not copied.

### Caching and logging (ch 21)

`ehcache.xml` with caches `ToContestDates` and `RegistrationFee` (heap 100
entries, 1 h TTL), Hibernate second-level cache on `Scholen`
(`@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)`), `log4j2.xml` adapted
from VWO's (console + rolling file under `${sys:catalina.base}/logs`, app name
from `log4j2.appName`), `@Slf4j` on `ToScoringRepositoryImpl`.

### Shipping (ch 22)

`Dockerfile` `FROM tomcat:9-jdk17`, `ARG WAR_FILENAME=techolympiad.war`, copies
`target/techolympiadAPI.war`; `docker build -t techolympiad-api .` and run it
against the compose DB. `.gitlab-ci.yml` and `.releaserc.json` are read and
explained from the VWO repo; nothing is pushed to GitLab or a registry.

## Changes made while writing the chapters

These override the sections above where they differ.

- Ch 2: `dependencyManagement` imports the Spring Framework BOM 5.3.39; `swagger-core` 2.2.30 before springdoc (ch 5).
- Ch 8: no `current_session_context_class` (`LocalSessionFactoryBean` sets `SpringSessionContext`); no `pool_size` or `max_statements_per_connection`.
- Ch 7: `Functies.SCHOOL_ID` has an FK to `Scholen` (VWO has none); answer keys for rounds 1 and 2; participant numbers `(JAAR % 100) * 1000000 + n`; prod placeholders are `CHANGE_ME`.
- Ch 12: every `v1` controller has an explicit bean name `"xxxController.v1"` (except `ScholenController`, whose name never collides); `ToRoleConverter` is nested in `Configuration`, as in VWO.
- Ch 14: repository methods `count(ToRole, short year)`, `countPerSchool(ToRole, short year)`; year routing lives in the repository; `LeerlingToDao.getMaxParticipantNumber(short year)`, `updateAll`, `getByEdition`; pupil grade is JSON `grade`.
- Ch 15: `WebsiteToWedstrijddatums` uses `@EmbeddedId` (Hibernate skips converters on `@Id`); `ToRoundConverter` is top level in `dbEntities`; `AnswerStringController` produces `text/plain`; `ToContestDatesRepository.findById(WebsiteToWedstrijddatumsPK)` and `findAllByYear(short)`.
- Ch 16: `AntwoordenDao.getAnswers(ToRole, byte, short)`, `LeerlingTweedeRondeDao.getByEdition`/`deleteByEdition`; selection only for round 1 (round 2 answers 400).
- Records in `restAPI.models`: `ParticipationInfo`, `PersonFunction`, `EditionCount`, `SchoolParticipantCount`, `ArchiveResult`; `RoundResult` has `@AllArgsConstructor`.
- Ch 17: the archive copies round 1 only; its native DML declares synchronized query spaces.
- Ch 18: handlers for `NotFoundException` (404), `RoundClosedException` (409), `IllegalArgumentException` (400), Hibernate `ConstraintViolationException` (409, matched through the cause chain of `JpaSystemException`/`DataIntegrityViolationException`), both validation exceptions (400; VWO uses 422); `NoSuchElementException` throws from ch 14/16 become `NotFoundException`; no handler for `IllegalStateException`.
- Ch 19: `v2` controllers `SchoolController`, `FunctionController` (adds `DELETE /{personId}/{schoolId}/{function}`, old body `DELETE` answers 410), `RegistrationFeeController` (adds `GET` for all fees).
- Ch 20: `ApiUserDao.updateLastLogin(String)`; `AccessDeniedException` handler (403); missing or invalid token answers 401 (as VWO); failed login 401; seed users `admin`/`adminpass`, `teacher`/`teacherpass`. VWO has no `@PreAuthorize`; ours is a deviation.
- Ch 21: `CacheRepository.evictAll()`; `cacheManagerUri=classpath:ehcache.xml` and `hibernate.javax.cache.uri=ehcache.xml`; third cache `be.techolympiad.common.dbEntities.Scholen`; env key `log4j2.hibernate`; `spring-context-support`, log4j 2.24.3 artifacts, `spring-boot-starter` with the logging exclusion. VWO's `ehcache.xml` is never loaded (its `VwoParticipant` cache lookup fails with a 500).
- Ch 22: `.dockerignore`; the chapter's commit tags `v1.0.0` locally.
