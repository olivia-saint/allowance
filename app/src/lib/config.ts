// Static demo configuration shared by server and client.

export const NETWORK = "devnet" as const;
export const DECIMALS = 6;
export const TOKEN_SYMBOL = "dUSDC";

export type AgentId = "ops" | "research";
export type MerchantId = "data" | "rooms" | "supply";
export type TaskId = "report" | "room" | "invoice";

export interface AgentConfig {
  id: AgentId;
  name: string;
  role: string;
  initials: string;
  color: string;
  defaultBudget: number;
}

export interface MerchantConfig {
  id: MerchantId;
  name: string;
  description: string;
}

export interface TaskConfig {
  id: TaskId;
  label: string;
  short: string;
  amount: number;
  merchant: MerchantId;
  kind: "x402" | "invoice";
  path?: string;
  purpose: string;
}

export const AGENTS: AgentConfig[] = [
  { id: "ops", name: "Ava", role: "Operations agent", initials: "AV", color: "#7C3AED", defaultBudget: 150 },
  { id: "research", name: "Leo", role: "Research agent", initials: "LE", color: "#0EA5A4", defaultBudget: 25 },
];

export const MERCHANTS: Record<MerchantId, MerchantConfig> = {
  data: { id: "data", name: "Tickerwire", description: "Market data API (x402)" },
  rooms: { id: "rooms", name: "Roomly", description: "Meeting room booking API (x402)" },
  supply: { id: "supply", name: "Northwind Supplies", description: "Office supplier (invoice)" },
};

export const TASKS: Record<TaskId, TaskConfig> = {
  report: {
    id: "report",
    label: "Buy a market data report",
    short: "Market data report",
    amount: 2,
    merchant: "data",
    kind: "x402",
    path: "/api/merchant/market-report",
    purpose: "Daily market data report",
  },
  room: {
    id: "room",
    label: "Book a meeting room",
    short: "Meeting room, 1 hour",
    amount: 40,
    merchant: "rooms",
    kind: "x402",
    path: "/api/merchant/meeting-room",
    purpose: "Meeting room, 1 hour",
  },
  invoice: {
    id: "invoice",
    label: "Pay a supplier invoice",
    short: "Invoice INV-2041",
    amount: 600,
    merchant: "supply",
    kind: "invoice",
    purpose: "Invoice INV-2041, office chairs",
  },
};

export const PRODUCTS: Record<string, TaskId> = {
  "market-report": "report",
  "meeting-room": "room",
};

export function explorerTx(sig: string) {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}

export function explorerAddress(addr: string) {
  return `https://explorer.solana.com/address/${addr}?cluster=devnet`;
}

export function formatUsd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
