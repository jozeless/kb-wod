import test from 'node:test';
import assert from 'node:assert/strict';
import { findWorkout } from '../src/data/catalog.js';
import { isRoundAmrap } from '../src/domain/round-amrap-results.js';

test('Iron Arms v1 defines one twenty-minute circuit with the confirmed exercise prescriptions', () => {
  const workout = findWorkout('iron-arms', 1);
  assert.equal(workout.name, 'Iron Arms');
  assert.equal(workout.focus, 'Upper Body / Full Body');
  assert.equal(workout.durationSeconds, 1200);
  assert.equal(workout.execution.restSeconds, 20);
  assert.equal(workout.prescribedWeightKg, undefined);
  assert.equal(isRoundAmrap(workout), true);
  assert.deepEqual(workout.phases.map(phase => [phase.format, phase.durationSeconds, phase.exerciseIds]), [
    ['amrap', 1200, workout.exercises.map(exercise => exercise.id)],
  ]);
  assert.deepEqual(workout.exercises.map(({name, group, target, note}) =>
    [name, group, target.min, target.max, target.unit, note]), [
    ['KB Swing', 'Upper', 10, 10, 'repetitions', undefined],
    ['KB Clean & Press', 'Upper', 10, 10, 'repetitions total', '5 per arm.'],
    ['Single-Arm KB Bent-Over Row', 'Upper', 10, 10, 'repetitions total', '5 per arm.'],
    ['Around the World', 'Core', 10, 10, 'repetitions total', '5 rotations each direction.'],
    ['Dead Bug + Pullover', 'Core', 10, 10, 'repetitions', undefined],
    ['KB Squat + Biceps Curl', 'Legs', 10, 10, 'repetitions', undefined],
    ['KB Standing Calf Raise', 'Legs', 15, 15, 'repetitions', 'Use slow reps with a 1-second pause at the top.'],
  ]);
});
