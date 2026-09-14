import React, { useState } from 'react';
import { colors } from '../lib/theme.js';

export default function SignInScreen({ onSendLink, error, busy, sentTo }) {
  const [email, setEmail] = useState('');

  if (sentTo) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 24px', minHeight: '100vh' }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
          <svg width="24" height="24" viewBox="0 0 24 24"><path d="M4 6h16v12H4z" stroke="#0A0A0A" strokeWidth="2" fill="none" strokeLinejoin="round" /><path d="M4 7l8 6 8-6" stroke="#0A0A0A" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.4px', marginBottom: 10 }}>Check your email</div>
        <div style={{ fontSize: 15, color: colors.textDim55, lineHeight: 1.5 }}>
          We sent a sign-in link to <span style={{ color: colors.text, fontWeight: 600 }}>{sentTo}</span>. Open it on this device to continue — no password needed.
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 24px', minHeight: '100vh' }}>
      <div style={{ width: 52, height: 52, borderRadius: 16, background: colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
        <svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 9v6M20 9v6M2 10v4M22 10v4M7 12h10" stroke="#0A0A0A" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 6 }}>Werk Betch</div>
      <div style={{ fontSize: 15, color: colors.textDim55, lineHeight: 1.5, marginBottom: 28 }}>Log workouts with your crew. No app store, just a link.</div>

      <div style={{ fontSize: 12, color: colors.textDim5, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 7 }}>Your email</div>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        style={inputStyle}
        onKeyDown={(e) => { if (e.key === 'Enter' && email.trim() && !busy) onSendLink(email.trim()); }}
      />

      {error && (
        <div style={{ fontSize: 13, color: '#F0A0A0', marginTop: -6, marginBottom: 14, lineHeight: 1.4 }}>{error}</div>
      )}

      <button
        onClick={() => onSendLink(email.trim())}
        disabled={!email.trim() || busy}
        style={{
          width: '100%', borderRadius: 14, padding: 15, fontSize: 16, fontWeight: 700, border: 'none', marginTop: 6,
          background: !email.trim() || busy ? 'rgba(207,234,192,0.3)' : colors.accent, color: '#0A0A0A',
        }}
      >
        {busy ? 'Sending…' : 'Send sign-in link'}
      </button>

      <div style={{ fontSize: 12.5, color: colors.textDim45, lineHeight: 1.5, marginTop: 16 }}>
        We'll email you a link — no password to set or remember. Signing in with the same email on any device gets you back to your account and your group.
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box', background: '#161816', border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 12, color: '#F4F6F2', fontSize: 16, padding: 14, marginBottom: 16,
};
