import { recordedRoundTimes, fastestRound, formatRoundTime } from '../domain/classic-iron-results.js';
import { el } from './components.js';

export function roundTimesView(results, durationMs) {
  const root = el('section', {'aria-label': 'Recorded round times'}, el('h2', {}, 'Round times'));
  let times;
  try { times = recordedRoundTimes(results, durationMs); } catch { times = null; }
  if (times === null) { root.append(el('p', {}, 'Round times not recorded')); return root; }
  if (!times.length) { root.append(el('p', {}, 'No completed round times')); return root; }
  root.append(el('ol', {}, ...times.map((ms, i) => el('li', {}, `Round ${i + 1} — ${formatRoundTime(ms)}`))));
  const best = fastestRound(times);
  root.append(el('p', {}, el('strong', {style: 'color:var(--hm-highlight,#EEEF58)'}, `Fastest round — Round ${best.roundNumber}, ${formatRoundTime(best.durationMs)}`)));
  return root;
}
