let userId = null;
export const currentUserId = () => userId;
export function setUserId(id) { userId = id || null; }
export const canReadLocal = record => Boolean(record) && (!record.ownerId || record.ownerId === userId);
