# Database Schema

<div class="wt-intro">
<p class="wt-kicker">Interactive diagram · Entity map</p>

This diagram covers all 94 @Entity tables under be.vwo.common.dbEntities. Hibernate maps them onto a single MariaDB schema. The tables fall into ten loose domains, such as people and auth, schools, the VWO and Kangoeroe contests, payments, surveys, and USolvit platform integration. Some tables are read-only Hibernate entities that read from SQL views instead of base tables. Many join tables have no object-level relationship annotation. For those tables, the foreign key exists only by convention, as a matching column name.

<ul class="wt-tips"><li>Click a table to open its detail panel</li><li>Drag to pan, scroll to zoom</li></ul>
</div>

<figure class="wt-frame">
<div class="wt-bar"><span class="wt-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="wt-title">vwo-api · Database Schema</span><a class="wt-open" href="assets/walkthrough-db-schema.html" target="_blank" rel="noopener">Open full screen ↗</a></div>
<iframe src="assets/walkthrough-db-schema.html" title="Database Schema walkthrough" loading="lazy"></iframe>
</figure>
