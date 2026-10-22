-- 003: loans table.
-- Money is stored as NUMERIC(14,2): no floating point rounding can occur and
-- the exact decimal is returned to the client as a string.
-- Ownership is enforced by the foreign key on user_id; every query in the
-- application additionally filters on the user id taken from the JWT so a
-- client supplied id can never be trusted.

CREATE TABLE IF NOT EXISTS loans (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  friend_name  TEXT        NOT NULL,
  amount       NUMERIC(14,2) NOT NULL,
  due_date     DATE        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'pending',
  receipt_path TEXT,
  repaid_at    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT loans_amount_positive CHECK (amount > 0),
  CONSTRAINT loans_status_valid CHECK (status IN ('pending', 'repaid')),
  CONSTRAINT loans_friend_name_length CHECK (char_length(btrim(friend_name)) BETWEEN 1 AND 80),
  CONSTRAINT loans_receipt_path_not_blank CHECK (receipt_path IS NULL OR btrim(receipt_path) <> '')
);

-- Default listing order for a user.
CREATE INDEX IF NOT EXISTS loans_user_created_idx
  ON loans (user_id, created_at DESC);

-- Supports summary aggregation and "pending loans" filters.
CREATE INDEX IF NOT EXISTS loans_user_status_due_idx
  ON loans (user_id, status, due_date);

-- Keeps updated_at fresh without relying on application code.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS loans_set_updated_at ON loans;
CREATE TRIGGER loans_set_updated_at
  BEFORE UPDATE ON loans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
