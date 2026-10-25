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
export function workoutCard(workout, onSelect, action = 'View workout') {
  const metal = workout.id === 'monday-paranoid' && workout.presentation?.cardStyle === 'hm-kb';
  return el('button', { type: 'button', className: metal ? 'workout-card workout-card--monday-paranoid' : 'workout-card', onClick: () => onSelect(workout), 'aria-label': `${action}: ${workout.name}` },
    metal ? el('span', { className: 'metal-micro-mark', 'aria-hidden': 'true' }, 'HM / KB') : null,
    workout.image ? el('img', { src: workout.image, alt: '', loading: 'lazy' }) : null,
    el('span', { className: 'badge' }, `${typeLabel(workout.type)}${workout.demo ? " · Demo" : ""}`),
    el('strong', {}, workout.name),
    metal ? el('span', { className: 'metal-subtitle' }, workout.presentation.subtitle) : null,
    workout.durationSeconds ? el('span', {}, `${workout.durationSeconds / 60} minutes`) : null,
    workout.phases.length ? el('span', {}, workout.phases.map(p => `${p.name} ${p.durationSeconds / 60} min`).join(' / ')) : null,
    el('span', { className: 'card-footer' }, `${action} →`));
}
export function emptyState(title, text) {
  return el('section', { className: 'empty-state' }, el('h2', {}, title), el('p', {}, text));
}
