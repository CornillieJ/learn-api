# UML

<div class="wt-intro">
<p class="wt-kicker">Interactive diagram · Class diagram</p>

This diagram maps the class-level structure of the API: a generic Hibernate DAO hierarchy running from AbstractDao through VwoDao to around 60 per-entity DAOs, alongside a repository facade that looks like Spring Data but only forwards calls to those DAOs. Controllers follow a third pattern, where version-less interfaces hold the real logic as default methods and thin v1/v2 classes just implement them. Solid double-line edges mean extends, dashed edges mean implements, and plain arrows mean uses or delegates.

<ul class="wt-tips"><li>Click a class to open its detail panel</li><li>Double line = extends, dashed = implements</li><li>Drag to pan, scroll to zoom</li></ul>
</div>

<figure class="wt-frame">
<div class="wt-bar"><span class="wt-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="wt-title">vwo-api · UML</span><a class="wt-open" href="assets/walkthrough-uml.html" target="_blank" rel="noopener">Open full screen ↗</a></div>
<iframe src="assets/walkthrough-uml.html" title="UML walkthrough" loading="lazy"></iframe>
</figure>
