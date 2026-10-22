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
    const request = store.index('workoutId').getAll(workoutId);
    request.onsuccess = () => done(request.result.sort((a, b) => b.startedAt.localeCompare(a.startedAt)));
  });
}
function write(record, complete) {
  const snapshot = structuredClone(record);
  return transaction('readwrite', (store, done) => {
    const request = store.get(snapshot.id);
    request.onsuccess = () => {
      // Idempotent final save; later draft writes cannot overwrite a completed session.
      if (request.result?.status === 'completed') { done(request.result); return; }
      const value = { ...snapshot, status: complete ? 'completed' : 'draft', updatedAt: new Date().toISOString() };
      if (complete) value.savedAt = new Date().toISOString();
      try { store.put(value); done(value); } catch { store.transaction.abort(); }
    };
  });
}
export const putDraft = record => write(record, false);
export const completeSession = record => write(record, true);
