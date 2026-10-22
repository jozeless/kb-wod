import { authKey } from './auth.js';
import { days, validatePlan } from '../domain/planning.js';
import { loadPlan, savePlan } from '../storage/weekly-plan.js';
import * as sessions from '../storage/session-store.js';
export const workspaceKey='kb2.cloud.workspace.v1';
const guestKey='kb2.cloud.guest-plan.v1';
export const accountKey=id=>`kb2.cloud.account.v1:${id}`;
export function canonicalPlan(plan){return Object.fromEntries(days.map(day=>[day,plan[day]||null]));}
const stable=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
export const samePlan=(a,b)=>JSON.stringify(canonicalPlan(a))===JSON.stringify(canonicalPlan(b));
export function rowsToPlan(rows) {
  const plan={};for(const row of rows){if(!days.includes(row.weekday))throw new Error('Invalid cloud weekday.');plan[row.weekday]=row.workout_id===null?null:{workoutId:row.workout_id,version:row.workout_version};}
  return validatePlan(plan);
}
export function createSync(auth,api,{storage=globalThis.localStorage,store=sessions,online=()=>globalThis.navigator.onLine}={}) {
  let account=null,epoch=0,running=false,rerun=false,conflict=null,importable=[],message='Saved locally',error='',pending=0;
  let retryTimer=null;
  const listeners=new Set();
  const emit=()=>listeners.forEach(fn=>fn());
  const read=(key,fallback)=>{const raw=storage.getItem(key);return raw===null?fallback:JSON.parse(raw);};
  const meta=id=>read(accountKey(id),{acks:{},plan:null});
  const write=(id,value)=>storage.setItem(accountKey(id),JSON.stringify(value));
  const plan=()=>{const value=loadPlan(storage);if(value.error)throw new Error(value.error);return value.plan;};
  function setPlan(value){savePlan(storage,validatePlan(value));globalThis.dispatchEvent?.(new Event('kb-plan-restored'));}
  function switchAccount(){
    const next=auth.user?.id||null;if(next===account && storage.getItem(workspaceKey)===(next||''))return;
    epoch++;clearTimeout(retryTimer);conflict=null;importable=[];pending=0;error='';
    const previous=storage.getItem(workspaceKey)||null,current=plan();
    if(previous){const old=meta(previous);if(old.plan)old.plan.value=current;write(previous,old);}
    else storage.setItem(guestKey,JSON.stringify(current));
    account=next;
    if(next){const nextMeta=meta(next);
      if(!nextMeta.plan)nextMeta.plan={value:previous?{}:current,base:null,confirmed:false,dirty:false};
      write(next,nextMeta);setPlan(nextMeta.plan.value);
    }else setPlan(read(guestKey,{}));
    storage.setItem(workspaceKey,next||'');message='Saved locally';emit();
  }
  async function sync(){
    if(running){rerun=true;return;}clearTimeout(retryTimer);running=true;
    const owner=account,version=epoch,authRevision=auth.revision;
    const valid=()=>owner && storage.getItem(workspaceKey)===owner && (!auth.configured || read(authKey,null)?.user?.id===owner) && account===owner && auth.user?.id===owner && version===epoch && auth.revision===authRevision;
    try {
      error='';if(!valid()){message='Saved locally';return;}
      const local=await store.listSessions();if(!valid())return;
      importable=local.filter(r=>r.status==='completed'&&!r.ownerId);
      let state=meta(owner);
      const queued=local.filter(r=>r.status==='completed'&&r.ownerId===owner&&!state.acks[r.id]);
      pending=queued.length+(state.plan?.dirty?1:0);message=pending?'Sync pending':'Saved locally';emit();
      if(!online()){message=pending?'Sync pending · Offline':'Offline · Saved locally';return;}
      for(const record of queued){await api.uploadSession(record);if(!valid())return;state=meta(owner);state.acks[record.id]=true;write(owner,state);pending=Math.max(0,pending-1);}
      const remote=await api.sessions();if(!valid())return;
      for(const row of remote){
        const record=row.session_data;
        if(row.user_id!==owner || !record || record.id!==row.id || record.workoutId!==row.workout_id || record.workoutVersion!==row.workout_version || record.status!=='completed' || stable(record.workoutSnapshot)!==stable(row.workout_snapshot) || stable(record.results)!==stable(row.results))throw new Error('Invalid cloud session. Local records were preserved.');
        if(!valid())return;const inserted=await store.receiveSession(record,owner);if(!valid())return;
        if(inserted){state=meta(owner);state.acks[record.id]=true;write(owner,state);}
      }
      const cloud=rowsToPlan(await api.plan());if(!valid())return;
      state=meta(owner);const p=state.plan,current=p.value;
      if((!p.confirmed && !samePlan(current,cloud)) || (p.confirmed && p.dirty && !samePlan(cloud,p.base) && !samePlan(current,cloud))){conflict={local:current,cloud};message='Weekly plan needs your choice';return;}
      conflict=null;
      if(p.dirty){const sent=canonicalPlan(current);await api.uploadPlan(days.map(weekday=>({user_id:owner,weekday,workout_id:sent[weekday]?.workoutId||null,workout_version:sent[weekday]?.version||null})));if(!valid())return;
        state=meta(owner);state.plan.base=sent;state.plan.confirmed=true;if(samePlan(state.plan.value,sent))state.plan.dirty=false;write(owner,state);
      }else {
        // Never replace an edit made while the cloud read was in flight.
        if(!samePlan(meta(owner).plan.value,current)) {rerun=true;return;}
        state.plan={value:cloud,base:cloud,confirmed:true,dirty:false};write(owner,state);setPlan(cloud);
      }
      state=meta(owner);pending=state.plan.dirty?1:0;message=pending?'Sync pending':'Synced';
    }catch(e){error=e.message;message=account?'Sync pending':'Saved locally';if(valid()&&online()){retryTimer=setTimeout(()=>void sync(),15000);retryTimer.unref?.();}}
    finally{running=false;emit();if(rerun){rerun=false;queueMicrotask(()=>void sync());}}
  }
  return {
    sessionStatus(id){try{return account&&meta(account).acks[id]?'Synced':'Sync pending';}catch{return 'Saved locally';}},
    subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},get state(){return {account,message,error,pending,conflict,importCount:importable.length};},
    async accountChanged(){try{if(auth.configured && (read(authKey,null)?.user?.id||null)!==(auth.user?.id||null))return;
      if(globalThis.navigator?.locks)await navigator.locks.request('kb2-cloud-workspace',()=>switchAccount());else switchAccount();await sync();}catch(e){error=e.message;emit();}},sync,
    planChanged(){try{if(storage.getItem(workspaceKey)!==(account||'') || (auth.configured && (read(authKey,null)?.user?.id||null)!==account))return;if(account){const state=meta(account);state.plan.value=plan();state.plan.dirty=true;write(account,state);}else storage.setItem(guestKey,JSON.stringify(plan()));void sync();}catch(e){error=e.message;emit();}},
    async importSessions(){const owner=account,version=epoch;if(!owner)return;const ids=importable.map(r=>r.id);try{await store.claimSessions(ids,owner);if(version!==epoch)return;await sync();}catch(e){error=e.message;emit();}},
    async choosePlan(choice){if(!account||!conflict)return;try{const state=meta(account),selected=choice==='local'?conflict.local:conflict.cloud;
      state.plan={value:selected,base:conflict.cloud,confirmed:true,dirty:choice==='local'};write(account,state);conflict=null;setPlan(selected);await sync();
    }catch(e){error=e.message;emit();}},
  };
}
