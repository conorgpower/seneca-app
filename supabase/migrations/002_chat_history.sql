-- ============================================================================
-- CHAT HISTORY TABLES
-- ============================================================================
-- Stores user conversations and messages for chat history feature
-- Uses user_id for authenticated users

-- Conversations table to store chat sessions
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  prompt_type text, -- e.g., 'Dealing with adversity', 'Finding inner peace', 'custom'
  message_count integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Messages table to store individual messages in conversations
create table if not exists conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamp with time zone default now()
);

-- Indexes for efficient querying
create index if not exists conversations_user_updated_idx 
  on conversations (user_id, updated_at desc);

create index if not exists conversation_messages_conversation_created_idx 
  on conversation_messages (conversation_id, created_at);

-- Function to update conversation timestamp and message count
create or replace function update_conversation_metadata()
returns trigger as $$
begin
  update conversations
  set 
    updated_at = now(),
    message_count = (
      select count(*) 
      from conversation_messages 
      where conversation_id = NEW.conversation_id
    )
  where id = NEW.conversation_id;
  return NEW;
end;
$$ language plpgsql;

-- Trigger to auto-update conversation metadata when messages are added
drop trigger if exists update_conversation_on_message on conversation_messages;

create trigger update_conversation_on_message
after insert on conversation_messages
for each row
execute function update_conversation_metadata();

-- RLS policies for authenticated users
alter table conversations enable row level security;
alter table conversation_messages enable row level security;

-- Users can view their own conversations
create policy "Users can view own conversations" 
  on conversations for select 
  using (auth.uid() = user_id);

-- Users can insert their own conversations
create policy "Users can insert own conversations" 
  on conversations for insert 
  with check (auth.uid() = user_id);

-- Users can update their own conversations
create policy "Users can update own conversations" 
  on conversations for update 
  using (auth.uid() = user_id);

-- Users can delete their own conversations
create policy "Users can delete own conversations" 
  on conversations for delete 
  using (auth.uid() = user_id);

-- Users can view messages in their own conversations
create policy "Users can view own messages" 
  on conversation_messages for select 
  using (
    conversation_id in (
      select id from conversations where user_id = auth.uid()
    )
  );

-- Users can insert messages in their own conversations
create policy "Users can insert own messages" 
  on conversation_messages for insert 
  with check (
    conversation_id in (
      select id from conversations where user_id = auth.uid()
    )
  );

-- Users can delete messages in their own conversations
create policy "Users can delete own messages" 
  on conversation_messages for delete 
  using (
    conversation_id in (
      select id from conversations where user_id = auth.uid()
    )
  );
