import React, { useState } from 'react';
import { colors } from '../lib/theme.js';

export default function SignInScreen({ onSendCode, onVerifyCode, onResend, error, busy, sentTo }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  if (sentTo) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 24px', minHeight: '100vh' }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
          <svg width="24" height="24" viewBox="0 0 24 24"><path d="M4 6h16v12H4z" stroke="#0A0A0A" strokeWidth="2" fill="none" strokeLinejoin="round" /><path d="M4 7l8 6 8-6" stroke="#0A0A0A" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.4px', marginBottom: 10 }}>Enter your code</div>
        <div style={{ fontSize: 15, color: colors.textDim55, lineHeight: 1.5, marginBottom: 24 }}>
          We sent a 6-digit code to <span style={{ color: colors.text, fontWeight: 600 }}>{sentTo}</span>. Type it below — don't tap the link in the email, since that opens Safari instead of staying right here.
        </div>

        <div style={{ fontSize: 12, color: colors.textDim5, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 7 }}>Code</div>
        <input
          type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="123456"
          style={{ ...inputStyle, textAlign: 'center', fontSize: 24, letterSpacing: '6px', fontWeight: 700 }}
          onKeyDown={(e) => { if (e.key === 'Enter' && code.trim() && !busy) onVerifyCode(sentTo, code.trim()); }}
        />

        {error && (
          <div style={{ fontSize: 13, color: '#F0A0A0', marginTop: -6, marginBottom: 14, lineHeight: 1.4 }}>{error}</div>
        )}

        <button
          onClick={() => onVerifyCode(sentTo, code.trim())}
          disabled={code.trim().length < 6 || busy}
          style={{
            width: '100%', borderRadius: 14, padding: 15, fontSize: 16, fontWeight: 700, border: 'none', marginTop: 6,
            background: code.trim().length < 6 || busy ? 'rgba(207,234,192,0.3)' : colors.accent, color: '#0A0A0A',
          }}
        >
          {busy ? 'Checking…' : 'Verify code'}
        </button>

        <button
          onClick={() => onResend(sentTo)}
          disabled={busy}
          style={{ width: '100%', background: 'none', border: 'none', color: colors.textDim55, fontSize: 13, marginTop: 16, padding: 6 }}
        >
          Didn't get it? Send a new code
        </button>
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
        onKeyDown={(e) => { if (e.key === 'Enter' && email.trim() && !busy) onSendCode(email.trim()); }}
      />

      {error && (
        <div style={{ fontSize: 13, color: '#F0A0A0', marginTop: -6, marginBottom: 14, lineHeight: 1.4 }}>{error}</div>
      )}

      <button
        onClick={() => onSendCode(email.trim())}
        disabled={!email.trim() || busy}
        style={{
          width: '100%', borderRadius: 14, padding: 15, fontSize: 16, fontWeight: 700, border: 'none', marginTop: 6,
          background: !email.trim() || busy ? 'rgba(207,234,192,0.3)' : colors.accent, color: '#0A0A0A',
        }}
      >
        {busy ? 'Sending…' : 'Send sign-in code'}
      </button>

      <div style={{ fontSize: 12.5, color: colors.textDim45, lineHeight: 1.5, marginTop: 16 }}>
        We'll email you a 6-digit code — no password to set or remember. Signing in with the same email on any device (or from your home-screen icon) gets you back to your account and your group.
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box', background: '#161816', border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 12, color: '#F4F6F2', fontSize: 16, padding: 14, marginBottom: 16,
};
