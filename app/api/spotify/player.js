import { authedUser, currentlyPlaying, fieldsFrom, guard, onDevice, pickImage, send, spotify } from '../_lib.js';

// Remote control for the member's own Spotify: what's playing, play / pause / next / previous, start a song
// or playlist, search, and list playlists. The sound still comes from the Spotify app on their phone.
const PLAYABLE = /^spotify:(track|episode|playlist|album|artist):[A-Za-z0-9]+$/;

const trackRow = (t) => ({ uri: t.uri, title: t.name, subtitle: t.artists?.map((a) => a.name).join(', ') || '', art: pickImage(t.album?.images) });
const playlistRow = (p) => ({ uri: p.uri, title: p.name, subtitle: p.owner?.display_name || 'Playlist', art: pickImage(p.images) });

export default guard(async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  const user = await authedUser(req);
  if (!user) return send(res, 401, { error: 'unauthorized', message: 'Sign in again.' });
  const { action, uri, q } = req.body || {};

  const fail = (r) => {
    if (r.noToken) return send(res, 409, { error: 'not_connected', message: 'Connect Spotify first.' });
    if (r.status === 403) {
      return r.json?.error?.reason === 'PREMIUM_REQUIRED'
        ? send(res, 403, { error: 'premium_required', message: 'Controlling playback needs Spotify Premium.' })
        : send(res, 403, { error: 'reconnect', message: 'Reconnect Spotify to allow this.' });
    }
    if (r.status === 429) return send(res, 429, { error: 'busy', message: 'Spotify is busy. Try again in a moment.' });
    return send(res, 502, { error: 'spotify_error', message: "Spotify didn't respond. Try again." });
  };

  if (action === 'status') {
    const r = await currentlyPlaying(user.id);
    if (r.noToken) return fail(r);
    const f = r.status === 200 ? fieldsFrom(r.json) : null;
    return send(res, 200, { track: f ? { title: f.title, artist: f.artist, album_art: f.album_art, is_playing: f.is_playing } : null });
  }

  if (['play', 'pause', 'next', 'previous'].includes(action)) {
    let make;
    if (action === 'play') {
      if (uri && !PLAYABLE.test(uri)) return send(res, 400, { error: 'bad_request', message: "That can't be played." });
      const body = !uri ? undefined : /^spotify:(track|episode):/.test(uri) ? { uris: [uri] } : { context_uri: uri };
      make = (qs) => spotify(user.id, `/me/player/play${qs}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    } else if (action === 'pause') {
      make = (qs) => spotify(user.id, `/me/player/pause${qs}`, { method: 'PUT' });
    } else {
      make = (qs) => spotify(user.id, `/me/player/${action}${qs}`, { method: 'POST' });
    }
    const { r, noDevice } = await onDevice(user.id, make);
    if (noDevice) return send(res, 409, { error: 'no_device', message: 'Open Spotify on your phone and play anything for a second, then try again.' });
    if (r.status === 200 || r.status === 204) return send(res, 200, { ok: true });
    return fail(r);
  }

  if (action === 'search') {
    const query = String(q || '').trim().slice(0, 100);
    if (!query) return send(res, 400, { error: 'bad_request', message: 'Type something to search for.' });
    const r = await spotify(user.id, `/search?${new URLSearchParams({ q: query, type: 'track,playlist', limit: '6' })}`);
    if (r.status !== 200) return fail(r);
    return send(res, 200, {
      tracks: (r.json?.tracks?.items || []).filter(Boolean).map(trackRow),
      playlists: (r.json?.playlists?.items || []).filter(Boolean).map(playlistRow),
    });
  }

  if (action === 'playlists') {
    const r = await spotify(user.id, '/me/playlists?limit=30');
    if (r.status !== 200) return fail(r);
    return send(res, 200, { playlists: (r.json?.items || []).filter(Boolean).map(playlistRow) });
  }

  send(res, 400, { error: 'bad_request' });
});
