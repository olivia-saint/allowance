import { dashboard, isAgent, revoke } from "@/lib/actions";
import { errorMessage, jsonError, rateLimited } from "@/lib/http";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (rateLimited(req)) return jsonError("Too many actions, slow down a little", 429);
  const { agent } = await req.json().catch(() => ({}));
  if (!isAgent(agent)) return jsonError("Unknown agent");
  try {
    const { sig } = await revoke(agent);
    return Response.json({ sig, state: await dashboard(true) });
  } catch (e) {
    return jsonError(errorMessage(e), 500);
  }
}
