# Devnet faucet status

Address: 35shvgpo6JPgbYtGCz668U7PgxMBdkPgsPe8GukkdPBV (devnet)
Target: ≥ 1 SOL

## Log
- 14:27 UTC — starting balance: 0 SOL
- 14:27 UTC — faucet.solana.com: page shows an explicit notice "I am an AI Agent — AI agents should NOT use this faucet" (points to CLI airdrop, proof-of-work faucet `devnet-pow`, or local validator). Respecting that; not submitting there. Balance still 0.
- 14:27 UTC — faucet.triangleplatform.com: 'This service has been suspended' (503). Skipped.
- 14:29 UTC — solfaucet.com: it's only a front-end for the same public RPC requestAirdrop (api.devnet.solana.com); from the browser it also returns 429 'reached your airdrop limit today or faucet has run dry'. Balance still 0.
- 14:29 UTC — devnetfaucet.org: needs 'Airdrop with GitHub' (20 SOL, has 'anonymous' option). Parked; trying QuickNode (no account) first.
- 14:30 UTC — faucet.quicknode.com: 'Insufficient SOL balance… you'll need a small mainnet balance on this wallet in order to use the faucet'. Skipped (needs mainnet funds). Balance still 0.
- 14:30 UTC — devnetfaucet.org: requires GitHub login; browser is NOT signed in to GitHub, and I'm not entering passwords → blocked.
- 14:31 UTC — pinestake.com/faucet: Devnet airdrop requires 'Connect with GitHub' login (+ Turnstile); GitHub not signed in → blocked. (Blueshift faucet needs an NFT → skipped.)
- 14:31 UTC — faucet.chainstack.com: needs ≥0.8 SOL on mainnet → skipped. Trying zan.top.
- 14:32 UTC — zan.top: 'Login to send me 1 SOL' (needs a ZAN account) → blocked.
- 14:32 UTC — other public devnet RPC endpoints (Ankr, dRPC, OnFinality, Tatum, PublicNode) for requestAirdrop: all need API keys/paid plans or don't support it. Balance still 0.
- 14:33 UTC — public RPC requestAirdrop retried once with 0.5 SOL: still 429.
- 14:34 UTC — Proof-of-work faucet (devnet-pow, program PoWSNH2h…): checked all 23 faucet pools on-chain — every pool is empty (only one has 0.9998 SOL but pays 0.0000001 SOL per solve). It also needs SOL in the claiming wallet for fees. Dead end.

## Result (14:34 UTC)
Balance: **0 SOL**. No faucet usable within the rules (no accounts, no passwords, no mainnet funds, respect site rules).

## What would unblock it (any one)
1. A person opens https://faucet.solana.com in their own browser, picks Devnet, pastes the address, chooses 5 SOL, Confirm (2 requests per 8h, no login). ~30 seconds.
2. Sign the shared browser into GitHub as olivia-saint → devnetfaucet.org gives 20 devnet SOL (tick "anonymous"); Pine Stake also works then.
3. Anyone with a devnet wallet (e.g. Phantom in devnet mode) sends 1–5 SOL to the address.
4. Retry the public RPC airdrop tomorrow (the 429 says "limit today").
5. For local testing only: solana-test-validator (unlimited SOL on localhost).
