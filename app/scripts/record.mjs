// Records the demo video, one clip per narration beat, against the live devnet app.
//
//   BASE_URL=https://allowance.olivia.saint.work node scripts/record.mjs
//
// Writes shots/beats/<id>.webm plus stills, and shots/beats/beats.json with the narration.
// Assemble the final video with: python3 ../submission/assemble.py
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL || "https://allowance.olivia.saint.work";
const OUT = path.resolve(import.meta.dirname, "../../shots");
const BEATS = path.join(OUT, "beats");
fs.rmSync(BEATS, { recursive: true, force: true });
fs.mkdirSync(BEATS, { recursive: true });

const beats = [
  {
    id: "01-problem",
    narration:
      "AI agents are finally useful enough to buy things. [short pause] But the moment they reach a checkout, they stop. [short pause] Card payments assume a human hand on a secure field. So you either hand an agent an unlimited card, [short pause] or you approve every two-dollar API call yourself.",
    async run(page, shot, sleep) {
      await sleep(1200);
      await page.evaluate(() => window.scrollTo({ top: 0 }));
      await sleep(800);
      await shot("01-hero");
      await page.evaluate(() => window.scrollTo({ top: 300, behavior: "smooth" }));
      await sleep(3500);
      await page.evaluate(() => window.scrollTo({ top: 760, behavior: "smooth" }));
      await sleep(4000);
      await page.evaluate(() => window.scrollTo({ top: 1000, behavior: "smooth" }));
      await sleep(3000);
    },
  },
  {
    id: "02-what",
    narration:
      "Allowance is a company card for your AI employees. [short pause] Each agent gets its own USDC card. [short pause] The budget isn't a rule in our database — it's an SPL Token delegate allowance on Solana. [short pause] The token program itself refuses the overspend.",
    async run(page, shot, sleep) {
      await page.evaluate(() => window.scrollTo({ top: 0 }));
      await sleep(500);
      await page.locator("#dashboard").scrollIntoViewIfNeeded();
      await sleep(1200);
      await shot("02-dashboard");
      await page.locator("#agents-h").hover();
      await sleep(2500);
      await page.locator("text=Card (owned by you)").first().hover();
      await sleep(2500);
      await page.locator("text=Agent key (delegate)").first().hover();
      await sleep(2500);
    },
  },
  {
    id: "03-payment",
    narration:
      "Let's have Ava buy something. [short pause] This merchant API charges per request. The agent calls it, and gets an HTTP 402 — with the price, the token, and the address. [short pause] Two dollars, inside her allowance, so the token program accepts the transfer, and the business pays the network fee. [short pause] She retries with the signature as proof, and the merchant verifies it on-chain before answering.",
    async run(page, shot, sleep) {
      await page.locator("#console").scrollIntoViewIfNeeded();
      await sleep(1500);
      await page.getByRole("button", { name: /Buy a market data report/i }).click();
      await page.waitForSelector("text=402 Payment Required", { timeout: 60_000 });
      await sleep(2500);
      await page.waitForSelector("text=Payment confirmed on Solana devnet", { timeout: 120_000 });
      await sleep(1500);
      await shot("03-paid");
      await page.waitForSelector("text=200 OK", { timeout: 90_000 });
      await sleep(1000);
      await page.locator('a:has-text("on Solana Explorer")').first().click({ modifiers: [] }).catch(() => {});
      await page.waitForTimeout(6000);
      await page.goBack().catch(() => {});
      await sleep(1500);
      await page.locator("#console").scrollIntoViewIfNeeded();
      await sleep(1500);
    },
  },
  {
    id: "04-revoke",
    narration:
      "If you're worried, revoking is one transaction. [short pause] Not a ticket to your bank — one transaction. The remaining balance goes straight back to the treasury. [short pause] And setting it again is just as fast.",
    async run(page, shot, sleep) {
      await page.locator("#dashboard").scrollIntoViewIfNeeded();
      await sleep(1200);
      await page.getByRole("button", { name: /Revoke card instantly/i }).first().click();
      await page.waitForSelector("text=View transaction on Solana Explorer", { timeout: 120_000 });
      await sleep(2500);
      await shot("04-revoked");
      await sleep(1500);
      await page.getByRole("button", { name: /Set allowance/i }).first().click();
      await page.waitForSelector("text=allowance set to", { timeout: 120_000 });
      await sleep(3000);
      await shot("05-restored");
    },
  },
  {
    id: "05-approval",
    narration:
      "Now the interesting case: a supplier invoice for six hundred dollars — four times her allowance. [short pause] Watch what the agent does when the chain says no. [short pause] That refusal comes from the Solana token program, not our code. So she files a request on-chain — and the owner gets one tap.",
    async run(page, shot, sleep) {
      await page.locator("#console").scrollIntoViewIfNeeded();
      await sleep(1200);
      await page.getByRole("button", { name: /Pay a supplier invoice/i }).first().click();
      await page.waitForSelector("text=rejected by the SPL Token program", { timeout: 120_000 });
      await sleep(2500);
      await shot("06-over-budget");
      await page.waitForSelector("text=Waiting for owner approval", { timeout: 90_000 });
      await sleep(1000);
      await page.locator("#approvals-h").scrollIntoViewIfNeeded();
      await sleep(2500);
      await shot("07-approval-waiting");
      await sleep(2000);
    },
  },
  {
    id: "06-approve",
    narration:
      "That approval raises the allowance for exactly this payment. [short pause] The transfer goes through, and the receipt links both transactions. [short pause] No silent failure, [short pause] no unlimited card.",
    async run(page, shot, sleep) {
      await page.locator("#approvals-h").scrollIntoViewIfNeeded();
      await sleep(800);
      await page.getByRole("button", { name: /Approve & pay/i }).first().click();
      await page.waitForSelector("text=Approved: $600.00", { timeout: 120_000 });
      await sleep(3500);
      await page.locator("#receipts-h").scrollIntoViewIfNeeded();
      await sleep(3000);
      await shot("08-approved");
      await sleep(2000);
    },
  },
  {
    id: "07-receipts",
    narration:
      "Every payment is a row: agent, merchant, purpose, amount, transaction. [short pause] Export it as a CSV, and it's a spend report your accountant can actually reconcile.",
    async run(page, shot, sleep) {
      await page.locator("#receipts-h").scrollIntoViewIfNeeded();
      await sleep(2500);
      await page.locator("text=Export CSV").hover();
      await sleep(2500);
      const csv = await (await fetch(`${BASE}/api/receipts.csv`)).text();
      fs.writeFileSync(path.join(OUT, "receipts.csv"), csv);
      await shot("09-receipts");
      await sleep(2000);
    },
  },
  {
    id: "08-close",
    narration:
      "No custom smart contract. It's the audited SPL Token program — approve, transferChecked, revoke — plus memos for receipts. [short pause] The chain is the ledger; this dashboard is a view over it. [short pause] Allowance: [short pause] give your AI employees a wallet with a leash.",
    async run(page, shot, sleep) {
      await page.locator("#how").scrollIntoViewIfNeeded();
      await sleep(3000);
      await shot("10-how");
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
      await sleep(4000);
    },
  },
];

const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const manifest = [];

for (const beat of beats) {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: { dir: path.join(BEATS, "raw"), size: { width: 1920, height: 1080 } },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(120_000);
  const video = page.video();
  const sleep = (ms) => page.waitForTimeout(ms);
  const shot = (n) => page.screenshot({ path: path.join(OUT, `${n}.png`) });
  try {
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await sleep(4000);
    await beat.run(page, shot, sleep);
  } catch (e) {
    console.log(`  beat ${beat.id} issue: ${e.message.split("\n")[0]}`);
    await shot(`${beat.id}-error`).catch(() => {});
  }
  await context.close();
  const file = await video.path();
  const dest = path.join(BEATS, `${beat.id}.webm`);
  fs.renameSync(file, dest);
  manifest.push({ id: beat.id, narration: beat.narration, video: dest });
  console.log(`recorded ${beat.id}`);
}

await browser.close();
fs.writeFileSync(path.join(BEATS, "beats.json"), JSON.stringify(manifest, null, 2));
console.log(`\n${manifest.length} clips in ${BEATS}`);
