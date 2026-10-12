// Server-only Solana helpers. All transactions are fee-sponsored by the business (owner) key,
// so agents never need SOL. Every Allowance transaction carries a structured memo, which makes
// the chain itself the ledger: the dashboard is a view over the owner's transaction history.
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  type ConfirmedSignatureInfo,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createApproveCheckedInstruction,
  createRevokeInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  unpackAccount,
} from "@solana/spl-token";
import bs58 from "bs58";
import crypto from "node:crypto";
import { AGENTS, DECIMALS, type AgentId, type MerchantId } from "./config";

export const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
export const MEMO_PREFIX = "allowance:v1 ";
const UNIT = BigInt(10) ** BigInt(DECIMALS);

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v.trim();
}

let _conn: Connection | null = null;
export function connection() {
  if (!_conn) {
    _conn = new Connection(process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com", {
      commitment: "confirmed",
      disableRetryOnRateLimit: false,
    });
  }
  return _conn;
}

const keyCache = new Map<string, Keypair>();
function keypair(name: string) {
  let kp = keyCache.get(name);
  if (!kp) {
    kp = Keypair.fromSecretKey(bs58.decode(env(name)));
    keyCache.set(name, kp);
  }
  return kp;
}

export const ownerKey = () => keypair("OWNER_SECRET");
export const agentKey = (id: AgentId) => keypair(id === "ops" ? "AGENT_OPS_SECRET" : "AGENT_RESEARCH_SECRET");
export const mintAddress = () => new PublicKey(env("MINT_ADDRESS"));
export function merchantWallet(id: MerchantId) {
  const name = { data: "MERCHANT_DATA_ADDRESS", rooms: "MERCHANT_ROOMS_ADDRESS", supply: "MERCHANT_SUPPLY_ADDRESS" }[id];
  return new PublicKey(env(name));
}
export const merchantTokenAccount = (id: MerchantId) => getAssociatedTokenAddressSync(mintAddress(), merchantWallet(id));
export const treasuryAddress = () => getAssociatedTokenAddressSync(mintAddress(), ownerKey().publicKey);

// Each agent has its own "card": a token account owned by the business at a deterministic
// address, where the agent is only an SPL Token delegate with a capped allowance.
export const cardSeed = (id: AgentId) => `allowance-card-${id}`;
const cardCache = new Map<AgentId, PublicKey>();
export async function cardAddress(id: AgentId) {
  let pk = cardCache.get(id);
  if (!pk) {
    pk = await PublicKey.createWithSeed(ownerKey().publicKey, cardSeed(id), TOKEN_PROGRAM_ID);
    cardCache.set(id, pk);
  }
  return pk;
}

export const toUnits = (usd: number) => BigInt(Math.round(usd * 100)) * (UNIT / BigInt(100));
export const fromUnits = (u: bigint) => Number(u) / Number(UNIT);

// ---------- memos ----------

export type MemoEvent =
  | { t: "budget"; ag: AgentId; amt: number }
  | { t: "revoke"; ag: AgentId }
  | { t: "pay"; id: string; ag: AgentId; mer: MerchantId; amt: number; p: string; k: "x402" | "invoice"; ref?: string; req?: string }
  | { t: "req"; id: string; ag: AgentId; mer: MerchantId; amt: number; p: string; task: string }
  | { t: "ok"; req: string; amt: number }
  | { t: "no"; req: string }
  | { t: "reset" };

function tag(payload: string) {
  const secret = process.env.REFERENCE_SECRET || "dev-secret";
  return crypto.createHmac("sha256", secret).update(payload).digest("hex").slice(0, 10);
}

export function memoText(ev: MemoEvent) {
  const body = JSON.stringify(ev);
  return `${MEMO_PREFIX}${JSON.stringify({ ...ev, h: tag(body) })}`;
}

export function parseMemo(raw: string | null | undefined): MemoEvent | null {
  if (!raw) return null;
  // RPC memo field looks like "[123] allowance:v1 {...}"; several memos are joined by "; ".
  const parts = raw.split(/;\s(?=\[\d+\])/);
  for (const part of parts) {
    const text = part.replace(/^\[\d+\]\s*/, "");
    if (!text.startsWith(MEMO_PREFIX)) continue;
    try {
      const obj = JSON.parse(text.slice(MEMO_PREFIX.length));
      const { h, ...ev } = obj;
      if (h !== tag(JSON.stringify(ev))) return null; // ignore spoofed memos
      return ev as MemoEvent;
    } catch {
      return null;
    }
  }
  return null;
}

export function memoIx(ev: MemoEvent, signers: PublicKey[]) {
  return new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: signers.map((pubkey) => ({ pubkey, isSigner: true, isWritable: false })),
    data: Buffer.from(memoText(ev), "utf8"),
  });
}

// ---------- sending ----------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function withRetry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const msg = String((e as Error)?.message || e);
      if (!/429|Too Many|fetch failed|ECONNRESET|timed out|503|502/i.test(msg)) throw e;
      await sleep(400 * 2 ** i);
    }
  }
  throw last;
}

export async function buildTx(ixs: TransactionInstruction[], signers: Keypair[]) {
  const conn = connection();
  const owner = ownerKey();
  const tx = new Transaction();
  tx.add(...ixs);
  tx.feePayer = owner.publicKey;
  const { blockhash, lastValidBlockHeight } = await withRetry(() => conn.getLatestBlockhash("confirmed"));
  tx.recentBlockhash = blockhash;
  const all = [owner, ...signers.filter((s) => !s.publicKey.equals(owner.publicKey))];
  tx.sign(...all);
  return { tx, lastValidBlockHeight };
}

export async function sendTx(ixs: TransactionInstruction[], signers: Keypair[]) {
  const conn = connection();
  const { tx, lastValidBlockHeight } = await buildTx(ixs, signers);
  const raw = tx.serialize();
  const sig = await withRetry(() =>
    conn.sendRawTransaction(raw, { skipPreflight: false, preflightCommitment: "confirmed", maxRetries: 3 }),
  );
  const started = Date.now();
  let lastSend = Date.now();
  while (Date.now() - started < 45_000) {
    const st = await withRetry(() => conn.getSignatureStatuses([sig]));
    const s = st.value[0];
    if (s?.err) throw new Error(`Transaction failed: ${JSON.stringify(s.err)}`);
    if (s && (s.confirmationStatus === "confirmed" || s.confirmationStatus === "finalized")) {
      bustCache();
      return sig;
    }
    if (Date.now() - lastSend > 2500) {
      lastSend = Date.now();
      conn.sendRawTransaction(raw, { skipPreflight: true, maxRetries: 0 }).catch(() => {});
      const height = await conn.getBlockHeight("confirmed").catch(() => 0);
      if (height > lastValidBlockHeight) break;
    }
    await sleep(500);
  }
  throw new Error(`Transaction ${sig} was not confirmed in time`);
}

// Simulates a transaction and returns the program logs; used to show that the SPL Token
// program itself refuses an over-allowance transfer.
export async function simulate(ixs: TransactionInstruction[], signers: Keypair[]) {
  const conn = connection();
  const { tx } = await buildTx(ixs, signers);
  const res = await withRetry(() => conn.simulateTransaction(tx));
  return { err: res.value.err, logs: res.value.logs || [] };
}

// ---------- instructions ----------

export async function agentPaymentIxs(agent: AgentId, merchant: MerchantId, amountUsd: number, memo: MemoEvent) {
  const card = await cardAddress(agent);
  const agentPk = agentKey(agent).publicKey;
  return [
    createTransferCheckedInstruction(card, mintAddress(), merchantTokenAccount(merchant), agentPk, toUnits(amountUsd), DECIMALS),
    memoIx(memo, [agentPk]),
  ];
}

export async function setAllowanceIxs(agent: AgentId, newAllowance: bigint, cardBalance: bigint, memo: MemoEvent) {
  const owner = ownerKey().publicKey;
  const card = await cardAddress(agent);
  const ixs: TransactionInstruction[] = [];
  if (cardBalance < newAllowance) {
    ixs.push(createTransferCheckedInstruction(treasuryAddress(), mintAddress(), card, owner, newAllowance - cardBalance, DECIMALS));
  }
  ixs.push(createApproveCheckedInstruction(card, mintAddress(), agentKey(agent).publicKey, owner, newAllowance, DECIMALS));
  ixs.push(memoIx(memo, [owner]));
  return ixs;
}

export async function revokeIxs(agent: AgentId, cardBalance: bigint) {
  const owner = ownerKey().publicKey;
  const card = await cardAddress(agent);
  const ixs: TransactionInstruction[] = [createRevokeInstruction(card, owner)];
  if (cardBalance > BigInt(0)) {
    ixs.push(createTransferCheckedInstruction(card, mintAddress(), treasuryAddress(), owner, cardBalance, DECIMALS));
  }
  ixs.push(memoIx({ t: "revoke", ag: agent }, [owner]));
  return ixs;
}

// ---------- reading ----------

export interface CardState {
  agent: AgentId;
  address: string;
  exists: boolean;
  balance: bigint;
  delegate: string | null;
  delegatedAmount: bigint;
}

export interface ChainEvent {
  sig: string;
  time: number | null;
  ev: MemoEvent;
}

export interface Snapshot {
  owner: string;
  mint: string;
  treasury: string;
  treasuryBalance: bigint;
  ownerSol: number;
  cards: CardState[];
  events: ChainEvent[]; // newest first
  fetchedAt: number;
}

let snapCache: { at: number; snap: Promise<Snapshot> } | null = null;
export function bustCache() {
  snapCache = null;
}

export async function readCard(agent: AgentId): Promise<CardState> {
  const conn = connection();
  const address = await cardAddress(agent);
  const info = await withRetry(() => conn.getAccountInfo(address, "confirmed"));
  return cardFromInfo(agent, address, info);
}

function cardFromInfo(agent: AgentId, address: PublicKey, info: Awaited<ReturnType<Connection["getAccountInfo"]>>): CardState {
  if (!info) return { agent, address: address.toBase58(), exists: false, balance: BigInt(0), delegate: null, delegatedAmount: BigInt(0) };
  const acc = unpackAccount(address, info, TOKEN_PROGRAM_ID);
  return {
    agent,
    address: address.toBase58(),
    exists: true,
    balance: acc.amount,
    delegate: acc.delegate ? acc.delegate.toBase58() : null,
    delegatedAmount: acc.delegate ? acc.delegatedAmount : BigInt(0),
  };
}

async function fetchSnapshot(): Promise<Snapshot> {
  const conn = connection();
  const owner = ownerKey().publicKey;
  const treasury = treasuryAddress();
  const cards = await Promise.all(AGENTS.map((a) => cardAddress(a.id)));
  const [infos, lamports, sigs] = await Promise.all([
    withRetry(() => conn.getMultipleAccountsInfo([treasury, ...cards], "confirmed")),
    withRetry(() => conn.getBalance(owner, "confirmed")),
    withRetry(() => conn.getSignaturesForAddress(owner, { limit: 200 }, "confirmed")),
  ]);
  const t = infos[0] ? unpackAccount(treasury, infos[0], TOKEN_PROGRAM_ID) : null;
  const events: ChainEvent[] = [];
  for (const s of sigs as ConfirmedSignatureInfo[]) {
    if (s.err) continue;
    const ev = parseMemo(s.memo);
    if (ev) events.push({ sig: s.signature, time: s.blockTime ?? null, ev });
  }
  return {
    owner: owner.toBase58(),
    mint: mintAddress().toBase58(),
    treasury: treasury.toBase58(),
    treasuryBalance: t ? t.amount : BigInt(0),
    ownerSol: lamports / 1e9,
    cards: AGENTS.map((a, i) => cardFromInfo(a.id, cards[i], infos[i + 1])),
    events,
    fetchedAt: Date.now(),
  };
}

export async function snapshot(maxAgeMs = 2500): Promise<Snapshot> {
  if (snapCache && Date.now() - snapCache.at < maxAgeMs) return snapCache.snap;
  const p = fetchSnapshot();
  snapCache = { at: Date.now(), snap: p };
  p.catch(() => {
    if (snapCache?.snap === p) snapCache = null;
  });
  return p;
}

export function newId(prefix: string) {
  return `${prefix}_${crypto.randomBytes(4).toString("hex")}`;
}
