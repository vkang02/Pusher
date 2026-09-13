import React, { useRef, useState } from 'react';
import { colors, colorForIndex, initialsOf, relativeStatus } from '../lib/theme.js';

export default function GroupScreen({ group, members, myUserId, todayKey, avatarByUser, onSignOut, onUploadAvatar }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleAvatarFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      await onUploadAvatar(file);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: '58px 20px 20px' }}>
      <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 3 }}>{group?.name}</div>
      <div style={{ fontSize: 13.5, color: colors.textDim55, marginBottom: 18 }}>{members.length} member{members.length === 1 ? '' : 's'}</div>

      <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 18, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: colors.textDim5, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Invite code</div>
        <div style={{ fontSize: 25, fontWeight: 700, letterSpacing: '3px', color: colors.accent, marginBottom: 6 }}>{group?.code}</div>
        <div style={{ fontSize: 12.5, color: colors.textDim5, lineHeight: 1.45 }}>Share this code and the app link with friends so they can join.</div>
      </div>

      {members.map((m, i) => {
        const isMe = m.userId === myUserId;
        const status = relativeStatus(m.last, todayKey);
        const avatarUrl = avatarByUser?.[m.userId];
        if (isMe) {
          return (
            <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: 13, borderRadius: 15, background: colors.accentSoft1, border: `1px solid ${colors.accentSoft3}`, marginBottom: 12 }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{ position: 'relative', width: 40, height: 40, borderRadius: '50%', border: 'none', padding: 0, flexShrink: 0, cursor: 'pointer' }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: colors.accent, color: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                    {initialsOf(m.name)}
                  </div>
                )}
                <div style={{ position: 'absolute', bottom: -2, right: -2, width: 17, height: 17, borderRadius: '50%', background: '#0A0A0A', border: `1px solid ${colors.border15}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>
                  {uploading ? '…' : '✎'}
                </div>
              </button>
              <input
                ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={(e) => { handleAvatarFile(e.target.files[0]); e.target.value = ''; }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15.5, fontWeight: 700 }}>{m.name}</div>
                <div style={{ fontSize: 12.5, color: colors.textDim65 }}>{status}</div>
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: colors.accent, flexShrink: 0 }}>{m.total}x</div>
            </div>
          );
        }
        return (
          <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 0', borderBottom: `1px solid ${colors.border}` }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: colorForIndex(i), color: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                {initialsOf(m.name)}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15.5, fontWeight: 600 }}>{m.name}</div>
              <div style={{ fontSize: 12.5, color: colors.textDim5 }}>{status}</div>
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: 'rgba(244,246,242,0.85)', flexShrink: 0 }}>{m.total}x</div>
          </div>
        );
      })}

      <button onClick={onSignOut} style={{ width: '100%', background: 'none', border: `1px solid ${colors.border15}`, color: colors.textDim7, borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 600, marginTop: 22 }}>
        Sign out
      </button>
    </div>
  );
}
