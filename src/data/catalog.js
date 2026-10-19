import { demoWorkouts } from './demo-workouts.js';
// A version is immutable once used. Future edits append a new version.
export const workoutTypes = [{ id: 'hybrid', label: 'Hybrid' }, { id: 'focus', label: 'Focus' }];
export const workouts = demoWorkouts;
export function findWorkout(id, version) {
  return workouts.find(w => w.id === id && w.version === Number(version));
}
export function typeLabel(type) { return workoutTypes.find(t => t.id === type)?.label ?? type; }
