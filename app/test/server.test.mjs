// Runs the Spotify endpoints against an in-memory fake of Supabase and Spotify. No network, no keys.
//   node test/server.test.mjs
process.env.SUPABASE_URL = 'http://sb.test'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc'; process.env.SUPABASE_ANON_KEY = 'anon';
process.env.SPOTIFY_CLIENT_SECRET = 'secret'; process.env.CRON_SECRET = 'cron';

const T = { spotify_tokens: [], spotify_links: [], now_playing: [], group_members: [{ user_id: 'u1', group_id: 'g1' }, { user_id: 'u2', group_id: 'g1' }, { user_id: 'u3', group_id: 'g2' }] };
const users = { 'tok-u1': 'u1', 'tok-u2': 'u2', 'tok-u3': 'u3' };
const track = (uri, name) => ({ uri, name, duration_ms: 200000, artists: [{ name: 'Dua Lipa' }], album: { images: [{ url: 'big', width: 640 }, { url: 'mid', width: 300 }, { url: 'sm', width: 64 }] } });
const spot = {
  playing: { u1: { is_playing: true, progress_ms: 30000, item: track('spotify:track:aaa', 'Levitating') } },
  plays: [], controls: [], devices: { u2: [] }, expired: new Set(), revoked: new Set(), premium: { u1: true, u2: true }, noActive: new Set(['u2']), scopeLacking: new Set(), tokenCalls: 0,
};
const match = (row, filters) => filters.every(([k, op, v]) => (op === 'eq' ? String(row[k]) === v : op === 'lte' ? row[k] <= v : true));
const parse = (qs) => { const p = new URLSearchParams(qs); const f = []; for (const [k, v] of p) { if (['select', 'limit', 'on_conflict'].includes(k)) continue; const m = v.match(/^(eq|lte)\.(.*)$/); if (m) f.push([k, m[1], m[2]]); } return f; };
const resp = (status, body) => ({ ok: status < 400, status, headers: { get: () => null }, text: async () => (body === undefined || body === null ? '' : JSON.stringify(body)), json: async () => body });
const userOfToken = (auth) => Object.entries({ u1: 'at-u1', u2: 'at-u2' }).find(([, t]) => `Bearer ${t}` === auth)?.[0];

globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url); const method = init.method || 'GET'; const body = init.body && typeof init.body === 'string' && init.body.startsWith('{') ? JSON.parse(init.body) : init.body;
  if (u.host === 'sb.test') {
    if (u.pathname === '/auth/v1/user') { const id = users[(init.headers.Authorization || '').replace('Bearer ', '')]; return id ? resp(200, { id }) : resp(401, {}); }
    const table = u.pathname.replace('/rest/v1/', ''); const rows = T[table]; const f = parse(u.search.slice(1));
    if (method === 'GET') { let r = rows.filter((x) => match(x, f)).map((x) => ({ ...x })); const lim = u.searchParams.get('limit'); if (lim) r = r.slice(0, +lim); return resp(200, r); }
    if (method === 'DELETE') { T[table] = rows.filter((x) => !match(x, f)); return resp(204); }
    if (method === 'PATCH') { rows.filter((x) => match(x, f)).forEach((x) => Object.assign(x, body)); return resp(204); }
    if (method === 'POST') { const ex = rows.find((x) => x.user_id === body.user_id); if (ex) Object.assign(ex, body); else rows.push({ ...body }); const out = rows.find((x) => x.user_id === body.user_id); return init.headers.Prefer?.includes('return=representation') ? resp(201, [{ ...out }]) : resp(201); }
  }
  if (u.host === 'accounts.spotify.com') {
    spot.tokenCalls++; const p = new URLSearchParams(init.body);
    if (p.get('grant_type') === 'authorization_code') return p.get('code') === 'good' ? resp(200, { access_token: 'at-u1', refresh_token: 'rt-u1', expires_in: 3600, scope: 'x' }) : resp(400, { error: 'invalid_grant' });
    const who = p.get('refresh_token').replace('rt-', '');
    if (spot.revoked.has(who)) return resp(400, { error: 'invalid_grant' });
    return resp(200, { access_token: 'at-' + who, expires_in: 3600 });
  }
  if (u.host === 'api.spotify.com') {
    const who = userOfToken(init.headers.Authorization); if (!who || spot.expired.has(init.headers.Authorization)) return resp(401, {});
    const device = u.searchParams.get('device_id');
    if (u.pathname === '/v1/me') return resp(200, { display_name: 'Veronica' });
    if (u.pathname === '/v1/me/player/currently-playing') { const p = spot.playing[who]; return p ? resp(200, p) : resp(204); }
    if (u.pathname === '/v1/me/player/devices') return resp(200, { devices: spot.devices[who] || [] });
    if (u.pathname === '/v1/me/player/play') {
      if (!spot.premium[who]) return resp(403, { error: { reason: 'PREMIUM_REQUIRED' } });
      if (spot.noActive.has(who) && !device) return resp(404, {});
      spot.plays.push({ who, device, ...(body ? JSON.parse(init.body) : {}) }); return resp(204);
    }
    if (['/v1/me/player/pause', '/v1/me/player/next', '/v1/me/player/previous'].includes(u.pathname)) {
      if (!spot.premium[who]) return resp(403, { error: { reason: 'PREMIUM_REQUIRED' } });
      if (spot.noActive.has(who) && !device) return resp(404, {});
      spot.controls.push({ who, path: u.pathname.split('/').pop(), method, device }); return resp(204);
    }
    if (u.pathname === '/v1/search') return resp(200, { tracks: { items: [track('spotify:track:s1', 'Song One'), null] }, playlists: { items: [null, { uri: 'spotify:playlist:p1', name: 'Gym Mix', owner: { display_name: 'Lou' }, images: [{ url: 'pl', width: 300 }] }] } });
    if (u.pathname === '/v1/me/playlists') return spot.scopeLacking.has(who) ? resp(403, { error: { message: 'Insufficient client scope' } }) : resp(200, { items: [{ uri: 'spotify:playlist:p2', name: 'Leg Day', owner: { display_name: 'Veronica' }, images: [] }, null] });
  }
  throw new Error('unmocked ' + url);
};

const call = async (mod, { method = 'POST', body = {}, headers = {} } = {}) => {
  let out; const res = { status(s) { out = { status: s }; return res; }, json(b) { out.body = b; return res; } };
  await (await import(mod)).default({ method, body, headers }, res); return out;
};
const auth = (t) => ({ authorization: 'Bearer ' + t });
let fails = 0;
const check = (name, cond, extra = '') => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' ' + extra)); if (!cond) fails++; };
const API = new URL('../api/spotify/', import.meta.url).pathname;
const cron = { authorization: 'Bearer cron' };

// connect
let r = await call(API + 'connect.js', { body: { code: 'bad', redirectUri: 'x' }, headers: auth('tok-u1') }); check('connect rejects a bad code', r.status === 400, JSON.stringify(r));
r = await call(API + 'connect.js', { body: { code: 'good', redirectUri: 'x' }, headers: auth('tok-u1') }); check('connect stores tokens + link', r.status === 200 && T.spotify_tokens.length === 1 && T.spotify_links[0].display_name === 'Veronica', JSON.stringify(r));
r = await call(API + 'connect.js', { body: { code: 'good', redirectUri: 'x' }, headers: {} }); check('connect needs a login', r.status === 401);
T.spotify_tokens.push({ user_id: 'u2', access_token: 'at-u2', refresh_token: 'rt-u2', expires_at: new Date(Date.now() + 3600e3).toISOString() }); T.spotify_links.push({ user_id: 'u2', display_name: 'Lou' });

// share
r = await call(API + 'share.js', { body: { action: 'start' }, headers: auth('tok-u3') }); check('share refuses when Spotify not connected', r.status === 409, JSON.stringify(r));
r = await call(API + 'share.js', { body: { action: 'start' }, headers: auth('tok-u1') }); const np = T.now_playing.find((x) => x.user_id === 'u1');
check('share start saves song for the right crew', r.status === 200 && np && np.title === 'Levitating' && np.group_id === 'g1' && np.album_art === 'mid');
const hrs = (Date.parse(np.sharing_until) - Date.now()) / 3600e3; check('share lasts 4 hours', hrs > 3.99 && hrs < 4.01, String(hrs));
await call(API + 'share.js', { body: { action: 'start' }, headers: auth('tok-u2') }); check('share start with nothing playing keeps blank row', T.now_playing.find((x) => x.user_id === 'u2')?.title === null);

// listen along
r = await call(API + 'listen.js', { body: { targetUserId: 'u1' }, headers: auth('tok-u2') }); check('listen reports no device when none is open', r.status === 409 && r.body.error === 'no_device', JSON.stringify(r));
spot.devices.u2 = [{ id: 'phone1', is_restricted: false }];
r = await call(API + 'listen.js', { body: { targetUserId: 'u1' }, headers: auth('tok-u2') });
const play = spot.plays.at(-1); check('listen wakes the phone and plays the same track near the same spot', r.status === 200 && play.who === 'u2' && play.device === 'phone1' && play.uris[0] === 'spotify:track:aaa' && play.position_ms >= 30000 && play.position_ms < 33000, JSON.stringify({ r, play }));
spot.premium.u2 = false; r = await call(API + 'listen.js', { body: { targetUserId: 'u1' }, headers: auth('tok-u2') }); check('listen reports Premium required', r.status === 403 && r.body.error === 'premium_required'); spot.premium.u2 = true;
r = await call(API + 'listen.js', { body: { targetUserId: 'u1' }, headers: auth('tok-u3') }); check('listen blocked across crews', r.status === 404);

// player
r = await call(API + 'player.js', { body: { action: 'status' }, headers: auth('tok-u1') }); check('player status shows my current song', r.status === 200 && r.body.track.title === 'Levitating' && r.body.track.is_playing === true, JSON.stringify(r));
r = await call(API + 'player.js', { body: { action: 'status' }, headers: auth('tok-u2') }); check('player status is empty when nothing plays', r.status === 200 && r.body.track === null);
r = await call(API + 'player.js', { body: { action: 'pause' }, headers: auth('tok-u1') }); check('player pause', r.status === 200 && spot.controls.at(-1).path === 'pause' && spot.controls.at(-1).method === 'PUT');
await call(API + 'player.js', { body: { action: 'next' }, headers: auth('tok-u1') }); check('player next uses POST', spot.controls.at(-1).path === 'next' && spot.controls.at(-1).method === 'POST');
await call(API + 'player.js', { body: { action: 'previous' }, headers: auth('tok-u1') }); check('player previous', spot.controls.at(-1).path === 'previous');
await call(API + 'player.js', { body: { action: 'play' }, headers: auth('tok-u1') }); check('player resume sends no song', spot.plays.at(-1).who === 'u1' && spot.plays.at(-1).uris === undefined && spot.plays.at(-1).context_uri === undefined);
await call(API + 'player.js', { body: { action: 'play', uri: 'spotify:track:abc123' }, headers: auth('tok-u1') }); check('player plays a track by uri', spot.plays.at(-1).uris?.[0] === 'spotify:track:abc123');
await call(API + 'player.js', { body: { action: 'play', uri: 'spotify:playlist:pl123' }, headers: auth('tok-u1') }); check('player plays a playlist as a context', spot.plays.at(-1).context_uri === 'spotify:playlist:pl123' && !spot.plays.at(-1).uris);
r = await call(API + 'player.js', { body: { action: 'play', uri: 'https://evil.example/x' }, headers: auth('tok-u1') }); check('player refuses anything that is not a Spotify uri', r.status === 400);
r = await call(API + 'player.js', { body: { action: 'next' }, headers: auth('tok-u2') }); check('player reports no device when the phone is closed', r.status === 409 && r.body.error === 'no_device' || (spot.devices.u2.length > 0 && r.status === 200), JSON.stringify(r));
spot.devices.u2 = []; r = await call(API + 'player.js', { body: { action: 'next' }, headers: auth('tok-u2') }); check('player says to open Spotify when no device exists', r.status === 409 && r.body.error === 'no_device');
spot.premium.u1 = false; r = await call(API + 'player.js', { body: { action: 'pause' }, headers: auth('tok-u1') }); check('player reports Premium required', r.status === 403 && r.body.error === 'premium_required'); spot.premium.u1 = true;
r = await call(API + 'player.js', { body: { action: 'search', q: 'levitating' }, headers: auth('tok-u1') }); check('search returns tracks and playlists, skipping blanks', r.status === 200 && r.body.tracks.length === 1 && r.body.tracks[0].art === 'mid' && r.body.playlists.length === 1 && r.body.playlists[0].subtitle === 'Lou', JSON.stringify(r));
r = await call(API + 'player.js', { body: { action: 'search', q: '   ' }, headers: auth('tok-u1') }); check('search needs some text', r.status === 400);
r = await call(API + 'player.js', { body: { action: 'playlists' }, headers: auth('tok-u1') }); check('playlists lists my playlists', r.status === 200 && r.body.playlists.length === 1 && r.body.playlists[0].title === 'Leg Day');
spot.scopeLacking.add('u1'); r = await call(API + 'player.js', { body: { action: 'playlists' }, headers: auth('tok-u1') }); check('playlists asks to reconnect when permission is missing', r.status === 403 && r.body.error === 'reconnect'); spot.scopeLacking.delete('u1');
r = await call(API + 'player.js', { body: { action: 'status' }, headers: {} }); check('player needs a login', r.status === 401);

// poll
r = await call(API + 'poll.js', { headers: {} }); check('poll rejects without the secret', r.status === 401);
const before = JSON.stringify(T.now_playing.find((x) => x.user_id === 'u1'));
r = await call(API + 'poll.js', { headers: cron }); check('poll leaves unchanged songs alone', r.status === 200 && JSON.stringify(T.now_playing.find((x) => x.user_id === 'u1')) === before, JSON.stringify(r));
spot.playing.u1 = { ...spot.playing.u1, item: track('spotify:track:bbb', 'Espresso'), progress_ms: 1000 };
await call(API + 'poll.js', { headers: cron }); check('poll picks up a new song', T.now_playing.find((x) => x.user_id === 'u1').title === 'Espresso');
spot.playing.u1 = { ...spot.playing.u1, is_playing: false }; await call(API + 'poll.js', { headers: cron }); check('poll records a pause', T.now_playing.find((x) => x.user_id === 'u1').is_playing === false);
delete spot.playing.u1; await call(API + 'poll.js', { headers: cron }); check('poll keeps last song when nothing is playing', T.now_playing.find((x) => x.user_id === 'u1').title === 'Espresso');
T.spotify_tokens.find((x) => x.user_id === 'u1').expires_at = new Date(Date.now() - 1000).toISOString(); const calls0 = spot.tokenCalls;
spot.playing.u1 = { is_playing: true, progress_ms: 5000, item: track('spotify:track:ccc', 'Third') };
await call(API + 'poll.js', { headers: cron }); check('poll refreshes an expired token and carries on', spot.tokenCalls === calls0 + 1 && T.now_playing.find((x) => x.user_id === 'u1').title === 'Third');
T.now_playing.find((x) => x.user_id === 'u2').sharing_until = new Date(Date.now() - 1000).toISOString();
await call(API + 'poll.js', { headers: cron }); check('poll ends shares after 4 hours', !T.now_playing.some((x) => x.user_id === 'u2'));
spot.revoked.add('u1'); T.spotify_tokens.find((x) => x.user_id === 'u1').expires_at = new Date(Date.now() - 1000).toISOString();
await call(API + 'poll.js', { headers: cron }); check('poll drops sharing + tokens when Spotify access was revoked', !T.now_playing.some((x) => x.user_id === 'u1') && !T.spotify_tokens.some((x) => x.user_id === 'u1'));

// stop + disconnect
await call(API + 'share.js', { body: { action: 'start' }, headers: auth('tok-u2') }); r = await call(API + 'share.js', { body: { action: 'stop' }, headers: auth('tok-u2') }); check('stop removes the share', r.status === 200 && !T.now_playing.some((x) => x.user_id === 'u2'));
await call(API + 'share.js', { body: { action: 'start' }, headers: auth('tok-u2') }); r = await call(API + 'disconnect.js', { headers: auth('tok-u2') }); check('disconnect clears everything', r.status === 200 && !T.spotify_tokens.some((x) => x.user_id === 'u2') && !T.now_playing.some((x) => x.user_id === 'u2'));
console.log(fails ? `\n${fails} FAILED` : '\nall passed'); process.exit(fails ? 1 : 0);
