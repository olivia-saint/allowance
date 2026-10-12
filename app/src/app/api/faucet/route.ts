import { connection, ownerKey } from "@/lib/solana";
import { errorMessage, jsonError, rateLimited } from "@/lib/http";

export const dynamic = "force-dynamic";

// Tops up the business key with devnet SOL (used only for sponsoring transaction fees).
export async function POST(req: Request) {
  if (rateLimited(req, 3)) return jsonError("Too many requests", 429);
  try {
    const conn = connection();
    const owner = ownerKey().publicKey;
    const before = await conn.getBalance(owner);
    if (before > 2e9) return Response.json({ skipped: true, sol: before / 1e9 });
    const sig = await conn.requestAirdrop(owner, 1e9);
    return Response.json({ sig, before: before / 1e9 });
  } catch (e) {
    return jsonError(errorMessage(e), 503);
  }
}
