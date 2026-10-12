import { dashboard } from "@/lib/actions";
import { errorMessage, jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const fresh = new URL(req.url).searchParams.has("fresh");
    return Response.json(await dashboard(fresh), { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return jsonError(errorMessage(e), 503);
  }
}
