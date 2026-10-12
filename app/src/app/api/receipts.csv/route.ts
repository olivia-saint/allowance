import { dashboard } from "@/lib/actions";
import { errorMessage, jsonError } from "@/lib/http";
import { receiptsCsv } from "@/lib/ledger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const csv = receiptsCsv(await dashboard(true));
    const date = new Date().toISOString().slice(0, 10);
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="allowance-receipts-${date}.csv"`,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    return jsonError(errorMessage(e), 503);
  }
}
