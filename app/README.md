# Werk Betch — Workout MVP

React + Vite implementation of `project/Workout MVP.dc.html`, backed by a real
shared Supabase project (Postgres + anonymous auth) instead of the original
prototype's `localStorage`-only simulation — so a group's workouts and logs
actually sync across everyone's devices.

## 1. One-time Supabase setup

1. In your Supabase project dashboard, go to **Authentication → Providers**
   and enable **Anonymous Sign-Ins**. The app signs each browser in
   anonymously (no email/password) and keeps that session in the browser —
   matching the prototype's "enter your name and go" flow, but now backed by
   a real `auth.users` row per device.
2. Go to **SQL Editor → New query**, paste the contents of
   `../supabase/schema.sql`, and run it. This creates the `profiles`,
   `groups`, `group_members`, `workouts`, and `logs` tables, their Row Level
   Security policies (scoped to group membership), and the `create_group` /
   `join_group` functions used by the app.

## 2. Configure and run the app

```bash
cp .env.example .env   # then fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Open the printed local URL on your phone or desktop browser. `.env` is
gitignored — the anon key is safe to ship in a client bundle (it's meant to
be public; access is enforced by the RLS policies in `schema.sql`), but keep
the `service_role` key out of this project entirely.

## What's implemented

- **Auth/onboarding** — name + "Join a group" (by invite code) or "Create
  one." Session persists automatically via Supabase's browser storage.
- **Workouts** — shared per-group library: title, description, exercises
  with per-set reps; create, edit, delete, or import from Excel/CSV (one
  sheet per workout, `Name`/`Sets`/`Reps` columns — `Reps` can be `10,8,6`
  for varied sets per set).
- **Logging** — "Log today" prefills every set from your last logged session
  of that workout (with a "Last: 10 / 8 / 6" note per exercise), editable
  before saving.
- **History** — month calendar of your logged days plus a full entry list;
  tap any day to review or edit it.
- **Group** — invite code to share, and a real member list with each
  person's total logged workouts and last-logged status, computed from
  everyone's actual log rows (not simulated data).

## Known differences from the prototype / follow-ups

- **Identity is per-browser, not a real account.** Anonymous Supabase auth
  gives each device/browser its own persistent identity; there's no
  password or email, so "signing in" on a second device creates a *new*
  identity that can join the same group by invite code, but it won't be
  recognized as "the same person" as your first device. Add email/magic-link
  auth later if cross-device identity matters.
- Exercise videos and progress photos from the earlier full prototype are
  not part of this MVP scope (matches the chat transcript's scoped-down MVP
  request).
- The `xlsx` package has known (unpatched) advisories for prototype
  pollution/ReDoS on malicious spreadsheet input — acceptable for
  friends-only import of your own files, but don't expose this import to
  untrusted uploads without sandboxing.
