import React, { useRef, useState } from 'react';
import { colors, colorForIndex, initialsOf, relativeStatus } from '../lib/theme.js';

export default function GroupScreen({ group, members, myUserId, todayKey, avatarByUser, onSignOut, onSetPassword, onUploadAvatar, onRename }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState(null);

  const startRename = (current) => { setNameDraft(current); setNameError(null); setEditingName(true); };
  const saveName = async () => {
    const next = nameDraft.trim();
    if (!next) { setNameError('Name can\'t be empty.'); return; }
    setSavingName(true);
    setNameError(null);
    try {
      await onRename(next.slice(0, 30));
      setEditingName(false);
    } catch (err) {
      setNameError(err.message || 'Could not save your name.');
    } finally {
      setSavingName(false);
    }
  };

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
              {editingName ? (
                <form
                  onSubmit={(e) => { e.preventDefault(); saveName(); }}
                  style={{ flex: 1, minWidth: 0 }}
                >
                  <input
                    type="text" value={nameDraft} maxLength={30} autoFocus
                    onChange={(e) => setNameDraft(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', background: '#161816', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, color: '#F4F6F2', fontSize: 16, padding: '8px 10px', marginBottom: 8 }}
                  />
                  {nameError && <div style={{ fontSize: 12.5, color: '#F0A0A0', marginBottom: 8 }}>{nameError}</div>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" disabled={savingName} style={{ background: colors.accent, color: '#0A0A0A', border: 'none', borderRadius: 10, padding: '7px 14px', fontSize: 13.5, fontWeight: 700 }}>
                      {savingName ? 'Saving…' : 'Save'}
                    </button>
                    <button type="button" onClick={() => setEditingName(false)} style={{ background: 'none', border: 'none', color: colors.textDim55, fontSize: 13.5, padding: '7px 8px' }}>Cancel</button>
                  </div>
                </form>
              ) : (
                <>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15.5, fontWeight: 700 }}>{m.name}</div>
                    <div style={{ fontSize: 12.5, color: colors.textDim65 }}>{status}</div>
                  </div>
                  <button
                    onClick={() => startRename(m.name)} aria-label="Change your name"
                    style={{ background: 'none', border: `1px solid ${colors.accentSoft3}`, color: colors.accent, borderRadius: 10, fontSize: 11.5, fontWeight: 700, padding: '4px 10px', flexShrink: 0 }}
                  >
                    Edit
                  </button>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: colors.accent, flexShrink: 0 }}>{m.total}x</div>
                </>
              )}
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

      <button onClick={onSetPassword} style={{ width: '100%', background: 'none', border: `1px solid ${colors.border15}`, color: colors.textDim7, borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 600, marginTop: 22 }}>
        Set a password
      </button>

      <button onClick={onSignOut} style={{ width: '100%', background: 'none', border: `1px solid ${colors.border15}`, color: colors.textDim7, borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 600, marginTop: 10 }}>
        Sign out
      </button>
    </div>
  );
}
