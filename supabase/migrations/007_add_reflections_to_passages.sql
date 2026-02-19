-- ============================================================================
-- ADD REFLECTIONS TO PHILOSOPHICAL PASSAGES
-- ============================================================================
-- This migration adds a reflection column to store AI-generated reflections
-- that help users understand and apply the philosophical passages

-- Add reflection column to philosophical_passages table
alter table philosophical_passages
  add column if not exists reflection text;

-- Add reflection_length column to track the length (useful for filtering)
alter table philosophical_passages
  add column if not exists reflection_length integer;

-- Drop the existing function first (needed to change return type)
drop function if exists get_random_daily_passage(integer, text, text);

-- Recreate the get_random_daily_passage function to include reflection
create or replace function get_random_daily_passage (
  max_length int default 500,
  filter_author text default null,
  filter_work text default null
)
returns table (
  id uuid,
  source_author text,
  source_work text,
  source_section text,
  condensed_passage text,
  passage_length integer,
  reflection text
)
language plpgsql
as $$
begin
  return query
  select
    philosophical_passages.id,
    philosophical_passages.source_author,
    philosophical_passages.source_work,
    philosophical_passages.source_section,
    philosophical_passages.condensed_passage,
    philosophical_passages.passage_length,
    philosophical_passages.reflection
  from philosophical_passages
  where
    (max_length is null or philosophical_passages.passage_length <= max_length)
    and (filter_author is null or philosophical_passages.source_author = filter_author)
    and (filter_work is null or philosophical_passages.source_work = filter_work)
  order by random()
  limit 1;
end;
$$;
