-- ============================================================================
-- USER PROFILES AND SUBSCRIPTION STATUS
-- ============================================================================
-- Stores user profile data, onboarding answers, and subscription status

-- User profiles table
create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  -- Onboarding answers
  onboarding_answers jsonb,
  onboarding_completed_at timestamp with time zone,
  -- Subscription status
  has_active_subscription boolean default false,
  subscription_tier text, -- 'free', 'monthly', 'yearly'
  subscription_start_date timestamp with time zone,
  subscription_end_date timestamp with time zone,
  -- RevenueCat integration
  revenue_cat_customer_id text,
  revenue_cat_entitlements jsonb,
  -- Timestamps
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Index for quick subscription lookups
create index if not exists user_profiles_subscription_idx 
  on user_profiles (id, has_active_subscription);

-- Index for email lookups
create index if not exists user_profiles_email_idx 
  on user_profiles (email);

-- Function to create profile on user signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', null)
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to auto-create profile when user signs up
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Function to update updated_at timestamp
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-update updated_at
drop trigger if exists update_user_profiles_updated_at on user_profiles;

create trigger update_user_profiles_updated_at
  before update on user_profiles
  for each row execute function update_updated_at();

-- RLS policies
alter table user_profiles enable row level security;

-- Users can view their own profile
create policy "Users can view own profile"
  on user_profiles for select
  using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile"
  on user_profiles for update
  using (auth.uid() = id);

-- Users can insert their own profile (backup, trigger should handle this)
create policy "Users can insert own profile"
  on user_profiles for insert
  with check (auth.uid() = id);
