import { authedUser, db, guard, send, spotify } from '../_lib.js';

// "Listen along": play the song a crewmate is sharing on the caller's own Spotify, at the same spot.
export default guard(async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  const user = await authedUser(req);
  if (!user) return send(res, 401, { error: 'unauthorized', message: 'Sign in again.' });
  const { targetUserId } = req.body || {};
  if (!targetUserId) return send(res, 400, { error: 'bad_request' });

  const mine = await db(`group_members?user_id=eq.${user.id}&select=group_id&limit=1`);
  const rows = await db(`now_playing?user_id=eq.${encodeURIComponent(targetUserId)}&select=*`);
  const row = rows?.[0];
  if (!row || !row.track_uri || !mine?.length || row.group_id !== mine[0].group_id) {
    return send(res, 404, { error: 'not_sharing', message: "That song isn't being shared anymore." });
  }

  const elapsed = row.is_playing ? Date.now() - Date.parse(row.observed_at) : 0;
  const ceiling = Math.max(0, (row.duration_ms || Infinity) - 1500);
  const position = Math.max(0, Math.round(Math.min((row.progress_ms || 0) + elapsed + 800, ceiling)));
  const body = JSON.stringify({ uris: [row.track_uri], position_ms: position });
  const put = (query = '') => spotify(user.id, `/me/player/play${query}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body });

  let r = await put();
  if (r.noToken) return send(res, 409, { error: 'not_connected', message: 'Connect Spotify first.' });
  if (r.status === 404) {
    // No active device: wake the first one Spotify knows about (the phone with the Spotify app open).
    const devices = await spotify(user.id, '/me/player/devices');
    const device = devices.json?.devices?.find((d) => !d.is_restricted);
    if (!device) return send(res, 409, { error: 'no_device', message: 'Open Spotify on your phone and play anything for a second, then try again.' });
    r = await put(`?device_id=${encodeURIComponent(device.id)}`);
  }
  if (r.status === 200 || r.status === 204) return send(res, 200, { title: row.title, artist: row.artist });
  if (r.status === 403) return send(res, 403, { error: 'premium_required', message: 'Listening along needs Spotify Premium.' });
  send(res, 502, { error: 'spotify_error', message: "Spotify wouldn't play that song. Try again." });
});
