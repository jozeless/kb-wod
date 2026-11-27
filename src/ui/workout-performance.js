import { libraryWorkouts } from '../data/catalog.js';
import { formatRoundTime } from '../domain/round-amrap-results.js';
import { summarizeWorkoutPerformance } from '../domain/workout-performance.js';
import { el } from './components.js';

const number = new Intl.NumberFormat(undefined, {maximumFractionDigits: 1});
const shortDate = new Intl.DateTimeFormat(undefined, {month: 'short', day: 'numeric'});
const fullDate = new Intl.DateTimeFormat(undefined, {dateStyle: 'medium', timeStyle: 'short'});
const modes = [
  ['completedRounds', 'Completed rounds'],
  ['averageRoundTimeMs', 'Average round time'],
];

function selector(title, options, selected) {
  const input = el('select');
  for (const [value, label] of options) input.append(el('option', {value}, label));
  input.value = selected;
  return {input, label: el('label', {}, title, input)};
}

function svgNode(name, attributes, content) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  if (content !== undefined) node.textContent = content;
  return node;
}

function performanceChart(points, mode) {
  const timed = mode === 'averageRoundTimeMs';
  const title = timed ? 'Average round time' : 'Completed rounds';
  const format = timed ? formatRoundTime : String;
  const measured = points.filter(point => point[mode] !== null);
  if (!measured.length) return el('p', {}, 'No valid round times are recorded for this selection.');

  const svg = svgNode('svg', {class: 'progress-chart', viewBox: '0 0 360 174', role: 'img',
    'aria-label': `${title} by session date. ${measured.length} plotted. Latest plotted value ${format(measured.at(-1)[mode])}.`});
  const left = 48, right = 318, top = 12, bottom = 135;
  const maximum = measured.reduce((max, point) => Math.max(max, point[mode]), 0);
  const unit = timed ? 1000 : 1;
  const step = Math.max(1, Math.ceil(maximum / (4 * unit))) * unit;
  const y = value => bottom - value / (4 * step) * (bottom - top);
  const lastIndex = measured.length - 1;
  const firstDate = measured[0].date;
  const dateSpan = measured[lastIndex].date - firstDate;
  function x(index) {
    if (lastIndex === 0) return (left + right) / 2;
    const fraction = dateSpan ? (measured[index].date - firstDate) / dateSpan : index / lastIndex;
    return left + fraction * (right - left);
  }

  svg.append(svgNode('path', {class: 'progress-axis', d: `M${left} ${top} V${bottom} H${right}`}));
  for (let tick = 0; tick <= 4; tick++) {
    const value = tick * step;
    svg.append(svgNode('text', {x: left - 7, y: y(value), 'text-anchor': 'end', 'dominant-baseline': 'middle'}, format(value)));
  }
  if (measured.length > 1) svg.append(svgNode('polyline', {class: 'progress-line',
    points: measured.map((point, index) => `${x(index)},${y(point[mode])}`).join(' ')}));

  for (const [index, point] of measured.entries()) {
    const latest = index === lastIndex;
    const marker = svgNode('circle', {cx: x(index), cy: y(point[mode]), r: latest ? 6 : 4,
      class: latest ? 'progress-latest-point' : 'progress-point'});
    marker.append(svgNode('title', {}, `${fullDate.format(point.date)} · ${format(point[mode])}${latest ? ' · Latest plotted result' : ''}`));
    svg.append(marker);
  }
  const middleIndex = measured.findIndex((point, index) =>
    point.day !== measured[0].day && point.day !== measured[lastIndex].day &&
    x(index) >= left + (right - left) / 3 && x(index) <= right - (right - left) / 3);
  const ticks = new Set([0, ...(middleIndex >= 0 ? [middleIndex] : []), lastIndex]);
  let previousDay;
  for (const index of ticks) {
    const point = measured[index];
    if (point.day === previousDay) continue;
    svg.append(svgNode('text', {x: x(index), y: bottom + 19, 'text-anchor': 'middle'}, shortDate.format(point.date)));
    previousDay = point.day;
  }
  svg.append(svgNode('text', {x: (left + right) / 2, y: 172, 'text-anchor': 'middle'}, 'Session date'));

  const table = el('table', {},
    el('caption', {}, `${title} by session date, oldest first`),
    el('thead', {}, el('tr', {}, el('th', {scope: 'col'}, 'Session date'), el('th', {scope: 'col'}, title))));
  const body = el('tbody');
  for (const [index, point] of measured.entries()) {
    body.append(el('tr', {}, el('th', {scope: 'row'}, fullDate.format(point.date)),
      el('td', {}, format(point[mode]), index === lastIndex ? ' · Latest plotted result' : null)));
  }
  table.append(body);

  return el('figure', {className: 'progress-performance-chart'},
    el('figcaption', {}, timed ? 'Average round time per session. Lower times indicate faster rounds.' : 'Completed rounds per session. The highlighted point is the latest result.'),
    svg,
    measured.length === 1 ? el('p', {}, 'Only one result is available for this chart.') : null,
    el('details', {}, el('summary', {}, 'View chart data'), table));
}

function performanceMetrics(summary) {
  const {points, first, latest, best, averageRounds, fastestRoundMs, improvementPercent} = summary;
  const timed = value => value === null ? 'Not recorded' : formatRoundTime(value);
  const resultDate = point => fullDate.format(point.date);
  const rounds = point => `${point.completedRounds} ${point.completedRounds === 1 ? 'round' : 'rounds'}`;
  let improvement = 'Unavailable with a zero starting result';
  if (points.length === 1) improvement = 'Unavailable with one session';
  else if (improvementPercent === 0) improvement = 'Unchanged (0%)';
  else if (improvementPercent !== null) {
    improvement = `${improvementPercent > 0 ? 'Up' : 'Down'} ${number.format(Math.abs(improvementPercent))}%`;
  }
  const metrics = [
    ['Completed sessions', points.length],
    ['First recorded result', rounds(first), resultDate(first)],
    ['Latest recorded result', rounds(latest), resultDate(latest)],
    ['Best recorded result', rounds(best), resultDate(best)],
    ['Average completed rounds', number.format(averageRounds)],
    ['Fastest recorded round', timed(fastestRoundMs)],
    ['Latest session average round time', timed(latest.averageRoundTimeMs)],
    ['Completed-round improvement', improvement],
  ];
  return el('dl', {className: 'progress-overview progress-performance-metrics'}, ...metrics.map(([label, value, detail]) =>
    el('div', {className: 'progress-metric'}, el('dt', {}, label), el('dd', {}, String(value),
      detail ? el('small', {}, detail) : null))));
}

export function workoutPerformanceView() {
  const workout = selector('Workout', libraryWorkouts.map(({id, name}) => [id, name]), libraryWorkouts[0].id);
  const duration = selector('Workout duration', [], '');
  const durationControl = el('div', {hidden: ''}, duration.label);
  const period = selector('Period', [['30', 'Last 30 days'], ['90', 'Last 90 days'], ['all', 'All time']], 'all');
  const mode = selector('Chart metric', modes, 'completedRounds');
  const results = el('div');
  const root = el('section', {className: 'progress-section workout-performance', 'aria-label': 'Workout Performance'},
    el('h2', {}, 'Workout Performance'),
    el('div', {className: 'progress-performance-filters'}, workout.label, durationControl, period.label, mode.label),
    results);
  let sessions = [];
  let durations = [];
  function render() {
    if (!durations.length) {
      results.replaceChildren(el('p', {}, 'No recorded sessions for this workout.'));
      return;
    }
    const summary = summarizeWorkoutPerformance(sessions, {workoutId: workout.input.value,
      durationSeconds: Number(duration.input.value), periodDays: period.input.value === 'all' ? null : Number(period.input.value)});
    if (!summary.points.length) {
      results.replaceChildren(el('p', {}, 'No results within the selected period.'));
      return;
    }
    results.replaceChildren(performanceMetrics(summary), performanceChart(summary.points, mode.input.value));
  }
  function refreshDurations(previous) {
    const definition = libraryWorkouts.find(({id}) => id === workout.input.value);
    durations = [...new Set(sessions.filter(session => session.workoutId === definition.id).map(session => session.durationSeconds))].sort((a, b) => b - a);
    duration.input.replaceChildren(...durations.map(value => el('option', {value}, `${value / 60} min`)));
    duration.input.value = durations.includes(previous) ? previous : durations[0] ?? '';
    durationControl.hidden = !definition.historicalDurations || !durations.length;
    render();
  }

  workout.input.addEventListener('change', () => refreshDurations());
  for (const input of [duration.input, period.input, mode.input]) input.addEventListener('change', render);
  return {root, update(nextSessions) {
    sessions = nextSessions;
    refreshDurations(Number(duration.input.value));
  }};
}
