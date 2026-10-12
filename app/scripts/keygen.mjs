// Generates devnet keypairs into .env.local (git-ignored). Never use these on mainnet.
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import fs from "node:fs";

const file = ".env.local";
const existing = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
const names = ["OWNER_SECRET", "AGENT_OPS_SECRET", "AGENT_RESEARCH_SECRET", "MINT_SECRET", "MERCHANT_DATA_SECRET", "MERCHANT_ROOMS_SECRET", "MERCHANT_SUPPLY_SECRET"];
let out = existing;
for (const n of names) {
  if (new RegExp(`^${n}=`, "m").test(existing)) continue;
  out += `${n}=${bs58.encode(Keypair.generate().secretKey)}\n`;
}
fs.writeFileSync(file, out, { mode: 0o600 });
for (const n of names) {
  const m = out.match(new RegExp(`^${n}=(.*)$`, "m"));
  console.log(n.replace("_SECRET", ""), Keypair.fromSecretKey(bs58.decode(m[1])).publicKey.toBase58());
}
