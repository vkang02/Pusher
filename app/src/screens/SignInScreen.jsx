import React, { useState } from 'react';
import { colors } from '../lib/theme.js';

export default function SignInScreen({ onSignIn, onSignUp, onForgot, onClearMessages, error, notice, busy }) {
  const [mode, setMode] = useState('signin'); // signin | signup | forgot
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const switchMode = (m) => { setMode(m); onClearMessages(); };

  const canSubmit = email.trim() && (mode === 'forgot' || password.length >= 8) && !busy;
  const submit = () => {
    if (!canSubmit) return;
    if (mode === 'signin') onSignIn(email.trim(), password);
    else if (mode === 'signup') onSignUp(email.trim(), password);
    else onForgot(email.trim());
  };

  const label = { fontSize: 12, color: colors.textDim5, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 7 };
  const linkBtn = { background: 'none', border: 'none', color: colors.accent, fontSize: 13.5, fontWeight: 600, padding: 6 };

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); submit(); }}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 24px', minHeight: '100vh' }}
    >
      <div style={{ width: 52, height: 52, borderRadius: 16, background: colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
        <svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 9v6M20 9v6M2 10v4M22 10v4M7 12h10" stroke="#0A0A0A" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 6 }}>Werk Betch</div>
      <div style={{ fontSize: 15, color: colors.textDim55, lineHeight: 1.5, marginBottom: 28 }}>
        {mode === 'signin' && 'Log in to pick up where you left off.'}
        {mode === 'signup' && 'Create your account to join the crew.'}
        {mode === 'forgot' && "Enter your email and we'll send a link to set a new password."}
      </div>

      <div style={label}>Email</div>
      <input
        type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com" style={inputStyle}
      />

      {mode !== 'forgot' && (
        <>
          <div style={label}>Password</div>
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'} style={inputStyle}
          />
        </>
      )}

      {error && <div style={{ fontSize: 13, color: '#F0A0A0', marginTop: -6, marginBottom: 14, lineHeight: 1.4 }}>{error}</div>}
      {notice && <div style={{ fontSize: 13, color: colors.accent, marginTop: -6, marginBottom: 14, lineHeight: 1.4 }}>{notice}</div>}

      <button
        type="submit" disabled={!canSubmit}
        style={{
          width: '100%', borderRadius: 14, padding: 15, fontSize: 16, fontWeight: 700, border: 'none', marginTop: 6,
          background: canSubmit ? colors.accent : 'rgba(207,234,192,0.3)', color: '#0A0A0A',
        }}
      >
        {busy ? 'Please wait…' : mode === 'signin' ? 'Log in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, marginTop: 14 }}>
        {mode === 'signin' && (
          <>
            <button type="button" style={linkBtn} onClick={() => switchMode('forgot')}>Forgot password, or never set one?</button>
            <button type="button" style={linkBtn} onClick={() => switchMode('signup')}>New here? Create an account</button>
          </>
        )}
        {mode !== 'signin' && (
          <button type="button" style={linkBtn} onClick={() => switchMode('signin')}>Back to log in</button>
        )}
      </div>
    </form>
  );
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box', background: '#161816', border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 12, color: '#F4F6F2', fontSize: 16, padding: 14, marginBottom: 16,
};
