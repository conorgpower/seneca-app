-- ============================================================================
-- RECONCILE ACTIVE STREAK ON READ
-- ============================================================================
-- Ensures current_streak is reset to 0 after a missed day.
-- This keeps DB state accurate even before the next completion event.

create or replace function get_user_streak_active(p_user_id uuid, p_today date)
returns user_streaks
language plpgsql
security definer
as $$
declare
  v_streak user_streaks%rowtype;
begin
  -- Restrict callers to their own streak record.
  if auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized';
  end if;

  select *
  into v_streak
  from user_streaks
  where user_id = p_user_id
  for update;

  -- Create default row if missing.
  if not found then
    insert into user_streaks (
      user_id,
      current_streak,
      longest_streak,
      last_completion_date,
      total_completions
    )
    values (
      p_user_id,
      0,
      0,
      null,
      0
    )
    returning * into v_streak;

    return v_streak;
  end if;

  -- If last completion is older than yesterday, streak is no longer active.
  if v_streak.last_completion_date is not null
     and v_streak.last_completion_date < (p_today - 1)
     and v_streak.current_streak <> 0 then
    update user_streaks
    set current_streak = 0
    where user_id = p_user_id
    returning * into v_streak;
  end if;

  return v_streak;
end;
$$;

grant execute on function get_user_streak_active(uuid, date) to authenticated;
