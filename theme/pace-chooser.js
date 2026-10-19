// Pace chooser: two sliders (hours per week, weeks available) turn a list of
// tasks into a week-by-week plan. Tasks come from a (hidden) list:
//
//   <div class="pace-chooser" data-pace-chooser>
//   <ul class="pc-tasks">
//   <li data-hours="6">Part 1: Basics</li>
//   <li data-hours="8">Part 2: Going deeper</li>
//   </ul>
//   </div>
//
// Text before a colon ("Part 1") is the short label drawn inside the bars;
// set data-short on an <li> to choose it yourself. A task bigger than what is
// left of a week spills into the next week(s) as "part 1/2", "part 2/2".
// Optional on the container: data-max-hours (15), data-max-weeks (12),
// data-default-hours (4), data-default-weeks (4).
(function () {
  function round1(x) { return Math.round(x * 10) / 10; }

  // Pure: raw {label, hours, short} -> clean tasks (bad/zero hours dropped).
  function parseTasks(raw) {
    var out = [];
    (raw || []).forEach(function (r) {
      var hours = parseFloat(r.hours);
      var label = String(r.label || '').replace(/\s+/g, ' ').trim();
      if (!(hours > 0) || !label) return;
      var short = String(r.short || '').trim() || label.replace(/:.*/, '').trim() || label;
      out.push({ label: label, hours: hours, short: short });
    });
    return out;
  }

  function totalHours(tasks) {
    return round1(tasks.reduce(function (sum, s) { return sum + s.hours; }, 0));
  }

  // Split task hours across weeks: a task bigger than what's left of the
  // week's budget carries over into the next week(s) as "part k/n".
  function computeSchedule(input, tasks) {
    tasks = tasks || [];
    var TOTAL = totalHours(tasks);
    var hoursPerWeek = input.hoursPerWeek, weeksAvailable = input.weeksAvailable;
    if (!(hoursPerWeek > 0) || !(weeksAvailable > 0)) {
      return { weeks: [], totalHours: TOTAL, capacityHours: 0, warning: 'Enter a positive number of hours and weeks.', unscheduled: [], weeksNeeded: 0 };
    }
    var capacityHours = hoursPerWeek * weeksAvailable;
    var EPS = 1e-9;
    var weeks = [];
    var idx = 0;
    var leftInTask = tasks.length ? tasks[0].hours : 0;
    var partsSoFar = tasks.map(function () { return 0; });
    for (var w = 1; w <= weeksAvailable && idx < tasks.length; w++) {
      var budget = hoursPerWeek;
      var segments = [];
      while (budget > EPS && idx < tasks.length) {
        var take = Math.min(budget, leftInTask);
        partsSoFar[idx]++;
        segments.push({ step: idx, label: tasks[idx].label, short: tasks[idx].short, hours: round1(take), part: partsSoFar[idx] });
        budget -= take;
        leftInTask -= take;
        if (leftInTask <= EPS) {
          idx++;
          leftInTask = idx < tasks.length ? tasks[idx].hours : 0;
        }
      }
      weeks.push({ week: w, segments: segments, hours: round1(hoursPerWeek - Math.max(0, budget)) });
    }
    // A task cut off by the end of the timeline still has an unscheduled part.
    if (idx < tasks.length && partsSoFar[idx] > 0) partsSoFar[idx]++;
    // Now that every task's part count is known, label split tasks.
    weeks.forEach(function (wk) {
      wk.segments.forEach(function (seg) {
        seg.parts = partsSoFar[seg.step];
        seg.text = seg.parts > 1 ? seg.label + ' (part ' + seg.part + '/' + seg.parts + ')' : seg.label;
      });
      wk.focus = wk.segments.map(function (seg) { return seg.text; });
    });
    var unscheduled = [];
    if (idx < tasks.length) {
      unscheduled.push({ step: idx, label: tasks[idx].label, short: tasks[idx].short, hours: round1(leftInTask) });
      for (var k = idx + 1; k < tasks.length; k++) unscheduled.push({ step: k, label: tasks[k].label, short: tasks[k].short, hours: tasks[k].hours });
    }
    var warning = null;
    var shortfall = TOTAL - capacityHours;
    if (shortfall > EPS) {
      warning = 'At ' + hoursPerWeek + 'h/week for ' + weeksAvailable + ' week' + (weeksAvailable === 1 ? '' : 's') + ' you have ' + capacityHours + 'h, but the plan needs ' + TOTAL + 'h. Add about ' + Math.ceil(shortfall) + 'h more by raising your weekly hours or extending the timeline.';
    }
    return { weeks: weeks, totalHours: TOTAL, capacityHours: capacityHours, warning: warning, unscheduled: unscheduled, weeksNeeded: Math.ceil(TOTAL / hoursPerWeek - EPS) };
  }

  var N_COLORS = 6; // --pc-c0 .. --pc-c5 in interactive.css
  function segColor(i) { return 'var(--pc-c' + (i % N_COLORS) + ')'; }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function shortLabel(seg) {
    return seg.parts > 1 ? seg.short + ' · ' + seg.part + '/' + seg.parts : seg.short;
  }

  function render(el, result, tasks, perWeek) {
    if (!result.weeks.length && !result.warning) { el.innerHTML = ''; return; }
    var html = '';
    if (result.weeks.length) {
      var finished = !result.unscheduled.length;
      html += '<div class="pc-summary">' +
        '<div class="pc-stat"><strong>' + result.totalHours + 'h</strong><span>in total</span></div>' +
        '<div class="pc-stat"><strong>' + (finished ? result.weeks.length : result.weeksNeeded) + '</strong><span>weeks ' + (finished ? 'to finish' : 'needed') + '</span></div>' +
        '<div class="pc-stat ' + (finished ? 'ok' : 'warn') + '"><strong>' + (finished ? 'On track' : 'Short ' + Math.ceil(result.totalHours - result.capacityHours) + 'h') + '</strong><span>' + result.capacityHours + 'h available</span></div></div>';
    }
    html += '<ol class="pc-timeline">' + result.weeks.map(function (w) {
      return '<li class="pc-week"><span class="pc-wk">Week ' + w.week + '</span><span class="pc-track">' +
        w.segments.map(function (seg) {
          var pct = 100 * seg.hours / perWeek;
          return '<span class="pc-seg" style="flex-basis:' + pct + '%;--seg:' + segColor(seg.step) + '" title="' + escapeHtml(seg.text) + ': ' + seg.hours + 'h">' +
            '<span class="pc-seg-label">' + escapeHtml(shortLabel(seg)) + '</span><span class="pc-seg-h">' + seg.hours + 'h</span></span>';
        }).join('') + '</span></li>';
    }).join('') + '</ol>';
    if (result.unscheduled && result.unscheduled.length) {
      html += '<div class="pc-overflow"><span class="pc-wk">Left over</span><span class="pc-overflow-list">' + result.unscheduled.map(function (u) {
        return '<span class="pc-chip" style="--seg:' + segColor(u.step) + '">' + escapeHtml(u.short) + ' &middot; ' + u.hours + 'h</span>';
      }).join('') + '</span></div>';
    }
    html += '<ul class="pc-legend">' + tasks.map(function (s, i) {
      return '<li><span class="pc-swatch" style="--seg:' + segColor(i) + '"></span>' + escapeHtml(s.label) + ' <em>' + s.hours + 'h</em></li>';
    }).join('') + '</ul>';
    if (result.warning) html += '<p class="pc-warning">' + escapeHtml(result.warning) + '</p>';
    el.innerHTML = html;
  }

  function num(v, fallback) {
    var n = parseInt(v, 10);
    return n > 0 ? n : fallback;
  }

  var count = 0;
  function wireOne(widget) {
    var list = widget.querySelector('.pc-tasks');
    if (!list) return;
    var tasks = parseTasks(Array.prototype.map.call(list.querySelectorAll('li'), function (li) {
      return { label: li.textContent, hours: li.getAttribute('data-hours'), short: li.getAttribute('data-short') };
    }));
    if (!tasks.length) return;
    var n = count++;
    var maxH = num(widget.getAttribute('data-max-hours'), 15);
    var maxW = num(widget.getAttribute('data-max-weeks'), 12);
    var defH = Math.min(maxH, num(widget.getAttribute('data-default-hours'), 4));
    var defW = Math.min(maxW, num(widget.getAttribute('data-default-weeks'), 4));
    widget.classList.add('pc-ready');
    var controls = document.createElement('div');
    controls.className = 'pc-controls';
    controls.innerHTML =
      '<div class="pc-row"><label for="pcHours' + n + '">Hours per week</label><input type="range" id="pcHours' + n + '" min="1" max="' + maxH + '" value="' + defH + '"><output for="pcHours' + n + '"></output></div>' +
      '<div class="pc-row"><label for="pcWeeks' + n + '">Weeks available</label><input type="range" id="pcWeeks' + n + '" min="1" max="' + maxW + '" value="' + defW + '"><output for="pcWeeks' + n + '"></output></div>';
    var result = document.createElement('div');
    result.className = 'pc-result';
    result.setAttribute('aria-live', 'polite');
    widget.appendChild(controls);
    widget.appendChild(result);
    var hours = controls.querySelector('#pcHours' + n);
    var weeks = controls.querySelector('#pcWeeks' + n);
    var outs = controls.querySelectorAll('output');
    function run() {
      var h = +hours.value, w = +weeks.value;
      outs[0].textContent = h + 'h';
      outs[1].textContent = w + ' wk';
      render(result, computeSchedule({ hoursPerWeek: h, weeksAvailable: w }, tasks), tasks, h || 1);
    }
    hours.addEventListener('input', run);
    weeks.addEventListener('input', run);
    run();
  }

  function wire() {
    document.querySelectorAll('[data-pace-chooser]').forEach(wireOne);
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', wire);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { computeSchedule: computeSchedule, parseTasks: parseTasks, totalHours: totalHours };
  }
})();
