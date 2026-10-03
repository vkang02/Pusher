import React, { useState } from 'react';
import PhotoViewer from './PhotoViewer.jsx';
import { colors, REACTION_EMOJIS, dayShort, shortDate, summaryOf } from '../lib/theme.js';

export default function ActivityCard({ log, photos, reactions, comments, myUserId, onOpenLog, onToggleReaction, onAddComment, onDeleteComment }) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(null);

  const reactionCounts = {};
  const mineByEmoji = {};
  for (const r of reactions) {
    reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
    if (r.user_id === myUserId) mineByEmoji[r.emoji] = true;
  }

  const handlePost = async () => {
    if (!draft.trim() || posting) return;
    setPosting(true);
    try {
      await onAddComment(log.id, draft);
      setDraft('');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 18, padding: 16, marginBottom: 14 }}>
      <div onClick={() => onOpenLog(log)} style={{ display: 'flex', alignItems: 'center', gap: 13, cursor: 'pointer' }}>
        {log.avatarUrl ? (
          <img
            src={log.avatarUrl} alt=""
            style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `1px solid ${colors.border}` }}
          />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: 12, background: log.isMine ? colors.accentSoft14 : 'rgba(255,255,255,0.06)', color: log.isMine ? colors.accent : colors.textDim7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
            {dayShort(log.log_date)}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15.5, fontWeight: 600 }}>{log.title}</div>
          <div style={{ fontSize: 12.5, color: colors.textDim5 }}>{log.memberName} · {shortDate(log.log_date)} · {summaryOf(log)}</div>
        </div>
        <span style={{ fontSize: 18, color: colors.textDim3, flexShrink: 0 }}>›</span>
      </div>

      {log.notes && (
        <div style={{ fontSize: 12.5, color: colors.textDim65, fontStyle: 'italic', marginTop: 10 }}>"{log.notes}"</div>
      )}

      {photos.length > 0 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 12 }}>
          {photos.map((p, idx) => (
            <img
              key={p.id} src={p.url} alt="" onClick={() => setViewerIndex(idx)}
              style={{ width: 96, height: 96, borderRadius: 12, objectFit: 'cover', flexShrink: 0, cursor: 'pointer', border: `1px solid ${colors.border}` }}
            />
          ))}
        </div>
      )}

      {viewerIndex !== null && (
        <PhotoViewer photos={photos} startIndex={viewerIndex} onClose={() => setViewerIndex(null)} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 13, paddingTop: 12, borderTop: `1px solid ${colors.border}` }}>
        {REACTION_EMOJIS.map((emoji) => {
          const count = reactionCounts[emoji] || 0;
          const mine = !!mineByEmoji[emoji];
          return (
            <button
              key={emoji}
              onClick={() => onToggleReaction(log.id, emoji)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, borderRadius: 10, padding: '6px 9px', fontSize: 13,
                border: mine ? `1px solid ${colors.accentSoft3}` : `1px solid ${colors.border}`,
                background: mine ? colors.accentSoft12 : 'transparent',
                color: mine ? colors.accent : colors.textDim7,
              }}
            >
              <span>{emoji}</span>
              {count > 0 && <span style={{ fontSize: 11.5, fontWeight: 700 }}>{count}</span>}
            </button>
          );
        })}
        <button
          onClick={() => setCommentsOpen((v) => !v)}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', color: colors.textDim55, fontSize: 12.5, fontWeight: 600 }}
        >
          💬 {comments.length > 0 ? comments.length : ''} {comments.length === 1 ? 'comment' : 'comments'}
        </button>
      </div>

      {commentsOpen && (
        <div style={{ marginTop: 12 }}>
          {comments.map((c) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, padding: '7px 0' }}>
              <div style={{ fontSize: 13, color: colors.textDim7, lineHeight: 1.4 }}>
                <span style={{ fontWeight: 700, color: colors.text }}>{c.memberName}</span> {c.body}
              </div>
              {c.user_id === myUserId && (
                <button onClick={() => onDeleteComment(c.id)} style={{ background: 'none', border: 'none', color: colors.textDim45, fontSize: 12, flexShrink: 0 }}>×</button>
              )}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              type="text" value={draft} placeholder="Add a comment…"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handlePost(); }}
              style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: colors.text, fontSize: 13.5, padding: '9px 11px' }}
            />
            <button
              onClick={handlePost}
              disabled={!draft.trim() || posting}
              style={{ borderRadius: 10, padding: '9px 14px', fontSize: 13.5, fontWeight: 700, border: 'none', background: colors.accent, color: '#0A0A0A', flexShrink: 0 }}
            >
              Post
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
