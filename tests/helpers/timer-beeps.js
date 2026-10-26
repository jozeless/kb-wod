import {expect} from '@playwright/test';
export const frequencies={start:640,minute:760,rest:520,work:1040,finisher:880,complete:620};
export const counts={start:1,minute:1,rest:2,work:1,finisher:3,complete:2};
export async function installBeepSpy(page){
 await page.addInitScript(()=>{
  window.beepNotes=[];
  window.AudioContext=class {
   state='running';currentTime=0;destination={};resume(){return Promise.resolve();}close(){return Promise.resolve();}
   createOscillator(){let note;const source={frequency:{value:0},connect(){},disconnect(){},start(time){note={frequency:source.frequency.value,time,stops:[]};window.beepNotes.push(note);},stop(time){if(note)note.stops.push(time??null);}};return source;}
   createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}};}
  };
 });
}
// Exercise the actual UI/controller at every segment and elapsed-minute boundary.
// Expected events are determined by the format contract, not the production tracker.
export async function verifyWorkoutBeeps(page,id,version){
 await installBeepSpy(page);await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
 await page.goto(`./#workout/${id}/${version}`);
 const data=await page.evaluate(async({id,version})=>{const {findWorkout}=await import('./src/data/catalog.js');const {compileWorkout}=await import('./src/domain/workout-timer.js');const {resultSchema}=await import('./src/domain/result-schemas.js');const w=findWorkout(id,version);return {segments:compileWorkout(w).segments,mode:w.execution?.mode,blocks:resultSchema(w).blocks,duration:w.durationSeconds};},{id,version});
 await page.getByRole('button',{name:'Start Workout',exact:true}).click();await expect(page.locator('.phase-clock')).toHaveText('3');await page.clock.runFor(3000);
 const expected=[];const add=type=>expected.push(...Array(counts[type]).fill(frequencies[type]));const check=async()=>expect(await page.evaluate(()=>window.beepNotes.map(n=>n.frequency))).toEqual(expected);
 const advance=async ms=>{await page.clock.fastForward(ms-100);await page.clock.runFor(100);};add('start');await check();
 for(let index=0;index<data.segments.length;index++){
  const segment=data.segments[index],next=data.segments[index+1];let at=segment.startMs;
  for(let minute=(Math.floor(at/60000)+1)*60000;minute<segment.endMs;minute+=60000){await advance(minute-at);at=minute;await check();}
  await advance(segment.endMs-at);
  const interrupted=data.mode==='block-results'||data.mode==='two-block-results';
  if(!next){add('complete');await check();}
  else if(interrupted&&segment.phase.id!==next.phase.id){
   await expect(page.getByRole('heading',{name:data.blocks[segment.phase.id].title,exact:true})).toBeVisible();await check();await page.clock.fastForward(600000);await check();
   await page.getByRole('button',{name:data.blocks[segment.phase.id].continueLabel,exact:true}).click();await expect(page.locator('.phase-clock')).toHaveText('3');await page.clock.runFor(3000);add(next.kind==='AMRAP_REPS'?'finisher':'work');await check();
  }else {if(next.kind==='REST')add('rest');else if(next.kind==='AMRAP_REPS'||next.phase.audioCue==='finisher')add('finisher');else if(next.kind==='WORK'||segment.phase.id!==next.phase.id&&next.kind!=='TRANSITION')add('work');else if(next.kind==='EMOM')add('minute');await check();}
 }
 await page.clock.fastForward(600000);await check();
 if(data.mode) {const record=await page.evaluate(async({id,version})=>{const {listSessions}=await import('./src/storage/session-store.js');return (await listSessions(id)).find(r=>r.workoutVersion===version);},{id,version});expect(record.activeDurationMs).toBe(data.duration*1000);}
}
