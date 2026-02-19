-- ============================================================================
-- PHILOSOPHICAL QUOTES TABLE
-- ============================================================================
-- This table stores philosophical quotes scraped from various sources

create table if not exists philosophical_quotes (
  id uuid primary key default gen_random_uuid(),
  quote_text text not null,
  author text not null,
  source_url text,
  quote_hash text unique not null, -- Hash to prevent duplicates
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Index for searching by author
create index if not exists philosophical_quotes_author_idx 
  on philosophical_quotes (author);

-- Index for full-text search on quote_text
create index if not exists philosophical_quotes_text_idx 
  on philosophical_quotes using gin(to_tsvector('english', quote_text));

-- Index for hash lookups to prevent duplicates
create index if not exists philosophical_quotes_hash_idx 
  on philosophical_quotes (quote_hash);

-- Function to update updated_at timestamp
create or replace function update_philosophical_quotes_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to automatically update updated_at
create trigger update_philosophical_quotes_updated_at_trigger
  before update on philosophical_quotes
  for each row
  execute function update_philosophical_quotes_updated_at();

-- Enable Row Level Security (RLS)
alter table philosophical_quotes enable row level security;

-- Policy: Allow all users to read quotes
create policy "Allow public read access to philosophical_quotes"
  on philosophical_quotes for select
  using (true);

-- Policy: Allow inserts (for scraping scripts)
-- Note: In production, consider restricting this to service role only
create policy "Allow inserts to philosophical_quotes"
  on philosophical_quotes for insert
  with check (true);
