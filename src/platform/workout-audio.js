/** Audio is optional; failures never interrupt the timer. No remote assets. */
export function createWorkoutAudio() {
  let context = null;
  let enabled = false;
  let generation = 0;
  return {
    get enabled() { return enabled; },
    async toggle() {
      enabled = !enabled;
      const request = ++generation;
      if (!enabled) return;
      try {
        const Audio = window.AudioContext || window.webkitAudioContext;
        context ??= new Audio();
        await context.resume();
        if (request !== generation) return;
        if (context.state !== 'running') enabled = false;
      } catch { enabled = false; }
    },
    cue(type) {
      if (!enabled || context?.state !== 'running') return;
      try {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const time = context.currentTime;
        oscillator.frequency.value = { tick: 520, start: 880, change: 740, block: 1100, complete: 1320 }[type] ?? 740;
        gain.gain.setValueAtTime(0.08, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
        oscillator.connect(gain); gain.connect(context.destination);
        oscillator.start(time); oscillator.stop(time + 0.2);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      } catch { /* Timer remains usable without audio. */ }
    },
    dispose() { enabled = false; generation++; if (context) context.close().catch(() => {}); context = null; },
  };
}
