// One-time Solana DEVNET setup for the Allowance demo. Never point this at mainnet.
//
//   node scripts/keygen.mjs        # creates devnet keypairs in .env.local (git-ignored)
//   node scripts/derive-env.mjs    # adds public addresses + HMAC secret
//   node scripts/setup-devnet.mjs  # funds, creates the dUSDC mint, treasury, merchant accounts and agent cards
//
// The business (owner) key pays every fee, so it is the only key that needs devnet SOL.
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  MINT_SIZE,
  ACCOUNT_SIZE,
  TOKEN_PROGRAM_ID,
  createApproveCheckedInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeAccount3Instruction,
  createInitializeMint2Instruction,
  createMintToCheckedInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
  unpackAccount,
} from "@solana/spl-token";
import bs58 from "bs58";
import crypto from "node:crypto";
import fs from "node:fs";

const RPC = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
if (/mainnet/i.test(RPC)) throw new Error("Refusing to run against mainnet");
const conn = new Connection(RPC, "confirmed");

const envText = fs.readFileSync(".env.local", "utf8");
const get = (n) => envText.match(new RegExp(`^${n}=(.*)$`, "m"))?.[1]?.trim();
const kp = (n) => Keypair.fromSecretKey(bs58.decode(get(n)));

const owner = kp("OWNER_SECRET");
const mint = kp("MINT_SECRET");
const agents = { ops: kp("AGENT_OPS_SECRET"), research: kp("AGENT_RESEARCH_SECRET") };
const merchants = {
  data: new PublicKey(get("MERCHANT_DATA_ADDRESS")),
  rooms: new PublicKey(get("MERCHANT_ROOMS_ADDRESS")),
  supply: new PublicKey(get("MERCHANT_SUPPLY_ADDRESS")),
};
const BUDGETS = { ops: 150, research: 25 };
const DECIMALS = 6;
const UNIT = 1_000_000n;
const MEMO = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function memoIx(ev) {
  const secret = get("REFERENCE_SECRET");
  const body = JSON.stringify(ev);
  const h = crypto.createHmac("sha256", secret).update(body).digest("hex").slice(0, 10);
  return new TransactionInstruction({
    programId: MEMO,
    keys: [{ pubkey: owner.publicKey, isSigner: true, isWritable: false }],
    data: Buffer.from(`allowance:v1 ${JSON.stringify({ ...ev, h })}`),
  });
}

async function send(ixs, signers = []) {
  const tx = new Transaction().add(...ixs);
  tx.feePayer = owner.publicKey;
  for (let i = 0; i < 5; i++) {
    try {
      return await sendAndConfirmTransaction(conn, tx, [owner, ...signers], { commitment: "confirmed" });
    } catch (e) {
      if (!/429|blockhash|timed out|fetch failed/i.test(String(e))) throw e;
      await sleep(1500 * (i + 1));
    }
  }
  throw new Error("send failed");
}

async function ensureSol() {
  for (let i = 0; i < 8; i++) {
    const bal = await conn.getBalance(owner.publicKey);
    console.log(`owner ${owner.publicKey.toBase58()} balance: ${bal / 1e9} SOL`);
    if (bal >= 0.05e9) return;
    try {
      const sig = await conn.requestAirdrop(owner.publicKey, 1e9);
      await conn.confirmTransaction(sig, "confirmed");
    } catch (e) {
      console.log(`airdrop failed (${String(e.message || e).slice(0, 80)}), retrying in ${5 * (i + 1)}s`);
      await sleep(5000 * (i + 1));
    }
  }
  throw new Error("Owner has no devnet SOL. Fund it with a devnet faucet and rerun.");
}

async function main() {
  await ensureSol();

  // 1) dUSDC mint (6 decimals), mint authority = owner, no freeze authority.
  if (!(await conn.getAccountInfo(mint.publicKey))) {
    const lamports = await getMinimumBalanceForRentExemptMint(conn);
    await send(
      [
        SystemProgram.createAccount({ fromPubkey: owner.publicKey, newAccountPubkey: mint.publicKey, space: MINT_SIZE, lamports, programId: TOKEN_PROGRAM_ID }),
        createInitializeMint2Instruction(mint.publicKey, DECIMALS, owner.publicKey, null),
      ],
      [mint],
    );
    console.log("created mint", mint.publicKey.toBase58());
  }

  // 2) Treasury (owner ATA) + 1,000,000 dUSDC.
  const treasury = getAssociatedTokenAddressSync(mint.publicKey, owner.publicKey);
  const ataIxs = [createAssociatedTokenAccountIdempotentInstruction(owner.publicKey, treasury, owner.publicKey, mint.publicKey)];
  for (const m of Object.values(merchants)) {
    ataIxs.push(createAssociatedTokenAccountIdempotentInstruction(owner.publicKey, getAssociatedTokenAddressSync(mint.publicKey, m), m, mint.publicKey));
  }
  await send(ataIxs);
  const tInfo = await conn.getAccountInfo(treasury);
  const tBal = unpackAccount(treasury, tInfo).amount;
  if (tBal < 100_000n * UNIT) {
    await send([createMintToCheckedInstruction(mint.publicKey, treasury, owner.publicKey, 1_000_000n * UNIT, DECIMALS)]);
    console.log("minted 1,000,000 dUSDC to treasury", treasury.toBase58());
  }

  // 3) Agent cards: owner-owned token accounts at deterministic seed addresses,
  //    with the agent as a capped delegate.
  const rent = await conn.getMinimumBalanceForRentExemption(ACCOUNT_SIZE);
  for (const [id, agent] of Object.entries(agents)) {
    const seed = `allowance-card-${id}`;
    const card = await PublicKey.createWithSeed(owner.publicKey, seed, TOKEN_PROGRAM_ID);
    const info = await conn.getAccountInfo(card);
    const ixs = [];
    let balance = 0n;
    if (!info) {
      ixs.push(
        SystemProgram.createAccountWithSeed({
          fromPubkey: owner.publicKey,
          basePubkey: owner.publicKey,
          seed,
          newAccountPubkey: card,
          lamports: rent,
          space: ACCOUNT_SIZE,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeAccount3Instruction(card, mint.publicKey, owner.publicKey),
      );
    } else {
      balance = unpackAccount(card, info).amount;
    }
    const budget = BigInt(BUDGETS[id]) * UNIT;
    if (balance < budget) ixs.push(createTransferCheckedInstruction(treasury, mint.publicKey, card, owner.publicKey, budget - balance, DECIMALS));
    ixs.push(createApproveCheckedInstruction(card, mint.publicKey, agent.publicKey, owner.publicKey, budget, DECIMALS));
    ixs.push(memoIx({ t: "budget", ag: id, amt: BUDGETS[id] }));
    const sig = await send(ixs);
    console.log(`card ${id}: ${card.toBase58()} delegate ${agent.publicKey.toBase58()} allowance $${BUDGETS[id]} (${sig})`);
  }

  console.log("\nDevnet addresses");
  console.log("owner    ", owner.publicKey.toBase58());
  console.log("mint     ", mint.publicKey.toBase58());
  console.log("treasury ", treasury.toBase58());
  for (const [id, m] of Object.entries(merchants)) console.log(`merchant ${id}`, m.toBase58(), "ATA", getAssociatedTokenAddressSync(mint.publicKey, m).toBase58());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
