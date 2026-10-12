// x402-style pay-per-request: the merchant answers 402 Payment Required with payment
// requirements; the client pays in dUSDC on Solana devnet and retries with an X-PAYMENT
// header carrying the transaction signature; the merchant verifies the transfer on-chain.
import crypto from "node:crypto";
import { DECIMALS, MERCHANTS, TASKS, type TaskId } from "./config";
import { connection, merchantTokenAccount, mintAddress, toUnits, withRetry } from "./solana";

const secret = () => process.env.REFERENCE_SECRET || "dev-secret";
const hmac = (s: string) => crypto.createHmac("sha256", secret()).update(s).digest("base64url").slice(0, 16);

export function createReference(task: TaskId, ttlSeconds = 600) {
  const nonce = crypto.randomBytes(6).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const body = `${task}.${nonce}.${exp}`;
  return `${body}.${hmac(body)}`;
}

export function checkReference(ref: string, task: TaskId): string | null {
  const parts = ref.split(".");
  if (parts.length !== 4) return "Malformed reference";
  const [t, nonce, exp, sig] = parts;
  if (t !== task) return "Reference is for a different resource";
  if (hmac(`${t}.${nonce}.${exp}`) !== sig) return "Reference signature is invalid";
  if (Number(exp) < Date.now() / 1000) return "Reference expired, request a new quote";
  return null;
}

export function paymentRequirements(task: TaskId, resourceUrl: string) {
  const cfg = TASKS[task];
  return {
    x402Version: 1,
    error: "X-PAYMENT header is required",
    accepts: [
      {
        scheme: "exact",
        network: "solana-devnet",
        maxAmountRequired: toUnits(cfg.amount).toString(),
        asset: mintAddress().toBase58(),
        payTo: merchantTokenAccount(cfg.merchant).toBase58(),
        resource: resourceUrl,
        description: `${cfg.short} from ${MERCHANTS[cfg.merchant].name}`,
        mimeType: "application/json",
        maxTimeoutSeconds: 600,
        extra: {
          reference: createReference(task),
          decimals: DECIMALS,
          token: "dUSDC",
          instructions: "transferChecked to payTo and include the reference in an SPL Memo",
        },
      },
    ],
  };
}

export function encodePaymentHeader(signature: string, reference: string) {
  return Buffer.from(
    JSON.stringify({ x402Version: 1, scheme: "exact", network: "solana-devnet", payload: { signature, reference } }),
  ).toString("base64");
}

export function decodePaymentHeader(h: string): { signature: string; reference: string } | null {
  try {
    const obj = JSON.parse(Buffer.from(h, "base64").toString("utf8"));
    if (obj?.payload?.signature && obj?.payload?.reference) return obj.payload;
  } catch {}
  return null;
}

interface ParsedIx {
  program?: string;
  programId?: { toBase58(): string };
  parsed?: unknown;
}

// Verifies on-chain that `signature` moved at least the required amount of the right mint
// into the merchant's token account and that its memo carries the reference.
export async function verifyPayment(task: TaskId, signature: string, reference: string) {
  const refErr = checkReference(reference, task);
  if (refErr) return { ok: false as const, reason: refErr };
  const cfg = TASKS[task];
  const conn = connection();
  let tx = null;
  for (let i = 0; i < 6 && !tx; i++) {
    tx = await withRetry(() => conn.getParsedTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 }));
    if (!tx) await new Promise((r) => setTimeout(r, 700));
  }
  if (!tx) return { ok: false as const, reason: "Transaction not found on devnet" };
  if (tx.meta?.err) return { ok: false as const, reason: "Transaction failed on-chain" };
  const ixs = tx.transaction.message.instructions as ParsedIx[];
  const payTo = merchantTokenAccount(cfg.merchant).toBase58();
  const mint = mintAddress().toBase58();
  const required = toUnits(cfg.amount);
  const transfer = ixs.find((ix) => {
    const p = ix.parsed as { type?: string; info?: { destination?: string; mint?: string; tokenAmount?: { amount?: string } } } | undefined;
    return (
      ix.program === "spl-token" &&
      p?.type === "transferChecked" &&
      p.info?.destination === payTo &&
      p.info?.mint === mint &&
      BigInt(p.info?.tokenAmount?.amount ?? "0") >= required
    );
  });
  if (!transfer) return { ok: false as const, reason: "No matching dUSDC transfer to the merchant in this transaction" };
  const memo = ixs.find((ix) => ix.program === "spl-memo" && typeof ix.parsed === "string" && (ix.parsed as string).includes(reference));
  if (!memo) return { ok: false as const, reason: "Payment memo does not contain the reference" };
  return { ok: true as const, slot: tx.slot, blockTime: tx.blockTime };
}

export function paidResource(task: TaskId) {
  const now = new Date();
  if (task === "report") {
    return {
      title: "Daily market data report",
      provider: "Tickerwire (demo merchant)",
      generatedAt: now.toISOString(),
      note: "Sample data for the Allowance devnet demo",
      sections: [
        { heading: "Summary", text: "Stablecoin settlement volume steady; agent-initiated API payments trending up." },
        { heading: "Watchlist", text: "SOL, USDC, BTC, ETH: sample figures only." },
      ],
    };
  }
  const start = new Date(now.getTime() + 24 * 3600 * 1000);
  start.setUTCMinutes(0, 0, 0);
  return {
    booking: {
      provider: "Roomly (demo merchant)",
      room: "Room 3, 6 seats",
      start: start.toISOString(),
      end: new Date(start.getTime() + 3600 * 1000).toISOString(),
      confirmation: `RM-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
    },
  };
}
