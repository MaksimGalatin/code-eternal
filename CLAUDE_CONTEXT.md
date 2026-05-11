# CODE ETERNAL — Project Context

> **This file is the single source of truth for all project architecture, decisions, and progress.**
> Claude must update this file automatically whenever: architecture changes, a task is completed, a new secret is generated, a new service or tool is added, or any decision is made that affects how the system works. No separate docs. No README sections. Everything here.

---

## What is CODE ETERNAL

A Web3 service on Solana where a regular person who knows nothing about crypto:
1. Logs in via Google (Privy — hidden wallet)
2. Pays by card $15/$100/$1000 (MoonPay via Privy)
3. Gets a personal AI companion (AIfa)
4. Gets an **eternal site on Arweave** — cannot be deleted, lives forever
5. Earns $CODE tokens for unique content (Think-to-Earn / Proof-of-Memory)

---

## Payment Distribution (Tokenomics)

From every payment:
| Recipient | % | Notes |
|-----------|---|-------|
| Burn | 5% | Always, on-chain via `token::burn` CPI |
| Referral L1 | 15% | → vault if referrer subscription expired; burn if no referrer |
| Referral L2 | 7% | → vault if referrer subscription expired; burn if no referrer |
| Referral L3 | 3% | Burn if no referrer; no expiry check for L3 on-chain |
| Ecosystem Fund | 5% | Project-controlled wallet (development, grants, ops) |
| Vault (treasury) | 65% | Protocol PDA |
| **Total** | **100%** | ✅ |

Maximum burn (no referrals): **30%** (5+15+7+3)
Expired referrer (L1/L2): their share → **vault**, not burn — keeps tokenomics balanced

**Important:** Burn uses `token::burn` CPI — atomic, on-chain, verifiable on explorer.
The payer signs the transaction and authorizes the burn from their own token account.
Works with the hackathon mock token (we control mint authority). Does NOT work with real USDC.

---

## Repo Structure

```
code-eternal/
├── app/                    ← app.codeofdigitaleternity.com (full stack)
│   ├── src/                  Next.js 16 App Router frontend
│   ├── docker/               Docker Compose + nginx for Hetzner VM
│   ├── listener/             Helius webhook handler (Express)
│   ├── site-gen/             Arweave site generator (Express)
│   ├── scripts/              DB migration + ops scripts
│   └── Dockerfile            Next.js app Docker build
├── contract/               ← Solana smart contract (moved 2026-05-09)
│   ├── programs/             Rust/Anchor source
│   ├── tests/                Anchor TypeScript test suite (6 tests, all green)
│   ├── Anchor.toml           Anchor workspace config
│   ├── Cargo.toml            Rust workspace (members = ["programs/*"])
│   └── Cargo.lock
└── web/                    ← www.codeofdigitaleternity.com (Vercel)
    └── src/app/              Next.js 16 App Router (Galatin's landing site)
```

**Anchor/Cargo builds must run from `contract/`** — `Cargo.toml` and `Anchor.toml` are there.

---

## Tech Stack

### Frontend
- Squarespace — landing page (live)
- Next.js 16 + TypeScript + Tailwind — app (`app/src/` directory)
- **Vercel** — hosting for Next.js app (moved from Hetzner 2026-05-09, auto-deploys on push to main)
  - Project: `app.codeofdigitaleternity.com` (ID: `prj_DrlUafVTqw3AGdxG8wiLrr92RG1r`)
  - Root Directory: `app`, framework: Next.js, Node: 24.x
  - All env vars set via Vercel CLI (see Environment Variables section)

### Auth & Payments
- Privy 3.x (privy.io) — Google login + hidden Solana wallet (embedded, user never sees seed phrase)
  - App ID: `cmoofvdt4008o0cjps5l8nvnu`
  - ✅ Embedded wallets enabled (`createOnLogin: "off"`, Solana wallet created explicitly via `createWallet()`) — HTTPS is live
  - Allowed origin: `https://app.codeofdigitaleternity.com`
  - RPC configured via `config.solana.rpcs["solana:devnet"]` using `createSolanaRpc`/`createSolanaRpcSubscriptions` from `@solana/kit`
  - `signAndSendTransaction` must pass `chain: "solana:devnet"` or Privy defaults to mainnet
- MoonPay via Privy `useFundWallet` — card → USDC on-ramp directly to embedded wallet (production)
- Devnet: mock USDC airdrop via `/api/devnet/airdrop-usdc` (10,000 USDC, no card needed)
- Flow: `Google login → Privy wallet → process_payment tx → Helius webhook → listener → site-gen → Arweave`

### Blockchain
- Solana (Devnet now → Mainnet for launch)
- Anchor Framework v0.30.1 (Rust)
- USDC — payment token (mock token for hackathon)
- Arweave + Irys SDK — permanent site storage
- Metaplex cNFTs — archive (v2, post-hackathon)

### Backend (Hetzner)
- Hetzner CAX11 ARM64 VM — `128.140.0.118`, Ubuntu 24.04, 4GB RAM, ~$5/month
- Docker Compose — **3 services: listener, site-gen, nginx** (app moved to Vercel 2026-05-09)
- `listener` service — Helius webhooks (/webhook/helius) on port 3001
- `site-gen` service — HTTP job endpoint (/jobs) on port 3002, Arweave upload; protected by `SITE_GEN_SECRET` Bearer token
- `nginx` — reverse proxy on ports 80/443; routes `/webhook/` → listener:3001, `/jobs` → site-gen:3002, `/health` → site-gen:3002
- Neon PostgreSQL — external managed database (no local DB on VM)
- Docker Hub — image registry (`maxshchuplov/` private repos)
- Cloudflare — DNS + wildcard subdomains
- **GitHub Actions CI/CD** — two workflows:
  - `.github/workflows/deploy.yml` — builds listener + site-gen ARM64 images, deploys to VM (triggers on `app/listener/**`, `app/site-gen/**`, `app/docker/**`)
  - `.github/workflows/anchor-deploy.yml` — builds contract, runs 6 tests on localnet, deploys to devnet (triggers on `contract/**`)

### External Services
- Helius (helius.dev) — Solana RPC + webhooks (free tier)
- Claude API — content scoring for Think-to-Earn
- Neon (neon.tech) — managed PostgreSQL

---

## Data Flow

### Payment → Site Generation
```
Google login → Privy (hidden Solana wallet created automatically, requires HTTPS)
User clicks "Buy" on tier card → /cabinet/buy?tier=N
  Devnet PoC: single "Buy {Tier} — $N" button
    → auto-airdrops 1100 mock USDC if balance < tier price (/api/devnet/airdrop-usdc)
    → then proceeds to payment
  Production (future): MoonPay widget (Privy useFundWallet) → card → USDC on embedded wallet

Frontend calls /api/referrals/chain?wallet=... → gets ref1/ref2/ref3 from Neon DB
Frontend builds Anchor tx → process_payment (smart contract):
  Contract atomically:
    5%  → token::burn CPI (always)
    15% → ref1 token account if active; → vault if expired; → burn if absent
    7%  → ref2 token account if active; → vault if expired; → burn if absent
    3%  → ref3 token account if present; → burn if absent (no expiry check for L3)
    5%  → ecosystem_fund_token_account
    65% → vault PDA (treasury)
  Referrer activity = clock.unix_timestamp <= referrer.tier_expires (on-chain check)
  Emits: PaymentProcessed event

Helius webhook → listener (Docker, /webhook/helius)
Listener:
  → writes referral_payments rows to Neon PostgreSQL
  → writes burn_events row to Neon PostgreSQL
  → updates users.tier in Neon PostgreSQL
  → sends HTML email via Resend (PDF guide is post-hackathon)
  → sends Telegram notification via Grammy bot (post-hackathon)
  → if wallet has no done job: HTTP POST to site-gen:3002/jobs (direct, no SQS; deduplication: skips if tx_signature already exists)
  → if wallet already has a done job: marks new job done immediately with existing arweave_url (no site-gen dispatch — preserves user's custom site)

site-gen (Docker, /jobs endpoint):
  → compile HTML from template using user data (Handlebars, app/site-gen/src/templates/site.html)
    Supports optional fields: username, bio, manifesto, telegram, twitter, website
  → upload to Arweave via Irys SDK (free <100KB, base58 IRYS_PRIVATE_KEY, node: devnet.irys.xyz)
  → call update_site_url() on-chain with backend keypair (sets arweave_url + site_status=1 in UserState)
  → update site_generation_jobs.status="done" + arweave_url in Neon DB
  → (post-hackathon: create Cloudflare CNAME subdomain for username.codeofdigitaleternity.com)
User sees: Arweave URL shown in cabinet site status panel

UI-triggered site regeneration (from Site tab):
  User fills form (username, bio, manifesto, social links) → clicks "Create Eternal Site"
  → POST /api/site/create (Next.js API)
    → Privy JWT auth — verifies caller owns the wallet
    → checks tier > 0 + subscription not expired (403 if no active subscription)
    → checks regen count limit (Tier 1: 1, Tier 2: 5, Tier 3: 10 per subscription period)
    → saves display_name, username, bio, manifesto, telegram, twitter, website to users table (COALESCE — preserves existing if not provided)
    → inserts new site_generation_jobs row with synthetic tx_signature (ui-regen-{wallet}-{ts})
    → waitUntil() POST to site-gen:3002/jobs with all custom fields including avatarDataUrl
  → cabinet navigates to Cabinet tab showing pending status
  → site-gen generates and deploys exactly like payment-triggered flow
```

### Think-to-Earn
```
User submits content
Backend (Docker) → Claude API scores uniqueness (0-100)
Backend → award_memory() on-chain → adds memory_score to UserState
```

---

## What is Stored Where

| Data | Storage | Why |
|------|---------|-----|
| owner, tier, referrer, arweave_url, memory_score, site_status | Solana PDA (source of truth) | Permanent, trustless |
| users, referral_payments, burn_events, site_generation_jobs | Neon PostgreSQL | Operational, queryable |
| User HTML sites | Arweave | Permanent, uncensorable |

### Neon PostgreSQL Schema

```sql
users (id, wallet, email, display_name, username, referrer_id, ref_code, tier, tier_expires,
       tg_chat_id, tg_link_token, site_bio, site_manifesto, site_telegram, site_twitter,
       site_website, created_at)
referral_payments (id, payer_wallet, referrer_wallet, level, amount_usdc, tx_hash, tier, created_at)
burn_events (id, amount, tx_hash, created_at)
site_generation_jobs (id, wallet, tier, tx_signature, status, arweave_url text, completed_at, error_message, created_at)  -- listener writes; site-gen reads.
applications_1000 (id, fio, contact, language, avatar_desc, reason, status, created_at)
```

Indexes: `users(wallet)`, `users(ref_code)`, `referral_payments(referrer_wallet)`, `referral_payments(payer_wallet)`

---

## Smart Contract — File Structure

```
contract/
├── programs/code_eternal_router/src/
│   ├── lib.rs                    # entry point, declare_id!, 4 instructions
│   ├── errors.rs                 # CodeEternalError enum
│   ├── state/
│   │   ├── mod.rs
│   │   └── user_state.rs         # UserState struct + SITE_STATUS_* constants
│   └── instructions/
│       ├── mod.rs
│       ├── register_user.rs      # init UserState PDA, tier always starts at 0
│       ├── process_payment.rs    # distribute 5/5/15/7/3/65, on-chain burn
│       ├── update_site_url.rs    # backend writes Arweave URL + cooldown 60s
│       └── award_memory.rs       # oracle adds memory_score (Think-to-Earn)
├── tests/
│   └── code_eternal_router.ts    # 6 tests: register/payment/update_site_url
├── Anchor.toml
├── Cargo.toml
└── Cargo.lock
```

### Instructions Summary

| Instruction | Caller | What it does |
|-------------|--------|--------------|
| `register_user(referrer)` | User wallet | Creates UserState PDA. Tier=0 until payment. |
| `process_payment(amount, tier, ref1, ref2, ref3)` | User wallet | Distributes USDC, burns void slots, updates tier |
| `update_site_url(arweave_url, site_status)` | Backend keypair | Writes 43-char Arweave TX ID + status to UserState |
| `award_memory(score)` | Backend keypair (oracle) | Adds memory_score points |

### Key Design Decisions

| Decision | Reason |
|----------|--------|
| `#[derive(InitSpace)]` on UserState | Auto-computes account size. No manual byte counting, no size drift bugs. |
| `register_user` takes no `tier` param | Tier is determined by payment amount only. Users always start at tier=0. |
| Real `token::burn` CPI in `process_payment` | Burn is atomic and verifiable on-chain by anyone. |
| `UncheckedAccount` for referral token accounts | Anchor can't constrain optional accounts. Client passes `payerTokenAccount` as writable dummy when no referral (SystemProgram is rejected as writable by runtime). Transfer/burn gated by `ref1.is_some()` arg, not account key. |
| `payment_mint` marked `#[account(mut)]` | `token::burn` CPI decrements total supply — mint must be writable at tx level or runtime rejects with "writable privilege escalated". |
| Vault PDA as ATA authority | Standard pattern: vault PDA (no data) controls vault_token_account (USDC ATA). |

### UserState Account

```rust
pub struct UserState {
    pub owner: Pubkey,           // user's wallet
    pub referrer: Option<Pubkey>, // who referred them
    pub tier: u8,                // 0=unregistered, 1=Starter, 2=Pro, 3=Elite
    pub registered_at: i64,      // unix timestamp
    pub tier_expires: i64,       // unix timestamp when subscription expires (0 = never paid); 30-day subscription
    pub memory_score: u64,       // Think-to-Earn points
    pub arweave_url: [u8; 64],   // Arweave TX ID (43 chars, zero-padded)
    pub site_status: u8,         // 0=pending, 1=ready, 2=error
    pub last_site_update: i64,   // unix timestamp of last update_site_url call (cooldown 60s)
    pub bump: u8,                // PDA bump seed
}
// Seeds: ["user", wallet_pubkey]
// Size: 8 (discriminator) + UserState::INIT_SPACE

// Binary layout for manual decoding (base=41 no referrer, base=73 with referrer):
// [0..8]   discriminator
// [8..40]  owner Pubkey
// [40]     referrer flag (0=None, 1=Some)
// [41..73] referrer Pubkey (only if flag=1)
// [base+0]        tier u8
// [base+1..+9]    registered_at i64
// [base+9..+17]   tier_expires i64
// [base+17..+25]  memory_score u64
// [base+25..+89]  arweave_url [u8;64]
// [base+89]       site_status u8
// [base+90..+98]  last_site_update i64
// [base+98]       bump u8
```

---

## Hardcoded Pubkeys

| Constant | File | Value |
|----------|------|-------|
| `BACKEND_AUTHORITY` | `contract/programs/.../update_site_url.rs` | `96JwAJL2hn3FHxViqy9oirBdpcDH5rGsvukjTGyiTap4` — private key in `secrets/credentials.env` as `BACKEND_PRIVATE_KEY` |
| `ECOSYSTEM_FUND_WALLET` | `contract/programs/.../process_payment.rs` | `CkiiA1BETdpSbt76PChhnKVzXxLjJXT99yA4yfRtT88c` — keypair in `secrets/ecosystem-fund-keypair.json` |
| Program ID | `contract/programs/.../lib.rs` + `contract/Anchor.toml` | ✅ `8rzMmrC6UH5gCringWk1NsRXtfWkrfjz91tT5dmEGAep` — deployed to Devnet 2026-04-19 |

---

## Build Status

**Compiles, tested, and deployed to Devnet via GitHub Actions CI/CD.** `contract/target/deploy/code_eternal_router.so` produced.
Program ID: `8rzMmrC6UH5gCringWk1NsRXtfWkrfjz91tT5dmEGAep` (deployed 2026-04-19, CI/CD auto-redeploys on `contract/**` push)

### Compiler Warnings

Both known warnings suppressed (2026-05-12):
- `ambiguous_glob_reexports` — `#![allow(ambiguous_glob_reexports)]` added to `instructions/mod.rs`. Glob re-exports cannot be replaced with explicit re-exports — Anchor's `#[program]` macro requires the `__client_accounts_*` generated types to be visible via `pub use X::*`.
- `unexpected_cfgs` — `#![allow(unexpected_cfgs)]` added to `lib.rs` (Anchor 0.30.1 + Rust 1.89 issue from macro expansion)

---

## Build Environment Setup (WSL2 Ubuntu 22.04)

### One-time setup

```bash
# 1. System dependencies
sudo apt-get update && sudo apt-get install -y build-essential

# 2. Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source ~/.cargo/env

# 3. Solana CLI (latest stable)
curl -sSfL https://release.anza.xyz/stable/install -o /tmp/sol.sh && bash /tmp/sol.sh
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# 4. Generate a local keypair (needed for provider.wallet in Anchor.toml)
solana-keygen new --no-bip39-passphrase -o ~/.config/solana/id.json

# 5. Anchor CLI via AVM
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install 0.30.1 && avm use 0.30.1

# 6. Download and extract platform-tools v1.52 (Rust 1.89)
#    Needed because Solana 3.1.x bundles a corrupt tarball on some systems
curl -fsSL "https://github.com/anza-xyz/platform-tools/releases/download/v1.52/platform-tools-linux-x86_64.tar.bz2" -o ~/platform-tools-v1.52.tar.bz2
mkdir -p ~/sbf-sdk/dependencies/platform-tools
tar -xjf ~/platform-tools-v1.52.tar.bz2 -C ~/sbf-sdk/dependencies/platform-tools

# Copy scripts from the Solana install into sbf-sdk
SOLANA_SDK=$(echo ~/.local/share/solana/install/active_release/bin/platform-tools-sdk/sbf)
mkdir -p ~/sbf-sdk/scripts
cp "$SOLANA_SDK/scripts/"* ~/sbf-sdk/scripts/
cp "$SOLANA_SDK/env.sh" ~/sbf-sdk/

# Verify
~/.cargo/bin/anchor --version   # anchor-cli 0.30.1
solana --version                # solana-cli 3.1.x
```

### Build command

```bash
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
cd ~/code-eternal/contract   # Cargo.toml and Anchor.toml are inside contract/
cargo-build-sbf --sbf-sdk ~/sbf-sdk --skip-tools-install
```

Output: `contract/target/deploy/code_eternal_router.so`

### Deploy to Devnet (manual)

```bash
cd ~/code-eternal/contract
solana config set --url devnet
solana program deploy \
  --program-id 8rzMmrC6UH5gCringWk1NsRXtfWkrfjz91tT5dmEGAep \
  --keypair ~/.config/solana/id.json \
  target/deploy/code_eternal_router.so
```

**CI/CD auto-deploys:** push to `contract/**` on main → GitHub Actions builds, tests on localnet, deploys to devnet.

---

## Hackathon Checklist (deadline May 11, 2026)

```
Infrastructure + Smart Contract
  ✅ WSL2: Rust + Solana CLI + Anchor 0.30.1 installed
  ✅ Smart contract compiles (code_eternal_router.so produced)
  ✅ Replace placeholder pubkeys (ECOSYSTEM_FUND_WALLET, BACKEND_AUTHORITY)
  ✅ anchor deploy --provider.cluster devnet (Program ID: 8rzMmrC6UH5gCringWk1NsRXtfWkrfjz91tT5dmEGAep)
  ✅ TIER_1_AMOUNT = $15 (was $10 — fixed 2026-04-29)
  ✅ Docker images build (listener, site-gen, app — node:24-alpine, ARM64)
  ✅ Hetzner CAX11 VM provisioned (128.140.0.118, Ubuntu 24.04, ARM64)
  ✅ 3 containers running on VM (listener, site-gen, nginx) — app moved to Vercel 2026-05-09
  ✅ Docker Hub private repos (maxshchuplov/code-eternal-*)
  ✅ Privy App ID configured (cmoofvdt4008o0cjps5l8nvnu), Google login enabled
  ✅ Point Cloudflare DNS A records to 128.140.0.118
  ✅ Run certbot for SSL (cert at /etc/letsencrypt/live/app.codeofdigitaleternity.com/, expires 2026-07-31)
  ✅ Update nginx.conf for HTTPS, embedded wallets re-enabled (createOnLogin: "users-without-wallets")
  ✅ Helius webhook configured (HELIUS_WEBHOOK_SECRET set in dashboard + credentials.env, 2026-05-06)

Smart Contract Tests
  ✅ All 6 Anchor tests green (localnet CI):
       register_user: success + rejects self-referral
       process_payment: no referrals (vault/eco/burn split) + 3 referrals
       update_site_url: backend sets URL + rejects unauthorized signer
  ✅ GitHub Actions CI/CD: anchor-deploy.yml builds → tests → deploys to devnet

Frontend (Pipeline 2.x — Days 2-3)
  ✅ Next.js 14 app/ created (Pages Router, Tailwind, Privy, purple theme)
  ✅ Pipeline 2.1: Login page — "Enter the Family" → Google → /cabinet
  ✅ Pipeline 2.2: /cabinet — three tier cards ($15/$100/$1000) with auth guard
  ✅ Create Neon DB tables (users, referral_payments, burn_events, site_generation_jobs, applications_1000) — run app/scripts/migrate.sql via app/scripts/run-migration.js
  ✅ Confirm login flow works end-to-end in browser (Google login → /cabinet, HTTPS)

Backend + Payment (Pipeline 3.x — Days 4-7)
  ✅ Pipeline 3.1: /cabinet/buy — single-click flow: auto-airdrop USDC if needed → register_user → process_payment (all tiers)
  ✅ Pipeline 3.2: /api/users/register + /api/referrals/chain (Neon pg)
  ✅ Pipeline 3.3: listener → Resend email on PaymentProcessed (HTML email; PDF is post-hackathon)

Site + NFT (Pipeline 4.x — Days 8-11)
  ✅ Pipeline 4.1: auto site-gen on payment (Arweave + on-chain URL + cabinet status panel; Cloudflare subdomain post-hackathon)
  ✅ Pipeline 4.x: full cabinet redesign — 7 tabs live (Cabinet, AIfa Terminal, Games, DAO, Site, Smart Contract, Metrics)
  ✅ Pipeline 4.x: AIfa chat — real Grok API (grok-3-mini), CODE ETERNAL system prompt, conversation history
  ✅ Pipeline 4.x: Site tab — user fills username/bio/manifesto/social → POST /api/site/create → real Arweave site (button gated on tier > 0)
  ✅ Pipeline 4.x: Site tab avatar upload — client-side canvas resize+JPEG compression, base64 embedded in HTML, 95KB Arweave free-tier guard
  ✅ Pipeline 4.x: Privy login modal logo configured (app/public/logo.png)
  □  Pipeline 4.2: cNFT Guardian Passport mint (Metaplex Bubblegum)

Widgets + Bots (Pipeline 5.x — Days 12-13)
  ✅ Pipeline 5.1: /api/referrals/income — earnings by level + locked income (expires param) — route done; UI widget in cabinet
  □  Pipeline 5.2: BurnCounter + /api/stats/burned
  □  Pipeline 5.3: /cabinet/apply-1000 form + email to architect
  □  Pipeline 5.4: Telegram bot (Grammy) — referral push notifications

Final (Days 14-15)
  □  Open GitHub repo public (May 9)
  □  README.md for judges
  □  Record 2 videos (demo + pitch)
  □  Submit on Colosseum (May 10, before 23:59)
```

---

## Hetzner Infrastructure

```
Hetzner CAX11   ARM64 (Ampere), Ubuntu 24.04, 4GB RAM, 2 vCPU — ~$5/month
                IP: 128.140.0.118
                Path: /opt/code-eternal/
                Docker Compose: app/docker/docker-compose.yml

Services (Docker Compose) — 3 containers only, app is on Vercel:
  listener      Helius webhook handler       port 3001 (internal)
  site-gen      Arweave site generator       port 3002 (internal)
  nginx         Reverse proxy                ports 80:80, 443:443 (public)

nginx routing:
  /webhook/  → listener:3001   (Helius webhooks)
  /jobs      → site-gen:3002   (Vercel calls this; auth via SITE_GEN_SECRET Bearer token)
  /health    → site-gen:3002   (health check)

DNS (Cloudflare):
  app.codeofdigitaleternity.com      → Vercel (CNAME, proxy off) ← Next.js app
  listener.codeofdigitaleternity.com → 128.140.0.118 (A record, proxy off)

Image registry: Docker Hub (maxshchuplov/code-eternal-*)
Database: Neon PostgreSQL (external, connection string in .env)

VM .env file: /opt/code-eternal/.env — persists between CI/CD deployments, never overwritten by GitHub Actions
GitHub Actions secrets required: DOCKERHUB_USERNAME, DOCKERHUB_TOKEN, VM_SSH_KEY
```

### VM Setup

```bash
# Run app/scripts/setup-vm.sh on fresh Ubuntu 24.04 as root (installs Docker + certbot)
scp app/scripts/setup-vm.sh root@128.140.0.118:/tmp/
ssh root@128.140.0.118 bash /tmp/setup-vm.sh

# Copy files
scp secrets/credentials.env root@128.140.0.118:/opt/code-eternal/.env
scp app/docker/docker-compose.yml app/docker/nginx.conf root@128.140.0.118:/opt/code-eternal/docker/

# Start
ssh root@128.140.0.118 'cd /opt/code-eternal && docker login -u maxshchuplov && docker compose -f docker/docker-compose.yml up -d'
```

### SSL Setup (after DNS is pointed)

```bash
ssh root@128.140.0.118
certbot certonly --standalone -d app.codeofdigitaleternity.com -d listener.codeofdigitaleternity.com
# Then update nginx.conf with HTTPS config and restart nginx container
```

### Redeploy App After Code Change

```bash
# From WSL — build ARM64 image and push
# IMPORTANT: use --no-cache when Next.js source content changes (webpack cache baked in at build time)
cd /mnt/c/Users/Maksim/projects/code-eternal
docker buildx build --platform linux/arm64 --no-cache \
  --build-arg NEXT_PUBLIC_PRIVY_APP_ID=cmoofvdt4008o0cjps5l8nvnu \
  --build-arg NEXT_PUBLIC_USDC_MINT=5f76mcT9Cgo8oRfWDnsHnZjj9ZqvjcqaXPcrEMEbQsy5 \
  --build-arg NEXT_PUBLIC_PROGRAM_ID=8rzMmrC6UH5gCringWk1NsRXtfWkrfjz91tT5dmEGAep \
  --build-arg NEXT_PUBLIC_RPC_URL=https://devnet.helius-rpc.com/?api-key=<HELIUS_API_KEY> \
  -t maxshchuplov/code-eternal-app:latest --push ./app

# Pull and restart on VM
ssh root@128.140.0.118 'cd /opt/code-eternal && docker compose -f docker/docker-compose.yml pull app && docker compose -f docker/docker-compose.yml up -d app && docker exec docker-nginx-1 nginx -s reload'
```

### Redeploy Listener or Site-Gen After Code Change

```bash
# Listener
docker buildx build --platform linux/arm64 --no-cache \
  -t maxshchuplov/code-eternal-listener:latest --push ./app/listener
ssh root@128.140.0.118 'cd /opt/code-eternal && docker compose -f docker/docker-compose.yml pull listener && docker compose -f docker/docker-compose.yml up -d listener'

# Site-gen
docker buildx build --platform linux/arm64 --no-cache \
  -t maxshchuplov/code-eternal-site-gen:latest --push ./app/site-gen
ssh root@128.140.0.118 'cd /opt/code-eternal && docker compose -f docker/docker-compose.yml pull site-gen && docker compose -f docker/docker-compose.yml up -d site-gen'
```

---

## Devnet One-Time Setup (Mock USDC)

Before the buy flow works, run this once from WSL to create the mock USDC token:

```bash
cd /mnt/c/Users/Maksim/projects/code-eternal/app
node scripts/setup-devnet.js
```

This creates:
- A new mock USDC mint (6 decimals) — payer is `~/.config/solana/id.json`
- A dedicated mint authority keypair (separate from backend authority)
- Vault ATA (PDA authority, `allowOwnerOffCurve = true`)
- Ecosystem fund ATA

✅ **Already run (2026-05-06).** Generated values (saved in credentials.env):
- `NEXT_PUBLIC_USDC_MINT=5f76mcT9Cgo8oRfWDnsHnZjj9ZqvjcqaXPcrEMEbQsy5`
- `MOCK_USDC_MINT=5f76mcT9Cgo8oRfWDnsHnZjj9ZqvjcqaXPcrEMEbQsy5`
- `MOCK_USDC_MINT_AUTHORITY` — base64 keypair, stored in credentials.env
- Mint authority pubkey: `9NJhwafwj7HSHAj4fvgkmsPqFRT4PFtyqtnvS9ERf2Sv`

Docker images rebuilt with `--build-arg NEXT_PUBLIC_USDC_MINT=5f76mcT9Cgo8oRfWDnsHnZjj9ZqvjcqaXPcrEMEbQsy5` and deployed.

To re-run (only needed if Devnet resets or mint is lost):
```bash
# Run from WSL Linux filesystem (not /mnt/c — npm permissions issue)
mkdir -p ~/devnet-setup && cp /mnt/c/Users/Maksim/projects/code-eternal/app/scripts/setup-devnet.js ~/devnet-setup/
cd ~/devnet-setup && npm install @solana/web3.js @solana/spl-token && node setup-devnet.js
```

### Neon DB Migration

✅ **Already run (2026-05-07).** All tables exist: `users`, `referral_payments`, `burn_events`, `site_generation_jobs` (with `error_message` column), `applications_1000`.

To run migration (if tables are lost or DB is reset):
```bash
cd /mnt/c/Users/Maksim/projects/code-eternal/app/scripts
npm install pg   # one-time
node run-migration.js   # runs app/scripts/migrate.sql against Neon
```

---

## Docker Images

All images are ARM64 (linux/arm64), built with `docker buildx` + QEMU in WSL2.

| Image | Base | Registry |
|-------|------|----------|
| `maxshchuplov/code-eternal-app` | node:24-alpine | Docker Hub (private) |
| `maxshchuplov/code-eternal-listener` | node:24-alpine | Docker Hub (private) |
| `maxshchuplov/code-eternal-site-gen` | node:24-alpine | Docker Hub (private) |

**Key decisions:**
- Node 24 — required by `@solana/codecs` and other deps
- `apk add python3 make g++` in Dockerfile — needed for node-gyp (bufferutil etc.) on ARM64
- `NEXT_PUBLIC_*` vars baked in at build time via `--build-arg` (Next.js requirement)
- SQS replaced with direct HTTP POST: listener calls `POST site-gen:3002/jobs`
- **Always use `--no-cache`** when rebuilding app image after source changes — Next.js webpack cache (`/app/.next/cache/webpack/`) gets baked into the image and stale content is served even after code changes
- `app/.dockerignore` excludes `.next`, `node_modules`, `out`, `build`, `.git` — prevents stale webpack cache from entering the Docker build context via `COPY . .`
- `npm install` for WSL scripts must run on Linux filesystem (`~/`), NOT `/mnt/c/` — NTFS permission issues cause failures

---

## Secrets Management

All secrets stored locally in `secrets/credentials.env` (gitignored).
**When any new secret or keypair is generated, save it there immediately.**

On the VM: `/opt/code-eternal/.env` — same variables, manually copied.
No AWS Secrets Manager (AWS infrastructure removed).

---

## Environment Variables Required

| Service | Variable | Description |
|---------|----------|-------------|
| listener, site-gen | `HELIUS_RPC_URL` | Helius RPC endpoint with API key |
| listener | `HELIUS_WEBHOOK_SECRET` | Helius webhook auth token — verifies POST /webhook/helius |
| listener, site-gen | `PROGRAM_ID` | `8rzMmrC6UH5gCringWk1NsRXtfWkrfjz91tT5dmEGAep` |
| listener, site-gen | `DATABASE_URL` | Neon PostgreSQL connection string — see `secrets/credentials.env` |
| listener | `SITE_GEN_URL` | `http://site-gen:3002` (Docker internal, set in docker-compose.yml) |
| listener | `RESEND_API_KEY` | From resend.com — email delivery |
| site-gen | `IRYS_PRIVATE_KEY` | ✅ Set — base58 keypair (pubkey: `8NpeaoihGbipm7pNPHDMAu8ASXt6tBXZsuLoT9oYWM4X`, balance: 1.5 devnet SOL as of 2026-05-07) |
| site-gen | `BACKEND_PRIVATE_KEY` | Backend authority keypair (base64) — same key as BACKEND_AUTHORITY on-chain |
| Next.js (app) | `NEXT_PUBLIC_PRIVY_APP_ID` | `cmoofvdt4008o0cjps5l8nvnu` — baked in at Docker build time |
| Next.js (app) | `NEXT_PUBLIC_RPC_URL` | Helius RPC (public key OK in browser) |
| Next.js (app) | `NEXT_PUBLIC_PROGRAM_ID` | Deployed contract address |
| Next.js (app) | `NEXT_PUBLIC_USDC_MINT` | Mock USDC mint address (devnet) — baked in at Docker build time via `--build-arg` |
| Next.js (app) | `MOCK_USDC_MINT` | Same as above, server-side only (for airdrop endpoint) |
| Next.js (app) | `MOCK_USDC_MINT_AUTHORITY` | Base64 keypair that has mint authority over mock USDC (for devnet airdrop) |
| Next.js (app) | `DATABASE_URL` | Neon connection string (server-side API routes only) |
| Next.js (app) | `GROK_API_KEY` | xAI Grok API key — used by `/api/chat.ts` for AIfa chat (model: `grok-3-mini`) |
| Next.js (app) | `SITE_GEN_URL` | `https://listener.codeofdigitaleternity.com` — Vercel calls VM nginx which routes to site-gen |
| Next.js (app) | `SITE_GEN_SECRET` | Bearer token — must match VM .env value; sent in Authorization header to /jobs |
| listener, site-gen | `SITE_GEN_SECRET` | `2c0bbd515501b5e86600e1ce9acd877dd5b9bab4db7575d6401f2ae18a2ef18a` — set in VM .env |
| listener | `RESEND_API_KEY` | `re_Lu1RDMiD_54YM5zVRfyNFRYy5hDDPZWHF` — set in VM .env |
| GitHub Actions (anchor-deploy.yml) | `BACKEND_PRIVATE_KEY` | Base64 private key of `96JwAJL2...` — for test runner to sign update_site_url txs |
| GitHub Actions (anchor-deploy.yml) | `DEPLOY_KEYPAIR` | JSON array of upgrade authority keypair (`7GJm1GVk...`) — for `solana program deploy` |

---

## Frontend — Architecture & Status

**Stack:** Next.js 16 (App Router), React 19, Tailwind, Solana Web3.js, Anchor, Privy.io
**Source:** `app/` directory → Vercel (auto-deploy on push to main)
**URL:** `https://app.codeofdigitaleternity.com` ✅ Live on Vercel (2026-05-09)
**Theme:** Dark purple (#7C3AED accent, #0A0A0F background)

### Key Architecture Decisions

| Decision | Reason |
|----------|--------|
| App Router (migrated 2026-05-11) | Next.js 16 default; all pages use `'use client'` + `useRouter` from `next/navigation` |
| `turbopack: {}` in next.config.js | Next.js 16 uses Turbopack by default; `turbopack: {}` silences webpack/turbopack conflict warning |
| Neon PostgreSQL everywhere | Same pg Pool used by listener and Next.js API routes |
| MoonPay via Privy `useFundWallet` | No Stripe; card → USDC directly to embedded wallet |
| Helius webhooks in listener | More reliable than `connection.onLogs()` WebSocket |
| `toSolanaWalletConnectors` in `useMemo` | Prevents SSR crash — browser-only API |
| `NEXT_PUBLIC_*` from Vercel env | Next.js bakes these at build time; set via `vercel env add` |
| Next.js on Vercel (2026-05-09) | Auto-deploy, no ARM64 QEMU build needed, faster CI/CD; VM now runs listener+site-gen+nginx only |
| Direct HTTP listener→site-gen | Simpler than SQS for single-VM setup; no AWS dependency |
| Vercel SITE_GEN_URL = https://listener.codeofdigitaleternity.com | site-gen /jobs is publicly exposed via nginx; protected by SITE_GEN_SECRET Bearer token |
| `.transaction()` + `wallet.sendTransaction()` instead of Anchor `rpc()` | Anchor's `rpc()` is incompatible with Privy embedded wallets — throws "Expected Buffer". Must build tx manually, set `recentBlockhash`/`feePayer`, then call Privy's `sendTransaction`. Provider is created with empty wallet `{}` (read-only). |
| `createWallet()` called in `useEffect` on cabinet + buy pages | `createOnLogin: "off"` — Solana wallet must be explicitly created via `useSolanaWallets().createWallet()` |
| `next/dynamic(..., { ssr: false })` for cabinet + buy pages | `force-dynamic` does NOT prevent SSR in App Router — Privy hooks crash during SSR. Must use `next/dynamic` with `ssr: false` to truly skip server rendering. |
| `chain: "solana:devnet"` in `signAndSendTransaction` | Privy 3.x embedded wallets default to `solana:mainnet` — must pass chain explicitly or get "No RPC configuration found" error |

### File Structure

```
app/src/
├── app/
│   ├── layout.tsx            # Root layout — PrivyProvider (Google only, embedded wallets) ✅
│   ├── page.tsx              # Login page → redirects to /cabinet ✅
│   ├── globals.css           # Dark base (#0A0A0F), neutral sans-serif
│   ├── cabinet/
│   │   └── page.tsx          # Full cabinet: 7 tabs (Cabinet/AIfa/Games/DAO/Site/Contract/Metrics) ✅
│   └── api/
│       ├── users/register/route.ts          # POST — upsert user, generate ref_code ✅
│       ├── users/site-status/route.ts       # GET — site job status + arweave URL from DB ✅
│       ├── referrals/chain/route.ts         # GET — return ref1/ref2/ref3 wallets ✅
│       ├── referrals/income/route.ts        # GET — earnings + payment history (Pipeline 5.1) □
│       ├── devnet/airdrop-usdc/route.ts     # POST — mint 1100 test USDC to wallet ✅
│       ├── site/create/route.ts             # POST — UI-triggered site gen (checks tier, dispatches to site-gen) ✅
│       ├── chat/route.ts                    # POST — Grok API proxy for AIfa chat ✅
│       ├── stats/metrics/route.ts           # GET — burn count, tx count, wallets, treasury, history ✅
│       ├── stats/overview/route.ts          # GET — burnedUsdc, burnTxs, activeMembers, sitesCreated ✅
│       ├── stats/top-contributors/route.ts  # GET — top wallets by referral income ✅
│       ├── stats/recent-txns/route.ts       # GET — recent payment txs (excludes ui-regen jobs) ✅
│       ├── stats/burned/route.ts            # GET — total burn_events sum (Pipeline 5.2) □
│       └── webhooks/privy/route.ts          # POST — Privy webhook handler ✅
├── lib/
│   └── db.ts                 # Neon pg Pool with hot-reload guard ✅
├── idl/
│   └── code_eternal_router.ts  # Typed IDL for @coral-xyz/anchor ✅
└── (styles in app/globals.css)
```

### npm Dependencies (app/package.json)

```json
"@coral-xyz/anchor": "^0.30.1"
"@privy-io/react-auth": "^3.x"
"@solana/kit": "latest"
"@solana/web3.js": "^1.98.0"
"@solana/spl-token": "^0.4.9"
"nanoid": "^5.0.7"
"pg": "^8.13.0"
"resend": "^4.0.0"
"next": "^16.1.1"
"react": "^19.0.0"
"react-dom": "^19.0.0"
```

---

## Listener — Architecture & File Structure

**Service:** `app/listener/` → Docker image `maxshchuplov/code-eternal-listener` → port 3001
**Entry:** `app/listener/src/index.ts` — Express app, single POST `/webhook/helius`

### Helius Webhook Format (Enhanced Transactions)

Helius sends an array of enhanced transaction objects. Our listener processes `UNKNOWN` type events and checks for our program ID inside `event.instructions[].programId` (NOT top-level `event.programId`):

```typescript
const hasOurProgram =
  event.instructions?.some((ix: any) => ix.programId === programIdStr) ||
  event.programId === programIdStr;
```

Payer wallet: `rawEvent.feePayer` (top-level field in Helius enhanced tx)

### UserState Tier Decoding

On-chain `UserState` binary layout for tier extraction from raw account data:
```
[0..7]   discriminator (8 bytes)
[8..39]  owner Pubkey (32 bytes)
[40]     referrer Option flag: 0=None, 1=Some
[41..72] referrer Pubkey (32 bytes, only if flag=1)
[41 or 73] tier (u8) — at 41 if no referrer, at 73 if referrer present
```

```typescript
function decodeTier(data: Buffer): number {
  const hasReferrer = data[40] === 1;
  return data[hasReferrer ? 73 : 41];
}
```

### Listener File Structure

```
app/listener/src/
├── index.ts              # Express app, /webhook/helius route, auth check
├── handlers/
│   └── onPaymentProcessed.ts  # Main handler: DB writes, email, site-gen dispatch
└── package.json          # deps: express, pg, @solana/web3.js, bs58, resend
```

### onPaymentProcessed Flow

1. Parse `feePayer` from `rawEvent.feePayer` → payer wallet
2. Decode tier from on-chain UserState binary (see above)
3. Write `burn_events` row (5% of payment)
4. Write `referral_payments` rows for each referral level present
5. Upsert `users.tier` for payer wallet
6. Send HTML email via Resend (dynamic import)
7. Check `site_generation_jobs` for existing row (deduplication by tx_signature)
8. Insert job row; if wallet already has a `done` job → mark new job done with existing URL, skip site-gen dispatch
9. If no existing done job (first payment) → HTTP POST to `site-gen:3002/jobs`

---

## Site-Gen — Architecture & File Structure

**Service:** `app/site-gen/` → Docker image `maxshchuplov/code-eternal-site-gen` → port 3002
**Entry:** `app/site-gen/src/index.ts` — Express app, single POST `/jobs`

**Irys node:** `https://devnet.irys.xyz` (matches Solana devnet) — mainnet will use `https://node2.irys.xyz`
**Irys URL format:** devnet Irys now returns CDN URLs (`https://<hash>.devnet-1.datasprite-cdn.com/<TX_ID>`). The TX ID is the last path segment — that's what gets stored on-chain (64-byte field). The full URL is stored in `site_generation_jobs.arweave_url` (text column).
**UpdateCooldown handling:** `update_site_url` on-chain enforces 60s cooldown. `site-gen/src/index.ts` catches `UpdateCooldown` error and retries once after 70s via `updateSiteUrlOnChainWithCooldownRetry()`.
**Irys wallet:** `8NpeaoihGbipm7pNPHDMAu8ASXt6tBXZsuLoT9oYWM4X` — must have devnet SOL to connect
**Re-fund if needed:** `solana transfer 8NpeaoihGbipm7pNPHDMAu8ASXt6tBXZsuLoT9oYWM4X 0.5 --url devnet --allow-unfunded-recipient`

### Site-Gen File Structure

```
app/site-gen/
├── src/
│   ├── index.ts              # Express /jobs endpoint — reads job from DB, calls generateAndDeploy
│   ├── templates/
│   │   └── site.html         # Handlebars template — standalone dark HTML, no external deps
│   └── utils/
│       ├── arweave.ts        # generateAndDeploy(): compile template, upload Irys, return TX ID
│       └── solana.ts         # updateSiteUrl(): calls update_site_url on-chain via Anchor
├── idl/
│   └── code_eternal_router.json  # JSON IDL required by solana.ts (anchor.Program constructor)
└── package.json              # deps: express, @irys/sdk, @coral-xyz/anchor, handlebars, pg
```

### Handlebars Template Variables

`site.html` uses:
- Required: `{{name}}`, `{{wallet}}`, `{{walletShort}}`, `{{tier}}`, `{{tierColor}}`, `{{txSignature}}`, `{{registeredAt}}`, `{{year}}`
- Optional (UI-provided): `{{username}}`, `{{bio}}`, `{{manifesto}}`, `{{telegram}}`, `{{twitter}}`, `{{website}}`, `{{hasSocial}}`, `{{avatarDataUrl}}`
- If `bio` and `manifesto` are both absent, a default "Memory Scroll" paragraph is shown.
- `hasSocial` is computed in `arweave.ts` as `!!(telegram || twitter || website)`.
- `avatarDataUrl` — base64 JPEG data URL (max ~80KB); when present, renders as `<img class="avatar">` instead of diamond sigil. Arweave.ts enforces 95KB total HTML limit.

Tier colors:
- Tier 1 (Spark): `#7C3AED`
- Tier 2 (Family Archives): `#D4A24C`
- Tier 3 (Digital DNA): `#10B981`

### update_site_url Account Names (must match Rust contract)

```typescript
.accounts({
  backendAuthority: backendKeypair.publicKey,  // matches backend_authority in Rust
  userState: userStatePda,
  userWallet: userWallet,                       // matches user_wallet in Rust
})
```

---

## Cabinet — Tab Architecture

`/cabinet` (index.tsx) renders 7 tabs in a single-page component. All tabs are unlocked.

| Tab | ID | Content |
|-----|-----|---------|
| Cabinet | `cabinet` | Tier cards, site status panel, referral link, income widget, top contributors, recent txns |
| AIfa Terminal | `alfa` | Chat UI backed by `/api/chat` (Grok API, model `grok-3-mini`, CODE ETERNAL system prompt) |
| Games | `games` | Chess board (8×8, Unicode pieces, white vs "AI" — AI just re-enables white turn after 1s), move history |
| DAO | `dao` | 3 hardcoded governance proposals, For/Against voting in local state, stats row |
| Site | `site` | Form (username, display name, bio, manifesto, avatar placeholder, social links) + live preview panel. POST `/api/site/create` on submit. Button disabled when tier=0, subscription expired, or creating. |
| Smart Contract | `contract` | Distribution visualization (5/15/7/3/5/65), PDA architecture table, real Program ID |
| Metrics | `metrics` | 6 stat cards (burn, txns, wallets, treasury, avg fee, slot), SVG burn sparkline, SVG payment donut, event feed |

**Key state for Site tab:**
- `siteCreating` — disables button + shows "⏳ Generating..."
- `siteError` — shows red error message below button
- On success: `setSiteStatus({ status:"pending", tier })` then `setActiveTab("cabinet")`
- Cabinet polls `/api/users/site-status` every 5s while `status === "pending"` — auto-updates to done/error without page refresh

---

## Deployment

### Next.js App (Vercel)
Vercel auto-deploys on every push to `main`. No manual steps needed.

To force a redeploy via API:
```bash
TOKEN=<your-vercel-token>   # generate at vercel.com/account/tokens — do NOT commit real tokens
curl -s -X POST "https://api.vercel.com/v13/deployments?teamId=team_iNXQxvTVpuw5xoVdOQKhevnD" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"app.codeofdigitaleternity.com","project":"prj_DrlUafVTqw3AGdxG8wiLrr92RG1r","gitSource":{"type":"github","repoId":1211486674,"ref":"main"}}'
```

To manage Vercel env vars:
```bash
cd /mnt/c/Users/Maksim/projects/code-eternal/app
# app/.vercel/project.json links to app.codeofdigitaleternity.com
vercel env ls production
echo "value" | vercel env add VAR_NAME production --yes
```

### Listener + Site-Gen (GitHub Actions → VM)
Push to `main` touching `app/listener/**`, `app/site-gen/**`, or `app/docker/**` triggers CI/CD automatically.

Manual build + deploy from WSL (use `wsl -e bash -c "..."` from Bash tool):
```bash
# Listener
wsl -e bash -c "cd /mnt/c/Users/Maksim/projects/code-eternal && docker buildx build --platform linux/arm64 --no-cache \
  -t maxshchuplov/code-eternal-listener:latest --push ./app/listener"

# Site-gen
wsl -e bash -c "cd /mnt/c/Users/Maksim/projects/code-eternal && docker buildx build --platform linux/arm64 --no-cache \
  -t maxshchuplov/code-eternal-site-gen:latest --push ./app/site-gen"

# Deploy on VM
wsl -e bash -c "ssh root@128.140.0.118 'cd /opt/code-eternal && docker compose -f docker/docker-compose.yml pull && docker compose -f docker/docker-compose.yml up -d'"
```

### Adding env vars to VM .env
```bash
wsl -e bash -c "ssh root@128.140.0.118 'echo \"KEY=value\" >> /opt/code-eternal/.env'"
# Then force-recreate the container that needs it:
wsl -e bash -c "ssh root@128.140.0.118 'cd /opt/code-eternal && docker compose -f docker/docker-compose.yml up -d --force-recreate listener site-gen'"
```
Note: VM .env is never overwritten by CI/CD — it persists between deploys.

---

## Language Rule

**All user-facing text in the app must be in English.** No Russian words anywhere in the UI — buttons, labels, tier names, descriptions, titles, loading states, tooltips. This applies to all pages: index, cabinet, buy, create-site, apply-1000, and any future pages.

---

## Known Issues (post-hackathon backlog)

- `UrlTooLong` error is reused for invalid site status — add `InvalidSiteStatus` variant post-hackathon
- `SITE_STATUS_PENDING` constant declared but not used in constraints
- Burn works only with a token where we hold mint authority — for production USDC a different burn mechanism is needed
- ~~Cloudflare subdomain wired~~ ✅ — `username.codeofdigitaleternity.com` live via Worker proxy (see Changes 2026-05-10)
- Grammy Telegram bot not yet implemented — add `TELEGRAM_BOT_TOKEN` to credentials.env when ready
- PDF email attachment (post-hackathon) — current Resend email is HTML only
- **Tier downgrade on renewal**: when subscription is expired (`clock.unix_timestamp > tier_expires`), any tier is accepted (allows buying tier 1 after being tier 3 and expiring). When active, `tier >= current_tier` is enforced. This is the current correct behavior.
- **L3 referrer expiry not enforced on-chain** — ref3 always gets paid regardless of their subscription status (would require a 3rd remaining_account; skipped for simplicity)
- **In-memory rate limiter not shared across Vercel instances** — each serverless instance has its own `Map`; replace with Redis/Upstash for true global rate limiting in production
- **`/health` endpoint leaks internal service names** — site-gen should return just `{"ok":true}` instead of a descriptive message

## Changes Applied (2026-05-11, Privy 3.x + Site-Gen fixes)

- **Privy 3.x migration** — upgraded `@privy-io/react-auth` to 3.x. Key API changes:
  - `config.solanaClusters` → `config.solana.rpcs` using `createSolanaRpc`/`createSolanaRpcSubscriptions` from `@solana/kit`
  - `signAndSendTransaction` now requires `chain: "solana:devnet"` — without it Privy defaults to `solana:mainnet` and throws "No RPC configuration found"
  - `toSolanaWalletConnectors` import moved to `@privy-io/react-auth/solana`
- **SSR fix for cabinet + buy pages** — `export const dynamic = 'force-dynamic'` does NOT prevent SSR in Next.js App Router. Fix: `export default dynamic(() => Promise.resolve({ default: PageComponent }), { ssr: false })` using `next/dynamic`. Without this, Privy hooks crash during SSR with "useWallets was called outside the PrivyProvider".
- **CSP updated** — added `https://fonts.googleapis.com` to `style-src` and `https://fonts.gstatic.com` to `font-src` (Privy 3.x loads Inter from Google Fonts).
- **site-gen cooldown retry** — `update_site_url` on-chain has a 60s cooldown. If two site-gen jobs fire within 60s (e.g. payment job + UI regen), the second hits `UpdateCooldown`. Fixed: `updateSiteUrlOnChainWithCooldownRetry()` catches `UpdateCooldown`, waits 70s, retries once.
- **retry-site-url.js** — fixed hardcoded `arweave.net` prefix; now uses `IRYS_BASE_URL` env var (defaults to `https://devnet.irys.xyz`).
- **arweave_url column widened** — `site_generation_jobs.arweave_url` was `varchar(100)`; Irys CDN URLs are 129+ chars. Widened to `text`.
- **Irys CDN URL format** — Irys devnet now returns `https://<hash>.devnet-1.datasprite-cdn.com/<TX_ID>` instead of `https://devnet.irys.xyz/<TX_ID>`. Both formats work; the TX ID is still the last path segment and is stored on-chain.
- **Listener: skip site-gen if user already has a site** — payment webhooks used to always dispatch a new (default) site, overwriting any custom site the user had created. Fix: if the wallet already has a `done` job in `site_generation_jobs`, the new job is immediately marked done with the existing `arweave_url` — no site-gen dispatch. First-time payment still generates a default site.
- **DB: site custom fields saved to users table** — `site_bio`, `site_manifesto`, `site_telegram`, `site_twitter`, `site_website` columns added to `users`. `/api/site/create` persists these via `COALESCE` (only updates non-null fields) so future UI regenerations preserve the user's last saved values.
- **Neon PostgreSQL schema updated**:
  - `users` table: added `site_bio text`, `site_manifesto text`, `site_telegram varchar(32)`, `site_twitter varchar(15)`, `site_website varchar(256)`
  - `site_generation_jobs.arweave_url`: widened from `varchar(100)` to `text`
- **`add-site-columns.js`** — migration script at `app/scripts/add-site-columns.js` (already run against Neon).
- **tsconfig.json** — updated for Next.js 16: `moduleResolution: "bundler"`, `jsx: "react-jsx"`, plugins `[{ "name": "next" }]`.
- **next.config.js** — removed `eslint` block (not supported in Next.js 16); kept `turbopack: {}`.

## Changes Applied (2026-05-13, Cloudflare Worker Passport)

- **`cloudflare/worker-passport.js`** — transparent reverse proxy: `username.codeofdigitaleternity.com` fetches Arweave URL from `/api/site/by-username`, proxies HTML back to browser (no redirect). Skip list: `app`, `listener`, `www`, `api`. DB lookup: always fresh (no cache) so new site versions show immediately. Irys HTML: cached 1 h (content at a TX ID never changes).
- **`cloudflare/wrangler.toml`** — wrangler config with `routes = [{ pattern = "*.codeofdigitaleternity.com/*", zone_name = "codeofdigitaleternity.com" }]` so CI deploys to the zone route, not workers.dev.
- **`.github/workflows/deploy-worker.yml`** — CI/CD for Worker: triggers on `cloudflare/**` push, uses `cloudflare/wrangler-action@v3`. GitHub secrets required: `CF_API_TOKEN`, `CF_ACCOUNT_ID`.
- **`app/src/app/api/site/by-username/route.ts`** — GET endpoint: resolves `username` → `arweave_url` via Neon join `users + site_generation_jobs`.
- **`app/scripts/migrate.sql`** — added `username VARCHAR(32) UNIQUE` on users table + `idx_users_username` index.
- **`app/src/app/api/site/create/route.ts`** — persists `username` to `users.username` on site creation.
- **Cloudflare deployment** (deployed 2026-05-13 via API):
  - Worker: `code-eternal-passport` (Account Workers Scripts)
  - Route: `*.codeofdigitaleternity.com/*` → `code-eternal-passport`
  - DNS: `*.codeofdigitaleternity.com` A `192.0.2.1` proxied=true (wildcard, Cloudflare intercepts all)
  - Zone ID: `019326ccdeada010024836e8874077b2`
- **Per-subscription site regeneration limits** — Tier 1: 1, Tier 2: 5, Tier 3: 10 regenerations per subscription period. Counts only `ui-regen-*` jobs in window `[tier_expires - 30d, now]`. Enforced in `/api/site/create` (429 if exceeded) and surfaced in `/api/users/site-status` response (`regenCount`, `regenLimit`). Cabinet Site tab shows `X/Y updates used` badge (red when limit reached) and blocks the button with `🔒 Update limit reached` message.
- **Devnet USDC airdrop** — increased from 1,100 to 10,000 per new user (`airdrop-usdc/route.ts`). Rate limit raised to 20/min.
- **Rate limit bug fixed** — `rateLimit()` returns `null` (allowed) or `number` (blocked). `airdrop-usdc` and `chat` routes were using `!rateLimit()` which inverted the logic and blocked everyone. Fixed to `rateLimit() !== null`.
- **Cabinet site buttons** — "Open Passport →" (purple, subdomain link) + "View on Arweave →" (green, direct Irys link). Passport button only shown when `username` is set.
- **`/api/users/site-status`** — added `username` field to response (read from `users.username` in DB).
- **NFT passport card** — fixed height (`220px`) instead of `minHeight` to prevent resize on flip.

## Changes Applied (2026-05-12)

- **Compiler warnings suppressed** — `instructions/mod.rs`: added `#![allow(ambiguous_glob_reexports)]` — glob re-exports are required because Anchor's `#[program]` macro generates `__client_accounts_*` types that must be in scope via `pub use X::*`; removing globs causes E0432. `lib.rs`: added `#![allow(unexpected_cfgs)]` to suppress Anchor 0.30.1 + Rust 1.89 macro-generated `cfg(anchor-debug)` warning.
- **3-referrals CI test fix** — newly registered referrers have `tier_expires=0` which the new expiry check treated as inactive. Fix: ref2 and ref1 each buy tier 1 (as setup) before the main payer2 payment, making `ref1_active=true` and `ref2_active=true` so REF1_AMT/REF2_AMT flow to the correct accounts.

## Changes Applied (2026-05-11, Tier Expiry)

- **`tier_expires: i64` added to `UserState`** — new field after `registered_at`; shifts all subsequent binary offsets by +8. `register_user.rs` sets it to 0; `process_payment.rs` sets it to `clock.unix_timestamp + SUBSCRIPTION_DURATION` on payment.
- **`SUBSCRIPTION_DURATION = 30 * 24 * 60 * 60`** — 30-day subscription period in seconds, declared in `process_payment.rs`.
- **Expired referrer → vault** — `process_payment.rs` reads ref1 and ref2 `UserState` from `ctx.remaining_accounts` and checks `clock.unix_timestamp <= referrer.tier_expires`. Active → transfer, expired → vault (not burn), absent → burn.
- **Tier downgrade allowed on expiry** — if `clock.unix_timestamp > user_state.tier_expires`, any tier is accepted; otherwise `tier >= current_tier` enforced.
- **Binary layout updated everywhere** — `decodeUserState()` in tests, `decodeTier()` in listener, `readOnChainArweaveUrl()` in site-gen all updated to use `base + 9` offset for `tier_expires` and `base + 25` for `arweave_url`.
- **IDL updated** — `tier_expires: i64` field added to `UserState` in both `app/src/idl/code_eternal_router.ts` and `app/site-gen/idl/code_eternal_router.json`.
- **`/api/referrals/income` `?expires=` param** — accepts `expires=<unix_ts>`, splits `referral_payments` into earned (created_at ≤ expires) and locked (created_at > expires). Returns `{ l1, l2, l3, total, locked, recent }`.
- **Cabinet expiry UI** — reads `tier_expires` from on-chain `UserState` at load time; shows red expiry banner, "Xd left"/"Expired" badge on tier card, locked income ghost block, and blocks site creation when expired.
- **DB wiped** — all rows deleted from `users`, `site_generation_jobs`, `referral_payments`, `burn_events` to clear old on-chain account data incompatible with the new `UserState` layout.

## Changes Applied (2026-05-11, Security)

- **`/api/site/create` auth** — added Privy JWT verification via `@privy-io/server-auth`; server resolves the authenticated user's linked Solana wallet and rejects any request where the `wallet` body field doesn't match. Requires `PRIVY_APP_SECRET` env var (set in Vercel). Frontend sends `Authorization: Bearer <privy_token>` from `getAccessToken()`.
- **`/api/site/create` rate limit** — 5 requests per 10 min per IP added at handler entry.
- **HTML injection in email** — `displayName` is now HTML-escaped before embedding in the Resend confirmation email (`onPaymentProcessed.ts`).
- **`getIp()` IP spoofing** — `rateLimit.ts` now prefers `x-real-ip` (set by Vercel/nginx, not spoofable by the client) over `x-forwarded-for`.
- **HTTPS-only website URL** — `WEBSITE_RE` in `site/create/route.ts` changed from `https?://` to `https://`.
- **GIF removed from avatar types** — `AVATAR_RE` now allows only `jpeg`, `png`, `webp`.
- **`IRYS_BASE_URL` env var** — `readOnChainArweaveUrl()` in `site-gen/utils/solana.ts` now reads `IRYS_BASE_URL` env var (defaults to `https://devnet.irys.xyz`); set to `https://node2.irys.xyz` for mainnet.
- **On-chain tier downgrade prevention** — `process_payment.rs` now requires `tier >= user_state.tier`. See Known Issues for the subscription-renewal caveat.
- **On-chain referral chain enforcement** — `process_payment.rs` validates the full 3-level referral chain against on-chain `UserState` data: `ref1 == user_state.referrer`, `ref2 == ref1.referrer`, `ref3 == ref2.referrer`. Referrer UserState PDAs are passed as `ctx.remaining_accounts` (readonly, no IDL account change needed).
- **`register_user` now stores ref1 on-chain** — `buy/page.tsx` passes the actual `ref1` pubkey to `registerUser()` instead of `null`, so the on-chain referral chain is established at registration time.
- **`TierDowngrade` and `InvalidReferral` errors** — added to `errors.rs` and both IDL files.
- **Tests updated** — 3-referrals test now registers ref1/ref2/ref3 with proper chain (ref3←ref2←ref1←payer2) and passes `ref1Pda`/`ref2Pda` as `remainingAccounts`.

## Changes Applied (2026-05-11)

- **Next.js Pages Router → App Router migration** — deleted `app/src/pages/`; all routes now live under `app/src/app/` using App Router conventions (`layout.tsx`, `page.tsx`, `route.ts`). All page components marked `'use client'`; `useRouter` imported from `next/navigation`.
- **Next.js 16 upgrade** — `next` bumped to `^16.1.1`, `react`/`react-dom` to `^19.0.0`. `JSX.Element` → `React.ReactElement` (global JSX namespace removed in React 19).
- **`turbopack: {}`** — added to `next.config.js` to silence Turbopack/webpack conflict error on Vercel (Next.js 16 enables Turbopack by default).
- **`eslint: { dirs: ["src"] }`** — added to `next.config.js` so `next lint` finds the source directory correctly on Vercel.
- **Node.js engine pin** — `package.json` `engines.node` changed from `">=24"` to `"24.x"` to prevent Vercel from auto-upgrading to future major versions.
- **Recent transactions fix** — `api/stats/recent-txns/route.ts` now filters `WHERE tx_signature NOT LIKE 'ui-regen-%'` so UI-triggered site regenerations don't appear as payment transactions in the cabinet feed.

## Changes Applied (2026-05-10, Session 2)

- **Smart contract moved to `contract/`** — Anchor.toml, Cargo.toml, Cargo.lock, programs/, tests/ now in repo root `contract/` directory (best practice separation from app code)
- **GitHub Actions CI/CD for smart contract** — `.github/workflows/anchor-deploy.yml`: build with `cargo-build-sbf`, run 6 tests on localnet (`solana-test-validator --bpf-program` to preload compiled SO), deploy to devnet. Triggers on `contract/**` push. GitHub secrets: `BACKEND_PRIVATE_KEY`, `DEPLOY_KEYPAIR`
- **Anchor test suite** — `contract/tests/code_eternal_router.ts`: 6 tests covering register_user (success + self-referral), process_payment (no referrals + 3 referrals split verification), update_site_url (success + unauthorized). All 6 green in CI.
- **Listener: skip non-payment txs** — `app/listener/src/index.ts` now checks `event.tokenTransfers.length > 0` before calling `handlePaymentProcessed`. Skips `register_user` and `update_site_url` txs that were causing ghost Error jobs.
- **Telegram handle `@` strip** — `app/src/app/api/site/create/route.ts` strips leading `@` from telegram/twitter before validation (was rejecting `@handle` format)
- **Site-gen race condition fix** — `app/site-gen/src/index.ts`: if `updateSiteUrlOnChain` fails, waits 3s then reads on-chain state via `readOnChainArweaveUrl(walletAddress)`. If arweave URL already set (winner of concurrent jobs), marks job done without error
- **`readOnChainArweaveUrl()`** — new function in `app/site-gen/src/utils/solana.ts`: reads UserState PDA binary, decodes arweave_url field, returns full URL or null

## Changes Applied (2026-05-10, Session 1)

- **Privy login logo** — copied `web/public/images/code-logo.png` → `app/public/logo.png`; `_app.tsx` `appearance.logo` now points to `https://app.codeofdigitaleternity.com/logo.png`
- **Username field fix (Site tab)** — added `minWidth: 0` on input + `flexShrink: 0` on `.aifa.digital` span (flex collapse bug); added `htmlFor`/`id` link; red error message appears when user types non-Latin characters (Cyrillic silently stripped by regex — now surfaced as "Latin characters only: a–z, 0–9, _ and –")
- **Avatar upload (Site tab)** — real `<input type="file">` behind styled div; client-side canvas resize to 200×200 px + JPEG compression loop (quality 0.8→0.25) until base64 <80KB; shows circular preview + KB indicator after pick; hard error if still >90KB
- **Site size guard** — `arweave.ts` throws before Irys upload if rendered HTML >95 KB (keeps uploads within Irys free tier)
- **API body limits** — `api/site/create.ts` bodyParser limit raised to 200KB (`export const config`); `site-gen` Express raised to `express.json({ limit: "200kb" })`
- **Template avatar** — `site.html` shows `<img class="avatar">` when `avatarDataUrl` present, falls back to diamond sigil `◆`

## Changes Applied (2026-05-09)

- **Next.js app moved to Vercel** — removed app container from docker-compose.yml; Cloudflare `app` DNS points to Vercel
- **nginx.conf** — replaced catch-all `location /` with specific `/webhook/` and `/jobs` routes; `/health` → site-gen
- **site-gen /jobs auth** — `SITE_GEN_SECRET` Bearer token check added; listener + Vercel both send the header
- **GitHub Actions CI/CD** — `.github/workflows/deploy.yml` builds listener + site-gen ARM64 on push to main; secrets: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `VM_SSH_KEY`
- **tsconfig.json** — `moduleResolution` changed from `"bundler"` to `"node"` (fixes pg ESM resolution on Vercel); excluded `listener`, `site-gen`, `scripts`, `tests` from Next.js compile
- **`@types/pg`** — moved from devDependencies to dependencies (Vercel skips devDeps in production mode)
- **Grok model** — updated from deprecated `grok-beta` to `grok-3-mini`
- **Site status polling** — cabinet polls every 5s while status is "pending"; auto-updates without page refresh
- **RESEND_API_KEY** — added to VM .env (`re_Lu1RDMiD_54YM5zVRfyNFRYy5hDDPZWHF`)
- **GitHub MCP** — configured in `~/.claude.json` via `wsl npx -y @modelcontextprotocol/server-github`

## Security Fixes Applied (2026-04-19)

- `process_payment.rs` — referral token accounts now validated against `payment_mint` before transfer (prevents token confusion attacks)
- `listener/index.ts` — Helius webhook endpoint requires `Authorization: <HELIUS_WEBHOOK_SECRET>` header (rejects unauthenticated requests with 401)
- `onPaymentProcessed.ts` — wallet (valid Solana PublicKey), signature, and tier (1/2/3) validated before DB/SQS writes

## Bug Fixes Applied (2026-05-07)

- `process_payment.rs` — `payment_mint` marked `#[account(mut)]` (required by `token::burn` CPI which decrements total supply)
- `process_payment.rs` + `buy.tsx` — referral transfer/burn logic switched from account key check (`key() != sys_id`) to instruction arg check (`ref1.is_some()`); client now passes `payerTokenAccount` as writable dummy instead of `SystemProgram.programId` (fixes `ConstraintMut` error on tiers without referrals)
- `onPaymentProcessed.ts` — added retry with backoff (0/2/4/8/15s) when reading tier from on-chain state (Helius webhook arrives before RPC propagates updated account state)
- `cabinet/index.tsx` — USDC balance now loaded dynamically from RPC instead of hardcoded `$0.00`
- IDL `code_eternal_router.ts` — `payment_mint` marked `writable: true` to match contract
- `site-gen/idl/code_eternal_router.json` — added all instruction discriminators (was missing them, caused `Expected Buffer` error in `new Program(idl, provider)`)
- `site-gen/src/utils/arweave.ts` — Arweave URL changed from `https://arweave.net/` to `https://devnet.irys.xyz/` (devnet Irys files are not on Arweave mainnet, caused 404)
- `site-gen/src/utils/arweave.ts` — tag value guard: `job.txSignature ?? ""` to prevent `undefined` tag crashing Irys upload
- `app/src/app/layout.tsx` — `createOnLogin: "off"` (was `"users-without-wallets"` which auto-created Ethereum wallet, conflicting with explicit Solana `createWallet()` call)
- `app/src/app/api/devnet/airdrop-usdc/route.ts` — SOL airdrop reduced from 0.1 to 0.005 (10 000x more than needed per tx); threshold check lowered from 0.05 to 0.005 SOL
- `app/src/app/cabinet/page.tsx` (buy flow) — SOL check threshold lowered to match airdrop amount (0.005); added step progress bar (Funding wallet → Registering → Payment); fixed "loading" button state text

## Buy Flow — Expected UX Behavior

**New user buying any tier (first purchase):**
- Progress bar shows 3 steps: **Funding wallet → Registering → Payment**
- **Two Privy confirmation dialogs appear** — this is correct, not a bug:
  1. `register_user` — creates UserState PDA on Solana (no USDC, tiny SOL fee)
  2. `process_payment` — actual USDC payment ($15/$100/$1000)
- Total USDC charged: once only (process_payment)

**Returning user upgrading tier:**
- Only **one Privy dialog** (process_payment), registration already done

**Expected noise in listener logs (not bugs):**
- `Skipping non-payment tx (no token transfers): <sig>` — listener skips `register_user` and `update_site_url` txs (they have no token transfers). This is the correct behavior after the 2026-05-10 fix.
- `duplicate key value violates unique constraint "site_generation_jobs_tx_signature_key"` — Helius retries webhooks 3-5x per transaction. Deduplication on tx_signature works correctly, only first insert succeeds.

## Admin / Ops Scripts (app/scripts/)

- `app/scripts/reset-user.js <wallet>` — resets users.tier=0 + deletes site_generation_jobs for wallet (DB only, on-chain not touched)
- `app/scripts/wipe-users.js` — deletes all rows from users, site_generation_jobs, referral_payments, burn_events
- `app/scripts/retry-site-url.js` — manually calls update_site_url on-chain + marks job done in DB (edit WALLET/ARWEAVE_TX_ID/JOB_ID before running)
- `app/scripts/check-jobs.js` — prints site_generation_jobs rows for test wallet

## Devnet Wallet Balances (as of 2026-05-07)

| Wallet | Address | SOL Balance | Notes |
|--------|---------|------------|-------|
| Local deployer | `7GJm1GVk...` | ~2.5 SOL | Funded via faucet.solana.com |
| Backend Authority | `96JwAJL2...` | ~1.5 SOL | Funded 2026-05-07 (was 0 → caused Generation failed) |
| Irys Wallet | `8NpeaoihG...` | ~1.5 SOL | Funded 2026-05-07 |
| Mint Authority | `9NJhwafwj...` | ~7.3 SOL | Airdrops 0.005 SOL + 1100 USDC per new user |
| Ecosystem Fund | `CkiiA1BE...` | 0 SOL | Receives USDC only, no SOL needed |
