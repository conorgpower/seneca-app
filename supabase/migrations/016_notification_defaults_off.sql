-- ============================================================
-- 016: Update notification preference defaults to OFF
-- All notifications are now opt-in (off by default).
-- ============================================================

-- Change column defaults so new rows start with notifications off
ALTER TABLE notification_preferences
  ALTER COLUMN push_enabled SET DEFAULT false,
  ALTER COLUMN daily_reminder SET DEFAULT false,
  ALTER COLUMN streak_reminder SET DEFAULT false;
