import { createBlockTraining } from './ui/block-training.js';
import { supportsResults } from './domain/result-schemas.js';
import { historyView, savedSessionView } from './ui/session-history.js';
import { findWorkout } from './data/catalog.js';
import { createActiveWorkout } from './ui/active-workout.js';
import { days, assignWorkout } from './domain/planning.js';
import { loadPlan, savePlan, planKey } from './storage/weekly-plan.js';
import { todayView, libraryView, workoutView } from './ui/views.js';
import { heading, emptyState, el } from './ui/components.js';
const app = document.querySelector('#app');
const status = document.querySelector('#status');
let state;
let session = null;
let activeHash = '';
function stopSession() { session?.dispose(); session = null; }
function allowExit() {
  if (session?.inProgress && !window.confirm(session.exitMessage || 'End this workout? Your progress will not be saved.')) return false;
  stopSession(); return true;
}
function startWorkout(workout) {
  if (session && !allowExit()) return;
  activeHash = `#active/${workout.id}/${workout.version}`;
  if (supportsResults(workout)) {
    session = resultSession(workout);
    activeHash += `?draft=${session.id}`;
  } else session = createActiveWorkout(workout, () => { if (allowExit()) go('#today'); }, () => { stopSession(); go('#today'); });
  if (location.hash === activeHash) render(); else go(activeHash);
}

function resultSession(workout, draftId) {
  return createBlockTraining(workout, { draftId, recover: Boolean(draftId), onExit: () => { stopSession(); go('#today'); }, onHistory: id => { stopSession(); go(`#session/${id}`); } });
}

function reloadPlan() { state = loadPlan(window.localStorage); status.textContent = state.error ?? ''; }
// Access to localStorage itself may throw in restricted browser contexts.
try { reloadPlan(); } catch { state = { plan: {}, error: 'Local storage is unavailable. Planning changes are disabled.' }; status.textContent = state.error; }
function go(hash) { location.hash = hash; }
function assign(day, workout) {
  if (state.error) { status.textContent = state.error; return; }
  try {
    // Read latest storage before changing one day, preserving other tab updates.
    const latest = loadPlan(window.localStorage);
    if (latest.error) throw new Error(latest.error);
    const next = assignWorkout(latest.plan, day, workout);
    savePlan(window.localStorage, next);
    state.plan = next;
    status.textContent = workout ? `Workout assigned to ${day}.` : `Assignment removed from ${day}.`;
    if (location.hash === '#today' || !location.hash) render(false); else go('#today');
  } catch { status.textContent = 'The change could not be saved. Your previous plan has been preserved.'; }
}
function render(focus = true) {
  const [path, query = ''] = location.hash.slice(1).split('?');
  const [page = 'today', id, version] = (path || 'today').split('/');
  const requestedDay = new URLSearchParams(query).get('day');
  const day = days.includes(requestedDay) ? requestedDay : null;
  let view;
  if (session && location.hash === activeHash) view = session.root;
  else if (page === 'active' && new URLSearchParams(query).get('draft') && supportsResults(findWorkout(id, version))) {
    session = resultSession(findWorkout(id, version), new URLSearchParams(query).get('draft')); activeHash = location.hash; view = session.root;
  }
  else if (page === 'history') view = historyView(id, go);
  else if (page === 'session') view = savedSessionView(id, go);
  else if (page === 'today') view = todayView(state.plan, go, d => assign(d, null), Boolean(state.error));
  else if (page === 'library') view = libraryView(day, go, assign);
  else if (['workout', 'active', 'result'].includes(page)) view = workoutView(id, version, page, go, startWorkout);
  else if (page === 'stats' || page === 'dashboard') view = el('div', {}, heading('COMING LATER', page === 'stats' ? 'Stats' : 'Dashboard', page === 'stats' ? 'Performance over time, by workout.' : 'A place for your training totals.'), emptyState('No statistics yet', 'Advanced statistics are not available yet. Saved sessions can be viewed from the workout detail.'));
  else view = emptyState('Page not found', 'Use the navigation below to continue.');
  app.replaceChildren(view);
  document.querySelectorAll('nav a').forEach(a => {
    if (a.hash === `#${page}` || (['workout', 'active', 'result'].includes(page) && a.hash === '#library')) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  if (focus) { app.focus(); window.scrollTo(0, 0); }
}
// Intercept app links before changing history; hashchange also covers Back/Forward
// and externally assigned hashes. A cancelled exit keeps the same live controller.
document.addEventListener('click', event => {
  const link = event.target.closest('a[href]');
  if (!link || !session || link.hash === activeHash) return;
  const url = new URL(link.href);
  if (url.origin === location.origin && url.pathname === location.pathname) {
    event.preventDefault(); if (allowExit()) go(url.hash);
  }
});
window.addEventListener('hashchange', () => {
  if (session && location.hash !== activeHash && !allowExit()) {
    history.replaceState(null, '', activeHash); return;
  }
  render();
});
window.addEventListener('beforeunload', event => {
  session?.checkpoint?.();
  if (session?.inProgress) { event.preventDefault(); event.returnValue = ''; }
});
window.addEventListener('storage', e => { if (e.key === planKey || e.key === null) { try { reloadPlan(); render(false); } catch { /* Keep current state if storage becomes unavailable. */ } } });
render(false);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(() => { status.textContent = 'Offline preparation is unavailable. You can continue online.'; });
