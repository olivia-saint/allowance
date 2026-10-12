import { dashboard, resetDemo } from "@/lib/actions";
import { errorMessage, jsonError, rateLimited } from "@/lib/http";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (rateLimited(req, 5)) return jsonError("Too many resets, try again in a minute", 429);
  try {
    const result = await resetDemo();
    return Response.json({ ...result, state: await dashboard(true) });
  } catch (e) {
    return jsonError(errorMessage(e), 500);
  }
}
