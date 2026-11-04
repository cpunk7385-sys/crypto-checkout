const TTL_MS = 5 * 60_000;
const IDS = { BTC: "bitcoin", LTC: "litecoin", TRX: "tron", USDT: "tether" } as const;
export type PricedAsset = keyof typeof IDS;

let cache: { at: number; usd: Record<string, number> } | null = null;

async function load(): Promise<Record<string, number>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.usd;
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${Object.values(IDS).join(",")}&vs_currencies=usd`,
    { headers: { accept: "application/json" }, cache: "no-store" },
  );
  if (!res.ok) {
    if (cache) return cache.usd;
    throw new Error(`price feed ${res.status}`);
  }
  const json = (await res.json()) as Record<string, { usd: number }>;
  cache = { at: Date.now(), usd: Object.fromEntries(Object.entries(json).map(([k, v]) => [k, v.usd])) };
  return cache.usd;
}

export async function usdPrice(asset: PricedAsset): Promise<number> {
  const p = (await load())[IDS[asset]];
  if (!p || p <= 0) throw new Error(`no price for ${asset}`);
  return p;
}

export const coinUsdPrice = (c: "BTC" | "LTC") => usdPrice(c);
