import test from 'node:test';
import assert from 'node:assert/strict';
import {visibilityKey,readVisibility,commitVisibility,recoverVisibility} from '../src/storage/library-visibility.js';
import {planKey} from '../src/storage/weekly-plan.js';
import {workspaceKey,accountKey,createSync} from '../src/cloud/sync.js';
import {authKey} from '../src/cloud/auth.js';
import {createLibraryVisibility} from '../src/cloud/library-visibility.js';
import {withoutHiddenWorkouts} from '../src/domain/library-visibility.js';
import {createCloudApi} from '../src/cloud/api.js';

function memory(){const map=new Map();let writes=0,failAt=0,persistent=false;return {map,getItem:k=>map.get(k)??null,setItem(k,v){writes++;if(failAt&&(writes===failAt||(persistent&&writes>=failAt)))throw Error('Fixture quota');map.set(k,v);},removeItem(k){writes++;if(failAt&&(writes===failAt||(persistent&&writes>=failAt)))throw Error('Fixture quota');map.delete(k);},fail(n,keep=false){writes=0;failAt=n;persistent=keep;},get writes(){return writes;}};}
const ref=id=>({workoutId:id,version:1});
function harness(){
  const storage=memory(),auth={user:{id:'A'},configured:true,revision:1};let online=true,gate=null,fail=false;const rows=new Map(),posts=[];
  const api={async visibility(){if(fail)throw Error('404 migration missing');return [...rows.values()].filter(r=>r.user_id===auth.user.id).map(r=>({...r}));},async setVisibility(id,hidden,revision,clearAssignments,operationId){const key=`${auth.user.id}:${id}`,old=rows.get(key);if((old?.revision||0)!==revision)throw Error('409 conflict');const row={user_id:auth.user.id,workout_id:id,hidden,revision:revision+1,operation_id:operationId};posts.push({...row,clearAssignments});rows.set(key,row);if(gate)await gate;return row;}};
  function owner(id){auth.user=id?{id}:null;auth.revision++;storage.setItem(workspaceKey,id||'');if(id)storage.setItem(authKey,JSON.stringify({user:{id}}));else storage.removeItem(authKey);}
  owner('A');const service=createLibraryVisibility(auth,api,{storage,online:()=>online,lock:change=>Promise.resolve().then(change)});
  return {storage,auth,service,rows,posts,owner,setOnline:v=>online=v,setGate:v=>gate=v,setFail:v=>fail=v};
}
test('hide removes every version of only the target ID, restore does not recreate assignments, and owner/guest records stay separate',()=>{
  const storage=memory(),plan={Monday:ref('classic-iron'),Tuesday:{workoutId:'classic-iron',version:99},Friday:ref('other')};storage.setItem(planKey,JSON.stringify(plan));
  commitVisibility(storage,null,{'classic-iron':{hidden:true,revision:0,dirty:false}});assert.deepEqual(JSON.parse(storage.getItem(planKey)),{Monday:null,Tuesday:null,Friday:ref('other')});
  assert.deepEqual(readVisibility(storage,'A').entries,{});commitVisibility(storage,'A',{'other':{hidden:true,revision:0,dirty:true}});assert.equal(readVisibility(storage,null).entries['classic-iron'].hidden,true);
  commitVisibility(storage,null,{'classic-iron':{hidden:false,revision:0,dirty:false}});assert.equal(JSON.parse(storage.getItem(planKey)).Monday,null);assert.equal(JSON.parse(storage.getItem(planKey)).Friday,null);assert.equal(readVisibility(storage,'A').entries.other.hidden,true);
  assert.deepEqual(withoutHiddenWorkouts(plan,[]),plan);
});
test('each local write failure reports failure and restores the original entries and unrelated assignments',()=>{
  for(const stage of [1,2,3]){
    const storage=memory(),original={Monday:ref('classic-iron'),Friday:ref('other')};storage.setItem(planKey,JSON.stringify(original));storage.fail(stage);
    assert.throws(()=>commitVisibility(storage,'A',{'classic-iron':{hidden:true,revision:0,dirty:true}}));
    assert.deepEqual(JSON.parse(storage.getItem(planKey)),original);assert.deepEqual(readVisibility(storage,'A').entries,{});
  }
});
test('persistent failure retains a durable original plan; recovery rolls back before the next workspace mutation',()=>{
  const storage=memory(),original={Monday:ref('classic-iron'),Friday:ref('other')};storage.setItem(planKey,JSON.stringify(original));storage.fail(3,true);
  assert.throws(()=>commitVisibility(storage,'A',{'classic-iron':{hidden:true,revision:0,dirty:true}}));const interrupted=readVisibility(storage,'A');assert.equal(interrupted.journal.beforePlan,JSON.stringify(original));assert.deepEqual(interrupted.entries,{});
  storage.fail(0);recoverVisibility(storage,'A');assert.deepEqual(JSON.parse(storage.getItem(planKey)),original);assert.equal(readVisibility(storage,'A').journal,undefined);
});
test('recovery never overwrites an externally changed plan and preserves both durable plan copies',()=>{
  const storage=memory();storage.setItem(planKey,JSON.stringify({Monday:ref('classic-iron')}));storage.fail(3,true);assert.throws(()=>commitVisibility(storage,'A',{'classic-iron':{hidden:true,revision:0,dirty:true}}));storage.fail(0);const newer={Tuesday:ref('other')};storage.setItem(planKey,JSON.stringify(newer));assert.throws(()=>recoverVisibility(storage,'A'),/newer weekly plan/);assert.deepEqual(JSON.parse(storage.getItem(planKey)),newer);assert.ok(readVisibility(storage,'A').journal);
});
test('guest settings never upload or migrate into an account, while queued account settings survive service recreation',async()=>{
  const h=harness();h.owner(null);assert.equal(await h.service.change('classic-iron',true),true);await h.service.synchronize();assert.equal(h.posts.length,0);assert.equal(readVisibility(h.storage,null).entries['classic-iron'].dirty,false);
  h.owner('A');assert.deepEqual(h.service.state.hiddenIds,[]);h.setOnline(false);await h.service.change('other',true);assert.match(h.service.state.message,/pending.*Offline/);const reloaded=createLibraryVisibility(h.auth,{visibility:async()=>[],setVisibility:async()=>{throw Error('Offline');}},{storage:h.storage,online:()=>false,lock:fn=>Promise.resolve(fn())});assert.deepEqual(reloaded.state.hiddenIds,['other']);assert.deepEqual(readVisibility(h.storage,null).entries['classic-iron'].hidden,true);
});
test('remote settings merge per workout, clean assigned hidden IDs, and receive explicit CAS acknowledgments',async()=>{
  const h=harness();h.storage.setItem(planKey,JSON.stringify({Monday:ref('classic-iron'),Friday:ref('other')}));h.rows.set('A:other',{user_id:'A',workout_id:'other',hidden:true,revision:1});await h.service.change('classic-iron',true);await h.service.synchronize();assert.equal(h.posts.length,1);assert.equal(h.posts[0].revision,1);assert.deepEqual(new Set(h.service.state.hiddenIds),new Set(['classic-iron','other']));assert.deepEqual(JSON.parse(h.storage.getItem(planKey)),{Monday:null,Friday:null});assert.match(h.service.state.message,/synchronized/);await h.service.synchronize();assert.equal(h.posts.length,1);
});
test('concurrent remote change is retained as an explicit choice, never overwritten with a stale preference array',async()=>{
  const h=harness();h.rows.set('A:classic-iron',{user_id:'A',workout_id:'classic-iron',hidden:false,revision:1});await h.service.synchronize();await h.service.change('classic-iron',true);h.rows.set('A:classic-iron',{user_id:'A',workout_id:'classic-iron',hidden:false,revision:2});await h.service.synchronize();assert.equal(h.posts.length,0);assert.ok(h.service.state.conflicts['classic-iron']);await h.service.resolve('classic-iron',true);await h.service.synchronize();assert.equal(h.posts.length,1);assert.equal(h.posts[0].revision,3);assert.equal(h.posts[0].hidden,true);
});
test('cloud setting can be chosen without recreating prior weekly assignments',async()=>{
  const h=harness();h.rows.set('A:classic-iron',{user_id:'A',workout_id:'classic-iron',hidden:false,revision:1});await h.service.synchronize();await h.service.change('classic-iron',true);h.rows.set('A:classic-iron',{user_id:'A',workout_id:'classic-iron',hidden:false,revision:2});await h.service.synchronize();await h.service.resolve('classic-iron',false);await h.service.synchronize();assert.deepEqual(h.service.state.hiddenIds,[]);assert.equal(h.posts.length,1);
});
test('a fresh local restore during an in-flight hide remains queued and eventually wins without duplicate revision writes',async()=>{
  const h=harness();await h.service.change('classic-iron',true);let release;h.setGate(new Promise(r=>release=r));const operation=h.service.synchronize();while(!h.posts.length)await new Promise(r=>setTimeout(r,0));await h.service.change('classic-iron',false);h.setGate(null);release();await operation;for(let i=0;i<10&&readVisibility(h.storage,'A').entries['classic-iron'].dirty;i++)await new Promise(r=>setTimeout(r,0));assert.equal(h.rows.get('A:classic-iron').hidden,false);assert.equal(h.posts.length,2);assert.equal(readVisibility(h.storage,'A').entries['classic-iron'].dirty,false);
});
test('stale auth/workspace and stale view owner cannot write another account or guest preferences',async()=>{
  const h=harness();h.owner('B');const before=new Map(h.storage.map);assert.equal(await h.service.change('classic-iron',true,'A'),false);assert.deepEqual(h.storage.map,before);
  h.storage.setItem(workspaceKey,'A');assert.equal(await h.service.change('classic-iron',true,'B'),false);assert.equal(h.storage.getItem(visibilityKey('B')),null);
});
test('missing migration or failed transport never claims Library sync success and preserves the queued local change',async()=>{
  const h=harness();await h.service.change('classic-iron',true);h.setFail(true);await h.service.synchronize();assert.match(h.service.state.error,/migration/);assert.doesNotMatch(h.service.state.message,/synchronized/);assert.equal(readVisibility(h.storage,'A').entries['classic-iron'].dirty,true);h.setFail(false);await h.service.synchronize();assert.match(h.service.state.message,/synchronized/);
});
test('invalid persisted preferences and foreign cloud rows remain preserved and block unsafe changes',async()=>{
  const h=harness();h.storage.setItem(visibilityKey('A'),'broken');assert.equal(await h.service.change('classic-iron',true),false);assert.equal(h.storage.getItem(visibilityKey('A')),'broken');assert.equal(h.service.state.blocked,true);
});
test('malformed recovery snapshots never replace an existing weekly plan',()=>{
  const storage=memory();storage.setItem(visibilityKey('A'),JSON.stringify({version:1,entries:{},journal:{beforePlan:'not-json',afterPlan:null}}));assert.throws(()=>recoverVisibility(storage,'A'));assert.equal(storage.getItem(planKey),null);assert.ok(readVisibility(storage,'A').journal);
});
test('an account change while a cloud read is pending cannot apply the old account preferences or plan',async()=>{
  const storage=memory(),auth={user:{id:'A'},configured:true,revision:1};storage.setItem(workspaceKey,'A');storage.setItem(authKey,JSON.stringify({user:{id:'A'}}));let release,started=false;
  const pending=new Promise(r=>release=r),api={async visibility(){started=true;await pending;return [{user_id:'A',workout_id:'classic-iron',hidden:true,revision:1}];}};
  const service=createLibraryVisibility(auth,api,{storage,online:()=>true,lock:fn=>Promise.resolve().then(fn)});const operation=service.synchronize();while(!started)await new Promise(r=>setTimeout(r,0));
  auth.user={id:'B'};auth.revision++;storage.setItem(workspaceKey,'B');storage.setItem(authKey,JSON.stringify({user:{id:'B'}}));storage.setItem(planKey,JSON.stringify({Friday:ref('other')}));const before=new Map(storage.map);release();await operation;assert.deepEqual(storage.map,before);assert.deepEqual(service.state.hiddenIds,[]);
});
test('foreign preference rows are rejected without persisting them',async()=>{
  const h=harness();const service=createLibraryVisibility(h.auth,{visibility:async()=>[{user_id:'B',workout_id:'classic-iron',hidden:true,revision:1}]},{storage:h.storage,online:()=>true,lock:fn=>Promise.resolve().then(fn)});await service.synchronize();assert.match(service.state.error,/Invalid cloud/);assert.equal(h.storage.getItem(visibilityKey('A')),null);
});
test('offline hide followed by restore still synchronizes assignment cleanup without recreating old days',async()=>{
  const h=harness();h.setOnline(false);await h.service.change('classic-iron',true);await h.service.change('classic-iron',false);assert.deepEqual(h.service.state.hiddenIds,[]);assert.ok(readVisibility(h.storage,'A').entries['classic-iron'].cleanupToken);h.setOnline(true);await h.service.synchronize();assert.equal(h.posts.length,1);assert.equal(h.posts[0].hidden,false);assert.equal(h.posts[0].clearAssignments,true);assert.equal(readVisibility(h.storage,'A').entries['classic-iron'].cleanupToken,null);
});
test('a lost successful response is acknowledged by operation ID without repeating assignment cleanup',async()=>{
  const h=harness();await h.service.change('classic-iron',true);const entry=readVisibility(h.storage,'A').entries['classic-iron'];h.rows.set('A:classic-iron',{user_id:'A',workout_id:'classic-iron',hidden:true,revision:1,operation_id:entry.operationId});await h.service.synchronize();assert.equal(h.posts.length,0);assert.equal(readVisibility(h.storage,'A').entries['classic-iron'].dirty,false);assert.equal(readVisibility(h.storage,'A').entries['classic-iron'].cleanupToken,null);
});
test('visibility transport uses the authenticated owner, exact operation ID and cleanup intent, rejecting foreign responses',async()=>{
  const operationId='00000000-0000-4000-8000-000000000037',calls=[],auth={user:{id:'A'},revision:1,token:async()=> 'fixture-token'};let foreign=false;
  const api=createCloudApi(auth,{config:{url:'https://fixture.supabase.co',publishableKey:'sb_publishable_fixture'},fetcher:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>[{user_id:foreign?'B':'A',workout_id:'classic-iron',hidden:true,revision:1,operation_id:operationId}]};}});
  await api.setVisibility('classic-iron',true,0,true,operationId);assert.deepEqual(JSON.parse(calls[0].options.body),{p_workout_id:'classic-iron',p_hidden:true,p_expected_revision:0,p_clear_assignments:true,p_operation_id:operationId});assert.match(calls[0].options.headers.Authorization,/fixture-token/);foreign=true;await assert.rejects(()=>api.visibility(),/ownership/);
});
test('hide transaction also cleans the owner plan snapshot/base, preserving acknowledgments and other accounts',()=>{
  const storage=memory(),original={Monday:ref('classic-iron'),Friday:ref('other')},meta={acks:{saved:true},plan:{value:original,base:original,dirty:false,confirmed:true}};storage.setItem(planKey,JSON.stringify(original));storage.setItem(accountKey('A'),JSON.stringify(meta));storage.setItem(accountKey('B'),JSON.stringify(meta));commitVisibility(storage,'A',{'classic-iron':{hidden:true,revision:0,dirty:true}},accountKey('A'));const changed=JSON.parse(storage.getItem(accountKey('A')));assert.deepEqual(changed.acks,{saved:true});assert.equal(changed.plan.value.Monday,null);assert.equal(changed.plan.base.Monday,null);assert.deepEqual(changed.plan.value.Friday,ref('other'));assert.equal(changed.plan.dirty,false);assert.deepEqual(JSON.parse(storage.getItem(accountKey('B'))),meta);commitVisibility(storage,'A',{'classic-iron':{hidden:false,revision:0,dirty:true}},accountKey('A'));assert.equal(JSON.parse(storage.getItem(accountKey('A'))).plan.value.Monday,null);
});
test('failure at every metadata-journal stage retains both original plan representations and session acknowledgments',()=>{
  for(const stage of [1,2,3,4]){
    const storage=memory(),original={Monday:ref('classic-iron'),Friday:ref('other')},meta={acks:{saved:true},plan:{value:original,base:original,dirty:false}};storage.setItem(planKey,JSON.stringify(original));storage.setItem(accountKey('A'),JSON.stringify(meta));storage.fail(stage);assert.throws(()=>commitVisibility(storage,'A',{'classic-iron':{hidden:true,revision:0,dirty:true}},accountKey('A')));assert.deepEqual(JSON.parse(storage.getItem(planKey)),original);assert.deepEqual(JSON.parse(storage.getItem(accountKey('A'))),meta);assert.deepEqual(readVisibility(storage,'A').entries,{});
  }
});
test('Library settings still synchronize when completed-session storage is unavailable',async()=>{
  const h=harness();await h.service.change('classic-iron',true);const sync=createSync(h.auth,h.api||{visibility:async()=>[]},{storage:h.storage,store:{listSessions:async()=>{throw Error('History blocked');}},online:()=>true,visibility:h.service});await sync.accountChanged();assert.equal(h.rows.get('A:classic-iron').hidden,true);assert.match(h.service.state.message,/synchronized/);assert.match(sync.state.error,/History blocked/);
});
test('unacknowledged hide/restore cleanup blocks stale plan downloads without blocking session synchronization',async()=>{
  const h=harness(),original={Monday:ref('classic-iron'),Friday:ref('other')};
  h.storage.setItem(planKey,JSON.stringify(original));h.storage.setItem(accountKey('A'),JSON.stringify({acks:{},plan:{value:original,base:original,confirmed:true,dirty:false}}));
  await h.service.change('classic-iron',true);await h.service.change('classic-iron',false);h.setFail(true);
  let sessions=0,plans=0;
  const sync=createSync(h.auth,{sessions:async()=>{sessions++;return [];},plan:async()=>{plans++;return [{weekday:'Monday',workout_id:'classic-iron',workout_version:1}];}},{storage:h.storage,store:{listSessions:async()=>[]},online:()=>true,visibility:h.service});
  await sync.accountChanged();assert.equal(sessions,1);assert.equal(plans,0);assert.equal(h.service.hasPendingCleanup('A'),true);assert.equal(JSON.parse(h.storage.getItem(planKey)).Monday,null);assert.deepEqual(JSON.parse(h.storage.getItem(planKey)).Friday,ref('other'));assert.match(sync.state.message,/Weekly plan sync pending/);assert.match(h.service.state.message,/unavailable/);
});
