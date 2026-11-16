-- ============================================================
-- 017: AI usage log
-- Every DeepSeek call made by the deepseek-proxy edge function
-- is recorded here, so cost can be attributed per user / model.
-- Only the service role (edge function) reads or writes it.
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_usage_log (
  id                 BIGSERIAL PRIMARY KEY,
  user_id            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  feature            TEXT NOT NULL,            -- 'chat' | 'reflection'
  model_requested    TEXT NOT NULL,
  model_returned     TEXT,                     -- what DeepSeek says actually ran
  prompt_tokens      INTEGER NOT NULL DEFAULT 0,
  completion_tokens  INTEGER NOT NULL DEFAULT 0,
  cache_hit_tokens   INTEGER NOT NULL DEFAULT 0,
  cache_miss_tokens  INTEGER NOT NULL DEFAULT 0,
  history_messages   INTEGER NOT NULL DEFAULT 0, -- turns sent after trimming
  status             TEXT NOT NULL DEFAULT 'ok', -- 'ok' | 'error' | 'rate_limited'
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_usage_log_user_created_idx
  ON ai_usage_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_usage_log_created_idx
  ON ai_usage_log (created_at DESC);

-- RLS on with no policies: clients can't read or write; service role bypasses RLS.
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;

-- Per-user, per-day summary for investigating heavy users in the SQL editor:
--   SELECT * FROM ai_usage_daily ORDER BY total_tokens DESC LIMIT 20;
CREATE OR REPLACE VIEW ai_usage_daily
WITH (security_invoker = true) AS
SELECT
  date_trunc('day', created_at)::date AS day,
  user_id,
  feature,
  model_returned,
  COUNT(*)                                   AS requests,
  SUM(prompt_tokens)                         AS prompt_tokens,
  SUM(cache_hit_tokens)                      AS cache_hit_tokens,
  SUM(cache_miss_tokens)                     AS cache_miss_tokens,
  SUM(completion_tokens)                     AS completion_tokens,
  SUM(prompt_tokens + completion_tokens)     AS total_tokens,
  MAX(history_messages)                      AS max_history_messages
FROM ai_usage_log
WHERE status = 'ok'
GROUP BY 1, 2, 3, 4;
