export const workspaceLockName = 'kb2-cloud-workspace';
let connection;
// All callbacks are synchronous storage mutations; never hold this lock over HTTP.
export function withWorkspaceLock(change) {
  if (globalThis.navigator?.locks) return navigator.locks.request(workspaceLockName, change);
  if (!globalThis.indexedDB) return Promise.reject(new Error('Safe storage locking is unavailable. Your data was preserved.'));
  connection ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('kb2.workspace-lock.v1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('locks');
    request.onsuccess = () => { const db=request.result;db.onversionchange=()=>{db.close();connection=null;};resolve(db); };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Workspace storage is blocked.'));
  }).catch(error => { connection = null; throw error; });
  return connection.then(db => new Promise((resolve, reject) => {
    const tx = db.transaction('locks', 'readwrite'); let result, failure;
    tx.oncomplete = () => resolve(result);
    tx.onerror = tx.onabort = () => reject(failure || tx.error || new Error('Workspace storage failed.'));
    const request = tx.objectStore('locks').get('workspace');
    request.onsuccess = () => {
      try { result = change(); if (result?.then) throw new Error('Workspace changes must be synchronous.'); }
      catch (error) { failure = error; tx.abort(); }
    };
  }));
}
