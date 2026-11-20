import React from 'react';
import { colors } from '../lib/theme.js';
import { CrewTrack, MyTrack } from './MusicCard.jsx';

// Home screen strip: who in the crew is sharing music right now, with a Listen along button each.
export default function ListeningNow({ music }) {
  if (!music?.available || (!music.crew.length && !music.mine)) return null;
  const listeningRow = music.crew.find((c) => c.user_id === music.listeningTo);
  return (
    <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 18, padding: '14px 16px', marginBottom: 22 }}>
      <div style={{ fontSize: 12, color: colors.textDim5, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>Listening now</div>
      {music.mine && <div style={{ padding: '8px 0', borderBottom: music.crew.length ? `1px solid ${colors.border}` : 'none' }}><MyTrack music={music} /></div>}
      {music.crew.map((c) => <CrewTrack key={c.user_id} item={c} music={music} />)}
      {listeningRow && (
        <div style={{ fontSize: 12.5, color: colors.accent, lineHeight: 1.45, marginTop: 4 }}>
          Playing on your Spotify. You're listening along with {listeningRow.name}.
        </div>
      )}
      {music.error && <div style={{ fontSize: 12.5, color: '#F0A0A0', lineHeight: 1.45, marginTop: 8 }}>{music.error}</div>}
    </div>
  );
}
