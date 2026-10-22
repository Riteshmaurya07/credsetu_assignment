-- 002: OTP verification records.
-- Only a salted scrypt hash of the OTP is stored, never the code itself.
-- Records support expiry, a per-record attempt limit and single-use
-- consumption (consumed_at).

CREATE TABLE IF NOT EXISTS otp_verifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone         TEXT        NOT NULL,
  code_hash     TEXT        NOT NULL,
  salt          TEXT        NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  max_attempts  INTEGER     NOT NULL DEFAULT 5,
  attempts      INTEGER     NOT NULL DEFAULT 0,
  consumed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT otp_verifications_phone_format CHECK (phone ~ '^\+[1-9][0-9]{6,14}$'),
  CONSTRAINT otp_verifications_max_attempts_positive CHECK (max_attempts > 0),
  CONSTRAINT otp_verifications_attempts_not_negative CHECK (attempts >= 0)
);

-- Supports "latest active OTP for this phone" lookups.
CREATE INDEX IF NOT EXISTS otp_verifications_phone_created_idx
  ON otp_verifications (phone, created_at DESC);

-- Supports "active (not yet consumed) OTPs for this phone" lookups.
CREATE INDEX IF NOT EXISTS otp_verifications_active_idx
  ON otp_verifications (phone, created_at DESC)
  WHERE consumed_at IS NULL;
