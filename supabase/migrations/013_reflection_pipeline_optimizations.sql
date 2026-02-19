-- ============================================================================
-- REFLECTION PIPELINE OPTIMIZATIONS
-- ============================================================================
-- 1) Harden rotation lifecycle updates
-- 2) Restrict reflection updates to service role
-- 3) Add single-call snapshot RPC for Community screen

-- --------------------------------------------------------------------------
-- 1. Restrict update policy to service role only
-- --------------------------------------------------------------------------
drop policy if exists "Service can update reflections" on reflections;

create policy "Service can update reflections"
  on reflections for update
  to service_role
  using (true)
  with check (true);

-- --------------------------------------------------------------------------
-- 2. Rotation hardening
-- --------------------------------------------------------------------------
create or replace function rotate_reflections()
returns void
language plpgsql
security definer
as $$
declare
  v_current_live_id uuid;
  v_next_queued_id uuid;
  v_expired_count int;
  v_lock_acquired boolean;
begin
  -- Prevent overlapping runs from doing duplicate promotion work.
  select pg_try_advisory_xact_lock(hashtext('rotate_reflections')) into v_lock_acquired;

  if not v_lock_acquired then
    raise notice 'rotate_reflections skipped because another run holds the lock';
    return;
  end if;

  -- Step 1: Mark expired live reflections as completed.
  update reflections
  set
    status = 'completed',
    completed_at = now()
  where status = 'live'
    and live_until <= now();

  get diagnostics v_expired_count = row_count;

  if v_expired_count > 0 then
    raise notice 'Marked % expired reflection(s) as completed', v_expired_count;
  end if;

  -- Step 2: Check whether a still-live reflection exists.
  select id into v_current_live_id
  from reflections
  where status = 'live'
    and live_until > now()
  order by live_started_at desc
  limit 1;

  -- Step 3: If no live reflection exists, promote the oldest queued row atomically.
  if v_current_live_id is null then
    select id into v_next_queued_id
    from reflections
    where status = 'queued'
    order by queued_at
    for update skip locked
    limit 1;

    if v_next_queued_id is not null then
      update reflections
      set
        status = 'live',
        live_started_at = now(),
        live_until = now() + interval '60 seconds'
      where id = v_next_queued_id
        and status = 'queued';

      if found then
        raise notice 'Promoted reflection % to live', v_next_queued_id;
      else
        raise notice 'Queued reflection % was already promoted by another transaction', v_next_queued_id;
      end if;
    else
      raise notice 'No queued reflections available to promote';
    end if;
  else
    raise notice 'Current live reflection: %', v_current_live_id;
  end if;
end;
$$;

-- --------------------------------------------------------------------------
-- 3. One-call Community snapshot RPC (live + queue)
-- --------------------------------------------------------------------------
create or replace function get_community_reflection_snapshot(queue_limit integer default 10)
returns jsonb
language sql
stable
as $$
  with live_row as (
    select
      id,
      display_name,
      input_text,
      generated_text,
      status,
      queued_at,
      live_started_at,
      live_until,
      completed_at
    from reflections
    where status = 'live'
      and live_until > now()
    order by live_started_at desc
    limit 1
  ),
  queue_rows as (
    select
      id,
      display_name,
      input_text,
      generated_text,
      status,
      queued_at,
      live_started_at,
      live_until,
      completed_at
    from reflections
    where status = 'queued'
    order by queued_at asc
    limit greatest(queue_limit, 0)
  )
  select jsonb_build_object(
    'server_now', now(),
    'live', (select to_jsonb(l) from live_row l),
    'queued', coalesce((select jsonb_agg(to_jsonb(q)) from queue_rows q), '[]'::jsonb)
  );
$$;

grant execute on function get_community_reflection_snapshot(integer) to anon, authenticated;

-- --------------------------------------------------------------------------
-- 3b. Allow clients to safely request an immediate rotation check
-- --------------------------------------------------------------------------
create or replace function request_reflection_rotation()
returns void
language plpgsql
security definer
as $$
begin
  perform rotate_reflections();
end;
$$;

grant execute on function request_reflection_rotation() to anon, authenticated;

-- --------------------------------------------------------------------------
-- 4. Promote immediately when a queued reflection is inserted and no live exists
-- --------------------------------------------------------------------------
create or replace function trigger_rotate_reflections_after_insert()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'queued' then
    perform rotate_reflections();
  end if;

  return new;
end;
$$;

drop trigger if exists reflections_rotate_after_insert on reflections;

create trigger reflections_rotate_after_insert
  after insert on reflections
  for each row
  execute function trigger_rotate_reflections_after_insert();
