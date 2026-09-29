# Cheat Sheet: Concept → File Map

<div class="table-wrap">

| Concept (where to learn it) | Where it lives in the repo |
|---|---|
| Java `Optional`, `record`, `switch` expressions (1.x) | `Configuration.java`, `restAPI/models/*`, controller default methods |
| Maven parent/profiles/scopes/lifecycle (2.x) | `pom.xml`, `pom-userProperties.xml.tmpl`, `ant.xml` |
| DI, component scan, singletons, proxies (3.1, 3.2) | every `*RepositoryImpl`, `*DaoImpl`, `applicationContextAPI.xml` |
| MVC annotations (3.3) | `restAPI/controllers/**` |
| WAR + `SpringBootServletInitializer` (3.4) | `restAPI/OpenApiApplication.java`, `Dockerfile` |
| Hibernate Session/entities/transactions/cache (4.1, 4.2) | `dao/impl/VwoDaoImpl.java`, `dbEntities/**`, `hibernate_VWO.cfg.xml` |
| HQL (4.3, 4.4) | `dao/impl/*DaoImpl.java` |
| Spring Security filter chain + JWT (5.1) | `security/**` (`SecurityConfig.java`, `JWTTokenService.java`) |
| Lombok (6.1) | `@Getter @Setter @NoArgsConstructor` on entities; `@Getter(onMethod_ = {@Override})` in controllers |

</div>

<div class="callout note">
<div class="callout-label">Remaining gap</div>
No verified resource was found for JWT with jjwt 0.9 or springdoc-openapi 1.x. Read the code (<code>security/jwt/JWTTokenService.java</code>, <code>restAPI/OpenApiApplication.java</code>) with Knowledge File §10 and §11 instead of trusting a link that hasn't been opened.
</div>

See the interactive layer breakdown in [Step 3](step-3-spring-mvc-war.md).
