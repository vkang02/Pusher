import React, { useEffect, useRef, useState } from 'react';
import PhotoViewer from './PhotoViewer.jsx';
import { colors, longDate, shortDate } from '../lib/theme.js';

function buildInitialExercises(workout, existingLog, prevLog) {
  const base = existingLog ? existingLog.exercises : workout.exercises;
  return JSON.parse(JSON.stringify(base)).map((ex) => {
    if (!existingLog && prevLog) {
      const prev = prevLog.exercises.find((p) => p.id === ex.id || p.name === ex.name);
      if (prev) return { ...ex, sets: [...prev.sets], weight: prev.weight || ex.weight || '' };
    }
    return ex;
  });
}

export default function LogSheet({
  workout, existingLog, liveLog, prevLog, dateKey, isNew, readOnly, ownerName, photos,
  onClose, onSave, onDelete, onEnsureSaved, onUploadPhoto, onDeletePhoto, busy,
  onSyncCell, onSyncWeight, onSyncDuration, onStopSharing,
}) {
  const [exercises, setExercises] = useState(() => buildInitialExercises(workout, existingLog, prevLog));
  const [durationMinutes, setDurationMinutes] = useState(existingLog?.duration_minutes ?? '');
  const [notes, setNotes] = useState(existingLog?.notes ?? '');
  const [logId, setLogId] = useState(existingLog?.id ?? null);
  const [localPhotos, setLocalPhotos] = useState(photos || []);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  const [viewerIndex, setViewerIndex] = useState(null);
  const fileInputRef = useRef(null);
  const [shareTogether, setShareTogether] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const dirty = useRef(new Set());
  const pending = useRef(new Map());

  const sharedId = (liveLog || existingLog)?.shared_session_id || null;
  const isShared = !!sharedId && !readOnly && !!logId;

  // Edits to a shared log go out one cell at a time, shortly after typing stops.
  const queueSync = (key, fn) => {
    dirty.current.add(key);
    clearTimeout(pending.current.get(key)?.timer);
    const run = () => {
      pending.current.delete(key);
      fn().then(() => { dirty.current.delete(key); setSyncError(null); })
        .catch((err) => { dirty.current.delete(key); setSyncError(err.message || 'Could not sync that change.'); });
    };
    pending.current.set(key, { timer: setTimeout(run, 500), run });
  };

  useEffect(() => () => {
    for (const { timer, run } of pending.current.values()) { clearTimeout(timer); run(); }
  }, []);

  // Take in the other person's edits to anything I'm not mid-typing in.
  useEffect(() => {
    if (!isShared || !liveLog) return;
    setExercises((prev) => prev.map((ex) => {
      const remote = (liveLog.exercises || []).find((r) => r.id === ex.id);
      if (!remote) return ex;
      return {
        ...ex,
        weight: dirty.current.has(`${ex.id}:w`) ? ex.weight : (remote.weight || ''),
        sets: ex.sets.map((v, j) => (dirty.current.has(`${ex.id}:${j}`) ? v : (remote.sets?.[j] ?? v))),
      };
    }));
    if (!dirty.current.has('dur')) setDurationMinutes(liveLog.duration_minutes ?? '');
  }, [liveLog, isShared]);

  const title = existingLog ? existingLog.title : workout.title;
  const description = existingLog ? existingLog.description : workout.description;
  const prefillNote = !existingLog && prevLog ? `Sets and reps carried over from ${shortDate(prevLog.log_date)} — edit anything you changed today.` : null;

  const setWeight = (i, val) => {
    setExercises((prev) => prev.map((ex, idx) => (idx === i ? { ...ex, weight: val } : ex)));
    if (isShared) {
      const exId = exercises[i].id;
      queueSync(`${exId}:w`, () => onSyncWeight(logId, exId, val));
    }
  };

  const setValue = (i, j, val) => {
    setExercises((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      next[i].sets[j] = val;
      return next;
    });
    if (isShared) {
      const exId = exercises[i].id;
      queueSync(`${exId}:${j}`, () => onSyncCell(logId, exId, j, val));
    }
  };

  const changeDuration = (val) => {
    setDurationMinutes(val);
    if (isShared) queueSync('dur', () => onSyncDuration(logId, val === '' ? null : Number(val)));
  };

  const currentEntry = () => ({
    workoutId: workout.id, title, description, exercises,
    durationMinutes: durationMinutes === '' ? null : Number(durationMinutes),
    notes: notes.trim(),
    isShared,
    startSharing: shareTogether && !isShared,
  });

  const handleFilesSelected = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setUploading(true);
    setPhotoError(null);
    try {
      let id = logId;
      if (!id) {
        const saved = await onEnsureSaved(currentEntry());
        id = saved.id;
        setLogId(id);
      }
      for (const file of files) {
        const photo = await onUploadPhoto(id, file);
        setLocalPhotos((prev) => [...prev, photo]);
      }
    } catch (err) {
      setPhotoError(err.message || 'Could not upload photo.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async (photo) => {
    setLocalPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    try {
      await onDeletePhoto(photo);
    } catch (err) {
      setPhotoError(err.message || 'Could not remove photo.');
    }
  };

  return (
    <div style={{ position: 'absolute', inset: 0, background: colors.bg, zIndex: 60, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '56px 20px 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 21, fontWeight: 700 }}>{title}</div>
          <div style={{ fontSize: 13, color: colors.textDim55, marginTop: 2 }}>
            {longDate(dateKey)}{ownerName ? ` · ${ownerName}` : ''}
          </div>
        </div>
        <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#F4F6F2', fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px', minHeight: 0 }}>
        {description && (
          <div style={{ fontSize: 14, color: colors.textDim65, lineHeight: 1.5, marginBottom: 14 }}>{description}</div>
        )}
        {prefillNote && (
          <div style={{ background: colors.accentSoft1, border: `1px solid ${colors.accentSoft3}`, borderRadius: 12, padding: '11px 13px', fontSize: 12.5, color: colors.accent, lineHeight: 1.45, marginBottom: 16 }}>
            {prefillNote}
          </div>
        )}

        {!readOnly && isShared && (
          <div style={{ background: colors.accentSoft1, border: `1px solid ${colors.accentSoft3}`, borderRadius: 12, padding: '11px 13px', fontSize: 12.5, color: colors.accent, lineHeight: 1.45, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span>Logged together — reps, weights and time sync live. Notes and photos stay yours.</span>
            <button onClick={() => onStopSharing(logId)} style={{ background: 'none', border: 'none', color: colors.textDim7, fontSize: 12, fontWeight: 600, flexShrink: 0, padding: 4 }}>Stop</button>
          </div>
        )}
        {!readOnly && !isShared && (
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: '11px 13px', marginBottom: 16, cursor: 'pointer' }}>
            <input type="checkbox" checked={shareTogether} onChange={(e) => setShareTogether(e.target.checked)} style={{ marginTop: 3 }} />
            <span style={{ fontSize: 13, lineHeight: 1.4 }}>
              <span style={{ fontWeight: 700 }}>Log together</span>
              <span style={{ display: 'block', color: colors.textDim55, fontSize: 12 }}>Your crew can join this log, and reps, weights and time stay in sync between you.</span>
            </span>
          </label>
        )}
        {syncError && <div style={{ fontSize: 12.5, color: '#F0A0A0', marginBottom: 12 }}>{syncError}</div>}

        {exercises.map((ex, i) => {
          const prev = prevLog ? prevLog.exercises.find((p) => p.id === ex.id || p.name === ex.name) : null;
          return (
            <div key={ex.id} style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 14, marginBottom: 11 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15.5, fontWeight: 700 }}>{ex.name}</div>
                  <div style={{ fontSize: 11.5, color: colors.textDim45, marginTop: 2 }}>
                    {ex.sets.length} sets
                    {prev && ` · Last: ${prev.sets.map((v) => v || '–').join(' / ')}${prev.weight ? ` @ ${prev.weight}` : ''}`}
                  </div>
                </div>
                {(!readOnly || ex.weight) && (
                  <input
                    type="text" value={ex.weight || ''} placeholder="Weight" disabled={readOnly}
                    onChange={(e) => setWeight(i, e.target.value)}
                    style={{ width: 92, flexShrink: 0, boxSizing: 'border-box', textAlign: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: readOnly ? colors.textDim7 : colors.text, fontSize: 13.5, padding: '8px 6px' }}
                  />
                )}
              </div>
              <div style={{ display: 'flex', gap: 7 }}>
                {ex.sets.map((v, j) => (
                  <div key={j} style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10.5, color: colors.textDim45, marginBottom: 4, textAlign: 'center' }}>Set {j + 1}</div>
                    <input
                      type="text" value={v} placeholder="reps" disabled={readOnly}
                      onChange={(e) => setValue(i, j, e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box', textAlign: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: readOnly ? colors.textDim7 : colors.text, fontSize: 14, padding: '9px 4px' }}
                    />
                  </div>
                ))}
              </div>
              {ex.notes && (
                <div style={{ fontSize: 12, color: colors.textDim55, marginTop: 9, lineHeight: 1.4 }}>{ex.notes}</div>
              )}
            </div>
          );
        })}

        {(!readOnly || durationMinutes || notes) && (
          <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 14, marginBottom: 20 }}>
            {(!readOnly || durationMinutes) && (
              <>
                <div style={{ fontSize: 12, color: colors.textDim5, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 7 }}>Duration (minutes)</div>
                <input
                  type="number" inputMode="numeric" min="0" value={durationMinutes} placeholder="45" disabled={readOnly}
                  onChange={(e) => changeDuration(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: readOnly ? colors.textDim7 : colors.text, fontSize: 15, padding: '10px 11px', marginBottom: 14 }}
                />
              </>
            )}
            {(!readOnly || notes) && (
              <>
                <div style={{ fontSize: 12, color: colors.textDim5, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 7 }}>Notes</div>
                <textarea
                  value={notes} placeholder="Jelly arms, forearms are shot…" rows={2} disabled={readOnly}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: readOnly ? colors.textDim7 : colors.text, fontSize: 14, fontFamily: 'inherit', resize: 'none', padding: '10px 11px' }}
                />
              </>
            )}
          </div>
        )}

        {(!readOnly || localPhotos.length > 0) && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: colors.textDim5, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 9 }}>Photos</div>
            <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
              {localPhotos.map((p, idx) => (
                <div key={p.id} style={{ position: 'relative', width: 76, height: 76, flexShrink: 0 }}>
                  <img
                    src={p.url} alt="" onClick={() => setViewerIndex(idx)}
                    style={{ width: 76, height: 76, borderRadius: 12, objectFit: 'cover', border: `1px solid ${colors.border}`, display: 'block', cursor: 'pointer' }}
                  />
                  {!readOnly && (
                    <button
                      onClick={() => handleRemovePhoto(p)}
                      style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%', background: '#0A0A0A', border: `1px solid ${colors.border15}`, color: colors.text, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >×</button>
                  )}
                </div>
              ))}
              {!readOnly && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{ width: 76, height: 76, borderRadius: 12, border: '1px dashed rgba(207,234,192,0.4)', background: 'none', color: colors.accent, fontSize: 12.5, fontWeight: 600, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 4 }}
                >
                  {uploading ? 'Uploading…' : '+ Add'}
                </button>
              )}
              <input
                ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
                onChange={(e) => { handleFilesSelected(e.target.files); e.target.value = ''; }}
              />
            </div>
            {photoError && (
              <div style={{ fontSize: 12.5, color: '#F0A0A0', marginTop: 8 }}>{photoError}</div>
            )}
          </div>
        )}
      </div>

      <div style={{ padding: '14px 20px 22px', borderTop: `1px solid ${colors.border}`, flexShrink: 0, display: 'flex', gap: 9 }}>
        {readOnly ? (
          <button
            onClick={onClose}
            style={{ flex: 1, borderRadius: 13, padding: 14, fontSize: 15.5, fontWeight: 700, border: `1px solid ${colors.border15}`, background: 'none', color: colors.text }}
          >
            Close
          </button>
        ) : (
          <>
            {!isNew && (
              <button onClick={onDelete} disabled={busy} style={{ background: 'none', border: `1px solid ${colors.border15}`, color: colors.textDim7, borderRadius: 13, padding: '14px 16px', fontSize: 14.5, fontWeight: 600, flexShrink: 0 }}>
                Remove
              </button>
            )}
            <button
              onClick={() => onSave(currentEntry())}
              disabled={busy}
              style={{ flex: 1, borderRadius: 13, padding: 14, fontSize: 15.5, fontWeight: 700, border: 'none', background: colors.accent, color: '#0A0A0A' }}
            >
              {isNew ? 'Log this workout' : 'Save changes'}
            </button>
          </>
        )}
      </div>
      {viewerIndex !== null && (
        <PhotoViewer photos={localPhotos} startIndex={viewerIndex} onClose={() => setViewerIndex(null)} />
      )}
    </div>
  );
}
