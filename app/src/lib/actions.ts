// Owner and agent actions. Each one is a Solana devnet transaction with a structured memo.
import { AGENTS, MERCHANTS, TASKS, explorerTx, formatUsd, type AgentId, type TaskId } from "./config";
import { buildState, type DashboardState } from "./ledger";
import {
  agentKey,
  agentPaymentIxs,
  fromUnits,
  memoIx,
  newId,
  ownerKey,
  readCard,
  revokeIxs,
  sendTx,
  setAllowanceIxs,
  simulate,
  snapshot,
  toUnits,
  bustCache,
} from "./solana";
import { encodePaymentHeader } from "./x402";

export const isAgent = (a: unknown): a is AgentId => AGENTS.some((x) => x.id === a);

export function agentAddresses(): Record<AgentId, string> {
  return { ops: agentKey("ops").publicKey.toBase58(), research: agentKey("research").publicKey.toBase58() };
}

export async function dashboard(fresh = false): Promise<DashboardState> {
  if (fresh) bustCache();
  return buildState(await snapshot(), agentAddresses());
}

export async function setBudget(agent: AgentId, amount: number) {
  if (!(amount >= 0 && amount <= 10_000)) throw new Error("Budget must be between $0 and $10,000");
  const card = await readCard(agent);
  const ixs = await setAllowanceIxs(agent, toUnits(amount), card.balance, { t: "budget", ag: agent, amt: amount });
  const sig = await sendTx(ixs, []);
  return { sig };
}

export async function revoke(agent: AgentId) {
  const card = await readCard(agent);
  const sig = await sendTx(await revokeIxs(agent, card.balance), []);
  return { sig };
}

const inFlight = new Set<string>();

export async function decide(requestId: string, approve: boolean) {
  if (inFlight.has(requestId)) throw new Error("This request is already being processed");
  inFlight.add(requestId);
  try {
    const state = await dashboard(true);
    const req = state.approvals.find((r) => r.id === requestId);
    if (!req) throw new Error("Request not found");
    if (req.status !== "pending") throw new Error(`Request already ${req.status}`);
    const owner = ownerKey();
    if (!approve) {
      const sig = await sendTx([memoIx({ t: "no", req: requestId }, [owner.publicKey])], []);
      return { decisionSig: sig };
    }
    // 1) Owner raises the agent's on-chain allowance by exactly the requested amount.
    const card = await readCard(req.agent);
    const agentPk = agentKey(req.agent).publicKey.toBase58();
    const current = card.delegate === agentPk ? card.delegatedAmount : BigInt(0);
    const needed = current + toUnits(req.amount);
    const decisionSig = await sendTx(
      await setAllowanceIxs(req.agent, needed, card.balance, { t: "ok", req: requestId, amt: req.amount }),
      [],
    );
    // 2) The agent completes the payment as delegate, linked to the approval.
    const task = TASKS[req.task as TaskId];
    const paymentSig = await sendTx(
      await agentPaymentIxs(req.agent, req.merchant, req.amount, {
        t: "pay",
        id: newId("rcpt"),
        ag: req.agent,
        mer: req.merchant,
        amt: req.amount,
        p: req.purpose,
        k: task?.kind ?? "invoice",
        req: requestId,
      }),
      [agentKey(req.agent)],
    );
    return { decisionSig, paymentSig };
  } finally {
    inFlight.delete(requestId);
  }
}

export async function resetDemo() {
  const owner = ownerKey();
  const sigs: string[] = [];
  const state = await dashboard(true);
  for (const r of state.approvals.filter((a) => a.status === "pending")) {
    sigs.push(await sendTx([memoIx({ t: "no", req: r.id }, [owner.publicKey])], []));
  }
  for (const a of AGENTS) {
    const card = await readCard(a.id);
    sigs.push(await sendTx(await setAllowanceIxs(a.id, toUnits(a.defaultBudget), card.balance, { t: "budget", ag: a.id, amt: a.defaultBudget }), []));
  }
  return { sigs };
}

// ---------- the agent ----------

export type LogLine =
  | { type: "step"; icon: "http" | "chain" | "check" | "warn" | "done" | "error" | "think"; title: string; detail?: string; code?: string; link?: { label: string; href: string } }
  | { type: "result"; status: "paid" | "pending" | "failed"; receipt?: string; request?: string; sig?: string; data?: unknown };

export async function runAgentTask(agent: AgentId, taskId: TaskId, origin: string, emit: (l: LogLine) => void) {
  const task = TASKS[taskId];
  const merchant = MERCHANTS[task.merchant];
  const agentCfg = AGENTS.find((a) => a.id === agent)!;
  const kp = agentKey(agent);
  emit({ type: "step", icon: "think", title: `${agentCfg.name} needs to ${task.label.toLowerCase()} (${formatUsd(task.amount)})`, detail: `Merchant: ${merchant.name}` });

  let reference: string | undefined;
  let resourceUrl: string | undefined;
  if (task.kind === "x402" && task.path) {
    resourceUrl = `${origin}${task.path}?agent=${agent}`;
    const res = await fetch(resourceUrl, { headers: { accept: "application/json" }, cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (res.status !== 402) {
      emit({ type: "step", icon: "error", title: `Unexpected response ${res.status} from merchant` });
      emit({ type: "result", status: "failed" });
      return;
    }
    const req = body.accepts?.[0];
    reference = req?.extra?.reference;
    emit({
      type: "step",
      icon: "http",
      title: `GET ${task.path} → 402 Payment Required`,
      detail: `Merchant asks for ${fromUnits(BigInt(req.maxAmountRequired))} dUSDC on ${req.network}`,
      code: JSON.stringify({ scheme: req.scheme, network: req.network, maxAmountRequired: req.maxAmountRequired, asset: short(req.asset), payTo: short(req.payTo), reference: req.extra?.reference }, null, 2),
    });
  } else {
    emit({ type: "step", icon: "http", title: `Invoice received: ${task.short}`, detail: `${formatUsd(task.amount)} payable to ${merchant.name}` });
  }

  const card = await readCard(agent);
  const isDelegate = card.delegate === kp.publicKey.toBase58();
  const remaining = isDelegate ? fromUnits(card.delegatedAmount) : 0;
  const withinBudget = isDelegate && remaining >= task.amount && card.balance >= toUnits(task.amount);
  emit({
    type: "step",
    icon: withinBudget ? "check" : "warn",
    title: withinBudget
      ? `On-chain allowance: ${formatUsd(remaining)} left, enough for ${formatUsd(task.amount)}`
      : isDelegate
        ? `On-chain allowance: ${formatUsd(remaining)} left, not enough for ${formatUsd(task.amount)}`
        : `No active allowance: the owner has revoked this card`,
    detail: `Read live from card ${short(card.address)} (SPL Token delegate = ${agentCfg.name})`,
  });

  const receiptId = newId("rcpt");
  const memo = {
    t: "pay" as const,
    id: receiptId,
    ag: agent,
    mer: task.merchant,
    amt: task.amount,
    p: task.purpose,
    k: task.kind,
    ...(reference ? { ref: reference } : {}),
  };

  if (!withinBudget) {
    // Prove the limit is enforced by the chain, not by this app: simulate the transfer.
    const sim = await simulate(await agentPaymentIxs(agent, task.merchant, task.amount, memo), [kp]);
    const tokenLog = sim.logs.find((l) => /Error|insufficient|owner does not match/i.test(l)) || sim.logs.find((l) => /failed/i.test(l));
    emit({
      type: "step",
      icon: "chain",
      title: sim.err ? "Simulated the payment: rejected by the SPL Token program" : "Simulation passed unexpectedly",
      detail: "The allowance is enforced on-chain, so the agent physically cannot overspend.",
      code: tokenLog ? tokenLog.replace(/^Program log: /, "") : JSON.stringify(sim.err),
    });
    const requestId = newId("req");
    const sig = await sendTx(
      [memoIx({ t: "req", id: requestId, ag: agent, mer: task.merchant, amt: task.amount, p: task.purpose, task: taskId }, [kp.publicKey])],
      [kp],
    );
    emit({
      type: "step",
      icon: "done",
      title: `Approval requested from the owner (${requestId})`,
      detail: "Logged on-chain. The owner can approve or decline with one tap in the dashboard.",
      link: { label: "View request on Solana Explorer", href: explorerTx(sig) },
    });
    emit({ type: "result", status: "pending", request: requestId, sig });
    return;
  }

  emit({ type: "step", icon: "chain", title: `Signing transferChecked as delegate + memo receipt ${receiptId}`, detail: `${formatUsd(task.amount)} dUSDC → ${merchant.name}; fees sponsored by the business` });
  const sig = await sendTx(await agentPaymentIxs(agent, task.merchant, task.amount, memo), [kp]);
  emit({ type: "step", icon: "check", title: "Payment confirmed on Solana devnet", link: { label: `${sig.slice(0, 8)}… on Solana Explorer`, href: explorerTx(sig) } });

  if (task.kind === "x402" && resourceUrl && reference) {
    const res = await fetch(resourceUrl, { headers: { accept: "application/json", "X-PAYMENT": encodePaymentHeader(sig, reference) }, cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    emit({
      type: "step",
      icon: res.ok ? "http" : "error",
      title: `GET ${task.path} + X-PAYMENT → ${res.status} ${res.ok ? "OK" : "Error"}`,
      detail: res.ok ? "Merchant verified the transfer on-chain and returned the resource" : data?.error,
      code: JSON.stringify(data, null, 2).slice(0, 700),
    });
    emit({ type: "result", status: res.ok ? "paid" : "failed", receipt: receiptId, sig, data });
    return;
  }
  emit({ type: "step", icon: "done", title: `Invoice paid. Receipt ${receiptId} saved on-chain` });
  emit({ type: "result", status: "paid", receipt: receiptId, sig });
}

function short(a: string) {
  return a ? `${a.slice(0, 4)}…${a.slice(-4)}` : a;
}
