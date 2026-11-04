import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { vi } from "vitest";
import { mnemonicToSeedSync } from "@scure/bip39";
import { HDKey } from "@scure/bip32";

export const BIP84_MNEMONIC =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

export function accountXpub(coinType: number): string {
  return HDKey.fromMasterSeed(mnemonicToSeedSync(BIP84_MNEMONIC)).derive(`m/84'/${coinType}'/0'`).publicExtendedKey;
}

export const USDT_ADDRESS = "TNEeAmW3aEL7SVUJ5eohrJBvknKdBumfVq";

export async function freshApp(env: Record<string, string> = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "cc-test-"));
  vi.stubEnv("DATA_DIR", dir);
  vi.stubEnv("USDT_ADDRESS", USDT_ADDRESS);
  vi.stubEnv("BTC_XPUB", accountXpub(0));
  vi.stubEnv("LTC_XPUB", accountXpub(2));
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  delete (globalThis as Record<string, unknown>).__checkoutDb;
  vi.resetModules();
  const orders = await import("@/lib/orders");
  const deliverables = await import("@/lib/deliverables");
  const products = await import("@/lib/products");
  const { db } = await import("@/lib/sqlite");
  return { dir, db, ...orders, ...deliverables, ...products };
}

type Route = { match: (url: string) => boolean; respond: (url: string, init?: RequestInit) => Response | Promise<Response> };

export function mockFetch(routes: Route[]) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fn = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    calls.push({ url, init });
    const route = routes.find((r) => r.match(url));
    if (!route) throw new Error(`unexpected fetch ${url}`);
    return route.respond(url, init);
  });
  vi.stubGlobal("fetch", fn);
  return calls;
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export const priceRoute = (usd: Record<string, number>): Route => ({
  match: (u) => u.includes("api.coingecko.com"),
  respond: () => json(Object.fromEntries(Object.entries(usd).map(([k, v]) => [k, { usd: v }]))),
});
