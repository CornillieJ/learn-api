# Tips: Learning Any New Stack

Collected from web searches; each source's status is marked. Every tip ends with a note on how it applies to this project.

Sources: [How to Learn a New Language or Framework: Tips and Strategies, DEV (nathlowe)](https://dev.to/nathlowe/how-to-learn-a-new-language-or-framework-tips-and-strategies-1d5f) ✅ · [10 ways to learn a new technology, Java67](https://www.java67.com/2017/12/10-ways-to-learn-new-technology-programming-language-or-framework.html) ⚠️ not read.

1. **Set a concrete objective** (project, job task, upskilling). → *Objective:* "I can trace and safely change one endpoint end-to-end in `vwo-api`."

2. **Learn through a real project, not passive watching.** → Every step in the learning path ends in a repo exercise.

3. **Combine resources:** docs, courses, books, community. → Videos plus the official 5.3/5.6/5.7 docs plus the Knowledge File.

4. **Concepts before syntax:** *why and how* to use a framework matters more than memorised syntax. → Understand DI, transactions, the servlet lifecycle first; look up annotations as needed.

5. **Practise consistently in small sessions.** → 30-45 min/day tracing one endpoint beats a weekend cram.

6. **Understand architecture, not just syntax:** what separates proficient from beginner (the DEV article's own example is SSR vs SSG in Next.js). → *This project:* the "architecture" is the WAR/Tomcat model, two SessionFactories, the shared-interface controllers.

7. Search summaries also recommend reading others' code critically, writing tests, and preferring official docs (snippet-level; not independently checked). → The repo has no tests; a small test around one DAO/repository method against a dev DB is both a learning exercise and real value.
