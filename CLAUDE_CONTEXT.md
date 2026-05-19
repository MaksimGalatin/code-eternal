# CODE ETERNAL — Project Context

> **Single source of truth.** Update this file when architecture changes, a task completes, a secret is generated, or any decision affects how the system works. Write dense — every line earns its place. Prefer tables over prose. Change history belongs in git, not here.

---

## Code Quality Rules

- **Don't bloat files.** Each line of code or context should reduce total future token cost, not increase it.
- Prefer tables and structured data over prose paragraphs.
- No comments explaining *what* — only *why* (non-obvious constraints, subtle invariants, workarounds).
- Avoid defensive code for impossible states; trust internal guarantees.
- Delete dead code, completed checklists, and historical logs immediately.

---

## What is CODE ETERNAL

Web3 service on Solana for non-crypto users:
1. Login via Google (Privy — hidden wallet, user never sees seed phrase)
2. Pay by card $15/$100/$1000 (MoonPay via Privy)
3. Get AI companion (AIfa, powered by Grok-3)
4. Get eternal site on Arweave (permanent, cannot be deleted)
5. Earn $CODE tokens for unique content (Think-to-Earn / Proof-of-Memory)

---

## Tokenomics — Payment Distribution

| Recipient | % | Notes |
|-----------|---|-------|
| Burn | 5% | Always — `token::burn` CPI |
| Referral L1 | 15% | → vault if referrer expired; → burn if no referrer |
| Referral L2 | 7% | → vault if referrer expired; → burn if no referrer |
| Referral L3 | 3% | → vault if expired; → burn if absent |
| Ecosystem Fund | 5% | Project wallet |
| Vault (treasury) | 65% | Protocol PDA |

Max burn (no referrals): **30%**. Expired referrer → vault (not burn) — keeps tokenomics balanced.
Burn uses `token::burn` CPI — atomic, verifiable on-chain. Works only with tokens where we hold mint authority (hackathon mock USDC). Incompatible with real USDC.

---

## Repo Structure

```
code-eternal/
├── app/                 ← app.codeofdigitaleternity.com
│   ├── src/               Next.js 16 App Router + API routes
│   ├── listener/          Helius webhook handler (Express, Docker)
│   ├── site-gen/          Arweave site generator (Express, Docker)
│   ├── docker/            docker-compose.yml + nginx.conf
│   └── scripts/           DB migrations + ops scripts
├── contract/            ← Solana smart contract (Anchor 0.30.1)
│   ├── programs/          Rust source
│   ├── tests/             TypeScript tests (6 tests, all green in CI)
│   └── Anchor.toml / Cargo.toml / Cargo.lock
└── web/                 ← www.codeofdigitaleternity.com (Vercel, landing page)
```

**Anchor/Cargo builds must run from `contract/`** — Cargo.toml and Anchor.toml are there.

---

## Infrastructure

### Vercel (Next.js app)
| Environment | Domain | Branch | Privy App ID |
|-------------|--------|--------|--------------|
| Prod | `app.codeofdigitaleternity.com` | `main` (frozen) | `cmoofvdt4008o0cjps5l8nvnu` |
| Dev | `dev.app.codeofdigitaleternity.com` | `develop` | `cmp5kf0v000250clabi1awvhp` |

Auto-deploys via Vercel GitHub integration. Root dir: `app`, Node: 24.x.

### Hetzner VM (`128.140.0.118`, ARM64, Ubuntu 24.04)
Path: `/opt/code-eternal/`. Docker Compose with two profiles:

| Service | Profile | Image tag | Port | Purpose |
|---------|---------|-----------|------|---------|
| listener | prod | `:latest` (frozen) | 3001 | Helius webhooks |
| site-gen | prod | `:latest` (frozen) | 3002 | Arweave site gen |
| listener-dev | `--profile dev` | `:dev` | 3011 | Dev webhooks |
| site-gen-dev | `--profile dev` | `:dev` | 3012 | Dev site gen |
| nginx | both | — | 80/443 | Reverse proxy |

Image registry: `maxshchuplov/code-eternal-*` (Docker Hub, private).
`:latest` = frozen at hackathon v1.0. `:dev` = updated on every `develop` push by CI.

### nginx Routing
```
listener.codeofdigitaleternity.com:
  /webhook/ → listener:3001,  /jobs → site-gen:3002,  /health → site-gen:3002

dev.listener.codeofdigitaleternity.com:
  /webhook/ → listener-dev:3011,  /jobs → site-gen-dev:3012
  (uses resolver 127.0.0.11 + $upstream variable — starts even without dev containers)
```

### DNS (Cloudflare)
```
app.codeofdigitaleternity.com          → Vercel (CNAME, proxy off)
dev.app.codeofdigitaleternity.com      → Vercel (CNAME, proxy off)
listener.codeofdigitaleternity.com     → 128.140.0.118 (A, proxy off)
dev.listener.codeofdigitaleternity.com → 128.140.0.118 (A, proxy off)
*.codeofdigitaleternity.com            → 192.0.2.1 (A, proxied=true) ← CF Worker intercepts
```

Cloudflare Worker `code-eternal-passport`: `username.codeofdigitaleternity.com` → fetches Arweave URL from `/api/site/by-username` → proxies HTML (no redirect). Zone ID: `019326ccdeada010024836e8874077b2`.

### GitHub Actions CI/CD
| Workflow | Branch | Trigger | Action |
|----------|--------|---------|--------|
| `deploy-dev.yml` | `develop` | `app/listener/**`, `app/site-gen/**`, `app/docker/**` | Build + push `:dev`, SSH deploy to VM |
| `anchor-deploy-dev.yml` | `develop` | `contract/**` | Build, test (localnet), deploy dev program |
| `deploy.yml` | `main` | same paths | Build + push `:latest` (never runs — main frozen) |
| `anchor-deploy.yml` | `main` | `contract/**` | Build, test, deploy prod program |
| `migrate.yml` | both | any push | Migrate dev Neon on `develop`, prod Neon on `main` |
| `deploy-worker.yml` | any | `cloudflare/**` | Wrangler deploy CF Worker |

### Secrets Storage
```
secrets/prod/credentials.env          — prod secrets (gitignored)
secrets/dev/credentials.env           — dev secrets (gitignored)
secrets/dev/program-keypair.json      — dev Solana program keypair
secrets/ecosystem-fund-keypair.json

VM: /opt/code-eternal/.env            — prod secrets (never overwritten by CI)
VM: /opt/code-eternal/.env.dev        — dev secrets (never overwritten by CI)
```

---

## Database (Neon PostgreSQL)

Prod: `main` branch. Dev: `develop` branch (`ep-dark-flower-al6r85gf`).

```sql
users (id, wallet, email, display_name, username UNIQUE, referrer_id, ref_code, tier,
       tier_expires, tg_chat_id, tg_link_token, site_bio, site_manifesto, site_telegram,
       site_twitter, site_website, last_chat_tx_id, created_at)

referral_payments (id, payer_wallet, referrer_wallet, level, amount_usdc, tx_hash, tier, created_at)
burn_events (id, amount, tx_hash, created_at)

site_generation_jobs (id, wallet, tier, tx_signature UNIQUE, status, arweave_url text,
                      completed_at, error_message, created_at)
-- status: pending|done|error
-- tx_signature: real tx hash (payment-triggered) OR 'ui-regen-{wallet}-{ts}' (UI-triggered)

chat_sessions (id, wallet, tx_id UNIQUE, prev_tx_id, session_id, chunk_index,
               chat_title, summary, msg_count, created_at)
-- Memory Vault index; actual content lives on Irys

game_wins (id, wallet, game_type, tokens_earned, session_id UNIQUE, created_at)
applications_1000 (id, fio, contact, language, avatar_desc, reason, status, created_at)
```

Migrations auto-run as `prebuild` in `package.json` (idempotent; skips if `DATABASE_URL` not set).

---

## Smart Contract

### Program IDs
| Env | Program ID |
|-----|-----------|
| Prod (`main`, frozen) | `8rzMmrC6UH5gCringWk1NsRXtfWkrfjz91tT5dmEGAep` |
| Dev (`develop`) | `6EPLCgJA7RQ999rAVntjHSJnWzozPGGkcinZgYt15JXQ` |

### Key Pubkeys (both envs share unless noted)
| Name | Address | Notes |
|------|---------|-------|
| `BACKEND_AUTHORITY` | `96JwAJL2hn3FHxViqy9oirBdpcDH5rGsvukjTGyiTap4` | Signs `update_site_url` |
| `ECOSYSTEM_FUND_WALLET` | `CkiiA1BETdpSbt76PChhnKVzXxLjJXT99yA4yfRtT88c` | Receives 5% |
| USDC Mint | `5f76mcT9Cgo8oRfWDnsHnZjj9ZqvjcqaXPcrEMEbQsy5` | Mock devnet USDC (6 decimals) |
| Vault PDA | `4tL3hpb5VnujtirGtNbRxWyCq7LEbh4hkFGstdUxHNqt` | seeds=["vault"] |
| Mint Authority | `9NJhwafwj7HSHAj4fvgkmsPqFRT4PFtyqtnvS9ERf2Sv` | Devnet airdrop keypair |
| Irys Wallet | `8NpeaoihGbipm7pNPHDMAu8ASXt6tBXZsuLoT9oYWM4X` | Arweave uploads |
| Dev vault ATA | `CCAaR9hh427TkXQbroNpLE6MVGo7JNqwMe5ye4chHNsM` | Dev program only |

### Instructions
| Instruction | Caller | Effect |
|-------------|--------|--------|
| `register_user(referrer?)` | User wallet | Creates UserState PDA; tier=0 |
| `process_payment(amount, tier, ref1, ref2, ref3)` | User wallet | Distribute USDC atomically, burn, update tier+tier_expires |
| `update_site_url(arweave_url, site_status)` | Backend keypair | Write Arweave TX ID + status; 60s cooldown |
| `award_memory(score)` | Backend keypair | Add memory_score (Think-to-Earn) |

### UserState Binary Layout
```rust
pub struct UserState {
    owner: Pubkey,            // [8..40]
    referrer: Option<Pubkey>, // [40] flag (0=None,1=Some); [41..73] if Some → base=73, else base=41
    tier: u8,                 // [base+0]   0=none 1=Spark 2=FamilyArchives 3=DigitalDNA
    registered_at: i64,       // [base+1..+9]
    tier_expires: i64,        // [base+9..+17]  0=never paid; 30-day subscription
    memory_score: u64,        // [base+17..+25]
    arweave_url: [u8; 64],    // [base+25..+89] TX ID (43 chars, zero-padded)
    site_status: u8,          // [base+89]  0=pending 1=ready 2=error
    last_site_update: i64,    // [base+90..+98]
    bump: u8,                 // [base+98]
}
// Seeds: ["user", wallet_pubkey]
```

### Key Design Decisions (Contract)
| Decision | Reason |
|----------|--------|
| `#[derive(InitSpace)]` | Auto-computes account size — no manual byte counting |
| `UncheckedAccount` for referral token accounts | Optional accounts — Anchor can't constrain them; gated by `ref1.is_some()` arg, not key |
| `payment_mint` marked `#[account(mut)]` | `token::burn` CPI decrements total supply — mint must be writable |
| Expired referrer → vault (not burn) | Balanced tokenomics; absent referrer → burn |
| On-chain referral chain validation | `ref1 == user.referrer`, `ref2 == ref1.referrer`, etc. — prevents spoofing via DB mismatch |
| Tier downgrade allowed on subscription expiry | When active: `tier >= current_tier` enforced; when expired: any tier accepted (renewal) |

Compiler warnings suppressed: `#![allow(ambiguous_glob_reexports)]` in `instructions/mod.rs` (Anchor macro requires glob re-exports); `#![allow(unexpected_cfgs)]` in `lib.rs` (Anchor 0.30.1 + Rust 1.89 issue).

---

## Data Flow

### Payment → Site Generation
```
User → Google login (Privy) → createWallet() → Solana embedded wallet

User clicks Buy → /cabinet/buy?tier=N
  Devnet: auto-airdrop 10,000 mock USDC if needed (/api/devnet/airdrop-usdc)
  Production: MoonPay via Privy useFundWallet → card → USDC

Frontend: GET /api/referrals/chain → ref1/ref2/ref3 from DB
Frontend: build Anchor tx manually (.transaction(), NOT rpc() — incompatible with Privy)
  1. register_user tx → Privy dialog #1 (first-time only; skipped if already registered)
  2. process_payment tx → Privy dialog #2

Helius webhook → POST listener:3001/webhook/helius (auth: Authorization: <HELIUS_WEBHOOK_SECRET>)
Listener:
  1. Skip if tokenTransfers.length == 0 (register_user, update_site_url have no transfers)
  2. Parse feePayer from rawEvent.feePayer; decode tier from UserState binary
  3. Write burn_events, referral_payments; upsert users.tier
  4. Send HTML email via Resend
  5. If no done job → POST site-gen:3002/jobs (first payment)
     If done job exists (arweave_url IS NOT NULL) → copy URL, mark new job done (preserves custom site)

site-gen (/jobs):
  1. Compile Handlebars template → standalone HTML (≤95KB or throws)
  2. Irys.upload(html, {tags}) → txId  (devnet.irys.xyz; free <100KB)
  3. update_site_url on-chain (retries after 70s if UpdateCooldown error)
  4. Mark job done; store full Irys CDN URL in arweave_url column
```

### UI-Triggered Site Regen
```
Site tab form → POST /api/site/create
  Auth: Privy JWT — wallet in body must match authenticated wallet
  Checks: tier > 0 + not expired + regen limit (Tier1=1, Tier2=5, Tier3=10 per 30d)
  COALESCE update: preserves existing user fields if not provided
  Insert job with tx_sig='ui-regen-{wallet}-{ts}'
  waitUntil() POST to site-gen with full payload + avatarDataUrl

Cabinet polls /api/users/site-status every 5s (max 36 attempts = 3 min)
```

### AIfa Chat + Memory
```
User message → POST /api/chat
  Load last_chat_tx_id from users table
  Fetch ChatFilePayload from Irys → summary + keyFacts → inject into system prompt
  Call Grok API (grok-3) → return reply

Save triggers (client): unsaved bytes ≥ 80KB, OR 5-min inactivity after last reply, OR tab hide
→ POST /api/chat/save-memory (Privy JWT auth)
  Generate summary + keyFacts from full delta (Grok, max_tokens=400, temp=0.3)
  Filter to user-only messages before building payload (AIfa replies excluded)
  Irys.upload(payload, tags) → txId  (payload always ≤ ~85KB due to delta save)
  UPDATE users.last_chat_tx_id; INSERT INTO chat_sessions
```

---

## Frontend Architecture

**Stack:** Next.js 16 App Router, React 19, Tailwind, Solana Web3.js, Anchor 0.30.1, Privy 3.x  
**Theme:** Dark purple (`#7C3AED` accent, `#0A0A0F` background)

### Key Decisions
| Decision | Reason |
|----------|--------|
| `next/dynamic({ ssr: false })` for cabinet + buy | `force-dynamic` does NOT prevent SSR in App Router — Privy hooks crash; dynamic import required |
| Manual `.transaction()` + `sendTransaction()` | Anchor `rpc()` throws "Expected Buffer" with Privy embedded wallets |
| `chain: "solana:devnet"` in `signAndSendTransaction` | Privy 3.x defaults to mainnet — explicit chain required |
| `createWallet()` in `useEffect` | `createOnLogin: "off"` — explicit Solana wallet creation |
| `@irys/sdk` in `serverExternalPackages` | Turbopack bundles Aptos adapter → `got` (not installed) → build failure |
| `turbopack: {}` in next.config.js | Next.js 16 Turbopack default; suppresses webpack conflict warning |
| `Program({ ...IDL, address: PROGRAM_ID.toBase58() }, provider)` | IDL.address is hardcoded to prod; must override for dev — both PDA derivation and tx must target same program |
| Neon pg Pool `max: 20` | Prevents exhaustion under concurrent Vercel function load |
| `ref_code` cleared in localStorage only on successful registration | Clearing unconditionally loses referral attribution on failed register |

### File Structure
```
app/src/
├── app/
│   ├── layout.tsx           PrivyProvider config
│   ├── page.tsx             Login → /cabinet redirect
│   ├── cabinet/page.tsx     8-tab SPA (Cabinet/AIfa/Memory/Games/DAO/Site/Contract/Metrics)
│   └── api/
│       ├── users/register/          POST — upsert user, generate ref_code
│       ├── users/site-status/       GET  — job status + arweave URL + regen counts
│       ├── referrals/chain/         GET  — ref1/ref2/ref3 wallets
│       ├── referrals/income/        GET  — earnings by level + locked income
│       ├── devnet/airdrop-usdc/     POST — mint 10,000 test USDC
│       ├── site/create/             POST — Privy auth, regen limits, dispatch to site-gen
│       ├── site/by-username/        GET  — username → arweave_url (for CF Worker)
│       ├── chat/                    POST — Grok proxy, memory context injection
│       ├── chat/save-memory/        POST — Privy auth, Irys upload, DB index
│       ├── chat/sessions/           GET  — Privy auth, Memory Vault session list
│       ├── games/reward/            POST — Privy auth, record win, dedup by session_id
│       ├── games/leaderboard/       GET  — top 100 by game_type
│       ├── stats/metrics/           GET  — burn, txns, wallets, treasury, monthly history
│       ├── stats/overview/          GET  — burnedUsdc, burnTxs, activeMembers, sitesCreated
│       ├── stats/recent-txns/       GET  — recent payments (excludes ui-regen)
│       ├── stats/top-contributors/  GET  — top referral earners
│       └── webhooks/privy/          POST — Privy webhook (UPDATE only — never inserts users)
├── components/
│   ├── AlfaTab.tsx          Chat UI; real KB progress bar (CHUNK_MAX_BYTES=80KB)
│   ├── MemoryTab.tsx        Session timeline; fetches payloads from Irys; Privy JWT auth
│   ├── SiteTab.tsx          Site form + avatar upload (canvas resize, JPEG compress) + preview
│   ├── ContractTab.tsx      Smart Contract info + distribution viz
│   └── games/               Chess (Minimax d3), Checkers (Minimax d5), Backgammon (heuristic), TicTacToe
├── hooks/
│   ├── useAlfaChat.ts       Chat state, delta save, inactivity timer, stale-closure refs
│   └── useCabinetData.ts    Wallet data, tier expiry, income, referrals, site status
├── lib/
│   ├── db.ts                Neon pg Pool (hot-reload guard)
│   ├── i18n.ts              4-language translations (en/ru/es/zh)
│   ├── knowledge-base.ts    AIfa system prompt — full project + feature knowledge
│   └── chat-memory/
│       ├── types.ts         ChatLogMessage, ChatFilePayload, ChatSessionMeta
│       ├── tags.ts          Irys upload tag builder
│       ├── graphql.ts       Read-only Arweave GraphQL (mainnet portal)
│       ├── context.ts       loadPayloadByTxId + prepareContextForAI (server-side)
│       └── trigger.ts       CHUNK_MAX_BYTES=80_000, getUnsavedBytes, shouldSaveChunk, hasUnsavedMessages
├── idl/code_eternal_router.ts   Typed IDL + UserStateOnChain type + fetchUserStateAccount()
└── types/cabinet.ts         Shared SiteStatus type
```

### Cabinet Tabs
| Tab | Content |
|-----|---------|
| Cabinet | Tier cards, site status (Open Passport + View on Arweave), referral link, income widget, top contributors, recent txns |
| AIfa Terminal | Grok-3 chat; real KB progress bar towards 80KB save threshold |
| Memory Vault | Session timeline from chat_sessions; click → fetch payload from Irys |
| Games | Chess (d3 Minimax), Checkers (d5 Minimax), Backgammon (heuristic), Tic-Tac-Toe |
| DAO | 3 governance proposals; local-state voting |
| Site | Form: username/bio/manifesto/avatar/social; live preview; POST /api/site/create |
| Smart Contract | Distribution viz (5/15/7/3/5/65), PDA table, real program ID |
| Metrics | 6 stat cards, SVG sparkline, SVG donut, live event feed |

---

## Listener Service

`app/listener/src/` — Express, `POST /webhook/helius`

**Helius event detection:**
```typescript
const hasOurProgram =
  event.instructions?.some((ix: any) => ix.programId === programIdStr) ||
  event.programId === programIdStr;
// Skip if event.tokenTransfers.length == 0 (register_user, update_site_url have no transfers)
// Payer: rawEvent.feePayer
```

**Tier decoding from raw UserState buffer:**
```typescript
function decodeTier(data: Buffer): number {
  const hasReferrer = data[40] === 1;
  return data[hasReferrer ? 73 : 41];
}
```

**onPaymentProcessed:** parse feePayer → decode tier (with retry/backoff — Helius arrives before RPC propagates) → write burn_events + referral_payments → upsert users.tier → send email (Resend) → dedup by tx_signature → if first payment: POST site-gen:3002/jobs; if repeat: copy existing arweave_url (must have arweave_url IS NOT NULL), mark done.

Expected noise (not bugs): `Skipping non-payment tx` (correct behavior); `duplicate key value violates unique constraint tx_signature` (Helius retries 3-5x — dedup works).

---

## Site-Gen Service

`app/site-gen/src/` — Express, `POST /jobs` (auth: `Authorization: Bearer <SITE_GEN_SECRET>`)

- Irys node: `https://devnet.irys.xyz` (mainnet: `https://node2.irys.xyz`)
- Irys CDN URL format: `https://<hash>.devnet-1.datasprite-cdn.com/<TX_ID>` — TX ID is last path segment, stored on-chain
- 60s cooldown: `updateSiteUrlOnChainWithCooldownRetry()` retries once after 70s on `UpdateCooldown`
- 95KB HTML size guard in `arweave.ts` — throws before upload if exceeded
- `sanitizeUrl()` validates `https://` prefix on website (prevents `javascript:` injection)

**Handlebars template variables:**
- Required: `{{name}}`, `{{wallet}}`, `{{walletShort}}`, `{{tier}}`, `{{tierColor}}`, `{{txSignature}}`, `{{registeredAt}}`, `{{year}}`
- Optional: `{{username}}`, `{{bio}}`, `{{manifesto}}`, `{{telegram}}`, `{{twitter}}`, `{{website}}`, `{{hasSocial}}`, `{{avatarDataUrl}}`

`update_site_url` accounts (must match Rust): `{ backendAuthority, userState, userWallet }`

---

## AIfa Memory Subsystem

### Design Decisions
| Decision | Reason |
|----------|--------|
| Chats are public | CODE ETERNAL philosophy — eternal, open memory |
| User messages only stored on Irys | AIfa replies are reproducible and 10x larger; summary generated from full conversation before filtering |
| `CHUNK_MAX_BYTES = 80_000` | Fits Irys 100KB free tier; each chunk bounded regardless of conversation length |
| Delta save — `msgs.slice(lastSaved)` | Prevents payload growth; each upload always ≤80KB |
| 3 save triggers | 80KB auto (natural cadence) + 5-min inactivity (idle reader) + `visibilitychange` (tab close) |
| `alfaLastSavedRef` + `alfaPrevTxIdRef` + `alfaChunkIndexRef` | Stale closure prevention — async callbacks must read current state |
| Neon DB as session index | Irys devnet GraphQL unreliable; mainnet Arweave GraphQL for production reads |

### ChatFilePayload
```json
{
  "version": 1, "wallet": "...", "sessionId": "nanoid", "chunkIndex": 0,
  "prevTxId": null,
  "metadata": { "summary": "...", "keyFacts": ["..."] },
  "messages": [{ "role": "user", "content": "...", "timestamp": 0 }]
}
```
Only `role: "user"` messages stored. Summary generated from full conversation before filtering.

### Irys Tags
`App-Name: CodeEternal-AIfa-Memory` · `User-Identifier` · `Session-ID` · `Sequence-Number` · `Prev-TX-ID` · `Chat-Title` · `Summary` · `Timestamp`

---

## Environment Variables

| Service | Variable | Description |
|---------|----------|-------------|
| listener, site-gen | `HELIUS_RPC_URL` | Helius RPC with API key |
| listener | `HELIUS_WEBHOOK_SECRET` | Webhook auth header |
| listener, site-gen | `PROGRAM_ID` | Contract address |
| listener, site-gen | `DATABASE_URL` | Neon connection string |
| listener | `SITE_GEN_URL` | `http://site-gen:3002` (Docker internal) |
| listener | `RESEND_API_KEY` | Email delivery |
| site-gen | `IRYS_PRIVATE_KEY` | Base58 keypair for Irys uploads |
| site-gen | `BACKEND_PRIVATE_KEY` | Base64 keypair — same as BACKEND_AUTHORITY on-chain |
| site-gen | `SITE_GEN_SECRET` | 64-char hex token |
| Next.js | `NEXT_PUBLIC_PRIVY_APP_ID` | Baked at build time |
| Next.js | `NEXT_PUBLIC_RPC_URL` | Helius RPC (public) |
| Next.js | `NEXT_PUBLIC_PROGRAM_ID` | Contract address |
| Next.js | `NEXT_PUBLIC_USDC_MINT` | `5f76mcT9Cgo8oRfWDnsHnZjj9ZqvjcqaXPcrEMEbQsy5` |
| Next.js | `MOCK_USDC_MINT` + `MOCK_USDC_MINT_AUTHORITY` | Server-side devnet airdrop |
| Next.js | `DATABASE_URL` | Neon connection |
| Next.js | `GROK_API_KEY` | xAI Grok API (model: grok-3) |
| Next.js | `SITE_GEN_URL` | `https://listener.codeofdigitaleternity.com` |
| Next.js | `SITE_GEN_SECRET` | Must match VM .env value |
| Next.js | `PRIVY_APP_SECRET` | Server-side JWT verification |
| Next.js | `IRYS_PRIVATE_KEY` + `IRYS_NODE_URL` + `HELIUS_RPC_URL` | Chat memory Irys uploads |
| Next.js | `NEXT_PUBLIC_ARWEAVE_GRAPHQL_URL` | `https://arweave.net/graphql` |
| GitHub Actions | `BACKEND_PRIVATE_KEY`, `DEPLOY_KEYPAIR` | Contract CI/CD |
| GitHub Actions | `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `VM_SSH_KEY` | Docker CI/CD |
| GitHub Actions | `DATABASE_URL_DEV`, `DATABASE_URL_PROD` | DB migrations |
| GitHub Actions | `CF_API_TOKEN`, `CF_ACCOUNT_ID` | Cloudflare Worker deploy |

---

## Deployment Quick Reference

**Next.js app:** Push to `develop` → Vercel preview auto-deploys. Push to `main` → prod.  
Manage env vars: `cd app && vercel env add VAR_NAME production`

**Listener/site-gen dev:** Push to `develop` with changes in `app/listener/**` or `app/site-gen/**` → `deploy-dev.yml` builds `:dev` + SSHs to VM.

**Add VM env var (from WSL):**
```bash
wsl -e bash -c "ssh root@128.140.0.118 'echo KEY=value >> /opt/code-eternal/.env.dev'"
wsl -e bash -c "ssh root@128.140.0.118 'cd /opt/code-eternal && docker compose -f docker/docker-compose.yml --profile dev up -d --force-recreate listener-dev site-gen-dev'"
```

**Manual Docker build (ARM64, from WSL):**
```bash
docker buildx build --platform linux/arm64 --no-cache -t maxshchuplov/code-eternal-listener:dev --push ./app/listener
```
Always use `--no-cache` — stale build layers cause silent bugs with Next.js/webpack caching.

Node scripts must run from WSL Linux filesystem (`~/`), not `/mnt/c/` — NTFS permissions break npm.

---

## Admin Scripts (`app/scripts/`)

| Script | Purpose |
|--------|---------|
| `reset-user.js <wallet>` | Reset tier=0 + delete site jobs (DB only, on-chain untouched) |
| `wipe-users.js` | Delete all rows from users/jobs/payments/burns |
| `retry-site-url.js` | Manually call update_site_url + mark job done |
| `check-jobs.js` | Print site_generation_jobs for a wallet |
| `init-vault-atas.js` | Create vault + ecosystem ATAs (idempotent; run after devnet resets) |
| `setup-devnet.js` | Create mock USDC mint + ATAs (already run 2026-05-06) |

---

## Known Issues / Backlog

- `UrlTooLong` error reused for invalid site status — add `InvalidSiteStatus` variant
- Burn incompatible with real USDC (needs mint authority) — different mechanism required for mainnet
- Grammy Telegram bot not implemented — add `TELEGRAM_BOT_TOKEN` when ready
- PDF email attachment — Resend email is HTML only
- Rate limiter in-memory per Vercel instance — needs Redis/Upstash for true global limits
- `tier_expires=0` means "never paid" — expired referrers treated as inactive (intended behavior)
- cNFT Guardian Passport (Metaplex Bubblegum) — post-hackathon

---

## Rules

- **All UI text must be in English.** No Russian anywhere in the UI.
- **`main` branch is frozen.** Never push to main directly. Never migrate prod DB. Never add prod Vercel env vars without explicit instruction.
- **`:latest` Docker image is frozen.** Dev CI pushes only `:dev` — never `:latest`.
- All new secrets go into `secrets/` immediately and to VM `.env`/`.env.dev` manually.
- NEVER commit secrets or API keys. Rotate immediately if exposed.
