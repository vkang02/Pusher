-- Nudges: short motivational messages members send to the crew (or to one person) that pop up on
-- their screen. Run once in the Supabase SQL Editor. Safe to re-run.

create table if not exists nudges (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  -- null = the whole crew; otherwise just that one member.
  recipient_id uuid references profiles(id) on delete cascade,
  message text not null check (length(trim(message)) between 1 and 140),
  created_at timestamptz not null default now()
);
create index if not exists nudges_group_created_idx on nudges (group_id, created_at desc);

alter table nudges enable row level security;

-- You see crew-wide nudges, nudges sent to you, and ones you sent. Private nudges never reach anyone else
-- (live updates follow the same rule).
drop policy if exists "nudges_select" on nudges;
create policy "nudges_select" on nudges for select
  using (is_group_member(group_id) and (recipient_id is null or recipient_id = auth.uid() or sender_id = auth.uid()));

-- Any member can send as themselves, to the crew or to someone in the same crew.
drop policy if exists "nudges_insert" on nudges;
create policy "nudges_insert" on nudges for insert
  with check (
    sender_id = auth.uid()
    and is_group_member(group_id)
    and (recipient_id is null or exists (
      select 1 from group_members gm where gm.group_id = nudges.group_id and gm.user_id = nudges.recipient_id
    ))
  );

drop policy if exists "nudges_delete" on nudges;
create policy "nudges_delete" on nudges for delete
  using (sender_id = auth.uid());

-- A little guard against spamming the crew: at most 10 nudges a minute per person.
create or replace function nudges_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from nudges where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 10 then
    raise exception 'Slow down, you''re sending a lot of nudges.';
  end if;
  return new;
end $$;

drop trigger if exists nudges_rate_limit_trg on nudges;
create trigger nudges_rate_limit_trg before insert on nudges
  for each row execute function nudges_rate_limit();

-- Live updates so a nudge pops up the moment it's sent.
alter table nudges replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'nudges'
  ) then
    alter publication supabase_realtime add table public.nudges;
  end if;
end $$;
