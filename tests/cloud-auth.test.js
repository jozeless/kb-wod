import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAuth,authKey} from '../src/cloud/auth.js';
import {validateConfig} from '../src/cloud/config.js';
const config={url:'https://example.supabase.co',publishableKey:'sb_publishable_test'};
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
const user={id:'user-a',email:'a@example.test',email_confirmed_at:'2026-01-01'};
const credentials={access_token:'test-access',refresh_token:'test-refresh',expires_in:3600,user};
function setup(t){const storage=memory(),calls=[];const fetcher=async(url,options)=>{calls.push({url,...options});return new Response(JSON.stringify(url.endsWith('/user')?user:credentials),{status:200});};const auth=createAuth({config,storage,fetcher,location:{origin:'https://jozeless.github.io',pathname:'/kb-wod/',hash:''}});t.after(()=>auth.dispose());return {auth,storage,calls};}
test('only public credentials are accepted; configuration remains optional',()=>{assert.equal(validateConfig({url:'',publishableKey:''}),false);assert.ok(validateConfig(config));assert.throws(()=>validateConfig({...config,publishableKey:'sb_secret_bad'}));assert.throws(()=>validateConfig({...config,url:'http://example.com'}));const key='x.'+btoa(JSON.stringify({role:'service_role'}))+'.x';assert.throws(()=>validateConfig({...config,publishableKey:key}));});
test('verified login persists, reload verifies user, registration and recovery preserve Pages redirect',async t=>{const {auth,storage,calls}=setup(t);await auth.login(user.email,'test-password');assert.equal(auth.user.id,user.id);assert.ok(storage.getItem(authKey));await auth.register(user.email,'test-password');await auth.recover(user.email);for(const call of calls.filter(c=>/signup|recover/.test(c.url)))assert.equal(new URL(call.url).searchParams.get('redirect_to'),'https://jozeless.github.io/kb-wod/');const restored=createAuth({config,storage,fetcher:async()=>new Response(JSON.stringify(user)),location:{hash:''}});t.after(()=>restored.dispose());await restored.initialize();assert.equal(restored.user.id,user.id);await auth.logout();assert.equal(auth.user,null);assert.equal(storage.getItem(authKey),null);});
test('expired login refreshes and unverified users cannot sign in',async t=>{const {auth,storage}=setup(t);storage.setItem(authKey,JSON.stringify({...credentials,expires_at:1}));await auth.initialize();assert.equal(auth.user.id,user.id);const denied=createAuth({config,storage:memory(),fetcher:async url=>new Response(JSON.stringify(url.endsWith('/user')?{...user,email_confirmed_at:null}:credentials))});t.after(()=>denied.dispose());await assert.rejects(denied.login(user.email,'test-password'),/Verify/);assert.equal(denied.user,null);});
test('logout fences an in-flight login so it cannot restore another account',async t=>{let resolve;const gate=new Promise(r=>{resolve=r;});const auth=createAuth({config,storage:memory(),fetcher:async url=>url.endsWith('/user')?new Response(JSON.stringify(user)):(await gate,new Response(JSON.stringify(credentials)))});t.after(()=>auth.dispose());const pending=auth.login(user.email,'test-password');await auth.logout();resolve();await pending;assert.equal(auth.user,null);});

test('cached verified identity survives network failure offline but not an explicit unauthorized response',async t=>{
 const storage=memory();storage.setItem(authKey,JSON.stringify({...credentials,expires_at:Math.floor(Date.now()/1000)+3600}));
 const offline=createAuth({config,storage,location:{hash:''},fetcher:async()=>{throw new TypeError('Offline');}});t.after(()=>offline.dispose());await offline.initialize();assert.equal(offline.user.id,user.id);assert.match(offline.error,/Cached local/);const unavailable=createAuth({config,storage,location:{hash:''},fetcher:async()=>new Response('{"message":"Unavailable"}',{status:503})});t.after(()=>unavailable.dispose());await unavailable.initialize();assert.equal(unavailable.user.id,user.id);
 const revoked=createAuth({config,storage,location:{hash:''},fetcher:async()=>new Response('{"message":"Unauthorized"}',{status:401})});t.after(()=>revoked.dispose());await revoked.initialize();assert.equal(revoked.user,null);const unverified=createAuth({config,storage,location:{hash:''},fetcher:async()=>new Response(JSON.stringify({...user,email_confirmed_at:null}))});t.after(()=>unverified.dispose());await unverified.initialize();assert.equal(unverified.user,null);
});

test('late verification failure from a previous account cannot clear the new login',async t=>{
 const storage=memory();storage.setItem(authKey,JSON.stringify({...credentials,expires_at:Math.floor(Date.now()/1000)+3600}));const other={...user,id:'user-b',email:'b@example.test'};let started,release;const ready=new Promise(r=>started=r),gate=new Promise(r=>release=r);
 const auth=createAuth({config,storage,location:{hash:''},fetcher:async(url,options)=>{
  if(url.includes('/token?'))return new Response(JSON.stringify({...credentials,access_token:'access-b',user:other}));
  if(options.headers.Authorization==='Bearer access-b')return new Response(JSON.stringify(other));
  started();await gate;return new Response('{"message":"Unauthorized"}',{status:401});
 }});t.after(()=>auth.dispose());const old=auth.initialize();await ready;await auth.login(other.email,'test-password');release();await old;assert.equal(auth.user.id,'user-b');assert.equal(JSON.parse(storage.getItem(authKey)).user.id,'user-b');
});
