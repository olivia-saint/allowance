// Pure-logic self-tests (no network): memo receipts, ledger folding, x402 headers, CSV.
//   SOLANA_RPC_URL=https://api.devnet.solana.com npx tsx scripts/selftest.ts   (or: node --experimental-strip-types)
import assert from "node:assert/strict";
import { memoText, parseMemo, toUnits, fromUnits, type ChainEvent, type Snapshot } from "../src/lib/solana";
import { buildState, receiptsCsv } from "../src/lib/ledger";
import { createReference, checkReference, paymentRequirements, encodePaymentHeader, decodePaymentHeader } from "../src/lib/x402";
import { AGENTS, TASKS, MERCHANTS, PRODUCTS, explorerTx } from "../src/lib/config";

let passed = 0;
const test = (name: string, fn: () => void) => {
  try {
    fn();
    passed++;
    console.log(`PASS  ${name}`);
  } catch (e) {
    console.log(`FAIL  ${name}\n      ${(e as Error).message}`);
    process.exitCode = 1;
  }
};

import fs from "node:fs";

// Load the local devnet env (public addresses only are needed for these pure-logic checks).
for (const line of fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
process.env.REFERENCE_SECRET ||= "selftest-secret";

test("memo round-trips", () => {
  const ev = { t: "pay", id: "rcpt_ab12cd34", ag: "ops", mer: "data", amt: 2, p: "Market data report", k: "x402", ref: "report.a.b.c" } as const;
  const raw = `[123] ${memoText(ev)}`;
  assert.deepEqual(parseMemo(raw), ev);
});

test("spoofed memo (bad HMAC) is rejected", () => {
  const body = JSON.stringify({ t: "pay", id: "rcpt_deadbeef", ag: "ops", mer: "data", amt: 999, p: "x", k: "x402" });
  assert.equal(parseMemo(`[1] allowance:v1 ${JSON.stringify({ ...JSON.parse(body), h: "0000000000" })}`), null);
});

test("earlier-version memos are ignored", () => {
  assert.equal(parseMemo("[1] other:v2 {}"), null);
  assert.equal(parseMemo(null), null);
});

test("several memos in one signature: the allowance one is found", () => {
  const ev = { t: "budget", ag: "research", amt: 25 } as const;
  assert.deepEqual(parseMemo(`[1] partner:blah; [2] ${memoText(ev)}`), ev);
});

test("units convert cleanly", () => {
  assert.equal(toUnits(2), 2_000_000n);
  assert.equal(toUnits(0.01), 10_000n);
  assert.equal(fromUnits(toUnits(600)), 600);
  assert.equal(fromUnits(toUnits(6.5)), 6.5);
});

test("ledger folds budgets, payments, requests and approvals", () => {
  const t = 1_800_000_000;
  const evs = [
    { t: "budget", ag: "ops", amt: 150 },
    { t: "budget", ag: "research", amt: 25 },
    { t: "pay", id: "rcpt_1", ag: "ops", mer: "data", amt: 2, p: "Market data report", k: "x402" },
    { t: "pay", id: "rcpt_2", ag: "research", mer: "rooms", amt: 40, p: "Meeting room", k: "x402" },
    { t: "req", id: "req_11112222", ag: "ops", mer: "supply", amt: 600, p: "Supplier invoice", task: "invoice" },
    { t: "ok", req: "req_11112222", amt: 600 },
    { t: "pay", id: "rcpt_3", ag: "ops", mer: "supply", amt: 600, p: "Supplier invoice", k: "invoice", req: "req_11112222" },
  ] as unknown as ChainEvent["ev"][];
  const events: ChainEvent[] = evs.map((ev, i) => ({ sig: `sig${i}`.padEnd(64, "x"), time: t + i, ev })).reverse();
  const snap: Snapshot = {
    owner: "owner",
    mint: "mint",
    treasury: "treasury",
    treasuryBalance: toUnits(999_394),
    ownerSol: 1,
    cards: [
      { agent: "ops", address: "cardOps", exists: true, balance: toUnits(150), delegate: { ops: "AGENT_OPS" }.ops, delegatedAmount: toUnits(148) },
      { agent: "research", address: "cardLeo", exists: true, balance: toUnits(25), delegate: "AGENT_RESEARCH", delegatedAmount: toUnits(25) },
    ],
    events,
    fetchedAt: 0,
  };
  const state = buildState(snap, { ops: "AGENT_OPS", research: "AGENT_RESEARCH" });
  const ops = state.agents.find((a) => a.id === "ops")!;
  assert.equal(ops.budget, 150);
  assert.equal(ops.remaining, 148, "remaining comes from the live delegate amount");
  assert.equal(ops.spent, 2, "only in-allowance spending counts against the budget");
  assert.equal(ops.active, true);
  assert.equal(state.receipts.length, 3);
  assert.equal(state.receipts[0].id, "rcpt_3", "newest receipt first");
  assert.equal(state.receipts[0].approvedBy, "owner");
  assert.equal(state.receipts[0].approvalSig, events.find((e) => e.ev.t === "ok")!.sig);
  const req = state.approvals.find((r) => r.id === "req_11112222")!;
  assert.equal(req.status, "approved");
  assert.ok(req.paymentSig);
});

test("a declined request does not produce a receipt", () => {
  const evs = [
    { t: "budget", ag: "ops", amt: 150 },
    { t: "req", id: "req_aaaabbbb", ag: "ops", mer: "supply", amt: 600, p: "Supplier invoice", task: "invoice" },
    { t: "no", req: "req_aaaabbbb" },
  ] as unknown as ChainEvent["ev"][];
  const snapshot: Snapshot = {
    owner: "o", mint: "m", treasury: "t", treasuryBalance: 0n, ownerSol: 0,
    cards: AGENTS.map((a) => ({ agent: a.id, address: a.id, exists: true, balance: 0n, delegate: null, delegatedAmount: 0n })),
    events: evs.map((ev, i) => ({ sig: `s${i}`, time: null, ev })).reverse(),
    fetchedAt: 0,
  };
  const state = buildState(snapshot, { ops: "AGENT_OPS", research: "AGENT_RESEARCH" });
  assert.equal(state.receipts.length, 0);
  assert.equal(state.approvals[0].status, "declined");
});

test("CSV export has a header, one row per receipt and an explorer link", () => {
  const snapshot: Snapshot = {
    owner: "o", mint: "m", treasury: "t", treasuryBalance: toUnits(1000), ownerSol: 0,
    cards: AGENTS.map((a) => ({ agent: a.id, address: a.id, exists: true, balance: 0n, delegate: null, delegatedAmount: 0n })),
    events: [
      { sig: "SIG_A", time: 1_800_000_000, ev: { t: "pay", id: "rcpt_9", ag: "ops", mer: "data", amt: 2, p: "Market data report", k: "x402" } },
    ] as ChainEvent[],
    fetchedAt: 0,
  };
  const csv = receiptsCsv(buildState(snapshot, { ops: "A", research: "B" }));
  const lines = csv.trim().split("\n");
  assert.equal(lines.length, 2);
  assert.match(lines[0], /receipt_id/);
  assert.match(lines[1], /rcpt_9/);
  assert.match(lines[1], /explorer\.solana\.com\/tx\/SIG_A\?cluster=devnet/);
});

test("x402 requirements quote the task price and a unique reference", () => {
  const req = paymentRequirements("report", "/api/merchant/market-report");
  assert.equal(req.x402Version, 1);
  assert.equal(req.accepts[0].maxAmountRequired, "2000000");
  assert.equal(req.accepts[0].network, "solana-devnet");
  assert.equal(req.accepts[0].scheme, "exact");
  assert.ok(req.accepts[0].payTo);
  assert.ok(req.accepts[0].extra.reference.startsWith("report."));
  assert.notEqual(req.accepts[0].extra.reference, paymentRequirements("report", "/x").accepts[0].extra.reference, "each quote gets a fresh reference");
});

test("x402 reference is bound to its resource and signed", () => {
  const ref = createReference("report");
  assert.equal(checkReference(ref, "report"), null);
  assert.match(checkReference(ref, "rooms")!, /different resource/);
  assert.match(checkReference("report.bogus.bogus.bogus", "report")!, /signature|expired/);
  assert.match(checkReference(createReference("report", -10), "report")!, /expired/);
});

test("X-PAYMENT header round-trips", () => {
  const header = encodePaymentHeader("SIG123", "report.abc.def");
  assert.deepEqual(decodePaymentHeader(header), { signature: "SIG123", reference: "report.abc.def" });
  assert.equal(decodePaymentHeader("not-base64"), null);
  assert.equal(decodePaymentHeader(Buffer.from("{}").toString("base64")), null);
});

test("config is coherent", () => {
  for (const t of Object.values(TASKS)) {
    assert.ok(MERCHANTS[t.merchant], `task ${t.label} points at a known merchant`);
    assert.ok(t.amount > 0, `task ${t.label} has a price`);
    if (t.kind === "x402") assert.ok(PRODUCTS[t.path!.split("/").pop()!] === t.id, `task ${t.label} is reachable as a merchant endpoint`);
  }
  assert.equal(TASKS.invoice.amount > AGENTS[0].defaultBudget, true, "the invoice is over budget, so it needs approval");
  assert.equal(explorerTx("X"), "https://explorer.solana.com/tx/X?cluster=devnet");
});

console.log(`\n${passed} checks passed`);
