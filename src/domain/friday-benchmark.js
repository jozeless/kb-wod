// Timing describes the measurement context, never a count of completed presses.
// Read the saved snapshot so historical EMOM sessions retain their original labels.
export function floorPressReference(workout) {
  const phase = workout?.phases?.find(p => p.id === 'strength');
  const timed = phase?.format === 'intervals' && phase.timer?.workSeconds === 40 && phase.timer?.restSeconds === 20;
  return timed ? {
    workSeconds: 40,
    formDescription: 'Final Floor Press working set only: fourth Floor Press work interval, 06:00–06:40. Rest: 06:40–07:00; full slot: 06:00–07:00. Count each arm separately; these are not totals across all four rounds.',
    savedDescription: 'Fourth Floor Press working interval (06:00–06:40), rest until 07:00; full slot 06:00–07:00. Not totals across all rounds.',
    metricSuffix: ' · 40s work (06:00–06:40)',
  } : {
    workSeconds: 60,
    formDescription: 'Final Floor Press working set only: fourth Floor Press slot, 06:00–07:00. Count each arm separately; these are not totals across all four rounds.',
    savedDescription: 'Fourth Floor Press set (06:00–07:00), not totals across all rounds.',
    metricSuffix: '',
  };
}
