// End-to-end test of the deployed (or local) Allowance app against Solana devnet.
//
//   BASE_URL=https://allowance.olivia.saint.work RECORD=1 node scripts/e2e.mjs
//
// Verifies the real user journeys in a real browser at 1920x1080, checks every on-chain
// link the app renders, and (with RECORD=1) writes screenshots + a video to ../shots.
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const OUT = process.env.OUT_DIR || path.resolve(import.meta.dirname, "../../shots");
const RECORD = process.env.RECORD === "1";
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Devnet's public RPC rate-limits hard, so every call backs off and retries.
const rpc = async (method, params, tries = 6) => {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(RPC_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
      const j = await r.json();
      if (j.error) {
        last = new Error(j.error.message);
        if (j.error.code === 429 || /rate|too many/i.test(j.error.message || "")) {
          await sleep(1200 * (i + 1));
          continue;
        }
        throw last;
      }
      return j.result;
    } catch (e) {
      last = e;
      await sleep(1200 * (i + 1));
    }
  }
  throw last;
};

const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox", "--disable-dev-shm-usage", "--ignore-certificate-errors"] });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  recordVideo: RECORD ? { dir: path.join(OUT, "video-raw"), size: { width: 1920, height: 1080 } } : undefined,
});
const page = await context.newPage();
page.setDefaultTimeout(90_000);
page.on("pageerror", (e) => console.log("  page error:", e.message));

const shot = (n) => page.screenshot({ path: path.join(OUT, `${n}.png`), fullPage: false });
const full = (n) => page.screenshot({ path: path.join(OUT, `${n}-full.png`), fullPage: true });

// ---------- 1. merchant endpoint charges (x402) ----------
const mr = await fetch(`${BASE}/api/merchant/market-report`, { headers: { accept: "application/json" } });
const mrBody = await mr.json().catch(() => ({}));
check("merchant returns 402 Payment Required", mr.status === 402, `status ${mr.status}`);
check(
  "402 carries x402 payment requirements",
  mrBody?.accepts?.[0]?.maxAmountRequired === "2000000" && !!mrBody?.accepts?.[0]?.payTo && !!mrBody?.accepts?.[0]?.asset,
  JSON.stringify(mrBody?.accepts?.[0] || {}).slice(0, 120),
);

// ---------- 2. state API ----------
const st = await (await fetch(`${BASE}/api/state?fresh=1`)).json();
check("state API returns the demo business", !!st.owner && !!st.mint, `owner ${String(st.owner).slice(0, 8)}…`);
check("treasury is funded with test USDC", st.treasuryBalance >= 1000, `$${st.treasuryBalance}`);
check("both agent cards exist on-chain", st.agents.every((a) => a.cardExists), st.agents.map((a) => `${a.name}:${a.cardExists}`).join(" "));

// ---------- 3. UI loads ----------
await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.waitForSelector("text=A company card for your", { timeout: 30_000 });
await page.waitForFunction(() => !document.body.innerText.includes("$…"), null, { timeout: 30_000 }).catch(() => {});
await page.waitForTimeout(2500);
await shot("01-dashboard");
check("dashboard renders with live allowances", (await page.locator("text=left").count()) >= 2);

// ---------- 4. run an x402 payment in the browser ----------
const console_ = page.locator("#console");
await console_.scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
await page.getByRole("button", { name: /Buy a market data report/i }).click();
await page.waitForSelector("text=Payment confirmed on Solana devnet", { timeout: 120_000 });
await page.waitForSelector("text=200 OK", { timeout: 60_000 });
await shot("02-x402-paid");
check("agent completed an x402 payment in the browser", true);

// ---------- 5. revoke + restore ----------
await page.locator("#dashboard").scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
await page.getByRole("button", { name: /Revoke card instantly/i }).first().click();
await page.waitForSelector("text=View transaction on Solana Explorer", { timeout: 90_000 });
await page.waitForTimeout(3000);
await shot("03-revoked");
check("owner can revoke an agent's card", (await page.getByText("Revoked", { exact: true }).count()) >= 1);

// ---------- 6. over-budget invoice -> approval ----------
await console_.scrollIntoViewIfNeeded();
await page.getByRole("button", { name: /Pay a supplier invoice/i }).first().click();
await page.waitForSelector("text=Waiting for owner approval", { timeout: 120_000 });
await shot("04-request-filed");
check("over-budget payment becomes an approval request", true);

await page.locator("#approvals-h").scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
await shot("05-approval-waiting");
await page.getByRole("button", { name: /Approve & pay/i }).first().click();
await page.waitForSelector("text=Approved: $600.00", { timeout: 120_000 });
await page.waitForTimeout(6000);
await shot("06-approved");
check("owner approved and the payment completed", true);

// ---------- 7. receipts + CSV ----------
await page.locator("#receipts-h").scrollIntoViewIfNeeded();
await page.waitForTimeout(1500);
await full("07-receipts");
const csv = await (await fetch(`${BASE}/api/receipts.csv`)).text();
const rows = csv.trim().split("\n");
check("CSV export contains the payments", rows.length >= 3, `${rows.length - 1} receipts`);
fs.writeFileSync(path.join(OUT, "receipts.csv"), csv);

// ---------- 8. every explorer link must resolve on-chain ----------
const links = await page.locator('a[href*="explorer.solana.com"]').evaluateAll((els) => els.map((e) => e.href));
const sigs = [...new Set(links.map((h) => h.match(/\/tx\/([1-9A-HJ-NP-Za-km-z]{60,90})/)?.[1]).filter(Boolean))];
const addrs = [...new Set(links.map((h) => h.match(/\/address\/([1-9A-HJ-NP-Za-km-z]{32,44})/)?.[1]).filter(Boolean))];
let badTx = [];
for (const s of sigs) {
  const tx = await rpc("getTransaction", [s, { maxSupportedTransactionVersion: 0, commitment: "confirmed" }]);
  if (!tx) badTx.push(s);
}
let badAddr = [];
for (const a of addrs) {
  const info = await rpc("getAccountInfo", [a, { encoding: "base64" }]);
  if (!info?.value) badAddr.push(a);
}
check("every transaction link resolves on devnet", badTx.length === 0, `${sigs.length} tx links checked${badTx.length ? " bad: " + badTx.join(",") : ""}`);
check("every address link resolves on devnet", badAddr.length === 0, `${addrs.length} address links checked${badAddr.length ? " bad: " + badAddr.join(",") : ""}`);

// ---------- 9. mobile ----------
const m = await context.newPage();
await m.setViewportSize({ width: 390, height: 844 });
await m.goto(BASE, { waitUntil: "domcontentloaded" });
await m.waitForTimeout(4000);
await m.screenshot({ path: path.join(OUT, "08-mobile.png"), fullPage: false });
const hscroll = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check("no horizontal overflow on mobile", hscroll <= 2, `overflow ${hscroll}px`);
await m.close();

// ---------- 10. reset ----------
await page.locator("text=Reset the demo").scrollIntoViewIfNeeded();
await page.getByRole("button", { name: /^Reset$/ }).click();
await page.waitForSelector("text=Demo reset: allowances restored", { timeout: 120_000 });
await page.waitForTimeout(3000);
await shot("09-reset");
check("demo reset works", true);

await context.close();
await browser.close();

const failed = results.filter((r) => !r.ok);
fs.writeFileSync(path.join(OUT, "e2e-report.md"), ["# E2E report", "", `Base: ${BASE}`, `At: ${new Date().toISOString()}`, "", ...results.map((r) => `- ${r.ok ? "✅" : "❌"} ${r.name}${r.detail ? ` — ${r.detail}` : ""}`)].join("\n") + "\n");
const video = fs.readdirSync(path.join(OUT, "video-raw")).filter((f) => f.endsWith(".webm"));
if (RECORD && video.length) fs.writeFileSync(path.join(OUT, "video-raw", "latest.txt"), video.sort().pop());
console.log(`\n${results.length - failed.length}/${results.length} checks passed${RECORD ? ` · video: ${video.join(",")}` : ""}`);
process.exit(failed.length ? 1 : 0);
