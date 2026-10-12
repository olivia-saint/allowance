import { dashboard, decide } from "@/lib/actions";
import { errorMessage, jsonError, rateLimited } from "@/lib/http";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (rateLimited(req)) return jsonError("Too many actions, slow down a little", 429);
  const { requestId, approve } = await req.json().catch(() => ({}));
  if (typeof requestId !== "string" || !/^req_[a-f0-9]{8}$/.test(requestId)) return jsonError("Unknown request");
  try {
    const result = await decide(requestId, approve === true);
    return Response.json({ ...result, state: await dashboard(true) });
  } catch (e) {
    return jsonError(errorMessage(e), 500);
  }
}
