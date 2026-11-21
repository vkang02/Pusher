import React, { useEffect } from 'react';
import { colors, initialsOf } from '../lib/theme.js';

// Drops in from the top of the screen when a crewmate nudges you. Stays until you act on it.
// Mid-workout (autoDismissMs > 0) it clears itself so it never sits over the sets you're typing into.
export default function NudgePopup({ nudge, senderName, avatarUrl, queued, autoDismissMs = 0, onDismiss, onReply }) {
  useEffect(() => {
    try { navigator.vibrate?.([60, 40, 60]); } catch { /* not supported */ }
  }, [nudge.id]);

  useEffect(() => {
    if (!autoDismissMs) return undefined;
    const t = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(t);
  }, [nudge.id, autoDismissMs]);

  // Fixed and above the workout sheet (z-index 60) so it shows on every screen.
  return (
    <div role="alert" style={{ position: 'fixed', left: 0, right: 0, top: 0, zIndex: 100, padding: 'calc(12px + env(safe-area-inset-top)) 14px 0', pointerEvents: 'none' }}>
      <div
        key={nudge.id}
        style={{ pointerEvents: 'auto', background: colors.card, border: `1px solid ${colors.accentSoft3}`, borderRadius: 20, padding: 16, boxShadow: '0 12px 40px rgba(0,0,0,0.6)', animation: 'wb-nudge-in 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.2)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: colors.accent, color: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
              {initialsOf(senderName)}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>{senderName}</div>
            <div style={{ fontSize: 11.5, color: colors.textDim55 }}>{nudge.recipient_id ? 'Nudged you' : 'Nudged the crew'}{queued > 0 ? ` · ${queued} more waiting` : ''}</div>
          </div>
          <button onClick={onDismiss} aria-label="Dismiss" style={{ background: 'none', border: 'none', color: colors.textDim55, fontSize: 22, lineHeight: 1, padding: '4px 6px' }}>×</button>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.2px', marginBottom: 14, overflowWrap: 'anywhere' }}>{nudge.message}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onReply} style={{ flex: 1, background: colors.accent, color: '#0A0A0A', border: 'none', borderRadius: 12, padding: 11, fontSize: 14.5, fontWeight: 700 }}>On it 💪</button>
          <button onClick={onDismiss} style={{ background: 'none', border: `1px solid ${colors.border15}`, color: colors.textDim7, borderRadius: 12, padding: '11px 18px', fontSize: 14.5, fontWeight: 600 }}>Later</button>
        </div>
      </div>
    </div>
  );
}
