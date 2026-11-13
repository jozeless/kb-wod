import { supabaseConfig } from './config.js';
export function createCloudApi(auth,{config=supabaseConfig,fetcher=globalThis.fetch}={}) {
  async function request(table,query='',body) {
    const owner=auth.user?.id,revision=auth.revision,token=await auth.token();
    if(!owner || owner!==auth.user?.id || revision!==auth.revision)throw new Error('Account changed.');
    const response=await fetcher(`${config.url.replace(/\/$/,'')}/rest/v1/${table}?${query}`,{method:body?'POST':'GET',referrerPolicy:'no-referrer',cache:'no-store',signal:globalThis.AbortSignal?.timeout?.(15000),headers:{apikey:config.publishableKey,Authorization:`Bearer ${token}`,'Content-Type':'application/json',...(body?{Prefer:'resolution=merge-duplicates,return=representation'}:{})},...(body?{body:JSON.stringify(body)}:{})});
    if(!response.ok)throw new Error(`Cloud request failed (${response.status}). Data remains local.`);
    const rows=await response.json();
    if(owner!==auth.user?.id || revision!==auth.revision)throw new Error('Account changed.');
    if(!Array.isArray(rows)||rows.some(row=>row.user_id!==owner))throw new Error('Cloud response ownership could not be verified.');
    return rows;
  }
  return {
    async sessions(){const owner=auth.user.id,all=[];for(let offset=0;;offset+=500){const rows=await request('kb_training_sessions',`user_id=eq.${encodeURIComponent(owner)}&select=*&order=id.asc&limit=500&offset=${offset}`);if(auth.user?.id!==owner)throw new Error('Account changed.');all.push(...rows);if(rows.length<500)return all;}},
    plan:()=>request('kb_weekly_plan',`user_id=eq.${encodeURIComponent(auth.user.id)}&select=*`),
    async uploadSession(record){const user_id=auth.user.id;if(record.ownerId!==user_id||record.status!=='completed')throw new Error('Session is not owned by this account.');
      const rows=await request('kb_training_sessions','on_conflict=user_id,id',[{id:record.id,user_id,workout_id:record.workoutId,workout_version:record.workoutVersion,workout_snapshot:record.workoutSnapshot,results:record.results,session_data:record,started_at:record.startedAt,completed_at:record.completedAt}]);
      if(rows.length!==1||rows[0].id!==record.id)throw new Error('Cloud did not confirm this session.');
    },
    async uploadPlan(rows){const result=await request('kb_weekly_plan','on_conflict=user_id,weekday',rows);if(result.length!==7||new Set(result.map(r=>r.weekday)).size!==7)throw new Error('Cloud did not confirm the weekly plan.');},
  };
}
