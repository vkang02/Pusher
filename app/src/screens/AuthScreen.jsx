import React, { useState } from 'react';
import { colors } from '../lib/theme.js';

export default function AuthScreen({ onSignIn, error, busy }) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState('join');
  const [group, setGroup] = useState('');

  const disabled = !name.trim() || !group.trim() || busy;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 24px', minHeight: '100vh' }}>
      <div style={{ width: 52, height: 52, borderRadius: 16, background: colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
        <svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 9v6M20 9v6M2 10v4M22 10v4M7 12h10" stroke="#0A0A0A" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 6 }}>Werk Betch</div>
      <div style={{ fontSize: 15, color: colors.textDim55, lineHeight: 1.5, marginBottom: 28 }}>Log workouts with your crew. No app store, just a link.</div>

      <div style={{ fontSize: 12, color: colors.textDim5, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 7 }}>Your name</div>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Alex"
        style={inputStyle}
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => { setMode('join'); setGroup(''); }}
          style={toggleBtn(mode === 'join')}
        >
          Join a group
        </button>
        <button
          onClick={() => { setMode('create'); setGroup(''); }}
          style={toggleBtn(mode === 'create')}
        >
          Create one
        </button>
      </div>

      <div style={{ fontSize: 12, color: colors.textDim5, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 7 }}>
        {mode === 'create' ? 'Group name' : 'Invite code'}
      </div>
      <input
        type="text"
        value={group}
        onChange={(e) => setGroup(e.target.value)}
        placeholder={mode === 'create' ? 'Werk Betch' : 'IRON42'}
        style={{ ...inputStyle, marginBottom: 22 }}
      />

      {error && (
        <div style={{ fontSize: 13, color: '#F0A0A0', marginBottom: 14, lineHeight: 1.4 }}>{error}</div>
      )}

      <button
        onClick={() => onSignIn({ name: name.trim(), group: group.trim(), mode })}
        disabled={disabled}
        style={{
          width: '100%', borderRadius: 14, padding: 15, fontSize: 16, fontWeight: 700, border: 'none',
          background: disabled ? 'rgba(207,234,192,0.3)' : colors.accent, color: '#0A0A0A',
        }}
      >
        {busy ? 'Please wait…' : mode === 'create' ? 'Create group' : 'Join group'}
      </button>
    </div>
  );
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box', background: '#161816', border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 12, color: '#F4F6F2', fontSize: 16, padding: 14, marginBottom: 16,
};

function toggleBtn(active) {
  return {
    flex: 1, borderRadius: 12, padding: 11, fontSize: 13.5, fontWeight: 700,
    border: active ? '1px solid #CFEAC0' : '1px solid rgba(255,255,255,0.15)',
    background: active ? 'rgba(207,234,192,0.15)' : 'transparent',
    color: active ? '#CFEAC0' : 'rgba(244,246,242,0.7)',
  };
}
