import { classicIron } from './classic-iron.js';
// Register future released definitions here; Library and planning derive from this list.
export const workouts = [classicIron];
export const currentWorkouts = workouts.filter(w => !w.archived && !workouts.some(other => other.id === w.id && !other.archived && other.version > w.version));
export const libraryWorkouts = currentWorkouts.filter(w => !w.demo);
export const workoutTypes = [{id: 'hybrid', label: 'Hybrid'}, {id: 'focus', label: 'Focus'}];
export function findWorkout(id, version) { return workouts.find(w => w.id === id && w.version === Number(version)); }
export function typeLabel(type) { return workoutTypes.find(t => t.id === type)?.label ?? type; }
// Saved legacy records remain in storage, but cannot enter the current app projections.
export function isAvailableSession(record) {
  return Boolean(record && findWorkout(record.workoutId, record.workoutVersion) && record.workoutSnapshot?.id === record.workoutId && record.workoutSnapshot?.version === record.workoutVersion);
}
