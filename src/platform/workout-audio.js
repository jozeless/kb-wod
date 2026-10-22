import { audioSamples } from './audio-samples.js';
/** Local samples for start/minute, existing tones as a nonfatal fallback. */
export function createWorkoutAudio(samples = audioSamples) {
  let context = null;
  let enabled = false;
  let generation = 0;
  let voice = null;
  let preparation = null;
  const buffers = {};
  samples.preload();
  function silence() {
    if (!voice) return;
    const current = voice; voice = null;
    current.source.onended = null;
    try { current.source.stop(); } catch { /* Already stopped. */ }
    current.source.disconnect(); current.gain?.disconnect();
  }
  function prepareSamples() {
    const decoder = context;
    preparation ??= Promise.all(['start', 'minute'].map(async type => {
      try {
        const bytes = await samples.get(type);
        if (!bytes || context !== decoder) return;
        const decoded = await decoder.decodeAudioData(bytes.slice(0));
        if (context === decoder) buffers[type] = decoded;
      } catch { /* Missing/invalid sample: retain the existing synthesized signal. */ }
    }));
  }
  async function setEnabled(value) {
    enabled = value;
    const request = ++generation;
    if (!enabled) { silence(); return; }
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      context ??= new Audio();
      // Resume is initiated directly inside Start Workout / the Sound button gesture.
      await context.resume();
      if (request !== generation) return;
      if (context.state !== 'running') enabled = false;
      else prepareSamples();
    } catch { if (request === generation) enabled = false; }
  }
  function track(source, gain = null) {
    voice = { source, gain };
    source.onended = () => {
      source.disconnect(); gain?.disconnect();
      if (voice?.source === source) voice = null;
    };
  }
  return {
    get enabled() { return enabled; },
    enable() { return setEnabled(true); },
    toggle() { return setEnabled(!enabled); },
    silence,
    cue(type) {
      if (!enabled || context?.state !== 'running') return;
      silence(); // A long WAV must not overlap a subsequent cue.
      if (buffers[type]) {
        try {
          const source = context.createBufferSource();
          source.buffer = buffers[type]; source.connect(context.destination);
          track(source); source.start(); return;
        } catch { silence(); /* Fall back without delaying or retrying the cue. */ }
      }
      try {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const time = context.currentTime;
        oscillator.frequency.value = { tick: 520, start: 880, change: 740, minute: 980, block: 1100, complete: 1320 }[type] ?? 740;
        gain.gain.setValueAtTime(0.08, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
        oscillator.connect(gain); gain.connect(context.destination);
        track(oscillator, gain); oscillator.start(time); oscillator.stop(time + 0.2);
      } catch { silence(); /* Audio never controls workout timing. */ }
    },
    dispose() { enabled = false; generation++; silence(); if (context) context.close().catch(() => {}); context = null; },
  };
}
