# Database Schema

This diagram covers all 94 @Entity tables under be.vwo.common.dbEntities, mapped onto a single MariaDB schema through Hibernate, spanning ten loose domains such as people and auth, schools, the VWO and Kangoeroe contests, payments, surveys, and USolvit platform integration. Some tables are read-only Hibernate entities backed by SQL views rather than base tables, and many join tables have no object-level relationship annotation, so the foreign key exists only as a matching column name by convention.

<iframe src="assets/walkthrough-db-schema.html" style="width:100%;height:85vh;border:0;border-radius:8px;" title="Database Schema walkthrough"></iframe>
