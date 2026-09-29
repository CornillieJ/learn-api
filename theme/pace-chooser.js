(function () {
  var STEP_HOURS = [
    { label: 'Steps 1-2: Java syntax + Maven', hours: 6 },
    { label: 'Step 3: Spring core, MVC, WAR', hours: 8 },
    { label: 'Step 4: Persistence (Hibernate & HQL)', hours: 6 },
    { label: 'Step 5: Spring Security', hours: 3 },
    { label: 'Step 6: Lombok', hours: 2 },
  ];
  var TOTAL_HOURS = STEP_HOURS.reduce(function (sum, s) { return sum + s.hours; }, 0);

  function computeSchedule(input) {
    var hoursPerWeek = input.hoursPerWeek, weeksAvailable = input.weeksAvailable;
    if (!(hoursPerWeek > 0) || !(weeksAvailable > 0)) {
      return { weeks: [], totalHours: TOTAL_HOURS, capacityHours: 0, warning: 'Enter a positive number of hours and weeks.' };
    }
    var capacityHours = hoursPerWeek * weeksAvailable;
    var remaining = STEP_HOURS.slice();
    var weeks = [];
    var weekIndex = 1;
    while (remaining.length && weekIndex <= weeksAvailable) {
      var budget = hoursPerWeek;
      var focus = [];
      while (remaining.length && budget > 0) {
        var next = remaining[0];
        focus.push(next.label);
        budget -= next.hours;
        remaining.shift();
      }
      weeks.push({ week: weekIndex, focus: focus });
      weekIndex++;
    }
    var warning = null;
    var shortfall = TOTAL_HOURS - capacityHours;
    if (shortfall > 0) {
      warning = 'At ' + hoursPerWeek + 'h/week for ' + weeksAvailable + ' week(s) you have ' + capacityHours + 'h, but the path needs ' + TOTAL_HOURS + 'h. Add about ' + Math.ceil(shortfall) + 'h more by raising your weekly hours or extending the timeline.';
    } else if (remaining.length) {
      warning = 'The plan runs out of weeks before "' + remaining[0].label + '". Spread the same hours over more weeks, or raise your weekly hours.';
    }
    return { weeks: weeks, totalHours: TOTAL_HOURS, capacityHours: capacityHours, warning: warning };
  }

  function render(widget, result) {
    var el = widget.querySelector('.pc-result');
    if (!el) return;
    if (!result.weeks.length && !result.warning) { el.innerHTML = ''; return; }
    var html = '';
    if (result.warning) html += '<p class="pc-warning">' + result.warning + '</p>';
    html += '<ol class="pc-weeks">' + result.weeks.map(function (w) {
      return '<li><strong>Week ' + w.week + '</strong>: ' + w.focus.join('; ') + '</li>';
    }).join('') + '</ol>';
    el.innerHTML = html;
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
