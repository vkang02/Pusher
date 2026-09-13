export const colors = {
  bg: '#0A0A0A',
  card: '#161816',
  text: '#F4F6F2',
  textDim55: 'rgba(244,246,242,0.55)',
  textDim5: 'rgba(244,246,242,0.5)',
  textDim45: 'rgba(244,246,242,0.45)',
  textDim65: 'rgba(244,246,242,0.65)',
  textDim7: 'rgba(244,246,242,0.7)',
  textDim3: 'rgba(244,246,242,0.3)',
  border: 'rgba(255,255,255,0.08)',
  border15: 'rgba(255,255,255,0.15)',
  accent: '#CFEAC0',
  accentSoft12: 'rgba(207,234,192,0.12)',
  accentSoft1: 'rgba(207,234,192,0.1)',
  accentSoft14: 'rgba(207,234,192,0.14)',
  accentSoft3: 'rgba(207,234,192,0.35)',
};

export const uid = (p) => p + '-' + Math.random().toString(36).slice(2, 8);

export const REACTION_EMOJIS = ['🔥', '💪', '👏', '🎉'];

export const isoDay = (d) =>
  d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

export function summaryOf(entry) {
  const exercises = entry.exercises || [];
  const count = exercises.length;
  const setTotal = exercises.reduce((n, ex) => n + (ex.sets || []).length, 0);
  const base = `${count} exercise${count === 1 ? '' : 's'} · ${setTotal} sets`;
  return entry.duration_minutes ? `${base} · ${entry.duration_minutes} min` : base;
}

export function dayShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() + ' ' + d.getDate();
}

export function shortDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function longDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export function relativeStatus(lastDateStr, todayKey) {
  if (!lastDateStr) return 'Not logged yet';
  if (lastDateStr === todayKey) return 'Logged today';
  const last = new Date(lastDateStr + 'T00:00:00');
  const today = new Date(todayKey + 'T00:00:00');
  const days = Math.round((today - last) / 86400000);
  if (days === 1) return 'Logged yesterday';
  return `${days} days ago`;
}

const MEMBER_COLORS = ['#CFEAC0', '#9FCB8E', '#7FB0A8', '#B9C98A', '#8FBFAE', '#A7C98F'];
export function colorForIndex(i) {
  return MEMBER_COLORS[i % MEMBER_COLORS.length];
}

export function initialsOf(name) {
  return (name || '').trim().slice(0, 2).toUpperCase();
}
