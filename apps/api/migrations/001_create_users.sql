-- 001: users table.
-- The phone column stores the canonical E.164-like form (`+919876543210`) and
-- is protected by a unique index so the same person can never sign up twice
-- with different formatting.

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone         TEXT        NOT NULL,
  display_name  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_phone_format CHECK (phone ~ '^\+[1-9][0-9]{6,14}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique_idx ON users (phone);
