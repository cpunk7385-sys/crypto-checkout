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

export async function fetchIncomingUsdt(address: string, minTimestamp: number): Promise<Trc20Transfer[]> {
  const url = new URL(`https://api.trongrid.io/v1/accounts/${address}/transactions/trc20`);
  url.searchParams.set("only_to", "true");
  url.searchParams.set("only_confirmed", "true");
  url.searchParams.set("contract_address", USDT_CONTRACT);
  url.searchParams.set("min_timestamp", String(minTimestamp));
  url.searchParams.set("limit", "100");
  url.searchParams.set("order_by", "block_timestamp,asc");
  const headers: Record<string, string> = {};
  if (process.env.TRONGRID_API_KEY) headers["TRON-PRO-API-KEY"] = process.env.TRONGRID_API_KEY;
  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok) throw new Error(`TronGrid ${res.status}`);
  const json = (await res.json()) as { data?: Trc20Transfer[] };
  return (json.data ?? []).filter((t) => t.type === "Transfer" && t.to === address && t.token_info?.address === USDT_CONTRACT);
}
