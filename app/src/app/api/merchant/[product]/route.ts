import { PRODUCTS } from "@/lib/config";
import { errorMessage, jsonError } from "@/lib/http";
import { decodePaymentHeader, paidResource, paymentRequirements, verifyPayment } from "@/lib/x402";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// A demo merchant API that charges per request, x402-style.
export async function GET(req: Request, ctx: RouteContext<"/api/merchant/[product]">) {
  const { product } = await ctx.params;
  const task = PRODUCTS[product];
  if (!task) return jsonError("Unknown product", 404);
  const url = new URL(req.url);
  const resource = `${url.origin}${url.pathname}`;
  const header = req.headers.get("x-payment");
  if (!header) {
    return Response.json(paymentRequirements(task, resource), { status: 402, headers: { "cache-control": "no-store" } });
  }
  const payment = decodePaymentHeader(header);
  if (!payment) return Response.json({ ...paymentRequirements(task, resource), error: "Malformed X-PAYMENT header" }, { status: 402 });
  try {
    const v = await verifyPayment(task, payment.signature, payment.reference);
    if (!v.ok) return Response.json({ ...paymentRequirements(task, resource), error: v.reason }, { status: 402 });
    const receipt = Buffer.from(JSON.stringify({ success: true, transaction: payment.signature, network: "solana-devnet" })).toString("base64");
    return Response.json(paidResource(task), { headers: { "X-PAYMENT-RESPONSE": receipt, "cache-control": "no-store" } });
  } catch (e) {
    return jsonError(errorMessage(e), 503);
  }
}
