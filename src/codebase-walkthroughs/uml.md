# UML

This diagram maps the class-level structure of the API: a generic Hibernate DAO hierarchy running from AbstractDao through VwoDao to around 60 per-entity DAOs, alongside a repository facade that looks like Spring Data but only forwards calls to those DAOs. Controllers follow a third pattern, where version-less interfaces hold the real logic as default methods and thin v1/v2 classes just implement them. Solid double-line edges mean extends, dashed edges mean implements, and plain arrows mean uses or delegates.

<iframe src="assets/walkthrough-uml.html" style="width:100%;height:85vh;border:0;border-radius:8px;" title="UML walkthrough"></iframe>
