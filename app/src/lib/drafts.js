// Unsaved-work safety net. iOS freezes and discards background web apps to free memory; when you
// come back the page reloads from scratch and anything only held in memory is gone. So the open
// workout sheet is mirrored into localStorage as you type, and reopened on the next launch.
// Storage can be blocked or full (private windows), so every access is wrapped.

const MAX_AGE_MS = 18 * 60 * 60 * 1000;

const read = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.savedAt || Date.now() - data.savedAt > MAX_AGE_MS) { localStorage.removeItem(key); return null; }
    return data;
  } catch { return null; }
};
const write = (key, data) => { try { localStorage.setItem(key, JSON.stringify({ ...data, savedAt: Date.now() })); } catch { /* storage unavailable */ } };
const remove = (key) => { try { localStorage.removeItem(key); } catch { /* storage unavailable */ } };

export const draftKey = (userId, dateKey, workoutId) => `wb:draft:${userId}:${dateKey}:${workoutId || 'none'}`;
export const saveDraft = (key, data) => write(key, data);
export const loadDraft = (key) => read(key);
export const clearDraft = (key) => remove(key);

// Which sheet was open, so the app can put it back after a reload.
const markerKey = (userId) => `wb:open:${userId}`;
export const saveMarker = (userId, data) => write(markerKey(userId), data);
export const loadMarker = (userId) => read(markerKey(userId));
export const clearMarker = (userId) => remove(markerKey(userId));
