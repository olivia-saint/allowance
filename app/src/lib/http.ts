// Small helpers for route handlers: JSON errors and a per-IP rate limit for write actions.
const hits = new Map<string, number[]>();

export function rateLimited(req: Request, limit = 20, windowMs = 60_000) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  return list.length > limit;
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function errorMessage(e: unknown) {
  const msg = (e as Error)?.message || String(e);
  if (/429|Too Many/i.test(msg)) return "Solana devnet is rate limiting requests. Please try again in a few seconds.";
  return msg.length > 300 ? msg.slice(0, 300) + "…" : msg;
}
