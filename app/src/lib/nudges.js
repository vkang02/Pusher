import { supabase } from '../supabaseClient.js';

export const NUDGE_MAX = 140;

export const NUDGE_PRESETS = [
  'Get up and lift! 💪',
  'Have you worked out yet today?',
  'No excuses today 🔥',
  'Gym time. Who’s in? 🏋️',
  'Don’t break the streak ⚡',
  'Proud of you. Keep going 👏',
  'One more set. You’ve got it 🙌',
  'Rest day’s over 😤',
  'Let’s go, crew! 🎉',
];

// A nudge only pops up if it's recent; older ones are history, not a prompt.
export const NUDGE_FRESH_MS = 10 * 60 * 1000;

const seenKey = (userId) => `wb:nudges-seen:${userId}`;

export function loadSeen(userId) {
  try { return new Set(JSON.parse(localStorage.getItem(seenKey(userId)) || '[]')); } catch { return new Set(); }
}

export function saveSeen(userId, set) {
  try { localStorage.setItem(seenKey(userId), JSON.stringify([...set].slice(-60))); } catch { /* storage unavailable */ }
}

export async function sendNudge(groupId, userId, recipientId, message) {
  const body = message.trim().slice(0, NUDGE_MAX);
  if (!body) throw new Error('Write something first.');
  const { error } = await supabase
    .from('nudges')
    .insert({ group_id: groupId, sender_id: userId, recipient_id: recipientId || null, message: body });
  if (error) throw new Error(/slow down/i.test(error.message) ? error.message : 'Could not send that. Try again.');
}

// available:false means the nudges table isn't in the database yet, so the app hides the feature.
export async function fetchRecentNudges(groupId) {
  const since = new Date(Date.now() - NUDGE_FRESH_MS).toISOString();
  const { data, error } = await supabase
    .from('nudges')
    .select('*')
    .eq('group_id', groupId)
    .gt('created_at', since)
    .order('created_at', { ascending: true });
  if (error) return { available: false, rows: [] };
  return { available: true, rows: data };
}
