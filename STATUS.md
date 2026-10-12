# STATUS — Allowance (Colosseum Crypto World's Fair MVP)

**Owner:** Anthony Beaumont (Encode Club). **Stage:** hackathon MVP, Solana **devnet**, test-USDC only.
**Submissions close:** 11:59pm PDT Mon 12 Oct 2026 = **06:59 UTC Tue 13 Oct**. Ready-by target: **21:30 UTC 12 Oct**.

---

## What is built

**Product:** *Allowance — a company card for AI employees.* Each AI agent gets its own USDC card: a token account the business owns, where the agent is only an **SPL Token delegate with a capped allowance**. The cap is enforced by the Token program, not by our app. Over budget → on-chain request → one-tap owner approval. Every payment writes a memo receipt; CSV export for the books.

**App** (`app/`, Next.js 16 + Tailwind 4, deployed to Vercel):
- `src/lib/config.ts` — agents (Ava/ops, Leo/research), merchants, tasks. Single source of truth.
- `src/lib/solana.ts` — keys, deterministic card addresses (seed-derived), transfers, memos, delegate allowance, retry/confirm logic.
- `src/lib/x402.ts` — HTTP 402 payment requirements, `X-PAYMENT` header, on-chain verification.
- `src/lib/actions.ts` — owner actions + the agent task loop (streams its steps to the console).
- `src/lib/ledger.ts` — folds HMAC-tagged memo events into dashboard state; CSV export.
- `src/app/api/…` — `state`, `owner/{budget,revoke,decide,reset}`, `agent/run` (NDJSON stream), `merchant/[product]` (402), `receipts.csv`.
- `src/components/App.tsx` — owner dashboard, live agent console, approvals, receipts, how-it-works.
- `scripts/` — `keygen.mjs`, `derive-env.mjs`, `setup-devnet.mjs`, `e2e.mjs`, `faucet-loop.sh`.

**Verified locally (14:45 UTC):** production build clean; `GET /` → 200; `GET /api/merchant/market-report` → **402** with valid payment requirements; `/api/state` returns the demo business. UI screenshot: `shots/ui-local.png`.

**Repo:** https://github.com/olivia-saint/allowance (public, MIT). Only `.env.example` is committed; all keypairs live in `.env.local` (0600, git-ignored) and Vercel env vars.

**Live:** https://allowance.olivia.saint.work

---

## Blocked: devnet SOL

The demo's mint, treasury, merchant accounts and agent cards do not exist yet because **no devnet SOL can be obtained from an automated faucet today**. Everything waits on ~0.05 SOL on the business key.

Tried and failed (details in `faucet-status.md`): public RPC `requestAirdrop` → 429 (daily limit / faucet dry, retried continuously by `scripts/faucet-loop.sh`); faucet.solana.com → explicitly asks AI agents not to use it; solfaucet.com → same RPC, same 429; triangleplatform → suspended; QuickNode/Chainstack → need mainnet funds; devnetfaucet.org + Pinestake → need a GitHub login (not permitted to sign in); zan.top → account; Ankr/dRPC/OnFinality/Helius/PublicNode → API key or paid; proof-of-work faucet (`devnet-pow`) → all 23 on-chain pools empty.

**Asked Anthony (Discord, 14:41 + 14:51 UTC)** to spend 30 seconds pasting the business address into faucet.solana.com (Devnet, 5 SOL). That is the unblock.

---

## Done

- [x] Scaffold, deps, devnet keygen, env vars in Vercel
- [x] Core on-chain + x402 + ledger + agent-run libraries
- [x] API routes (state, owner actions, agent stream, 402 merchant, CSV)
- [x] Owner dashboard + agent console UI
- [x] Logo (`brand/logo.svg` + 512×512 PNG, in `app/public/`)
- [x] Public GitHub repo with README, `.env.example`, limitations section
- [x] Deployed to https://allowance.olivia.saint.work
- [x] Pitch pack: market research, script, 10 slides + PDF, submission drafts (`pitch/`)
- [x] Demo video script (`submission/DEMO-VIDEO-SCRIPT.md`)
- [x] E2E harness (`app/scripts/e2e.mjs`): real browser, desktop + mobile, checks every explorer link against devnet RPC

## Next (in order, once funded)

1. `node scripts/setup-devnet.mjs` — mint dUSDC, fund treasury, create cards, set allowances ($150 Ava / $25 Leo).
2. Run `scripts/e2e.mjs` against the live URL; fix anything it finds; re-run until green.
3. Dashboard screenshots → re-render slides with logo + screenshot (`pitch/slides/render.sh`).
4. Record demo video (Playwright, 1920×1080) → `submission/demo.mp4` + `public/allowance/demo.mp4`, narration via ElevenLabs.
5. Final `submission/SUBMISSION.md` (ready-to-paste answers + Anthony's team details).
6. Re-verify every explorer link by hand; re-run E2E after any deploy.

---

## Honesty log

- No invented users, revenue, traction or partnerships. Every market figure in the pitch is sourced in `pitch/market-research.md`.
- The $600 supplier invoice is a **mock merchant** in the demo; x402 here is our own implementation of the payment-requirements shape, not the official facilitator.
- Test-USDC is a devnet mint we created, not real USDC.
- Never mainnet, never real funds.

## Decisions

- **Supabase dropped** — the account is at its 2-active-free-project limit. State lives on-chain instead: the dashboard is a view over the owner's transaction history, memo-authenticated with an HMAC so receipts can't be forged.
- **No custom program** — audited SPL Token `Approve` / `transferChecked` / `Revoke` + the Memo program. Less audit surface, and the chain is the ledger.
- **Fees sponsored by the business key**, so agent keys never need SOL.
- Over-allowance transfers are **simulated** in the agent console so judges see the Token program's own error, not our error message.
