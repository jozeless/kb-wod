import { el } from './components.js';
import { formatTime } from '../domain/workout-timer.js';

// Presentation only: consume the existing controller values/snapshot, never run a clock.
export function activePresentation({ phase, exercise, clock, total, next, circuit, progress, controls, block, side, initialPhase }) {
  const svgNode = (tag, attrs) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
    return node;
  };
  const icon = (type) => {
    const svg = svgNode('svg', {viewBox:'0 0 24 24', width:24, height:24, 'aria-hidden':'true', focusable:'false', class:`control-icon icon-${type}`});
    if (type === 'pause') svg.append(svgNode('rect',{x:5,y:4,width:5,height:16,rx:1}),svgNode('rect',{x:14,y:4,width:5,height:16,rx:1}));
    else if (type === 'play') svg.append(svgNode('path',{d:'M7 3 21 12 7 21Z'}));
    else svg.append(svgNode('rect',{x:4,y:4,width:16,height:16,rx:1}));
    return svg;
  };
  const [pause, end] = controls.querySelectorAll('button');
  pause.setAttribute('aria-label', pause.textContent); end.setAttribute('aria-label','End Workout');
  pause.replaceChildren(icon('pause'),icon('play')); end.replaceChildren(icon('stop'));
  const ring = svgNode('circle', { class: 'session-ring-fill', cx: 50, cy: 50, r: 46, pathLength: 100 });
  const svg = svgNode('svg', { class: 'session-ring', viewBox: '0 0 100 100', 'aria-hidden': 'true', focusable: 'false' });
  svg.append(svgNode('circle', { class: 'session-ring-track', cx: 50, cy: 50, r: 46 }), ring);
  const state = el('span', { className: 'session-state' });
  const dial = el('div', { className: 'session-dial' }, svg, el('div', { className: 'session-dial-face' }, clock, state));
  phase.classList.add('focus-phase');
  next.classList.add('session-next-name'); total.classList.add('session-total');
  const card = el('section', { className: 'current-exercise-card', 'aria-label': 'Current exercise' },
    el('p', { className: 'current-exercise-label' }, 'Current Exercise'), exercise, side, circuit,
    el('div', {className:'session-next'}, el('span',{className:'next-label'},'Next'),el('span',{'aria-hidden':'true',className:'next-arrow'},'→'),next));
  const metric = (label, node) => el('div',{className:'session-metric'},el('dt',{},label),node);
  const timing = el('dl', {className:'session-timing'},metric('Block remaining',block),metric('Total remaining',total));
  const panel = el('section', { className: 'active-panel', 'aria-label': 'Active workout' }, phase,dial,controls,timing,card,progress);
  const root = el('div', { className: 'hm-active-view' }, panel);
  let previousPhase = '';
  return {
    root, panel,
    update(snapshot) {
      const paused = snapshot.status === 'paused';
      const label = paused ? 'PAUSED' : snapshot.stage === 'countdown' ? 'GET READY' :
        ({ EMOM: 'WORK', SIDE_HOLD: 'WORK', AMRAP_REPS: 'AMRAP REPS' }[snapshot.kind] || snapshot.kind);
      root.dataset.state = paused ? 'paused' : snapshot.stage === 'countdown' ? 'countdown' : snapshot.kind.toLowerCase();
      state.textContent = label;
      const name = snapshot.phase?.name || initialPhase.name;
      const key = `${name} · ${label}`;
      if (key !== previousPhase) { previousPhase=key;phase.replaceChildren(el('span',{className:'focus-phase-name'},name),el('span',{'aria-hidden':'true'},' · '),el('span',{className:'focus-phase-state'},label)); }
      const fraction = snapshot.stage === 'countdown' ? snapshot.countdown / 3 : snapshot.remainingMs / (snapshot.endMs - snapshot.startMs);
      ring.style.strokeDashoffset = String(100 * (1 - Math.max(0, Math.min(1, fraction))));
      clock.setAttribute('aria-label', snapshot.stage === 'countdown' ? `Starting in ${snapshot.countdown}` : `Phase time remaining: ${formatTime(snapshot.remainingMs)}`);
    },
  };
}
