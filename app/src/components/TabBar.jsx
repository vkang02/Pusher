import React from 'react';
import { colors } from '../lib/theme.js';

const TABS = [
  { key: 'home', label: 'Home', icon: (c) => <path d="M4 12L12 5l8 7M6 11v8h5v-5h2v5h5v-8" stroke={c} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /> },
  { key: 'workouts', label: 'Workouts', icon: (c) => <path d="M4 9v6M20 9v6M2 10v4M22 10v4M7 12h10" stroke={c} strokeWidth="1.8" fill="none" strokeLinecap="round" /> },
  { key: 'history', label: 'History', icon: (c) => (<><rect x="4" y="6" width="16" height="15" rx="2" stroke={c} strokeWidth="1.8" fill="none" /><path d="M4 10h16M8 4v4M16 4v4" stroke={c} strokeWidth="1.8" fill="none" strokeLinecap="round" /></>) },
  { key: 'group', label: 'Group', icon: (c) => (<><circle cx="9" cy="9" r="3" stroke={c} strokeWidth="1.8" fill="none" /><circle cx="17" cy="10" r="2.5" stroke={c} strokeWidth="1.8" fill="none" /><path d="M4 20c0-3 2.5-5 5-5s5 2 5 5M14.5 20c0-2.2 1.6-4 3.8-4s3.7 1.8 3.7 4" stroke={c} strokeWidth="1.8" fill="none" strokeLinecap="round" /></>) },
];

export default function TabBar({ tab, onChange }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      padding: '9px 8px calc(env(safe-area-inset-bottom, 0px) + 12px)', borderTop: `1px solid ${colors.border}`,
      background: colors.bg, flexShrink: 0,
    }}>
      {TABS.map((t) => {
        const active = tab === t.key;
        const c = active ? colors.accent : colors.textDim5;
        return (
          <div key={t.key} onClick={() => onChange(t.key)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', color: c }}>
            <svg width="21" height="21" viewBox="0 0 24 24">{t.icon(c)}</svg>
            <span style={{ fontSize: 10.5, fontWeight: 600 }}>{t.label}</span>
          </div>
        );
      })}
    </div>
  );
}
