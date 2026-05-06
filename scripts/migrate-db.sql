-- Run this on Neon to add missing columns to site_generation_jobs
-- Safe to run multiple times (uses IF NOT EXISTS / column checks)

ALTER TABLE site_generation_jobs
  ADD COLUMN IF NOT EXISTS arweave_url TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS error_message TEXT;
