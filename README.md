# Allowance — a company card for your AI employees

**Give every AI agent a spending limit it physically cannot exceed.**

Agents are starting to buy things: API calls, data, bookings, supplies. Today you either hand them a card and hope, or you approve every tiny purchase by hand. Allowance is the middle ground — a per-agent budget enforced by the **Solana SPL Token program**, not by our servers, with one-tap owner approval when an agent needs to go over it.

Built for the **Colosseum Crypto World's Fair**, October 2026. Runs on **Solana devnet** with test-USDC.

- Live app: https://allowance.olivia.saint.work
- Demo video: [`submission/demo.mp4`](submission/demo.mp4)

---

## The problem

AI employees are useful right up to the moment they have to pay for something. In our own operations we watch agents do the research, choose the supplier, fill the form — and then stop dead at the checkout, because card payments assume a human hand on a secure field. The fix people reach for is a company card with a limit, but a corporate card has no idea which agent spent what, cannot be scoped to one task, and takes days to issue.

What agents actually need is a **wallet with a leash**: money they can spend without asking, a hard ceiling that holds even if their software is wrong or compromised, and a human who can say yes to the exception in one tap.

## What Allowance does

1. **A card per agent.** Each AI employee gets its own token account for USDC. The business owns the account and keeps custody; the agent is only ever a delegate.
2. **The cap is on-chain.** The owner calls SPL Token `Approve` with a limit. Spending above it is rejected by the token program itself — not by a policy engine we run. Revoke is a single transaction and takes effect immediately.
3. **Agents pay instantly.** Per-request APIs answer `HTTP 402` with payment requirements (x402); the agent pays in USDC, then retries with the transaction signature as proof. Invoices and bookings use the same primitive. Fees are sponsored by the business, so agent keys never need SOL.
4. **Over budget → one tap.** The chain refuses the overspend, so the agent files an on-chain request. The owner approves, the allowance is raised for that payment, the agent completes it. No silent failures, no unlimited cards.
5. **Receipts, not spreadsheets.** Every action writes a structured memo (`allowance:v1`) to the chain and resolves to a Solana Explorer link. One click exports a CSV ledger.

## Try it

Open the app and use the **agent console**:

| Task | Merchant | Amount | What it demonstrates |
| --- | --- | --- | --- |
| Market report | Tickerwire (data API) | $2 | x402 pay-per-request: `402` → pay → retry → `200` |
| Meeting room | Roomly (rooms API) | $40 | Same flow against a second merchant |
| Supplier invoice | Northwind Supplies | $600 | Over budget → on-chain request → owner approval → payment |

Verify the merchant really charges, with no payment at all:

```bash
curl -i https://allowance.olivia.saint.work/api/merchant/market-report
# HTTP/2 402 + JSON payment requirements (scheme, network, asset, amount, payTo)
```

Send a payment and look it up:

```bash
curl -s https://allowance.olivia.saint.work/api/state | jq '.receipts[0]'
```

## How it works

```
Business treasury (USDC)
   │  fund + approve(agent, cap)          ← owner signs
   ▼
Agent card  ── SPL token account owned by the business
   │  transferChecked as delegate         ← agent signs, owner pays the fee
   │  + memo receipt {id, purpose, ref}
   ▼
Merchant / x402 API ── verifies the transfer on-chain → 200 OK

Over the cap?  the token program rejects it
   → agent files an on-chain request with a memo
   → owner taps Approve (new delegated amount = current allowance + amount)
   → agent completes the payment → both transactions linked as one receipt
```

**Why no custom program?** `Approve` + `transferChecked` + `Revoke` are the audited SPL Token instructions. A hackathon contract would add risk and audit surface for no gain. The chain is the ledger; the dashboard is a view over owner transaction history (memo-authenticated with an HMAC so a third party cannot forge a receipt into the ledger).

## Repo layout

```
app/
  src/lib/config.ts     agents, merchants and tasks (single source of truth)
  src/lib/solana.ts     keypair loading, card PDAs, transfers, memos, delegate allowance
  src/lib/x402.ts       payment requirements, header encoding, on-chain verification
  src/lib/actions.ts    owner actions + the agent's task loop (streams its steps)
  src/lib/ledger.ts     folds memo events into dashboard state + CSV export
  src/components/App.tsx  dashboard, agent console, receipts
  src/app/api/...       state, owner actions, agent run (NDJSON stream), merchant 402s
  scripts/setup-devnet.mjs  one-time devnet setup: mint, treasury, cards, allowances
  scripts/keygen.mjs        generates the devnet keypairs
pitch/                  slides, script, market research
submission/             demo video + ready-to-paste submission text
```

## Run it yourself (devnet)

```bash
cd app
npm install
cp .env.example .env.local        # then fill the secrets (see below)
node scripts/keygen.mjs           # creates devnet keypairs, writes .env.local (0600)
node scripts/derive-env.mjs       # adds derived public addresses + an HMAC secret
node scripts/setup-devnet.mjs     # needs ~0.05 devnet SOL on the business key
npm run dev
```

`.env.example` lists every variable. Only `.env.example` is committed — the real keys, including the devnet keypairs, live in `.env.local` (git-ignored) and in the host's environment.

## Limitations (read these)

- **Devnet only.** Test-USDC we minted ourselves. No real money, no mainnet support.
- **Test-USDC, not real USDC.** On mainnet this is a one-line change to the mint address.
- **Custody is single-key.** The business wallet is one hot key; production needs a Squads multisig or hardware signer.
- **The dashboard is a view, not the source of truth.** It rebuilds state from the owner's transaction history, so it can lag by an RPC round-trip.
- **x402 here is our own implementation** of the payment-requirements shape, not the official facilitator. It verifies the transfer itself.
- **No user accounts.** One demo business, deliberately, so judges can click straight into the flow.
- **Invoices are simulated.** Northwind Supplies is a mock merchant, not a real supplier integration.

## Licence

MIT.
