// Shared helpers for the Spotify endpoints. Runs on Vercel as serverless functions; files starting
// with "_" are not exposed as URLs. Secrets come from Vercel environment variables:
//   SPOTIFY_CLIENT_SECRET, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET
// (the Client ID is public, so it's fine to have it here).

export const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '31d627487030430a87181fa623afdf84';
export const SHARE_MS = 4 * 60 * 60 * 1000; // sharing switches itself off after 4 hours

const need = (name, value) => {
  if (!value) {
    const err = new Error(`${name} is not set on the server`);
    err.code = 'missing_config';
    throw err;
  }
  return value;
};
const supabaseUrl = () => need('SUPABASE_URL', process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
const serviceKey = () => need('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);

// Supabase's newer secret keys (sb_secret_...) go in the apikey header only; the older service_role key is a JWT
// that is also sent as the bearer token. Either kind works here.
const serviceHeaders = (key) => (key.startsWith('sb_secret_') ? { apikey: key } : { apikey: key, Authorization: `Bearer ${key}` });

// Database access with the service key (bypasses row-level security, so only used here, server-side).
export async function db(path, { method = 'GET', body, prefer } = {}) {
  const key = serviceKey();
  const res = await fetch(`${supabaseUrl()}/rest/v1/${path}`, {
    method,
    headers: { ...serviceHeaders(key), 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`database ${res.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

// Who is calling? Checks the member's Supabase login token.
export async function authedUser(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || serviceKey();
  const res = await fetch(`${supabaseUrl()}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  const user = await res.json();
  return user?.id ? { id: user.id } : null;
}

export const send = (res, status, body) => res.status(status).json(body);

export const guard = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (err) {
    console.error(err);
    const message = err.code === 'missing_config'
      ? "Spotify sharing isn't finished being set up on the server yet."
      : 'Something went wrong. Try again.';
    res.status(500).json({ error: err.code || 'server_error', message });
  }
};

// ── Spotify tokens ──────────────────────────────────────────────────

const basicAuth = () => 'Basic ' + Buffer.from(`${CLIENT_ID}:${need('SPOTIFY_CLIENT_SECRET', process.env.SPOTIFY_CLIENT_SECRET)}`).toString('base64');

async function tokenRequest(params) {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: basicAuth(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

export const exchangeCode = (code, redirectUri) => tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: redirectUri });

export async function dropConnection(userId) {
  await db(`now_playing?user_id=eq.${userId}`, { method: 'DELETE' });
  await db(`spotify_links?user_id=eq.${userId}`, { method: 'DELETE' });
  await db(`spotify_tokens?user_id=eq.${userId}`, { method: 'DELETE' });
}

// A valid access token for this member, refreshing it when it's about to expire.
export async function accessTokenFor(userId, { force = false } = {}) {
  const rows = await db(`spotify_tokens?user_id=eq.${userId}&select=*`);
  const t = rows?.[0];
  if (!t) return null;
  if (!force && Date.parse(t.expires_at) - Date.now() > 60_000) return t.access_token;
  const r = await tokenRequest({ grant_type: 'refresh_token', refresh_token: t.refresh_token });
  if (!r.ok) {
    if (r.json?.error === 'invalid_grant') await dropConnection(userId); // they revoked access in Spotify
    return null;
  }
  await db(`spotify_tokens?user_id=eq.${userId}`, {
    method: 'PATCH',
    body: {
      access_token: r.json.access_token,
      refresh_token: r.json.refresh_token || t.refresh_token,
      expires_at: new Date(Date.now() + r.json.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    },
  });
  return r.json.access_token;
}

// Call the Spotify Web API as a member (retrying once with a fresh token).
export async function spotify(userId, path, init = {}) {
  let token = await accessTokenFor(userId);
  if (!token) return { status: 401, json: null, noToken: true };
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`https://api.spotify.com/v1${path}`, { ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` } });
    if (res.status === 401 && attempt === 0) {
      token = await accessTokenFor(userId, { force: true });
      if (!token) return { status: 401, json: null, noToken: true };
      continue;
    }
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = null; }
    return { status: res.status, json };
  }
  return { status: 500, json: null };
}

export const currentlyPlaying = (userId) => spotify(userId, '/me/player/currently-playing?additional_types=track,episode');

// The bits of Spotify's "currently playing" answer the crew needs to see.
export function fieldsFrom(json) {
  const item = json?.item;
  if (!item) return null;
  const images = item.album?.images || item.images || [];
  const art = images.find((i) => i.width === 300) || images[1] || images[0];
  return {
    track_uri: item.uri,
    title: item.name,
    artist: item.artists?.map((a) => a.name).join(', ') || item.show?.name || '',
    album_art: art?.url || null,
    is_playing: !!json.is_playing,
    progress_ms: json.progress_ms || 0,
    duration_ms: item.duration_ms || null,
  };
}
