import { el,button,heading } from './components.js';
import { auth,sync } from '../cloud/runtime.js';
export function accountView() {
  const root=el('div',{'data-account-identity':`${auth.user?.id||'guest'}:${auth.recovery}`},heading('ACCOUNT','Account','Local workouts remain available without signing in.'));
  const info=el('p',{role:'status'});root.append(info);
  if(!auth.configured){info.textContent=auth.error||'Cloud is not configured. See docs/SUPABASE.md for the existing KB WODS project setup.';return root;}
  if(auth.recovery&&!auth.user){info.textContent='Verifying recovery link…';return root;}
  info.textContent=[auth.error,auth.notice,sync.state.error].filter(Boolean).join(' ');
  if(auth.user){
    root.append(el('p',{},`Signed in as ${auth.user.email}`),el('p',{},sync.state.message));
    if(sync.state.importCount)root.append(el('p',{},`${sync.state.importCount} unclaimed local sessions can be imported into ${auth.user.email}. Local originals will be retained.`),button(`Import ${sync.state.importCount} local sessions`,async()=>{if(confirm(`Import ${sync.state.importCount} local sessions into ${auth.user.email}? This links them to this account; local records are retained.`))await sync.importSessions();}));
    if(sync.state.conflict)root.append(el('section',{'aria-label':'Weekly plan conflict'},el('h2',{},'Choose your weekly plan'),el('p',{},'Local and cloud assignments differ. Neither has been overwritten. Choose which plan to keep for this account.'),
      ...['local','cloud'].map(source=>el('div',{},el('h3',{},`${source==='local'?'Local':'Cloud'} plan`),el('ul',{},...Object.entries(sync.state.conflict[source]).map(([day,selected])=>el('li',{},`${day}: ${selected?`${selected.workoutId} · v${selected.version}`:'Unassigned'}`))))),
      button('Keep local plan',()=>void sync.choosePlan('local')),button('Use cloud plan',()=>void sync.choosePlan('cloud'),true)));
    root.append(button('Retry synchronization',()=>void sync.sync(),true),button('Log out',()=>void auth.logout(),true));
  }
  if(!auth.user || auth.recovery){
    const form=el('form',{}),email=el('input',{type:'email',autocomplete:'email',required:'','aria-label':'Email'}),password=el('input',{type:'password',autocomplete:auth.recovery?'new-password':'current-password',minlength:'8','aria-label':'Password'});
    const message=el('p',{role:'status'});let busy=false;
    async function action(kind){
      if(busy)return;if(kind!=='update'&&!email.reportValidity())return;
      if(kind!=='recovery' && (password.value.length<8||!password.reportValidity())){message.textContent='Use a password with at least 8 characters.';return;}
      busy=true;fieldset.disabled=true;message.textContent='Please wait…';
      try {
        if(kind==='login')await auth.login(email.value.trim(),password.value);
        else if(kind==='register'){await auth.register(email.value.trim(),password.value);message.textContent='Check your email to verify your account before signing in.';}
        else if(kind==='recovery'){await auth.recover(email.value.trim());message.textContent='If the account exists, a recovery email has been sent.';}
        else {await auth.updatePassword(password.value);message.textContent='Password updated.';}
      }catch(e){message.textContent=e.message;}finally{password.value='';busy=false;fieldset.disabled=false;}
    }
    const fieldset=el('fieldset',{className:'result-fields'},...(!auth.recovery?[el('label',{},'Email',email)]:[]),el('label',{},auth.recovery?'New password':'Password',password));
    if(auth.recovery)fieldset.append(button('Update password',()=>void action('update')));
    else fieldset.append(button('Log in',()=>void action('login')),button('Register',()=>void action('register'),true),button('Recover password',()=>void action('recovery'),true));
    form.addEventListener('submit',e=>{e.preventDefault();void action(auth.recovery?'update':'login');});form.append(fieldset,message);root.append(form);
  }
  return root;
}
export function syncStatus(record){
  const node=el('p',{className:'cloud-session-status','data-session-id':record.id,'data-session-owner':record.ownerId||''});
  updateSyncStatus(node,record);return node;
}
export function updateSyncStatus(node,record){
  if(!record.ownerId){node.textContent='Saved locally';return;}
  if(record.ownerId!==auth.user?.id){node.textContent='Saved locally';return;}
  // This accessor uses durable acknowledgments, not optimism or navigator.onLine.
  node.textContent=sync.sessionStatus(record.id);
}
