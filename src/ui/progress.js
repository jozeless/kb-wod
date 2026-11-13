import { analyzeProgress, shiftMonth } from '../domain/progress-analytics.js';
import { fastestClassicIronRound } from '../domain/classic-iron-progress.js';
import { formatRoundTime } from '../domain/classic-iron-results.js';
import { listSessions } from '../storage/session-store.js';
import { canReadLocal, currentUserId } from '../cloud/identity.js';
import { auth, sync } from '../cloud/runtime.js';
import { authKey } from '../cloud/auth.js';
import { el, button, heading, emptyState } from './components.js';

const localDay = key => { const [y, m, d] = key.split('-').map(Number); const date = new Date(0); date.setFullYear(y, m - 1, d); date.setHours(12, 0, 0, 0); return date; };
const dayLabel = key => localDay(key).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'});
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
export function progressView() {
  const now = new Date(); let month = {year: now.getFullYear(), month: now.getMonth() + 1}, analysis = null;
  let disposed = false, generation = 0, owner = currentUserId(), fastest = null;
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
    const classic = section('Classic Iron · Fastest Round — All Time');
    if (fastest) classic.append(el('dl', {className: 'progress-overview'}, metric('Best round', formatRoundTime(fastest.durationMs)),
      metric('Workout date', new Date(fastest.startedAt).toLocaleDateString()), metric('Round number', fastest.roundNumber)));
    else classic.append(el('p', {}, 'Round times not recorded'));
    content.replaceChildren(monthly, calendar(overview.weeks), classic);
  }
  async function load() {
    const ticket = ++generation, identity = currentUserId(); owner = identity;
    analysis = null; fastest = null; content.replaceChildren(el('p', {role: 'status'}, 'Loading saved sessions…')); content.setAttribute('aria-busy', 'true'); render();
    try {
      const records = await listSessions();
      if (disposed || ticket !== generation || identity !== currentUserId()) return;
      analysis = analyzeProgress(records, month, canReadLocal); fastest = fastestClassicIronRound(records, canReadLocal); render();
    } catch {
      if (disposed || ticket !== generation || identity !== currentUserId()) return;
      content.replaceChildren(emptyState('Progress unavailable', 'Saved session storage could not be read. Your data has not been changed.'), button('Retry loading sessions', () => void load(), true));
    } finally { if (!disposed && ticket === generation) content.removeAttribute('aria-busy'); }
  }
  function changeMonth(delta) { month = shiftMonth(month, delta); void load(); }
  const offAuth = auth.subscribe(() => { if (owner !== currentUserId()) { void load(); } });
  const offSync = sync.subscribe(() => void load());
  const refresh = () => void load();
  const storageChanged = event => {
    if (event.key === authKey || event.key === null) { void load(); }
  };
  window.addEventListener('kb-session-change', refresh);
  window.addEventListener('storage', storageChanged);
  void load();
  return {root, dispose() { disposed = true; generation++; offAuth(); offSync(); window.removeEventListener('kb-session-change', refresh); window.removeEventListener('storage', storageChanged); content.replaceChildren(); analysis = null; fastest = null; }};
}
