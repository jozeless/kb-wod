import { createRoundAmrapTraining } from './ui/round-amrap-training.js';
import { isClassicIron } from './domain/classic-iron-results.js';
import { progressView } from './ui/progress.js';
import { authKey } from './cloud/auth.js';
import { workspaceKey } from './cloud/sync.js';
import { auth, sync, libraryVisibility } from './cloud/runtime.js';
import { withWorkspaceLock } from './platform/workspace-lock.js';
import { visibilityKey } from './storage/library-visibility.js';
import { libraryWorkouts } from './data/catalog.js';
import { accountView } from './ui/account.js';
import { createBlockTraining } from './ui/block-training.js';
import { supportsResults } from './domain/result-schemas.js';
import { historyView, savedSessionView } from './ui/session-history.js';
import { createActiveWorkout } from './ui/active-workout.js';
import { days, assignWorkout } from './domain/planning.js';
import { loadPlan, savePlan, planKey } from './storage/weekly-plan.js';
import { todayView, libraryView, workoutView } from './ui/views.js';
import { heading, emptyState, el } from './ui/components.js';
const app = document.querySelector('#app');
const status = document.querySelector('#status');
// Live presentation can become a results form without a hash/route change.
const updateFocusChrome = () => document.body.classList.toggle('hm-training-focus', Boolean(app.querySelector('.hm-active-view')));
new MutationObserver(updateFocusChrome).observe(app, {childList: true, subtree: true});
updateFocusChrome();
let state;
let session = null;
let activeHash = '';
let disposeProgress = () => {};
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
  } else session = createActiveWorkout(workout, () => { if (allowExit()) go('#today'); }, () => { stopSession(); go('#today'); });
  if (location.hash === activeHash) render(); else go(activeHash);
}

function resultSession(workout) {
  return (isClassicIron(workout) ? createRoundAmrapTraining : createBlockTraining)(workout, { onExit: () => { if (allowExit()) go('#today'); }, onHistory: id => { stopSession(); go(`#session/${id}`); } });
}

function reloadPlan() { state = loadPlan(window.localStorage); const settings=libraryVisibility.state;status.textContent = state.error ?? (settings.blocked ? settings.error : ''); }
// Access to localStorage itself may throw in restricted browser contexts.
try { reloadPlan(); } catch { state = { plan: {}, error: 'Local storage is unavailable. Planning changes are disabled.' }; status.textContent = state.error; }
function go(hash) { location.hash = hash; }
async function assign(day, workout, owner = auth.user?.id || null) {
  if (state.error) { status.textContent = state.error; return; }
  try {
    status.textContent = 'Saving weekly plan…';
    await withWorkspaceLock(() => {
    libraryVisibility.assertContext(owner); libraryVisibility.recover(owner);
    if (workout && libraryVisibility.state.hiddenIds.includes(workout.id)) throw new Error('Hidden workout');
    // Never write the shared plan from a tab whose signed-in account is stale.
    if(auth.configured && ((JSON.parse(localStorage.getItem(authKey)||'null')?.user?.id||null)!==(auth.user?.id||null) || (localStorage.getItem(workspaceKey)||null)!==(auth.user?.id||null)))throw new Error('Account changed.');
    // Read latest storage before changing one day, preserving other tab updates.
    const latest = loadPlan(window.localStorage);
    if (latest.error) throw new Error(latest.error);
    const next = assignWorkout(libraryVisibility.cleanPlan(latest.plan), day, workout);
    savePlan(window.localStorage, next);
    state.plan = next;
    sync.planChanged();
    });
    status.textContent = workout ? `Workout assigned to ${day}.` : `Assignment removed from ${day}.`;
    if (location.hash === '#today' || !location.hash) render(false); else go('#today');
  } catch { status.textContent = 'The change could not be saved. Your previous plan has been preserved.'; }
}
let libraryBusy = false;
async function changeLibrary(workout, hidden, owner) {
  if (libraryBusy || !libraryWorkouts.some(w => w.id === workout.id)) return;
  if (hidden && !confirm(`Hide ${workout.name}? It will disappear from your Library and weekly plan. Your saved workout history will remain available.`)) return;
  libraryBusy = true;
  try {
    const changed = await libraryVisibility.change(workout.id, hidden, owner);
    if (changed) { reloadPlan(); render(false); void sync.sync(); }
  } finally { libraryBusy = false; }
}
function render(focus = true) {
  disposeProgress(); disposeProgress = () => {};
  const [path, query = ''] = location.hash.slice(1).split('?');
  const [page = 'today', id, version] = (path || 'today').split('/');
  const requestedDay = new URLSearchParams(query).get('day');
  const day = days.includes(requestedDay) ? requestedDay : null;
  let view;
  if (session && location.hash === activeHash) view = session.root;
  else if (page === 'history') view = historyView(id, go);
  else if (page === 'session') view = savedSessionView(id, go);
  else if (page === 'account') view = accountView();
  else if (page === 'today') {
    const owner = auth.user?.id || null;
    try { libraryVisibility.assertContext(owner); view = todayView(libraryVisibility.cleanPlan(state.plan), go, d => assign(d, null, owner), Boolean(state.error || libraryVisibility.state.blocked)); }
    catch { view = todayView({}, go, () => {}, true); }
  }
  else if (page === 'library') {
    const owner = auth.user?.id || null, settings = libraryVisibility.state;
    view = libraryView(day, go, (d, workout) => assign(d, workout, owner), {hiddenIds: settings.hiddenIds, visibilityState: settings,
      onVisibilityChange: (workout, hidden) => void changeLibrary(workout, hidden, owner),
      retry: () => void libraryVisibility.synchronize().then(() => sync.sync()),
      resolve: (id, local) => void libraryVisibility.resolve(id, local, owner).then(() => sync.sync())});
  }
  else if (['workout', 'active', 'result'].includes(page)) view = workoutView(id, version, page, go, startWorkout);
  else if (page === 'progress') { const progress = progressView(); view = progress.root; disposeProgress = progress.dispose; }
  else if (page === 'stats' || page === 'dashboard') view = el('div', {}, heading('COMING LATER', page === 'stats' ? 'Stats' : 'Dashboard', page === 'stats' ? 'Performance over time, by workout.' : 'A place for your training totals.'), emptyState('No statistics yet', 'Advanced statistics are not available yet. Saved sessions can be viewed from the workout detail.'));
  else view = emptyState('Page not found', 'Use the navigation below to continue.');
  // Keep the live auth form attached during status updates: moving/recreating
  // focused password inputs can interrupt mobile/browser text insertion.
  const previous=app.firstElementChild;
  if(previous?.dataset.accountIdentity && previous.dataset.accountIdentity===view.dataset.accountIdentity){
    const oldForm=previous.querySelector('form'),newForm=view.querySelector('form');
    if(oldForm&&newForm){
      for(const child of [...previous.childNodes])if(child!==oldForm)child.remove();
      for(const child of [...view.childNodes])if(child!==newForm)previous.insertBefore(child,oldForm);
      view=previous;
    }
  }
  if(app.firstElementChild!==view)app.replaceChildren(view);
  const activePage = ['workout', 'active', 'result'].includes(page) ? 'library' : page === 'session' ? 'history' : ['stats', 'dashboard'].includes(page) ? 'progress' : page;
  document.querySelectorAll('nav a').forEach(a => {
    if (a.hash === `#${activePage}`) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
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
  if (location.hash.startsWith('#library')) void sync.sync();
});
// A document restored from the back/forward cache must not resurrect an abandoned session.
window.addEventListener('pagehide', stopSession);
window.addEventListener('pageshow', event => { if (event.persisted) render(false); });
window.addEventListener('beforeunload', event => {
  if (session?.inProgress) { event.preventDefault(); event.returnValue = ''; }
});
window.addEventListener('storage', e => { if (e.key === planKey || e.key === visibilityKey(auth.user?.id || null) || e.key === workspaceKey || e.key === null) { try { reloadPlan(); render(false); } catch { /* Keep current state if storage becomes unavailable. */ } } });
libraryVisibility.subscribe(() => { if (location.hash.startsWith('#library') || location.hash === '#today' || !location.hash) { try { reloadPlan(); render(false); } catch { /* Preserve the previous view on storage failure. */ } } });
const accountControl=el('a',{href:'#account',className:'account-control'},'Account');
const cloudIndicator=el('span',{className:'cloud-indicator','aria-live':'polite'},'Saved locally');
document.querySelector('.app-header .header-account').append(accountControl,cloudIndicator);
let previousAccount=null;
function cloudUpdate(){
  accountControl.textContent=auth.user?'Account':'Log in';
  cloudIndicator.textContent=auth.configured?sync.state.message:'Local mode';
  if(location.hash==='#account')render(false);
  document.querySelectorAll('[data-session-id]').forEach(node=>{node.textContent=node.dataset.sessionOwner&&node.dataset.sessionOwner===auth.user?.id?sync.sessionStatus(node.dataset.sessionId):'Saved locally';});
}
sync.subscribe(cloudUpdate);
auth.subscribe(()=>{
  const next=auth.user?.id||null;
  if(next!==previousAccount){previousAccount=next;stopSession();void sync.accountChanged();render(false);}
  cloudUpdate();
});
window.addEventListener('kb-plan-restored',()=>{try{reloadPlan();render(false);}catch{/* Preserve disabled state. */}});
window.addEventListener('kb-session-change',()=>void sync.sync());
window.addEventListener('online',()=>{libraryVisibility.refreshStatus();void auth.initialize().then(()=>sync.accountChanged());});
window.addEventListener('offline',()=>{libraryVisibility.refreshStatus();void sync.sync();});
window.addEventListener('focus',()=>void sync.sync());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void sync.sync();});
window.addEventListener('storage',event=>{
  if(event.key==='kb2.cloud.auth.v1')void auth.reload();
});
const cloudStartup=auth.initialize();
render(false);
void cloudStartup.then(()=>{previousAccount=auth.user?.id||null;return sync.accountChanged();}).then(cloudUpdate);
if ('serviceWorker'  in navigator) navigator.serviceWorker.register('./service-worker.js').catch(() => { status.textContent = 'Offline preparation is unavailable. You can continue online.'; });
