import { supabase } from '../supabaseClient.js';

// The Client ID is public (it's in the sign-in link), so it's fine to have it here.
const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '31d627487030430a87181fa623afdf84';
const SCOPES = 'user-read-currently-playing user-read-playback-state user-modify-playback-state playlist-read-private playlist-read-collaborative';
const STATE_KEY = 'wb:spotify-state';

// A song counts as "live" while the server keeps refreshing it. If its checker stops, it fades out.
export const STALE_AFTER_MS = 120_000;

export const redirectUri = () => `${window.location.origin}/spotify-callback`;

// Sends the member to Spotify to approve access; Spotify returns them to /spotify-callback.
export function startSpotifyLogin() {
  const state = crypto.randomUUID();
  try { localStorage.setItem(STATE_KEY, state); } catch { /* storage unavailable */ }
  const params = new URLSearchParams({ client_id: CLIENT_ID, response_type: 'code', redirect_uri: redirectUri(), scope: SCOPES, state });
  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
}

// Reads ?code= from the page we were sent back to, then clears it from the address bar.
export function takeSpotifyCallback() {
  if (!window.location.pathname.startsWith('/spotify-callback')) return null;
  const q = new URLSearchParams(window.location.search);
  let expected = null;
  try { expected = localStorage.getItem(STATE_KEY); localStorage.removeItem(STATE_KEY); } catch { /* storage unavailable */ }
  window.history.replaceState({}, '', '/');
  if (q.get('error')) return { error: q.get('error') === 'access_denied' ? 'You cancelled the Spotify sign-in.' : 'Spotify sign-in did not finish.' };
  if (!q.get('code') || !expected || q.get('state') !== expected) return { error: 'That Spotify sign-in link expired. Try connecting again.' };
  return { code: q.get('code') };
}

async function call(path, body) {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` },
    body: JSON.stringify(body || {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.message || 'Something went wrong. Try again.'), { code: json.error });
  return json;
}

export const connectSpotify = (code) => call('/api/spotify/connect', { code, redirectUri: redirectUri() });
export const disconnectSpotify = () => call('/api/spotify/disconnect');
export const startSharingMusic = () => call('/api/spotify/share', { action: 'start' });
export const stopSharingMusic = () => call('/api/spotify/share', { action: 'stop' });
// Remote control for my own Spotify: status, play (optionally a uri), pause, next, previous, search, playlists.
export const playerCall = (action, extra) => call('/api/spotify/player', { action, ...extra });
export const listenAlong = (targetUserId) => call('/api/spotify/listen', { targetUserId });

// available:false means the Spotify tables aren't in the database yet, so the app hides the feature.
export async function fetchSpotifyLink(userId) {
  const { data, error } = await supabase.from('spotify_links').select('*').eq('user_id', userId).maybeSingle();
  if (error) return { available: false, link: null };
  return { available: true, link: data };
}

export async function fetchNowPlaying(groupId) {
  const { data, error } = await supabase.from('now_playing').select('*').eq('group_id', groupId);
  return error ? [] : data;
}

export const isLive = (row) =>
  !!row && !!row.title && Date.parse(row.sharing_until) > Date.now() && Date.now() - Date.parse(row.updated_at) < STALE_AFTER_MS;
