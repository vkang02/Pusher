import { authedUser, db, exchangeCode, guard, send } from '../_lib.js';

// Finishes "Connect Spotify": trades the one-time code for tokens and stores them (server-side only).
export default guard(async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  const user = await authedUser(req);
  if (!user) return send(res, 401, { error: 'unauthorized', message: 'Sign in again.' });
  const { code, redirectUri } = req.body || {};
  if (!code || !redirectUri) return send(res, 400, { error: 'bad_request', message: 'Missing Spotify sign-in details.' });

  const tokens = await exchangeCode(code, redirectUri);
  if (!tokens.ok) return send(res, 400, { error: 'spotify_rejected', message: "Spotify didn't accept that sign-in. Try connecting again." });

  const meRes = await fetch('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${tokens.json.access_token}` } });
  if (meRes.status === 403) {
    return send(res, 403, { error: 'not_allowed', message: "This Spotify account isn't on the app's allowed list yet. Add its email under User Management in the Spotify dashboard." });
  }
  const me = meRes.ok ? await meRes.json() : {};
  const displayName = me.display_name || me.id || 'Spotify';

  await db('spotify_tokens?on_conflict=user_id', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates',
    body: {
      user_id: user.id,
      access_token: tokens.json.access_token,
      refresh_token: tokens.json.refresh_token,
      expires_at: new Date(Date.now() + tokens.json.expires_in * 1000).toISOString(),
      scope: tokens.json.scope || null,
      updated_at: new Date().toISOString(),
    },
  });
  await db('spotify_links?on_conflict=user_id', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates',
    body: { user_id: user.id, display_name: displayName, connected_at: new Date().toISOString() },
  });
  send(res, 200, { displayName });
});
