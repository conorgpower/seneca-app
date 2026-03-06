-- ============================================================================
-- ACHIEVEMENTS SYSTEM — "Scrolls of Wisdom"
-- ============================================================================
-- Tracks user achievements and content interactions for achievement progress

-- ============================================================================
-- TABLE: user_achievements
-- ============================================================================
-- Stores unlocked achievements per user

create table if not exists user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamp with time zone not null default now(),
  created_at timestamp with time zone default now()
);

create unique index if not exists user_achievements_user_achievement_idx
  on user_achievements (user_id, achievement_id);

create index if not exists user_achievements_user_idx
  on user_achievements (user_id, unlocked_at desc);

-- ============================================================================
-- TABLE: user_content_log
-- ============================================================================
-- Tracks which content items a user has accessed (for content-based achievements)

create table if not exists user_content_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_type text not null,
  content_id text not null,
  first_accessed_at timestamp with time zone not null default now()
);

create unique index if not exists user_content_log_user_content_idx
  on user_content_log (user_id, content_type, content_id);

create index if not exists user_content_log_user_type_idx
  on user_content_log (user_id, content_type);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table user_achievements enable row level security;
alter table user_content_log enable row level security;

create policy "Users can read own achievements"
  on user_achievements for select
  using (auth.uid() = user_id);

create policy "Users can insert own achievements"
  on user_achievements for insert
  with check (auth.uid() = user_id);

create policy "Users can read own content log"
  on user_content_log for select
  using (auth.uid() = user_id);

create policy "Users can insert own content log"
  on user_content_log for insert
  with check (auth.uid() = user_id);

create policy "Users can update own content log"
  on user_content_log for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- FUNCTION: check_and_award_achievements
-- ============================================================================
-- Checks achievement conditions and awards any newly earned achievements.
-- Returns an array of newly unlocked achievement IDs.

create or replace function check_and_award_achievements(
  p_user_id uuid,
  p_category text
)
returns text[]
language plpgsql
security definer
as $$
declare
  v_new text[] := '{}';
  v_earned text[];
  v_streak integer;
  v_longest integer;
  v_total integer;
  v_cnt integer;
  v_has_low boolean;
  v_has_high boolean;
begin
  select coalesce(array_agg(achievement_id), '{}') into v_earned
  from user_achievements
  where user_id = p_user_id;

  -- STREAK / DAILY RITUAL achievements
  if p_category = 'streak' then
    select coalesce(current_streak, 0), coalesce(longest_streak, 0), coalesce(total_completions, 0)
    into v_streak, v_longest, v_total
    from user_streaks where user_id = p_user_id;

    if not found then
      v_streak := 0; v_longest := 0; v_total := 0;
    end if;

    if v_total >= 1 and not ('first_dawn' = any(v_earned)) then
      v_new := array_append(v_new, 'first_dawn');
    end if;
    if v_longest >= 7 and not ('week_of_wisdom' = any(v_earned)) then
      v_new := array_append(v_new, 'week_of_wisdom');
    end if;
    if v_longest >= 30 and not ('month_of_virtue' = any(v_earned)) then
      v_new := array_append(v_new, 'month_of_virtue');
    end if;
    if v_longest >= 100 and not ('century_of_practice' = any(v_earned)) then
      v_new := array_append(v_new, 'century_of_practice');
    end if;
    if v_total >= 10 and not ('ten_completions' = any(v_earned)) then
      v_new := array_append(v_new, 'ten_completions');
    end if;
    if v_total >= 50 and not ('fifty_completions' = any(v_earned)) then
      v_new := array_append(v_new, 'fifty_completions');
    end if;
    if v_total >= 100 and not ('hundred_completions' = any(v_earned)) then
      v_new := array_append(v_new, 'hundred_completions');
    end if;
  end if;

  -- CONTENT achievements
  if p_category = 'content' then
    -- Audio lessons
    select count(distinct content_id) into v_cnt
    from user_content_log where user_id = p_user_id and content_type = 'audio_lesson';
    if v_cnt >= 1 and not ('first_lesson' = any(v_earned)) then
      v_new := array_append(v_new, 'first_lesson');
    end if;
    if v_cnt >= 3 and not ('three_lessons' = any(v_earned)) then
      v_new := array_append(v_new, 'three_lessons');
    end if;
    if v_cnt >= 6 and not ('all_lessons' = any(v_earned)) then
      v_new := array_append(v_new, 'all_lessons');
    end if;

    -- Breathwork
    select count(distinct content_id) into v_cnt
    from user_content_log where user_id = p_user_id and content_type = 'breathwork';
    if v_cnt >= 1 and not ('first_breath' = any(v_earned)) then
      v_new := array_append(v_new, 'first_breath');
    end if;
    if v_cnt >= 3 and not ('three_breaths' = any(v_earned)) then
      v_new := array_append(v_new, 'three_breaths');
    end if;
    if v_cnt >= 6 and not ('all_breaths' = any(v_earned)) then
      v_new := array_append(v_new, 'all_breaths');
    end if;

    -- Comics
    select count(distinct content_id) into v_cnt
    from user_content_log where user_id = p_user_id and content_type = 'comic';
    if v_cnt >= 1 and not ('first_comic' = any(v_earned)) then
      v_new := array_append(v_new, 'first_comic');
    end if;
    if v_cnt >= 5 and not ('five_comics' = any(v_earned)) then
      v_new := array_append(v_new, 'five_comics');
    end if;
    if v_cnt >= 10 and not ('all_comics' = any(v_earned)) then
      v_new := array_append(v_new, 'all_comics');
    end if;

    -- Books
    select count(distinct content_id) into v_cnt
    from user_content_log where user_id = p_user_id and content_type = 'book';
    if v_cnt >= 1 and not ('first_book' = any(v_earned)) then
      v_new := array_append(v_new, 'first_book');
    end if;
    if v_cnt >= 5 and not ('all_books' = any(v_earned)) then
      v_new := array_append(v_new, 'all_books');
    end if;
  end if;

  -- COMMUNITY achievements
  if p_category = 'community' then
    select count(*) into v_cnt
    from reflections where user_id = p_user_id and is_fake = false;
    if v_cnt >= 1 and not ('first_reflection' = any(v_earned)) then
      v_new := array_append(v_new, 'first_reflection');
    end if;
    if v_cnt >= 5 and not ('five_reflections' = any(v_earned)) then
      v_new := array_append(v_new, 'five_reflections');
    end if;
  end if;

  -- CHAT achievements
  if p_category = 'chat' then
    select count(*) into v_cnt
    from conversations where user_id = p_user_id;
    if v_cnt >= 1 and not ('first_conversation' = any(v_earned)) then
      v_new := array_append(v_new, 'first_conversation');
    end if;
    if v_cnt >= 10 and not ('ten_conversations' = any(v_earned)) then
      v_new := array_append(v_new, 'ten_conversations');
    end if;
  end if;

  -- FOCUS LOCK
  if p_category = 'focus' then
    if not ('focus_lock_activated' = any(v_earned)) then
      v_new := array_append(v_new, 'focus_lock_activated');
    end if;
  end if;

  -- CHECK-IN mood variety
  if p_category = 'checkin' then
    select
      exists(select 1 from daily_check_ins where user_id = p_user_id and mood_value <= 25),
      exists(select 1 from daily_check_ins where user_id = p_user_id and mood_value >= 75)
    into v_has_low, v_has_high;
    if v_has_low and v_has_high and not ('check_in_variety' = any(v_earned)) then
      v_new := array_append(v_new, 'check_in_variety');
    end if;
  end if;

  -- Insert newly earned achievements
  if array_length(v_new, 1) > 0 then
    insert into user_achievements (user_id, achievement_id)
    select p_user_id, unnest(v_new)
    on conflict do nothing;
  end if;

  return v_new;
end;
$$;
