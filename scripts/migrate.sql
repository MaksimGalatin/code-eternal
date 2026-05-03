CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  wallet        VARCHAR(44)  NOT NULL UNIQUE,
  email         VARCHAR(255),
  display_name  VARCHAR(100),
  referrer_id   INTEGER REFERENCES users(id),
  ref_code      VARCHAR(20)  UNIQUE,
  tier          SMALLINT     NOT NULL DEFAULT 0,
  tier_expires  TIMESTAMPTZ,
  tg_chat_id    BIGINT,
  tg_link_token VARCHAR(64)  UNIQUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referral_payments (
  id               SERIAL PRIMARY KEY,
  payer_wallet     VARCHAR(44)    NOT NULL,
  referrer_wallet  VARCHAR(44)    NOT NULL,
  level            SMALLINT       NOT NULL CHECK (level IN (1, 2, 3)),
  amount_usdc      NUMERIC(18, 6) NOT NULL,
  tx_hash          VARCHAR(88)    NOT NULL,
  tier             SMALLINT       NOT NULL,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS burn_events (
  id         SERIAL PRIMARY KEY,
  amount     NUMERIC(18, 6) NOT NULL,
  tx_hash    VARCHAR(88)    NOT NULL UNIQUE,
  created_at TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_generation_jobs (
  id           SERIAL PRIMARY KEY,
  wallet       VARCHAR(44)  NOT NULL,
  tier         SMALLINT     NOT NULL,
  tx_signature VARCHAR(88)  NOT NULL UNIQUE,
  status       VARCHAR(20)  NOT NULL DEFAULT 'pending',
  arweave_url  VARCHAR(100),
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applications_1000 (
  id           SERIAL PRIMARY KEY,
  fio          VARCHAR(200) NOT NULL,
  contact      VARCHAR(200) NOT NULL,
  language     VARCHAR(50),
  avatar_desc  TEXT,
  reason       TEXT,
  status       VARCHAR(20)  NOT NULL DEFAULT 'new',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_wallet          ON users(wallet);
CREATE INDEX IF NOT EXISTS idx_users_ref_code        ON users(ref_code);
CREATE INDEX IF NOT EXISTS idx_ref_payments_referrer ON referral_payments(referrer_wallet);
CREATE INDEX IF NOT EXISTS idx_ref_payments_payer    ON referral_payments(payer_wallet);
CREATE INDEX IF NOT EXISTS idx_site_jobs_wallet      ON site_generation_jobs(wallet);
CREATE INDEX IF NOT EXISTS idx_site_jobs_status      ON site_generation_jobs(status);
