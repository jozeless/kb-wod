import { currentUserId, canReadLocal } from '../cloud/identity.js';
const DB = 'kb2.training.sessions';
let connection;
function open() {
  if (connection) return connection;
  connection = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore('sessions', { keyPath: 'id' });
      store.createIndex('workoutId', 'workoutId');
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Session storage is blocked by another tab.'));
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); connection = null; };
      resolve(db);
    };
  }).catch(error => { connection = null; throw error; });
  return connection;
}
async function transaction(mode, operation) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sessions', mode);
    let result;
    tx.oncomplete = () => resolve(result);
    tx.onerror = tx.onabort = () => reject(tx.error || new Error('Session transaction failed.'));
    try { operation(tx.objectStore('sessions'), value => { result = value; }); }
    catch (error) { tx.abort(); reject(error); }
  });
}
export function getSession(id) {
  return transaction('readonly', (store, done) => { const request = store.get(id); request.onsuccess = () => done(request.result); });
}
export async function listSessions(workoutId) {
  return transaction('readonly', (store, done) => {
    const request = workoutId ? store.index('workoutId').getAll(workoutId) : store.getAll();
    request.onsuccess = () => done(request.result.sort((a, b) => b.startedAt.localeCompare(a.startedAt)));
  });
}
function write(record, complete) {
  const snapshot = structuredClone(record);
  const ownerAtWrite = Object.hasOwn(snapshot, 'ownerId') ? snapshot.ownerId : currentUserId();
  return transaction('readwrite', (store, done) => {
    const request = store.get(snapshot.id);
    request.onsuccess = () => {
      // Idempotent final save; later draft writes cannot overwrite a completed session.
      if (request.result && !canReadLocal(request.result)) { store.transaction.abort(); return; }
      if (request.result?.status === 'completed') { done(request.result); return; }
      const value = { ...snapshot, ownerId: request.result ? request.result.ownerId || null : ownerAtWrite, status: complete ? 'completed' : 'draft', updatedAt: new Date().toISOString() };
      if (complete) value.savedAt = new Date().toISOString();
      try { store.put(value); done(value); } catch { store.transaction.abort(); }
    };
  });
}
export const putDraft = record => write(record, false);
export async function completeSession(record) { const saved=await write(record,true); globalThis.dispatchEvent?.(new Event('kb-session-change')); return saved; }

// Claim only explicitly selected, unowned completed sessions. One transaction prevents
// two accounts/tabs from importing the same local session under different owners.
export function claimSessions(ids, ownerId) {
  if (!ownerId || currentUserId() !== ownerId) return Promise.reject(new Error('Account changed.'));
  return transaction('readwrite', (store, done) => {
    for (const id of ids) { const request=store.get(id); request.onsuccess=()=>{
      const record=request.result;
      if(!record || record.status!=='completed' || (record.ownerId && record.ownerId!==ownerId)) { store.transaction.abort(); return; }
      store.put({...record,ownerId});
    }; } done(true);
  });
}
export function receiveSession(record, ownerId) {
  if(currentUserId()!==ownerId || !ownerId || record.status!=='completed')return Promise.reject(new Error('Account changed.'));
  return transaction('readwrite',(store,done)=>{
    const request=store.get(record.id);request.onsuccess=()=>{
      // Never replace existing drafts, owned records or unclaimed local history.
      if(request.result?.ownerId && request.result.ownerId!==ownerId){store.transaction.abort();return;}
      if(!request.result)store.put({...record,ownerId});done(!request.result);
    };
  });
}
