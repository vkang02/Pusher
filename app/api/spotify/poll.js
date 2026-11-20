import { currentlyPlaying, db, fieldsFrom, guard, send } from '../_lib.js';

// Called every ~15 seconds by the database scheduler (see supabase/spotify.sql) while anyone is sharing.
// Asks Spotify what each sharing member is playing and updates their "now playing" record, so the crew
// keeps seeing it even when the member's phone is asleep. Skips writes when nothing changed.
const HEARTBEAT_MS = 45_000;

async function refreshRow(row) {
  const r = await currentlyPlaying(row.user_id);
  if (r.noToken) {
    await db(`now_playing?user_id=eq.${row.user_id}`, { method: 'DELETE' }); // disconnected from Spotify
    return 'dropped';
  }
  if (r.status !== 200 && r.status !== 204) return 'skipped'; // rate-limited or a Spotify hiccup: try next round

  const seen = r.status === 200 ? fieldsFrom(r.json) : null;
  const patch = seen || (row.title ? { is_playing: false } : {});
  let changed = false;
  if (seen) {
    const expected = row.is_playing ? (row.progress_ms || 0) + (Date.now() - Date.parse(row.observed_at)) : (row.progress_ms || 0);
    changed = seen.track_uri !== row.track_uri || seen.is_playing !== row.is_playing || Math.abs(seen.progress_ms - expected) > 4000;
  } else {
    changed = !!row.title && row.is_playing === true;
  }
  if (!changed && Date.now() - Date.parse(row.updated_at) < HEARTBEAT_MS) return 'unchanged';

  const stamp = new Date().toISOString();
  await db(`now_playing?user_id=eq.${row.user_id}`, { method: 'PATCH', body: { ...patch, observed_at: stamp, updated_at: stamp } });
  return 'updated';
}

export default guard(async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    const err = new Error('CRON_SECRET is not set on the server');
    err.code = 'missing_config';
    throw err;
  }
  if (req.headers.authorization !== `Bearer ${secret}`) return send(res, 401, { error: 'unauthorized' });

  await db(`now_playing?sharing_until=lte.${encodeURIComponent(new Date().toISOString())}`, { method: 'DELETE' });
  const rows = (await db('now_playing?select=*')) || [];
  const results = await Promise.allSettled(rows.map(refreshRow));
  const failed = results.filter((x) => x.status === 'rejected').length;
  if (failed) console.error(`${failed} of ${rows.length} now-playing checks failed`);
  send(res, 200, { checked: rows.length, failed });
});
