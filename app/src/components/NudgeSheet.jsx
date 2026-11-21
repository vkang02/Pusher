import React, { useState } from 'react';
import { colors } from '../lib/theme.js';
import { NUDGE_MAX, NUDGE_PRESETS } from '../lib/nudges.js';

const chip = (on) => ({
  background: on ? colors.accent : 'none',
  color: on ? '#0A0A0A' : colors.text,
  border: `1px solid ${on ? colors.accent : colors.border15}`,
  borderRadius: 18, padding: '7px 13px', fontSize: 13.5, fontWeight: 600, flexShrink: 0,
});

// Bottom sheet: pick who it's for, pick a ready-made message or write your own, send.
export default function NudgeSheet({ members, myUserId, initialRecipient, onSend, onClose }) {
  const others = members.filter((m) => m.userId !== myUserId);
  const [recipient, setRecipient] = useState(initialRecipient || null); // null = the whole crew
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const target = recipient ? others.find((m) => m.userId === recipient)?.name || 'them' : 'the crew';

  const send = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSend(recipient, text);
      setSent(true);
      setTimeout(onClose, 900);
    } catch (err) {
      setError(err.message || 'Could not send that. Try again.');
      setBusy(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
      <div style={{ position: 'relative', background: colors.bg, borderTop: `1px solid ${colors.border15}`, borderRadius: '20px 20px 0 0', maxHeight: '88%', overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain', padding: '14px 18px calc(22px + env(safe-area-inset-bottom))' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Send a nudge</div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: colors.text, borderRadius: 16, padding: '7px 14px', fontSize: 13.5, fontWeight: 600 }}>Cancel</button>
        </div>

        <div style={{ fontSize: 12, color: colors.textDim5, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>To</div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
          <button onClick={() => setRecipient(null)} style={chip(recipient === null)}>Everyone</button>
          {others.map((m) => (
            <button key={m.userId} onClick={() => setRecipient(m.userId)} style={chip(recipient === m.userId)}>{m.name}</button>
          ))}
        </div>

        <div style={{ fontSize: 12, color: colors.textDim5, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>Pick a message</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {NUDGE_PRESETS.map((p) => (
            <button key={p} onClick={() => setText(p)} style={{ ...chip(text === p), textAlign: 'left', flexShrink: 1 }}>{p}</button>
          ))}
        </div>

        <div style={{ fontSize: 12, color: colors.textDim5, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>Or write your own</div>
        <textarea
          value={text} maxLength={NUDGE_MAX} rows={2} placeholder="Say something to get them moving"
          onChange={(e) => setText(e.target.value)}
          style={{ width: '100%', background: colors.card, border: `1px solid ${colors.border15}`, borderRadius: 12, color: colors.text, fontSize: 16, padding: '10px 12px', resize: 'none', fontFamily: 'inherit', marginBottom: 4 }}
        />
        <div style={{ fontSize: 11.5, color: colors.textDim45, textAlign: 'right', marginBottom: 12 }}>{text.length}/{NUDGE_MAX}</div>

        {error && <div style={{ fontSize: 12.5, color: '#F0A0A0', lineHeight: 1.45, marginBottom: 10 }}>{error}</div>}

        <button
          onClick={send} disabled={!text.trim() || busy}
          style={{ width: '100%', background: colors.accent, color: '#0A0A0A', border: 'none', borderRadius: 13, padding: 13, fontSize: 15.5, fontWeight: 700, opacity: !text.trim() || busy ? 0.5 : 1 }}
        >
          {sent ? 'Sent ✓' : busy ? 'Sending…' : `Send to ${target}`}
        </button>
      </div>
    </div>
  );
}
