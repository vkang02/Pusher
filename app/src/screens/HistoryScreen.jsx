import React from 'react';
import { colors, isoDay, summaryOf, dayShort, shortDate } from '../lib/theme.js';

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function HistoryScreen({ logs, onOpenLog }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayDate = now.getDate();
  const logsByDate = new Map(logs.map((l) => [l.log_date, l]));

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push({ key: 'b' + i, blank: true });
  for (let day = 1; day <= daysInMonth; day++) {
    const key = isoDay(new Date(year, month, day));
    const entry = logsByDate.get(key);
    const isToday = day === todayDate;
    cells.push({ key: 'd' + day, day, entry, isToday });
  }

  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div style={{ padding: '58px 20px 20px' }}>
      <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 3 }}>History</div>
      <div style={{ fontSize: 13.5, color: colors.textDim55, marginBottom: 18 }}>{monthLabel} · {logs.length} workouts logged</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5, marginBottom: 7 }}>
        {DOW.map((letter, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 11.5, color: 'rgba(244,246,242,0.4)' }}>{letter}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5, marginBottom: 22 }}>
        {cells.map((c) => {
          if (c.blank) return <div key={c.key} style={{ height: 38 }} />;
          const done = !!c.entry;
          return (
            <div
              key={c.key}
              onClick={() => done && onOpenLog(c.entry)}
              style={{
                height: 38, borderRadius: 10,
                background: done ? colors.accent : 'transparent',
                border: c.isToday ? `1px solid ${colors.accent}` : '1px solid transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13.5, fontWeight: c.isToday ? 700 : 500,
                color: done ? '#0A0A0A' : (c.isToday ? colors.accent : colors.text),
                cursor: done ? 'pointer' : 'default',
              }}
            >
              {c.day}
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 11 }}>All entries</div>
      {logs.map((lg) => (
        <div key={lg.log_date} onClick={() => onOpenLog(lg)} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 0', borderBottom: `1px solid ${colors.border}`, cursor: 'pointer' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: colors.accentSoft14, color: colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
            {dayShort(lg.log_date)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15.5, fontWeight: 600 }}>{lg.title}</div>
            <div style={{ fontSize: 12.5, color: colors.textDim5 }}>{shortDate(lg.log_date)} · {summaryOf(lg)}</div>
            {lg.notes && (
              <div style={{ fontSize: 12.5, color: colors.textDim65, fontStyle: 'italic', marginTop: 3 }}>"{lg.notes}"</div>
            )}
          </div>
          <span style={{ fontSize: 18, color: colors.textDim3, flexShrink: 0 }}>›</span>
        </div>
      ))}
      {logs.length === 0 && (
        <div style={{ fontSize: 14, color: colors.textDim45, lineHeight: 1.5 }}>Nothing logged yet.</div>
      )}
    </div>
  );
}
