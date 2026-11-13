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
