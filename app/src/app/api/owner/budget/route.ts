import { dashboard, isAgent, setBudget } from "@/lib/actions";
import { errorMessage, jsonError, rateLimited } from "@/lib/http";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (rateLimited(req)) return jsonError("Too many actions, slow down a little", 429);
  const { agent, amount } = await req.json().catch(() => ({}));
  if (!isAgent(agent)) return jsonError("Unknown agent");
  const n = Number(amount);
  if (!Number.isFinite(n)) return jsonError("Enter a budget amount");
  try {
    const { sig } = await setBudget(agent, Math.round(n * 100) / 100);
    return Response.json({ sig, state: await dashboard(true) });
  } catch (e) {
    return jsonError(errorMessage(e), 500);
  }
}
