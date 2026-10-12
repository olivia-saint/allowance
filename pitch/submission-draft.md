# Allowance — Colosseum submission drafts

Ready to paste. Stage, stated honestly everywhere: **hackathon MVP on Solana devnet, built 12 Oct 2026; no real money; no external users yet.** Sources for every figure are in `market-research.md`.

Links: live demo https://allowance.olivia.saint.work (devnet) · code https://github.com/olivia-saint/allowance

---

## One-liner (≤ 100 characters)

> Allowance: a company card for AI employees, with spending limits enforced on-chain by Solana.

*(93 characters)*

## Short description (≤ 280 characters)

> Allowance gives each AI agent its own company card on Solana: a business-owned USDC account where the agent is only a delegate with a capped allowance. The chain enforces the limit, the owner can revoke instantly, and anything over budget becomes a one-tap human approval.

*(272 characters)*

## Long description (~200 words)

> Businesses are starting to hire AI agents to do real work, but agents can't safely pay for things. Card checkouts are built to stop bots (secure card fields, CVC boxes, 3-D Secure), and handing an agent a card number or a hot wallet means unlimited risk.
>
> We hit this ourselves. Saint, which provides AI employees to small businesses, sees its agents regularly get all the way to checkout on real purchases, then stop at the card form. A human has to step in. The work is done, except the payment.
>
> Allowance is a company card for AI employees. The business keeps custody: each agent gets its own USDC token account, owned by the business, where the agent is only an SPL Token delegate with a capped allowance. The cap is enforced on-chain by the SPL Token program, not by our app, so if an agent tries to overspend, the transaction fails. Owners can revoke instantly. Agents pay instantly, including x402-style pay-per-request APIs (HTTP 402 → pay in USDC → retry with proof). Anything over budget becomes a one-tap approval request. Every payment carries an on-chain memo receipt and lands in an exportable CSV ledger. Fees are sponsored, so agents never need SOL.
>
> This is a hackathon MVP on devnet, built on 12 October 2026.

*(214 words)*

---

## Go-to-market

> **Who first:** small businesses that already use AI agents for admin and purchasing, and the developers building those agents.
>
> 1. **Saint as the first user (internal).** Saint's AI employees hit the checkout wall in their own work. We'll move Saint's own agent spending (API calls, small purchases) onto Allowance first. This is internal use, not external traction, but it means the product is tested daily by agents doing real admin work.
> 2. **Encode Club's developer community.** Encode Club runs developer education programmes and hackathons, and the Encode Hub in London. We'll offer Allowance to agent builders through workshops and hackathon bounties: "give your agent a budget".
> 3. **SDK and MCP server.** A TypeScript SDK and an MCP server so any agent framework can request a card, pay and ask for approval in a few lines.
> 4. **x402 merchants and APIs.** Pay-per-request APIs are where agents already pay in USDC today. We'll make Allowance cards work out of the box with x402 endpoints, then court those merchants as a distribution channel.
>
> Later, Saint's small-business customers become a direct channel: every AI employee could come with its own Allowance card.

## Demand validation

> **What we have (honest):** one strong, first-hand signal and no external users yet. In October 2026, Saint's AI employees regularly completed real purchasing tasks right up to checkout and were then blocked by secure card fields, CVC entry and 3-D Secure, so a human had to finish each payment. That's the problem Allowance removes.
>
> **Market signals (public):** Visa (Intelligent Commerce), Mastercard (Agent Pay), Stripe (Issuing for agents, Shared Payment Tokens), Ramp (Agent Cards) and others are all shipping spending controls for AI agents, which shows the category is real. x402 has processed 35M+ transactions on Solana since launch, according to the Solana Foundation.
>
> **What we'll do next (not done yet):**
> - Instrument Saint: count every purchase that needs a human handoff, and what share Allowance could have paid.
> - 15 design-partner interviews with small businesses using AI agents and with agent builders from the Encode community: how their agents pay today, who approves, what limits they want, what they'd pay.
> - A waitlist on the demo site to measure pull.
> - An Allowance bounty at an Encode hackathon, measured by the number of agents that integrate it.
>
> **Target for the next 6 weeks:** 5 design partners agreeing to a devnet pilot, and Saint's own agents paying for at least one real workflow through Allowance on mainnet with small limits.

## Distribution plan

> - **Saint:** internal first user now; later, Allowance as the built-in "company card" for Saint's AI employees at small businesses.
> - **Encode Club:** workshops, hackathon tracks and bounties for agent builders; Encode Hub in London for in-person design-partner sessions.
> - **Developer channels:** open-source repo, SDK on npm, MCP server listed in agent-framework and MCP directories, docs with copy-paste examples.
> - **x402 ecosystem:** work with x402 APIs and facilitators on Solana so Allowance is the obvious budget for agents paying them.
> - **Content:** short build-in-public demos of agents paying (and being refused) on-chain.

## Business model (planned, not yet tested)

> - **Free:** 1 agent, up to $250 a month of agent spend. For builders, hackathon teams and trials.
> - **Business:** $10 per agent per month + 0.5% of agent spend.
>
> Why: small businesses already think about AI employees per seat (that's how Saint sells them), so a per-agent fee is easy to understand and budget. The small share of spend grows with the value agents create and keeps us aligned with customers. The free tier feeds developer adoption through Encode's community. Prices are placeholders to test in design-partner interviews. A possible later revenue line is the card off-ramp for card-only merchants.

## Why Solana

> - **Speed and cost:** ~400ms finality and about $0.00025 per transaction (Solana Foundation), so agents can pay per request and carry on.
> - **USDC-native:** over $11B of stablecoins circulate on Solana (Solana Foundation); USDC is the unit businesses and agents can both budget in.
> - **The limit is a standard:** SPL Token's `approve`/`revoke` delegate allowance is built into the token program. Our core safety guarantee rests on that existing program, not on custom code we wrote today.
> - **x402 is live on Solana:** 35M+ transactions since launch (Solana Foundation), so agents already have things to pay for.
> - **Fee sponsorship:** Solana transactions can have a separate fee payer, so agents sign as delegates and never need to hold SOL.
> - **Memo receipts:** every payment carries an on-chain memo (purpose, receipt id) that reconciles with the CSV ledger.

## Roadmap

> - **Now (hackathon MVP, devnet):** per-agent delegate cards with on-chain caps, instant revoke, x402-style payments, over-budget approval requests, memo receipts, CSV ledger, sponsored fees.
> - **Next (0–3 months):** policy program (per-merchant allowlists, daily limits, time windows); TypeScript SDK and MCP server; Saint's own agents as the first live user; mainnet USDC with small limits; design-partner pilots.
> - **Later:** x402 facilitator; card off-ramp so agents can pay card-only merchants from their allowance; accounting exports; team roles and multi-approver policies.

## Team

> Anthony Beaumont, London: co-founder & CEO of Encode Club (developer education and hackathons; runs the Encode Hub coworking space) and building Saint (AI employees for small businesses).
> Teammates: TODO

---

## Notes for Q&A (not for pasting)

- **Limits of the MVP:** devnet only; the cap is a total allowance (top up or re-approve to refill), and daily/merchant rules need the planned policy program. One SPL delegate per token account, so each agent gets its own account; that's by design (one card per agent).
- **Merchant acceptance:** cards are accepted almost everywhere, USDC isn't. Our wedge is API/x402 spend now, with a card off-ramp later.
- **Custody:** funds stay in a business-owned account until the moment of payment; the agent's key can only spend up to the allowance, and the owner can revoke it at any time.
- **Don't claim:** users, customers, partnerships or revenue. Saint is an internal first user. Prices are planned, not validated.
- If the pricing or the demo's "$50 cap" changes, update slides 4 and 8 (`slides/_build.py`, then `slides/render.sh`).
