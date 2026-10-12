// Folds the on-chain memo events into the dashboard view: budgets, receipts and approvals.
import { AGENTS, MERCHANTS, TASKS, explorerTx, type AgentId, type MerchantId } from "./config";
import { fromUnits, type ChainEvent, type Snapshot } from "./solana";

export interface Receipt {
  id: string;
  sig: string;
  time: number | null;
  agent: AgentId;
  merchant: MerchantId;
  amount: number;
  purpose: string;
  kind: "x402" | "invoice";
  approvedBy: "allowance" | "owner";
  requestId?: string;
  approvalSig?: string;
  reference?: string;
}

export interface ApprovalRequest {
  id: string;
  sig: string;
  time: number | null;
  agent: AgentId;
  merchant: MerchantId;
  amount: number;
  purpose: string;
  task: string;
  status: "pending" | "approved" | "declined";
  decisionSig?: string;
  paymentSig?: string;
}

export interface AgentView {
  id: AgentId;
  name: string;
  role: string;
  initials: string;
  color: string;
  agentAddress: string;
  card: string;
  cardExists: boolean;
  cardBalance: number;
  budget: number;
  remaining: number;
  active: boolean;
  spent: number;
  payments: number;
  lastBudgetSig?: string;
}

export interface Activity {
  sig: string;
  time: number | null;
  type: string;
  text: string;
}

export interface DashboardState {
  network: "devnet";
  owner: string;
  mint: string;
  treasury: string;
  treasuryBalance: number;
  ownerSol: number;
  agents: AgentView[];
  receipts: Receipt[];
  approvals: ApprovalRequest[];
  activity: Activity[];
  fetchedAt: number;
}

export function buildState(snap: Snapshot, agentAddresses: Record<AgentId, string>): DashboardState {
  const chrono: ChainEvent[] = [...snap.events].reverse();
  const budgets: Partial<Record<AgentId, { amt: number; sig: string; index: number }>> = {};
  const revokedAt: Partial<Record<AgentId, number>> = {};
  const receipts: Receipt[] = [];
  const requests = new Map<string, ApprovalRequest>();
  const approvalSigs = new Map<string, string>();
  const activity: Activity[] = [];
  let resetIndex = -1;

  chrono.forEach((c, index) => {
    const ev = c.ev;
    switch (ev.t) {
      case "reset":
        resetIndex = index;
        activity.push({ sig: c.sig, time: c.time, type: "reset", text: "Demo reset: budgets restored" });
        break;
      case "budget":
        budgets[ev.ag] = { amt: ev.amt, sig: c.sig, index };
        delete revokedAt[ev.ag];
        activity.push({ sig: c.sig, time: c.time, type: "budget", text: `Owner set ${agentName(ev.ag)}'s allowance to $${ev.amt.toFixed(2)}` });
        break;
      case "revoke":
        revokedAt[ev.ag] = index;
        activity.push({ sig: c.sig, time: c.time, type: "revoke", text: `Owner revoked ${agentName(ev.ag)}'s card` });
        break;
      case "req":
        requests.set(ev.id, {
          id: ev.id,
          sig: c.sig,
          time: c.time,
          agent: ev.ag,
          merchant: ev.mer,
          amount: ev.amt,
          purpose: ev.p,
          task: ev.task,
          status: "pending",
        });
        activity.push({ sig: c.sig, time: c.time, type: "req", text: `${agentName(ev.ag)} asked to pay $${ev.amt.toFixed(2)} to ${merchantName(ev.mer)}` });
        break;
      case "ok": {
        const r = requests.get(ev.req);
        if (r) {
          r.status = "approved";
          r.decisionSig = c.sig;
        }
        approvalSigs.set(ev.req, c.sig);
        activity.push({ sig: c.sig, time: c.time, type: "ok", text: `Owner approved request ${ev.req}` });
        break;
      }
      case "no": {
        const r = requests.get(ev.req);
        if (r) {
          r.status = "declined";
          r.decisionSig = c.sig;
        }
        activity.push({ sig: c.sig, time: c.time, type: "no", text: `Owner declined request ${ev.req}` });
        break;
      }
      case "pay": {
        receipts.push({
          id: ev.id,
          sig: c.sig,
          time: c.time,
          agent: ev.ag,
          merchant: ev.mer,
          amount: ev.amt,
          purpose: ev.p,
          kind: ev.k,
          approvedBy: ev.req ? "owner" : "allowance",
          requestId: ev.req,
          approvalSig: ev.req ? approvalSigs.get(ev.req) : undefined,
          reference: ev.ref,
        });
        if (ev.req) {
          const r = requests.get(ev.req);
          if (r) r.paymentSig = c.sig;
        }
        activity.push({ sig: c.sig, time: c.time, type: "pay", text: `${agentName(ev.ag)} paid $${ev.amt.toFixed(2)} to ${merchantName(ev.mer)}` });
        break;
      }
    }
  });

  // A reset clears requests still pending at that point.
  if (resetIndex >= 0) {
    for (const r of requests.values()) {
      const idx = chrono.findIndex((c) => c.sig === r.sig);
      if (r.status === "pending" && idx < resetIndex) r.status = "declined";
    }
  }

  const agents: AgentView[] = AGENTS.map((a) => {
    const card = snap.cards.find((c) => c.agent === a.id)!;
    const b = budgets[a.id];
    const since = b?.index ?? -1;
    const mine = receipts.filter((r) => r.agent === a.id);
    const spentSince = chrono
      .slice(since + 1)
      .filter((c) => c.ev.t === "pay" && c.ev.ag === a.id && !c.ev.req)
      .reduce((s, c) => s + (c.ev.t === "pay" ? c.ev.amt : 0), 0);
    const delegated = card.delegate === agentAddresses[a.id] ? fromUnits(card.delegatedAmount) : 0;
    return {
      id: a.id,
      name: a.name,
      role: a.role,
      initials: a.initials,
      color: a.color,
      agentAddress: agentAddresses[a.id],
      card: card.address,
      cardExists: card.exists,
      cardBalance: fromUnits(card.balance),
      budget: b?.amt ?? 0,
      remaining: delegated,
      active: card.delegate === agentAddresses[a.id] && revokedAt[a.id] === undefined,
      spent: spentSince,
      payments: mine.length,
      lastBudgetSig: b?.sig,
    };
  });

  return {
    network: "devnet",
    owner: snap.owner,
    mint: snap.mint,
    treasury: snap.treasury,
    treasuryBalance: fromUnits(snap.treasuryBalance),
    ownerSol: snap.ownerSol,
    agents,
    receipts: receipts.reverse(),
    approvals: [...requests.values()].reverse(),
    activity: activity.reverse().slice(0, 40),
    fetchedAt: snap.fetchedAt,
  };
}

export function agentName(id: AgentId) {
  return AGENTS.find((a) => a.id === id)?.name ?? id;
}

export function merchantName(id: MerchantId) {
  return MERCHANTS[id]?.name ?? id;
}

export function receiptsCsv(state: DashboardState) {
  const head = ["receipt_id", "time_utc", "agent", "merchant", "purpose", "amount_usd", "token", "payment_type", "approved_by", "approval_request", "tx_signature", "explorer_url", "approval_tx"];
  const esc = (v: unknown) => {
    const s = v === undefined || v === null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = state.receipts.map((r) => [
    r.id,
    r.time ? new Date(r.time * 1000).toISOString() : "",
    agentName(r.agent),
    merchantName(r.merchant),
    r.purpose,
    r.amount.toFixed(2),
    "dUSDC (devnet)",
    r.kind === "x402" ? "x402 pay-per-request" : "invoice",
    r.approvedBy === "owner" ? "owner (one-tap approval)" : "within allowance",
    r.requestId ?? "",
    r.sig,
    explorerTx(r.sig),
    r.approvalSig ?? "",
  ]);
  return [head, ...rows].map((row) => row.map(esc).join(",")).join("\n") + "\n";
}

export const taskById = (id: string) => (TASKS as Record<string, (typeof TASKS)[keyof typeof TASKS]>)[id];
