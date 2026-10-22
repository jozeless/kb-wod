/** Legacy session contract notes. Focus v2 persistence is implemented in session-store.js.
 * Session: { id, workoutId, workoutVersion, workoutSnapshot, startedAt,
 * completedAt, results }. Store the definition snapshot with a completed
 * result so catalog changes never rewrite historical meaning.
 * Weekly assignments contain references only and never create sessions.
 */
// Reserved legacy localStorage namespace: never used for the IndexedDB sessions.
export const sessionStorageKey = 'kb2.sessions.v1';
