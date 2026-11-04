export const USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

export type Trc20Transfer = {
  transaction_id: string;
  token_info: { address: string; decimals: number };
  block_timestamp: number;
  from: string;
  to: string;
  type: string;
  value: string;
};

const MAX_PAGES = 20;

export async function fetchIncomingUsdt(address: string, minTimestamp: number): Promise<{ transfers: Trc20Transfer[]; newest: number }> {
  const headers: Record<string, string> = {};
  if (process.env.TRONGRID_API_KEY) headers["TRON-PRO-API-KEY"] = process.env.TRONGRID_API_KEY;
  const out: Trc20Transfer[] = [];
  let fingerprint: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(`https://api.trongrid.io/v1/accounts/${address}/transactions/trc20`);
    url.searchParams.set("only_to", "true");
    url.searchParams.set("only_confirmed", "true");
    url.searchParams.set("contract_address", USDT_CONTRACT);
    url.searchParams.set("min_timestamp", String(minTimestamp));
    url.searchParams.set("limit", "100");
    url.searchParams.set("order_by", "block_timestamp,asc");
    if (fingerprint) url.searchParams.set("fingerprint", fingerprint);
    const res = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`TronGrid ${res.status}`);
    const json = (await res.json()) as { data?: Trc20Transfer[]; meta?: { fingerprint?: string } };
    out.push(...(json.data ?? []));
    fingerprint = json.meta?.fingerprint;
    if (!fingerprint) break;
  }
  const newest = out.reduce((m, t) => Math.max(m, t.block_timestamp), 0);
  const transfers = out.filter(
    (t) => t.type === "Transfer" && t.to === address && t.token_info?.address === USDT_CONTRACT && Number(t.value) > 0,
  );
  return { transfers, newest };
}
