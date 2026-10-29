import { el } from './components.js';
import { formatTime } from '../domain/workout-timer.js';

// Presentation only: consume snapshots from the existing timer, never run a clock.
export function activePresentation({ heading, phase, exercise, target, weight, clock, total, position, next, circuit, progress, controls, block, side }) {
  const svgNode = (tag, attrs) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
    return node;
  };
  const ring = svgNode('circle', { class: 'session-ring-fill', cx: 50, cy: 50, r: 46, pathLength: 100 });
  const svg = svgNode('svg', { class: 'session-ring', viewBox: '0 0 100 100', 'aria-hidden': 'true', focusable: 'false' });
  svg.append(svgNode('circle', { class: 'session-ring-track', cx: 50, cy: 50, r: 46 }), ring);
  const state = el('span', { className: 'session-state' });
  const dial = el('div', { className: 'session-dial' }, svg,
    el('div', { className: 'session-dial-face' }, el('span', { className: 'session-time-label' }, 'Time left'), clock, position, state));
  next.classList.add('session-next');
  target.classList.add('active-target');
  total.classList.add('session-total');
  const card = el('section', { className: 'current-exercise-card', 'aria-label': 'Current exercise' },
    el('p', { className: 'current-exercise-label' }, 'Current Exercise'), exercise, side,
    el('div', { className: 'session-prescription' }, weight.root, target), circuit, next);
  const panel = el('section', { className: 'active-panel', 'aria-label': 'Active workout' },
    phase, dial, el('div', { className: 'session-timing' }, block, total), card, progress);
  const root = el('div', { className: 'hm-active-view' }, heading, panel, controls);
  return {
    root, panel,
    update(snapshot) {
      const paused = snapshot.status === 'paused';
      const label = paused ? 'PAUSED' : snapshot.stage === 'countdown' ? 'GET READY' :
        ({ EMOM: 'WORK', SIDE_HOLD: 'WORK', AMRAP_REPS: 'AMRAP REPS' }[snapshot.kind] || snapshot.kind);
      root.dataset.state = paused ? 'paused' : snapshot.stage === 'countdown' ? 'countdown' : snapshot.kind.toLowerCase();
      state.textContent = label;
      const fraction = snapshot.stage === 'countdown' ? snapshot.countdown / 3 : snapshot.remainingMs / (snapshot.endMs - snapshot.startMs);
      ring.style.strokeDashoffset = String(100 * (1 - Math.max(0, Math.min(1, fraction))));
      clock.setAttribute('aria-label', snapshot.stage === 'countdown' ? `Starting in ${snapshot.countdown}` : `Phase time remaining: ${formatTime(snapshot.remainingMs)}`);
    },
  };
}
