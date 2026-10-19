/** Future session contract. Not a result-saving implementation.
 * Session: { id, workoutId, workoutVersion, workoutSnapshot, startedAt,
 * completedAt, results }. Store the definition snapshot with a completed
 * result so catalog changes never rewrite historical meaning.
 * Weekly assignments contain references only and never create sessions.
 */
export const sessionStorageKey = 'kb2.sessions.v1';
