# 1. The toolbox

<div class="level-tabs" data-levels>
  <button data-level="overview" aria-pressed="true">Overview</button>
  <button data-level="deep" data-short="Deep">Deep Understanding</button>
  <button data-level="drill">Drilling</button>
</div>

<div class="level overview">

Before there is any TechOlympiad code, there is a folder that knows which
Java and which Maven it needs. The VWO API leaves that to whoever builds
it, which is why `~/bin/vwo-local-restart` has to spell the versions out
on every build:

```bash
mise exec java@temurin-17.0.20+8 maven@3.9.16 -- mvn -q -DskipTests -Pgitlab-dev package
```

TechOlympiad pins the same two versions with
<dfn data-def="A tool version manager: it installs tools such as java, maven and node side by side and activates the right version per folder.">mise</dfn>,
in a `mise.toml` inside the project, so `java` and `mvn` are simply right whenever you are in that
folder. Tomcat and MariaDB never get installed on your machine: they run
as Docker containers, from the same images the VWO setup uses.

**After this chapter you can:**

- explain what the JDK, the JVM and bytecode are, and which one each command uses;
- say why the VWO API is on Java 17, and what would change on a newer version;
- start a new Java project with its tool versions pinned;
- compile and run a Java class by hand, without Maven.

<div class="code-compare" data-code-compare data-labels="What you know|What you'll learn">

```bash
# .NET: one SDK, picked by global.json
dotnet --version
dotnet build
dotnet run
```

```bash
# Java: a JDK and a separate build tool, both pinned by mise.toml
java -version
mvn package
# no "mvn run": a WAR is deployed to Tomcat
```

</div>

</div>

<div class="level deep">

### The JDK, the JVM and bytecode

`javac` compiles a `.java` file into a `.class` file holding
<dfn data-def="Platform-independent instructions for the Java Virtual Machine, the Java counterpart of .NET's IL.">bytecode</dfn>.
The <dfn data-def="Java Virtual Machine: the program that loads .class files and runs them, compiling hot code to machine code as it goes. The counterpart of .NET's CLR.">JVM</dfn>
loads those classes and runs them. The
<dfn data-def="Java Development Kit: the JVM plus the developer tools (javac, jar, javap, jshell, ...).">JDK</dfn>
is the JVM plus the tools that make class files. A runtime-only install
(a JRE, Java Runtime Environment) can run a WAR but not build one, so a build machine always needs
the JDK.

<div class="table-wrap">

| Java | .NET | What it is |
|---|---|---|
| JDK | SDK | Compiler plus runtime plus tools |
| JVM | CLR | Runs the compiled code |
| bytecode in `.class` files | IL in `.dll` files | What the compiler produces |
| JAR | assembly / NuGet package | A zip of classes, usually a library |
| WAR | a published web app | A zip of classes and libraries for a servlet container |
| Maven | MSBuild plus NuGet | Builds the project and downloads its dependencies |
| `~/.m2/repository` | `~/.nuget/packages` | The local cache of downloaded dependencies |

</div>

### One OpenJDK, many builds

Java itself is the open-source OpenJDK. What you install is a build of it
from some vendor: Eclipse Temurin, Oracle, Amazon Corretto, Microsoft and
others. They run the same code. The VWO setup uses Temurin, and its exact
version string `temurin-17.0.20+8` reads as vendor, Java version and build
number.

### Why Java 17

Java gets a long-term support (LTS) release every two years: 8, 11, 17,
21, 25. The VWO `pom.xml` compiles with `<release>17</release>`, so the
bytecode targets Java 17. Two facts follow from that:

1. **Newer JVMs run older bytecode.** A class compiled for 17 runs fine
   on 21 or 25. The reverse fails with `UnsupportedClassVersionError`.
2. **The ceiling is Spring Boot 2.7, not Java.** Spring Boot 3 and Spring 6
   need Java 17 or newer, but they also move every `javax.*` import to
   `jakarta.*` and bring Hibernate 6. That migration, not the Java
   version, is what keeps the VWO API on Boot 2.7. Tutorials written for
   Boot 3 will show `jakarta.persistence.Entity` where our code says
   `javax.persistence.Entity`.

   `javax.*` holds the Java EE standard APIs this code uses, such as
   servlets, JPA and validation. Oracle handed Java EE to the Eclipse
   Foundation, which renamed it Jakarta EE. From version 9 on, those
   packages are called `jakarta.*`.

<div class="callout danger">
<div class="callout-label">Gotcha</div>

The VWO `Dockerfile` starts `FROM tomcat:9`. That tag follows the newest
JDK the Tomcat image ships, which today is Java 25, not 17. Production
therefore runs Java 17 bytecode on a Java 25 JVM. It works because of
fact 1, but it means production and your machine can differ. The local
script pins `tomcat:9-jdk17`, and so will TechOlympiad.

</div>

### How mise picks the version

mise
reads `mise.toml` in the current folder (and its parents). When you type
`java`, a small mise shim finds the version that file asks for and runs
it. mise also sets `JAVA_HOME`, the variable Maven and IntelliJ use to
find the JDK. Outside a folder with a `mise.toml`, `java` has no version
at all on this machine, because nothing is set globally. That is on
purpose: every project states its own.

### Maven needs a JDK

Maven is itself a Java program, and it compiles your code with the JDK it
runs on. `mvn -v` shows both versions, and the second one, `Java version`,
is the one that matters. The first build of a project downloads every
dependency into `~/.m2/repository`. Later builds reuse it.

The VWO API does not use the Maven wrapper (`mvnw`), so neither do we.
mise plays that role instead.

</div>

<div class="level drill">

### Tasks

<ul class="checklist">
<li><label><input type="checkbox"><span>Create the project folder and its repository: <code>mkdir ~/Coding/techolympiad &amp;&amp; cd ~/Coding/techolympiad &amp;&amp; git init</code>.</span></label></li>
<li><label><input type="checkbox"><span>Pin the tools: <code>mise use java@temurin-17.0.20+8 maven@3.9.16</code>. Open the <code>mise.toml</code> it wrote.</span></label></li>
<li><label><input type="checkbox"><span>Check them: <code>java -version</code>, <code>javac -version</code> and <code>mvn -v</code> all report 17.0.20. Then <code>cd ~</code> and run <code>java -version</code> again to see it fail.</span></label></li>
<li><label><input type="checkbox"><span>Back in the project, run <code>echo $JAVA_HOME</code> and find that folder on disk.</span></label></li>
<li><label><input type="checkbox"><span>Write <code>Hello.java</code> (below), then <code>javac Hello.java</code>, <code>ls</code>, and <code>java Hello</code>.</span></label></li>
<li><label><input type="checkbox"><span>Read the bytecode with <code>javap -c Hello</code>. Find the line that loads your string.</span></label></li>
<li><label><input type="checkbox"><span>Delete <code>Hello.java</code> and <code>Hello.class</code>: from the next chapter on, Maven does the compiling.</span></label></li>
<li><label><input type="checkbox"><span>Pull the two images we will use: <code>docker pull tomcat:9-jdk17</code> and <code>docker pull mariadb:11.8</code>. Run <code>docker run --rm tomcat:9-jdk17 java -version</code> and compare it with <code>tomcat:9</code>.</span></label></li>
<li><label><input type="checkbox"><span>Add a <code>.gitignore</code> with the VWO entries that apply: <code>/target/</code>, <code>/.idea</code> and <code>*.iml</code>.</span></label></li>
<li><label><input type="checkbox"><span>Open the folder in IntelliJ. Under <em>Project Structure → SDK</em>, add the JDK from <code>$JAVA_HOME</code>. Under <em>Settings → Build Tools → Maven</em>, set the Maven home to the mise install (<code>dirname $(dirname $(mise which mvn))</code>).</span></label></li>
<li><label><input type="checkbox"><span>Commit: <code>git add -A &amp;&amp; git commit -m "Pin Java 17 and Maven 3.9"</code>.</span></label></li>
</ul>

```java
public class Hello {
    public static void main(String[] args) {
        System.out.println("Hello, TechOlympiad");
    }
}
```

The public class name must match the file name: `Hello` lives in
`Hello.java`. `javac` refuses anything else.

### Quiz

<div class="quiz" data-quiz>
<p class="quiz-q">The VWO API is compiled with <code>&lt;release&gt;17&lt;/release&gt;</code>. Production runs <code>FROM tomcat:9</code>, which ships Java 25. What happens?</p>
<ol class="quiz-options">
<li>Tomcat refuses to deploy the WAR because the versions differ<p class="quiz-whynot">Tomcat does not compare versions. Only the JVM's <dfn data-def="The part of the JVM that finds .class files (in jars and folders) and loads them into memory.">class loader</dfn> checks the class file version.</p></li>
<li data-correct>It runs: a newer JVM loads older bytecode<p class="quiz-why">Class files carry a version number, and a JVM accepts its own version and every older one.</p></li>
<li>It fails with <code>UnsupportedClassVersionError</code><p class="quiz-whynot">That error is the reverse case: bytecode newer than the JVM running it.</p></li>
</ol>
<p class="quiz-explain">Forward compatibility is why the floating <code>tomcat:9</code> tag has not broken anything yet. It is also why it could: a future JVM may remove something the code or a library relies on.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">What keeps the VWO API on Spring Boot 2.7 instead of 3?</p>
<ol class="quiz-options">
<li>Boot 3 needs a newer Java than 17<p class="quiz-whynot">Boot 3 needs Java 17 or newer, which the API already has.</p></li>
<li data-correct>Boot 3 moves <code>javax.*</code> to <code>jakarta.*</code> and brings Hibernate 6, which touches nearly every file</li>
<li>Tomcat 9 cannot run Java 17<p class="quiz-whynot">It does, and the local setup proves it every day.</p></li>
</ol>
<p class="quiz-explain">The Java version is not the blocker. The package rename is: every entity, controller and filter imports from <code>javax</code>, and Tomcat 9 itself is a <code>javax</code> container, so Boot 3 also means Tomcat 10.</p>
</div>

### Flashcards

<div class="flashcards" data-flashcards data-front-label="Term" data-back-label="Meaning">
<div class="card"><div class="front">JDK</div><div class="back">JVM plus the developer tools: <code>javac</code>, <code>jar</code>, <code>javap</code>, <code>jshell</code>. Needed to build.</div></div>
<div class="card"><div class="front">JVM</div><div class="back">Loads <code>.class</code> files and runs them. The CLR of Java.</div></div>
<div class="card"><div class="front">Bytecode</div><div class="back">What <code>javac</code> produces: JVM instructions in <code>.class</code> files. Java's IL.</div></div>
<div class="card"><div class="front">Temurin</div><div class="back">Eclipse Adoptium's build of OpenJDK, the one the VWO setup uses.</div></div>
<div class="card"><div class="front"><code>JAVA_HOME</code></div><div class="back">The JDK folder that Maven and IntelliJ use. mise sets it per project.</div></div>
<div class="card"><div class="front"><code>~/.m2/repository</code></div><div class="back">Maven's local cache of downloaded dependencies, like <code>~/.nuget/packages</code>.</div></div>
</div>

### Self-checks

<details class="qa">
<summary>Self-check: why does <code>java -version</code> fail in your home folder but work in the project?</summary>
<div class="ans">
<code>java</code> is a mise shim. It looks for a <code>mise.toml</code> in the current folder or a parent, and your home folder has no Java version set, globally or locally. The project's <code>mise.toml</code> provides one.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<details class="qa">
<summary>Self-check: <code>mvn -v</code> prints two versions. Which one decides what your code compiles with?</summary>
<div class="ans">
The <code>Java version</code> line: Maven compiles with the JDK it runs on, found through <code>JAVA_HOME</code>. The Maven version only decides which build features and plugin versions are available.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<details class="qa">
<summary>Self-check: you see <code>import jakarta.persistence.Entity;</code> in a tutorial. Can you copy it into TechOlympiad?</summary>
<div class="ans">
No. That tutorial is for Spring Boot 3 / Hibernate 6. On Boot 2.7 the same annotation is <code>javax.persistence.Entity</code>. The code is usually otherwise the same, so changing the import is often enough, but treat Boot 3 material with care.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<button type="button" data-mark-done>Mark this chapter done</button>

</div>
