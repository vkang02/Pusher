-- Iron Circle MVP — Supabase schema
-- Run this once in the Supabase SQL Editor (Project → SQL Editor → New query → paste → Run).
-- Also enable: Authentication → Providers → Anonymous Sign-Ins.
-- Safe to re-run: tables/functions use IF NOT EXISTS / OR REPLACE, policies are dropped and recreated.

create extension if not exists pgcrypto;

-- ── Tables ──────────────────────────────────────────────────────────

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  avatar_path text,
  created_at timestamptz not null default now()
);

alter table profiles add column if not exists avatar_path text;

create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists group_members (
  group_id uuid not null references groups(id) on delete cascade,
  -- References profiles(id) (which itself cascades from auth.users), not
  -- auth.users directly — PostgREST can only embed `profiles(name)` in a
  -- `group_members` select if a real foreign key points at profiles.
  user_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- Retarget the FK for a group_members table created by an earlier version of
-- this schema (referencing auth.users directly) so PostgREST can resolve it.
do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'group_members_user_id_fkey' and table_name = 'group_members'
  ) then
    alter table group_members drop constraint group_members_user_id_fkey;
  end if;
end $$;

alter table group_members
  add constraint group_members_user_id_fkey
  foreign key (user_id) references profiles(id) on delete cascade;

create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  title text not null,
  description text not null default '',
  exercises jsonb not null default '[]', -- [{ id, name, sets: ["10","8","6"] }]
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists logs (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  workout_id uuid references workouts(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  title text not null,
  description text not null default '',
  exercises jsonb not null default '[]', -- snapshot at time of logging
  duration_minutes integer,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

alter table logs add column if not exists duration_minutes integer;
alter table logs add column if not exists notes text not null default '';

-- ── Row Level Security ──────────────────────────────────────────────

alter table profiles enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table workouts enable row level security;
alter table logs enable row level security;

-- Membership check as a SECURITY DEFINER function: policies on group_members
-- can't safely query group_members from within their own USING clause —
-- Postgres detects that as unbounded recursion ("infinite recursion detected
-- in policy for relation group_members") and rejects the query outright.
-- Routing the check through a definer function runs it with the function
-- owner's privileges (RLS doesn't re-apply to the table owner), so it reads
-- group_members directly instead of recursing through the policy again.
create or replace function is_group_member(p_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from group_members
    where group_id = p_group_id and user_id = auth.uid()
  );
$$;

grant execute on function is_group_member(uuid) to authenticated;

-- Used to gate access to another member's avatar: true if the caller shares
-- any group with p_user_id. Same recursion hazard as is_group_member (this
-- also scans group_members from a policy that could live on group_members-
-- adjacent tables), so it's a SECURITY DEFINER function too.
create or replace function shares_group_with(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from group_members me
    join group_members them on them.group_id = me.group_id
    where me.user_id = auth.uid() and them.user_id = p_user_id
  );
$$;

grant execute on function shares_group_with(uuid) to authenticated;

-- profiles: visible to yourself and anyone who shares a group with you
drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles for select
  using (id = auth.uid() or shares_group_with(id));

drop policy if exists "profiles_upsert" on profiles;
create policy "profiles_upsert" on profiles for insert
  with check (id = auth.uid());

drop policy if exists "profiles_update" on profiles;
create policy "profiles_update" on profiles for update
  using (id = auth.uid());

-- groups: visible only to members. Creation/joining goes through RPCs below.
drop policy if exists "groups_select" on groups;
create policy "groups_select" on groups for select
  using (is_group_member(groups.id));

-- group_members: you can see the rows for any group you belong to
drop policy if exists "group_members_select" on group_members;
create policy "group_members_select" on group_members for select
  using (
    user_id = auth.uid()
    or is_group_member(group_id)
  );

-- workouts: any member of the group can read/write the shared workout library
drop policy if exists "workouts_select" on workouts;
create policy "workouts_select" on workouts for select
  using (is_group_member(group_id));

drop policy if exists "workouts_insert" on workouts;
create policy "workouts_insert" on workouts for insert
  with check (is_group_member(group_id));

drop policy if exists "workouts_update" on workouts;
create policy "workouts_update" on workouts for update
  using (is_group_member(group_id));

drop policy if exists "workouts_delete" on workouts;
create policy "workouts_delete" on workouts for delete
  using (is_group_member(group_id));

-- logs: everyone in the group can see who logged what; only the author can write their own
drop policy if exists "logs_select" on logs;
create policy "logs_select" on logs for select
  using (is_group_member(group_id));

drop policy if exists "logs_insert" on logs;
create policy "logs_insert" on logs for insert
  with check (
    user_id = auth.uid()
    and is_group_member(group_id)
  );

drop policy if exists "logs_update" on logs;
create policy "logs_update" on logs for update
  using (user_id = auth.uid());

drop policy if exists "logs_delete" on logs;
create policy "logs_delete" on logs for delete
  using (user_id = auth.uid());

-- ── Social: photos, reactions, comments on a log ─────────────────────

create table if not exists log_photos (
  id uuid primary key default gen_random_uuid(),
  log_id uuid not null references logs(id) on delete cascade,
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists log_reactions (
  id uuid primary key default gen_random_uuid(),
  log_id uuid not null references logs(id) on delete cascade,
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (log_id, user_id, emoji)
);

create table if not exists log_comments (
  id uuid primary key default gen_random_uuid(),
  log_id uuid not null references logs(id) on delete cascade,
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

alter table log_photos enable row level security;
alter table log_reactions enable row level security;
alter table log_comments enable row level security;

-- Anyone in the group can see photos/reactions/comments on the group's logs;
-- only the author can add their own, and only they can remove it.
drop policy if exists "log_photos_select" on log_photos;
create policy "log_photos_select" on log_photos for select
  using (is_group_member(group_id));

drop policy if exists "log_photos_insert" on log_photos;
create policy "log_photos_insert" on log_photos for insert
  with check (user_id = auth.uid() and is_group_member(group_id));

drop policy if exists "log_photos_delete" on log_photos;
create policy "log_photos_delete" on log_photos for delete
  using (user_id = auth.uid());

drop policy if exists "log_reactions_select" on log_reactions;
create policy "log_reactions_select" on log_reactions for select
  using (is_group_member(group_id));

drop policy if exists "log_reactions_insert" on log_reactions;
create policy "log_reactions_insert" on log_reactions for insert
  with check (user_id = auth.uid() and is_group_member(group_id));

drop policy if exists "log_reactions_delete" on log_reactions;
create policy "log_reactions_delete" on log_reactions for delete
  using (user_id = auth.uid());

drop policy if exists "log_comments_select" on log_comments;
create policy "log_comments_select" on log_comments for select
  using (is_group_member(group_id));

drop policy if exists "log_comments_insert" on log_comments;
create policy "log_comments_insert" on log_comments for insert
  with check (user_id = auth.uid() and is_group_member(group_id));

drop policy if exists "log_comments_delete" on log_comments;
create policy "log_comments_delete" on log_comments for delete
  using (user_id = auth.uid());

-- Storage bucket for log photos. Private (not public) — access goes through
-- the RLS policies below instead, scoped the same way as everything else:
-- membership in the group encoded as the first path segment
-- (`{group_id}/{log_id}/{filename}`), checked with the same is_group_member
-- helper used throughout this file.
insert into storage.buckets (id, name, public)
values ('log-photos', 'log-photos', false)
on conflict (id) do nothing;

drop policy if exists "log_photos_storage_select" on storage.objects;
create policy "log_photos_storage_select" on storage.objects for select
  using (
    bucket_id = 'log-photos'
    and public.is_group_member((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "log_photos_storage_insert" on storage.objects;
create policy "log_photos_storage_insert" on storage.objects for insert
  with check (
    bucket_id = 'log-photos'
    and owner = auth.uid()
    and public.is_group_member((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "log_photos_storage_delete" on storage.objects;
create policy "log_photos_storage_delete" on storage.objects for delete
  using (bucket_id = 'log-photos' and owner = auth.uid());

-- Storage bucket for profile pictures. Same shape as log-photos: private,
-- path is `{user_id}/{filename}`, so the first path segment names whose
-- avatar it is. Visible to yourself and anyone who shares a group with you
-- (matching the profiles table's own visibility rule); only you can write it.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

drop policy if exists "avatars_storage_select" on storage.objects;
create policy "avatars_storage_select" on storage.objects for select
  using (
    bucket_id = 'avatars'
    and (
      owner = auth.uid()
      or public.shares_group_with((storage.foldername(name))[1]::uuid)
    )
  );

drop policy if exists "avatars_storage_insert" on storage.objects;
create policy "avatars_storage_insert" on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and owner = auth.uid()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_storage_delete" on storage.objects;
create policy "avatars_storage_delete" on storage.objects for delete
  using (bucket_id = 'avatars' and owner = auth.uid());

-- ── RPCs (SECURITY DEFINER so membership can't be spoofed) ──────────

create or replace function create_group(p_name text)
returns groups
language plpgsql
security definer set search_path = public
as $$
declare
  v_code text;
  v_group groups;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'group name required';
  end if;

  loop
    v_code := upper(substr(regexp_replace(p_name, '[^A-Za-z]', '', 'g') || 'GRP', 1, 4))
              || lpad(floor(random() * 90 + 10)::int::text, 2, '0');
    exit when not exists (select 1 from groups where code = v_code);
  end loop;

  insert into groups (name, code, created_by) values (trim(p_name), v_code, auth.uid())
  returning * into v_group;

  insert into group_members (group_id, user_id) values (v_group.id, auth.uid())
  on conflict do nothing;

  insert into workouts (group_id, title, description, exercises, created_by) values
    (v_group.id, 'Push Day', 'Chest, shoulders and triceps. Roughly 45 minutes.',
      '[{"id":"e1","name":"Bench Press","sets":["10","8","6"]},
        {"id":"e2","name":"Overhead Press","sets":["10","10","8"]},
        {"id":"e3","name":"Tricep Dips","sets":["12","12","10"]}]'::jsonb, auth.uid()),
    (v_group.id, 'Pull Day', 'Back and biceps, heavy rows first.',
      '[{"id":"e4","name":"Pull-Ups","sets":["8","8","6"]},
        {"id":"e5","name":"Barbell Row","sets":["10","10","8"]},
        {"id":"e6","name":"Bicep Curls","sets":["12","12","12"]}]'::jsonb, auth.uid()),
    (v_group.id, 'Leg Day', 'Squat focus with accessory work.',
      '[{"id":"e7","name":"Back Squat","sets":["8","6","5"]},
        {"id":"e8","name":"Romanian Deadlift","sets":["10","10","8"]},
        {"id":"e9","name":"Walking Lunges","sets":["12","12"]}]'::jsonb, auth.uid());

  return v_group;
end;
$$;

create or replace function join_group(p_code text)
returns groups
language plpgsql
security definer set search_path = public
as $$
declare
  v_group groups;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into v_group from groups where code = upper(trim(p_code));
  if not found then
    raise exception 'no group with that invite code';
  end if;

  insert into group_members (group_id, user_id) values (v_group.id, auth.uid())
  on conflict do nothing;

  return v_group;
end;
$$;

grant execute on function create_group(text) to authenticated;
grant execute on function join_group(text) to authenticated;

-- ── Realtime ────────────────────────────────────────────────────────


do $$
declare t text;
begin
  foreach t in array array['workouts','logs','log_reactions','log_comments','log_photos','group_members']
  loop
    execute format('alter table public.%I replica identity full', t);
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ── Shared logs ─────────────────────────────────────────────────────

-- Edits are applied one cell at a time, atomically, to every row in the
-- session, so two people typing in different boxes never overwrite each other.

alter table logs add column if not exists shared_session_id uuid;
create index if not exists logs_shared_session_idx on logs (shared_session_id)
  where shared_session_id is not null;

create or replace function set_log_cell(p_log_id uuid, p_exercise_id text, p_set_index int, p_value text)
returns void language plpgsql security definer set search_path = public as $$
declare v_session uuid; v_group uuid;
begin
  select shared_session_id, group_id into v_session, v_group
  from logs where id = p_log_id and user_id = auth.uid();
  if not found then raise exception 'not your log'; end if;

  perform 1 from logs
  where id = p_log_id or (v_session is not null and shared_session_id = v_session and group_id = v_group)
  order by id for update;

  update logs l set
    exercises = (
      select jsonb_agg(
        case when e.ex->>'id' = p_exercise_id
             then jsonb_set(e.ex, array['sets', p_set_index::text], to_jsonb(p_value))
             else e.ex end
        order by e.ord)
      from jsonb_array_elements(l.exercises) with ordinality as e(ex, ord)),
    updated_at = now()
  where l.id = p_log_id
     or (v_session is not null and l.shared_session_id = v_session and l.group_id = v_group);
end $$;

create or replace function set_log_weight(p_log_id uuid, p_exercise_id text, p_value text)
returns void language plpgsql security definer set search_path = public as $$
declare v_session uuid; v_group uuid;
begin
  select shared_session_id, group_id into v_session, v_group
  from logs where id = p_log_id and user_id = auth.uid();
  if not found then raise exception 'not your log'; end if;

  perform 1 from logs
  where id = p_log_id or (v_session is not null and shared_session_id = v_session and group_id = v_group)
  order by id for update;

  update logs l set
    exercises = (
      select jsonb_agg(
        case when e.ex->>'id' = p_exercise_id
             then jsonb_set(e.ex, '{weight}', to_jsonb(p_value))
             else e.ex end
        order by e.ord)
      from jsonb_array_elements(l.exercises) with ordinality as e(ex, ord)),
    updated_at = now()
  where l.id = p_log_id
     or (v_session is not null and l.shared_session_id = v_session and l.group_id = v_group);
end $$;

create or replace function set_log_duration(p_log_id uuid, p_minutes int)
returns void language plpgsql security definer set search_path = public as $$
declare v_session uuid; v_group uuid;
begin
  select shared_session_id, group_id into v_session, v_group
  from logs where id = p_log_id and user_id = auth.uid();
  if not found then raise exception 'not your log'; end if;

  update logs l set duration_minutes = p_minutes, updated_at = now()
  where l.id = p_log_id
     or (v_session is not null and l.shared_session_id = v_session and l.group_id = v_group);
end $$;

-- Join someone's shared log: creates (or updates) your own log for that day
-- with the same workout, sets, weights and duration. Your notes/photos stay yours.
create or replace function join_shared_log(p_session uuid)
returns logs language plpgsql security definer set search_path = public as $$
declare v_src logs; v_row logs;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  select * into v_src from logs where shared_session_id = p_session
  order by updated_at desc limit 1;
  if not found then raise exception 'shared log not found'; end if;
  if not is_group_member(v_src.group_id) then raise exception 'not in this group'; end if;

  insert into logs (group_id, workout_id, user_id, log_date, title, description, exercises, duration_minutes, shared_session_id)
  values (v_src.group_id, v_src.workout_id, auth.uid(), v_src.log_date, v_src.title, v_src.description,
          v_src.exercises, v_src.duration_minutes, p_session)
  on conflict (user_id, log_date) do update set
    workout_id = excluded.workout_id, title = excluded.title, description = excluded.description,
    exercises = excluded.exercises, duration_minutes = excluded.duration_minutes,
    shared_session_id = excluded.shared_session_id, updated_at = now()
  returning * into v_row;
  return v_row;
end $$;

grant execute on function set_log_cell(uuid, text, int, text) to authenticated;
grant execute on function set_log_weight(uuid, text, text) to authenticated;
grant execute on function set_log_duration(uuid, int) to authenticated;
grant execute on function join_shared_log(uuid) to authenticated;
