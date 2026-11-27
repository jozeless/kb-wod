import { days as weekdays } from '../domain/planning.js';
import { analyzeWeeklyConsistency, changeWeeklyGoal } from '../domain/weekly-consistency.js';
import { completedSessions } from '../domain/progress-analytics.js';
import { canReadLocal, currentUserId } from '../cloud/identity.js';
import { withWorkspaceLock } from '../platform/workspace-lock.js';
import { listSessions } from '../storage/session-store.js';
import { loadWeeklyGoals, saveWeeklyGoals } from '../storage/weekly-goal.js';
import { el } from './components.js';

export const localDay = key => { const [y, m, d] = key.split('-').map(Number); const date = new Date(0); date.setFullYear(y, m - 1, d); date.setHours(12, 0, 0, 0); return date; };
const dayLabel = key => localDay(key).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'});
export function duration(ms) {
  if (ms === null) return 'Not recorded';
  const seconds = Math.floor(ms / 1000), hours = Math.floor(seconds / 3600), minutes = Math.floor(seconds / 60) % 60;
  return `${hours ? `${hours} h ` : ''}${minutes} min${seconds % 60 ? ` ${seconds % 60} s` : ''}`;
}
export function section(title, ...children) { return el('section', {className: 'progress-section', 'aria-label': title}, el('h2', {}, title), ...children); }
export function metric(label, value) { return el('div', {className: 'progress-metric'}, el('dt', {}, label), el('dd', {}, String(value))); }

function weekdayLabels() {
  return el('div', {className: 'progress-weekdays', 'aria-hidden': 'true'},
    ...weekdays.map(day => el('abbr', {title: day}, day[0])));
}

function weekDays(week) {
  return el('ol', {className: 'progress-days', 'aria-label': `Week of ${dayLabel(week.start)}`},
    ...week.days.map(day => day ?
      el('li', {className: day.workouts ? 'is-trained' : '',
        'aria-label': `${dayLabel(day.date)}: ${day.workouts} completed ${day.workouts === 1 ? 'workout' : 'workouts'}`},
      el('time', {datetime: day.date}, String(day.day))) : el('li', {'aria-hidden': 'true'})));
}

export function monthlyCalendar(weeks) {
  return section('Monthly training calendar',
    el('p', {}, 'Highlighted dates have saved completed workouts. Weeks run Monday–Sunday; counts include only this month.'),
    weekdayLabels(), ...weeks.map(week => el('div', {className: 'progress-week'},
      el('p', {}, `Week of ${dayLabel(week.start)} · ${week.trainedDays} trained ${week.trainedDays === 1 ? 'day' : 'days'}`), weekDays(week))));
}

function recentWeekHistory(weeks) {
  return el('ol', {className: 'weekly-history', 'aria-label': 'Last eight completed weeks'},
    ...weeks.map(week => el('li', {className: week.successful ? 'weekly-goal-met' : ''},
      el('time', {datetime: week.start}, `Week of ${dayLabel(week.start)}`),
      el('strong', {}, week.successful ? 'Goal met' : 'Goal not met'),
      el('span', {}, `${week.activeDays} of ${week.goal} active days`))));
}

export function weeklyConsistencyView() {
  const goal = el('select');
  for (let value = 1; value <= 7; value++) goal.append(el('option', {value}, `${value} ${value === 1 ? 'day' : 'days'}`));
  const notice = el('div');
  const results = el('div');
  const root = section('Weekly consistency', el('label', {}, 'Weekly goal', goal),
    el('p', {}, 'Goals are saved on this device. Weeks before your first goal change use a four-day goal.'), notice, results);
  let sessions = [];
  let owner = currentUserId();
  let saving = false;
  let disposed = false;

  function refresh(saveError = '') {
    let history = [];
    let readError = '';
    try { history = loadWeeklyGoals(globalThis.localStorage, owner); }
    catch { readError = 'Weekly goal preferences could not be read. Default goals are shown.'; }
    const {currentWeek, pendingGoal, recentWeeks, currentStreak, longestStreak} = analyzeWeeklyConsistency(sessions, history);
    const {activeDays, goal: activeGoal, completionPercent, workouts, durationSessions, totalDurationMs} = currentWeek;
    goal.value = pendingGoal?.goal ?? activeGoal;
    goal.disabled = saving || Boolean(readError);
    notice.replaceChildren(
      ...(pendingGoal ? [el('p', {}, `Goal changes to ${pendingGoal.goal} ${pendingGoal.goal === 1 ? 'day' : 'days'} on ${dayLabel(pendingGoal.effectiveWeek)}.`)] : []),
      ...(readError || saveError ? [el('p', {role: 'alert'}, readError || saveError)] : []));
    results.replaceChildren(
      el('dl', {className: 'progress-overview'},
        metric('Active days this week', activeDays), metric('Goal this week', activeGoal),
        metric('Goal completion', `${completionPercent}%`), metric('Saved workouts this week', workouts),
        metric('Recorded training time this week', workouts ? duration(totalDurationMs) : 'No sessions'),
        metric('Current weekly streak', `${currentStreak} ${currentStreak === 1 ? 'week' : 'weeks'}`),
        metric('Longest weekly streak', `${longestStreak} ${longestStreak === 1 ? 'week' : 'weeks'}`)),
      el('progress', {className: 'weekly-progress', max: 100, value: Math.min(completionPercent, 100),
        'aria-label': 'Weekly goal progress', 'aria-valuetext': `${activeDays} of ${activeGoal} active days (${completionPercent}%)`}),
      el('p', {}, `Week of ${dayLabel(currentWeek.start)}`), weekdayLabels(), weekDays(currentWeek),
      !workouts ? el('p', {}, 'No saved workouts this week.') : null,
      workouts > durationSessions ? el('p', {}, `Recorded durations available for ${durationSessions} of ${workouts} workouts.`) : null,
      el('h3', {}, 'Last eight completed weeks'), recentWeekHistory(recentWeeks));
  }

  goal.addEventListener('change', async () => {
    const account = owner;
    if (saving || disposed || account !== currentUserId()) return;
    const selected = Number(goal.value);
    saving = true;
    goal.disabled = true;
    let error = '';
    try {
      const records = await listSessions();
      await withWorkspaceLock(() => {
        if (disposed || account !== currentUserId()) return;
        const storage = globalThis.localStorage;
        const history = loadWeeklyGoals(storage, account);
        const currentSessions = completedSessions(records, canReadLocal);
        const {currentWeek} = analyzeWeeklyConsistency(currentSessions, history);
        saveWeeklyGoals(storage, account, changeWeeklyGoal(history, selected, currentWeek));
        sessions = currentSessions;
      });
    } catch {
      error = 'Weekly goal could not be saved. Your previous goal is still in use.';
    } finally {
      saving = false;
      if (!disposed && account === currentUserId()) refresh(error);
    }
  });

  return {
    root, refresh,
    update(nextSessions, account) {
      owner = account;
      sessions = nextSessions;
      refresh();
    },
    dispose() { disposed = true; },
  };
}
