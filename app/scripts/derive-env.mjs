// Adds public addresses (derived from the devnet keypairs) and an HMAC secret to .env.local.
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import crypto from "node:crypto";
import fs from "node:fs";

const file = ".env.local";
let env = fs.readFileSync(file, "utf8");
const get = (n) => env.match(new RegExp(`^${n}=(.*)$`, "m"))?.[1];
const set = (n, v) => {
  if (get(n)) env = env.replace(new RegExp(`^${n}=.*$`, "m"), `${n}=${v}`);
  else env += `${n}=${v}\n`;
};
const pub = (n) => Keypair.fromSecretKey(bs58.decode(get(n))).publicKey.toBase58();
set("MINT_ADDRESS", pub("MINT_SECRET"));
set("MERCHANT_DATA_ADDRESS", pub("MERCHANT_DATA_SECRET"));
set("MERCHANT_ROOMS_ADDRESS", pub("MERCHANT_ROOMS_SECRET"));
set("MERCHANT_SUPPLY_ADDRESS", pub("MERCHANT_SUPPLY_SECRET"));
if (!get("REFERENCE_SECRET")) set("REFERENCE_SECRET", crypto.randomBytes(24).toString("hex"));
fs.writeFileSync(file, env, { mode: 0o600 });
console.log("ok");
