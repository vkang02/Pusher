import { supabase } from '../supabaseClient.js';
import { uid } from './theme.js';

const PHOTO_BUCKET = 'log-photos';
const AVATAR_BUCKET = 'avatars';
const AVATAR_URL_TTL = 3600 * 24 * 7; // avatars change rarely but render often; a week cuts re-signing traffic

export async function sendSignInCode(email) {
  // No emailRedirectTo: the email's link is a fallback for regular browser use,
  // but the code (typed back in below) is what actually completes sign-in — it
  // works from inside an iOS home-screen app, where a clicked link would open
  // Safari instead and land the session in the wrong, unshared storage.
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw error;
}

export async function verifySignInCode(email, code) {
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
  if (error) throw error;
}

export async function fetchProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertProfile(userId, name) {
  const { error } = await supabase.from('profiles').upsert({ id: userId, name });
  if (error) throw error;
}

export async function uploadAvatar(userId, file) {
  const { data: prof } = await supabase.from('profiles').select('avatar_path').eq('id', userId).maybeSingle();
  const oldPath = prof?.avatar_path;

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${userId}/${Date.now()}-${uid('a')}.${ext}`;
  const { error: upErr } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file);
  if (upErr) throw upErr;

  const { error } = await supabase.from('profiles').update({ avatar_path: path }).eq('id', userId);
  if (error) throw error;

  if (oldPath) supabase.storage.from(AVATAR_BUCKET).remove([oldPath]).catch(() => {});

  const { data: signed, error: sErr } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(path, AVATAR_URL_TTL);
  if (sErr) throw sErr;
  return signed.signedUrl;
}

export async function fetchAvatarUrls(userIds) {
  const ids = [...new Set(userIds)];
  if (!ids.length) return {};
  const { data, error } = await supabase.from('profiles').select('id, avatar_path').in('id', ids);
  if (error) throw error;

  const withPath = data.filter((p) => p.avatar_path);
  if (!withPath.length) return {};
  const paths = withPath.map((p) => p.avatar_path);
  const { data: signed, error: sErr } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrls(paths, AVATAR_URL_TTL);
  if (sErr) throw sErr;

  const urlByPath = {};
  signed.forEach((s, i) => { urlByPath[paths[i]] = s.signedUrl; });
  const result = {};
  withPath.forEach((p) => { result[p.id] = urlByPath[p.avatar_path]; });
  return result;
}

export async function fetchMyGroup(userId) {
  const { data: membership, error } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId)
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!membership) return null;
  const { data: group, error: gErr } = await supabase.from('groups').select('*').eq('id', membership.group_id).single();
  if (gErr) throw gErr;
  return group;
}

export async function createGroup(name) {
  const { data, error } = await supabase.rpc('create_group', { p_name: name });
  if (error) throw error;
  return data;
}

export async function joinGroup(code) {
  const { data, error } = await supabase.rpc('join_group', { p_code: code });
  if (error) throw error;
  return data;
}

export async function fetchWorkouts(groupId) {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function saveWorkout(groupId, userId, workout) {
  const payload = {
    group_id: groupId,
    title: workout.title,
    description: workout.description,
    exercises: workout.exercises,
    updated_at: new Date().toISOString(),
  };
  if (workout.id && workout.__existing) {
    const { error } = await supabase.from('workouts').update(payload).eq('id', workout.id);
    if (error) throw error;
    return workout.id;
  }
  const { data, error } = await supabase
    .from('workouts')
    .insert({ ...payload, created_by: userId })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function deleteWorkout(id) {
  const { error } = await supabase.from('workouts').delete().eq('id', id);
  if (error) throw error;
}

export async function insertWorkouts(groupId, userId, workouts) {
  const rows = workouts.map((w) => ({
    group_id: groupId,
    title: w.title,
    description: w.description,
    exercises: w.exercises,
    created_by: userId,
  }));
  const { error } = await supabase.from('workouts').insert(rows);
  if (error) throw error;
}

export async function fetchMyLogs(groupId, userId) {
  const { data, error } = await supabase
    .from('logs')
    .select('*')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .order('log_date', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchGroupLogs(groupId, limit = 30) {
  const { data, error } = await supabase
    .from('logs')
    .select('*')
    .eq('group_id', groupId)
    .order('log_date', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function saveLog(groupId, userId, logDate, entry) {
  const { data, error } = await supabase
    .from('logs')
    .upsert(
      {
        group_id: groupId,
        user_id: userId,
        log_date: logDate,
        workout_id: entry.workoutId,
        title: entry.title,
        description: entry.description || '',
        exercises: entry.exercises,
        duration_minutes: entry.durationMinutes,
        notes: entry.notes || '',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,log_date' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeLog(userId, logDate) {
  const { error } = await supabase.from('logs').delete().eq('user_id', userId).eq('log_date', logDate);
  if (error) throw error;
}

export async function fetchGroupMembers(groupId) {
  const { data: members, error } = await supabase
    .from('group_members')
    .select('user_id, joined_at, profiles(name)')
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true });
  if (error) throw error;

  const { data: logs, error: lErr } = await supabase
    .from('logs')
    .select('user_id, log_date')
    .eq('group_id', groupId);
  if (lErr) throw lErr;

  const byUser = new Map();
  for (const l of logs) {
    const cur = byUser.get(l.user_id) || { total: 0, last: null };
    cur.total += 1;
    if (!cur.last || l.log_date > cur.last) cur.last = l.log_date;
    byUser.set(l.user_id, cur);
  }

  return members.map((m) => ({
    userId: m.user_id,
    name: m.profiles?.name || 'Member',
    total: byUser.get(m.user_id)?.total || 0,
    last: byUser.get(m.user_id)?.last || null,
  }));
}

// ── Photos ──────────────────────────────────────────────────────────

export async function uploadLogPhoto(groupId, logId, userId, file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${groupId}/${logId}/${Date.now()}-${uid('p')}.${ext}`;
  const { error: upErr } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file);
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from('log_photos')
    .insert({ log_id: logId, group_id: groupId, user_id: userId, storage_path: path })
    .select()
    .single();
  if (error) throw error;

  const { data: signed, error: sErr } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, 3600);
  if (sErr) throw sErr;
  return { ...data, url: signed.signedUrl };
}

export async function deleteLogPhoto(photo) {
  await supabase.storage.from(PHOTO_BUCKET).remove([photo.storage_path]);
  const { error } = await supabase.from('log_photos').delete().eq('id', photo.id);
  if (error) throw error;
}

export async function fetchPhotosForLogs(logIds) {
  if (!logIds.length) return [];
  const { data, error } = await supabase
    .from('log_photos')
    .select('*')
    .in('log_id', logIds)
    .order('created_at', { ascending: true });
  if (error) throw error;
  if (!data.length) return [];

  const paths = data.map((p) => p.storage_path);
  const { data: signed, error: sErr } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, 3600);
  if (sErr) throw sErr;
  const urlByPath = {};
  signed.forEach((s, i) => { urlByPath[paths[i]] = s.signedUrl; });
  return data.map((p) => ({ ...p, url: urlByPath[p.storage_path] }));
}

// ── Reactions ───────────────────────────────────────────────────────

export async function fetchReactionsForLogs(logIds) {
  if (!logIds.length) return [];
  const { data, error } = await supabase.from('log_reactions').select('*').in('log_id', logIds);
  if (error) throw error;
  return data;
}

export async function setReaction(groupId, logId, userId, emoji, active) {
  if (active) {
    const { error } = await supabase.from('log_reactions').insert({ log_id: logId, group_id: groupId, user_id: userId, emoji });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('log_reactions')
      .delete()
      .eq('log_id', logId)
      .eq('user_id', userId)
      .eq('emoji', emoji);
    if (error) throw error;
  }
}

// ── Comments ────────────────────────────────────────────────────────

export async function fetchCommentsForLogs(logIds) {
  if (!logIds.length) return [];
  const { data, error } = await supabase
    .from('log_comments')
    .select('*')
    .in('log_id', logIds)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function addComment(groupId, logId, userId, body) {
  const { data, error } = await supabase
    .from('log_comments')
    .insert({ log_id: logId, group_id: groupId, user_id: userId, body })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteComment(id) {
  const { error } = await supabase.from('log_comments').delete().eq('id', id);
  if (error) throw error;
}
