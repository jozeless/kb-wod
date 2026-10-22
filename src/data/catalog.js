import { hybrid002 } from './hybrid-001-v2.js';
import { demoWorkouts } from './demo-workouts.js';
import { focus002 } from './focus-001-v2.js';
import { focus001 } from './focus-001-upper-abs.js';
import { hybrid001 } from './hybrid-001-strength-sweat.js';
// A version is immutable once used. Future edits append a new version.
export const workoutTypes = [{ id: 'hybrid', label: 'Hybrid' }, { id: 'focus', label: 'Focus' }];
export const workouts = [...demoWorkouts, focus001, focus002, hybrid001, hybrid002];
export const currentWorkouts = workouts.filter(w => !workouts.some(other => other.id === w.id && !other.archived && other.version > w.version));
export function findWorkout(id, version) {
  return workouts.find(w => w.id === id && w.version === Number(version));
}
export function typeLabel(type) { return workoutTypes.find(t => t.id === type)?.label ?? type; }
