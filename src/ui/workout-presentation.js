import { formatTime } from '../domain/workout-timer.js';
export const durationLabel = workout => workout.presentation?.durationFormat === 'clock' ? formatTime(workout.durationSeconds * 1000) : workout.durationSeconds % 60 ? `${formatTime(workout.durationSeconds * 1000)} total` : `${workout.durationSeconds / 60} minutes`;
