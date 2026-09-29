# Step 2: Maven

<div class="level-tabs" data-levels>
  <button data-level="overview" aria-pressed="true">Overview</button>
  <button data-level="deep">Deep Understanding</button>
  <button data-level="drill">Drilling</button>
</div>

<div class="level overview">

Maven is this project's `csproj` + NuGet + MSBuild. You cannot build the
WAR without understanding its non-obvious parent POM (gitignored,
generated from a template) and the profiles that choose the target
environment at build time.

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
`java -jar`.

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

</div>

<div class="level drill">

<ul class="checklist">
<li><label><input type="checkbox"><span>Build with <code>mvn clean package -P gitlab-dev</code> (JDK ≥ 21 + Maven required) and compare <code>target/classes/environment.properties</code> for dev vs prod.</span></label></li>
<li><label><input type="checkbox"><span>Find every <code>&lt;exclusion&gt;</code> of <code>spring-boot-starter-logging</code> in <code>pom.xml</code> and explain why Log4j2 is used instead of Logback.</span></label></li>
<li><label><input type="checkbox"><span>List, in order, which plugin executions fire for <code>mvn clean package -P gitlab-prod</code>.</span></label></li>
</ul>

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

<button type="button" data-mark-done>Mark this step done</button>

</div>
