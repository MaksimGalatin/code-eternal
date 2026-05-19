# CODE ETERNAL — Copilot Instructions

> Full architecture: **CLAUDE_CONTEXT.md** — read it before making changes.

## Critical Rules

- `main` branch is **FROZEN** — never push directly, never migrate prod DB, never add prod Vercel env vars
- `:latest` Docker images are **FROZEN** — dev CI pushes only `:dev`
- All UI text must be in **English** — no Russian anywhere in the UI
- Never commit secrets — rotate immediately if exposed
- Secrets: `secrets/` (gitignored) + VM `/opt/code-eternal/.env` / `.env.dev`

## Code Quality

- Don't bloat files — each line should reduce future token cost, not increase it
- Prefer tables over prose; no comments explaining *what* — only *why*
- Delete dead code and historical changelogs (they belong in git)

## Architecture Quick Reference

| Layer | Where | Notes |
|-------|-------|-------|
| Next.js 16 app | Vercel | `app.codeofdigitaleternity.com` (main) / `dev.app.*` (develop) |
| Listener + site-gen | Docker, Hetzner `128.140.0.118` | `:latest` frozen / `:dev` active |
| Solana contract | Devnet | Prod `8rzMmrC6...` / Dev `6EPLCgJ...` |
| Database | Neon PostgreSQL | prod=main branch / dev=develop branch |
| Arweave storage | Irys devnet | Sites + AIfa memory |

## Key Technical Decisions

| Decision | Reason |
|----------|--------|
| `next/dynamic({ ssr: false })` for cabinet+buy | Privy hooks crash during SSR |
| Manual `.transaction()` instead of Anchor `rpc()` | Anchor `rpc()` incompatible with Privy embedded wallets |
| `Program({ ...IDL, address: PROGRAM_ID.toBase58() })` | IDL.address hardcoded to prod — must override for dev |
| `@irys/sdk` in `serverExternalPackages` | Turbopack bundles Aptos adapter → missing `got` → build failure |
| `chain: "solana:devnet"` in signAndSendTransaction | Privy 3.x defaults to mainnet otherwise |

## Dev Workflow

- Push to `develop` → Vercel auto-deploys preview; CI builds `:dev` Docker images
- Anchor/Cargo builds must run from `contract/` directory
- Node scripts must run from WSL Linux filesystem (`~/`), NOT `/mnt/c/` — NTFS breaks npm
- Add VM env var: `ssh root@128.140.0.118 'echo KEY=value >> /opt/code-eternal/.env.dev'`
