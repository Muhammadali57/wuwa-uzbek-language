-- WUWA Uzbek Language Campaign database schema
-- PostgreSQL / Neon compatible

CREATE TABLE IF NOT EXISTS supporters (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  email_normalized TEXT NOT NULL UNIQUE,
  country_code CHAR(2) NOT NULL DEFAULT 'XX',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS supporters_created_at_idx ON supporters (created_at DESC);
CREATE INDEX IF NOT EXISTS supporters_country_idx ON supporters (country_code);

-- Global community chat. Email is intentionally not stored here.
CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  nickname VARCHAR(32) NOT NULL,
  message VARCHAR(500) NOT NULL,
  country_code CHAR(2) NOT NULL DEFAULT 'XX',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON chat_messages (created_at DESC);

-- Used for database-backed rate limiting. Only a one-way hash is stored.
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  bucket_key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_key, window_start)
);

CREATE INDEX IF NOT EXISTS rate_limit_window_idx ON rate_limit_buckets (window_start);
