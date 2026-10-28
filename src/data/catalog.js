import { fridayToBlack } from './friday-to-black.js';
import { thursdayBells } from './thursday-bells.js';
import { tuesdayOfSpades } from './tuesday-of-spades.js';
import { mondayParanoidV3 } from './monday-paranoid-v3.js';
import { mondayParanoidV2 } from './monday-paranoid-v2.js';
import { mondayParanoid } from './monday-paranoid.js';
import { focus002LowerAbs } from './focus-002-lower-abs.js';
import { hybrid002FullBodyEngine } from './hybrid-002-full-body-engine.js';
import { hybrid002 } from './hybrid-001-v2.js';
import { demoWorkouts } from './demo-workouts.js';
import { focus002 } from './focus-001-v2.js';
import { focus001 } from './focus-001-upper-abs.js';
import { hybrid001 } from './hybrid-001-strength-sweat.js';
// A version is immutable once used. Future edits append a new version.
export const workoutTypes = [{ id: 'hybrid', label: 'Hybrid' }, { id: 'focus', label: 'Focus' }];
// Internal registry: keep every historical/demo version for exact reference lookup.
export const workouts = [...demoWorkouts, fridayToBlack, thursdayBells, tuesdayOfSpades, focus001, focus002, hybrid001, hybrid002, focus002LowerAbs, hybrid002FullBodyEngine, mondayParanoid, mondayParanoidV2, mondayParanoidV3];
// Compatibility view of latest versions; not the public Library selection.
export const currentWorkouts = workouts.filter(w => !workouts.some(other => other.id === w.id && !other.archived && other.version > w.version));
// Public selection is explicitly pinned and ordered; the full registry above stays intact.
export const libraryWorkouts = [mondayParanoidV3, tuesdayOfSpades, thursdayBells, fridayToBlack];
export function findWorkout(id, version) {
  return workouts.find(w => w.id === id && w.version === Number(version));
}
export function typeLabel(type) { return workoutTypes.find(t => t.id === type)?.label ?? type; }
