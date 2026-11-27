import { libraryWorkouts } from '../data/catalog.js';
import { completedSessions, monthlyOverview, shiftMonth } from '../domain/progress-analytics.js';
import { fastestWorkoutRound } from '../domain/round-amrap-progress.js';
import { workoutPerformanceSessions } from '../domain/workout-performance.js';
import { workoutPerformanceView } from './workout-performance.js';
import { duration, localDay, metric, monthlyCalendar, section, weeklyConsistencyView } from './progress-cards.js';
import { weeklyGoalKey } from '../storage/weekly-goal.js';
import { formatRoundTime } from '../domain/round-amrap-results.js';
import { listSessions } from '../storage/session-store.js';
import { canReadLocal, currentUserId } from '../cloud/identity.js';
import { auth, sync } from '../cloud/runtime.js';
import { authKey } from '../cloud/auth.js';
import { el, button, heading, emptyState } from './components.js';

export function progressView() {
  const now = new Date(); let month = {year: now.getFullYear(), month: now.getMonth() + 1}, overview = null;
  let disposed = false, generation = 0, owner = currentUserId(), fastest = null;
  const root = el('div', {className: 'hm-progress'}), content = el('div', {className: 'progress-content', 'aria-live': 'polite'});
  const performance = workoutPerformanceView();
  const weekly = weeklyConsistencyView();
  const monthTitle = el('h2', {id: 'progress-month'});
  const previous = button('← Previous month', () => changeMonth(-1), true), next = button('Next month →', () => changeMonth(1), true);
  const navigation = el('div', {className: 'progress-month-nav', 'aria-label': 'Month navigation'}, previous, monthTitle, next);
  root.append(heading('YOUR TRAINING', 'Progress', 'From saved completed sessions visible to your current account.'), navigation, content);
  function render() {
    monthTitle.textContent = localDay(`${month.year}-${String(month.month).padStart(2, '0')}-01`).toLocaleDateString(undefined, {month: 'long', year: 'numeric'});
    if (!overview) return;
    const monthly = section('Monthly overview', el('dl', {className: 'progress-overview'}, metric('Completed workouts', overview.workouts),
      metric('Active duration', overview.workouts ? duration(overview.activeDurationMs) : 'No sessions'), metric('Active days', overview.activeDays), metric('Active weeks', overview.activeWeeks)));
    if (!overview.workouts) monthly.append(emptyState('No completed workouts this month', 'Only saved completed sessions count. Your weekly plan and unfinished drafts do not add training days.'));
    if (overview.missingDurations) monthly.append(el('p', {className: 'progress-notice'}, `Active duration is recorded for ${overview.durationSessions} of ${overview.workouts} sessions. ${overview.missingDurations} missing or invalid duration ${overview.missingDurations === 1 ? 'entry is' : 'entries are'} excluded.`));
    const personalRecords = libraryWorkouts.map(workout => {
      const record = section(`${workout.name} · Fastest Round — All Time`);
      for (const [durationSeconds, best] of fastest[workout.id]) {
        if (workout.historicalDurations) record.append(el('h3', {}, `${durationSeconds / 60}-minute sessions`));
        if (best) record.append(el('dl', {className: 'progress-overview'}, metric('Best round', formatRoundTime(best.durationMs)),
          metric('Workout date', new Date(best.startedAt).toLocaleDateString()), metric('Round number', best.roundNumber)));
        else record.append(el('p', {}, 'Round times not recorded'));
      }
      return record;
    });
    content.replaceChildren(monthly, weekly.root, monthlyCalendar(overview.weeks), performance.root, ...personalRecords);
  }
  async function load() {
    const ticket = ++generation, identity = currentUserId(); owner = identity;
    overview = null; fastest = null; content.replaceChildren(el('p', {role: 'status'}, 'Loading saved sessions…')); content.setAttribute('aria-busy', 'true'); render();
    try {
      const records = await listSessions();
      if (disposed || ticket !== generation || identity !== currentUserId()) return;
      const sessions = completedSessions(records, canReadLocal);
      overview = monthlyOverview(sessions, month);
      weekly.update(sessions, identity);
      fastest = Object.fromEntries(libraryWorkouts.map(workout => [
        workout.id,
        [workout.durationSeconds, ...(workout.historicalDurations ?? [])].map(durationSeconds => [
          durationSeconds, fastestWorkoutRound(records, canReadLocal, workout.id, durationSeconds),
        ]),
      ]));
      performance.update(workoutPerformanceSessions(records, canReadLocal));
      render();
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
    else if (event.key === weeklyGoalKey(currentUserId())) weekly.refresh();
  };
  window.addEventListener('kb-session-change', refresh);
  window.addEventListener('storage', storageChanged);
  void load();
  return {root, dispose() { disposed = true; generation++; weekly.dispose(); offAuth(); offSync(); window.removeEventListener('kb-session-change', refresh); window.removeEventListener('storage', storageChanged); content.replaceChildren(); overview = null; fastest = null; }};
}
