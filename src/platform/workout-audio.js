// Six patterns, entirely Web Audio. Durations include a click-free envelope;
// gaps are silent. No samples, JavaScript playback timers or external dependency.
export const cuePatterns = Object.freeze({
  start: { frequency: 640, durations: [0.38], gap: 0, peak: 0.28 },
  minute: { frequency: 760, durations: [0.12], gap: 0, peak: 0.22 },
  rest: { frequency: 520, durations: [0.11, 0.11], gap: 0.10, peak: 0.24 },
  work: { frequency: 1040, durations: [0.23], gap: 0, peak: 0.28 },
  finisher: { frequency: 880, durations: [0.11, 0.11, 0.36], gap: 0.10, peak: 0.27 },
  complete: { frequency: 620, durations: [0.40, 0.40], gap: 0.16, peak: 0.26 },
});
export function createWorkoutAudio() {
  let context = null, enabled = false, generation = 0, voice = [], quietUntil = 0, disposed = false;
  function disconnect(node) {
    node.source.onended = null;
    try { node.source.disconnect(); node.gain.disconnect(); } catch { /* Already released. */ }
  }
  function silence() {
    const active=voice;voice=[];
    const now=context?.currentTime??0;
    for(const node of active){
      try {
        if(context?.state==='running' && now>=node.start && now<node.end){
          const end=now+0.015;quietUntil=Math.max(quietUntil,end);
          if(node.gain.gain.cancelAndHoldAtTime)node.gain.gain.cancelAndHoldAtTime(now);
          else {node.gain.gain.cancelScheduledValues?.(now);node.gain.gain.setValueAtTime(node.gain.gain.value||0,now);}
          node.gain.gain.linearRampToValueAtTime(0,end);node.source.stop(end);
        }else {node.source.stop();disconnect(node);}
      }catch{try{node.source.stop();}catch{/* Unavailable. */}disconnect(node);}
    }
  }
  async function setEnabled(value) {
    if(disposed)return;
    enabled=value;const request=++generation;
    if(!value){silence();return;}
    let timeout;
    try {
      const Audio=window.AudioContext||window.webkitAudioContext;
      context??=new Audio();
      // Invoke synchronously in the Start/Sound/Resume user gesture.
      await Promise.race([context.resume(),new Promise(resolve=>{timeout=setTimeout(resolve,250);})]);
      if(request===generation)enabled=context.state==='running';
    }catch{if(request===generation)enabled=false;}
    finally{clearTimeout(timeout);}
  }
  return {
    get enabled(){return enabled;},setEnabled,enable(){return setEnabled(true);},toggle(){return setEnabled(!enabled);},silence,
    cue(type) {
      const pattern=cuePatterns[type];
      if(!pattern || !enabled || context?.state!=='running')return;
      silence();
      try {
        let start=Math.max(context.currentTime,quietUntil);
        for(const duration of pattern.durations){
          const source=context.createOscillator(),gain=context.createGain(),node={source,gain,start,end:start+duration};voice.push(node);
          source.type='sine';source.frequency.value=pattern.frequency;
          gain.gain.setValueAtTime(0,start);
          gain.gain.linearRampToValueAtTime(pattern.peak,start+0.012);
          gain.gain.setValueAtTime(pattern.peak,start+duration-0.035);
          gain.gain.linearRampToValueAtTime(0,start+duration);
          source.connect(gain);gain.connect(context.destination);
          source.onended=()=>{disconnect(node);voice=voice.filter(active=>active!==node);};
          source.start(start);source.stop(start+duration+0.005);
          start+=duration+pattern.gap;
        }
      }catch{silence();/* Audio failures never affect workout timing. */}
    },
    dispose(){disposed=true;enabled=false;generation++;silence();const closing=context;context=null;if(closing){const timer=setTimeout(()=>{try{closing.close().catch(()=>{});}catch{/* Unavailable context. */}},20);timer.unref?.();}},
  };
}
