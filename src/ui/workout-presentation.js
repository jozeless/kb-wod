import { supportsResults } from '../domain/result-schemas.js';
import { formatTime } from '../domain/workout-timer.js';
export const durationLabel = workout => workout.durationSeconds % 60 ? `${formatTime(workout.durationSeconds * 1000)} total` : `${workout.durationSeconds / 60} minutes`;
export function recordingSummary(workout) {
  if (workout.demo) return 'Demo · No real workout results.';
  if (!supportsResults(workout)) return 'Session result saving is not configured for this historical version.';
  const schema = workout.execution?.schema;
  if (schema === 'thursday-weights-steps-v1') return 'Once pesos de kettlebell (kg) y pasos totales de Hell’s Finisher. Un único total para ambas mitades.';
  if (schema === 'tuesday-weights-rounds-v1') return 'Solo siete pesos de kettlebell (kg) y rondas completas del finisher.';
  if (schema === 'weights-finisher-v1') return 'Exercise weights (kg), complete Thruster repetitions, optional effort and notes.';
  const fields = workout.resultFields || [];
  const labels = [];
  if (fields.some(f => /weight|load/i.test(f.id) || f.fields?.some?.(v => /weight|load/i.test(typeof v === 'string' ? v : v.id)))) labels.push('exercise weights');
  if (fields.some(f => /round/i.test(f.id) || f.rounds || f.fields?.some?.(v => /round/i.test(typeof v === 'string' ? v : v.id)))) labels.push('round counts');
  if (fields.some(f => /interval|minute/i.test(f.id) || f.fields?.includes?.('intervalsCompleted'))) labels.push('completed intervals');
  if (fields.some(f => /partial/i.test(f.id) || f.fields?.includes?.('partialReps'))) labels.push('partial repetitions');
  if (fields.some(f => f.id === 'perceivedEffort')) labels.push('optional effort');
  if (fields.some(f => f.id === 'notes')) labels.push('notes');
  return labels.length ? `Recorded: ${labels.join(' · ')}.` : 'Demo · No real workout results.';
}
