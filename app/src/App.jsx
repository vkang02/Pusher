import React, { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from './supabaseClient.js';
import * as api from './lib/api.js';
import { isoDay } from './lib/theme.js';
import { parseWorkbookFile } from './lib/xlsxImport.js';

import SignInScreen from './screens/SignInScreen.jsx';
import SetPasswordScreen from './screens/SetPasswordScreen.jsx';
import AuthScreen from './screens/AuthScreen.jsx';
import HomeScreen from './screens/HomeScreen.jsx';
import WorkoutsScreen from './screens/WorkoutsScreen.jsx';
import HistoryScreen from './screens/HistoryScreen.jsx';
import GroupScreen from './screens/GroupScreen.jsx';
import TabBar from './components/TabBar.jsx';
import WorkoutBuilderSheet from './components/WorkoutBuilderSheet.jsx';
import LogSheet from './components/LogSheet.jsx';

export default function App() {
  const [session, setSession] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [group, setGroup] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authNotice, setAuthNotice] = useState(null);
  const [recovering, setRecovering] = useState(false);
  const [settingPassword, setSettingPassword] = useState(false);

  const userId = session?.user?.id || null;

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSessionChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!sessionChecked) return; // still checking for an existing session
    if (!userId) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const p = await api.fetchProfile(userId);
        setProfile(p);
        if (p) {
          const g = await api.fetchMyGroup(userId);
          setGroup(g);
          if (g) await loadAppData(g, userId);
        }
      } catch (err) {
        console.error(err);
        setAuthError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionChecked, userId, loadAppData]);

  const clearAuthMessages = () => { setAuthError(null); setAuthNotice(null); };

  const runAuth = async (fn) => {
    setAuthBusy(true);
    clearAuthMessages();
    try {
      await fn();
    } catch (err) {
      setAuthError(err.message || 'Something went wrong.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handlePasswordLogin = (email, password) =>
    runAuth(async () => {
      try {
        await api.signInWithPassword(email, password);
      } catch (err) {
        if (/invalid login credentials/i.test(err.message)) {
          throw new Error("Wrong email or password. If you haven't set a password yet, tap \"Forgot password\" below.");
        }
        throw err;
      }
    });

  const handleSignUp = (email, password) =>
    runAuth(async () => {
      try {
        const data = await api.signUpWithPassword(email, password);
        if (!data.session) setAuthNotice('Check your email to confirm your account, then log in.');
      } catch (err) {
        if (/already registered/i.test(err.message)) {
          throw new Error('That email already has an account. Log in, or tap "Forgot password" to set a password.');
        }
        throw err;
      }
    });

  const handleForgotPassword = (email) =>
    runAuth(async () => {
      await api.sendPasswordReset(email);
      setAuthNotice('If that email has an account, a reset link is on its way. Open it on this device.');
    });

  const handleSetPassword = (password) =>
    runAuth(async () => {
      await api.updatePassword(password);
      setRecovering(false);
      setSettingPassword(false);
    });

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
  };

  const refresh = () => loadAppData(group, userId);

  const scrollRef = useRef(null);
  const refreshRef = useRef(null);
  refreshRef.current = () => (group ? loadAppData(group, userId).catch(console.error) : undefined);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [tab]);

  useEffect(() => {
    if (!group?.id || !userId) return undefined;
    let timer;
    const scheduleRefresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => refreshRef.current?.(), 400);
    };

    const channel = supabase.channel(`group-${group.id}`);
    for (const table of ['workouts', 'logs', 'log_reactions', 'log_comments', 'log_photos', 'group_members']) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `group_id=eq.${group.id}` }, scheduleRefresh);
    }
    channel.subscribe();

    // Phones suspend background tabs and drop the socket, so catch up on return.
    const onVisible = () => { if (document.visibilityState === 'visible') scheduleRefresh(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      supabase.removeChannel(channel);
    };
  }, [group?.id, userId]);

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
      if (entry.isShared) {
        // Shared fields sync cell-by-cell while editing; saving only needs the notes.
        await api.saveLogNotes(logSheetCtx.existingLog.id, entry.notes);
      } else {
        const saved = await api.saveLog(group.id, userId, logSheetCtx.dateKey, entry);
        if (entry.startSharing) await api.startSharingLog(saved.id);
      }
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

  const handleJoinShared = async (log) => {
    const row = await api.joinSharedLog(log.shared_session_id);
    await refresh();
    openExistingLog(row);
  };

  const handleStopSharing = async (logId) => {
    await api.stopSharingLog(logId);
    setLogSheetCtx(null);
    await refresh();
  };

  const handleRename = async (name) => {
    await api.updateName(userId, name);
    setProfile((p) => ({ ...p, name }));
    await refresh();
  };

  const handleUploadAvatar = async (file) => {
    await api.uploadAvatar(userId, file);
    await loadAvatars(members);
  };

  if (!sessionChecked || loading) {
    return <div style={{ minHeight: '100vh', background: '#0A0A0A' }} />;
  }

  if (!session) {
    return (
      <div style={{ background: '#0A0A0A', color: '#F4F6F2', fontFamily: '-apple-system, system-ui, sans-serif', minHeight: '100vh' }}>
        <SignInScreen
          onSignIn={handlePasswordLogin}
          onSignUp={handleSignUp}
          onForgot={handleForgotPassword}
          onClearMessages={clearAuthMessages}
          error={authError}
          notice={authNotice}
          busy={authBusy}
        />
      </div>
    );
  }

  if (recovering || settingPassword) {
    return (
      <div style={{ background: '#0A0A0A', color: '#F4F6F2', fontFamily: '-apple-system, system-ui, sans-serif', minHeight: '100vh' }}>
        <SetPasswordScreen
          heading={recovering ? 'Set a new password' : 'Set a password'}
          blurb="Use this with your email to log in on any device, and you'll stay logged in until you sign out."
          onSubmit={handleSetPassword}
          onCancel={recovering ? null : () => { setSettingPassword(false); clearAuthMessages(); }}
          error={authError}
          busy={authBusy}
        />
      </div>
    );
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
    isShared: !!l.shared_session_id,
    canJoin: !!l.shared_session_id && l.user_id !== userId && !logs.some((m) => m.shared_session_id === l.shared_session_id),
    photos: logPhotos.filter((p) => p.log_id === l.id),
    reactions: logReactions.filter((r) => r.log_id === l.id),
    comments: logComments
      .filter((c) => c.log_id === l.id)
      .map((c) => ({ ...c, memberName: nameFor(c.user_id) })),
  }));

  return (
    <div className="app-shell" style={{ background: '#0A0A0A', color: '#F4F6F2', fontFamily: '-apple-system, system-ui, sans-serif', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain' }}>
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
            onJoinShared={handleJoinShared}
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
            onSetPassword={() => { clearAuthMessages(); setSettingPassword(true); }}
            onUploadAvatar={handleUploadAvatar}
            onRename={handleRename}
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
          liveLog={logSheetCtx.existingLog ? logs.find((l) => l.id === logSheetCtx.existingLog.id) || null : null}
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
          onSyncCell={api.setSharedCell}
          onSyncWeight={api.setSharedWeight}
          onSyncDuration={api.setSharedDuration}
          onStopSharing={handleStopSharing}
        />
      )}
    </div>
  );
}
