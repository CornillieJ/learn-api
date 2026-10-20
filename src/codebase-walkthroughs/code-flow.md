# Code Flow

<div class="wt-intro">
<p class="wt-kicker">Interactive diagram · Request trace</p>

This walkthrough traces a single request through the app:

1. A stateless JWT filter gates every call.
2. A thin versioned controller delegates to shared interface logic.
3. That logic calls a hand-written repository facade, which sits on top of an older Hibernate DAO layer.
4. The DAO layer talks to two Hibernate SessionFactories: one for read-write and one for read-only access.

A legacy Spring XML file wires the two SessionFactories. Maven swaps in the database credentials at build time. A Spring profile does not do this.

<ul class="wt-tips"><li>Follow one request top to bottom</li><li>Click a node to open its detail panel</li><li>Drag to pan, scroll to zoom</li></ul>
</div>

<figure class="wt-frame">
<div class="wt-bar"><span class="wt-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="wt-title">vwo-api · Code Flow</span><a class="wt-open" href="assets/walkthrough-code-flow.html" target="_blank" rel="noopener">Open full screen ↗</a></div>
<iframe src="assets/walkthrough-code-flow.html" title="Code Flow walkthrough" loading="lazy"></iframe>
</figure>
