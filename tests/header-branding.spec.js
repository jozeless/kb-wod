import {test,expect} from '@playwright/test';
import {capture} from './helpers/ui-baseline.js';

test('approved header on seven routes at four widths preserves every protected component',async({browser,baseURL},info)=>{
 test.setTimeout(120000);
 for(const width of info.project.name==='mobile'?[320,390]:[768,1280]){
  for(const state of ['today','library','details','timer','results','history','account']){
   const args=[browser,baseURL,{width,height:844},`${width}`,state,true];
   const options={headerEvidence:true,artifactRoot:'/workspace/artifacts/ui-v2-09/regressions/header'};
   const before=await capture(...args,{...options,headerBaseline:true});
   const after=await capture(...args,options);
   expect(after.viewportPNG.equals(before.viewportPNG),`${width}/${state}: header changes`).toBe(false);
   expect(after.protectedMetrics,`${width}/${state}: unchanged content geometry and styles`).toEqual(before.protectedMetrics);
   expect(after.contentPNG.equals(before.contentPNG),`${width}/${state}: unchanged content pixels`).toBe(true);
  }
 }
});

test('approved logo, home and account links load offline with the existing PWA identity',async({page,context})=>{
 await page.addInitScript(()=>{window.KB_SUPABASE_CONFIG={url:'',publishableKey:''};});
 await page.goto('./#library');
 const brand=page.getByRole('link',{name:'Heavy Metal KB home',exact:true});
 await expect(brand).toHaveAttribute('href','#today');await expect(brand).toHaveText('HEAVY METAL KB');
 await expect(page.locator('.brand-logo')).toHaveAttribute('src','./assets/branding/hmkblogo001.png');
 expect(await page.locator('.brand-logo').evaluate(n=>n.complete&&n.naturalWidth===1254&&n.naturalHeight===1254)).toBe(true);
 await page.keyboard.press('Tab');await expect(brand).toBeFocused();
 expect(await brand.evaluate(n=>getComputedStyle(n).outlineColor)).toBe('rgb(238, 239, 88)');
 await page.keyboard.press('Tab');await expect(page.locator('.account-control')).toBeFocused();
 expect(await page.locator('.account-control').evaluate(n=>getComputedStyle(n).outlineStyle)).toBe('solid');
 await page.keyboard.press('Enter');await expect(page).toHaveURL(/#account$/);await expect(page.getByText(/Cloud is not configured/)).toBeVisible();
 await brand.click();await expect(page).toHaveURL(/#today$/);
 await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));await page.reload();await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
 for(const file of ['./assets/branding/hmkblogo001.png','./styles/hm-header.css'])expect(await page.evaluate(async file=>Boolean(await (await caches.open('kb2-static-v30')).match(new URL(file,location.href))),file)).toBe(true);
 await context.setOffline(true);await page.reload();
 await expect(brand).toBeVisible();await expect(page.locator('.cloud-indicator')).toHaveText('Local mode');
 expect(await page.locator('.brand-logo').evaluate(n=>n.complete&&n.naturalWidth===1254)).toBe(true);
 await page.getByRole('link',{name:'Library',exact:true}).click();await expect(page.locator('.workout-card')).toHaveCount(4);
 const manifest=await page.evaluate(async()=>fetch('./manifest.webmanifest').then(r=>r.json()));
 expect(manifest.name).toBe('Heavy Metal KB');expect(manifest.short_name).toBe('HM/KB');expect(manifest.icons.map(i=>i.src)).toEqual(['./assets/icons/hmkb-icon-v2-192.png','./assets/icons/hmkb-icon-v2-512.png','./assets/icons/hmkb-maskable-v2-512.png']);
 await context.setOffline(false);
});

const users=[{id:'11111111-1111-4111-8111-111111111111',email:'alice@example.test',email_confirmed_at:'2026-01-01'}, {id:'22222222-2222-4222-8222-222222222222',email:'bob@example.test',email_confirmed_at:'2026-01-01'}];
test('real account control follows login, live sync, failures, offline and account switching',async({page,context})=>{
 let failing=false,release,remotePlan=[];
 await page.addInitScript(()=>{window.KB_SUPABASE_CONFIG={url:'https://header-fixture.supabase.co',publishableKey:'sb_publishable_fixture'};});
 await page.route('https://header-fixture.supabase.co/**',async route=>{
  const request=route.request(),url=new URL(request.url()),body=request.postDataJSON();
  const send=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data),headers:{'access-control-allow-origin':'*'}});
  if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'authorization,apikey,content-type,prefer','access-control-allow-methods':'GET,POST,PUT,DELETE,OPTIONS'}});
  if(url.pathname==='/auth/v1/token'){
   const index=body.email===users[1].email||body.refresh_token==='refresh-b'?1:0;
   return send({access_token:index?'token-b':'token-a',refresh_token:index?'refresh-b':'refresh-a',expires_in:3600,user:users[index]});
  }
  if(url.pathname==='/auth/v1/user')return send(users[request.headers().authorization==='Bearer token-b'?1:0]);
  if(url.pathname.startsWith('/auth/'))return send({});
  if(release){const wait=release;release=null;await wait.promise;}
  return failing?send({message:'Fixture service unavailable'},503):send(url.pathname.endsWith('/kb_weekly_plan')&&request.method()==='GET'?remotePlan:[]);
 });
 await page.goto('./#today');const account=page.locator('.account-control'),status=page.locator('.cloud-indicator');
 await expect(account).toHaveText('Log in');await expect(status).toHaveAttribute('aria-live','polite');
 await account.click();await expect(page).toHaveURL(/#account$/);
 async function login(user,expectedStatus='Synced'){await page.getByLabel('Email',{exact:true}).fill(user.email);await page.getByLabel('Password',{exact:true}).fill('fixture-password');await page.getByRole('button',{name:'Log in',exact:true}).click();await expect(page.getByText(`Signed in as ${user.email}`,{exact:true})).toBeVisible();await expect(account).toHaveText('Account');await expect(status).toHaveText(expectedStatus);}
 async function fits(){
  const layout=await page.evaluate(()=>{
   const rect=s=>document.querySelector(s).getBoundingClientRect();
   return {overflow:document.documentElement.scrollWidth>innerWidth,brandRight:rect('.brand-lockup').right,secondaryLeft:rect('.header-secondary').left,accountBottom:rect('.account-control').bottom,statusTop:rect('.cloud-indicator').top,headerBottom:rect('.app-header').bottom,statusBottom:rect('.cloud-indicator').bottom};
  });
  expect(layout.overflow).toBe(false);expect(layout.brandRight).toBeLessThanOrEqual(layout.secondaryLeft);expect(layout.accountBottom).toBeLessThanOrEqual(layout.statusTop);expect(layout.statusBottom).toBeLessThanOrEqual(layout.headerBottom);
 }
 await login(users[0]);
 for(const width of [320,390,768,1280]){
  await page.setViewportSize({width,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(account).toBeVisible();await expect(status).toBeVisible();await fits();
 }
 await page.setViewportSize({width:320,height:844});
 // Hold a real sync request so the live intermediate status can be observed.
 release={};release.promise=new Promise(resolve=>{release.resolve=resolve;});const resolve=release.resolve;
 await page.evaluate(()=>{void import('./src/cloud/runtime.js').then(({sync})=>sync.sync());});
 await expect(status).toHaveText('Saved locally');await fits();resolve();await expect(status).toHaveText('Synced');
 failing=true;await page.getByRole('button',{name:'Retry synchronization'}).click();await expect(status).toHaveText('Sync pending');await expect(page.getByText(/Cloud request failed/)).toBeVisible();await fits();
 failing=false;await page.getByRole('button',{name:'Retry synchronization'}).click();await expect(status).toHaveText('Synced');
 await context.setOffline(true);await page.evaluate(()=>dispatchEvent(new Event('offline')));await expect(status).toHaveText('Offline · Saved locally');await fits();await expect(account).toHaveText('Account');
 await context.setOffline(false);await page.evaluate(()=>dispatchEvent(new Event('online')));await expect(status).toHaveText('Synced');
 await page.getByRole('button',{name:'Log out',exact:true}).click();await expect(account).toHaveText('Log in');
 // A fresh account with a different cloud plan genuinely requires an explicit choice.
 remotePlan=[{user_id:users[1].id,weekday:'Monday',workout_id:'monday-paranoid',workout_version:3}];
 await login(users[1],'Weekly plan needs your choice');await fits();
 await expect(page.getByText(`Signed in as ${users[0].email}`,{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Use cloud plan',exact:true}).click();await expect(status).toHaveText('Synced');
 await page.getByRole('button',{name:'Log out',exact:true}).click();await expect(account).toHaveText('Log in');await expect(status).toHaveText('Saved locally');
});
