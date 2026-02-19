-- ============================================================================
-- COMMUNITY REFLECTIONS FEATURE
-- ============================================================================
-- Stores user reflections for the live rotating community feed
-- Supports both real user reflections and auto-generated fake reflections
-- for simulating activity during early growth phase

-- Reflections table
create table if not exists reflections (
  id uuid primary key default gen_random_uuid(),

  -- User data (nullable for fake reflections)
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null, -- Anonymous name like "Truth Seeker 9797"

  -- Content
  input_text text not null check (char_length(input_text) <= 200), -- Original user thought (max 200 chars)
  generated_text text not null, -- AI-generated Stoic reflection

  -- Lifecycle status
  status text not null check (status in ('queued', 'live', 'completed')) default 'queued',

  -- Timing
  queued_at timestamp with time zone not null default now(),
  live_started_at timestamp with time zone,
  live_until timestamp with time zone, -- When current live session expires
  completed_at timestamp with time zone,

  -- Metadata
  is_fake boolean default false, -- True for auto-generated reflections
  viewer_count integer default 0, -- Number of active viewers

  -- Timestamps
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Indexes for efficient querying
-- Index for finding queued reflections (for rotation)
create index if not exists reflections_status_queued_idx
  on reflections (status, queued_at) where status = 'queued';

-- Index for finding live reflection (for display)
create index if not exists reflections_status_live_idx
  on reflections (status, live_started_at) where status = 'live';

-- Index for user's reflection history
create index if not exists reflections_user_created_idx
  on reflections (user_id, created_at desc) where user_id is not null;

-- Index for fake reflections (for analytics/debugging)
create index if not exists reflections_is_fake_idx
  on reflections (is_fake, created_at desc);

-- Composite index for rotation queries
create index if not exists reflections_rotation_idx
  on reflections (status, queued_at, live_until);

-- Function to update updated_at timestamp
create or replace function update_reflections_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-update updated_at
drop trigger if exists update_reflections_updated_at on reflections;

create trigger update_reflections_updated_at
  before update on reflections
  for each row execute function update_reflections_updated_at();

-- RLS policies
alter table reflections enable row level security;

-- Anyone can view reflections (public feed)
create policy "Anyone can view reflections"
  on reflections for select
  using (true);

-- Authenticated users can insert their own reflections
create policy "Users can insert own reflections"
  on reflections for insert
  with check (auth.uid() = user_id);

-- Allow inserting fake reflections (with null user_id)
create policy "Allow inserting fake reflections"
  on reflections for insert
  with check (user_id IS NULL AND is_fake = true);

-- Service role can update reflections (for rotation logic)
-- Note: This policy allows updates from the service role key used by Edge Functions
create policy "Service can update reflections"
  on reflections for update
  using (true);

-- Users can delete their own reflections
create policy "Users can delete own reflections"
  on reflections for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- ROTATION FUNCTION
-- ============================================================================
-- Function to automatically rotate reflections from queued → live → completed
-- Called by pg_cron every 30 seconds

create or replace function rotate_reflections()
returns void
language plpgsql
security definer
as $$
declare
  v_current_live_id uuid;
  v_next_queued_id uuid;
  v_expired_count int;
begin
  -- Step 1: Mark expired live reflections as completed
  update reflections
  set
    status = 'completed',
    completed_at = now()
  where status = 'live'
    and live_until < now();

  get diagnostics v_expired_count = row_count;

  if v_expired_count > 0 then
    raise notice 'Marked % expired reflection(s) as completed', v_expired_count;
  end if;

  -- Step 2: Check if there's currently a live reflection
  select id into v_current_live_id
  from reflections
  where status = 'live'
  limit 1;

  -- Step 3: If no live reflection exists, promote the next queued one
  if v_current_live_id is null then
    -- Get the oldest queued reflection
    select id into v_next_queued_id
    from reflections
    where status = 'queued'
    order by queued_at
    limit 1;

    if v_next_queued_id is not null then
      -- Promote to live (60 seconds duration)
      update reflections
      set
        status = 'live',
        live_started_at = now(),
        live_until = now() + interval '60 seconds'
      where id = v_next_queued_id;

      raise notice 'Promoted reflection % to live', v_next_queued_id;
    else
      raise notice 'No queued reflections available to promote';
    end if;
  else
    raise notice 'Current live reflection: %', v_current_live_id;
  end if;
end;
$$;

-- ============================================================================
-- CRON JOB SETUP
-- ============================================================================
-- Schedule the rotation function to run every 30 seconds
-- Note: pg_cron extension should be enabled in Supabase (Database → Extensions)

-- Enable pg_cron extension (if not already enabled)
create extension if not exists pg_cron;

-- Remove existing job if it exists (to avoid duplicates on re-run)
select cron.unschedule('rotate-reflections');

-- Schedule rotation every 30 seconds
-- Cron expression: second minute hour day month weekday
select cron.schedule(
  'rotate-reflections',           -- job name
  '30 seconds',                   -- run every 30 seconds
  $$select rotate_reflections()$$ -- SQL command to execute
);
