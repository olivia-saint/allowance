# Allowance — Colosseum Crypto World's Fair submission

**Status:** ready to submit. Everything below is written and verified; nothing has been submitted, signed up for or sent by anyone but Anthony.

**Stage, stated honestly everywhere:** hackathon MVP on **Solana devnet**, built **12 October 2026**; test-USDC we minted; no real money; no external users yet.

| What | Where |
| --- | --- |
| Live app (devnet) | https://allowance.olivia.saint.work |
| Code (public, MIT) | https://github.com/olivia-saint/allowance |
| Demo video (≤3 min) | `submission/demo.mp4` · https://olivia.saint.work/allowance/demo.mp4 |
| Slides (10, PDF + PNGs) | `pitch/slides/deck.pdf` |
| Pitch script (Anthony records) | `pitch/script.md` + `pitch/narration.txt` |
| Market research with sources | `pitch/market-research.md` |
| Sample on-chain receipt | see **Verify it** below |

---

## 1. Name and one-liner

**Name:** Allowance

**One-liner (93 characters):**

> Allowance: a company card for AI employees, with spending limits enforced on-chain by Solana.

## 2. Short description (272 characters)

> Allowance gives each AI agent its own company card on Solana: a business-owned USDC account where the agent is only a delegate with a capped allowance. The chain enforces the limit, the owner can revoke instantly, and anything over budget becomes a one-tap human approval.

## 3. Long description (214 words)

> Businesses are starting to hire AI agents to do real work, but agents can't safely pay for things. Card checkouts are built to stop bots (secure card fields, CVC boxes, 3-D Secure), and handing an agent a card number or a hot wallet means unlimited risk.
>
> We hit this ourselves. Saint, which provides AI employees to small businesses, sees its agents regularly get all the way to checkout on real purchases, then stop at the card form. A human has to step in. The work is done, except the payment.
>
> Allowance is a company card for AI employees. The business keeps custody: each agent gets its own USDC token account, owned by the business, where the agent is only an SPL Token delegate with a capped allowance. The cap is enforced on-chain by the SPL Token program, not by our app, so if an agent tries to overspend, the transaction fails. Owners can revoke instantly. Agents pay instantly, including x402-style pay-per-request APIs (HTTP 402 → pay in USDC → retry with proof). Anything over budget becomes a one-tap approval request. Every payment carries an on-chain memo receipt and lands in an exportable CSV ledger. Fees are sponsored, so agents never need SOL.
>
> This is a hackathon MVP on devnet, built on 12 October 2026.

## 4. Team

> **Anthony Beaumont** — London, UK. Co-founder and CEO of Encode Club (developer education, hackathons and the Encode Hub coworking space in London). Building Saint: AI employees for small businesses.
>
> **Teammates:** TODO — fill in or submit solo.

*(If solo, use: "Built solo by Anthony Beaumont at Encode Club / Saint.")*

## 5. Track / category

> Infrastructure & tooling for agentic commerce (Solana). Closest fit: payments and agent infrastructure.

## 6. Why Solana

> - **Speed and cost:** ~400ms finality and about $0.00025 per transaction (Solana Foundation), so agents can pay per request and carry on.
> - **USDC-native:** over $11B of stablecoins circulate on Solana (Solana Foundation); USDC is the unit businesses and agents can both budget in.
> - **The limit is a standard:** SPL Token's `approve`/`revoke` delegate allowance is built into the token program. Our core safety guarantee rests on that audited program, not on custom code written in a day.
> - **x402 is live on Solana:** 35M+ transactions since launch (Solana Foundation), so agents already have things to pay for.
> - **Fee sponsorship:** Solana lets a separate account pay the fee, so agent keys never need SOL.

## 7. Go-to-market

> **Who first:** small businesses already using AI agents for admin and purchasing, and the developers building those agents.
>
> 1. **Saint as the first user (internal).** Saint's AI employees hit the checkout wall in their own work, so Saint moves its own agent spending onto Allowance first. Internal use, not external traction — but it means agents use it daily doing real admin work.
> 2. **Encode Club's developer community.** Encode runs developer education programmes, hackathons and the Encode Hub in London. Offer Allowance to agent builders through workshops and hackathon bounties: "give your agent a budget."
> 3. **SDK and MCP server.** A TypeScript SDK and an MCP server so any agent framework can request a card, pay, and ask for approval in a few lines.
> 4. **x402 merchants and APIs.** Pay-per-request APIs are where agents already pay in USDC today. Make Allowance cards work out of the box with x402 endpoints, then court those merchants as a distribution channel.
>
> Later, Saint's small-business customers become a direct channel: every AI employee comes with its own Allowance card.

## 8. Business model (planned, not yet tested)

> - **Free:** 1 agent, up to $250 a month of agent spend. For builders, hackathon teams and trials.
> - **Business:** $10 per agent per month + 0.5% of agent spend.
>
> Small businesses already think about AI employees per seat (that's how Saint sells them), so a per-agent fee is easy to understand and budget. The share of spend grows with the value agents create. Prices are placeholders to test in design-partner interviews. A later revenue line is the card off-ramp for card-only merchants.

## 9. Demand validation (honest)

> **What we have:** one strong, first-hand signal and no external users yet. In October 2026, Saint's AI employees regularly completed real purchasing tasks right up to checkout and were then blocked by secure card fields, CVC entry and 3-D Secure, so a human had to finish each payment. That is the problem Allowance removes.
>
> **Market signals (public):** Visa (Intelligent Commerce), Mastercard (Agent Pay), Stripe (Issuing for agents, Shared Payment Tokens), Ramp (Agent Cards) and others are shipping spending controls for AI agents — the category is real. x402 has processed 35M+ transactions on Solana since launch (Solana Foundation).
>
> **Next (not done yet):** instrument Saint to count every purchase needing a human handoff; 15 design-partner interviews with small businesses using agents and with agent builders from the Encode community; a waitlist on the demo site; an Allowance bounty at an Encode hackathon measured by integrations.
>
> **Target for the next 6 weeks:** 5 design partners agreeing to a devnet pilot, and Saint's own agents paying for at least one real workflow through Allowance on mainnet with small limits.

## 10. Roadmap

> - **Now (hackathon MVP, devnet):** per-agent delegate cards with on-chain caps, instant revoke, x402-style payments, over-budget approval requests, memo receipts, CSV ledger, sponsored fees.
> - **Next (0–3 months):** policy program (per-merchant allowlists, daily limits, time windows); TypeScript SDK and MCP server; Saint's own agents as the first live user; mainnet USDC with small limits; design-partner pilots.
> - **Later:** x402 facilitator; card off-ramp so agents can pay card-only merchants from their allowance; accounting exports; team roles and multi-approver policies.

---

## Verify it (judges' checklist)

Everything below is real and on devnet.

1. **The merchant really charges.** No payment, no data:
   ```bash
   curl -i https://allowance.olivia.saint.work/api/merchant/market-report
   # HTTP/2 402 + payment requirements (scheme, network, asset, amount, payTo, reference)
   ```
2. **The cap is enforced by the token program, not by the app.** In the agent console, run *Pay a supplier invoice* ($600, over the $150 allowance). The console shows the simulated `transferChecked` being rejected by the SPL Token program, then the agent filing an on-chain request. Approve it with one tap and the payment goes through.
3. **Every receipt is a transaction.** Click any receipt's `tx …` link — it opens on Solana Explorer, devnet.
4. **Revoke is instant.** *Revoke card instantly* moves the remaining balance back to the treasury in one transaction, and *Set allowance* puts it back.
5. **The books export.** `https://allowance.olivia.saint.work/api/receipts.csv`

---

## What Anthony still has to do

1. **Submit on Colosseum** — nothing has been submitted, registered or signed up for by anyone else.
2. **Fill in the team section** (or submit solo).
3. **Record the 2–3 minute pitch** in his own voice using `pitch/script.md` (or hand the recorded audio in and we'll cut it to the slides).
4. **Check the demo video** `submission/demo.mp4` before submitting.
5. Decide whether to keep the placeholder pricing ($10/agent/mo + 0.5%) in the written submission.
