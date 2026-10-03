import React, { useState } from 'react';
import { colors } from '../lib/theme.js';

export default function SetPasswordScreen({ onSubmit, onCancel, error, busy, heading, blurb }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const mismatch = confirm.length > 0 && password !== confirm;
  const canSubmit = password.length >= 8 && password === confirm && !busy;

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (canSubmit) onSubmit(password); }}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 24px', minHeight: '100vh' }}
    >
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.4px', marginBottom: 8 }}>{heading}</div>
      <div style={{ fontSize: 15, color: colors.textDim55, lineHeight: 1.5, marginBottom: 26 }}>{blurb}</div>

      <div style={label}>New password</div>
      <input
        type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)}
        placeholder="At least 8 characters" style={inputStyle}
      />
      <div style={label}>Confirm password</div>
      <input
        type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
        placeholder="Type it again" style={inputStyle}
      />

      {mismatch && <div style={{ fontSize: 13, color: '#F0A0A0', marginTop: -6, marginBottom: 14 }}>Passwords don't match.</div>}
      {error && <div style={{ fontSize: 13, color: '#F0A0A0', marginTop: -6, marginBottom: 14, lineHeight: 1.4 }}>{error}</div>}

      <button
        type="submit" disabled={!canSubmit}
        style={{
          width: '100%', borderRadius: 14, padding: 15, fontSize: 16, fontWeight: 700, border: 'none', marginTop: 6,
          background: canSubmit ? colors.accent : 'rgba(207,234,192,0.3)', color: '#0A0A0A',
        }}
      >
        {busy ? 'Saving…' : 'Save password'}
      </button>
      {onCancel && (
        <button type="button" onClick={onCancel} style={{ background: 'none', border: 'none', color: colors.textDim55, fontSize: 14, marginTop: 14, padding: 6 }}>
          Cancel
        </button>
      )}
    </form>
  );
}

const label = { fontSize: 12, color: colors.textDim5, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 7 };

const inputStyle = {
  width: '100%', boxSizing: 'border-box', background: '#161816', border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 12, color: '#F4F6F2', fontSize: 16, padding: 14, marginBottom: 16,
};
