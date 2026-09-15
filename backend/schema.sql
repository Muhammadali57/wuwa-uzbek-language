-- WUWA Uzbek Language Campaign database schema
-- PostgreSQL / Neon compatible

CREATE TABLE IF NOT EXISTS supporters (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  email_normalized TEXT NOT NULL UNIQUE,
  country_code CHAR(2) NOT NULL DEFAULT 'XX',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS supporters_created_at_idx
  ON supporters (created_at DESC);

CREATE INDEX IF NOT EXISTS supporters_country_idx
  ON supporters (country_code);

-- Used for a simple database-backed rate limit.
-- Only a one-way hash of the client IP is stored.
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  bucket_key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_key, window_start)
);

CREATE INDEX IF NOT EXISTS rate_limit_window_idx
  ON rate_limit_buckets (window_start);
