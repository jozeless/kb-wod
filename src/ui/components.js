import { durationLabel } from './workout-presentation.js';
import { formatTime } from '../domain/workout-timer.js';
import { typeLabel } from '../data/catalog.js';
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'className') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else node.setAttribute(key, value);
  }
  node.append(...children.filter(c => c !== null && c !== undefined));
  return node;
}
export function button(label, handler, secondary = false) {
  return el('button', { type: 'button', className: secondary ? 'secondary' : '', onClick: handler }, label);
}
export function heading(eyebrow, title, description) {
  return el('header', { className: 'page-heading' }, el('p', { className: 'eyebrow' }, eyebrow), el('h1', {}, title), el('p', {}, description));
}
export function phaseBar(workout) {
  const total = workout.phases.reduce((sum, phase) => sum + phase.durationSeconds, 0);
  const bar = el('span', {className: 'phase-bar', role: 'img', 'aria-label': workout.phases.map(p => `${p.name}: ${formatTime(p.durationSeconds * 1000)}`).join(' / ')});
  for (const [index, phase] of workout.phases.entries()) bar.append(el('span', {className: `phase-bar-segment phase-color-${index % 3}${phase.format === 'transition' ? ' phase-transition' : ''}`, style: `width:${phase.durationSeconds / total * 100}%`, 'data-phase': phase.id, 'aria-hidden': 'true'}));
  return bar;
}
export function workoutCard(workout, onSelect, action = 'View workout') {
  return el('button', {type: 'button', className: `workout-card workout-card--hm-kb${workout.demo ? ' workout-card--demo' : ''}`, onClick: () => onSelect(workout), 'aria-label': `${action}: ${workout.name}`},
    el('span', {className: 'metal-micro-mark'}, workout.demo ? 'HEAVY METAL KB · DEMO' : `HEAVY METAL KB${workout.suggestedDay ? ` · ${workout.suggestedDay.toUpperCase()}` : ''}`),
    el('span', {className: 'badge'}, `${typeLabel(workout.type)}${workout.demo ? ' · Demo' : ' · APROBADO'}`),
    el('strong', {}, workout.name),
    !workout.demo ? el('span', {className: 'metal-subtitle'}, workout.presentation?.subtitle || workout.category) : null,
    workout.durationSeconds ? el('span', {}, durationLabel(workout)) : null,
    workout.phases.length ? phaseBar(workout) : null,
    workout.phases.length ? el('span', {className: 'card-structure'}, workout.phases.filter(p => p.format !== 'transition').map(p => `${p.name} ${p.durationSeconds % 60 ? `${p.durationSeconds} sec` : `${p.durationSeconds / 60} min`}`).join(' / ')) : null,
    el('span', {className: 'card-footer'}, `${action} →`));
}
export function emptyState(title, text) {
  return el('section', { className: 'empty-state' }, el('h2', {}, title), el('p', {}, text));
}
