import { isAgent, runAgentTask, type LogLine } from "@/lib/actions";
import { TASKS, type TaskId } from "@/lib/config";
import { errorMessage, jsonError, rateLimited } from "@/lib/http";

export const maxDuration = 60;

// Streams the agent's steps as NDJSON so the console can show them live.
export async function POST(req: Request) {
  if (rateLimited(req)) return jsonError("Too many actions, slow down a little", 429);
  const { agent, task } = await req.json().catch(() => ({}));
  if (!isAgent(agent)) return jsonError("Unknown agent");
  if (!(task in TASKS)) return jsonError("Unknown task");
  const origin = process.env.PUBLIC_ORIGIN || new URL(req.url).origin;
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (l: LogLine) => controller.enqueue(enc.encode(JSON.stringify(l) + "\n"));
      try {
        await runAgentTask(agent, task as TaskId, origin, emit);
      } catch (e) {
        emit({ type: "step", icon: "error", title: "Something went wrong", detail: errorMessage(e) });
        emit({ type: "result", status: "failed" });
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
