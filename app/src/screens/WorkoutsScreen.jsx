import React, { useRef } from 'react';
import { colors } from '../lib/theme.js';

export default function WorkoutsScreen({ workouts, logsByWorkout, onOpenBuilder, onNewWorkout, onImportFile, importMessage, onLogToday, onOpenLog }) {
  const fileRef = useRef(null);

  return (
    <div style={{ padding: '58px 20px 20px' }}>
      <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 3 }}>Workouts</div>
      <div style={{ fontSize: 13.5, color: colors.textDim55, marginBottom: 18 }}>Your saved routines. Tap one to log it today.</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={onNewWorkout} style={{ flex: 1, background: colors.accent, color: '#0A0A0A', border: 'none', borderRadius: 12, padding: 12, fontSize: 13.5, fontWeight: 700 }}>
          + New workout
        </button>
        <label style={{ flex: 1, textAlign: 'center', background: 'none', border: `1px solid ${colors.accentSoft3}`, color: colors.accent, borderRadius: 12, padding: 12, fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>
          Import Excel
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onImportFile} style={{ display: 'none' }} />
        </label>
      </div>

      {importMessage && (
        <div style={{ background: colors.accentSoft1, border: `1px solid ${colors.accentSoft3}`, borderRadius: 12, padding: '11px 14px', fontSize: 13, color: colors.accent, lineHeight: 1.45, marginBottom: 18 }}>
          {importMessage}
        </div>
      )}

      {workouts.map((w) => {
        const wLogs = logsByWorkout[w.id] || [];
        const setCount = (w.exercises || []).reduce((n, ex) => n + (ex.sets || []).length, 0);
        return (
          <div key={w.id} style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 18, padding: 16, marginBottom: 12 }}>
            <div onClick={() => onOpenBuilder(w)} style={{ cursor: 'pointer' }}>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 3 }}>{w.title}</div>
              <div style={{ fontSize: 13, color: colors.textDim55, lineHeight: 1.45, marginBottom: 10 }}>{w.description}</div>
              <div style={{ fontSize: 12.5, color: colors.accent, fontWeight: 600 }}>{(w.exercises || []).length} exercises · {setCount} sets</div>
            </div>

            {wLogs.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 11, borderTop: `1px solid ${colors.border}` }}>
                <div style={{ fontSize: 11.5, color: colors.textDim45, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 7 }}>
                  Logged {wLogs.length}x · last {new Date(wLogs[0].log_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                {wLogs.slice(0, 3).map((lg) => (
                  <div key={lg.log_date} onClick={() => onOpenLog(lg)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '5px 0', cursor: 'pointer' }}>
                    <span style={{ fontSize: 12.5, color: colors.textDim7 }}>{new Date(lg.log_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' }).toUpperCase()} {new Date(lg.log_date + 'T00:00:00').getDate()}</span>
                    <span style={{ fontSize: 12.5, color: colors.textDim45 }}>{(lg.exercises || []).length} exercises · {(lg.exercises || []).reduce((n, ex) => n + (ex.sets || []).length, 0)} sets</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 13 }}>
              <button onClick={() => onOpenBuilder(w)} style={{ flex: 1, background: 'none', border: `1px solid ${colors.border15}`, color: colors.text, borderRadius: 11, padding: 10, fontSize: 13, fontWeight: 600 }}>Edit</button>
              <button onClick={(e) => { e.stopPropagation(); onLogToday(w); }} style={{ flex: 1, background: colors.accent, color: '#0A0A0A', border: 'none', borderRadius: 11, padding: 10, fontSize: 13, fontWeight: 700 }}>Log today</button>
            </div>
          </div>
        );
      })}

      {workouts.length === 0 && (
        <div style={{ fontSize: 14, color: colors.textDim45, lineHeight: 1.5 }}>
          No workouts yet. Create one or import an Excel sheet — one sheet per workout, with Name / Sets / Reps columns.
        </div>
      )}
    </div>
  );
}
