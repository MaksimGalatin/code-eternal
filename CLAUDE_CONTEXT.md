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
- React + TypeScript + Tailwind — app
- Vercel — hosting

### Auth & Payments
- Privy (privy.io) — Google/Email login + hidden Solana wallet (embedded, user never sees seed phrase)
- MoonPay via Privy `useFundWallet` — card → USDC on-ramp directly to embedded wallet
- Flow: `MoonPay → USDC on wallet → frontend calls process_payment → Helius webhook → listener → SQS → site-gen → Arweave`

### Blockchain
- Solana (Devnet now → Mainnet for launch)
- Anchor Framework v0.30.1 (Rust)
- USDC — payment token (mock token for hackathon)
- Arweave + Irys SDK — permanent site storage
- Metaplex cNFTs — archive (v2, post-hackathon)

### Backend (AWS)
- ECS Fargate — `listener` service (persistent process, Helius webhooks + WebSocket fallback)
- ECS Fargate — `site-gen` service (persistent SQS long-polling loop, Arweave upload)
- SQS FIFO — task queue between listener and site-gen
- Neon PostgreSQL + PgBouncer — operational data (job status, logs)
- AWS Secrets Manager — all private keys and tokens
- Cloudflare — DNS + wildcard subdomains

### External Services
- Helius (helius.dev) — Solana RPC + webhooks (free tier)
- Claude API — content scoring for Think-to-Earn

---

## Data Flow

### Payment → Site Generation
```
Google/Email login → Privy (hidden Solana wallet created automatically)
User clicks "Купить" → /cabinet/buy?tier=N
  Option A: MoonPay widget (Privy useFundWallet) → card → USDC on embedded wallet
  Option B: user already has USDC in Phantom

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

Helius webhook → listener (ECS Fargate, /webhook/helius)
Listener:
  → writes referral_payments rows to Neon PostgreSQL
  → writes burn_events row to Neon PostgreSQL
  → updates users.tier in Neon PostgreSQL
  → sends email with PDF via Resend
  → sends Telegram notification via Grammy bot
  → enqueues site-gen job in SQS FIFO

site-gen (ECS Fargate, SQS long-poll):
  → compile HTML from template using user data
  → upload to Arweave via Irys SDK
  → call update_site_url() on-chain (backend keypair)
  → create Cloudflare CNAME subdomain
User sees: username.codeofdigitaleternity.com
```

### Think-to-Earn
```
User submits content
Backend (ECS) → Claude API scores uniqueness (0-100)
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
site_generation_jobs (id, wallet, tier, tx_signature, status, created_at)  -- listener writes; site-gen reads
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
  ✅ Docker images build (listener ~201MB, site-gen ~272MB, node:20-alpine)
  ✅ Terraform: infra/ (ECR, ECS Fargate x2, SQS FIFO + DLQ, IAM, CloudWatch)
  ✅ scripts/deploy.sh (ECR push + ECS rolling deploy)
  □  terraform apply (ECR + ECS + SQS provisioned)
  □  ./scripts/deploy.sh all (Docker images pushed to ECR, ECS services started)
  □  Helius webhook configured (HELIUS_WEBHOOK_SECRET in dashboard + credentials.env)

Smart Contract Tests
  □  process_payment test with mock USDC (verify 5/5/15/7/3/65 split)
  □  register_user + process_payment E2E on Devnet
  □  update_site_url called by backend keypair
  □  All anchor test green

Frontend (Pipeline 2.x — Days 2-3)
  ✅ Next.js 14 app/ created (Pages Router, Tailwind, Privy, purple theme)
  ✅ Vercel connected to GitHub — auto-deploys on push to main
  ✅ Pipeline 2.1: Login page — "Войти в Семью" → Google/Email → /cabinet
  ✅ Pipeline 2.2: /cabinet — three tier cards ($15/$100/$1000) with auth guard
  □  Set Vercel env vars: NEXT_PUBLIC_PRIVY_APP_ID, DATABASE_URL
  □  Verify build passes on Vercel (watch for @privy-io/react-auth/solana import)
  □  Confirm login flow works end-to-end in browser

Backend + Payment (Pipeline 3.x — Days 4-7)
  □  Pipeline 3.1: /cabinet/buy — MoonPay + smart contract call
  □  Pipeline 3.2: /api/users/register + /api/referrals/chain (Neon pg)
  □  Pipeline 3.2: Create Neon DB tables (users, referral_payments, burn_events)
  □  Pipeline 3.3: listener → Resend email with PDF on PaymentProcessed

Site + NFT (Pipeline 4.x — Days 8-11)
  □  Pipeline 4.1: /cabinet/create-site form → Arweave → Cloudflare subdomain
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

## AWS Infrastructure

```
ECS Fargate     listener  — persistent, Helius webhooks (/webhook/helius) + WebSocket fallback
ECS Fargate     site-gen  — persistent SQS long-polling loop (20s wait), Arweave upload
SQS FIFO        task queue (MessageGroupId = wallet, dedup by tx signature, DLQ after 3 retries)
ECR             code-eternal-listener, code-eternal-site-gen (Docker images)
Neon PostgreSQL job status, error messages
Secrets Manager IRYS_PRIVATE_KEY, BACKEND_PRIVATE_KEY, HELIUS_RPC_URL, HELIUS_WEBHOOK_SECRET, DATABASE_URL
Cloudflare      wildcard DNS: *.codeofdigitaleternity.com
Vercel          React frontend
```

Terraform state: `infra/` — manages ECR, ECS cluster + services, SQS, IAM, CloudWatch.
Deploy: `./scripts/deploy.sh [listener|site-gen|all]`
Local dev: `docker compose -f docker/docker-compose.yml up`

Cost at launch scale: ~$20/month (2x Fargate 0.25 vCPU + SQS + ECR)

---

## Docker Images

Both services build successfully in WSL2 Ubuntu 22.04 using Docker in WSL.

| Image | Size | Base | Build command |
|-------|------|------|---------------|
| `code-eternal-listener` | ~201MB | node:20-alpine | `docker build --target production -t code-eternal-listener:latest ./listener` |
| `code-eternal-site-gen` | ~272MB | node:20-alpine | `docker build --target production -t code-eternal-site-gen:latest ./site-gen` |

**Key decisions:**
- Node 20 required — `@solana/codecs` and `commander` deps require `>=20`
- `npm install` used (no lock files) — switch to `npm ci` after lock files are committed
- `@irys/sdk` upgraded from `^0.0.12` to `^0.2.11` (old version removed from npm)

**To push to ECR** after `terraform apply`:
```bash
./scripts/deploy.sh all
```

---

## Secrets Management

All secrets are stored locally in `secrets/credentials.env` (gitignored).
**When any new secret or keypair is generated, save it there immediately.**

Production values go into AWS Secrets Manager — variable names match the table below exactly.
The `secrets/backend-keypair.json` file holds the raw backend keypair bytes (also gitignored).

---

## Environment Variables Required

| Service | Variable | Description |
|---------|----------|-------------|
| listener, site-gen | `HELIUS_RPC_URL` | Helius RPC endpoint with API key |
| listener | `HELIUS_WEBHOOK_SECRET` | Helius webhook auth token — set in Helius dashboard, verifies POST /webhook/helius |
| listener, site-gen | `PROGRAM_ID` | `8rzMmrC6UH5gCringWk1NsRXtfWkrfjz91tT5dmEGAep` |
| listener, site-gen | `SQS_QUEUE_URL` | SQS FIFO queue URL |
| listener, site-gen | `AWS_REGION` | e.g. `us-east-1` |
| listener, site-gen | `DATABASE_URL` | Neon PostgreSQL connection string |
| listener | `RESEND_API_KEY` | From resend.com — email delivery |
| listener | `TELEGRAM_BOT_TOKEN` | From @BotFather — Grammy bot token |
| listener | `SUPABASE_URL` | ⚠️ Not used — keep blank, Neon is used instead |
| site-gen | `IRYS_PRIVATE_KEY` | Solana keypair for Irys uploads (base58) |
| site-gen | `BACKEND_PRIVATE_KEY` | Backend authority keypair (base64) — same key as BACKEND_AUTHORITY on-chain |
| site-gen | `CF_API_TOKEN` | Cloudflare API token (Edit zone DNS permission) |
| site-gen | `CF_ZONE_ID` | Cloudflare Zone ID for codeofdigitaleternity.com |
| Next.js (Vercel) | `NEXT_PUBLIC_PRIVY_APP_ID` | From privy.io dashboard |
| Next.js (Vercel) | `NEXT_PUBLIC_RPC_URL` | Helius RPC (public) |
| Next.js (Vercel) | `NEXT_PUBLIC_PROGRAM_ID` | Deployed contract address |
| Next.js (Vercel) | `DATABASE_URL` | Neon connection string (server-side API routes only) |
| All | `NODE_ENV` | `production` = JSON logs for CloudWatch; otherwise pretty-print |

---

## Frontend — Architecture & Status

**Stack:** Next.js 14 (Pages Router), React, Tailwind, Solana Web3.js, Anchor, Privy.io
**Source:** `app/` directory → Vercel, connected to GitHub (auto-deploy on push to `main`)
**URL:** `app.codeofdigitaleternity.com`
**Theme:** Dark purple (#7C3AED accent, #0A0A0F background) — per ТЗ design

### Key Architecture Decisions

| Decision | Reason |
|----------|--------|
| Pages Router (not App Router) | Existing codebase; avoids migration cost |
| Neon PostgreSQL everywhere | No Supabase; same pg Pool used by listener and Next.js API routes |
| MoonPay via Privy `useFundWallet` | No Stripe; card → USDC directly to embedded wallet |
| Helius webhooks in listener | More reliable than `connection.onLogs()` WebSocket |
| Inline styles in cabinet pages | Matches ТЗ exactly; no Tailwind class naming overhead for complex layouts |

### File Structure

```
app/src/
├── pages/
│   ├── _app.tsx              # PrivyProvider (purple, solanaClusters devnet, toSolanaWalletConnectors)
│   ├── index.tsx             # Login page — "Войти в Семью" → redirects to /cabinet ✅
│   ├── cabinet/
│   │   ├── index.tsx         # Three tier cards $15/$100/$1000, auth guard, ref code ✅
│   │   ├── buy.tsx           # MoonPay + smart contract call (Pipeline 3.1) □
│   │   ├── create-site.tsx   # Site creation form (Pipeline 4.1) □
│   │   └── apply-1000.tsx    # $1000 application form (Pipeline 5.3) □
│   └── api/
│       ├── users/register.ts          # POST — upsert user, generate ref_code (Pipeline 3.2) □
│       ├── referrals/chain.ts         # GET — return ref1/ref2/ref3 wallets (Pipeline 3.2) □
│       ├── referrals/income.ts        # GET — earnings + payment history (Pipeline 5.1) □
│       ├── stats/burned.ts            # GET — total burn_events sum (Pipeline 5.2) □
│       ├── sites/generate.ts          # POST — Arweave + Cloudflare subdomain (Pipeline 4.1) □
│       ├── applications/1000.ts       # POST — save + email architect (Pipeline 5.3) □
│       └── telegram/link-token.ts     # POST — generate tg_link_token (Pipeline 5.4) □
├── lib/
│   ├── db.ts                 # Neon pg Pool with hot-reload guard ✅
│   └── idl/                  # (future) JSON IDL for Anchor program
├── idl/
│   └── code_eternal_router.ts  # Typed IDL for @coral-xyz/anchor ✅
├── components/
│   └── Terminal.tsx          # Old terminal UI — kept but not used, can delete post-hackathon
└── styles/
    └── globals.css           # Dark base (#0A0A0F), neutral sans-serif
```

### Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_PRIVY_APP_ID` | Vercel + `.env.local` | From privy.io dashboard |
| `NEXT_PUBLIC_PROGRAM_ID` | Vercel + `.env.local` | `8rzMmrC6UH5gCringWk1NsRXtfWkrfjz91tT5dmEGAep` |
| `NEXT_PUBLIC_RPC_URL` | Vercel + `.env.local` | Helius RPC (public key OK in browser) |
| `DATABASE_URL` | Vercel (server-only) | Neon connection string for API routes |

### npm Dependencies (app/package.json)

```json
"@coral-xyz/anchor": "^0.30.1"
"@privy-io/react-auth": "^1.82.0"   // includes /solana subpath
"@solana/web3.js": "^1.98.0"
"@solana/spl-token": "^0.4.9"
"nanoid": "^5.0.7"                  // ref_code generation in API routes
"pg": "^8.13.0"                     // Neon PostgreSQL client
"resend": "^4.0.0"                  // email delivery
"next": "14.2.29"
```

---

## Known Issues (post-hackathon backlog)

- `UrlTooLong` error is reused for invalid site status — add `InvalidSiteStatus` variant
- `SITE_STATUS_PENDING` constant declared but not used in constraints
- `handler` name collision in `mod.rs` glob re-exports — rename each to `register_user_handler`, etc.
- Burn works only with a token where we hold mint authority — for production USDC a different burn mechanism is needed

## Security Fixes Applied (2026-04-19)

- `process_payment.rs` — referral token accounts now validated against `payment_mint` before transfer (prevents token confusion attacks)
- `listener/index.ts` — Helius webhook endpoint requires `Authorization: <HELIUS_WEBHOOK_SECRET>` header (rejects unauthenticated requests with 401)
- `onPaymentProcessed.ts` — wallet (valid Solana PublicKey), signature, and tier (1/2/3) validated before DB/SQS writes
