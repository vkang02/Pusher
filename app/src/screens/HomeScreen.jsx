import React from 'react';
import { colors, summaryOf } from '../lib/theme.js';
import ActivityCard from '../components/ActivityCard.jsx';

export default function HomeScreen({
  userName, group, totalLogs, todayEntry, recentLogs, myUserId,
  onOpenLog, onGoWorkouts, onToggleReaction, onAddComment, onDeleteComment,
}) {
  return (
    <div style={{ padding: '58px 20px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 22 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, color: colors.textDim55, marginBottom: 3 }}>Hey {userName}</div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.3px' }}>{group?.name}</div>
          <div style={{ fontSize: 12.5, color: colors.textDim45, marginTop: 3 }}>Invite code {group?.code}</div>
        </div>
        <div style={{ background: colors.accentSoft12, border: `1px solid ${colors.accentSoft3}`, borderRadius: 18, padding: '7px 13px', flexShrink: 0 }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: colors.accent }}>{totalLogs} logged</span>
        </div>
      </div>

      <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 18, padding: 17, marginBottom: 22 }}>
        <div style={{ fontSize: 12, color: colors.textDim5, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 9 }}>Today</div>
        {todayEntry ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="15" height="15" viewBox="0 0 24 24"><path d="M4 12l5 5L20 6" stroke="#0A0A0A" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 16.5, fontWeight: 700 }}>{todayEntry.title}</div>
              <div style={{ fontSize: 13, color: colors.textDim55 }}>{summaryOf(todayEntry)}</div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 14.5, color: colors.textDim65, lineHeight: 1.45, marginBottom: 13 }}>Nothing logged yet today.</div>
            <button onClick={onGoWorkouts} style={{ width: '100%', background: colors.accent, color: '#0A0A0A', border: 'none', borderRadius: 13, padding: 13, fontSize: 15.5, fontWeight: 700 }}>
              Log a Workout
            </button>
          </>
        )}
      </div>

      <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 11 }}>Group activity</div>
      {recentLogs.length > 0 ? (
        recentLogs.map((lg) => (
          <ActivityCard
            key={lg.id}
            log={lg}
            photos={lg.photos}
            reactions={lg.reactions}
            comments={lg.comments}
            myUserId={myUserId}
            onOpenLog={onOpenLog}
            onToggleReaction={onToggleReaction}
            onAddComment={onAddComment}
            onDeleteComment={onDeleteComment}
          />
        ))
      ) : (
        <div style={{ fontSize: 14, color: colors.textDim45, lineHeight: 1.5 }}>Logged workouts from you and your group will show up here.</div>
      )}
    </div>
  );
}
