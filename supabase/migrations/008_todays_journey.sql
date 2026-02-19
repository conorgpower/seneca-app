-- ============================================================================
-- TODAY'S JOURNEY FEATURE
-- ============================================================================
-- Tracks daily check-ins, completions, streaks, and reminders

-- ============================================================================
-- TABLE: daily_check_ins (Stage 1)
-- ============================================================================
-- Stores user mood/state check-in values (0-100 slider)

create table if not exists daily_check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  check_in_date date not null,
  mood_value integer not null check (mood_value >= 0 and mood_value <= 100),
  created_at timestamp with time zone default now()
);

-- Composite unique index (one check-in per user per day)
create unique index if not exists daily_check_ins_user_date_idx
  on daily_check_ins (user_id, check_in_date);

-- Index for date-based queries
create index if not exists daily_check_ins_date_idx
  on daily_check_ins (check_in_date desc);

-- ============================================================================
-- TABLE: daily_completions
-- ============================================================================
-- Tracks completion of all 3 stages per user per day

create table if not exists daily_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  completion_date date not null,

  -- Stage 1: Check-in
  check_in_completed boolean default false,
  check_in_value integer, -- 0-100 slider value

  -- Stage 2: Passage
  passage_completed boolean default false,
  passage_id uuid references philosophical_passages(id) on delete set null,

  -- Stage 3: Insight (stored reflection from passage)
  insight_completed boolean default false,

  -- Overall completion
  all_stages_completed boolean default false,
  completed_at timestamp with time zone, -- When all 3 stages were done
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Composite unique index (one completion record per user per day)
create unique index if not exists daily_completions_user_date_idx
  on daily_completions (user_id, completion_date);

-- Index for completed journeys
create index if not exists daily_completions_all_completed_idx
  on daily_completions (user_id, all_stages_completed, completion_date desc);

-- ============================================================================
-- TABLE: user_streaks
-- ============================================================================
-- Tracks streak counts and history per user

create table if not exists user_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_completion_date date,
  total_completions integer not null default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ============================================================================
-- TABLE: daily_reminders
-- ============================================================================
-- Stores notification preferences per user

create table if not exists daily_reminders (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean default true,
  reminder_time time not null default '09:00:00', -- Default 9 AM
  timezone text, -- e.g., 'America/New_York'
  days_of_week integer[] default '{1,2,3,4,5,6,7}', -- 1=Monday, 7=Sunday
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ============================================================================
-- TRIGGERS: Auto-update updated_at timestamp
-- ============================================================================

create or replace function update_todays_journey_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_daily_completions_updated_at
  before update on daily_completions
  for each row execute function update_todays_journey_updated_at();

create trigger update_user_streaks_updated_at
  before update on user_streaks
  for each row execute function update_todays_journey_updated_at();

create trigger update_daily_reminders_updated_at
  before update on daily_reminders
  for each row execute function update_todays_journey_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table daily_check_ins enable row level security;
alter table daily_completions enable row level security;
alter table user_streaks enable row level security;
alter table daily_reminders enable row level security;

-- Users can manage their own data
create policy "Users can manage own check-ins"
  on daily_check_ins for all
  using (auth.uid() = user_id);

create policy "Users can manage own completions"
  on daily_completions for all
  using (auth.uid() = user_id);

create policy "Users can manage own streaks"
  on user_streaks for all
  using (auth.uid() = user_id);

create policy "Users can manage own reminders"
  on daily_reminders for all
  using (auth.uid() = user_id);

-- ============================================================================
-- FUNCTION: Calculate and update streak
-- ============================================================================

create or replace function update_user_streak(p_user_id uuid, p_completion_date date)
returns void
language plpgsql
security definer
as $$
declare
  v_current_streak integer := 0;
  v_longest_streak integer := 0;
  v_last_completion_date date;
  v_total_completions integer := 0;
begin
  -- Get current streak data
  select current_streak, longest_streak, last_completion_date, total_completions
  into v_current_streak, v_longest_streak, v_last_completion_date, v_total_completions
  from user_streaks
  where user_id = p_user_id;

  -- If no record exists, create one
  if not found then
    insert into user_streaks (user_id, current_streak, longest_streak, last_completion_date, total_completions)
    values (p_user_id, 1, 1, p_completion_date, 1);
    return;
  end if;

  -- Calculate new streak
  if v_last_completion_date is null then
    -- First completion
    v_current_streak := 1;
    v_total_completions := 1;
  elsif p_completion_date = v_last_completion_date then
    -- Same day, no change (already counted)
    return;
  elsif p_completion_date = v_last_completion_date + interval '1 day' then
    -- Consecutive day
    v_current_streak := v_current_streak + 1;
    v_total_completions := v_total_completions + 1;
  else
    -- Streak broken, restart
    v_current_streak := 1;
    v_total_completions := v_total_completions + 1;
  end if;

  -- Update longest streak if needed
  if v_current_streak > v_longest_streak then
    v_longest_streak := v_current_streak;
  end if;

  -- Save updates
  update user_streaks
  set
    current_streak = v_current_streak,
    longest_streak = v_longest_streak,
    last_completion_date = p_completion_date,
    total_completions = v_total_completions
  where user_id = p_user_id;
end;
$$;
