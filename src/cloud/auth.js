import { supabaseConfig, validateConfig } from './config.js';
import { setUserId } from './identity.js';
export const authKey = 'kb2.cloud.auth.v1';
export function createAuth({config=supabaseConfig,storage=globalThis.localStorage,fetcher=globalThis.fetch,location=globalThis.location}={}) {
  let session=null, revision=0, refreshPromise=null, timer=null, recovery=false, error='',notice='';
  const listeners=new Set();
  let configured=false;
  try { configured=validateConfig(config); } catch(e) { error=e.message; }
  const notify=()=>listeners.forEach(fn=>fn());
  function commit(value) {
    session=value;setUserId(value?.user?.id);clearTimeout(timer);
    if(value){try{storage.setItem(authKey,JSON.stringify(value));}catch{error='Login cannot persist in this browser.';}
      timer=setTimeout(()=>void token().catch(()=>{}),Math.max(1000,(value.expires_at*1000-Date.now())-60000));
    }else {try{storage.removeItem(authKey);}catch{/* Local sign-out still works. */}}
    notify();
  }
  async function request(path,body,accessToken,method='POST') {
    if(!configured)throw new Error(error||'Cloud is not configured. Local workouts remain available.');
    const response=await fetcher(`${config.url.replace(/\/$/,'')}/auth/v1/${path}`,{method,referrerPolicy:'no-referrer',cache:'no-store',signal:globalThis.AbortSignal?.timeout?.(15000),headers:{apikey:config.publishableKey,'Content-Type':'application/json',...(accessToken?{Authorization:`Bearer ${accessToken}`}:{})},...(body?{body:JSON.stringify(body)}:{})}).catch(()=>{const failure=new Error('Authentication is unavailable. Local training remains available.');failure.transport=true;throw failure;});
    const data=await response.json().catch(()=>({}));
    if(!response.ok){const failure=new Error(data?.msg||data?.error_description||data?.message||'Authentication unavailable. Please retry.');failure.status=response.status;throw failure;}
    return data;
  }
  function normalized(value){return {...value,expires_at:value.expires_at||Math.floor(Date.now()/1000)+(value.expires_in||3600)};}
  async function accept(value,expected) {
    const user=await request('user',null,value.access_token,'GET');
    if(expected!==revision)return;
    if(!user?.id||!user.email_confirmed_at)throw new Error('Verify your email before signing in.');
    error='';notice='';commit(normalized({...value,user}));
  }
  async function token() {
    if(!session)throw new Error('Sign in to synchronize.');
    if(session.expires_at*1000-Date.now()>60000)return session.access_token;
    if(!refreshPromise){const expected=revision,old=session;
      refreshPromise=request('token?grant_type=refresh_token',{refresh_token:old.refresh_token}).then(async value=>{await accept(value,expected);if(expected!==revision)throw new Error('Account changed.');return session.access_token;}).catch(e=>{if(expected===revision){error='Login refresh failed. Data remains local; sign in or retry when online.';notify();}throw e;}).finally(()=>{refreshPromise=null;});
    }return refreshPromise;
  }
  const redirect=()=>`${location.origin}${location.pathname}`;
  async function initialize() {
    if(!configured)return;
    const expected=revision;
    const params=new URLSearchParams(location.hash.slice(1));
    if(params.has('access_token')||params.has('error_description')) {
      const value={access_token:params.get('access_token'),refresh_token:params.get('refresh_token'),expires_in:Number(params.get('expires_in')||3600)};
      recovery=params.get('type')==='recovery';
      globalThis.history?.replaceState(null,'',`${location.pathname}${location.search}#account`);
      try {if(params.has('error_description'))throw new Error(params.get('error_description'));await accept(value,expected);}catch(e){if(expected===revision){error=e.message;notify();}}return;
    }
    try {const raw=storage.getItem(authKey);if(raw){const saved=JSON.parse(raw);if(!saved.access_token||!saved.refresh_token)throw new Error('Invalid saved login.');session=normalized(saved);await token();await accept(session,expected);}}
    catch(e){if(expected!==revision)return;if((e.transport || e.status>=500 || e.status===429) && session?.user?.id && session.user.email_confirmed_at){error='Cloud verification unavailable. Cached local account remains available; retry when online.';commit(session);}else{error='Saved login could not be verified. Local training remains available.';session=null;setUserId(null);notify();}}
  }
  return {dispose(){clearTimeout(timer);listeners.clear();},initialize,token,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},get user(){return session?.user||null;},get configured(){return configured;},get error(){return error;},get notice(){return notice;},get recovery(){return recovery;},get revision(){return revision;},
    async login(email,password){const expected=++revision;const value=await request('token?grant_type=password',{email,password});await accept(value,expected);},
    async register(email,password){await request(`signup?redirect_to=${encodeURIComponent(redirect())}`,{email,password});},
    async recover(email){await request(`recover?redirect_to=${encodeURIComponent(redirect())}`,{email});},
    async updatePassword(password){const expected=revision,access=await token();if(expected!==revision)throw new Error('Account changed.');await request('user',{password},access,'PUT');if(expected!==revision)return;recovery=false;notice='Password updated.';notify();},
    async logout(){recovery=false;notice='';const access=session?.access_token,expected=++revision;commit(null);if(access)try{await request('logout',{},access);}catch{if(expected===revision){error='Signed out on this device. Remote logout could not be confirmed.';notify();}}},
    async reload(){++revision;clearTimeout(timer);session=null;setUserId(null);await initialize();notify();},
  };
}
