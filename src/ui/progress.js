import { analyzeProgress, shiftMonth } from '../domain/progress-analytics.js';
import { listSessions } from '../storage/session-store.js';
import { canReadLocal, currentUserId } from '../cloud/identity.js';
import { auth, sync } from '../cloud/runtime.js';
import { authKey } from '../cloud/auth.js';
import { el, button, heading, emptyState } from './components.js';

const localDay = key => { const [y, m, d] = key.split('-').map(Number); const date = new Date(0); date.setFullYear(y, m - 1, d); date.setHours(12, 0, 0, 0); return date; };
const dayLabel = key => localDay(key).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'});
const quantity = n => n.toLocaleString(undefined, {maximumSignificantDigits: 21});
function duration(ms) {
  if (ms === null) return 'Not recorded';
  const seconds = Math.floor(ms / 1000), hours = Math.floor(seconds / 3600), minutes = Math.floor(seconds / 60) % 60;
  return `${hours ? `${hours} h ` : ''}${minutes} min${seconds % 60 ? ` ${seconds % 60} s` : ''}`;
}
function section(title, ...children) { return el('section', {className: 'progress-section', 'aria-label': title}, el('h2', {}, title), ...children); }
function metric(label, value) { return el('div', {className: 'progress-metric'}, el('dt', {}, label), el('dd', {}, String(value))); }
function calendar(weeks) {
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const root = section('Weekly consistency', el('p', {}, 'Highlighted dates have saved completed workouts. Weeks run Monday–Sunday; counts include only this month.'));
  root.append(el('div', {className: 'progress-weekdays', 'aria-hidden': 'true'}, ...weekdays.map(day => el('abbr', {title: day}, day[0]))));
  for (const week of weeks) {
    root.append(el('div', {className: 'progress-week'},
      el('p', {}, `Week of ${dayLabel(week.start)} · ${week.trainedDays} trained ${week.trainedDays === 1 ? 'day' : 'days'}`),
      el('ol', {className: 'progress-days', 'aria-label': `Week of ${dayLabel(week.start)}`}, ...week.days.map(day => day ?
        el('li', {className: day.workouts ? 'is-trained' : '', 'aria-label': `${dayLabel(day.date)}: ${day.workouts} completed ${day.workouts === 1 ? 'workout' : 'workouts'}`}, el('time', {datetime: day.date}, String(day.day))) : el('li', {'aria-hidden': 'true'})))));
  }
  return root;
}
function svg(tag, attributes = {}, ...children) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  node.append(...children); return node;
}
function strength(series, selected, onSelect) {
  const root = section('Strength progression', el('p', {}, 'All saved history · Actual recorded kg, grouped by workout, exercise ID and phase. Recorded load is not a maximum-strength estimate.'));
  if (!series.length) { root.append(emptyState('No recorded weights', 'Weights appear here only after being saved in completed session results.')); return root; }
  const select = el('select', {id: 'progress-exercise', onChange: event => onSelect(event.target.value)}, ...series.map(item => el('option', {value: item.key}, item.label)));
  select.value = series.some(item => item.key === selected) ? selected : series[0].key;
  root.append(el('label', {for: 'progress-exercise'}, 'Recorded exercise'), select);
  const item = series.find(item => item.key === select.value), points = item.points;
  root.append(el('dl', {className: 'progress-weight-summary'}, metric('Latest recorded', `${quantity(item.current)} kg`), metric('Historical maximum', `${quantity(item.maximum)} kg`)));
  const first = points[0].timestamp, last = points.at(-1).timestamp, top = Math.max(1, item.maximum * 1.1);
  const positions = points.map(p => ({...p, x: first === last ? 300 : 30 + (p.timestamp - first) / (last - first) * 540, y: 190 - p.weightKg / top * 160}));
  const chart = svg('svg', {viewBox: '0 0 600 220', class: 'progress-chart', role: 'img', 'aria-labelledby': 'progress-chart-title progress-chart-desc'},
    svg('title', {id: 'progress-chart-title'}, `${item.label}: recorded weight in kg by training date`),
    svg('desc', {id: 'progress-chart-desc'}, `${points.length} saved measurements. Latest ${quantity(item.current)} kg; historical maximum ${quantity(item.maximum)} kg. Exact dates, workout versions and weights are listed below.`),
    svg('path', {d: 'M30 25 V190 H570', class: 'progress-axis'}),
    svg('polyline', {points: positions.map(p => `${p.x},${p.y}`).join(' '), class: 'progress-line'}));
  for (const point of positions) chart.append(svg('circle', {cx: point.x, cy: point.y, r: 5}, svg('title', {}, `${dayLabel(point.day)} · ${quantity(point.weightKg)} kg · v${point.workoutVersion}`)));
  root.append(chart, el('div', {className: 'progress-chart-dates'}, el('span', {}, dayLabel(points[0].day)), el('span', {}, dayLabel(points.at(-1).day))));
  root.append(el('details', {}, el('summary', {}, `View recorded weights (${points.length})`),
    el('table', {}, el('caption', {}, item.label), el('thead', {}, el('tr', {}, ...['Training date', 'Weight (kg)', 'Version'].map(text => el('th', {scope: 'col'}, text)))),
      el('tbody', {}, ...points.map(p => el('tr', {}, el('td', {}, el('time', {datetime: p.startedAt}, new Date(p.startedAt).toLocaleString())), el('td', {}, quantity(p.weightKg)), el('td', {}, String(p.workoutVersion))))))));
  return root;
}
function performance(metrics) {
  const root = section('Recorded performance', el('p', {}, 'All saved history · Only explicitly recorded counts. Final-set Floor Press counts are not total workout presses. Missing entries are excluded.'));
  if (!metrics.length) root.append(emptyState('No recorded performance counts', 'Save actual finisher reps, steps, complete rounds or final-set counts to see supported totals.'));
  else root.append(el('dl', {className: 'progress-performance'}, ...metrics.map(item => el('div', {}, el('dt', {}, item.label), el('dd', {}, `${quantity(item.total)} ${item.unit}`), el('p', {}, `${item.measurements} recorded ${item.measurements === 1 ? 'entry' : 'entries'}`)))));
  return root;
}
export function progressView() {
  const now = new Date(); let month = {year: now.getFullYear(), month: now.getMonth() + 1}, selected = null, analysis = null;
  let disposed = false, generation = 0, owner = currentUserId();
  const root = el('div', {className: 'hm-progress'}), content = el('div', {className: 'progress-content', 'aria-live': 'polite'});
  const monthTitle = el('h2', {id: 'progress-month'});
  const previous = button('← Previous month', () => changeMonth(-1), true), next = button('Next month →', () => changeMonth(1), true);
  const navigation = el('div', {className: 'progress-month-nav', 'aria-label': 'Month navigation'}, previous, monthTitle, next);
  root.append(heading('YOUR TRAINING', 'Progress', 'From saved completed sessions visible to your current account.'), navigation, content);
  function render() {
    monthTitle.textContent = localDay(`${month.year}-${String(month.month).padStart(2, '0')}-01`).toLocaleDateString(undefined, {month: 'long', year: 'numeric'});
    if (!analysis) return;
    const overview = analysis.month;
    const monthly = section('Monthly overview', el('dl', {className: 'progress-overview'}, metric('Completed workouts', overview.workouts),
      metric('Active duration', overview.workouts ? duration(overview.activeDurationMs) : 'No sessions'), metric('Active days', overview.activeDays), metric('Active weeks', overview.activeWeeks)));
    if (!overview.workouts) monthly.append(emptyState('No completed workouts this month', 'Only saved completed sessions count. Your weekly plan and unfinished drafts do not add training days.'));
    if (overview.missingDurations) monthly.append(el('p', {className: 'progress-notice'}, `Active duration is recorded for ${overview.durationSessions} of ${overview.workouts} sessions. ${overview.missingDurations} missing or invalid duration ${overview.missingDurations === 1 ? 'entry is' : 'entries are'} excluded.`));
    content.replaceChildren(monthly, calendar(overview.weeks), strength(analysis.strength, selected, value => {
      selected = value; render(); content.querySelector('select')?.focus();
    }), performance(analysis.performance));
  }
  async function load() {
    const ticket = ++generation, identity = currentUserId(); owner = identity;
    analysis = null; content.replaceChildren(el('p', {role: 'status'}, 'Loading saved sessions…')); content.setAttribute('aria-busy', 'true'); render();
    try {
      const records = await listSessions();
      if (disposed || ticket !== generation || identity !== currentUserId()) return;
      analysis = analyzeProgress(records, month, canReadLocal); render();
    } catch {
      if (disposed || ticket !== generation || identity !== currentUserId()) return;
      content.replaceChildren(emptyState('Progress unavailable', 'Saved session storage could not be read. Your data has not been changed.'), button('Retry loading sessions', () => void load(), true));
    } finally { if (!disposed && ticket === generation) content.removeAttribute('aria-busy'); }
  }
  function changeMonth(delta) { month = shiftMonth(month, delta); void load(); }
  const offAuth = auth.subscribe(() => { if (owner !== currentUserId()) { selected = null; void load(); } });
  const offSync = sync.subscribe(() => void load());
  const refresh = () => void load();
  const storageChanged = event => {
    if (event.key === authKey || event.key === null) { selected = null; void load(); }
  };
  window.addEventListener('kb-session-change', refresh);
  window.addEventListener('storage', storageChanged);
  void load();
  return {root, dispose() { disposed = true; generation++; offAuth(); offSync(); window.removeEventListener('kb-session-change', refresh); window.removeEventListener('storage', storageChanged); content.replaceChildren(); analysis = null; }};
}
