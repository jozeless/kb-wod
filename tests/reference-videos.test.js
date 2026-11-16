import test from 'node:test';
import assert from 'node:assert/strict';
import {workouts, findWorkout} from '../src/data/catalog.js';
import {createRoundAmrapSession, roundAmrapFinalResults} from '../src/domain/round-amrap-results.js';
const approved = {
  'iron-twist': 'https://youtube.com/shorts/BlKoQLB955k?si=8kQGAIttJyFuu8Q0',
  'saturday-morning-beef': 'https://youtube.com/shorts/w-ZRqmfBmrQ?si=I-FJN83Plpq2Azr0',
};
test('only approved WODs have exact HTTPS YouTube reference metadata', () => {
  assert.equal(workouts.length, 4);
  for (const workout of workouts) {
    assert.equal(workout.referenceVideoUrl, approved[workout.id]);
    if (!approved[workout.id]) assert.equal(Object.hasOwn(workout, 'referenceVideoUrl'), false);
    else {
      const url = new URL(workout.referenceVideoUrl);
      assert.equal(url.protocol, 'https:'); assert.equal(url.hostname, 'youtube.com');
    }
  }
});
test('reference metadata remains optional for legacy snapshots and does not change completed results', () => {
  for (const id of Object.keys(approved)) {
    const workout = findWorkout(id, 1);
    const record = {...createRoundAmrapSession(workout, null, `video-${id}`), activeDurationMs: 300000,
      completedAt: '2026-11-16T12:05:03Z', results: {completedRounds: 3, partialReps: 20, roundTimesMs: [70000,80000,75000]}};
    assert.equal(record.workoutSnapshot.referenceVideoUrl, approved[id]);
    assert.deepEqual(roundAmrapFinalResults(record), record.results);
    delete record.workoutSnapshot.referenceVideoUrl;
    assert.deepEqual(roundAmrapFinalResults(record), record.results);
  }
});
