import React, { useState } from 'react';
import { colors } from '../lib/theme.js';
import MusicCard from './MusicCard.jsx';
import { usePlayer } from './PlayerControls.jsx';

const mini = { width: 36, height: 36, borderRadius: '50%', border: `1px solid ${colors.border15}`, background: 'none', color: colors.text, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 };
const Svg = ({ children, size = 17 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{children}</svg>;

// Pinned to the bottom of the workout so the music is in reach however far you've scrolled:
// a one-line player, and a tap on the arrow opens everything else (sharing, picking music, the crew).
export default function MusicDock({ music }) {
  const [open, setOpen] = useState(false);
  const enabled = !!music?.available && !!music.link;
  const player = usePlayer(enabled);
  if (!music?.available) return null;

  const { track, busy, error } = player;
  const sharing = !!music.mine;
  const crewCount = music.crew.length;

  const expand = (
    <button aria-label="Open music" onClick={() => setOpen(true)} style={{ ...mini, position: 'relative', border: 'none', background: colors.accentSoft12, color: colors.accent }}>
      <Svg><path d="M7.4 14.6 12 10l4.6 4.6 1.4-1.4-6-6-6 6z" /></Svg>
      {crewCount > 0 && <span style={{ position: 'absolute', top: 2, right: 2, width: 9, height: 9, borderRadius: '50%', background: colors.accent, border: '2px solid #0A0A0A' }} />}
    </button>
  );

  return (
    <>
      <div style={{ flexShrink: 0, borderTop: `1px solid ${colors.border}`, background: colors.card, padding: '8px 14px' }}>
        {error && !open && (
          <div style={{ fontSize: 12, color: '#F0A0A0', lineHeight: 1.35, marginBottom: 6 }}>
            {error.message}
            {error.code === 'reconnect' && <button onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', color: colors.accent, fontSize: 12, fontWeight: 700, padding: '0 0 0 6px' }}>Fix</button>}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          {track?.album_art
            ? <img src={track.album_art} alt="" style={{ width: 36, height: 36, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }} />
            : <div style={{ width: 36, height: 36, borderRadius: 7, background: colors.accentSoft12, flexShrink: 0 }} />}

          {enabled ? (
            <>
              <button onClick={() => setOpen(true)} style={{ minWidth: 0, flex: 1, background: 'none', border: 'none', padding: 0, textAlign: 'left', color: colors.text }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track ? track.title : 'Nothing playing'}</span>
                <span style={{ display: 'block', fontSize: 11.5, color: sharing ? colors.accent : colors.textDim55, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {sharing ? 'Sharing live' : (track ? track.artist : 'Tap to pick music')}
                </span>
              </button>
              <button aria-label="Previous song" onClick={() => player.control('previous')} disabled={busy} style={mini}><Svg><path d="M6 5h2v14H6zM20 5v14L9.5 12z" /></Svg></button>
              <button aria-label={track?.is_playing ? 'Pause' : 'Play'} onClick={() => player.control(track?.is_playing ? 'pause' : 'play')} disabled={busy} style={{ ...mini, width: 42, height: 42, background: colors.accent, color: '#0A0A0A', border: 'none' }}>
                {track?.is_playing ? <Svg size={19}><path d="M6 4.5h4v15H6zM14 4.5h4v15h-4z" /></Svg> : <Svg size={19}><path d="M7 4.5v15l13-7.5z" /></Svg>}
              </button>
              <button aria-label="Next song" onClick={() => player.control('next')} disabled={busy} style={mini}><Svg><path d="M16 5h2v14h-2zM4 5v14l10.5-7z" /></Svg></button>
              {expand}
            </>
          ) : (
            <>
              <button onClick={() => setOpen(true)} style={{ minWidth: 0, flex: 1, background: 'none', border: 'none', padding: 0, textAlign: 'left', color: colors.text }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>Music</span>
                <span style={{ display: 'block', fontSize: 11.5, color: colors.textDim55 }}>Connect Spotify to play and share</span>
              </button>
              {expand}
            </>
          )}
        </div>
      </div>

      {open && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 5, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div onClick={() => setOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
          <div style={{ position: 'relative', background: colors.bg, borderTop: `1px solid ${colors.border15}`, borderRadius: '20px 20px 0 0', maxHeight: '82%', overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain', padding: '14px 18px 26px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>Music</div>
              <button onClick={() => setOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: colors.text, borderRadius: 16, padding: '7px 14px', fontSize: 13.5, fontWeight: 600 }}>Done</button>
            </div>
            <MusicCard music={music} player={player} />
          </div>
        </div>
      )}
    </>
  );
}
