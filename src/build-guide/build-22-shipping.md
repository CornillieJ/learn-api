# 22. Building and shipping

<div class="level-tabs" data-levels>
  <button data-level="overview" aria-pressed="true">Overview</button>
  <button data-level="deep" data-short="Deep">Deep Understanding</button>
  <button data-level="drill">Drilling</button>
</div>

<div class="level overview">

Locally, TechOlympiad runs as a WAR mounted into a stock Tomcat
container. The VWO API ships differently:

1. GitLab builds the WAR.
2. GitLab bakes the WAR into a Docker image with Tomcat.
3. GitLab pushes that image to the GitLab registry.
4. A deploy job starts the image on a server over SSH.

A tool called semantic-release decides the version number from the
commit messages.

This chapter first does the parts that run on your machine:

- a `Dockerfile` like the VWO's
- an image built from it
- that image, run against the compose database
- a version bump

Then it reads the parts that run on GitLab: the VWO's `.gitlab-ci.yml`,
`.releaserc.json`, the parent pom `pom-userProperties.xml` and the
deploy targets in `ant.xml`. Nothing is pushed anywhere. The chapter, and the build guide, end with a map from
every TechOlympiad file to its VWO original.

**After this chapter you can:**

- write a `Dockerfile` for a WAR on Tomcat, and explain what each instruction adds to the image;
- build and run that image next to the compose database;
- read the VWO pipeline stage by stage, and say what each job needs from GitLab;
- explain how semantic-release turns commit messages into a version, and why the VWO's versions drift;
- name the VWO build commands that deploy to a server, and why you never run them locally.

<div class="code-compare" data-code-compare data-labels="VWO Dockerfile|TechOlympiad Dockerfile">

```dockerfile
FROM tomcat:9

ENV TZ="Europe/Brussels"

RUN mkdir -p /usr/local/tomcat/webapps/ROOT

COPY tomcat/index.html /usr/local/tomcat/webapps/ROOT/

ARG WAR_FILENAME=database.war

COPY target/restAPI.war /usr/local/tomcat/webapps/${WAR_FILENAME}

EXPOSE 8080
```

```dockerfile
FROM tomcat:9-jdk17

ENV TZ="Europe/Brussels"

ARG WAR_FILENAME=techolympiad.war

COPY target/techolympiadAPI.war /usr/local/tomcat/webapps/${WAR_FILENAME}

EXPOSE 8080
```

</div>

The VWO's file carries Dutch comments, left out above.

</div>

<div class="level deep">

### An image is a stack of layers

A Docker image is a list of read-only
<dfn data-def="A filesystem diff: the files one Dockerfile instruction added, changed or removed. Images share identical layers, and the build cache reuses a layer when its instruction and inputs are unchanged.">layers</dfn>
plus some metadata. `FROM tomcat:9-jdk17` starts from that image's
layers: a Linux base, a JDK 17, Tomcat 9 in `/usr/local/tomcat`. Each
following instruction either adds a layer or only sets metadata:

<div class="table-wrap">

| Instruction | Adds a layer | What it does |
|---|---|---|
| `FROM tomcat:9-jdk17` | uses the base image's | Everything Tomcat needs, and its default command `catalina.sh run` |
| `ENV TZ="Europe/Brussels"` | no, metadata | An environment variable in every container; the JVM takes its default time zone from it |
| `ARG WAR_FILENAME=techolympiad.war` | no | A variable that only exists during the build, overridable with `--build-arg` |
| `COPY target/techolympiadAPI.war ...` | yes, about the size of the WAR | The application. The file name in `webapps` becomes the context path |
| `EXPOSE 8080` | no, metadata | Documentation of the port; publishing it is `docker run -p`'s job |

</div>

`COPY` reads from the
<dfn data-def="The folder whose files docker build sends to the builder; COPY can only read from it. A .dockerignore file in it excludes paths.">build context</dfn>,
the folder given to `docker build` (`.`). The whole context is sent to
the builder first, `.git` and `target/classes` included, unless a
`.dockerignore` excludes them. The VWO's `.dockerignore` lists three
paths (`/src/main/resources/environment.properties`, `.gitignore`,
`.gitlab-ci.yml`). TechOlympiad's excludes everything except the WAR,
which is all the `Dockerfile` reads.

The build cache reuses a layer when the instruction and its inputs are
unchanged. After a code change only the `COPY` layer is rebuilt. The
Tomcat layers come from the cache. This is why the slow, rarely changing
steps come first and the application last.

At startup Tomcat unpacks the WAR into `webapps/techolympiad/`. That
folder, the logs and Tomcat's `work` folder are written into the
container's own writable layer, so they disappear with the container.
The VWO's deployment does not mind: every deploy starts a fresh
container from a new image.

The VWO's image also puts a `webapps/ROOT/index.html` in place, so the
server's root URL shows a page instead of Tomcat's `404`. And it starts
`FROM tomcat:9`. That tag follows the newest JDK that Tomcat ships,
which today is Java 25, as chapter 1 noted. TechOlympiad pins `tomcat:9-jdk17`, the
image the compose file uses, so the container runs what you tested.

In .NET terms this is the `mcr.microsoft.com/dotnet/aspnet` base image
plus a `COPY` of the published output, without a build stage: the WAR
is built outside the `Dockerfile`, by Maven, in an earlier CI job.

### The VWO pipeline

GitLab reads `.gitlab-ci.yml` on every push. It defines jobs, grouped in
stages that run in order. Jobs in one stage can run in parallel.
`needs:` lets a job start as soon as the jobs it names are done. Each
job runs in a fresh container of the `image:` it names. The pieces map
one to one onto GitHub Actions (workflow, jobs, `needs`, `runs-on`
container) and Azure Pipelines (stages, jobs, `dependsOn`).

The file starts with a `spec:` header of
<dfn data-def="GitLab CI pipeline inputs: typed parameters declared in a spec: section, filled in when a pipeline is run by hand (or defaulted), and substituted with $[[ inputs.name ]] when the pipeline is created.">inputs</dfn>,
the parameters you fill in on GitLab's *Run pipeline* page:

<div class="param-table" data-param-table>

| Name | Type | Description |
|---|---|---|
| `profile` | `""\|"dev"\|"prod"` | Which `gitlab-*` Maven profile builds the WAR, and which server it is deployed to. Default empty. |
| `war_filename` | `string` | The WAR's name in `webapps`, so the context path. Default `database.war`. |
| `api_port` | `number` | The host port of the container. Default `8021`; ports 8800 to 8899 are free for extra test instances. |
| `deploy_tag` | `string` | A version to redeploy instead of building. Default empty. |

</div>

`$[[ inputs.profile ]]` is replaced when the pipeline is created, before
any job runs. The five stages:

```yaml
stages:
  - build
  - release
  - docker_build_and_push
  - deploy
  - cleanup
```

<div class="code-walk" data-code-walk>

```yaml
build_war:
  image: maven:3.9.9-eclipse-temurin-17                                    # (1)
  script:
    - 'cp /builds/vwo/api-group/api/pom-userProperties.xml.tmpl /builds/vwo/api-group/api/pom-userProperties.xml' # (2)
    - mvn clean -U package -DskipTests -Dmaven.test.skip=true versions:display-dependency-updates -f pom.xml -P gitlab-${PROFILE} # (3)
  artifacts:
    paths:
      - target/*.war
    expire_in: 10 min                                                      # (4)
release:
  image: node:18
  script:
    - npm install semantic-release @semantic-release/gitlab @semantic-release/exec
    - npx semantic-release || true                                         # (5)
    - VERSION=$(cat .version 2>/dev/null || echo "$CI_COMMIT_SHORT_SHA")
    - echo "VERSION=$VERSION" >> release.env
  artifacts:
    reports:
      dotenv: release.env                                                  # (6)
docker_build_and_push:
  image:
    name: gcr.io/kaniko-project/executor:debug                             # (7)
  script:
    - echo "{\"auths\":{\"$CI_REGISTRY\":{\"username\":\"$CI_REGISTRY_USER\",\"password\":\"$CI_REGISTRY_PASSWORD\"}}}" > /kaniko/.docker/config.json # (8)
    - /kaniko/executor --context $CI_PROJECT_DIR --dockerfile Dockerfile --build-arg WAR_FILENAME=$WAR_FILENAME --destination $CI_REGISTRY_IMAGE:$VERSION --destination $CI_REGISTRY_IMAGE:$REGISTRY_NAME # (9)
upload-docker:
  image: alpine:latest
  before_script:
    - echo "$SSH_PRIVATE_KEY" | tr -d '\r' | ssh-add -                     # (10)
  script:
    - scp -o StrictHostKeyChecking=no ${DOCKER_COMPOSE_FILE} ${SERVER_USER}@${SERVER_NAME}:/usr/local/docker/vwoapi/docker-compose-${API_PORT}.yml # (11)
    - ssh ... "docker login ... && docker compose -f docker-compose-${API_PORT}.yml pull && docker compose -f docker-compose-${API_PORT}.yml up -d" # (12)
cleanup_registry:
  script:
    - "curl --request DELETE --header 'PRIVATE-TOKEN: ...' '.../registry/repositories/$REPO_ID/tags/$CI_COMMIT_SHORT_SHA'" # (13)
```

1. A container with Maven 3.9.9 and Temurin 17: the same tools `mise.toml` pins locally, a patch version apart.
2. The parent pom is not in git (see below), so the job creates it from the template.
3. `-U` forces Maven to check for updated dependencies, `-Dmaven.test.skip=true` skips compiling the tests too, and `versions:display-dependency-updates` prints which dependencies have newer versions. `-P gitlab-${PROFILE}` picks the profile that copies the right environment file and deploys nothing.
4. The WAR is handed to later jobs as an artifact and deleted ten minutes later.
5. Computes and tags the next version. `|| true` keeps the job green when semantic-release fails, so a broken release goes unnoticed.
6. A dotenv report: `VERSION` becomes an environment variable in the jobs that `need` this one.
7. Kaniko builds images in user space, from a `Dockerfile`, without a Docker daemon. GitLab runners usually cannot run Docker inside a container without privileged mode. Kaniko avoids that need.
8. Registry credentials from GitLab's predefined variables, for this job only.
9. The image gets two tags: the version (or the commit hash when there is none) and `latest`.
10. The deploy key is a project CI/CD variable, never in the file. The same goes for `SERVER_NAME`: the job picks an environment (`development` or `production`) from the profile, and GitLab hands it that environment's variables.
11. `tomcat/docker-compose.yml` is copied to the server, one file per port, so several instances can run side by side.
12. On the server: log in to the registry, pull the image, (re)start the container. Before this the job stops and removes the old container.
13. On branches other than the default one, the commit-hash tag is deleted from the registry after the deploy, through GitLab's API with a token variable.

</div>

`tomcat/docker-compose.yml`, the file the deploy job copies, runs the
registry image as `vwo-api` (or `vwo-api-<port>`), with `TZ`,
`restart: always`, and the port mapping `${HOST_PORT:-8021}:8080`. The
image tag is `${DEPLOY_VERSION:-latest}`.

<div class="timeline" data-timeline data-title="A push to main, through the pipeline">

- **push** A commit lands on `main`. GitLab creates a pipeline; inputs take their defaults unless it was started by hand.
- **build** `build_war` runs Maven in a container and keeps `target/*.war` as an artifact.
- **release** `release` reads the commits since the last tag. A `fix:` or `feat:` among them makes it create the next tag and a GitLab release, and write the version to `.version`.
- **docker_build_and_push** Kaniko builds the image from the `Dockerfile` and pushes it as `:<version>` and `:latest`.
- **deploy** With profile `dev` or `prod`, `upload-docker` copies the compose file to the server and restarts the container from the registry.
- **cleanup** On a feature branch, `cleanup_registry` deletes the commit-hash tag again.

</div>

### What the rules really do

Reading the rules closely shows more than the comments say:

- **A push with default inputs still builds and pushes.** `profile` defaults to `""`, so Maven gets `-P gitlab-`, a profile that does not exist. Maven only warns about that, builds a WAR without `environment.properties`, and `docker_build_and_push` (whose rule is just *on a branch*) pushes the image as `:latest`. That application cannot start: `@PropertySource("classpath:environment.properties")` fails.
- **`latest` is shared by every branch.** Any branch build overwrites it, and the compose file deploys `latest` unless `DEPLOY_VERSION` is set.
- **`deploy_tag` does not pick the deployed version.** It skips the build jobs, but nothing in the file sets `DEPLOY_VERSION` for the compose command, so the deploy still pulls `latest`.
- **The log step runs locally.** `.log_docker` calls `docker exec ... tail .../restapi.log` without `ssh`, inside the Alpine job container, which has no Docker. The `|| true` behind it hides the failure.

None of this shows on a normal day, because a person starts a deploy by
hand with the right profile right after the build. It shows the day
someone does not.

### semantic-release and the VWO's three versions

`.releaserc.json`:

```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/gitlab",
    [
      "@semantic-release/exec",
      {
        "publishCmd": "echo ${nextRelease.version} > .version"
      }
    ]
  ]
}
```

<dfn data-def="A tool that computes the next version number from the commit messages since the last release tag, following semantic versioning, and then tags and publishes the release.">semantic-release</dfn>
only releases from `main`. The commit analyzer reads every commit since
the last tag in the
<dfn data-def="A commit message format: type(scope): subject, for example feat: add v2 dates or fix: close enrolment after round 1. A footer BREAKING CHANGE: marks an incompatible change.">Conventional Commits</dfn>
format: a `fix:` raises the patch number, a `feat:` the minor, a
`BREAKING CHANGE:` footer the major. A commit without such a prefix
counts for nothing. Three more plugins then do the release:

- The release notes generator writes the changelog text.
- The GitLab plugin creates the tag (`v1.4.2`) and a GitLab release. It
  needs a token variable.
- The exec plugin writes the bare version to `.version` for the
  pipeline.

Nothing writes the version back into the code: no plugin edits
`pom.xml` or `api.properties`, and there is no `@semantic-release/git`
to commit such an edit. The VWO therefore has three version numbers that
are maintained separately:

<div class="table-wrap">

| Where | VWO value | Used for |
|---|---|---|
| `pom.xml` `<version>` | `1.11a` | Maven's coordinate; in `ant.xml` the test server's file name |
| `api.properties` `apiPomVersion` | `1.11.1` | Read by Maven at `initialize`; injected into `OpenApiApplication`, which then shows `@Value("1")` in Swagger instead |
| Git tags from semantic-release | `v0.0.1`, `v0.1.0` | The Docker image tag |

</div>

Most commit subjects in the VWO's history, such as *Skip pupils without
a school in per-school counts*, have no `fix:` or `feat:`, so they never
move the tag. TechOlympiad's subjects follow the same short style, so
semantic-release would never release it either. That is fine here: we
bump by hand.

TechOlympiad keeps two numbers and keeps them equal: `pom.xml`'s
`<version>` and `apiPomVersion`, which Swagger shows since chapter 5.
Maven cannot take the `<version>` from a property file, because it reads
the model before any plugin runs, so the two are edited together.

### The parent pom and the deploy targets

The VWO's `pom.xml` has a parent:

```xml
<parent>
    <groupId>be.vwo</groupId>
    <artifactId>serverInfo</artifactId>
    <version>1.0-SNAPSHOT</version>
    <relativePath>pom-userProperties.xml</relativePath>
</parent>
```

`pom-userProperties.xml` is a `pom`-packaged project with only
properties: for each server (the jump server, a transfer server, the
production and the test API server) a user name, a host name and a path.
The real file is in `.gitignore`. The repository holds
`pom-userProperties.xml.tmpl` with the values, and the CI job copies it
into place. Maven resolves a parent through `relativePath` first, so
without that file no VWO build starts at all. Your local VWO copy has
one with every value set to `nothing`.

The properties exist for `ant.xml`. Its `copy-properties` macro is the
one TechOlympiad copied in chapter 6. The rest uploads WARs:

```xml
<target name="api-dev">
    <scp-project user="${apitest.server.username}" server="${apitest.server}" path="${apitest.server.path}"/>
</target>

<target name="api-production">
    <upload-and-restart user="${apiproduction.server.username}" server="${apiproduction.server}" path="${apiproduction.server.path}"/>
</target>
```

`scp-project` removes the old WAR on the server and copies the new one
over the jump server with `scp -o ProxyCommand='ssh ... -W %h:%p ...'`.
Then `upload-and-restart` runs `sudo service tomcat9 restart`. This is
the deployment from before Docker, with Tomcat installed on the server
itself.

The Maven profiles `dev` and `production` run these targets in the
`package` phase. So `mvn package -Pdev` on a laptop with the real
`pom-userProperties.xml` and an SSH key for the jump server builds the
WAR and replaces the one on the shared test server, without a question.
`-Pproduction` replaces production's and restarts its Tomcat. That is
why `~/bin/vwo-local-restart` says *Never use -Pdev here* and builds with
`-Pgitlab-dev`, the profile that only copies the environment file.
TechOlympiad's profiles, `local` and `production`, have no deploy step.

</div>

<div class="level drill">

### Tasks

<ul class="checklist">
<li><label><input type="checkbox"><span>Create the <code>Dockerfile</code> and <code>.dockerignore</code> in the project root.</span></label></li>
<li><label><input type="checkbox"><span>Build the WAR and the image; look at its layers with <code>docker history</code>.</span></label></li>
<li><label><input type="checkbox"><span>Run the image against the compose database and call it.</span></label></li>
<li><label><input type="checkbox"><span>Bump the version to <code>1.0.0</code> in <code>pom.xml</code> and <code>api.properties</code>, rebuild, and see it in Swagger.</span></label></li>
<li><label><input type="checkbox"><span>Add <code>.releaserc.json</code> and a reading copy of the pipeline as <code>.gitlab-ci.yml</code>. Do not add a GitLab remote.</span></label></li>
<li><label><input type="checkbox"><span>Open the VWO's <code>.gitlab-ci.yml</code>, <code>pom-userProperties.xml.tmpl</code> and <code>ant.xml</code> next to this chapter and find every piece it names.</span></label></li>
<li><label><input type="checkbox"><span>Commit and tag: <code>git add -A &amp;&amp; git commit -m "Add the Docker image and release config" &amp;&amp; git tag v1.0.0</code>.</span></label></li>
</ul>

### The image

`Dockerfile`

```dockerfile
FROM tomcat:9-jdk17

ENV TZ="Europe/Brussels"

ARG WAR_FILENAME=techolympiad.war

COPY target/techolympiadAPI.war /usr/local/tomcat/webapps/${WAR_FILENAME}

EXPOSE 8080
```

`.dockerignore`

```text
*
!target/techolympiadAPI.war
```

The first line excludes everything, the second lets the WAR back in. The
context sent to the builder shrinks from the whole project to one file.

Build the WAR, then the image:

```bash
mvn -q -DskipTests -Plocal package
docker build -t techolympiad-api .
docker history techolympiad-api
```

`docker history` lists the layers, newest first. The top rows are ours:
`EXPOSE` and `ARG` with size `0B`, the `COPY` with the WAR's size, then
`ENV`, then the rows of `tomcat:9-jdk17`. Build again without changes:
every step says `CACHED`. Change a Java file, rebuild the WAR and the
image: only the `COPY` runs.

### Run it

The compose database is on the network that compose created for the
project, `techolympiad_default`. On that network the database answers to
the name `db`, which is the host that the local environment file points
at. Start the image on that network, on a port of its own, so the
compose `api` service can keep running:

```bash
docker compose up -d db
docker run --rm --name techolympiad-image --network techolympiad_default -p 8082:8080 techolympiad-api
```

In a second terminal:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8082/techolympiad/public/swagger-ui.html
TOKEN=$(curl -s -X POST -d username=teacher -d password=teacherpass http://localhost:8082/techolympiad/public/users/login)
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8082/techolympiad/api/v1/school
```

`302` (the Swagger UI redirects to its `index.html`), then the four
schools. The application is the same. Only the WAR now lives inside the
image instead of being mounted. Stop it with `Ctrl+C`. `--rm` removes
the container.

Try the build argument: `docker build --build-arg WAR_FILENAME=ROOT.war -t techolympiad-api:root .`
and run that image. The API is now at `http://localhost:8082/api/v1/...`,
without a context path, because `ROOT.war` is Tomcat's root application.

### The version

`pom.xml`:

<div class="diff-view" data-diff-view>

```diff
     <groupId>be.techolympiad</groupId>
     <artifactId>techolympiadAPI</artifactId>
-    <version>0.1.0</version>
+    <version>1.0.0</version>
     <packaging>war</packaging>
```

</div>

`src/main/resources/api.properties`:

<div class="diff-view" data-diff-view>

```diff
-apiPomVersion=0.1.0
+apiPomVersion=1.0.0
```

</div>

Rebuild and restart the compose `api` service:

```bash
mvn -q -DskipTests -Plocal package && docker compose restart api
```

The Swagger UI's title now reads *TechOlympiad API 1.0.0*. Build the
image again too, `docker build -t techolympiad-api:1.0.0 .`: tagging the
image with the same version is what the VWO's pipeline does with the
semantic-release version.

### The release configuration

`.releaserc.json`, the VWO's file unchanged:

```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/gitlab",
    [
      "@semantic-release/exec",
      {
        "publishCmd": "echo ${nextRelease.version} > .version"
      }
    ]
  ]
}
```

`.gitlab-ci.yml`, a reading copy reduced to the jobs that need no
server. It never runs: the repository has no GitLab remote, and should
it get one, `build_war` would stop at the missing `gitlab-*` profiles.

```yaml
# Reading copy of the VWO pipeline; TechOlympiad has no GitLab remote and nothing runs this.
stages:
  - build
  - release
  - docker_build_and_push

build_war:
  stage: build
  image: maven:3.9.9-eclipse-temurin-17
  script:
    - mvn -q -DskipTests -Pproduction package
  artifacts:
    paths:
      - target/*.war
    expire_in: 10 min

release:
  stage: release
  image: node:18
  script:
    - npm install semantic-release @semantic-release/gitlab @semantic-release/exec
    - npx semantic-release
    - VERSION=$(cat .version 2>/dev/null || echo "$CI_COMMIT_SHORT_SHA")
    - echo "VERSION=$VERSION" >> release.env
  artifacts:
    reports:
      dotenv: release.env
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

docker_build_and_push:
  stage: docker_build_and_push
  image:
    name: gcr.io/kaniko-project/executor:debug
    entrypoint: [""]
  script:
    - VERSION=${VERSION:-$CI_COMMIT_SHORT_SHA}
    - echo "{\"auths\":{\"$CI_REGISTRY\":{\"username\":\"$CI_REGISTRY_USER\",\"password\":\"$CI_REGISTRY_PASSWORD\"}}}" > /kaniko/.docker/config.json
    - /kaniko/executor --context $CI_PROJECT_DIR --dockerfile Dockerfile --destination $CI_REGISTRY_IMAGE:$VERSION
  needs:
    - build_war
    - job: release
      optional: true
```

Compared with the VWO's file, three things differ:

- It builds with our `production` profile, so the WAR always has an
  environment file.
- `semantic-release` may fail the job.
- The image only gets its version tag, with no shared `latest`.

The pom has no `gitlab-*` profiles, so the reading copy uses
`production` directly. That is harmless, because our profiles deploy
nothing.

<div class="callout danger">
<div class="callout-label">When it breaks</div>

- **`COPY failed: file not found in build context: target/techolympiadAPI.war`**: you built the image before the WAR, or `.dockerignore` excludes it. Run `mvn package` first and check the `!` line.
- **The container logs `Connection refused` or `UnknownHostException: db`**: it is not on `techolympiad_default`, or the `db` service is not running. `docker network ls` shows the network's real name if your project folder has another name.
- **`port is already allocated`**: `8082` is taken. Choose another, but never `8080` or `3307`, which belong to the local VWO stack.
- **Swagger still shows `0.1.0`**: only one of the two files was changed, or the compose service still mounts the old WAR. Rebuild, then `docker compose restart api`.
- **The image runs Java 25**: the `FROM` line says `tomcat:9`. Pin `tomcat:9-jdk17`.

</div>

### Every TechOlympiad file and its VWO original

VWO paths are relative to `src/main/java/be/vwo/common` for Java and to
the repository root otherwise.

<div class="table-wrap">

| TechOlympiad | VWO original | Chapter |
|---|---|---|
| `mise.toml` | (versions spelled out in `~/bin/vwo-local-restart`) | 1 |
| `.gitignore` | `.gitignore` | 1 |
| `pom.xml` | `pom.xml` (no parent; Spring BOM instead of 18 pinned modules) | 2, 6, 8, 20, 21, 22 |
| `docker-compose.yml` | `~/Coding/vwo-local-db`, `~/bin/vwo-local-restart`, `tomcat/docker-compose.yml` | 4, 7 |
| `restAPI/OpenApiApplication.java` | `restAPI/OpenApiApplication.java` | 3, 5, 19, 20 |
| `src/main/webapp/WEB-INF/web.xml` | `src/main/webapp/WEB-INF/web.xml` | 2 |
| `api.properties`, `application.properties` | the same files | 3, 5, 22 |
| `controllers/v1/V1Config.java` | `restAPI/controllers/v1/V1Config.java` (without `OLD_BASE_URL`) | 5 |
| `ant.xml` | `ant.xml` (only `copy-properties` and the `properties-*` targets) | 6 |
| `environmentAPI.local.properties`, `.prod.properties` | `environmentAPI.dev.properties`, `.prod.properties` | 6, 8, 20, 21 |
| `db/initdb/01-schema.sql`, `02-users.sql`, `03-seed.sql` | the `VWO` schema and users in `~/Coding/vwo-local-db` | 7, 20 |
| `applicationContextAPI.xml` | `applicationContextAPI.xml` | 8, 21 |
| `hibernate_TO.cfg.xml` | `hibernate_VWO.cfg.xml` | 8 onwards |
| `Configuration.java`, `ToRoleConverter` | `Configuration.java`, `VwoRoleConverter` | 12, 20 |
| `General.java` | `General.java` | 13 |
| `dbEntities/Scholen.java` | `dbEntities/Scholen.java` | 9, 21 |
| `Persoon`, `Functies` + `FunctiesPK` | the same names | 12 |
| `WedstrijdinfoTo` + PK, `Inschrijvingsgeld` | `WedstrijdinfoVwo` + PK, `Inschrijvingsgeld` | 13 |
| `ToParticipant`, `LeerlingEersteRonde` | `VwoParticipant`, `LeerlingEersteRonde` | 14 |
| `Antwoorden` + PK, `WebsiteToWedstrijddatums` + PK | `Antwoorden` + PK, `WebsiteVwoWedstrijddatums` + PK | 15 |
| `Cesuren` + PK, `LeerlingTweedeRonde`, `LeerlingTweedeRondeFull` | the same names | 16 |
| `ApiUser`, `ApiUserRoles` + PK | the same names | 20 |
| `dao/AbstractDao`, `dao/impl/AbstractDaoImpl` | the same names | 10 |
| `dao/TechOlympiadDao`, `dao/impl/TechOlympiadDaoImpl` | `dao/VwoDao`, `dao/impl/VwoDaoImpl` | 10 |
| `dao/*Dao`, `dao/impl/*DaoImpl` | one per entity, same pattern (`LeerlingToDao` for `LeerlingVWODao`) | 10 to 17, 20 |
| `restAPI/repositories/*Repository`, `*RepositoryImpl` | `restAPI/repositories/` (`LeerlingToRepository` for `LeerlingVWORepository`, `ToContestDatesRepository` for `VwoContestDatesRepository`) | 11 to 16 |
| `restAPI/repositories/ToScoringRepositoryImpl` | none; the pattern of `KangoeroePoolsTemporaryAnswersRepositoryImpl` | 16, 21 |
| `restAPI/repositories/CacheRepository` | `restAPI/repositories/CacheRepository` | 21 |
| `restAPI/controllers/*Controller` (interfaces) | `restAPI/controllers/` | 11 onwards |
| `restAPI/controllers/v1/*`, `v2/*`, `V2Config` | `restAPI/controllers/v1/*`, `v2/*`, `V2Config` | 11 onwards, 19 |
| `restAPI/models/*` | `restAPI/models/*` (`PupilData`, `PupilAnswers`) | 14, 16 |
| `restAPI/ErrorAdvice`, `NotFoundException`, `RoundClosedException` | `restAPI/ErrorAdvice`, `IllegalQuestionTypeException`, `TeamException` | 18 |
| `security/*`, `security/jwt/*` | `security/*`, `security/jwt/*` (without `Application`, `InMemoryUsers`, `SecuredUsersController`, `simple/`) | 20 |
| `ehcache.xml`, `log4j2.xml` | the same files | 21 |
| `Dockerfile`, `.dockerignore` | the same files | 22 |
| `.releaserc.json`, `.gitlab-ci.yml` | the same files (ours a reduced reading copy) | 22 |

</div>

Left out on purpose: `pom-userProperties.xml(.tmpl)`, the deploy
targets of `ant.xml`, `restAPI/SpringSecurityConfig`, `AuthTokenSecurityConfig`,
`PreAuthTokenHeaderFilter`, `SwaggerConfig`, `SpringBootApplication2`,
`VWOQueryFactory*`, `ehcache-failsafe.xml`, `c3p0.properties`,
`webapp/META-INF/context.xml` and `WEB-INF/dispatcher-servlet.xml`.

### Reading the rest of the VWO API

Everything left is built from the pieces you have now built yourself.
Some places to start, with what to look for:

- **Kangoeroe pools and teams.** `KangoeroePoolsParticipantsController` and `TeamController`, their repositories `PoolsRepositoryImpl`, `TeamsRepositoryImpl` and `KangoeroeTeamsTemporaryAnswersRepositoryImpl`. You will recognise the multi-DAO transactions of chapter 16, `TeamException` and `IllegalQuestionTypeException` from chapter 18, and the interface-local `@ExceptionHandler` for `NoSuchElementException`.
- **Invoicing.** `InvoiceController`, `InvoiceRepositoryImpl` and the `Betalingen*` and `ScholenFacturatie` entities. `SchoolController.updateInvoiceData` takes a record body. Read it with chapter 13's records and chapter 17's native SQL in mind.
- **The digital contest (usolv-it).** The `usolvit-codes` endpoints of `VwoParticipantsController`, `LeerlingVWORepositoryImpl.createUsolvitCodes` and the `LeerlingVwoUsolvit*` entities. `findByUsolvitCode` is the method with the `@Cacheable` that fails, from chapter 21.
- **Surveys, documents, certificates and reports.** The `Enquetes*`/`Survey*` controllers, `DocumentsController`, `CertificatesController`, `ReportsController`: the same interface-plus-versioned-class pattern, sometimes with `v1` and `v2` classes of different names.
- **The shape of the whole.** `hibernate_VWO.cfg.xml` lists every entity. Its `<mapping>` lines give a tour of the database. For each entity, the DAO, the repository and the controller sit where TechOlympiad taught you to look.

### Quiz

<div class="quiz" data-quiz>
<p class="quiz-q">You change one controller, rebuild the WAR and run <code>docker build</code> again. Which steps run?</p>
<ol class="quiz-options">
<li>All of them: any change invalidates the whole image<p class="quiz-whynot">The cache works per instruction; only the first changed one and those after it run again.</p></li>
<li data-correct>Only the <code>COPY</code> of the WAR; <code>FROM</code>, <code>ENV</code> and <code>ARG</code> come from the cache<p class="quiz-why">The input of <code>COPY</code>, the WAR file, changed. Nothing before it did.</p></li>
<li>None: Docker only looks at the <code>Dockerfile</code><p class="quiz-whynot"><code>COPY</code> checksums the files it copies, so a new WAR is noticed.</p></li>
</ol>
<p class="quiz-explain">That is why the application goes last in a <code>Dockerfile</code>: the large, stable layers are reused on every build.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">On a laptop with the real <code>pom-userProperties.xml</code> and a working SSH key, you run <code>mvn package -Pdev</code> in the VWO project. What happens?</p>
<ol class="quiz-options">
<li>A WAR with the development settings in <code>target/</code>, nothing more<p class="quiz-whynot">That is what <code>-Pgitlab-dev</code> does. <code>dev</code> has a second execution in the <code>package</code> phase.</p></li>
<li data-correct>The WAR is built and copied over the jump server onto the shared test server, replacing what runs there<p class="quiz-why">The profile runs <code>ant.xml</code>'s <code>api-dev</code> target at <code>package</code>, which removes the old WAR and uploads the new one.</p></li>
<li>The GitLab pipeline starts<p class="quiz-whynot">Maven does not talk to GitLab; the upload goes straight to the server with <code>scp</code>.</p></li>
</ol>
<p class="quiz-explain">Locally, build the VWO with <code>-Pgitlab-dev</code>, as <code>vwo-local-restart</code> does.</p>
</div>

<div class="quiz" data-quiz>
<p class="quiz-q">Every commit since the last tag on <code>main</code> has a subject like <code>Add error handling</code>. What does the VWO's <code>release</code> job do?</p>
<ol class="quiz-options">
<li>Bumps the patch version, because there are new commits<p class="quiz-whynot">The commit analyzer only counts commits with a type such as <code>fix:</code> or <code>feat:</code>.</p></li>
<li data-correct>No release; <code>.version</code> is not written, and the image is tagged with the commit hash<p class="quiz-why">Without a releasable commit there is no next version, and the job falls back to <code>$CI_COMMIT_SHORT_SHA</code>.</p></li>
<li>The job fails and stops the pipeline<p class="quiz-whynot">No release is not an error, and the <code>|| true</code> would hide one anyway.</p></li>
</ol>
<p class="quiz-explain">semantic-release only works with a commit convention that the whole team follows.</p>
</div>

### Flashcards

<div class="flashcards" data-flashcards data-front-label="Term" data-back-label="Meaning">
<div class="card"><div class="front">Image layer</div><div class="back">The files one <code>Dockerfile</code> instruction added. Cached and shared while its inputs do not change.</div></div>
<div class="card"><div class="front">Build context</div><div class="back">What <code>docker build</code> sends to the builder; <code>COPY</code> can only read from it. Trimmed by <code>.dockerignore</code>.</div></div>
<div class="card"><div class="front">Kaniko</div><div class="back">Builds and pushes images from a <code>Dockerfile</code> without a Docker daemon; the VWO's image builder in CI.</div></div>
<div class="card"><div class="front">Pipeline inputs</div><div class="back"><code>spec: inputs:</code> in <code>.gitlab-ci.yml</code>, substituted as <code>$[[ inputs.name ]]</code> when the pipeline is created.</div></div>
<div class="card"><div class="front">dotenv report</div><div class="back">A job artifact whose <code>KEY=value</code> lines become variables in the jobs that need it; how <code>VERSION</code> travels.</div></div>
<div class="card"><div class="front">semantic-release</div><div class="back">Next version from Conventional Commits since the last tag: <code>fix</code> patch, <code>feat</code> minor, <code>BREAKING CHANGE</code> major.</div></div>
<div class="card"><div class="front"><code>pom-userProperties.xml</code></div><div class="back">The VWO's parent pom: server names and paths for <code>ant.xml</code>; git-ignored, created from <code>.tmpl</code> in CI.</div></div>
</div>

### Self-checks

<details class="qa">
<summary>Self-check: the image works on port 8082 next to the compose service on 8081. Why can both reach the database as <code>db</code>?</summary>
<div class="ans">
Both containers are on the network <code>techolympiad_default</code>, where Docker's DNS resolves the compose service name <code>db</code>. The port mappings only concern the host; inside, both Tomcats listen on 8080 in their own containers.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<details class="qa">
<summary>Self-check: why does the VWO have three version numbers, and which one does a client see?</summary>
<div class="ans">
<code>pom.xml</code>, <code>api.properties</code> and the semantic-release tag are maintained separately, because no step writes the released version back into the code. The image carries the tag; Swagger shows the hard-coded <code>"1"</code> from <code>@Value("1")</code>.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<details class="qa">
<summary>Self-check: what does the VWO pipeline need from GitLab that is not in the repository?</summary>
<div class="ans">
The registry credentials (predefined <code>CI_REGISTRY*</code> variables), the SSH deploy key and server name per environment, the token for semantic-release's GitLab plugin and for the registry cleanup. All are CI/CD variables, and none belong in a file.
<div class="mark"><button type="button">Mark as known</button></div>
</div>
</details>

<button type="button" data-mark-done>Mark this chapter done</button>

</div>
