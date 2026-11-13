// Test-only Supabase HTTP fixture, matching the existing auth/sync regression contract.
const A={id:'11111111-1111-4111-8111-111111111111',email:'alice@example.test',email_confirmed_at:'2026-01-01'};
const B={id:'22222222-2222-4222-8222-222222222222',email:'bob@example.test',email_confirmed_at:'2026-01-01'};
export async function mockCloud(page,db={sessions:new Map(),plans:new Map(),calls:[],fail:false}){
 await page.addInitScript(()=>{window.KB_SUPABASE_CONFIG={url:'https://kb-test.supabase.co',publishableKey:'sb_publishable_test'};});
 await page.route('https://kb-test.supabase.co/**',async route=>{
  const req=route.request(),url=new URL(req.url()),body=req.postDataJSON(),token=req.headers().authorization?.replace('Bearer ','');
  const user=token==='token-b'?B:A;db.calls.push({path:url.pathname,method:req.method(),body,query:url.search});
  const send=(data,status=200)=>route.fulfill({status,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'authorization,apikey,content-type,prefer','access-control-allow-methods':'GET,POST,PUT,DELETE,OPTIONS'},contentType:'application/json',body:JSON.stringify(data)});
  if(req.method()==='OPTIONS')return send({});
  if(url.pathname==='/auth/v1/token'){const account=body?.email===B.email||body?.refresh_token==='refresh-b'?B:A;return send({access_token:account===A?'token-a':'token-b',refresh_token:account===A?'refresh-a':'refresh-b',expires_in:3600,user:account});}
  if(url.pathname==='/auth/v1/user')return send(user);
  if(url.pathname.startsWith('/auth/'))return send({});
  if(db.fail&&req.method()==='POST')return send({message:'Unavailable'},503);
  db.visibility??=new Map();
  if(url.pathname.endsWith('/kb_workout_visibility'))return send([...db.visibility.values()].filter(r=>r.user_id===user.id));
  if(url.pathname.endsWith('/rpc/kb_set_workout_visibility')){
   const key=`${user.id}:${body.p_workout_id}`,old=db.visibility.get(key);if(old?.operation_id&&old.operation_id===body.p_operation_id)return send([old]);if((old?.revision||0)!==body.p_expected_revision)return send({message:'Library changed on another device'},409);
   const row={user_id:user.id,workout_id:body.p_workout_id,hidden:body.p_hidden,revision:body.p_expected_revision+1,operation_id:body.p_operation_id};db.visibility.set(key,row);
   if((row.hidden||body.p_clear_assignments)&&db.plans.has(user.id))db.plans.set(user.id,db.plans.get(user.id).map(p=>p.workout_id===row.workout_id?{...p,workout_id:null,workout_version:null}:p));
   return send([row]);
  }
  if(url.pathname.endsWith('/kb_training_sessions')){
   if(req.method()==='POST'){if(body.some(r=>r.user_id!==user.id))return send({},403);for(const r of body)db.sessions.set(`${user.id}:${r.id}`,structuredClone(r));return send(body);}
   return send([...db.sessions.values()].filter(r=>r.user_id===user.id));
  }
  if(url.pathname.endsWith('/kb_weekly_plan')){if(req.method()==='POST'){if(body.some(r=>r.user_id!==user.id))return send({},403);db.plans.set(user.id,structuredClone(body));return send(body);}return send(db.plans.get(user.id)||[]);}
  return send({},404);
 });return db;
}
