import { HDKey } from "@scure/bip32";
import * as btc from "@scure/btc-signer";

export type Coin = "BTC" | "LTC";
export type Currency = "USDT" | Coin;

const LTC_NET = { bech32: "ltc", pubKeyHash: 0x30, scriptHash: 0x32, wif: 0xb0 };

const COINS = {
  BTC: { xpubEnv: "BTC_XPUB", net: btc.NETWORK, apis: ["https://mempool.space/api", "https://blockstream.info/api"], uri: "bitcoin", geckoId: "bitcoin" },
  LTC: { xpubEnv: "LTC_XPUB", net: LTC_NET, apis: ["https://litecoinspace.org/api"], uri: "litecoin", geckoId: "litecoin" },
} as const;

export const COIN_DECIMALS = 8;

export const coinEnabled = (c: Coin) => !!process.env[COINS[c].xpubEnv];
export const coinUri = (c: Coin) => COINS[c].uri;
export const coinGeckoId = (c: Coin) => COINS[c].geckoId;

export function deriveAddress(c: Coin, index: number): string {
  const xpub = process.env[COINS[c].xpubEnv];
  if (!xpub) throw new Error(`${c} not configured`);
  const key = HDKey.fromExtendedKey(xpub).deriveChild(0).deriveChild(index);
  const address = btc.p2wpkh(key.publicKey!, COINS[c].net).address;
  if (!address) throw new Error(`could not derive ${c} address`);
  return address;
}

type EsploraTx = {
  txid: string;
  vout: { scriptpubkey_address?: string; value: number }[];
  status: { confirmed: boolean };
};

async function addressTxs(c: Coin, address: string): Promise<EsploraTx[]> {
  let lastError: unknown;
  for (const api of COINS[c].apis) {
    try {
      const res = await fetch(`${api}/address/${address}/txs`, {
        headers: { accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`${c} explorer ${res.status}`);
      return (await res.json()) as EsploraTx[];
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

export type Received = { confirmed: number; unconfirmed: number; txid: string | null; txids: string[] };

export async function receivedUnits(c: Coin, address: string): Promise<Received> {
  const txs = await addressTxs(c, address);
  let confirmed = 0;
  let unconfirmed = 0;
  let txid: string | null = null;
  const txids: string[] = [];
  for (const tx of txs) {
    for (const o of tx.vout) {
      if (o.scriptpubkey_address !== address) continue;
      if (tx.status.confirmed) {
        confirmed += o.value;
        txid ??= tx.txid;
        if (!txids.includes(tx.txid)) txids.push(tx.txid);
      } else {
        unconfirmed += o.value;
      }
    }
  }
  return { confirmed, unconfirmed, txid, txids };
}

export function formatUnits(units: number, decimals: number): string {
  const s = units.toString().padStart(decimals + 1, "0");
  const int = s.slice(0, -decimals);
  const frac = s.slice(-decimals).replace(/0+$/, "");
  return frac ? `${int}.${frac}` : int;
}
