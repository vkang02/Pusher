import React from 'react';
import { colors, initialsOf } from '../lib/theme.js';
import PlayerControls from './PlayerControls.jsx';

const card = { background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 14, marginBottom: 16 };
const smallBtn = { border: 'none', borderRadius: 10, padding: '7px 12px', fontSize: 12.5, fontWeight: 700, flexShrink: 0 };

function Art({ url, size = 40 }) {
  return url
    ? <img src={url} alt="" style={{ width: size, height: size, borderRadius: 8, objectFit: 'cover', flexShrink: 0, display: 'block' }} />
    : <div style={{ width: size, height: size, borderRadius: 8, background: colors.accentSoft12, flexShrink: 0 }} />;
}

// One crewmate's current song, with the Listen along button.
export function CrewTrack({ item, music }) {
  const listening = music.listeningTo === item.user_id;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
      {item.avatarUrl
        ? <img src={item.avatarUrl} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
        : <div style={{ width: 30, height: 30, borderRadius: '50%', background: colors.accent, color: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11.5, flexShrink: 0 }}>{initialsOf(item.name)}</div>}
      <Art url={item.album_art} size={36} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
        <div style={{ fontSize: 11.5, color: colors.textDim55, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.name} · {item.artist}{item.is_playing ? '' : ' · paused'}
        </div>
      </div>
      <button
        onClick={() => music.onListen(item)} disabled={music.busy}
        style={{ ...smallBtn, background: listening ? 'none' : colors.accent, color: listening ? colors.accent : '#0A0A0A', border: listening ? `1px solid ${colors.accentSoft3}` : 'none' }}
      >
        {listening ? 'Resync' : 'Listen along'}
      </button>
    </div>
  );
}

export function MyTrack({ music }) {
  const { mine } = music;
  const until = new Date(mine.sharing_until).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return (
    <div>
      {mine.title ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <Art url={mine.album_art} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mine.title}</div>
            <div style={{ fontSize: 12.5, color: colors.textDim55, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mine.artist}{mine.is_playing ? '' : ' · paused'}</div>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 13.5, color: colors.textDim65, lineHeight: 1.45 }}>Nothing playing yet. Start a song in Spotify and it shows up here.</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 11 }}>
        <span style={{ fontSize: 11.5, color: colors.textDim45 }}>Stops by itself at {until}</span>
        <button onClick={music.onStop} disabled={music.busy} style={{ ...smallBtn, background: 'none', border: `1px solid ${colors.border15}`, color: colors.text }}>Stop sharing</button>
      </div>
    </div>
  );
}

// The music card at the top of a workout: connect, start/stop sharing, and what the crew is playing.
export default function MusicCard({ music, player }) {
  if (!music?.available) return null;
  const { link, mine, crew, error, busy, listeningTo } = music;
  const sharing = !!mine;
  const listeningRow = crew.find((c) => c.user_id === listeningTo);

  return (
    <div style={{ ...card, ...(sharing ? { borderColor: colors.accentSoft3, background: colors.accentSoft1 } : {}) }}>
      <div style={{ fontSize: 12, color: sharing ? colors.accent : colors.textDim5, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 9 }}>
        {sharing ? 'Sharing your music with your crew' : 'Music'}
      </div>

      {!link && (
        <>
          <div style={{ fontSize: 13, color: colors.textDim65, lineHeight: 1.45, marginBottom: 12 }}>
            Connect Spotify to show your crew what you're playing, and to listen along with them.
          </div>
          <button onClick={music.onConnect} disabled={busy} style={{ width: '100%', background: colors.accent, color: '#0A0A0A', border: 'none', borderRadius: 12, padding: 12, fontSize: 14.5, fontWeight: 700 }}>
            Connect Spotify
          </button>
        </>
      )}

      {link && !sharing && (
        <>
          <div style={{ fontSize: 13, color: colors.textDim65, lineHeight: 1.45, marginBottom: 12 }}>
            Your crew sees what you're playing until you stop, close this workout, or 4 hours pass.
          </div>
          <button onClick={music.onStart} disabled={busy} style={{ width: '100%', background: colors.accent, color: '#0A0A0A', border: 'none', borderRadius: 12, padding: 12, fontSize: 14.5, fontWeight: 700 }}>
            {busy ? 'Starting…' : 'Start sharing'}
          </button>
        </>
      )}

      {sharing && <MyTrack music={music} />}

      {link && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${colors.border}` }}>
          <PlayerControls player={player} />
        </div>
      )}

      {crew.length > 0 && (
        <div style={{ marginTop: 12, paddingTop: 6, borderTop: `1px solid ${colors.border}` }}>
          <div style={{ fontSize: 11.5, color: colors.textDim45, margin: '6px 0 2px' }}>Your crew is listening</div>
          {crew.map((c) => <CrewTrack key={c.user_id} item={c} music={music} />)}
        </div>
      )}
      {listeningRow && (
        <div style={{ fontSize: 12.5, color: colors.accent, lineHeight: 1.45, marginTop: 6 }}>
          Playing on your Spotify. You're listening along with {listeningRow.name}.
        </div>
      )}
      {error && <div style={{ fontSize: 12.5, color: '#F0A0A0', lineHeight: 1.45, marginTop: 10 }}>{error}</div>}
    </div>
  );
}
