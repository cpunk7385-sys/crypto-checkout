import { usdPrice } from "./prices";

export type RailFee = {
  rail: string;
  network: string;
  feeNative: string;
  feeUsd: number;
  note: string;
  minutes: string;
};

const TX_VBYTES = 140;
const ENERGY_FUNDED = 65_000;
const ENERGY_FRESH = 130_000;
const BANDWIDTH_BYTES = 345;

async function recommended(api: string): Promise<number> {
  const r = await fetch(`${api}/v1/fees/recommended`, { cache: "no-store" });
  if (!r.ok) throw new Error(`${api} ${r.status}`);
  const j = (await r.json()) as { fastestFee: number; halfHourFee: number; hourFee: number };
  return j.halfHourFee;
}

async function tronParams(): Promise<{ energySun: number; bandwidthSun: number }> {
  const r = await fetch("https://api.trongrid.io/wallet/getchainparameters", { cache: "no-store" });
  if (!r.ok) throw new Error(`trongrid ${r.status}`);
  const j = (await r.json()) as { chainParameter: { key: string; value?: number }[] };
  const get = (k: string, d: number) => j.chainParameter.find((p) => p.key === k)?.value ?? d;
  return { energySun: get("getEnergyFee", 100), bandwidthSun: get("getTransactionFee", 1000) };
}

export async function compareFees(): Promise<{ at: number; rails: RailFee[] }> {
  const [btcRate, ltcRate, tron, btcUsd, ltcUsd, trxUsd] = await Promise.all([
    recommended("https://mempool.space/api"),
    recommended("https://litecoinspace.org/api"),
    tronParams(),
    usdPrice("BTC"),
    usdPrice("LTC"),
    usdPrice("TRX"),
  ]);
  const btcSats = btcRate * TX_VBYTES;
  const ltcLits = ltcRate * TX_VBYTES;
  const trxFunded = (ENERGY_FUNDED * tron.energySun + BANDWIDTH_BYTES * tron.bandwidthSun) / 1e6;
  const trxFresh = (ENERGY_FRESH * tron.energySun + BANDWIDTH_BYTES * tron.bandwidthSun) / 1e6;
  return {
    at: Date.now(),
    rails: [
      {
        rail: "USDT",
        network: "TRON (TRC-20), recipient already holds USDT",
        feeNative: `${trxFunded.toFixed(2)} TRX`,
        feeUsd: trxFunded * trxUsd,
        note: `${ENERGY_FUNDED.toLocaleString()} energy at ${tron.energySun} sun each, paid in TRX unless you stake or rent energy`,
        minutes: "~1",
      },
      {
        rail: "USDT",
        network: "TRON (TRC-20), recipient never held USDT",
        feeNative: `${trxFresh.toFixed(2)} TRX`,
        feeUsd: trxFresh * trxUsd,
        note: `${ENERGY_FRESH.toLocaleString()} energy: the first transfer to an address costs double`,
        minutes: "~1",
      },
      {
        rail: "LTC",
        network: "Litecoin on-chain",
        feeNative: `${(ltcLits / 1e8).toFixed(6)} LTC`,
        feeUsd: (ltcLits / 1e8) * ltcUsd,
        note: `${ltcRate} lit/vB for a ${TX_VBYTES} vB segwit transaction`,
        minutes: "~5",
      },
      {
        rail: "BTC",
        network: "Bitcoin on-chain",
        feeNative: `${btcSats.toLocaleString()} sat`,
        feeUsd: (btcSats / 1e8) * btcUsd,
        note: `${btcRate} sat/vB (half-hour target) for a ${TX_VBYTES} vB segwit transaction`,
        minutes: "~30",
      },
    ].sort((a, b) => a.feeUsd - b.feeUsd),
  };
}
