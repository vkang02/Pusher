-- Share what you're listening to with your crew (Spotify).
-- Run once in the Supabase SQL Editor. Safe to re-run.
--
-- BEFORE RUNNING:
--   1. Database → Extensions: switch on  pg_cron  and  pg_net.
--   2. Pick a long random password for CRON_SECRET (e.g. 40 random letters and numbers). Use the SAME value
--      here (replace REPLACE_WITH_CRON_SECRET below) and as the CRON_SECRET variable in Vercel.

-- Spotify logins. No policies on purpose: the app's browser code can never read these, only the server can.
create table if not exists spotify_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text,
  updated_at timestamptz not null default now()
);
alter table spotify_tokens enable row level security;

-- Whether someone has connected Spotify (safe to show them): no tokens in here.
create table if not exists spotify_links (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  connected_at timestamptz not null default now()
);
alter table spotify_links enable row level security;
drop policy if exists "read own spotify link" on spotify_links;
create policy "read own spotify link" on spotify_links for select using (user_id = auth.uid());

-- What each sharing member is playing right now. Only members of the same crew can read it; only the
-- server writes it. A row exists only while someone is sharing and disappears when sharing ends.
create table if not exists now_playing (
  user_id uuid primary key references auth.users(id) on delete cascade,
  group_id uuid not null references groups(id) on delete cascade,
  track_uri text,
  title text,
  artist text,
  album_art text,
  is_playing boolean not null default false,
  progress_ms int not null default 0,
  duration_ms int,
  observed_at timestamptz not null default now(),
  started_at timestamptz not null default now(),
  sharing_until timestamptz not null,
  updated_at timestamptz not null default now()
);
alter table now_playing enable row level security;
drop policy if exists "crew reads now playing" on now_playing;
create policy "crew reads now playing" on now_playing for select using (is_group_member(group_id));

-- Live updates for the crew's screens.
alter table now_playing replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'now_playing'
  ) then
    alter publication supabase_realtime add table public.now_playing;
  end if;
end $$;

-- Every 15 seconds, while anyone is sharing, ask the app's server to check Spotify.
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$ begin perform cron.unschedule('spotify-poll'); exception when others then null; end $$;

select cron.schedule(
  'spotify-poll',
  '15 seconds',
  $job$
    select net.http_post(
      url := 'https://pusher-kappa.vercel.app/api/spotify/poll',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer REPLACE_WITH_CRON_SECRET
'),
      body := '{}'::jsonb
    )
    where exists (select 1 from public.now_playing where sharing_until > now());
  $job$
);
