# Code Flow

This walkthrough traces a single request through the app: a stateless JWT filter gates every call, a thin versioned controller delegates to shared interface logic, and that logic calls a hand-written repository facade sitting on top of an older Hibernate DAO layer. The DAO layer talks to two Hibernate SessionFactories for read-write and read-only access, wired from a legacy Spring XML file, with database credentials swapped in at Maven build time rather than through a Spring profile.

<iframe src="assets/walkthrough-code-flow.html" style="width:100%;height:85vh;border:0;border-radius:8px;" title="Code Flow walkthrough"></iframe>
