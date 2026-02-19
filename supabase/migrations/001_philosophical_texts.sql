-- ============================================================================
-- PHILOSOPHICAL TEXTS TABLE
-- ============================================================================
-- This table stores philosophical texts with vector embeddings for semantic search
-- Using pgvector extension for similarity matching

-- Enable pgvector extension for embeddings
create extension if not exists vector;

-- Philosophical texts table with vector embeddings
create table if not exists philosophical_texts (
  id text primary key,
  author text not null,
  work text not null,
  section text,
  text text not null,
  chunk_index integer not null,
  embedding vector(384), -- Local model embeddings are 384 dimensions
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Index for vector similarity search
create index if not exists philosophical_texts_embedding_idx 
  on philosophical_texts using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Index for filtering by author
create index if not exists philosophical_texts_author_idx 
  on philosophical_texts (author);

-- Index for filtering by work
create index if not exists philosophical_texts_work_idx 
  on philosophical_texts (work);

-- Function to search for similar texts
create or replace function match_philosophical_texts (
  query_embedding vector(384),
  match_threshold float,
  match_count int,
  filter_author text default null,
  filter_work text default null
)
returns table (
  id text,
  author text,
  work text,
  section text,
  text text,
  chunk_index integer,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    philosophical_texts.id,
    philosophical_texts.author,
    philosophical_texts.work,
    philosophical_texts.section,
    philosophical_texts.text,
    philosophical_texts.chunk_index,
    1 - (philosophical_texts.embedding <=> query_embedding) as similarity
  from philosophical_texts
  where 
    (filter_author is null or philosophical_texts.author = filter_author)
    and (filter_work is null or philosophical_texts.work = filter_work)
    and 1 - (philosophical_texts.embedding <=> query_embedding) > match_threshold
  order by philosophical_texts.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- RLS policies (optional - enable if you want row level security)
-- alter table philosophical_texts enable row level security;
-- create policy "Public read access" on philosophical_texts for select using (true);
