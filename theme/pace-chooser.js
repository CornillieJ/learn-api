(function () {
  var STEP_HOURS = [
    { label: 'Steps 1-2: Java syntax + Maven', hours: 6 },
    { label: 'Step 3: Spring core, MVC, WAR', hours: 8 },
    { label: 'Step 4: Persistence (Hibernate & HQL)', hours: 6 },
    { label: 'Step 5: Spring Security', hours: 3 },
    { label: 'Step 6: Lombok', hours: 2 },
  ];
  var TOTAL_HOURS = STEP_HOURS.reduce(function (sum, s) { return sum + s.hours; }, 0);

  // Split step hours across weeks: a step bigger than what's left of the
  // week's budget carries over into the next week(s) as "part k/n".
  function computeSchedule(input) {
    var hoursPerWeek = input.hoursPerWeek, weeksAvailable = input.weeksAvailable;
    if (!(hoursPerWeek > 0) || !(weeksAvailable > 0)) {
      return { weeks: [], totalHours: TOTAL_HOURS, capacityHours: 0, warning: 'Enter a positive number of hours and weeks.' };
    }
    var capacityHours = hoursPerWeek * weeksAvailable;
    var EPS = 1e-9;
    var weeks = [];
    var stepIdx = 0;
    var leftInStep = STEP_HOURS.length ? STEP_HOURS[0].hours : 0;
    var partsSoFar = STEP_HOURS.map(function () { return 0; });
    for (var w = 1; w <= weeksAvailable && stepIdx < STEP_HOURS.length; w++) {
      var budget = hoursPerWeek;
      var segments = [];
      while (budget > EPS && stepIdx < STEP_HOURS.length) {
        var take = Math.min(budget, leftInStep);
        partsSoFar[stepIdx]++;
        segments.push({ step: stepIdx, label: STEP_HOURS[stepIdx].label, hours: round1(take), part: partsSoFar[stepIdx] });
        budget -= take;
        leftInStep -= take;
        if (leftInStep <= EPS) {
          stepIdx++;
          leftInStep = stepIdx < STEP_HOURS.length ? STEP_HOURS[stepIdx].hours : 0;
        }
      }
      weeks.push({ week: w, segments: segments, hours: round1(hoursPerWeek - Math.max(0, budget)) });
    }
    // A step cut off by the end of the timeline still has an unscheduled part.
    if (stepIdx < STEP_HOURS.length && partsSoFar[stepIdx] > 0) partsSoFar[stepIdx]++;
    // Now that every step's part count is known, label split steps.
    weeks.forEach(function (wk) {
      wk.segments.forEach(function (seg) {
        seg.parts = partsSoFar[seg.step];
        seg.text = seg.parts > 1 ? seg.label + ' (part ' + seg.part + '/' + seg.parts + ')' : seg.label;
      });
      wk.focus = wk.segments.map(function (seg) { return seg.text; });
    });
    var unscheduled = [];
    if (stepIdx < STEP_HOURS.length) {
      unscheduled.push({ step: stepIdx, label: STEP_HOURS[stepIdx].label, hours: round1(leftInStep) });
      for (var k = stepIdx + 1; k < STEP_HOURS.length; k++) unscheduled.push({ step: k, label: STEP_HOURS[k].label, hours: STEP_HOURS[k].hours });
    }
    var warning = null;
    var shortfall = TOTAL_HOURS - capacityHours;
    if (shortfall > 0) {
      warning = 'At ' + hoursPerWeek + 'h/week for ' + weeksAvailable + ' week(s) you have ' + capacityHours + 'h, but the path needs ' + TOTAL_HOURS + 'h. Add about ' + Math.ceil(shortfall) + 'h more by raising your weekly hours or extending the timeline.';
    }
    return { weeks: weeks, totalHours: TOTAL_HOURS, capacityHours: capacityHours, warning: warning, unscheduled: unscheduled, weeksNeeded: Math.ceil(TOTAL_HOURS / hoursPerWeek - EPS) };
  }

  function round1(x) { return Math.round(x * 10) / 10; }

  var STEP_COLORS = ['#EC008C', '#1a8fbf', '#26A99E', '#e3a008', '#8e6cf0'];

  function render(widget, result) {
    var el = widget.querySelector('.pc-result');
    if (!el) return;
    if (!result.weeks.length && !result.warning) { el.innerHTML = ''; return; }
    var perWeek = +widget.querySelector('#pcHours').value || 1;
    var html = '';
    if (result.weeks.length) {
      var finished = !result.unscheduled.length;
      html += '<div class="pc-summary">' +
        '<div class="pc-stat"><strong>' + result.totalHours + 'h</strong><span>total path</span></div>' +
        '<div class="pc-stat"><strong>' + (finished ? result.weeks.length : result.weeksNeeded) + '</strong><span>weeks ' + (finished ? 'to finish' : 'needed') + '</span></div>' +
        '<div class="pc-stat ' + (finished ? 'ok' : 'warn') + '"><strong>' + (finished ? 'On track' : 'Short ' + Math.ceil(result.totalHours - result.capacityHours) + 'h') + '</strong><span>' + result.capacityHours + 'h available</span></div></div>';
    }
    html += '<ol class="pc-timeline">' + result.weeks.map(function (w) {
      return '<li class="pc-week"><span class="pc-wk">Week ' + w.week + '</span><span class="pc-track">' +
        w.segments.map(function (seg) {
          var pct = 100 * seg.hours / perWeek;
          return '<span class="pc-seg" style="flex-basis:' + pct + '%;--seg:' + STEP_COLORS[seg.step % STEP_COLORS.length] + '" title="' + seg.text + ': ' + seg.hours + 'h">' +
            '<span class="pc-seg-label">' + shortLabel(seg) + '</span><span class="pc-seg-h">' + seg.hours + 'h</span></span>';
        }).join('') + '</span></li>';
    }).join('') + '</ol>';
    if (result.unscheduled && result.unscheduled.length) {
      html += '<div class="pc-overflow"><span class="pc-wk">Left over</span><span class="pc-overflow-list">' + result.unscheduled.map(function (u) {
        return '<span class="pc-chip" style="--seg:' + STEP_COLORS[u.step % STEP_COLORS.length] + '">' + u.label.replace(/:.*/, '') + ' &middot; ' + u.hours + 'h</span>';
      }).join('') + '</span></div>';
    }
    html += '<ul class="pc-legend">' + STEP_HOURS.map(function (s, i) {
      return '<li><span class="pc-swatch" style="--seg:' + STEP_COLORS[i % STEP_COLORS.length] + '"></span>' + s.label + ' <em>' + s.hours + 'h</em></li>';
    }).join('') + '</ul>';
    if (result.warning) html += '<p class="pc-warning">' + result.warning + '</p>';
    el.innerHTML = html;
  }

  function shortLabel(seg) {
    var base = seg.label.replace(/:.*/, '');
    return seg.parts > 1 ? base + ' \u00b7 ' + seg.part + '/' + seg.parts : base;
  }

  function wire() {
    var widget = document.querySelector('[data-pace-chooser]');
    if (!widget) return;
    var hours = widget.querySelector('#pcHours');
    var weeks = widget.querySelector('#pcWeeks');
    function run() {
      var result = computeSchedule({ hoursPerWeek: +hours.value, weeksAvailable: +weeks.value });
      widget.querySelectorAll('output')[0].textContent = hours.value + 'h';
      widget.querySelectorAll('output')[1].textContent = weeks.value + ' wk';
      render(widget, result);
    }
    hours.addEventListener('input', run);
    weeks.addEventListener('input', run);
    run();
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', wire);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { computeSchedule: computeSchedule, TOTAL_HOURS: TOTAL_HOURS, STEP_HOURS: STEP_HOURS };
  }
})();
