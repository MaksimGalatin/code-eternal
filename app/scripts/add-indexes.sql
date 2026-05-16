-- Missing indexes identified in performance audit
-- Safe to run multiple times (IF NOT EXISTS)

CREATE INDEX IF NOT EXISTS idx_ref_payments_created
  ON referral_payments(created_at);

CREATE INDEX IF NOT EXISTS idx_site_jobs_wallet_status
  ON site_generation_jobs(wallet, status);

CREATE INDEX IF NOT EXISTS idx_site_jobs_wallet_created
  ON site_generation_jobs(wallet, created_at DESC);
