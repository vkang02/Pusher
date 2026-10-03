import React, { useState } from 'react';
import { colors, uid } from '../lib/theme.js';

function cloneWorkout(w) {
  return w
    ? JSON.parse(JSON.stringify(w))
    : { id: null, title: '', description: '', exercises: [{ id: uid('e'), name: '', sets: ['', '', ''], weight: '', notes: '' }] };
}

export default function WorkoutBuilderSheet({ workout, onClose, onSave, onDelete, busy }) {
  const [draft, setDraft] = useState(() => cloneWorkout(workout));
  const isExisting = !!workout;

  const patch = (fn) => setDraft((d) => { const next = JSON.parse(JSON.stringify(d)); fn(next); return next; });

  const saveDisabled = !draft.title.trim() || busy;

  return (
    <div style={{ position: 'fixed', inset: 0, background: colors.bg, zIndex: 60, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '56px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
        <div style={{ fontSize: 21, fontWeight: 700 }}>{isExisting ? 'Edit Workout' : 'New Workout'}</div>
        <button onClick={onClose} style={closeBtnStyle}>×</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain', padding: '0 20px', minHeight: 0 }}>
        <div style={labelStyle}>Title</div>
        <input
          type="text" value={draft.title} placeholder="Leg Day"
          onChange={(e) => { const v = e.target.value; patch((d) => { d.title = v; }); }}
          style={{ ...inputStyle, marginBottom: 15 }}
        />

        <div style={labelStyle}>Description</div>
        <textarea
          value={draft.description} placeholder="Heavy compound lifts, 45 minutes." rows={2}
          onChange={(e) => { const v = e.target.value; patch((d) => { d.description = v; }); }}
          style={{ ...inputStyle, fontFamily: 'inherit', resize: 'none', marginBottom: 20 }}
        />

        <div style={{ ...labelStyle, marginBottom: 10 }}>Exercises</div>

        {draft.exercises.map((ex, i) => (
          <div key={ex.id} style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 14, marginBottom: 11 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 11 }}>
              <input
                type="text" value={ex.name} placeholder="Exercise name"
                onChange={(e) => { const v = e.target.value; patch((d) => { d.exercises[i].name = v; }); }}
                style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: colors.text, fontSize: 15, fontWeight: 600, padding: '10px 11px' }}
              />
              <input
                type="text" value={ex.weight || ''} placeholder="Weight"
                onChange={(e) => { const v = e.target.value; patch((d) => { d.exercises[i].weight = v; }); }}
                style={{ width: 84, flexShrink: 0, boxSizing: 'border-box', textAlign: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: colors.text, fontSize: 13.5, padding: '11px 6px' }}
              />
              <button
                onClick={() => patch((d) => { d.exercises.splice(i, 1); })}
                style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: colors.textDim65 || colors.textDim7, fontSize: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >×</button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 12.5, color: colors.textDim55 }}>Sets</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <button
                  onClick={() => patch((d) => { if (d.exercises[i].sets.length > 1) d.exercises[i].sets.pop(); })}
                  style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: colors.text, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >−</button>
                <span style={{ fontSize: 14.5, fontWeight: 700, minWidth: 16, textAlign: 'center' }}>{ex.sets.length}</span>
                <button
                  onClick={() => patch((d) => { if (d.exercises[i].sets.length < 6) d.exercises[i].sets.push(''); })}
                  style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(207,234,192,0.15)', border: '1px solid rgba(207,234,192,0.4)', color: colors.accent, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >+</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 7, marginBottom: 11 }}>
              {ex.sets.map((v, j) => (
                <div key={j} style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10.5, color: colors.textDim45, marginBottom: 4, textAlign: 'center' }}>Set {j + 1}</div>
                  <input
                    type="text" value={v} placeholder="reps"
                    onChange={(e) => { const val = e.target.value; patch((d) => { d.exercises[i].sets[j] = val; }); }}
                    style={{ width: '100%', boxSizing: 'border-box', textAlign: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: colors.text, fontSize: 14, padding: '9px 4px' }}
                  />
                </div>
              ))}
            </div>
            <input
              type="text" value={ex.notes || ''} placeholder="Notes (optional) — e.g. focus on soft landing"
              onChange={(e) => { const v = e.target.value; patch((d) => { d.exercises[i].notes = v; }); }}
              style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: colors.textDim7, fontSize: 12.5, padding: '8px 10px' }}
            />
          </div>
        ))}

        <button
          onClick={() => patch((d) => { d.exercises.push({ id: uid('e'), name: '', sets: ['', '', ''], weight: '', notes: '' }); })}
          style={{ width: '100%', background: 'none', border: '1px dashed rgba(207,234,192,0.4)', color: colors.accent, borderRadius: 12, padding: 12, fontSize: 13.5, fontWeight: 600, marginBottom: 20 }}
        >+ Add exercise</button>
      </div>

      <div style={{ padding: '14px 20px 22px', borderTop: `1px solid ${colors.border}`, flexShrink: 0, display: 'flex', gap: 9 }}>
        {isExisting && (
          <button onClick={() => onDelete(draft.id)} disabled={busy} style={{ background: 'none', border: `1px solid ${colors.border15}`, color: colors.textDim7, borderRadius: 13, padding: '14px 16px', fontSize: 14.5, fontWeight: 600, flexShrink: 0 }}>
            Delete
          </button>
        )}
        <button
          onClick={() => {
            const cleaned = {
              ...draft,
              title: draft.title.trim(),
              description: draft.description.trim(),
              exercises: draft.exercises
                .filter((ex) => ex.name.trim())
                .map((ex) => ({ ...ex, name: ex.name.trim(), weight: (ex.weight || '').trim(), notes: (ex.notes || '').trim() })),
            };
            onSave(cleaned, isExisting);
          }}
          disabled={saveDisabled}
          style={{ flex: 1, borderRadius: 13, padding: 14, fontSize: 15.5, fontWeight: 700, border: 'none', background: saveDisabled ? 'rgba(207,234,192,0.3)' : colors.accent, color: '#0A0A0A' }}
        >
          Save workout
        </button>
      </div>
    </div>
  );
}

const closeBtnStyle = {
  width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none',
  color: '#F4F6F2', fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};

const labelStyle = {
  fontSize: 12, color: 'rgba(244,246,242,0.5)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 7,
};

const inputStyle = {
  width: '100%', boxSizing: 'border-box', background: '#161816', border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 12, color: '#F4F6F2', fontSize: 16, padding: 13,
};
