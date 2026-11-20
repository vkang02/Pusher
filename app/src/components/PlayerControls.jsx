import React, { useEffect, useRef, useState } from 'react';
import { colors } from '../lib/theme.js';
import * as spotify from '../lib/spotify.js';

const iconBtn = { width: 44, height: 44, borderRadius: '50%', border: `1px solid ${colors.border15}`, background: 'none', color: colors.text, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 };
const Svg = ({ children }) => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{children}</svg>;
const Prev = () => <Svg><path d="M6 5h2v14H6zM20 5v14L9.5 12z" /></Svg>;
const Next = () => <Svg><path d="M16 5h2v14h-2zM4 5v14l10.5-7z" /></Svg>;
const Play = () => <Svg><path d="M7 4.5v15l13-7.5z" /></Svg>;
const Pause = () => <Svg><path d="M6 4.5h4v15H6zM14 4.5h4v15h-4z" /></Svg>;

function Art({ url, size = 38 }) {
  return url
    ? <img src={url} alt="" style={{ width: size, height: size, borderRadius: 8, objectFit: 'cover', flexShrink: 0, display: 'block' }} />
    : <div style={{ width: size, height: size, borderRadius: 8, background: colors.accentSoft12, flexShrink: 0 }} />;
}

function PickRow({ item, onPick, disabled }) {
  return (
    <button onClick={() => onPick(item)} disabled={disabled} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: 'none', border: 'none', padding: '7px 0', textAlign: 'left', color: colors.text }}>
      <Art url={item.art} size={36} />
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</span>
        <span style={{ display: 'block', fontSize: 11.5, color: colors.textDim55, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.subtitle}</span>
      </span>
      <span style={{ fontSize: 12, fontWeight: 700, color: colors.accent, flexShrink: 0 }}>Play</span>
    </button>
  );
}

// State and actions for remote-controlling the member's own Spotify. Lives above both the pinned mini player
// and the expanded panel so they share one status poll. The sound comes from the Spotify app.
export function usePlayer(enabled) {
  const [track, setTrack] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);   // { message, code }
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);       // { tracks, playlists } for the current search
  const [playlists, setPlaylists] = useState(null);   // my playlists
  const [loadingList, setLoadingList] = useState(false);
  const alive = useRef(true);

  const refresh = () => spotify.playerCall('status').then((r) => alive.current && setTrack(r.track)).catch(() => {});

  useEffect(() => {
    alive.current = true;
    if (!enabled) return undefined;
    refresh();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 8000);
    return () => { alive.current = false; clearInterval(timer); };
  }, [enabled]);

  const fail = (err) => setError({ message: err.message, code: err.code });

  const control = async (action, extra) => {
    setBusy(true);
    setError(null);
    try {
      await spotify.playerCall(action, extra);
      setTimeout(refresh, 700);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const togglePicker = async () => {
    const next = !picking;
    setPicking(next);
    if (next && !playlists) {
      setLoadingList(true);
      try { setPlaylists((await spotify.playerCall('playlists')).playlists); } catch (err) { fail(err); setPlaylists([]); } finally { setLoadingList(false); }
    }
  };

  const search = async (e) => {
    e.preventDefault();
    if (!query.trim()) { setResults(null); return; }
    setLoadingList(true);
    setError(null);
    try { setResults(await spotify.playerCall('search', { q: query })); } catch (err) { fail(err); } finally { setLoadingList(false); }
  };

  const pick = async (item) => {
    await control('play', { uri: item.uri });
    setPicking(false);
  };

  const changeQuery = (value) => { setQuery(value); if (!value.trim()) setResults(null); };

  return { track, busy, error, picking, query, results, playlists, loadingList, control, togglePicker, search, pick, changeQuery };
}

export default function PlayerControls({ player }) {
  const { track, busy, error, picking, query, results, playlists, loadingList } = player;
  const rows = results ? [...results.tracks, ...results.playlists] : null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <Art url={track?.album_art} size={44} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track ? track.title : 'Nothing playing'}</div>
          <div style={{ fontSize: 12, color: colors.textDim55, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track ? track.artist : 'Pick something below'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, margin: '12px 0 10px' }}>
        <button aria-label="Previous song" onClick={() => player.control('previous')} disabled={busy} style={iconBtn}><Prev /></button>
        <button aria-label={track?.is_playing ? 'Pause' : 'Play'} onClick={() => player.control(track?.is_playing ? 'pause' : 'play')} disabled={busy} style={{ ...iconBtn, width: 52, height: 52, background: colors.accent, color: '#0A0A0A', border: 'none' }}>
          {track?.is_playing ? <Pause /> : <Play />}
        </button>
        <button aria-label="Next song" onClick={() => player.control('next')} disabled={busy} style={iconBtn}><Next /></button>
      </div>

      <button onClick={player.togglePicker} style={{ width: '100%', background: 'none', border: `1px solid ${colors.border15}`, color: colors.text, borderRadius: 11, padding: '10px', fontSize: 13.5, fontWeight: 600 }}>
        {picking ? 'Close' : 'Pick music'}
      </button>

      {picking && (
        <div style={{ marginTop: 10 }}>
          <form onSubmit={player.search}>
            <input
              type="search" value={query} placeholder="Search songs or playlists" onChange={(e) => player.changeQuery(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: colors.text, fontSize: 16, padding: '10px 11px' }}
            />
          </form>
          {loadingList && <div style={{ fontSize: 12.5, color: colors.textDim55, padding: '10px 0' }}>Loading…</div>}
          {!loadingList && rows && (rows.length
            ? <div style={{ marginTop: 6 }}>{rows.map((it) => <PickRow key={it.uri} item={it} onPick={player.pick} disabled={busy} />)}</div>
            : <div style={{ fontSize: 12.5, color: colors.textDim55, padding: '10px 0' }}>Nothing found. Try another search.</div>)}
          {!loadingList && !rows && playlists && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11.5, color: colors.textDim45, marginBottom: 2 }}>Your playlists</div>
              {playlists.length
                ? playlists.map((it) => <PickRow key={it.uri} item={it} onPick={player.pick} disabled={busy} />)
                : <div style={{ fontSize: 12.5, color: colors.textDim55, padding: '6px 0' }}>No playlists to show.</div>}
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{ fontSize: 12.5, color: '#F0A0A0', lineHeight: 1.45, marginTop: 10 }}>
          {error.message}
          {error.code === 'reconnect' && (
            <button onClick={spotify.startSpotifyLogin} style={{ display: 'block', marginTop: 8, background: colors.accent, color: '#0A0A0A', border: 'none', borderRadius: 10, padding: '8px 13px', fontSize: 13, fontWeight: 700 }}>
              Reconnect Spotify
            </button>
          )}
        </div>
      )}
    </div>
  );
}
