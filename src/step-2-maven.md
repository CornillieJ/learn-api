# Step 2: Maven

<div class="level-tabs" data-levels>
  <button data-level="overview" aria-pressed="true">Overview</button>
  <button data-level="deep">Deep Understanding</button>
  <button data-level="drill">Drilling</button>
</div>

<div class="level overview">

Maven is this project's `csproj` + NuGet + MSBuild rolled into one XML
file. That sounds boring until you learn that **in this repo the build
decides which database the app talks to**: the environment is baked into
the WAR by a Maven profile, not picked at startup like
`ASPNETCORE_ENVIRONMENT`. One wrong `-P` flag and you've either built a
production WAR or uploaded one to a server. Also: the parent POM is
gitignored and generated from a template, so a fresh clone won't build
until you create it.

**After this step you can:**

- build the WAR for a chosen environment, and know which profiles also deploy;
- read `pom.xml`: parent, packaging, dependencies, scopes, exclusions, profiles;
- predict which plugin executions fire for a given `mvn` command.

<div class="code-compare" data-code-compare>

```xml
<!-- MyApi.csproj -->
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup><TargetFramework>net8.0</TargetFramework></PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Swashbuckle.AspNetCore" Version="6.5.0" />
  </ItemGroup>
</Project>
```

```xml
<!-- pom.xml (vwo-api) -->
<packaging>war</packaging>
<parent>
    <groupId>be.vwo</groupId><artifactId>serverInfo</artifactId><version>1.0-SNAPSHOT</version>
    <relativePath>pom-userProperties.xml</relativePath>
</parent>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-tomcat</artifactId><version>2.7.18</version>
    <scope>provided</scope>
</dependency>
```

</div>

</div>

<div class="level deep">

### 2.1 Simple Explanation of Maven and pom.xml (YouTube, Brandan Jones)

[https://www.youtube.com/watch?v=KNGQ9JBQWhQ](https://www.youtube.com/watch?v=KNGQ9JBQWhQ)
🔎 title and channel confirmed; covers groupId/artifactId/version,
parent, effective POM, dependencies, plugins (not independently confirmed).

```xml
<!-- pom.xml -->
<packaging>war</packaging>
<parent>
    <groupId>be.vwo</groupId><artifactId>serverInfo</artifactId><version>1.0-SNAPSHOT</version>
    <relativePath>pom-userProperties.xml</relativePath>   <!-- created from pom-userProperties.xml.tmpl -->
</parent>
```

and profiles that choose the environment at build time:

```xml
<profile><id>gitlab-prod</id> … <ant antfile="ant.xml" target="properties-APIprod"/> …</profile>
```

`mvn clean package -P gitlab-prod` bakes the production DB settings into
the WAR.

### 2.2 Maven Tutorials 04 (YouTube, gontuseries)

[https://www.youtube.com/watch?v=1cz8VPc-1Vw](https://www.youtube.com/watch?v=1cz8VPc-1Vw)
🔎 title and channel confirmed; part 4 of an older series, a supplement.

Dependency scopes decide what ends up in the WAR:

```xml
<artifactId>spring-boot-starter-tomcat</artifactId><version>2.7.18</version><scope>provided</scope>
```

This one line is why the app is a WAR on external Tomcat and not a
`java -jar`: `provided` means "compile against it, but the server
supplies it at runtime, so don't package it".

### 2.3 📖 Maven Tutorial for Beginners in 5 Steps (springboottutorial.com)

[https://www.springboottutorial.com/maven-tutorial-for-beginners](https://www.springboottutorial.com/maven-tutorial-for-beginners)
✅ covers Spring Initializr, POM structure, the build lifecycle
(validate → compile → test → package → integration-test → verify →
install → deploy), repositories, and core commands.

The lifecycle explains *when* this project's odd build steps run: the
Ant env-file copy is bound to `compile`, the SSH/SCP deploy to `package`:

```xml
<execution><id>set_env</id><phase>compile</phase> … target="properties-APIdev" …
<execution><id>clydesv-dev</id><phase>package</phase> … target="api-dev" …
```

Knowing the phases is how you predict that `mvn package -P dev` uploads
to a server (don't do it by accident), while `-P gitlab-dev` does not.

Also seen in search (⚠️ 403, not read): Baeldung's Apache Maven
tutorial: [https://www.baeldung.com/maven](https://www.baeldung.com/maven).

### 2.4 Mental model: phases, not targets

`dotnet build` and `dotnet publish` are separate commands. Maven has one
ordered **lifecycle**; running a phase runs every phase before it.
`mvn package` = validate + compile + test + package. Plugins attach
"executions" to phases, which is how the Ant copy and the SCP deploy
sneak into an ordinary build.

<div class="table-wrap">

| .NET | Maven | Note |
|---|---|---|
| `dotnet restore` | happens automatically on any phase | downloads into `~/.m2/repository` (≈ `~/.nuget/packages`) |
| `dotnet build` | `mvn compile` | |
| `dotnet test` | `mvn test` | `-DskipTests` to skip |
| `dotnet publish` | `mvn package` | output in `target/` (here: a `.war`) |
| `dotnet pack` + push to feed | `mvn install` (local repo) / `mvn deploy` (remote repo) | Maven's `deploy` means "publish the artifact", not "deploy the app" |
| `Directory.Build.props` | parent POM | here: `pom-userProperties.xml`, generated from `.tmpl` |
| `Directory.Packages.props` (central versions) | `<dependencyManagement>` | |
| Debug/Release + custom MSBuild targets | profiles (`-P`) + plugin executions | here profiles also pick the environment |
| `dotnet list package --include-transitive` | `mvn dependency:tree` | the first thing to run on a version conflict |
| (no equivalent) | `mvn help:effective-pom` | shows the POM after parent + profiles merge |

</div>

### 2.5 Mental model: scopes are not NuGet's `PrivateAssets`

<div class="table-wrap">

| Scope | On compile classpath | Packaged into the WAR | Typical use |
|---|---|---|---|
| `compile` (default) | yes | yes | Spring, Hibernate |
| `provided` | yes | **no** | Tomcat / servlet API (the container supplies it) |
| `runtime` | no | yes | JDBC drivers |
| `test` | tests only | no | JUnit, Mockito |

</div>

<div class="callout danger">
<div class="callout-label">.NET gotchas</div>

- **Version conflicts:** NuGet picks the *lowest applicable* version; Maven picks the version *nearest* to your POM in the dependency tree, and on a tie the first one declared. A transitive dependency can silently win or lose. Use `mvn dependency:tree` and `<exclusion>` (the repo excludes `spring-boot-starter-logging` to swap Logback for Log4j2).
- **`SNAPSHOT` versions are mutable.** `1.0-SNAPSHOT` (like the parent POM here) can change under the same version number, unlike a NuGet prerelease.
- **No `appsettings.{Environment}.json` at runtime.** In this repo the Ant step copies the right `environment.properties` into `target/classes` at compile time. Check it after every build.

</div>

</div>

<div class="level drill">

### Tasks

<ul class="checklist">
<li><label><input type="checkbox"><span>Create <code>pom-userProperties.xml</code> from <code>pom-userProperties.xml.tmpl</code> so the parent POM resolves.</span></label></li>
<li><label><input type="checkbox"><span>Build with <code>mvn clean package -P gitlab-dev</code> (JDK ≥ 21 + Maven required) and compare <code>target/classes/environment.properties</code> for dev vs prod.</span></label></li>
<li><label><input type="checkbox"><span>Find every <code>&lt;exclusion&gt;</code> of <code>spring-boot-starter-logging</code> in <code>pom.xml</code> and explain why Log4j2 is used instead of Logback.</span></label></li>
<li><label><input type="checkbox"><span>List, in order, which plugin executions fire for <code>mvn clean package -P gitlab-prod</code>.</span></label></li>
<li><label><input type="checkbox"><span>Run <code>mvn help:effective-pom -P gitlab-dev</code> and find where the parent's properties land.</span></label></li>
</ul>

### Quiz

<div class="quiz" data-quiz>
<p class="quiz-q">You run <code>mvn package</code>. Which phases run?</p>
<ol class="quiz-options">
<li>Only <code>package</code></li>
<li data-correct>Every lifecycle phase up to and including <code>package</code> (validate, compile, test, package)</li>
<li><code>package</code> and then <code>install</code></li>
<li><code>clean</code> and <code>package</code></li>
</ol>
<p class="quiz-explain">Invoking a phase runs all earlier phases of the lifecycle first. <code>clean</code> belongs to a separate lifecycle and only runs if you ask for it.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">What does <code>&lt;scope&gt;provided&lt;/scope&gt;</code> on <code>spring-boot-starter-tomcat</code> do?</p>
<ol class="quiz-options">
<li>Excludes Tomcat from compilation entirely</li>
<li data-correct>Compiles against Tomcat but leaves it out of the WAR, because the external Tomcat supplies it</li>
<li>Downloads Tomcat only when running tests</li>
<li>Marks Tomcat as optional for downstream consumers but still packages it</li>
</ol>
<p class="quiz-explain"><code>provided</code> = on the compile classpath, not packaged. It is the reason this app runs as a WAR inside Tomcat 9 rather than as a self-contained jar.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">Which command can upload a build to a real server as a side effect?</p>
<ol class="quiz-options">
<li><code>mvn clean package -P gitlab-dev</code></li>
<li><code>mvn compile -P dev</code></li>
<li data-correct><code>mvn package -P dev</code></li>
<li><code>mvn dependency:tree</code></li>
</ol>
<p class="quiz-explain">The SSH/SCP deploy execution is bound to <code>package</code> under the <code>dev</code>/<code>production</code> profiles. <code>gitlab-*</code> profiles only run the env-file copy at <code>compile</code>; <code>mvn compile</code> never reaches <code>package</code>.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">In this repo, how is the target environment (dev vs prod database) chosen?</p>
<ol class="quiz-options">
<li>By setting <code>spring.profiles.active</code> when Tomcat starts</li>
<li>By an environment variable read in <code>OpenApiApplication</code></li>
<li data-correct>At build time: a Maven profile runs an Ant target that copies the matching <code>environment.properties</code> into the WAR</li>
<li>By the name of the WAR file</li>
</ol>
<p class="quiz-explain">The credentials are swapped in at Maven build time, not through a Spring profile. The WAR you build is tied to one environment.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">Two libraries pull in different versions of the same transitive dependency. Which one does Maven pick?</p>
<ol class="quiz-options">
<li>The highest version</li>
<li>The lowest applicable version, like NuGet</li>
<li data-correct>The one nearest to your POM in the dependency tree (first declared wins on a tie)</li>
<li>The build fails until you choose</li>
</ol>
<p class="quiz-explain">Maven's "nearest definition" rule. Pin a version in <code>&lt;dependencyManagement&gt;</code> or declare it directly to take control.</p>
</div>

### Flashcards

<div class="flashcards" data-flashcards>
<div class="card"><div class="front"><code>PackageReference</code></div><div class="back"><code>&lt;dependency&gt;</code> with groupId / artifactId / version</div></div>
<div class="card"><div class="front"><code>Directory.Build.props</code></div><div class="back">Parent POM (<code>&lt;parent&gt;</code>)</div></div>
<div class="card"><div class="front"><code>dotnet publish</code></div><div class="back"><code>mvn package</code> (output in <code>target/</code>)</div></div>
<div class="card"><div class="front"><code>~/.nuget/packages</code></div><div class="back"><code>~/.m2/repository</code></div></div>
<div class="card"><div class="front">Build configuration (Debug/Release)</div><div class="back">Profile, <code>-P name</code></div></div>
</div>

### Self-checks

<details class="qa">
<summary>Self-check: why does <code>mvn package -P dev</code> potentially deploy to a real server, when <code>-P gitlab-dev</code> doesn't?</summary>
<div class="ans">
Because the SSH/SCP deploy execution is bound to the <code>package</code>
phase only under the <code>dev</code>/<code>production</code> profiles:
the <code>gitlab-*</code> profiles only run the Ant env-file copy at
<code>compile</code> and stop there, so <code>package</code> under
<code>gitlab-dev</code> produces a WAR without uploading it anywhere.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<details class="qa">
<summary>Self-check: a fresh clone fails with "Non-resolvable parent POM". What's missing?</summary>
<div class="ans">
<code>pom-userProperties.xml</code>. The <code>&lt;parent&gt;</code> points at it
via <code>&lt;relativePath&gt;</code>, but the file is gitignored; you create
it from <code>pom-userProperties.xml.tmpl</code>.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<button type="button" data-mark-done>Mark this step done</button>

</div>
