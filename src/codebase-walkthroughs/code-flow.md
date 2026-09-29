# Code Flow

<div class="wt-intro">
<p class="wt-kicker">Interactive diagram · Request trace</p>

This walkthrough traces a single request through the app: a stateless JWT filter gates every call, a thin versioned controller delegates to shared interface logic, and that logic calls a hand-written repository facade sitting on top of an older Hibernate DAO layer. The DAO layer talks to two Hibernate SessionFactories for read-write and read-only access, wired from a legacy Spring XML file, with database credentials swapped in at Maven build time rather than through a Spring profile.

<ul class="wt-tips"><li>Follow one request top to bottom</li><li>Click a node to open its detail panel</li><li>Drag to pan, scroll to zoom</li></ul>
</div>

<figure class="wt-frame">
<div class="wt-bar"><span class="wt-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="wt-title">vwo-api · Code Flow</span><a class="wt-open" href="assets/walkthrough-code-flow.html" target="_blank" rel="noopener">Open full screen ↗</a></div>
<iframe src="assets/walkthrough-code-flow.html" title="Code Flow walkthrough" loading="lazy"></iframe>
</figure>
