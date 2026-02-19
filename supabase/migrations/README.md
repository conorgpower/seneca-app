# Supabase Database Migrations

This directory contains SQL migration files for the Seneca app database.

## Migration Files

### 001_philosophical_texts.sql
**Purpose**: Core philosophical texts storage with vector embeddings
**Tables**:
- `philosophical_texts` - Stores philosophical text chunks with embeddings

**Functions**:
- `match_philosophical_texts()` - Semantic search using vector similarity

**Apply**:
```sql
-- Run in Supabase SQL Editor
\i supabase/migrations/001_philosophical_texts.sql
```

### 002_chat_history.sql
**Purpose**: Chat conversation history and message storage
**Tables**:
- `conversations` - Chat session metadata (title, user_id, timestamps)
- `conversation_messages` - Individual messages in conversations

**Functions**:
- `update_conversation_metadata()` - Auto-updates conversation stats

**Triggers**:
- `update_conversation_on_message` - Triggers on message insert

**Features**:
- Uses authenticated user IDs (not device IDs)
- Row Level Security (RLS) enabled
- Foreign key to auth.users with cascade delete
- Users can only access their own conversations

**Apply**:
```sql
-- Run in Supabase SQL Editor
\i supabase/migrations/002_chat_history.sql
```

### 003_user_profiles.sql
**Purpose**: User profile management with onboarding and subscription tracking
**Tables**:
- `user_profiles` - User data, onboarding answers, subscription status

**Functions**:
- `handle_new_user()` - Auto-creates profile on signup
- `update_updated_at()` - Auto-updates timestamps

**Triggers**:
- `on_auth_user_created` - Triggers on user signup
- `update_user_profiles_updated_at` - Triggers on profile update

**Features**:
- Onboarding answers stored as JSONB
- Subscription status tracking (has_active_subscription, tier, dates)
- RevenueCat integration support
- Row Level Security (RLS) enabled

**Apply**:
```sql
-- Run in Supabase SQL Editor
\i supabase/migrations/003_user_profiles.sql
```

## How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended)
1. Go to https://supabase.com → Your Project
2. Navigate to **SQL Editor** in sidebar
3. Click **New Query**
4. Copy contents of migration file
5. Click **Run** (or Cmd/Ctrl + Enter)

### Option 2: Supabase CLI
```bash
# Link your project (first time only)
supabase link --project-ref YOUR_PROJECT_REF

# Apply all migrations
supabase db push

# Or apply specific migration
psql $DATABASE_URL < supabase/migrations/002_chat_history.sql
```

## Migration Order

⚠️ **Important**: Apply migrations in numerical order:
1. `001_philosophical_texts.sql` - Core tables
2. `002_chat_history.sql` - Chat features
3. `003_user_profiles.sql` - User profiles and subscriptions (NEW)

## Checking Applied Migrations

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check if chat history tables exist
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'conversations'
);
```

## Current Status

- ✅ `001_philosophical_texts.sql` - Already applied (existing data)
- 🔄 `002_chat_history.sql` - **Ready to apply** (chat feature)
- 🆕 `003_user_profiles.sql` - **NEW - Ready to apply** (user profiles & subscriptions)

## Rollback

If you need to undo a migration:

```sql
-- Rollback chat history (002)
drop trigger if exists update_conversation_on_message on conversation_messages;
drop function if exists update_conversation_metadata();
drop table if exists conversation_messages;
drop table if exists conversations;
```

## Notes

- All migrations use `if not exists` to be idempotent
- Indexes are named explicitly for clarity
- Foreign keys use `on delete cascade` for automatic cleanup
- RLS policies are commented out (ready for future auth)
