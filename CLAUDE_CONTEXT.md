# CODE ETERNAL — Project Context

> **This file is the single source of truth for all project architecture, decisions, and progress.**
> Claude must update this file automatically whenever: architecture changes, a task is completed, a new secret is generated, a new service or tool is added, or any decision is made that affects how the system works. No separate docs. No README sections. Everything here.

---

## Team

| Person | Role |
|--------|------|
| **Maksim Shchuplov** | Platform/DevOps Engineer — builds and operates the system |
| **Maksim Galatin** | Idea author and product owner — defines what gets built |

Maksim Shchuplov: 16 years IT, Master's in Engineering. Stack: AWS, Kubernetes, Terraform, CI/CD.
Working on AI tooling (MCP servers, developer skills) at a large Baltic bank in Vilnius.

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
| Referral L1 | 15% | Or added to burn if slot is empty |
| Referral L2 | 7% | Or added to burn if slot is empty |
| Referral L3 | 3% | Or added to burn if slot is empty |
| Ecosystem Fund | 5% | Project-controlled wallet (development, grants, ops) |
| Vault (treasury) | 65% | Protocol PDA |
| **Total** | **100%** | ✅ |

Maximum burn (no referrals): **30%** (5+15+7+3)

**Important:** Burn uses `token::burn` CPI — atomic, on-chain, verifiable on explorer.
The payer signs the transaction and authorizes the burn from their own token account.
Works with the hackathon mock token (we control mint authority). Does NOT work with real USDC.

---

## Tech Stack

### Frontend
- Squarespace — landing page (live)
- Next.js 14 + TypeScript + Tailwind — app (`app/` directory)
- Hetzner CAX11 (ARM64) — hosting via Docker Compose + nginx

### Auth & Payments
- Privy (privy.io) — Google login + hidden Solana wallet (embedded, user never sees seed phrase)
  - App ID: `cmoofvdt4008o0cjps5l8nvnu`
  - ✅ Embedded wallets enabled (`createOnLogin: "users-without-wallets"`) — HTTPS is live
  - Allowed origin: `https://app.codeofdigitaleternity.com`
- MoonPay via Privy `useFundWallet` — card → USDC on-ramp directly to embedded wallet (production)
- Devnet: mock USDC airdrop via `/api/devnet/airdrop-usdc` (1100 USDC, no card needed)
- Flow: `Google login → Privy wallet → process_payment tx → Helius webhook → listener → site-gen → Arweave`

### Blockchain
- Solana (Devnet now → Mainnet for launch)
- Anchor Framework v0.30.1 (Rust)
- USDC — payment token (mock token for hackathon)
- Arweave + Irys SDK — permanent site storage
- Metaplex cNFTs — archive (v2, post-hackathon)

### Backend (Hetzner)
- Hetzner CAX11 ARM64 VM — `128.140.0.118`, Ubuntu 24.04, 4GB RAM, ~$5/month
- Docker Compose — 4 services: app, listener, site-gen, nginx
- `listener` service — Helius webhooks (/webhook/helius) on port 3001
- `site-gen` service — HTTP job endpoint (/jobs) on port 3002, Arweave upload
- `nginx` — reverse proxy on ports 80/443
- Neon PostgreSQL — external managed database (no local DB on VM)
- Docker Hub — image registry (`maxshchuplov/` private repos)
- Cloudflare — DNS + wildcard subdomains

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
    5%  → token::burn CPI
    15% → ref1 token account (or burn if empty)
    7%  → ref2 token account (or burn if empty)
    3%  → ref3 token account (or burn if empty)
    5%  → ecosystem_fund_token_account
    65% → vault PDA (treasury)
  Emits: PaymentProcessed event

Helius webhook → listener (Docker, /webhook/helius)
Listener:
  → writes referral_payments rows to Neon PostgreSQL
  → writes burn_events row to Neon PostgreSQL
  → updates users.tier in Neon PostgreSQL
  → sends HTML email via Resend (PDF guide is post-hackathon)
  → sends Telegram notification via Grammy bot (post-hackathon)
  → HTTP POST to site-gen:3002/jobs (direct, no SQS; deduplication: skips if job row already exists)

site-gen (Docker, /jobs endpoint):
  → compile HTML from template using user data (Handlebars, site-gen/src/templates/site.html)
  → upload to Arweave via Irys SDK (free <100KB, base58 IRYS_PRIVATE_KEY, node: devnet.irys.xyz)
  → call update_site_url() on-chain with backend keypair (sets arweave_url + site_status=1 in UserState)
  → update site_generation_jobs.status="done" + arweave_url in Neon DB
  → (post-hackathon: create Cloudflare CNAME subdomain for username.codeofdigitaleternity.com)
User sees: Arweave URL shown in cabinet site status panel
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
users (id, wallet, email, display_name, referrer_id, ref_code, tier, tier_expires,
       tg_chat_id, tg_link_token, created_at)
referral_payments (id, payer_wallet, referrer_wallet, level, amount_usdc, tx_hash, tier, created_at)
burn_events (id, amount, tx_hash, created_at)
site_generation_jobs (id, wallet, tier, tx_signature, status, arweave_url, completed_at, error_message, created_at)  -- listener writes; site-gen reads. Run scripts/migrate-db.sql to add arweave_url/completed_at/error_message
applications_1000 (id, fio, contact, language, avatar_desc, reason, status, created_at)
```

Indexes: `users(wallet)`, `users(ref_code)`, `referral_payments(referrer_wallet)`, `referral_payments(payer_wallet)`

---

## Smart Contract — File Structure

```
programs/code_eternal_router/src/
├── lib.rs                    # entry point, declare_id!, 4 instructions
├── errors.rs                 # CodeEternalError enum
├── state/
│   ├── mod.rs
│   └── user_state.rs         # UserState struct + SITE_STATUS_* constants
└── instructions/
    ├── mod.rs
    ├── register_user.rs      # init UserState PDA, tier always starts at 0
    ├── process_payment.rs    # distribute 5/5/15/7/3/65, on-chain burn
    ├── update_site_url.rs    # backend writes Arweave URL after generation
    └── award_memory.rs       # oracle adds memory_score (Think-to-Earn)
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
| `UncheckedAccount` for referral token accounts | Anchor can't constrain optional accounts. Client passes `SystemProgram::ID` when no referral. |
| Vault PDA as ATA authority | Standard pattern: vault PDA (no data) controls vault_token_account (USDC ATA). |

### UserState Account

```rust
pub struct UserState {
    pub owner: Pubkey,           // user's wallet
    pub referrer: Option<Pubkey>, // who referred them
    pub tier: u8,                // 0=unregistered, 1=Starter, 2=Pro, 3=Elite
    pub registered_at: i64,      // unix timestamp
    pub memory_score: u64,       // Think-to-Earn points
    pub arweave_url: [u8; 64],   // Arweave TX ID (43 chars, zero-padded)
    pub site_status: u8,         // 0=pending, 1=ready, 2=error
    pub bump: u8,                // PDA bump seed
}
// Seeds: ["user", wallet_pubkey]
// Size: 8 (discriminator) + UserState::INIT_SPACE
```

---

## Hardcoded Pubkeys

| Constant | File | Value |
|----------|------|-------|
| `BACKEND_AUTHORITY` | `instructions/update_site_url.rs` | `96JwAJL2hn3FHxViqy9oirBdpcDH5rGsvukjTGyiTap4` — private key in `secrets/credentials.env` as `BACKEND_PRIVATE_KEY` |
| `ECOSYSTEM_FUND_WALLET` | `instructions/process_payment.rs` | `CkiiA1BETdpSbt76PChhnKVzXxLjJXT99yA4yfRtT88c` — keypair in `secrets/ecosystem-fund-keypair.json` |
| Program ID | `lib.rs` + `Anchor.toml` | ✅ `8rzMmrC6UH5gCringWk1NsRXtfWkrfjz91tT5dmEGAep` — deployed to Devnet 2026-04-19 |

---

## Build Status

**Compiles and deployed to Devnet.** `target/deploy/code_eternal_router.so` produced.
Program ID: `8rzMmrC6UH5gCringWk1NsRXtfWkrfjz91tT5dmEGAep` (deployed 2026-04-19)

### Compiler Warnings (non-blocking, known issues)

- `ambiguous_glob_reexports` on `handler` — all instruction modules export a fn named `handler`; rename post-hackathon
- `unexpected_cfg` on `anchor-debug` — known Anchor 0.30.1 issue with Rust 1.89, safe to ignore

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
cd ~/code-eternal   # or wherever the repo is cloned
cargo-build-sbf --sbf-sdk ~/sbf-sdk --skip-tools-install
```

Output: `target/deploy/code_eternal_router.so`

### After replacing placeholder pubkeys — deploy to Devnet

```bash
solana config set --url devnet
anchor deploy --provider.cluster devnet
# Copy the deployed Program ID back into lib.rs declare_id!() and Anchor.toml
```

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
  ✅ All 4 containers running on VM (app, listener, site-gen, nginx)
  ✅ Docker Hub private repos (maxshchuplov/code-eternal-*)
  ✅ Privy App ID configured (cmoofvdt4008o0cjps5l8nvnu), Google login enabled
  ✅ Point Cloudflare DNS A records to 128.140.0.118
  ✅ Run certbot for SSL (cert at /etc/letsencrypt/live/app.codeofdigitaleternity.com/, expires 2026-07-31)
  ✅ Update nginx.conf for HTTPS, embedded wallets re-enabled (createOnLogin: "users-without-wallets")
  ✅ Helius webhook configured (HELIUS_WEBHOOK_SECRET set in dashboard + credentials.env, 2026-05-06)

Smart Contract Tests
  □  process_payment test with mock USDC (verify 5/5/15/7/3/65 split)
  □  register_user + process_payment E2E on Devnet
  □  update_site_url called by backend keypair
  □  All anchor test green

Frontend (Pipeline 2.x — Days 2-3)
  ✅ Next.js 14 app/ created (Pages Router, Tailwind, Privy, purple theme)
  ✅ Pipeline 2.1: Login page — "Enter the Family" → Google → /cabinet
  ✅ Pipeline 2.2: /cabinet — three tier cards ($15/$100/$1000) with auth guard
  ✅ Create Neon DB tables (users, referral_payments, burn_events, site_generation_jobs, applications_1000)
  ✅ Confirm login flow works end-to-end in browser (Google login → /cabinet, HTTPS)

Backend + Payment (Pipeline 3.x — Days 4-7)
  ✅ Pipeline 3.1: /cabinet/buy — single-click flow: auto-airdrop USDC if needed → register_user → process_payment (all tiers)
  ✅ Pipeline 3.2: /api/users/register + /api/referrals/chain (Neon pg)
  ✅ Pipeline 3.3: listener → Resend email on PaymentProcessed (HTML email; PDF is post-hackathon)

Site + NFT (Pipeline 4.x — Days 8-11)
  ✅ Pipeline 4.1: auto site-gen on payment (Arweave + on-chain URL + cabinet status panel; Cloudflare subdomain post-hackathon)
  □  Pipeline 4.2: cNFT Guardian Passport mint (Metaplex Bubblegum)

Widgets + Bots (Pipeline 5.x — Days 12-13)
  □  Pipeline 5.1: IncomeWidget + /api/referrals/income
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
                Docker Compose: docker/docker-compose.yml

Services (Docker Compose):
  app           Next.js 14 frontend          port 3000 (internal)
  listener      Helius webhook handler       port 3001 (internal)
  site-gen      Arweave site generator       port 3002 (internal)
  nginx         Reverse proxy                ports 80:80, 443:443 (public)

DNS (Cloudflare):
  app.codeofdigitaleternity.com      → 128.140.0.118 (A record, proxy off)
  listener.codeofdigitaleternity.com → 128.140.0.118 (A record, proxy off)

Image registry: Docker Hub (maxshchuplov/code-eternal-*)
Database: Neon PostgreSQL (external, connection string in .env)
```

### VM Setup

```bash
# Run scripts/setup-vm.sh on fresh Ubuntu 24.04 as root (installs Docker + certbot)
scp scripts/setup-vm.sh root@128.140.0.118:/tmp/
ssh root@128.140.0.118 bash /tmp/setup-vm.sh

# Copy files
scp secrets/credentials.env root@128.140.0.118:/opt/code-eternal/.env
scp docker/docker-compose.yml docker/nginx.conf root@128.140.0.118:/opt/code-eternal/docker/

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
  -t maxshchuplov/code-eternal-listener:latest --push ./listener
ssh root@128.140.0.118 'cd /opt/code-eternal && docker compose -f docker/docker-compose.yml pull listener && docker compose -f docker/docker-compose.yml up -d listener'

# Site-gen
docker buildx build --platform linux/arm64 --no-cache \
  -t maxshchuplov/code-eternal-site-gen:latest --push ./site-gen
ssh root@128.140.0.118 'cd /opt/code-eternal && docker compose -f docker/docker-compose.yml pull site-gen && docker compose -f docker/docker-compose.yml up -d site-gen'
```

---

## Devnet One-Time Setup (Mock USDC)

Before the buy flow works, run this once from WSL to create the mock USDC token:

```bash
cd /mnt/c/Users/Maksim/projects/code-eternal/app
node ../scripts/setup-devnet.js
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
mkdir -p ~/devnet-setup && cp /mnt/c/Users/Maksim/projects/code-eternal/scripts/setup-devnet.js ~/devnet-setup/
cd ~/devnet-setup && npm install @solana/web3.js @solana/spl-token && node setup-devnet.js
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
| site-gen | `IRYS_PRIVATE_KEY` | ✅ Set — base58 keypair (pubkey: `8NpeaoihGbipm7pNPHDMAu8ASXt6tBXZsuLoT9oYWM4X`, funded with 0.5 devnet SOL on 2026-05-06, TX: `2RDPciAgam3EvdHPpVmazYEye6Gc4wSSrT6eyzQ84PaGXrytgeL3KFyiCCmQREbEwReiAxQga9FDLHcfEDPcb7R4`) |
| site-gen | `BACKEND_PRIVATE_KEY` | Backend authority keypair (base64) — same key as BACKEND_AUTHORITY on-chain |
| Next.js (app) | `NEXT_PUBLIC_PRIVY_APP_ID` | `cmoofvdt4008o0cjps5l8nvnu` — baked in at Docker build time |
| Next.js (app) | `NEXT_PUBLIC_RPC_URL` | Helius RPC (public key OK in browser) |
| Next.js (app) | `NEXT_PUBLIC_PROGRAM_ID` | Deployed contract address |
| Next.js (app) | `NEXT_PUBLIC_USDC_MINT` | Mock USDC mint address (devnet) — baked in at Docker build time via `--build-arg` |
| Next.js (app) | `MOCK_USDC_MINT` | Same as above, server-side only (for airdrop endpoint) |
| Next.js (app) | `MOCK_USDC_MINT_AUTHORITY` | Base64 keypair that has mint authority over mock USDC (for devnet airdrop) |
| Next.js (app) | `DATABASE_URL` | Neon connection string (server-side API routes only) |
| All | `NODE_ENV` | `production` |

---

## Frontend — Architecture & Status

**Stack:** Next.js 14 (Pages Router), React, Tailwind, Solana Web3.js, Anchor, Privy.io
**Source:** `app/` directory → Docker image → Hetzner VM
**URL:** `https://app.codeofdigitaleternity.com` ✅ HTTPS live (SSL cert expires 2026-07-31)
**Theme:** Dark purple (#7C3AED accent, #0A0A0F background)

### Key Architecture Decisions

| Decision | Reason |
|----------|--------|
| Pages Router (not App Router) | Existing codebase; avoids migration cost |
| Neon PostgreSQL everywhere | Same pg Pool used by listener and Next.js API routes |
| MoonPay via Privy `useFundWallet` | No Stripe; card → USDC directly to embedded wallet |
| Helius webhooks in listener | More reliable than `connection.onLogs()` WebSocket |
| `toSolanaWalletConnectors` in `useMemo` | Prevents SSR crash — browser-only API |
| `NEXT_PUBLIC_*` via Docker `--build-arg` | Next.js bakes these at build time, not runtime |
| Hetzner instead of Vercel | Vercel Hobby blocks private repo collaboration |
| Direct HTTP listener→site-gen | Simpler than SQS for single-VM setup; no AWS dependency |

### File Structure

```
app/src/
├── pages/
│   ├── _app.tsx              # PrivyProvider (Google only, embedded wallets, HTTPS) ✅
│   ├── index.tsx             # Login page → redirects to /cabinet ✅
│   ├── cabinet/
│   │   ├── index.tsx         # Tier cards + site status panel (pending/ready/link) ✅
│   │   ├── buy.tsx           # Single-click: auto-airdrop if needed → register_user → process_payment ✅
│   │   └── apply-1000.tsx    # $1000 application form (Pipeline 5.3) □
│   └── api/
│       ├── users/register.ts          # POST — upsert user, generate ref_code ✅
│       ├── users/site-status.ts       # GET — site job status + arweave URL from DB ✅
│       ├── referrals/chain.ts         # GET — return ref1/ref2/ref3 wallets ✅
│       ├── devnet/airdrop-usdc.ts     # POST — mint 1100 test USDC to wallet ✅
│       ├── referrals/income.ts        # GET — earnings + payment history (Pipeline 5.1) □
│       ├── stats/burned.ts            # GET — total burn_events sum (Pipeline 5.2) □
│       ├── applications/1000.ts       # POST — save + email architect (Pipeline 5.3) □
│       └── telegram/link-token.ts     # POST — generate tg_link_token (Pipeline 5.4) □
├── lib/
│   └── db.ts                 # Neon pg Pool with hot-reload guard ✅
├── idl/
│   └── code_eternal_router.ts  # Typed IDL for @coral-xyz/anchor ✅
└── styles/
    └── globals.css           # Dark base (#0A0A0F), neutral sans-serif
```

### npm Dependencies (app/package.json)

```json
"@coral-xyz/anchor": "^0.30.1"
"@privy-io/react-auth": "^1.82.0"
"@solana/web3.js": "^1.98.0"
"@solana/spl-token": "^0.4.9"
"nanoid": "^5.0.7"
"pg": "^8.13.0"
"resend": "^4.0.0"
"next": "14.2.29"
```

---

## Listener — Architecture & File Structure

**Service:** `listener/` → Docker image `maxshchuplov/code-eternal-listener` → port 3001
**Entry:** `listener/src/index.ts` — Express app, single POST `/webhook/helius`

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
listener/src/
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
7. Check `site_generation_jobs` for existing row (deduplication)
8. Insert job row + HTTP POST to `site-gen:3002/jobs` (all tiers get a site)

---

## Site-Gen — Architecture & File Structure

**Service:** `site-gen/` → Docker image `maxshchuplov/code-eternal-site-gen` → port 3002
**Entry:** `site-gen/src/index.ts` — Express app, single POST `/jobs`

**Irys node:** `https://devnet.irys.xyz` (matches Solana devnet) — mainnet will use `https://node2.irys.xyz`
**Irys wallet:** `8NpeaoihGbipm7pNPHDMAu8ASXt6tBXZsuLoT9oYWM4X` — must have devnet SOL to connect
**Re-fund if needed:** `solana transfer 8NpeaoihGbipm7pNPHDMAu8ASXt6tBXZsuLoT9oYWM4X 0.5 --url devnet --allow-unfunded-recipient`

### Site-Gen File Structure

```
site-gen/
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

`site.html` uses: `{{name}}`, `{{wallet}}`, `{{tier}}`, `{{tierColor}}`, `{{txSignature}}`, `{{registeredAt}}`, `{{year}}`

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

## Language Rule

**All user-facing text in the app must be in English.** No Russian words anywhere in the UI — buttons, labels, tier names, descriptions, titles, loading states, tooltips. This applies to all pages: index, cabinet, buy, create-site, apply-1000, and any future pages.

---

## Known Issues (post-hackathon backlog)

- `UrlTooLong` error is reused for invalid site status — add `InvalidSiteStatus` variant
- `SITE_STATUS_PENDING` constant declared but not used in constraints
- `handler` name collision in `mod.rs` glob re-exports — rename each to `register_user_handler`, etc.
- Burn works only with a token where we hold mint authority — for production USDC a different burn mechanism is needed
- Cloudflare subdomain (username.codeofdigitaleternity.com) not yet wired — CF_API_TOKEN + CF_ZONE_ID env vars are defined but site-gen doesn't call Cloudflare yet
- Grammy Telegram bot not yet implemented — add `TELEGRAM_BOT_TOKEN` to credentials.env when ready
- Cloudflare subdomain (username.codeofdigitaleternity.com) not yet wired — add `CF_API_TOKEN` + `CF_ZONE_ID` to credentials.env when ready
- PDF email attachment (post-hackathon) — current Resend email is HTML only

## Security Fixes Applied (2026-04-19)

- `process_payment.rs` — referral token accounts now validated against `payment_mint` before transfer (prevents token confusion attacks)
- `listener/index.ts` — Helius webhook endpoint requires `Authorization: <HELIUS_WEBHOOK_SECRET>` header (rejects unauthenticated requests with 401)
- `onPaymentProcessed.ts` — wallet (valid Solana PublicKey), signature, and tier (1/2/3) validated before DB/SQS writes
