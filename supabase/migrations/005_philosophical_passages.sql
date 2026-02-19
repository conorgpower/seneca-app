-- ============================================================================
-- PHILOSOPHICAL PASSAGES TABLE
-- ============================================================================
-- This table stores condensed philosophical passages suitable for daily sharing
-- These are AI-generated summaries of sections from philosophical_texts

-- Philosophical passages table - condensed versions for daily sharing
create table if not exists philosophical_passages (
  id uuid primary key default gen_random_uuid(),
  source_text_id text not null references philosophical_texts(id) on delete cascade,
  source_author text not null,
  source_work text not null,
  source_section text,
  condensed_passage text not null,
  passage_length integer not null, -- Character count for easy filtering
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Index for foreign key
create index if not exists philosophical_passages_source_text_idx 
  on philosophical_passages (source_text_id);

-- Index for filtering by author
create index if not exists philosophical_passages_author_idx 
  on philosophical_passages (source_author);

-- Index for filtering by work
create index if not exists philosophical_passages_work_idx 
  on philosophical_passages (source_work);

-- Index for filtering by passage length (for finding appropriate daily passages)
create index if not exists philosophical_passages_length_idx 
  on philosophical_passages (passage_length);

-- Index for created_at to get recent or random passages
create index if not exists philosophical_passages_created_at_idx 
  on philosophical_passages (created_at desc);

-- Function to get a random passage of the day
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
  passage_length integer
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
    philosophical_passages.passage_length
  from philosophical_passages
  where 
    (max_length is null or philosophical_passages.passage_length <= max_length)
    and (filter_author is null or philosophical_passages.source_author = filter_author)
    and (filter_work is null or philosophical_passages.source_work = filter_work)
  order by random()
  limit 1;
end;
$$;

-- RLS policies (optional - enable if you want row level security)
-- alter table philosophical_passages enable row level security;
-- create policy "Public read access" on philosophical_passages for select using (true);
