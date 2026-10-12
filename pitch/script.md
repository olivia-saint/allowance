# Allowance — pitch video script (2–3 min)

For Anthony to record in his own voice. 378 words ≈ 2:30 at a brisk pace, ≈ 2:50 at a relaxed one. The same words, without slide markers, are in `narration.txt` (for text-to-speech or a teleprompter).

Delivery: conversational, not salesy. Pause after "Except the payment." and after "the chain rejects it." Those are the two lines that should land.

---

**[Slide 1 — Title: Allowance]** *(hook)*

This month, our AI employees kept failing at the same moment. They'd find the supplier, fill the basket, reach checkout. Then a secure card field, a CVC box, a 3-D Secure pop-up. And they'd stop. A human had to step in. The work was done. Except the payment.

**[Slide 2 — Problem]**

I'm Anthony Beaumont. Businesses are hiring AI agents to do real work, but agents can't safely pay for things. Card checkouts are built to block bots. The workaround, handing an agent a card number or a hot wallet, means unlimited risk.

**[Slide 3 — Insight / founder story]**

I see this from both sides. I'm co-founder and CEO of Encode Club, a developer and hackathon community in London, and I'm building Saint, which gives small businesses AI employees for their admin. That's where we kept hitting this wall.

**[Slide 4 — How it works]**

So we built Allowance. A company card for AI employees, on Solana. The business keeps custody. Each agent gets its own card: a USDC account the business owns, where the agent is only a delegate with a capped allowance. That cap isn't enforced by our app. It's enforced by Solana's audited token program. If the agent tries to overspend, the chain rejects it, and the owner can revoke it instantly.

**[Slide 5 — Demo screenshot]** *(~20 seconds)*

Here's the dashboard. I give an agent a hundred and fifty dollars. It calls an API that answers "payment required", pays in USDC, retries with proof, and gets the data. Every payment carries an on-chain receipt, exportable for the accountant. Over budget? I get a one-tap approval request instead of a surprise.

**[Slide 6 — Why Solana]**

Why Solana? Sub-second finality, fractions of a cent per payment, over eleven billion dollars of stablecoins on the network, a ready-made delegate standard, and x402 already live. We sponsor fees, so agents never need SOL.

**[Slide 7 — Market]**

McKinsey estimates agentic commerce could orchestrate three to five trillion dollars globally by 2030. Every one of those agents needs a budget.

**[Slide 8 — Business model + go-to-market]**

We'll charge per agent per month, plus a small share of agent spend, free for small builders. Our first user is Saint itself. That's internal, not traction, but it's a problem we hit for real. Then Encode's developers, agent-framework integrations, and x402 merchants.

**[Slide 9 — Team]** *(can stay on screen silently for 2–3 seconds, or add one line once teammates are confirmed)*

**[Slide 10 — Ask]**

This is a devnet MVP, built in a day. We'd love a Colosseum accelerator place, honest feedback, and design partners. If your business runs AI agents, give them an Allowance.

---

## Check before recording

- **"A hundred and fifty dollars"** (slide 5): matches the demo (Ava's allowance is $150, the supplier invoice is $600). If the amount changes, update this line and slide 4 together.
- **"Built in a day"**: true for the MVP (12 Oct 2026). If more work lands before recording, say "built for this hackathon".
- **"This month, our AI employees kept failing…"**: Saint's real experience in October 2026. Don't name merchants. If asked, it's checkouts with secure card fields, CVC and 3-D Secure blocking automated entry.
- **Facts used and their sources** (details in `market-research.md`):
  - $3–5 trillion by 2030: McKinsey, *The agentic commerce opportunity*, 17 Oct 2025.
  - Over $11B of stablecoins on Solana, 400ms finality, $0.00025 per transaction, x402 live on Solana: solana.com/x402/what-is-x402 (accessed 12 Oct 2026).
  - "Audited token program": the SPL Token program, which the MVP uses for the delegate allowance.
- **Team line** (optional, slide 9) once teammates are confirmed, e.g. "I'm joined by [name], who [one line]." Adds ~10 words; still under 3 minutes.
