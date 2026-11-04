import { createHash } from "node:crypto";
import { USDT_CONTRACT } from "./tron";

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function base58Decode(s: string): Uint8Array | null {
  let num = BigInt(0);
  for (const ch of s) {
    const i = ALPHABET.indexOf(ch);
    if (i < 0) return null;
    num = num * BigInt(58) + BigInt(i);
  }
  const bytes: number[] = [];
  while (num > BigInt(0)) {
    bytes.unshift(Number(num & BigInt(255)));
    num >>= BigInt(8);
  }
  for (const ch of s) {
    if (ch !== "1") break;
    bytes.unshift(0);
  }
  return Uint8Array.from(bytes);
}

export function validateTronAddress(addr: string): { ok: boolean; reason?: string } {
  if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr)) return { ok: false, reason: "TRON addresses are 34 characters, start with T, base58 (no 0, O, I, l)" };
  const raw = base58Decode(addr);
  if (!raw || raw.length !== 25 || raw[0] !== 0x41) return { ok: false, reason: "not a valid TRON address encoding" };
  const payload = raw.slice(0, 21);
  const check = raw.slice(21);
  const h = createHash("sha256").update(createHash("sha256").update(payload).digest()).digest();
  for (let i = 0; i < 4; i++) if (h[i] !== check[i]) return { ok: false, reason: "checksum mismatch: a character is wrong" };
  return { ok: true };
}

export type TronAddressInfo = {
  address: string;
  valid: boolean;
  reason?: string;
  activated?: boolean;
  holdsUsdt?: boolean;
  usdtBalance?: number;
  trxBalance?: number;
  createdAt?: number | null;
  lookalike?: { prefix: string; suffix: string };
};

export async function inspectTronAddress(addr: string): Promise<TronAddressInfo> {
  const v = validateTronAddress(addr);
  if (!v.ok) return { address: addr, valid: false, reason: v.reason };
  const headers: Record<string, string> = { accept: "application/json" };
  if (process.env.TRONGRID_API_KEY) headers["TRON-PRO-API-KEY"] = process.env.TRONGRID_API_KEY;
  const r = await fetch(`https://api.trongrid.io/v1/accounts/${addr}`, { headers, cache: "no-store" });
  if (!r.ok) throw new Error(`trongrid ${r.status}`);
  const j = (await r.json()) as { data?: { balance?: number; create_time?: number; trc20?: Record<string, string>[] }[] };
  const acct = j.data?.[0];
  const usdtEntry = acct?.trc20?.find((o) => USDT_CONTRACT in o);
  const usdtBalance = usdtEntry ? Number(usdtEntry[USDT_CONTRACT]) / 1e6 : 0;
  return {
    address: addr,
    valid: true,
    activated: !!acct,
    holdsUsdt: !!usdtEntry,
    usdtBalance,
    trxBalance: Number(acct?.balance ?? 0) / 1e6,
    createdAt: acct?.create_time ?? null,
    lookalike: { prefix: addr.slice(0, 6), suffix: addr.slice(-6) },
  };
}
