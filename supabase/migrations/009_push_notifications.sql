-- ============================================================
-- 009: Push Notification Infrastructure
-- Adds push token storage, notification preferences syncing,
-- and server-side notification tracking.
-- ============================================================

-- -----------------------------------------------------------
-- 1. User Push Tokens
-- Stores Expo Push Tokens per device per user.
-- A user can have multiple devices.
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_push_tokens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  push_token    text NOT NULL,
  device_name   text,
  platform      text CHECK (platform IN ('ios', 'android', 'web')),
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- One token per user+device combo (token is unique per device)
CREATE UNIQUE INDEX idx_push_tokens_user_token ON user_push_tokens(user_id, push_token);
CREATE INDEX idx_push_tokens_active ON user_push_tokens(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own push tokens"
  ON user_push_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access to push tokens"
  ON user_push_tokens
  FOR ALL
  USING (auth.role() = 'service_role');

-- -----------------------------------------------------------
-- 2. Notification Preferences (server-synced)
-- Mirrors the local AsyncStorage prefs so the server knows
-- who wants what type of notification.
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  push_enabled        boolean DEFAULT true,
  daily_reminder      boolean DEFAULT true,
  streak_reminder     boolean DEFAULT true,
  community_updates   boolean DEFAULT false,
  reminder_hour       integer DEFAULT 9 CHECK (reminder_hour >= 0 AND reminder_hour <= 23),
  reminder_minute     integer DEFAULT 0 CHECK (reminder_minute >= 0 AND reminder_minute <= 59),
  timezone            text DEFAULT 'UTC',
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notification preferences"
  ON notification_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access to notification preferences"
  ON notification_preferences
  FOR ALL
  USING (auth.role() = 'service_role');

-- -----------------------------------------------------------
-- 3. Notification Log
-- Tracks sent notifications for debugging and preventing
-- duplicate sends.
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type text NOT NULL CHECK (notification_type IN ('streak_reminder', 'community_update', 'daily_reminder')),
  title           text NOT NULL,
  body            text NOT NULL,
  sent_at         timestamptz DEFAULT now(),
  expo_ticket_id  text,
  status          text DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed')),
  metadata        jsonb DEFAULT '{}'
);

CREATE INDEX idx_notification_log_user ON notification_log(user_id, sent_at DESC);
CREATE INDEX idx_notification_log_type_date ON notification_log(notification_type, sent_at DESC);

-- RLS
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification log"
  ON notification_log
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to notification log"
  ON notification_log
  FOR ALL
  USING (auth.role() = 'service_role');

-- -----------------------------------------------------------
-- 4. Featured Reflections
-- Allows marking community reflections as "featured" for
-- community update notifications.
-- -----------------------------------------------------------
ALTER TABLE reflections ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;
ALTER TABLE reflections ADD COLUMN IF NOT EXISTS featured_at timestamptz;

CREATE INDEX idx_reflections_featured ON reflections(is_featured, featured_at DESC) WHERE is_featured = true;

-- -----------------------------------------------------------
-- 5. Auto-update timestamps
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION update_push_token_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_push_tokens_updated
  BEFORE UPDATE ON user_push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_push_token_timestamp();

CREATE TRIGGER trg_notification_prefs_updated
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_push_token_timestamp();

-- -----------------------------------------------------------
-- 6. Helper function: Get users who need streak reminders
-- Returns users who have streak_reminder enabled, have a
-- current streak > 0, but have NOT completed today's journey,
-- AND whose local time is currently the target hour (e.g. 18 = 6 PM).
-- Called hourly by the cron job so each timezone gets hit at their 6 PM.
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION get_streak_reminder_recipients(target_hour integer DEFAULT 18)
RETURNS TABLE (
  user_id uuid,
  push_token text,
  current_streak integer,
  timezone text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    np.user_id,
    upt.push_token,
    us.current_streak,
    np.timezone
  FROM notification_preferences np
  JOIN user_push_tokens upt ON upt.user_id = np.user_id AND upt.is_active = true
  JOIN user_streaks us ON us.user_id = np.user_id
  WHERE np.push_enabled = true
    AND np.streak_reminder = true
    AND us.current_streak > 0
    -- Only include users whose local time is currently the target hour
    AND EXTRACT(HOUR FROM now() AT TIME ZONE np.timezone) = target_hour
    -- Exclude users who already completed today (in their local date)
    AND NOT EXISTS (
      SELECT 1 FROM daily_completions dc
      WHERE dc.user_id = np.user_id
        AND dc.completion_date = (now() AT TIME ZONE np.timezone)::date
        AND dc.all_stages_completed = true
    )
    -- Exclude users who already got a streak reminder today (in their local date)
    AND NOT EXISTS (
      SELECT 1 FROM notification_log nl
      WHERE nl.user_id = np.user_id
        AND nl.notification_type = 'streak_reminder'
        AND (nl.sent_at AT TIME ZONE np.timezone)::date = (now() AT TIME ZONE np.timezone)::date
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------
-- 7. Helper function: Get users who want community updates
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION get_community_update_recipients()
RETURNS TABLE (
  user_id uuid,
  push_token text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    np.user_id,
    upt.push_token
  FROM notification_preferences np
  JOIN user_push_tokens upt ON upt.user_id = np.user_id AND upt.is_active = true
  WHERE np.push_enabled = true
    AND np.community_updates = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------
-- 8. Cron Jobs (requires pg_cron + pg_net extensions)
-- Streak reminder runs EVERY HOUR. The SQL function filters
-- for users whose local time is 6 PM, so each timezone
-- gets their reminder at 6 PM local time.
--
-- NOTE: Run these manually in the Supabase SQL editor
-- after deploying the Edge Functions:
-- -----------------------------------------------------------
--
-- Streak Reminder (every hour — sends to users whose local time is 6 PM):
-- SELECT cron.schedule(
--   'streak-reminder-hourly',
--   '0 * * * *',
--   $$
--   SELECT net.http_post(
--     url := '<YOUR_SUPABASE_URL>/functions/v1/streak-reminder',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer <YOUR_SERVICE_ROLE_KEY>',
--       'Content-Type', 'application/json'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
--
-- Community Update (optional - daily auto-feature at 12 PM UTC):
-- SELECT cron.schedule(
--   'community-update-daily',
--   '0 12 * * *',
--   $$
--   SELECT net.http_post(
--     url := '<YOUR_SUPABASE_URL>/functions/v1/community-update',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer <YOUR_SERVICE_ROLE_KEY>',
--       'Content-Type', 'application/json'
--     ),
--     body := '{"auto": true}'::jsonb
--   );
--   $$
-- );
