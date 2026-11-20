import { SHARE_MS, authedUser, currentlyPlaying, db, fieldsFrom, guard, send } from '../_lib.js';

// Start or stop sharing what the member is playing with their crew. Only the member starts it, and it
// ends by itself after 4 hours (the background checker in poll.js also drops expired shares).
export default guard(async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  const user = await authedUser(req);
  if (!user) return send(res, 401, { error: 'unauthorized', message: 'Sign in again.' });
  const { action } = req.body || {};

  if (action === 'stop') {
    await db(`now_playing?user_id=eq.${user.id}`, { method: 'DELETE' });
    return send(res, 200, { ok: true });
  }
  if (action !== 'start') return send(res, 400, { error: 'bad_request' });

  const link = await db(`spotify_links?user_id=eq.${user.id}&select=user_id`);
  if (!link?.length) return send(res, 409, { error: 'not_connected', message: 'Connect Spotify first.' });
  const membership = await db(`group_members?user_id=eq.${user.id}&select=group_id&limit=1`);
  if (!membership?.length) return send(res, 400, { error: 'no_group', message: 'Join a crew first.' });

  const now = await currentlyPlaying(user.id);
  if (now.noToken) return send(res, 409, { error: 'not_connected', message: 'Connect Spotify again.' });
  const fields = (now.status === 200 && fieldsFrom(now.json)) || {};
  const stamp = new Date().toISOString();
  const saved = await db('now_playing?on_conflict=user_id', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=representation',
    body: {
      user_id: user.id,
      group_id: membership[0].group_id,
      track_uri: null, title: null, artist: null, album_art: null, is_playing: false, progress_ms: 0, duration_ms: null,
      ...fields,
      observed_at: stamp,
      updated_at: stamp,
      started_at: stamp,
      sharing_until: new Date(Date.now() + SHARE_MS).toISOString(),
    },
  });
  send(res, 200, { row: saved?.[0] || null });
});
