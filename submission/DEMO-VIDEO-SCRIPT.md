# Demo video script — Allowance (≤3:00)

Target: **2:40**. Recorded against the live devnet app in a real browser, then narrated.
Every claim in this script is verifiable in the app or on Solana Explorer.

---

## 0:00–0:12 — The problem (screen: the app hero, slowly scrolling)

> "AI agents are finally useful enough to buy things. But the moment they reach a checkout, they stop — card payments assume a human hand on a secure field. So you either hand an agent an unlimited card, or you approve every two-dollar API call yourself."

## 0:12–0:30 — What Allowance is (screen: dashboard, hovering the two agent cards)

> "Allowance is a company card for your AI employees. Each agent gets its own USDC card. The budget isn't a rule in our database — it's an **SPL Token delegate allowance on Solana**. The token program itself refuses the overspend."

Point at: *Ava · Operations agent · $150.00 left · Active · Card (owned by you) · Agent key (delegate)*

## 0:30–1:05 — A normal payment: x402 (screen: agent console, click "Buy a market data report")

> "Let's have Ava buy something. This merchant API charges per request. The agent calls it — and gets an HTTP 402, with the price, the token and the address."

Show the log: `POST /api/merchant/market-report → 402 Payment Required`, then `402 Payment Required · $2.00 dUSDC to Tickerwire`.

> "Two dollars, inside her hundred-and-fifty-dollar allowance, so the token program accepts the transfer. The business pays the network fee. She retries with the signature as proof — and the merchant verifies it on-chain before answering."

Show log: `Signature confirmed` + `200 OK · report delivered` + Explorer link. Click the Explorer link; show the transfer, then the memo.

> "Every payment writes a receipt to the chain: who, how much, and what for. That's a real transaction on Solana devnet."

## 1:05–1:35 — Instant revoke (screen: back to dashboard, click "Revoke card instantly")

> "If you're worried, revoking is one transaction. Not a ticket to your bank — one transaction."

Show the toast with a devnet transaction link, card flips to **Revoked**, remaining balance back in the treasury.

> Then: "Set it again just as fast." — set Ava back to $150, show the toast and the card return to **Active**.

*(Cut out any waiting.)*

## 1:35–2:15 — Over budget → one tap (screen: agent console, click "Pay a supplier invoice" ($600))

> "Now the interesting case. A supplier invoice for six hundred dollars — four times her allowance. Watch what the agent does when the chain says no."

Show log: `Simulating the transfer to prove the cap is enforced by the token program` → the **SPL Token error** (`custom program error: 0x3` / delegate allowance exceeded) → `Requesting owner approval` → memo link.

> "That refusal is the Solana token program, not our code. So she files a request on-chain — and the owner gets one tap."

Cut to **Waiting for approval → Approve & pay**. Click it. Show the log continuing to `200 OK` and the receipt landing in the list, badged **Approved by owner**, with both transaction links.

> "The approval raises the allowance for exactly that payment, the transfer goes through, and the receipt links both transactions. No silent failure, no unlimited card."

## 2:15–2:35 — Receipts and the ledger (screen: Receipts list → click Export CSV → show the CSV)

> "Every payment is a row: agent, merchant, purpose, amount, transaction. Export it as a CSV and it's a spend report your accountant can actually reconcile."

## 2:35–2:55 — Close (screen: the "How it works" diagram, then the hero)

> "No custom smart contract. It's the audited SPL Token program — approve, transferChecked, revoke — plus memos for receipts. The chain is the ledger; this dashboard is a view over it. Allowance: give your AI employees a wallet with a leash."

---

## Filming notes

- 1920×1080 browser window, no bookmarks bar, no other tabs.
- Use devnet throughout; the badge in the header says so. Say "devnet" once, early.
- Pause ~1s on each Explorer link so it's readable; the editor can slow-mo them.
- Every on-chain link shown must resolve — check each one before export.
- If a run is slow, cut the wait; do not fake the log.

## Honesty checklist

- Do **not** claim real USDC, real users, real revenue or a partnership with any named company.
- The supplier invoice is a **mock merchant** in the demo, not a real supplier integration.
- x402 here is our own implementation of the payment-requirements shape; say "x402-style" if in doubt.
