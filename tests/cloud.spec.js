import {test,expect} from '@playwright/test';
const A={id:'11111111-1111-4111-8111-111111111111',email:'alice@example.test',email_confirmed_at:'2026-01-01'};
const B={id:'22222222-2222-4222-8222-222222222222',email:'bob@example.test',email_confirmed_at:'2026-01-01'};
async function mockCloud(page,db={sessions:new Map(),plans:new Map(),calls:[],fail:false}){
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
  if(url.pathname.endsWith('/kb_training_sessions')){
   if(req.method()==='POST'){if(body.some(r=>r.user_id!==user.id))return send({},403);for(const r of body)db.sessions.set(`${user.id}:${r.id}`,structuredClone(r));return send(body);}
   return send([...db.sessions.values()].filter(r=>r.user_id===user.id));
  }
  if(url.pathname.endsWith('/kb_weekly_plan')){if(req.method()==='POST'){if(body.some(r=>r.user_id!==user.id))return send({},403);db.plans.set(user.id,structuredClone(body));return send(body);}return send(db.plans.get(user.id)||[]);}
  return send({},404);
 });return db;
}
async function login(page,email=A.email){await page.goto('./#account');await page.getByRole('textbox',{name:'Email',exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill('example-password');await page.getByRole('button',{name:'Log in',exact:true}).click();await expect(page.getByText(`Signed in as ${email}`,{exact:true})).toBeVisible();}
async function seed(page){return page.evaluate(async()=>{const {findWorkout}=await import('./src/data/catalog.js');const {createDraft,finalResults}=await import('./src/domain/result-schemas.js');const {completeSession}=await import('./src/storage/session-store.js');const workout=findWorkout('focus-001-upper-abs',2),r=createDraft(workout,{getItem:()=>null});r.stage='abs-results';r.blockIndex=1;r.activeDurationMs=1200000;r.completedBlocks=['upper','abs'];r.completedAt=new Date().toISOString();r.results=finalResults(r);return completeSession(r);});}
async function metadata(page,user=A){return page.evaluate(id=>JSON.parse(localStorage.getItem(`kb2.cloud.account.v1:${id}`)),user.id);}
test('unconfigured cloud preserves local navigation and explains setup',async({page})=>{await page.addInitScript(()=>{window.KB_SUPABASE_CONFIG={url:'',publishableKey:''};});await page.goto('./#account');await expect(page.getByText(/Cloud is not configured/)).toBeVisible();await page.getByRole('link',{name:'Library',exact:true}).click();await expect(page.locator('.workout-card')).toHaveCount(11);});
test('registration, login persistence, logout and recovery redirects keep the Pages subpath',async({page})=>{
 const db=await mockCloud(page);await page.goto('./#account');await page.getByRole('textbox',{name:'Email',exact:true}).fill(A.email);await page.getByLabel('Password',{exact:true}).fill('example-password');await page.getByRole('button',{name:'Register',exact:true}).click();await expect(page.getByText('Check your email to verify your account before signing in.')).toBeVisible();await page.getByRole('button',{name:'Recover password',exact:true}).click();await expect(page.getByText('If the account exists, a recovery email has been sent.')).toBeVisible();
 expect(db.calls.filter(c=>/signup|recover/.test(c.path)).every(c=>new URLSearchParams(c.query).get('redirect_to')==='http://127.0.0.1:8102/kb-wod/')).toBe(true);
 await login(page);await page.reload();await expect(page.getByText(`Signed in as ${A.email}`,{exact:true})).toBeVisible();await page.getByRole('button',{name:'Log out',exact:true}).click();await expect(page.getByRole('button',{name:'Log in',exact:true})).toBeVisible();
 await page.goto('./#access_token=token-a&refresh_token=refresh-a&expires_in=3600&type=recovery');await page.reload();await expect(page.getByRole('button',{name:'Update password',exact:true})).toBeVisible();expect(page.url()).not.toContain('token-a');await page.getByLabel('Password',{exact:true}).fill('new-example-password');await page.evaluate(async()=>{const {sync}=await import('./src/cloud/runtime.js');await sync.sync();});await expect(page.getByLabel('Password',{exact:true})).toHaveValue('new-example-password');await expect(page.getByLabel('Password',{exact:true})).toBeFocused();await page.getByRole('button',{name:'Update password',exact:true}).click();await expect.poll(()=>db.calls.some(c=>c.method==='PUT'&&c.path==='/auth/v1/user')).toBe(true);
});
test('explicit legacy import is idempotent, account switching hides owned history and preserves guest plan',async({page})=>{
 const db=await mockCloud(page);await page.goto('./');const old=await seed(page);await page.evaluate(()=>localStorage.setItem('kb2.weekly-plan.v1',JSON.stringify({Tuesday:{workoutId:'focus-001-upper-abs',version:1}})));
 await login(page);await expect(page.getByText(`1 unclaimed local sessions can be imported into ${A.email}. Local originals will be retained.`,{exact:true})).toBeVisible();expect(db.sessions.size).toBe(0);page.on('dialog',d=>d.accept());await page.getByRole('button',{name:'Import 1 local sessions',exact:true}).click();await expect.poll(()=>db.sessions.size).toBe(1);
 await expect(page.getByRole('region',{name:'Weekly plan conflict'})).toBeVisible();await page.getByRole('button',{name:'Keep local plan'}).click();await expect.poll(()=>db.plans.get(A.id)?.find(r=>r.weekday==='Tuesday')?.workout_version).toBe(1);
 await page.getByRole('button',{name:'Retry synchronization'}).click();await expect.poll(async()=>(await metadata(page)).acks[old.id]).toBe(true);expect(db.sessions.size).toBe(1);
 await page.getByRole('button',{name:'Log out',exact:true}).click();await login(page,B.email);await expect(page.getByRole('button',{name:'Import 1 local sessions',exact:true})).toHaveCount(0);await page.goto(`./#session/${old.id}`);await expect(page.getByRole('heading',{name:'Session unavailable'})).toBeVisible();expect([...db.sessions.values()].every(r=>r.user_id===A.id)).toBe(true);
 await page.goto('./#account');await page.getByRole('button',{name:'Log out',exact:true}).click();await page.goto('./#today');await expect(page.getByRole('region',{name:'Tuesday',exact:true}).getByText('Upper Body + ABS',{exact:true})).toBeVisible();
});
test('weekly cloud conflict choices, replacement/removal and restore on another device',async({page,browser})=>{
 const db=await mockCloud(page);db.plans.set(A.id,[{user_id:A.id,weekday:'Friday',workout_id:'hybrid-002-full-body-engine',workout_version:1}]);await page.goto('./');await page.evaluate(()=>localStorage.setItem('kb2.weekly-plan.v1',JSON.stringify({Thursday:{workoutId:'focus-002-lower-abs',version:1}})));await login(page);await expect(page.getByRole('region',{name:'Weekly plan conflict'})).toBeVisible();expect((await metadata(page)).plan.confirmed).toBe(false);await page.getByRole('button',{name:'Use cloud plan',exact:true}).click();await page.goto('./#today');await expect(page.getByRole('region',{name:'Friday',exact:true}).getByText('Full Body Engine',{exact:true})).toBeVisible();
 const friday=page.getByRole('region',{name:'Friday',exact:true});await friday.getByRole('button',{name:'Change workout'}).click();await page.getByRole('button',{name:'Assign to Friday: Lower Body + ABS',exact:true}).click();await expect.poll(()=>db.plans.get(A.id).find(r=>r.weekday==='Friday')?.workout_id).toBe('focus-002-lower-abs');await friday.getByRole('button',{name:'Remove',exact:true}).click();await expect.poll(()=>db.plans.get(A.id).find(r=>r.weekday==='Friday')?.workout_id).toBe(null);
 await page.getByRole('region',{name:'Monday',exact:true}).getByRole('button',{name:'Add workout'}).click();await page.getByRole('button',{name:'Assign to Monday: Full Body Engine',exact:true}).click();await expect.poll(()=>db.plans.get(A.id).find(r=>r.weekday==='Monday')?.workout_id).toBe('hybrid-002-full-body-engine');
 const second=await browser.newContext({baseURL:'http://127.0.0.1:8102/kb-wod/'});const other=await second.newPage();const remote=await mockCloud(other);remote.plans.set(A.id,structuredClone(db.plans.get(A.id)));await login(other);await expect(other.getByRole('region',{name:'Weekly plan conflict'})).toBeVisible();await other.getByRole('button',{name:'Use cloud plan'}).click();await other.goto('http://127.0.0.1:8102/kb-wod/#today');await expect(other.getByRole('region',{name:'Monday',exact:true}).getByText('Full Body Engine',{exact:true})).toBeVisible();await second.close();
});
test('offline completion stays local and pending, then retries without duplicate sessions',async({page,context})=>{
 const db=await mockCloud(page);await login(page);await expect.poll(async()=>(await metadata(page)).plan.confirmed).toBe(true);
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
 await page.goto('./#workout/hybrid-002-full-body-engine/1');await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));await page.reload();await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));await context.setOffline(true);
 await page.getByRole('button',{name:'Start Workout',exact:true}).click();await expect(page.locator('.phase-clock')).toHaveText('3');await page.clock.fastForward(1203000);await expect(page.getByRole('heading',{name:'Workout Results',exact:true})).toBeVisible();await page.getByRole('button',{name:'Save Workout',exact:true}).click();await expect(page.getByRole('heading',{name:'Workout saved',exact:true})).toBeVisible();await expect(page.locator('.cloud-session-status')).toHaveText('Sync pending');expect(db.sessions.size).toBe(0);
 await context.setOffline(false);await page.evaluate(()=>dispatchEvent(new Event('online')));await expect.poll(()=>db.sessions.size).toBe(1);await expect(page.locator('.cloud-session-status')).toHaveText('Synced');await page.evaluate(()=>dispatchEvent(new Event('online')));expect(db.sessions.size).toBe(1);
});
test('server upload failure never reports synced and retry preserves the original UUID',async({page})=>{
 const db=await mockCloud(page);await login(page);await expect.poll(async()=>(await metadata(page)).plan.confirmed).toBe(true);db.fail=true;const record=await seed(page);await expect(page.getByText(/Cloud request failed/)).toBeVisible();expect((await metadata(page)).acks[record.id]).toBeUndefined();db.fail=false;await page.getByRole('button',{name:'Retry synchronization'}).click();await expect.poll(async()=>(await metadata(page)).acks[record.id]).toBe(true);expect([...db.sessions.values()][0].id).toBe(record.id);
});

test('shared-device tabs follow logout/account changes without revealing another account history',async({page,context})=>{
 const db=await mockCloud(page);await login(page);const record=await seed(page);await expect.poll(()=>db.sessions.size).toBe(1);
 const other=await context.newPage();await mockCloud(other,db);await other.goto(`./#session/${record.id}`);await expect(other.getByText('Active duration: 20:00',{exact:true})).toBeVisible();
 await page.goto('./#account');await page.getByRole('button',{name:'Log out',exact:true}).click();await expect(other.getByRole('heading',{name:'Session unavailable'})).toBeVisible();
 await login(page,B.email);await expect(other.getByRole('heading',{name:'Session unavailable'})).toBeVisible();expect(db.sessions.size).toBe(1);expect([...db.sessions.values()][0].user_id).toBe(A.id);await other.close();
});
test('cached verified login permits offline reload and locally owned draft recovery',async({page,context})=>{
 await mockCloud(page);await login(page);await expect.poll(async()=>(await metadata(page)).plan.confirmed).toBe(true);
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));await page.goto('./#workout/focus-002-lower-abs/1');await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));await page.reload();await expect.poll(()=>page.evaluate(async()=>{const {auth}=await import('./src/cloud/runtime.js');return auth.user?.id;})).toBe(A.id);
 await page.getByRole('button',{name:'Start Workout',exact:true}).click();await expect(page.locator('.phase-clock')).toHaveText('3');await page.clock.runFor(63000);await page.getByRole('button',{name:'Pause',exact:true}).click();await expect(page.getByText('Draft saved locally.',{exact:true})).toBeVisible();
 await context.setOffline(true);await page.route('https://kb-test.supabase.co/**',route=>route.abort());page.on('dialog',d=>d.accept());await page.reload();await expect(page.getByRole('button',{name:'Resume',exact:true})).toBeVisible();await expect(page.locator('.block-time')).toHaveText('Block remaining: 09:00');await page.clock.fastForward(600000);await expect(page.locator('.block-time')).toHaveText('Block remaining: 09:00');await context.setOffline(false);
});

test('cloud history downloads on a fresh device with original snapshot and UUID',async({page,browser})=>{
 const db=await mockCloud(page);await login(page);const original=await seed(page);await expect.poll(()=>db.sessions.size).toBe(1);
 const second=await browser.newContext({baseURL:'http://127.0.0.1:8102/kb-wod/'});const other=await second.newPage();await mockCloud(other,db);await login(other);
 await expect.poll(()=>other.evaluate(async id=>{const {getSession}=await import('./src/storage/session-store.js');return (await getSession(id))?.ownerId;},original.id)).toBe(A.id);
 await other.goto(`./#session/${original.id}`);await expect(other.getByText('Active duration: 20:00',{exact:true})).toBeVisible();await expect(other.locator('.cloud-session-status')).toHaveText('Synced');
 const restored=await other.evaluate(async id=>{const {getSession}=await import('./src/storage/session-store.js');return getSession(id);},original.id);expect(restored.workoutSnapshot).toEqual(original.workoutSnapshot);expect(restored.results).toEqual(original.results);expect(restored.startedAt).toBe(original.startedAt);expect(restored.id).toBe(original.id);expect(db.sessions.size).toBe(1);await second.close();
});
test('account and conflict views fit mobile and desktop widths',async({page})=>{
 const db=await mockCloud(page);db.plans.set(A.id,[{user_id:A.id,weekday:'Friday',workout_id:'hybrid-002-full-body-engine',workout_version:1}]);await login(page);await expect(page.getByRole('region',{name:'Weekly plan conflict'})).toBeVisible();for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:740});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.getByRole('navigation')).toBeInViewport();}
});
