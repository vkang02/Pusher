import React, { useEffect, useRef, useState } from 'react';
import PhotoViewer from './PhotoViewer.jsx';
import { colors, longDate, shortDate, uid } from '../lib/theme.js';

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

const SYNC_DELAY_MS = 250;   // wait for a pause in typing, then send that one cell
const EDIT_GRACE_MS = 1500;  // keep protecting a cell I just edited from being overwritten by an older update
const POLL_MS = 3000;        // backstop in case a live update never arrives

export default function LogSheet({
  workout, existingLog, liveLog, prevLog, dateKey, isNew, readOnly, ownerName, photos,
  onClose, onSave, onDelete, onEnsureSaved, onUploadPhoto, onDeletePhoto, busy,
  onSyncCell, onSyncWeight, onSyncDuration, onStopSharing,
  logTogetherPref, onSetLogTogether, onEnsureShared, onPollShared, onAdopt, onAddExercise, partnerNamesFor,
}) {
  const [exercises, setExercises] = useState(() => buildInitialExercises(workout, existingLog, prevLog));
  const [durationMinutes, setDurationMinutes] = useState(existingLog?.duration_minutes ?? '');
  const [notes, setNotes] = useState(existingLog?.notes ?? '');
  const [logId, setLogId] = useState(existingLog?.id ?? null);
  const [sess, setSess] = useState(existingLog?.shared_session_id ?? null);
  const [localPhotos, setLocalPhotos] = useState(photos || []);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  const [viewerIndex, setViewerIndex] = useState(null);
  const fileInputRef = useRef(null);
  // Remembered choice: a brand-new log starts out ticked if I chose Log together last time.
  const [shareTogether, setShareTogether] = useState(() => !!existingLog?.shared_session_id || (!readOnly && isNew && !!logTogetherPref));
  const [syncError, setSyncError] = useState(null);
  const [flash, setFlash] = useState(() => new Set());
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSets, setNewSets] = useState(3);

  // Refs hold the live truth for timers and async callbacks, which outlive any one render.
  const latest = useRef({});
  latest.current = { exercises, durationMinutes, notes, shareTogether };
  const idRef = useRef(existingLog?.id ?? null);
  const sessRef = useRef(existingLog?.shared_session_id ?? null);
  const dirty = useRef(new Map());    // cell key -> token, for cells I'm editing or just edited
  const pending = useRef(new Map());  // cell key -> { timer, run }
  const startRef = useRef(null);      // in-flight "start / join the shared sheet" call
  const flashTimer = useRef(null);
  const addChain = useRef(Promise.resolve());   // added exercises are saved in order, before any cell that depends on them

  const isShared = !!sess && !readOnly && !!logId;
  const title = existingLog ? existingLog.title : workout.title;
  const description = existingLog ? existingLog.description : workout.description;
  const prefillNote = !existingLog && !sess && prevLog ? `Sets and reps carried over from ${shortDate(prevLog.log_date)} — edit anything you changed today.` : null;

  const entryNow = () => {
    const s = latest.current;
    return {
      workoutId: workout.id, title, description, exercises: s.exercises,
      durationMinutes: s.durationMinutes === '' ? null : Number(s.durationMinutes),
      notes: s.notes.trim(),
      logId: idRef.current,
      isShared: !!sessRef.current && !!idRef.current,
      startSharing: s.shareTogether && !sessRef.current,
    };
  };

  const markDirty = (key) => { const token = {}; dirty.current.set(key, token); return token; };
  const release = (key, token) => setTimeout(() => { if (dirty.current.get(key) === token) dirty.current.delete(key); }, EDIT_GRACE_MS);

  // Take in the shared sheet's values for every cell I'm not in the middle of editing.
  const applyRemote = (row) => {
    const changed = [];
    for (const ex of latest.current.exercises) {
      const r = (row.exercises || []).find((x) => x.id === ex.id);
      if (!r) continue;
      if (!dirty.current.has(`${ex.id}:w`) && (r.weight || '') !== (ex.weight || '')) changed.push(`${ex.id}:w`);
      ex.sets.forEach((v, j) => {
        if (!dirty.current.has(`${ex.id}:${j}`) && (r.sets?.[j] ?? v) !== v) changed.push(`${ex.id}:${j}`);
      });
    }
    const nd = row.duration_minutes ?? '';
    const durChanged = !dirty.current.has('dur') && String(nd) !== String(latest.current.durationMinutes);
    // Exercises the crew added (or removed) show up on my sheet too.
    const known = new Set(latest.current.exercises.map((e) => e.id));
    const incoming = (row.exercises || []).filter((r) => !known.has(r.id));
    const gone = (row.exercises || []).filter((r) => r.removed && latest.current.exercises.some((e) => e.id === r.id && !e.removed));
    if (!changed.length && !durChanged && !incoming.length && !gone.length) return;
    setExercises((prev) => {
      const have = new Set(prev.map((e) => e.id));
      const merged = prev.map((ex) => {
        const r = (row.exercises || []).find((x) => x.id === ex.id);
        if (!r) return ex;
        return {
          ...ex,
          removed: ex.removed || r.removed || undefined,
          weight: dirty.current.has(`${ex.id}:w`) ? ex.weight : (r.weight || ''),
          sets: ex.sets.map((v, j) => (dirty.current.has(`${ex.id}:${j}`) ? v : (r.sets?.[j] ?? v))),
        };
      });
      return [...merged, ...(row.exercises || []).filter((r) => !have.has(r.id))];
    });
    for (const r of incoming) changed.push(`${r.id}:x`);
    if (durChanged) { setDurationMinutes(nd); changed.push('dur'); }
    setFlash(new Set(changed));
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(new Set()), 1600);
  };

  // Switch this sheet onto a (possibly different) shared row.
  const adopt = (row) => {
    idRef.current = row.id;
    sessRef.current = row.shared_session_id || null;
    setLogId(row.id);
    setSess(sessRef.current);
    onAdopt?.(row);
    applyRemote(row);
  };

  // Make sure my log exists and is on the shared sheet — joining the crew's if they've started.
  const ensureSharedNow = async () => {
    if (idRef.current && sessRef.current) return idRef.current;
    if (!startRef.current) {
      startRef.current = onEnsureShared(entryNow())
        .then((row) => { adopt(row); return row; })
        .finally(() => { startRef.current = null; });
    }
    return (await startRef.current).id;
  };

  // Save an added exercise (or a removal flag) onto my row, in order, so my cells and the crew's copy can find it.
  const persistExercise = (ex) => {
    addChain.current = addChain.current
      .then(() => onAddExercise(idRef.current, ex))
      .catch((err) => setSyncError(err.message || 'Could not save that exercise.'));
  };

  // Exercises I added that my row doesn't have yet (e.g. added just before joining the crew's sheet).
  const pushLocalExtras = (row) => {
    if (!idRef.current || !sessRef.current) return;
    for (const e of latest.current.exercises) {
      if (e.added && !e.removed && !(row.exercises || []).some((r) => r.id === e.id)) persistExercise(e);
    }
  };

  const shareActive = () => !readOnly && (!!sessRef.current || latest.current.shareTogether);

  // One cell goes out shortly after typing pauses; the server merges it into everyone's sheet.
  const queueSync = (key, send) => {
    const token = markDirty(key);
    clearTimeout(pending.current.get(key)?.timer);
    const run = async () => {
      pending.current.delete(key);
      try {
        const id = await ensureSharedNow();
        await addChain.current;
        await send(id);
        setSyncError(null);
      } catch (err) {
        setSyncError(err.message || 'Could not sync that change.');
      }
      release(key, token);
    };
    pending.current.set(key, { timer: setTimeout(run, SYNC_DELAY_MS), run });
  };

  useEffect(() => () => {
    clearTimeout(flashTimer.current);
    for (const { timer, run } of pending.current.values()) { clearTimeout(timer); run(); }
  }, []);

  // Live updates from the group channel (the app refreshes my logs whenever anything changes).
  useEffect(() => {
    if (readOnly || !liveLog?.shared_session_id) return;
    if (liveLog.shared_session_id === sessRef.current) applyRemote(liveLog);
  }, [liveLog]);

  // Backstop: every few seconds, find the crew's session (or settle two sessions into one)
  // and re-read the sheet, so it still converges if the live connection drops.
  useEffect(() => {
    if (readOnly) return undefined;
    let stopped = false;
    let running = false;
    const tick = async () => {
      if (stopped || running || document.visibilityState === 'hidden' || startRef.current) return;
      if (!sessRef.current && !latest.current.shareTogether) return;
      running = true;
      const before = `${idRef.current}|${sessRef.current}`;
      try {
        const s = latest.current;
        const row = await onPollShared({
          logId: idRef.current, sessionId: sessRef.current, want: s.shareTogether, workoutId: workout.id,
          exercises: s.exercises, durationMinutes: s.durationMinutes === '' ? null : Number(s.durationMinutes),
        });
        if (stopped || !row || `${idRef.current}|${sessRef.current}` !== before) return;
        if (row.id !== idRef.current || (row.shared_session_id || null) !== sessRef.current) adopt(row);
        else applyRemote(row);
        pushLocalExtras(row);
      } catch (err) {
        // offline or a blip: the next tick tries again
      } finally {
        running = false;
      }
    };
    tick();
    const timer = setInterval(tick, POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { stopped = true; clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [readOnly]);

  const exNow = (exId) => latest.current.exercises.find((e) => e.id === exId);

  const setWeight = (i, val) => {
    const exId = exercises[i].id;
    setExercises((prev) => prev.map((ex, idx) => (idx === i ? { ...ex, weight: val } : ex)));
    if (shareActive()) queueSync(`${exId}:w`, (id) => onSyncWeight(id, exId, exNow(exId)?.weight ?? val));
  };

  const setValue = (i, j, val) => {
    const exId = exercises[i].id;
    setExercises((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      next[i].sets[j] = val;
      return next;
    });
    if (shareActive()) queueSync(`${exId}:${j}`, (id) => onSyncCell(id, exId, j, exNow(exId)?.sets[j] ?? val));
  };

  const changeDuration = (val) => {
    setDurationMinutes(val);
    if (shareActive()) {
      queueSync('dur', (id) => {
        const v = latest.current.durationMinutes;
        return onSyncDuration(id, v === '' ? null : Number(v));
      });
    }
  };

  const toggleShare = (on) => {
    setShareTogether(on);
    latest.current.shareTogether = on;
    onSetLogTogether?.(on);
    // An already-saved log joins the shared sheet right away; a brand-new one starts on the first number.
    if (on && idRef.current && !sessRef.current) {
      ensureSharedNow().catch((err) => setSyncError(err.message || 'Could not start sharing.'));
    }
  };

  const addExercise = () => {
    const name = newName.trim();
    if (!name) return;
    const count = Math.max(1, Math.min(10, Number(newSets) || 3));
    const ex = { id: uid('x'), name, sets: Array(count).fill(''), weight: '', added: true };
    setExercises((prev) => [...prev, ex]);
    setAdding(false);
    setNewName('');
    setNewSets(3);
    if (sessRef.current && idRef.current) {
      persistExercise(ex);
    } else if (shareActive()) {
      // Brand-new log with Log together on: this is the first edit, so start (or join) the shared sheet.
      setTimeout(() => ensureSharedNow().catch((err) => setSyncError(err.message || 'Could not start sharing.')), 60);
    }
  };

  const removeExercise = (i) => {
    const ex = exercises[i];
    if (sessRef.current && idRef.current) {
      setExercises((prev) => prev.map((e, idx) => (idx === i ? { ...e, removed: true } : e)));
      persistExercise({ ...ex, removed: true });
    } else {
      setExercises((prev) => prev.filter((_, idx) => idx !== i));
    }
  };

  const partners = isShared && partnerNamesFor ? partnerNamesFor(sess) : [];
  const cellBorder = (key) => (flash.has(key) ? `1px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.15)');
  const cellBg = (key) => (flash.has(key) ? colors.accentSoft12 : 'rgba(255,255,255,0.06)');

  const handleFilesSelected = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setUploading(true);
    setPhotoError(null);
    try {
      let id = idRef.current;
      if (!id) {
        if (latest.current.shareTogether) {
          id = await ensureSharedNow();
        } else {
          const saved = await onEnsureSaved(entryNow());
          id = saved.id;
          idRef.current = id;
          setLogId(id);
        }
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
    <div style={{ position: 'fixed', inset: 0, background: colors.bg, zIndex: 60, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '56px 20px 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 21, fontWeight: 700 }}>{title}</div>
          <div style={{ fontSize: 13, color: colors.textDim55, marginTop: 2 }}>
            {longDate(dateKey)}{ownerName ? ` · ${ownerName}` : ''}
          </div>
        </div>
        <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#F4F6F2', fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain', padding: '0 20px', minHeight: 0 }}>
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
            <span>
              <span style={{ fontWeight: 700 }}>{partners.length ? `Logging together with ${partners.join(' & ')}` : 'Logging together'}</span>
              <span style={{ display: 'block', opacity: 0.85 }}>
                {partners.length ? 'You\'re on the same sheet — reps, weights and time update for both of you instantly. Notes and photos stay yours.' : 'Waiting for your crew to open this workout. Whatever you enter shows up on their sheet as soon as they do.'}
              </span>
            </span>
            <button onClick={() => onStopSharing(logId)} style={{ background: 'none', border: 'none', color: colors.textDim7, fontSize: 12, fontWeight: 600, flexShrink: 0, padding: 4 }}>Stop</button>
          </div>
        )}
        {!readOnly && !isShared && (
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: '11px 13px', marginBottom: 16, cursor: 'pointer' }}>
            <input type="checkbox" checked={shareTogether} onChange={(e) => toggleShare(e.target.checked)} style={{ marginTop: 3 }} />
            <span style={{ fontSize: 13, lineHeight: 1.4 }}>
              <span style={{ fontWeight: 700 }}>Log together</span>
              <span style={{ display: 'block', color: colors.textDim55, fontSize: 12 }}>
                {shareTogether
                  ? 'On. If your crew already started this workout you\'ll land on their sheet; otherwise yours opens up as soon as you enter a number. Remembered for next time.'
                  : 'One shared sheet: reps, weights and time update for everyone logging this workout. Remembered for next time.'}
              </span>
            </span>
          </label>
        )}
        {syncError && <div style={{ fontSize: 12.5, color: '#F0A0A0', marginBottom: 12 }}>{syncError}</div>}

        {exercises.map((ex, i) => {
          if (ex.removed) return null;
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
                    style={{ width: 92, flexShrink: 0, boxSizing: 'border-box', textAlign: 'center', background: cellBg(`${ex.id}:w`), border: cellBorder(`${ex.id}:w`), transition: 'background 0.4s, border-color 0.4s', borderRadius: 10, color: readOnly ? colors.textDim7 : colors.text, fontSize: 13.5, padding: '8px 6px' }}
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
                      style={{ width: '100%', boxSizing: 'border-box', textAlign: 'center', background: cellBg(`${ex.id}:${j}`), border: cellBorder(`${ex.id}:${j}`), transition: 'background 0.4s, border-color 0.4s', borderRadius: 10, color: readOnly ? colors.textDim7 : colors.text, fontSize: 14, padding: '9px 4px' }}
                    />
                  </div>
                ))}
              </div>
              {ex.notes && (
                <div style={{ fontSize: 12, color: colors.textDim55, marginTop: 9, lineHeight: 1.4 }}>{ex.notes}</div>
              )}
              {ex.added && !readOnly && (
                <button onClick={() => removeExercise(i)} style={{ background: 'none', border: 'none', color: colors.textDim5, fontSize: 12, padding: '8px 0 0' }}>
                  Remove this exercise
                </button>
              )}
            </div>
          );
        })}

        {!readOnly && (adding ? (
          <form
            onSubmit={(e) => { e.preventDefault(); addExercise(); }}
            style={{ background: colors.card, border: `1px dashed rgba(207,234,192,0.4)`, borderRadius: 16, padding: 14, marginBottom: 11 }}
          >
            <div style={{ fontSize: 12, color: colors.textDim5, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 7 }}>Add an exercise</div>
            <input
              type="text" value={newName} placeholder="Exercise name" autoFocus maxLength={60}
              onChange={(e) => setNewName(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: colors.text, fontSize: 16, padding: '10px 11px', marginBottom: 10 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: colors.textDim65 }}>Sets</span>
              <button type="button" onClick={() => setNewSets((n) => Math.max(1, Number(n) - 1))} style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${colors.border15}`, background: 'none', color: colors.text, fontSize: 18 }}>−</button>
              <span style={{ minWidth: 22, textAlign: 'center', fontSize: 16, fontWeight: 700 }}>{newSets}</span>
              <button type="button" onClick={() => setNewSets((n) => Math.min(10, Number(n) + 1))} style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${colors.border15}`, background: 'none', color: colors.text, fontSize: 18 }}>+</button>
            </div>
            <div style={{ display: 'flex', gap: 9 }}>
              <button type="submit" disabled={!newName.trim()} style={{ flex: 1, borderRadius: 11, padding: 11, fontSize: 14.5, fontWeight: 700, border: 'none', background: colors.accent, color: '#0A0A0A', opacity: newName.trim() ? 1 : 0.5 }}>Add</button>
              <button type="button" onClick={() => { setAdding(false); setNewName(''); }} style={{ borderRadius: 11, padding: '11px 16px', fontSize: 14.5, fontWeight: 600, border: `1px solid ${colors.border15}`, background: 'none', color: colors.textDim7 }}>Cancel</button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAdding(true)}
            style={{ width: '100%', borderRadius: 14, padding: 13, fontSize: 14.5, fontWeight: 700, border: '1px dashed rgba(207,234,192,0.4)', background: 'none', color: colors.accent, marginBottom: 11 }}
          >
            + Add exercise
          </button>
        ))}

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
              onClick={() => onSave(entryNow())}
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
