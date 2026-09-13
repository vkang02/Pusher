import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient.js';
import * as api from './lib/api.js';
import { isoDay } from './lib/theme.js';
import { parseWorkbookFile } from './lib/xlsxImport.js';

import AuthScreen from './screens/AuthScreen.jsx';
import HomeScreen from './screens/HomeScreen.jsx';
import WorkoutsScreen from './screens/WorkoutsScreen.jsx';
import HistoryScreen from './screens/HistoryScreen.jsx';
import GroupScreen from './screens/GroupScreen.jsx';
import TabBar from './components/TabBar.jsx';
import WorkoutBuilderSheet from './components/WorkoutBuilderSheet.jsx';
import LogSheet from './components/LogSheet.jsx';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [group, setGroup] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [authBusy, setAuthBusy] = useState(false);

  const [tab, setTab] = useState('home');
  const [workouts, setWorkouts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [groupLogs, setGroupLogs] = useState([]);
  const [logPhotos, setLogPhotos] = useState([]);
  const [logReactions, setLogReactions] = useState([]);
  const [logComments, setLogComments] = useState([]);
  const [members, setMembers] = useState([]);
  const [avatarByUser, setAvatarByUser] = useState({});
  const [importMessage, setImportMessage] = useState(null);

  const [builderWorkout, setBuilderWorkout] = useState(undefined); // undefined = closed, null = new, object = editing
  const [logSheetCtx, setLogSheetCtx] = useState(null); // { workout, existingLog, prevLog, dateKey, isNew }
  const [busy, setBusy] = useState(false);

  const todayKey = isoDay(new Date());

  const loadSocialData = useCallback(async (logsList) => {
    const ids = logsList.map((l) => l.id);
    const [photos, reactions, comments] = await Promise.all([
      api.fetchPhotosForLogs(ids),
      api.fetchReactionsForLogs(ids),
      api.fetchCommentsForLogs(ids),
    ]);
    setLogPhotos(photos);
    setLogReactions(reactions);
    setLogComments(comments);
  }, []);

  const loadAvatars = useCallback(async (memberList) => {
    const map = await api.fetchAvatarUrls(memberList.map((m) => m.userId));
    setAvatarByUser(map);
  }, []);

  const loadAppData = useCallback(async (g, uid) => {
    const [w, l, m, gl] = await Promise.all([
      api.fetchWorkouts(g.id),
      api.fetchMyLogs(g.id, uid),
      api.fetchGroupMembers(g.id),
      api.fetchGroupLogs(g.id),
    ]);
    setWorkouts(w);
    setLogs(l);
    setMembers(m);
    setGroupLogs(gl);
    await Promise.all([loadSocialData(gl), loadAvatars(m)]);
  }, [loadSocialData, loadAvatars]);

  useEffect(() => {
    (async () => {
      try {
        const session = await api.ensureSession();
        const uid = session.user.id;
        setUserId(uid);
        const p = await api.fetchProfile(uid);
        setProfile(p);
        if (p) {
          const g = await api.fetchMyGroup(uid);
          setGroup(g);
          if (g) await loadAppData(g, uid);
        }
      } catch (err) {
        console.error(err);
        setAuthError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadAppData]);

  const handleSignIn = async ({ name, group: groupInput, mode }) => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      await api.upsertProfile(userId, name);
      setProfile({ id: userId, name });
      const g = mode === 'create' ? await api.createGroup(groupInput) : await api.joinGroup(groupInput);
      setGroup(g);
      await loadAppData(g, userId);
      setTab('home');
    } catch (err) {
      setAuthError(err.message || 'Something went wrong.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserId(null);
    setProfile(null);
    setGroup(null);
    setWorkouts([]);
    setLogs([]);
    setGroupLogs([]);
    setLogPhotos([]);
    setLogReactions([]);
    setLogComments([]);
    setMembers([]);
    setAvatarByUser({});
    setTab('home');
    setLoading(true);
    try {
      const session = await api.ensureSession();
      setUserId(session.user.id);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => loadAppData(group, userId);

  const handleSaveWorkout = async (cleaned, isExisting) => {
    setBusy(true);
    try {
      await api.saveWorkout(group.id, userId, { ...cleaned, __existing: isExisting });
      setBuilderWorkout(undefined);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteWorkout = async (id) => {
    setBusy(true);
    try {
      await api.deleteWorkout(id);
      setBuilderWorkout(undefined);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const imported = await parseWorkbookFile(file);
      if (!imported.length) {
        setImportMessage('No exercises found. Each sheet needs a header row with a Name column (Sets and Reps optional).');
      } else {
        await api.insertWorkouts(group.id, userId, imported);
        setImportMessage(`Imported ${imported.length} workout${imported.length === 1 ? '' : 's'} from ${file.name}.`);
        await refresh();
      }
    } catch (err) {
      setImportMessage('Could not read that file. Try a .xlsx or .csv with a header row.');
    } finally {
      e.target.value = '';
    }
  };

  const lastLogForWorkout = (workoutId, excludeDate) =>
    logs.find((l) => l.workout_id === workoutId && l.log_date !== excludeDate) || null;

  const openLogToday = (workout) => {
    setLogSheetCtx({
      workout,
      existingLog: null,
      prevLog: lastLogForWorkout(workout.id, todayKey),
      dateKey: todayKey,
      isNew: true,
      photos: [],
    });
  };

  const openExistingLog = (logEntry) => {
    const isMine = logEntry.user_id === userId;
    const owner = members.find((m) => m.userId === logEntry.user_id);
    setLogSheetCtx({
      workout: { id: logEntry.workout_id, title: logEntry.title, description: logEntry.description, exercises: logEntry.exercises },
      existingLog: logEntry,
      prevLog: null,
      dateKey: logEntry.log_date,
      isNew: false,
      readOnly: !isMine,
      ownerName: isMine ? null : (owner?.name || 'Member'),
      photos: logPhotos.filter((p) => p.log_id === logEntry.id),
    });
  };

  const handleSaveLog = async (entry) => {
    setBusy(true);
    try {
      await api.saveLog(group.id, userId, logSheetCtx.dateKey, entry);
      setLogSheetCtx(null);
      await refresh();
      setTab('home');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteLog = async () => {
    setBusy(true);
    try {
      await api.removeLog(userId, logSheetCtx.dateKey);
      setLogSheetCtx(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleEnsureLogSaved = async (entry) => {
    const saved = await api.saveLog(group.id, userId, logSheetCtx.dateKey, entry);
    refresh();
    return saved;
  };

  const handleUploadPhoto = (logId, file) => api.uploadLogPhoto(group.id, logId, userId, file);

  const handleDeletePhoto = async (photo) => {
    await api.deleteLogPhoto(photo);
    refresh();
  };

  const handleToggleReaction = async (logId, emoji) => {
    const mine = logReactions.some((r) => r.log_id === logId && r.user_id === userId && r.emoji === emoji);
    await api.setReaction(group.id, logId, userId, emoji, !mine);
    await loadSocialData(groupLogs);
  };

  const handleAddComment = async (logId, body) => {
    if (!body.trim()) return;
    await api.addComment(group.id, logId, userId, body.trim());
    await loadSocialData(groupLogs);
  };

  const handleDeleteComment = async (commentId) => {
    await api.deleteComment(commentId);
    await loadSocialData(groupLogs);
  };

  const handleUploadAvatar = async (file) => {
    await api.uploadAvatar(userId, file);
    await loadAvatars(members);
  };

  if (loading) {
    return <div style={{ minHeight: '100vh', background: '#0A0A0A' }} />;
  }

  if (!profile || !group) {
    return (
      <div style={{ background: '#0A0A0A', color: '#F4F6F2', fontFamily: '-apple-system, system-ui, sans-serif', minHeight: '100vh' }}>
        <AuthScreen onSignIn={handleSignIn} error={authError} busy={authBusy} />
      </div>
    );
  }

  const logsByWorkout = {};
  for (const l of logs) {
    if (!l.workout_id) continue;
    (logsByWorkout[l.workout_id] = logsByWorkout[l.workout_id] || []).push(l);
  }

  const todayEntry = logs.find((l) => l.log_date === todayKey) || null;

  const nameByUser = {};
  for (const m of members) nameByUser[m.userId] = m.name;
  const nameFor = (uid) => (uid === userId ? 'You' : (nameByUser[uid] || 'Member'));

  const recentActivity = groupLogs.slice(0, 8).map((l) => ({
    ...l,
    isMine: l.user_id === userId,
    memberName: nameFor(l.user_id),
    avatarUrl: avatarByUser[l.user_id] || null,
    photos: logPhotos.filter((p) => p.log_id === l.id),
    reactions: logReactions.filter((r) => r.log_id === l.id),
    comments: logComments
      .filter((c) => c.log_id === l.id)
      .map((c) => ({ ...c, memberName: nameFor(c.user_id) })),
  }));

  return (
    <div style={{ background: '#0A0A0A', color: '#F4F6F2', fontFamily: '-apple-system, system-ui, sans-serif', minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'home' && (
          <HomeScreen
            userName={profile.name}
            group={group}
            totalLogs={logs.length}
            todayEntry={todayEntry}
            recentLogs={recentActivity}
            myUserId={userId}
            onOpenLog={openExistingLog}
            onGoWorkouts={() => setTab('workouts')}
            onToggleReaction={handleToggleReaction}
            onAddComment={handleAddComment}
            onDeleteComment={handleDeleteComment}
          />
        )}
        {tab === 'workouts' && (
          <WorkoutsScreen
            workouts={workouts}
            logsByWorkout={logsByWorkout}
            onOpenBuilder={(w) => setBuilderWorkout(w)}
            onNewWorkout={() => setBuilderWorkout(null)}
            onImportFile={handleImportFile}
            importMessage={importMessage}
            onLogToday={openLogToday}
            onOpenLog={openExistingLog}
          />
        )}
        {tab === 'history' && <HistoryScreen logs={logs} onOpenLog={openExistingLog} />}
        {tab === 'group' && (
          <GroupScreen
            group={group}
            members={members}
            myUserId={userId}
            todayKey={todayKey}
            avatarByUser={avatarByUser}
            onSignOut={handleSignOut}
            onUploadAvatar={handleUploadAvatar}
          />
        )}
      </div>

      <TabBar tab={tab} onChange={setTab} />

      {builderWorkout !== undefined && (
        <WorkoutBuilderSheet
          workout={builderWorkout}
          busy={busy}
          onClose={() => setBuilderWorkout(undefined)}
          onSave={handleSaveWorkout}
          onDelete={handleDeleteWorkout}
        />
      )}

      {logSheetCtx && (
        <LogSheet
          workout={logSheetCtx.workout}
          existingLog={logSheetCtx.existingLog}
          prevLog={logSheetCtx.prevLog}
          dateKey={logSheetCtx.dateKey}
          isNew={logSheetCtx.isNew}
          readOnly={logSheetCtx.readOnly}
          ownerName={logSheetCtx.ownerName}
          photos={logSheetCtx.photos}
          busy={busy}
          onClose={() => { setLogSheetCtx(null); refresh(); }}
          onSave={handleSaveLog}
          onDelete={handleDeleteLog}
          onEnsureSaved={handleEnsureLogSaved}
          onUploadPhoto={handleUploadPhoto}
          onDeletePhoto={handleDeletePhoto}
        />
      )}
    </div>
  );
}
