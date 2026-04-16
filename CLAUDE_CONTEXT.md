# CODE ETERNAL — Project Context

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
2. Pays by card $10/$100/$1000 (Stripe)
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
| Founder wallet | 5% | Maksim Galatin |
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
- Privy (privy.io) — Google login + hidden Solana wallet
- Stripe — subscriptions / card payments
- Flow: `Stripe webhook → Lambda → USDC → smart contract`

### Blockchain
- Solana (Devnet now → Mainnet for launch)
- Anchor Framework v0.30.1 (Rust)
- USDC — payment token (mock token for hackathon)
- Arweave + Irys SDK — permanent site storage
- Metaplex cNFTs — archive (v2, post-hackathon)

### Backend (AWS)
- ECS Fargate — `listener` service (persistent process, WebSocket to Helius)
- Lambda — `site-gen` (SQS-triggered, async Arweave upload)
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
Google login → Privy (hidden wallet created)
Card payment → Stripe
Stripe webhook → Lambda
Lambda → USDC → process_payment (smart contract)
  Contract atomically:
    5%  → token::burn CPI
    15% → ref1 token account (or burn)
    7%  → ref2 token account (or burn)
    3%  → ref3 token account (or burn)
    5%  → founder_token_account
    65% → vault PDA (treasury)
  Emits: PaymentProcessed event

Helius webhook → listener (ECS Fargate)
Listener → SQS FIFO (job queue)
site-gen Lambda:
  → compile HTML from Handlebars template
  → upload to Arweave via Irys SDK
  → call update_site_url() on-chain (backend keypair)
  → create Cloudflare subdomain
User sees: wallet-prefix.codeofdigitaleternity.com
```

### Think-to-Earn
```
User submits content
Lambda → Claude API scores uniqueness (0-100)
Backend → award_memory() on-chain → adds memory_score to UserState
```

---

## What is Stored Where

| Data | Storage | Why |
|------|---------|-----|
| owner, tier, referrer, arweave_url, memory_score, site_status | Solana PDA (source of truth) | Permanent, trustless |
| Job status, error logs, tx references | Neon PostgreSQL | Operational, queryable |
| User HTML sites | Arweave | Permanent, uncensorable |

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

## Placeholder Pubkeys — MUST Replace Before Deploy

| Constant | File | How to get |
|----------|------|-----------|
| `BACKEND_AUTHORITY` | `instructions/update_site_url.rs` | `solana-keygen new -o backend-keypair.json` then `solana address -k backend-keypair.json` |
| `FOUNDER_WALLET` | `instructions/process_payment.rs` | Maksim Galatin's Solana wallet address |
| Program ID | `lib.rs` + `Anchor.toml` | Auto-generated on first `anchor build`: `pauVhWF8u77rxx3SYmX6gE5wQDuwyzRpcYCtyJypgZy` |

---

## Build Status

**Compiles successfully.** `target/deploy/code_eternal_router.so` produced.

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
Week 1 — Infrastructure + First Compile
  ✅ WSL2: Rust + Solana CLI + Anchor 0.30.1 installed
  ✅ Smart contract compiles (code_eternal_router.so produced)
  ✅ Program ID auto-generated: pauVhWF8u77rxx3SYmX6gE5wQDuwyzRpcYCtyJypgZy
  □  Replace placeholder pubkeys (FOUNDER_WALLET, BACKEND_AUTHORITY)
  □  anchor deploy --provider.cluster devnet
  □  AWS infra deployed (ECS, Lambda, SQS, RDS)
  □  Helius webhook configured

Week 2 — Smart Contract Tests
  □  process_payment test with mock USDC (verify 65/15/7/3/5/5 split)
  □  register_user + process_payment E2E on Devnet
  □  update_site_url called by backend keypair
  □  All anchor test green

Week 3 — Backend Integration
  □  listener reads PaymentProcessed events from Helius
  □  site-gen generates HTML + uploads to Arweave via Irys
  □  update_site_url called on-chain with Arweave TX ID
  □  Full pipeline E2E: payment → site live on Arweave

Week 4 — Frontend + Submit
  □  React frontend on Vercel (Phantom wallet for hackathon demo)
  □  3-minute demo video recorded
  □  GitHub README for judges
  □  Submit on Colosseum
```

---

## AWS Infrastructure

```
ECS Fargate     listener — persistent, WebSocket to Helius
Lambda          site-gen — async, triggered by SQS
SQS FIFO        task queue (MessageGroupId = wallet, dedup by tx signature)
Neon PostgreSQL job status, error messages
Secrets Manager IRYS_PRIVATE_KEY, BACKEND_PRIVATE_KEY, HELIUS_RPC_URL, etc.
Cloudflare      wildcard DNS: *.codeofdigitaleternity.com
Vercel          React frontend
```

Cost at launch scale: ~$16/month

---

## Environment Variables Required

| Service | Variable | Description |
|---------|----------|-------------|
| listener, site-gen | `HELIUS_RPC_URL` | Helius RPC endpoint with API key |
| site-gen | `IRYS_PRIVATE_KEY` | Solana keypair for Irys uploads (base58) |
| site-gen | `BACKEND_PRIVATE_KEY` | Backend authority keypair (base64) — same key as BACKEND_AUTHORITY on-chain |
| site-gen | `PROGRAM_ID` | Deployed program pubkey |
| listener, site-gen | `SQS_QUEUE_URL` | SQS FIFO queue URL |
| listener, site-gen | `AWS_REGION` | e.g. `us-east-1` |
| All | `NODE_ENV` | `production` = JSON logs for CloudWatch; otherwise pretty-print |

---

## Known Issues (post-hackathon backlog)

- `UrlTooLong` error is reused for invalid site status — add `InvalidSiteStatus` variant
- `SITE_STATUS_PENDING` constant declared but not used in constraints
- `handler` name collision in `mod.rs` glob re-exports — rename each to `register_user_handler`, etc.
- Burn works only with a token where we hold mint authority — for production USDC a different burn mechanism is needed
