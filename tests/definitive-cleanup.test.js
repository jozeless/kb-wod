import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {classicIron} from '../src/data/classic-iron.js';
import {workouts,libraryWorkouts,findWorkout,isAvailableSession} from '../src/data/catalog.js';
import {cleanWeeklyPlan,assignWorkout,validatePlan,days} from '../src/domain/planning.js';
import {loadPlan,savePlan,planKey} from '../src/storage/weekly-plan.js';
import {createSync,accountKey,workspaceKey} from '../src/cloud/sync.js';
import {authKey} from '../src/cloud/auth.js';
import {analyzeProgress,completedSessions,trainingDate,shiftMonth} from '../src/domain/progress-analytics.js';
import {fastestClassicIronRound} from '../src/domain/classic-iron-progress.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
const retired=JSON.parse(read('tests/fixtures/retired-sessions.json'));
const ref={workoutId:'classic-iron',version:1};
const saved=(id,ownerId='A')=>({id,status:'completed',ownerId,workoutId:classicIron.id,workoutVersion:1,workoutSnapshot:structuredClone(classicIron),startedAt:'2026-11-13T10:00:00Z',completedAt:'2026-11-13T10:20:03Z',activeDurationMs:1200000,results:{completedRounds:3,partialReps:20,roundTimesMs:[70000,80000,75000]}});
function harness(records=[]){
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>{if(failWrite)throw Error('Storage blocked');data.set(k,v);}},auth={user:null,configured:true,revision:0};let failWrite=false,online=true,failUpload=false,gate=null;const remote=[],cloud=[],uploaded=[];
 const api={sessions:async()=>remote,uploadSession:async r=>{if(failUpload)throw Error('Upload blocked');uploaded.push(structuredClone(r));},plan:async()=>{if(gate)await gate;return structuredClone(cloud);},uploadPlan:async rows=>{if(failUpload)throw Error('Upload blocked');cloud.splice(0,cloud.length,...structuredClone(rows));}};
 const store={listSessions:async()=>structuredClone(records),receiveSession:async r=>{records.push(structuredClone(r));return true;},claimSessions:async()=>{throw Error('Unexpected claim');}};
 const sync=createSync(auth,api,{storage,store,online:()=>online});
 const login=async(id='A')=>{auth.user=id?{id}:null;auth.revision++;storage.setItem(authKey,JSON.stringify(id?{user:{id}}:null));await sync.accountChanged();};
 return {sync,auth,storage,data,records,cloud,remote,uploaded,login,setOnline:v=>online=v,setFailWrite:v=>failWrite=v,setFailUpload:v=>failUpload=v,setGate:v=>gate=v};
}
test('catalog contains only Classic Iron and no retired/historical/demo route can resolve',()=>{
 assert.deepEqual(workouts,[classicIron]);assert.deepEqual(libraryWorkouts,[classicIron]);
 for(const [id,version] of JSON.parse(read('tests/fixtures/retired-routes.json')))assert.equal(findWorkout(id,version),undefined,`${id}/${version}`);
 assert.equal(findWorkout('classic-iron',2),undefined);assert.equal(findWorkout('classic-iron',1),classicIron);
});
test('weekly projection removes unavailable versions without changing Classic Iron, mutating input or hardcoding future IDs',()=>{
 const original={Monday:ref,Tuesday:{workoutId:'monday-paranoid',version:1},Friday:{workoutId:'oldschool-eagle',version:1},Sunday:{workoutId:'classic-iron',version:2}},before=structuredClone(original);
 assert.deepEqual(cleanWeeklyPlan(original),{Monday:ref,Tuesday:null,Friday:null,Sunday:{workoutId:'classic-iron',version:2}});assert.deepEqual(original,before);
 const future={...classicIron,id:'future-workout'};workouts.push(future);try{assert.deepEqual(cleanWeeklyPlan({Monday:{workoutId:future.id,version:1}}),{Monday:{workoutId:future.id,version:1}});}finally{workouts.pop();}
 assert.equal(assignWorkout({},'Tuesday',classicIron).Tuesday.workoutId,'classic-iron');assert.equal(days.length,7);assert.throws(()=>validatePlan({Invalid:ref}));
});
test('History/Progress eligibility excludes retired data, malformed results and foreign ownership without rewriting any record',()=>{
 const current=saved('current'),foreign=saved('foreign','B'),old={...saved('historical-classic'),results:{completedRounds:8}};
 const records=[...structuredClone(retired),{...retired[0],id:'bad-legacy',results:null},current,foreign,old,{...current,id:'draft',status:'draft'}],before=structuredClone(records);
 const canRead=r=>r.ownerId==='A'||!r.ownerId;
 assert.equal(retired.some(isAvailableSession),false);assert.equal(completedSessions(records,canRead).length,2);
 const analysis=analyzeProgress(records,{year:2026,month:11},canRead);assert.equal(analysis.month.workouts,2);assert.equal(analysis.month.activeDurationMs,2400000);assert.equal(analysis.month.activeDays,1);
 assert.equal(fastestClassicIronRound(records,canRead).durationMs,70000);assert.deepEqual(records,before);
});
test('calendar date validation, leap years and month changes remain exact for authorized Classic Iron sessions',()=>{
 assert.equal(trainingDate('2026-02-29T10:00:00Z'),null);assert.ok(trainingDate('2024-02-29T10:00:00Z'));assert.equal(trainingDate('2026-11-13'),null);
 assert.deepEqual(shiftMonth({year:2026,month:12},1),{year:2027,month:1});assert.deepEqual(shiftMonth({year:2026,month:1},-1),{year:2025,month:12});
 const record={...saved('leap'),startedAt:'2024-02-29T12:00:00Z'};assert.equal(analyzeProgress([record],{year:2024,month:2},()=>true).month.weeks.flatMap(w=>w.days).filter(Boolean).length,29);
});
test('startup clears stored guest/account plan references, preserves Classic Iron and never reads abandoned Hide/Restore preferences',async()=>{
 const h=harness(),legacy={Monday:{workoutId:'monday-paranoid',version:4},Friday:ref};h.storage.setItem(planKey,JSON.stringify(legacy));h.storage.setItem('kb2.library.visibility.v1:guest','corrupt preference deliberately retained');await h.login(null);
 assert.deepEqual(JSON.parse(h.storage.getItem(planKey)),{Monday:null,Friday:ref});assert.equal(h.storage.getItem('kb2.library.visibility.v1:guest'),'corrupt preference deliberately retained');
 h.data.set(accountKey('A'),JSON.stringify({acks:{previous:true},plan:{value:legacy,base:legacy,confirmed:true,dirty:false}}));h.setOnline(false);await h.login('A');
 assert.equal(JSON.parse(h.storage.getItem(planKey)).Monday,null);assert.deepEqual(JSON.parse(h.storage.getItem(planKey)).Friday,ref);assert.equal(JSON.parse(h.storage.getItem(accountKey('A'))).acks.previous,true);
});
test('outdated cloud plan is cleaned and tombstones sync via the original plan endpoint',async()=>{
 const h=harness();await h.login();h.cloud.push({weekday:'Monday',workout_id:'oldschool-tiger',workout_version:1},{weekday:'Friday',workout_id:'classic-iron',workout_version:1});await h.sync.sync();
 assert.equal(JSON.parse(h.storage.getItem(planKey)).Monday,null);assert.deepEqual(JSON.parse(h.storage.getItem(planKey)).Friday,ref);assert.equal(h.cloud.find(r=>r.weekday==='Monday').workout_id,null);assert.equal(h.cloud.find(r=>r.weekday==='Friday').workout_id,'classic-iron');assert.equal(h.sync.state.message,'Synced');
});
test('local cleanup and failed cloud cleanup remain safe offline and retry without resurrecting retired cards or sessions',async()=>{
 const h=harness([saved('classic'),...retired.map(r=>({...r,ownerId:'A'}))]);h.setOnline(false);await h.login();h.cloud.push({weekday:'Monday',workout_id:'monday-paranoid',workout_version:4});h.setOnline(true);h.setFailUpload(true);await h.sync.sync();assert.match(h.sync.state.message,/pending/);assert.equal(h.records.length,8);h.setFailUpload(false);await h.sync.sync();assert.equal(h.uploaded.length,1);assert.equal(h.uploaded[0].workoutId,'classic-iron');assert.equal(h.cloud.find(r=>r.weekday==='Monday').workout_id,null);assert.equal(h.records.length,8);
});
test('retired Supabase snapshots, including malformed old results, never block or overwrite current completed sessions',async()=>{
 const current=saved('cloud'),h=harness();for(const record of [...retired,{...retired[0],id:'malformed',results:null},current])h.remote.push({user_id:'A',id:record.id,workout_id:record.workoutId,workout_version:record.workoutVersion,workout_snapshot:record.workoutSnapshot,results:record.results,session_data:record});
 const before=structuredClone(h.remote);await h.login();assert.deepEqual(h.records,[current]);assert.deepEqual(h.remote,before);assert.equal(h.sync.state.message,'Synced');
});
test('stale authentication cannot sanitize the wrong workspace, and a delayed old-account plan cannot overwrite a new account',async()=>{
 const h=harness();await h.login();const before=h.storage.getItem(planKey);h.storage.setItem(authKey,JSON.stringify({user:{id:'B'}}));await h.sync.accountChanged();assert.equal(h.storage.getItem(planKey),before);
 h.storage.setItem(authKey,JSON.stringify({user:{id:'A'}}));let release;h.setGate(new Promise(r=>release=r));const pending=h.sync.sync();await new Promise(r=>setTimeout(r,0));h.setGate(null);const next=h.login('B');release();await pending;await next;await new Promise(r=>setTimeout(r,0));assert.equal(h.sync.state.account,'B');assert.equal(h.storage.getItem(workspaceKey),'B');
});
test('storage restrictions and malformed plans report errors without deleting or overwriting original values',async()=>{
 const h=harness();await h.login(null);h.storage.setItem(planKey,'{broken');await h.sync.accountChanged();assert.ok(h.sync.state.error);assert.equal(h.storage.getItem(planKey),'{broken');assert.ok(loadPlan(h.storage).error);
 h.data.set(planKey,JSON.stringify({Friday:ref}));h.setFailWrite(true);assert.throws(()=>savePlan(h.storage,{}));await h.sync.accountChanged();assert.match(h.sync.state.error,/Storage blocked/);assert.deepEqual(JSON.parse(h.storage.getItem(planKey)),{Friday:ref});
});
test('every runtime JS import is reachable and cached in v38, with no removed module, preferences endpoint or SQL migration left in the runtime',()=>{
 const seen=new Set();function visit(file){if(seen.has(file))return;seen.add(file);for(const match of read(file).matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)){if(match[1].startsWith('.'))visit(path.posix.normalize(path.posix.join(path.posix.dirname(file),match[1])));}}
 visit('src/main.js');const worker=read('service-worker.js'),assets=[...new Set([...worker.matchAll(/'(\.\/[^']*)'/g)].map(m=>m[1]))];assert.match(worker,/kb2-static-v38/);assert.equal(assets.length,54);assert.doesNotMatch(worker,/skipWaiting|clients\.claim/);
 for(const file of seen){assert.ok(assets.includes('./'+file),file);assert.doesNotMatch(read(file),/libraryVisibility|kb_workout_visibility|kb_set_workout_visibility|library-visibility/);}
 for(const dir of ['data','cloud','domain','platform','storage','ui'])for(const file of fs.readdirSync(path.join(root,'src',dir)))if(file.endsWith('.js'))assert.ok(seen.has(`src/${dir}/${file}`),file);
 assert.equal(fs.existsSync(path.join(root,'supabase/migrations/202611130001_library_visibility.sql')),false);
 for(const asset of assets)assert.ok(fs.existsSync(path.join(root,asset)),asset);
});

test('a client never erases an unknown future WOD or Classic Iron version while retiring known IDs',async()=>{
 const future={workoutId:'future-wod',version:3},nextClassic={workoutId:'classic-iron',version:2};assert.deepEqual(cleanWeeklyPlan({Monday:future,Tuesday:nextClassic,Friday:{workoutId:'friday-to-black',version:2}}),{Monday:future,Tuesday:nextClassic,Friday:null});
 const h=harness();await h.login();h.cloud.push({weekday:'Monday',workout_id:'future-wod',workout_version:3},{weekday:'Tuesday',workout_id:'classic-iron',workout_version:2});await h.sync.sync();assert.deepEqual(JSON.parse(h.storage.getItem(planKey)).Monday,future);assert.deepEqual(JSON.parse(h.storage.getItem(planKey)).Tuesday,nextClassic);assert.equal(h.cloud.length,2);assert.equal(findWorkout('future-wod',3),undefined);
});

test('malformed current-workout cloud records retain the original integrity error and never replace local Classic Iron data',async()=>{
 const current=saved('local'),h=harness([current]),before=structuredClone(h.records);h.remote.push({user_id:'A',id:'bad-current',workout_id:'classic-iron',workout_version:1,session_data:{...current,id:'bad-current',workoutSnapshot:{id:'classic-iron',version:2}}});await h.login();assert.match(h.sync.state.error,/Invalid cloud session/);assert.deepEqual(h.records,before);assert.equal(h.sync.state.message,'Sync pending');
});
