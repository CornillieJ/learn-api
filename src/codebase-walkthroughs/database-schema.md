# Database Schema

<div class="wt-intro">
<p class="wt-kicker">Interactive diagram · Entity map</p>

This diagram covers all 94 @Entity tables under be.vwo.common.dbEntities, mapped onto a single MariaDB schema through Hibernate, spanning ten loose domains such as people and auth, schools, the VWO and Kangoeroe contests, payments, surveys, and USolvit platform integration. Some tables are read-only Hibernate entities backed by SQL views rather than base tables, and many join tables have no object-level relationship annotation, so the foreign key exists only as a matching column name by convention.

<ul class="wt-tips"><li>Click a table to open its detail panel</li><li>Drag to pan, scroll to zoom</li></ul>
</div>

<figure class="wt-frame">
<div class="wt-bar"><span class="wt-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="wt-title">vwo-api · Database Schema</span><a class="wt-open" href="assets/walkthrough-db-schema.html" target="_blank" rel="noopener">Open full screen ↗</a></div>
<iframe src="assets/walkthrough-db-schema.html" title="Database Schema walkthrough" loading="lazy"></iframe>
</figure>
