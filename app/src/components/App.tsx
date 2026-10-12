"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Ban,
  Check,
  CheckCircle2,
  CircleAlert,
  Download,
  FileText,
  Globe,
  Inbox,
  Link2,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Terminal,
  X,
  Zap,
} from "lucide-react";
import { AGENTS, MERCHANTS, TASKS, explorerAddress, explorerTx, formatUsd, type AgentId, type TaskId } from "@/lib/config";
import type { AgentView, ApprovalRequest, DashboardState, Receipt } from "@/lib/ledger";
import type { LogLine } from "@/lib/actions";

type Toast = { id: number; kind: "ok" | "err"; text: string; sig?: string };

const short = (a?: string, n = 4) => (a ? `${a.slice(0, n)}…${a.slice(-n)}` : "");

function timeAgo(t: number | null, now: number) {
  if (!t) return "just now";
  const s = Math.max(0, Math.round(now / 1000 - t));
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return new Date(t * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export default function App() {
  const [state, setState] = useState<DashboardState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const toastId = useRef(0);

  const refresh = useCallback(async (fresh = false) => {
    try {
      const res = await fetch(`/api/state${fresh ? "?fresh=1" : ""}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load");
      setState(data);
      setLoadError(null);
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    refresh(true);
    const i = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
      setNow(Date.now());
    }, 6000);
    return () => clearInterval(i);
  }, [refresh]);

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = ++toastId.current;
    setToasts((x) => [...x.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), 9000);
  }, []);

  const act = useCallback(
    async (key: string, url: string, body: unknown, okText: string) => {
      setBusy((b) => ({ ...b, [key]: true }));
      try {
        const data = await postJson(url, body);
        if (data.state) setState(data.state);
        toast({ kind: "ok", text: okText, sig: data.sig || data.paymentSig || data.decisionSig });
        return data;
      } catch (e) {
        toast({ kind: "err", text: (e as Error).message });
      } finally {
        setBusy((b) => ({ ...b, [key]: false }));
      }
    },
    [toast],
  );

  const pending = state?.approvals.filter((a) => a.status === "pending") ?? [];
  const totalAllowance = state?.agents.reduce((s, a) => s + a.remaining, 0) ?? 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <Hero />
        <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Live totals">
          <Kpi label="Business treasury" value={state ? formatUsd(state.treasuryBalance) : "…"} hint="dUSDC on devnet" />
          <Kpi label="Live agent allowances" value={state ? formatUsd(totalAllowance) : "…"} hint="read from chain" />
          <Kpi label="Payments" value={state ? String(state.receipts.length) : "…"} hint="each with a receipt" />
          <Kpi label="Waiting for you" value={state ? String(pending.length) : "…"} hint="approval requests" highlight={pending.length > 0} />
        </section>

        {loadError && !state && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Couldn&apos;t reach Solana devnet just now ({loadError}). Retrying automatically…
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-12">
          <section id="dashboard" className="order-1 lg:col-span-7 lg:col-start-1 lg:row-start-1" aria-labelledby="agents-h">
            <SectionTitle id="agents-h" title="Your AI employees" subtitle="Each agent spends from its own card: a USDC account your business owns, where the agent is only a capped SPL Token delegate." />
            <div className="grid gap-4 sm:grid-cols-2">
              {state
                ? state.agents.map((a) => (
                    <AgentCard
                      key={a.id}
                      agent={a}
                      busy={busy}
                      onBudget={(amount) => act(`budget-${a.id}`, "/api/owner/budget", { agent: a.id, amount }, `${a.name}'s allowance set to ${formatUsd(amount)}`)}
                      onRevoke={() => act(`revoke-${a.id}`, "/api/owner/revoke", { agent: a.id }, `${a.name}'s card revoked. Funds returned to treasury`)}
                    />
                  ))
                : AGENTS.map((a) => <div key={a.id} className="h-72 animate-pulse rounded-3xl bg-white shadow-sm ring-1 ring-slate-200" />)}
            </div>
          </section>

          <section id="console" className="order-2 lg:col-span-5 lg:col-start-8 lg:row-span-3 lg:row-start-1" aria-label="Agent console">
            <div className="lg:sticky lg:top-20">
              <AgentConsole state={state} onDone={() => refresh(true)} />
            </div>
          </section>

          <section className="order-3 lg:col-span-7 lg:col-start-1 lg:row-start-2" aria-labelledby="approvals-h">
            <SectionTitle id="approvals-h" title="Waiting for approval" subtitle="Over-budget payments never fail silently. The agent asks, you decide with one tap." />
            <Approvals
              approvals={state?.approvals ?? []}
              now={now}
              busy={busy}
              onDecide={(r, approve) =>
                act(`decide-${r.id}`, "/api/owner/decide", { requestId: r.id, approve }, approve ? `Approved: ${formatUsd(r.amount)} paid to ${MERCHANTS[r.merchant].name}` : "Request declined")
              }
            />
          </section>

          <section className="order-4 lg:col-span-7 lg:col-start-1 lg:row-start-3" aria-labelledby="receipts-h">
            <div className="flex items-end justify-between gap-4">
              <SectionTitle id="receipts-h" title="Receipts" subtitle="Every payment carries an on-chain memo receipt. Export them for your accountant." />
              <a
                href="/api/receipts.csv"
                className="mb-4 inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-100"
              >
                <Download className="h-4 w-4" /> Export CSV
              </a>
            </div>
            <Receipts receipts={state?.receipts ?? []} now={now} loading={!state} />
          </section>
        </div>

        <HowItWorks state={state} />
        <ResetDemo busy={!!busy.reset} onReset={() => act("reset", "/api/owner/reset", {}, "Demo reset: allowances restored")} />
      </main>
      <Footer />
      <Toasts toasts={toasts} onClose={(id) => setToasts((x) => x.filter((t) => t.id !== id))} />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-slate-50/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="#" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" className="h-8 w-8" />
          <span className="text-lg font-semibold tracking-tight">Allowance</span>
          <span className="ml-1 hidden rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700 sm:inline">Solana devnet · test money</span>
        </a>
        <nav className="flex items-center gap-1 text-sm text-slate-600 sm:gap-2">
          <a href="#dashboard" className="hidden rounded-full px-3 py-1.5 hover:bg-slate-200/60 md:inline">Dashboard</a>
          <a href="#console" className="hidden rounded-full px-3 py-1.5 hover:bg-slate-200/60 md:inline">Agent console</a>
          <a href="#how" className="rounded-full px-3 py-1.5 hover:bg-slate-200/60">How it works</a>
          <a href="https://github.com/olivia-saint/allowance" className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-1.5 font-medium text-white hover:bg-slate-700">
            <GitHubIcon /> <span className="hidden sm:inline">GitHub</span>
          </a>
        </nav>
      </div>
    </header>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function Hero() {
  return (
    <section className="pt-10 sm:pt-14">
      <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Spending limits for AI agents, enforced on Solana
      </div>
      <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
        A company card for your{" "}
        <span className="bg-gradient-to-r from-[#9945FF] to-[#0fbf7a] bg-clip-text text-transparent">AI employees</span>.
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
        Give every agent a USDC budget it physically can&apos;t exceed. Agents pay APIs, bookings and invoices instantly, anything over budget comes to you for one tap, and every payment leaves a receipt.
      </p>
      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <a href="#console" className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 font-medium text-white shadow-sm hover:bg-slate-700">
          <Terminal className="h-4 w-4" /> Try the agent console
        </a>
        <a href="#how" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-100">
          How it works
        </a>
      </div>
    </section>
  );
}

function Kpi({ label, value, hint, highlight }: { label: string; value: string; hint: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ${highlight ? "ring-amber-300" : "ring-slate-200"}`}>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${highlight ? "text-amber-600" : "text-slate-900"}`}>{value}</div>
      <div className="mt-0.5 text-xs text-slate-400">{hint}</div>
    </div>
  );
}

function SectionTitle({ id, title, subtitle }: { id: string; title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2 id={id} className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

function Avatar({ agent, size = "h-11 w-11" }: { agent: { initials: string; color: string }; size?: string }) {
  return (
    <div className={`${size} flex shrink-0 items-center justify-center rounded-2xl text-sm font-semibold text-white shadow-sm`} style={{ background: agent.color }}>
      {agent.initials}
    </div>
  );
}

function AgentCard({ agent, busy, onBudget, onRevoke }: { agent: AgentView; busy: Record<string, boolean>; onBudget: (n: number) => void; onRevoke: () => void }) {
  const [value, setValue] = useState(String(agent.budget || AGENTS.find((a) => a.id === agent.id)?.defaultBudget || 50));
  const pct = agent.budget > 0 ? Math.min(100, (agent.remaining / agent.budget) * 100) : 0;
  const saving = busy[`budget-${agent.id}`];
  const revoking = busy[`revoke-${agent.id}`];
  return (
    <div className="flex flex-col rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar agent={agent} />
          <div>
            <div className="font-semibold">{agent.name}</div>
            <div className="text-sm text-slate-500">{agent.role}</div>
          </div>
        </div>
        {agent.active ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-200">
            <Ban className="h-3 w-3" /> Revoked
          </span>
        )}
      </div>

      <div className="mt-5">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tabular-nums tracking-tight">{formatUsd(agent.remaining)}</span>
          <span className="text-sm text-slate-500">left</span>
        </div>
        <div className="mt-0.5 text-sm text-slate-500">
          of {formatUsd(agent.budget)} allowance · spent {formatUsd(agent.spent)}
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-gradient-to-r from-[#9945FF] to-[#14F195] transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <dl className="mt-4 space-y-1.5 text-xs text-slate-500">
        <div className="flex justify-between gap-2">
          <dt>Card (owned by you)</dt>
          <dd>
            <a className="inline-flex items-center gap-0.5 font-mono text-slate-700 hover:text-violet-700" href={explorerAddress(agent.card)} target="_blank" rel="noreferrer">
              {short(agent.card)} <ArrowUpRight className="h-3 w-3" />
            </a>
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Agent key (delegate)</dt>
          <dd>
            <a className="inline-flex items-center gap-0.5 font-mono text-slate-700 hover:text-violet-700" href={explorerAddress(agent.agentAddress)} target="_blank" rel="noreferrer">
              {short(agent.agentAddress)} <ArrowUpRight className="h-3 w-3" />
            </a>
          </dd>
        </div>
      </dl>

      <form
        className="mt-5 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const n = Number(value);
          if (Number.isFinite(n) && n >= 0) onBudget(n);
        }}
      >
        <label className="relative flex-1">
          <span className="sr-only">Allowance for {agent.name} in USD</span>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
          <input
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ""))}
            className="w-full rounded-xl border-0 bg-slate-50 py-2.5 pl-7 pr-3 text-sm tabular-nums ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-violet-500 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Set allowance
        </button>
      </form>
      <button
        onClick={onRevoke}
        disabled={revoking || !agent.active}
        className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
      >
        {revoking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />} Revoke card instantly
      </button>
    </div>
  );
}

function Approvals({ approvals, now, busy, onDecide }: { approvals: ApprovalRequest[]; now: number; busy: Record<string, boolean>; onDecide: (r: ApprovalRequest, approve: boolean) => void }) {
  const pending = approvals.filter((a) => a.status === "pending");
  const recent = approvals.filter((a) => a.status !== "pending").slice(0, 3);
  return (
    <div className="space-y-3">
      {pending.length === 0 && (
        <div className="flex items-center gap-3 rounded-3xl border border-dashed border-slate-300 bg-white/60 p-5 text-sm text-slate-500">
          <Inbox className="h-5 w-5 text-slate-400" />
          Nothing waiting. Your agents are within budget. Try the $600 invoice in the agent console.
        </div>
      )}
      {pending.map((r) => {
        const agent = AGENTS.find((a) => a.id === r.agent)!;
        const loading = busy[`decide-${r.id}`];
        return (
          <div key={r.id} className="rounded-3xl bg-white p-5 shadow-sm ring-2 ring-amber-300">
            <div className="flex items-start gap-3">
              <Avatar agent={agent} size="h-10 w-10" />
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  {agent.name} wants to pay <span className="tabular-nums">{formatUsd(r.amount)}</span> to {MERCHANTS[r.merchant].name}
                </div>
                <div className="mt-0.5 text-sm text-slate-500">
                  {r.purpose} · over its allowance · {timeAgo(r.time, now)} ·{" "}
                  <a href={explorerTx(r.sig)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 hover:text-violet-700">
                    request on-chain <ArrowUpRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => onDecide(r, true)}
                disabled={loading}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-500 disabled:opacity-60 sm:flex-none"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Approve &amp; pay
              </button>
              <button
                onClick={() => onDecide(r, false)}
                disabled={loading}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60 sm:flex-none"
              >
                <X className="h-4 w-4" /> Decline
              </button>
            </div>
          </div>
        );
      })}
      {recent.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-2xl bg-white/70 px-4 text-sm ring-1 ring-slate-200">
          {recent.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
              <span className="truncate text-slate-600">
                {AGENTS.find((a) => a.id === r.agent)?.name}: {formatUsd(r.amount)} to {MERCHANTS[r.merchant].name}
              </span>
              <span className={`shrink-0 text-xs font-medium ${r.status === "approved" ? "text-emerald-600" : "text-slate-400"}`}>
                {r.status === "approved" ? "Approved" : "Declined"}
                {r.decisionSig && (
                  <a href={explorerTx(r.decisionSig)} target="_blank" rel="noreferrer" className="ml-1 inline-flex align-middle text-slate-400 hover:text-violet-700">
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Receipts({ receipts, now, loading }: { receipts: Receipt[]; now: number; loading: boolean }) {
  if (loading) return <div className="h-40 animate-pulse rounded-3xl bg-white ring-1 ring-slate-200" />;
  if (receipts.length === 0)
    return <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-5 text-sm text-slate-500">No payments yet. Run a task in the agent console.</div>;
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
      <ul className="divide-y divide-slate-100">
        {receipts.slice(0, 25).map((r) => {
          const agent = AGENTS.find((a) => a.id === r.agent)!;
          return (
            <li key={r.sig} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <Avatar agent={agent} size="h-9 w-9" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {MERCHANTS[r.merchant].name} <span className="font-normal text-slate-500">· {r.purpose}</span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                  <span>{agent.name}</span>
                  <span>·</span>
                  <span>{timeAgo(r.time, now)}</span>
                  <span className={`rounded-full px-2 py-0.5 font-medium ${r.kind === "x402" ? "bg-sky-50 text-sky-700" : "bg-slate-100 text-slate-600"}`}>{r.kind === "x402" ? "x402" : "Invoice"}</span>
                  {r.approvedBy === "owner" && <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">Approved by owner</span>}
                  <span className="font-mono text-slate-400">{r.id}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold tabular-nums">−{formatUsd(r.amount)}</div>
                <a href={explorerTx(r.sig)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-xs text-violet-700 hover:underline">
                  tx {r.sig.slice(0, 6)} <ArrowUpRight className="h-3 w-3" />
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type Run = { id: number; agent: AgentId; task: TaskId; lines: LogLine[]; done: boolean };

function AgentConsole({ state, onDone }: { state: DashboardState | null; onDone: () => void }) {
  const [agentId, setAgentId] = useState<AgentId>("ops");
  const [runs, setRuns] = useState<Run[]>([]);
  const [running, setRunning] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const runId = useRef(0);
  const agent = state?.agents.find((a) => a.id === agentId);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [runs]);

  async function run(task: TaskId) {
    if (running) return;
    setRunning(true);
    const id = ++runId.current;
    setRuns((r) => [...r.slice(-4), { id, agent: agentId, task, lines: [], done: false }]);
    const push = (l: LogLine) => setRuns((rs) => rs.map((r) => (r.id === id ? { ...r, lines: [...r.lines, l] } : r)));
    try {
      const res = await fetch("/api/agent/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ agent: agentId, task }) });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        push({ type: "step", icon: "error", title: data.error || `Request failed (${res.status})` });
      } else {
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const parts = buf.split("\n");
          buf = parts.pop() || "";
          for (const p of parts) if (p.trim()) push(JSON.parse(p));
        }
      }
    } catch (e) {
      push({ type: "step", icon: "error", title: (e as Error).message });
    } finally {
      setRuns((rs) => rs.map((r) => (r.id === id ? { ...r, done: true } : r)));
      setRunning(false);
      onDone();
    }
  }

  return (
    <div className="overflow-hidden rounded-3xl bg-slate-950 text-slate-100 shadow-xl ring-1 ring-slate-800">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-[#14F195]" />
          <span className="font-semibold">Agent console</span>
        </div>
        <span className="text-xs text-slate-400">the agent&apos;s side</span>
      </div>

      <div className="px-5 pt-4">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Act as</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(state?.agents ?? []).map((a) => (
            <button
              key={a.id}
              onClick={() => setAgentId(a.id)}
              className={`flex items-center gap-2.5 rounded-2xl p-2.5 text-left transition ${a.id === agentId ? "bg-white/10 ring-1 ring-white/25" : "hover:bg-white/5"}`}
            >
              <Avatar agent={a} size="h-8 w-8" />
              <div className="min-w-0">
                <div className="text-sm font-medium">{a.name}</div>
                <div className="truncate text-xs text-slate-400">{formatUsd(a.remaining)} left</div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">Give {agent?.name ?? "the agent"} a task</div>
        <div className="mt-2 space-y-2">
          {(Object.keys(TASKS) as TaskId[]).map((t) => {
            const task = TASKS[t];
            const over = agent ? task.amount > agent.remaining || !agent.active : false;
            return (
              <button
                key={t}
                onClick={() => run(t)}
                disabled={running || !state}
                className="group flex w-full items-center gap-3 rounded-2xl bg-white/5 p-3 text-left ring-1 ring-white/10 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${task.kind === "x402" ? "bg-sky-400/15 text-sky-300" : "bg-amber-400/15 text-amber-300"}`}>
                  {task.kind === "x402" ? <Globe className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{task.label}</div>
                  <div className="text-xs text-slate-400">
                    {MERCHANTS[task.merchant].name} · {task.kind === "x402" ? "HTTP 402 pay-per-request" : "invoice"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold tabular-nums">{formatUsd(task.amount)}</div>
                  <div className={`text-[11px] ${over ? "text-amber-300" : "text-emerald-300"}`}>{over ? "needs approval" : "within allowance"}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div ref={logRef} className="mt-4 max-h-[460px] min-h-[220px] overflow-y-auto border-t border-white/10 bg-black/30 px-5 py-4 font-mono text-[12.5px] leading-relaxed">
        {runs.length === 0 && (
          <div className="text-slate-500">
            <Sparkles className="mb-2 h-4 w-4 text-[#14F195]" />
            Pick a task. The agent pays the way an AI employee would: it calls the merchant, gets an HTTP 402, checks its on-chain allowance, pays in USDC and retries with proof. Over budget? The chain refuses, so it asks you.
          </div>
        )}
        {runs.map((r) => (
          <div key={r.id} className="mb-5 last:mb-0">
            <div className="mb-2 text-slate-500">
              $ {AGENTS.find((a) => a.id === r.agent)?.name.toLowerCase()} run &quot;{TASKS[r.task].label.toLowerCase()}&quot;
            </div>
            {r.lines.map((l, i) => (l.type === "step" ? <LogStep key={i} line={l} /> : <LogResult key={i} line={l} />))}
            {!r.done && (
              <div className="flex items-center gap-2 text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> working…
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-white/10 px-5 py-3 text-xs text-slate-400">
        <ShieldCheck className="h-3.5 w-3.5 text-[#14F195]" /> Agent keys live server-side. They can only move funds up to the on-chain allowance.
      </div>
    </div>
  );
}

function LogStep({ line }: { line: Extract<LogLine, { type: "step" }> }) {
  const icon = {
    http: <Link2 className="h-3.5 w-3.5 text-sky-300" />,
    chain: <Zap className="h-3.5 w-3.5 text-[#c9a7ff]" />,
    check: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />,
    warn: <CircleAlert className="h-3.5 w-3.5 text-amber-300" />,
    done: <Check className="h-3.5 w-3.5 text-emerald-300" />,
    error: <X className="h-3.5 w-3.5 text-rose-400" />,
    think: <Sparkles className="h-3.5 w-3.5 text-slate-300" />,
  }[line.icon];
  return (
    <div className="mb-2 flex gap-2.5">
      <div className="mt-[3px]">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className={line.icon === "error" ? "text-rose-300" : line.icon === "warn" ? "text-amber-200" : "text-slate-100"}>{line.title}</div>
        {line.detail && <div className="text-slate-400">{line.detail}</div>}
        {line.code && <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-white/5 p-2.5 text-[11.5px] text-slate-300 ring-1 ring-white/10">{line.code}</pre>}
        {line.link && (
          <a href={line.link.href} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-[#14F195] hover:underline">
            {line.link.label} <ArrowUpRight className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}

function LogResult({ line }: { line: Extract<LogLine, { type: "result" }> }) {
  const style =
    line.status === "paid"
      ? "bg-emerald-400/10 text-emerald-200 ring-emerald-400/30"
      : line.status === "pending"
        ? "bg-amber-400/10 text-amber-200 ring-amber-400/30"
        : "bg-rose-400/10 text-rose-200 ring-rose-400/30";
  const text = line.status === "paid" ? `Done. Receipt ${line.receipt}` : line.status === "pending" ? `Waiting for owner approval (${line.request})` : "Task failed";
  return <div className={`mt-1 inline-flex rounded-lg px-2.5 py-1 font-sans text-xs font-medium ring-1 ${style}`}>{text}</div>;
}

function HowItWorks({ state }: { state: DashboardState | null }) {
  const steps = [
    { title: "You fund a card per agent", text: "Each AI employee gets its own USDC token account. Your business owns it; the agent never holds the funds." },
    { title: "The cap lives on-chain", text: "You approve the agent as an SPL Token delegate with a limit. The Solana token program enforces it, not our servers. Revoke any time." },
    { title: "Agents pay instantly", text: "x402-style APIs answer HTTP 402; the agent pays in USDC and retries with the signature. Invoices and bookings work the same way." },
    { title: "Over budget? You decide", text: "The chain rejects overspend, so the agent files a request. One tap raises the allowance for that payment and it completes." },
  ];
  const curl = `curl -i ${typeof window !== "undefined" ? window.location.origin : "https://allowance.olivia.saint.work"}/api/merchant/market-report`;
  return (
    <section id="how" className="mt-20 scroll-mt-20">
      <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
      <p className="mt-2 max-w-2xl text-slate-500">
        No custom smart contract to trust: Allowance uses the audited SPL Token program&apos;s delegate allowance, Solana memos for receipts, and USDC. The chain is the ledger; this dashboard is a view over it.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <div key={s.title} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#9945FF] to-[#14F195] text-sm font-semibold text-white">{i + 1}</div>
            <div className="mt-3 font-semibold">{s.title}</div>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">{s.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="font-semibold">Flow</div>
          <pre className="mt-3 overflow-x-auto rounded-2xl bg-slate-950 p-4 font-mono text-[11.5px] leading-relaxed text-slate-200">{`Business treasury (USDC)
   │  fund + approve(agent, cap)        ← owner signs
   ▼
Agent card  ─ token account owned by the business
   │  transferChecked as delegate        ← agent signs, fees sponsored
   │  + memo receipt {id, purpose, ref}
   ▼
Merchant / x402 API  ─ verifies the transfer on-chain → 200 OK

Over the cap? SPL Token rejects it → agent files an
on-chain request → owner taps Approve → allowance +amount
→ agent completes the payment → linked receipt`}</pre>
        </div>
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="font-semibold">Verify it yourself</div>
          <p className="mt-1 text-sm text-slate-500">Ask the demo merchant for a report without paying:</p>
          <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-950 p-3 font-mono text-xs text-[#14F195]">{curl}</pre>
          <p className="mt-3 text-sm text-slate-500">Devnet addresses:</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {[
              ["dUSDC mint (test USDC, 6 decimals)", state?.mint],
              ["Business wallet (fee sponsor)", state?.owner],
              ["Treasury token account", state?.treasury],
              ...(state?.agents.map((a) => [`${a.name}'s card`, a.card]) ?? []),
              ["SPL Token program", "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"],
            ].map(([label, addr]) => (
              <li key={label} className="flex items-center justify-between gap-3">
                <span className="text-slate-600">{label}</span>
                {addr ? (
                  <a href={explorerAddress(addr)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-mono text-xs text-violet-700 hover:underline">
                    {short(addr, 5)} <ArrowUpRight className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-xs text-slate-400">…</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function ResetDemo({ busy, onReset }: { busy: boolean; onReset: () => void }) {
  return (
    <div className="mt-10 flex flex-col items-start justify-between gap-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-center">
      <div>
        <div className="font-semibold">Reset the demo</div>
        <div className="text-sm text-slate-500">Declines open requests and restores Ava to $150 and Leo to $25. History stays on-chain.</div>
      </div>
      <button onClick={onReset} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Reset
      </button>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" className="h-5 w-5" /> Allowance · built for the Colosseum Crypto World&apos;s Fair, October 2026
        </div>
        <div>Solana devnet demo. Test tokens only, no real money.</div>
      </div>
    </footer>
  );
}

function Toasts({ toasts, onClose }: { toasts: Toast[]; onClose: (id: number) => void }) {
  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end">
      {toasts.map((t) => (
        <div key={t.id} className={`flex w-full max-w-sm items-start gap-3 rounded-2xl p-4 text-sm shadow-lg ring-1 ${t.kind === "ok" ? "bg-white ring-slate-200" : "bg-rose-50 ring-rose-200"}`}>
          {t.kind === "ok" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />}
          <div className="min-w-0 flex-1">
            <div className={t.kind === "ok" ? "text-slate-800" : "text-rose-800"}>{t.text}</div>
            {t.sig && (
              <a href={explorerTx(t.sig)} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex items-center gap-0.5 text-xs text-violet-700 hover:underline">
                View transaction on Solana Explorer <ArrowUpRight className="h-3 w-3" />
              </a>
            )}
          </div>
          <button onClick={() => onClose(t.id)} className="text-slate-400 hover:text-slate-600" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function useUnused() {
  return useMemo(() => null, []);
}
