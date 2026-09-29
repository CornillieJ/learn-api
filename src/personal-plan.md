# A Short Personal Plan

Six milestones. Each has a **done when** so you know when to move on.
Tick them off; the boxes are remembered in this browser.

<ul class="checklist">
<li><label><input type="checkbox"><span><strong>Set up.</strong> Install a JDK (21 or newer recommended, Knowledge File §14.1), Maven, and IntelliJ with the Lombok plugin and annotation processing enabled. <em>Done when</em> <code>ApiUser</code> shows no red "cannot find symbol" errors.</span></label></li>
<li><label><input type="checkbox"><span><strong>Steps 1-2.</strong> Build the WAR with <code>-P gitlab-dev</code>. <em>Done when</em> <code>target/</code> holds a WAR and you can say which <code>environment.properties</code> is inside it.</span></label></li>
<li><label><input type="checkbox"><span><strong>Step 3 (3.1, 3.4-3.7).</strong> Trace <code>GET /api/v2/school/{id}</code> completely. <em>Done when</em> you can name every bean on the way and the full URL on a <code>database.war</code> deployment.</span></label></li>
<li><label><input type="checkbox"><span><strong>Step 4.</strong> Write one new read-only HQL query in a scratch branch. <em>Done when</em> it runs against a dev DB on <code>transactionR</code> with a named parameter.</span></label></li>
<li><label><input type="checkbox"><span><strong>Step 5.</strong> With Knowledge File §10 open, run the JWT <code>curl</code> example (§10.1) against a dev instance. <em>Done when</em> you've seen both the authorised response and the rejection without a token.</span></label></li>
<li><label><input type="checkbox"><span><strong>Ongoing.</strong> Listen to the Step 7 podcasts while commuting and add each unfamiliar term to Knowledge File §21. <em>Done when</em> you pass the <a href="final-challenge.html">Final Challenge</a>.</span></label></li>
</ul>

<div class="callout note">
<div class="callout-label">How long?</div>
Use the pace chooser in <a href="how-to-use-this-guide.html">How to Use This Guide</a>
to turn your hours per week into a week-by-week schedule.
</div>
