import { createHmac } from "node:crypto";
import { enabledCurrencies, expireOrders, getCounter, setCounter, isTxProcessed, markPaid, markSeen, pendingOrders, recordTx, usdtAddress, type Order } from "./orders";
import { fetchIncomingUsdt } from "./tron";
import { receivedUnits, type Coin, type Currency } from "./chains";
import { recordEvent } from "./stats";

const POLL_MS = Number(process.env.POLL_SECONDS ?? 20) * 1000;
const MAX_BACKOFF_MS = 5 * 60_000;

async function notify(order: Order) {
  const url = process.env.WEBHOOK_URL;
  const secret = process.env.WEBHOOK_SECRET;
  if (!url) return;
  if (!secret) {
    console.error("[pay] WEBHOOK_URL is set without WEBHOOK_SECRET; not sending an unsigned webhook");
    return;
  }
  const body = JSON.stringify({ event: "order.paid", order: { id: order.id, product: order.product, currency: order.currency, amount_units: order.amount_units, tx_id: order.tx_id, paid_at: order.paid_at } });
  const headers: Record<string, string> = { "content-type": "application/json" };
  const timestamp = String(Math.floor(Date.now() / 1000));
  headers["x-timestamp"] = timestamp;
  headers["x-signature"] = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  try {
    const r = await fetch(url, { method: "POST", headers, body });
    if (!r.ok) console.error(`[pay] webhook ${r.status} for order ${order.id}`);
  } catch (e) {
    console.error("[pay] webhook failed:", e);
  }
}

async function paid(orderId: string, txId: string, currency: string) {
  const o = markPaid(orderId, txId);
  if (!o) return;
  recordEvent("paid", currency);
  console.log(`[pay] ${currency} order ${o.id} (${o.product}) paid by ${txId}`);
  await notify(o);
}

const USDT_WATERMARK = "usdt_seen_until";
const FIRST_LOOKBACK_MS = 24 * 60 * 60_000;
const OVERLAP_MS = 10 * 60_000;

async function pollUsdt() {
  const pending = pendingOrders("USDT");
  const watermark = getCounter(USDT_WATERMARK) ?? Date.now() - FIRST_LOOKBACK_MS;
  const since = Math.min(watermark - OVERLAP_MS, ...pending.map((o) => o.created_at - 5 * 60_000));
  const transfers = await fetchIncomingUsdt(usdtAddress(), since);
  for (const t of transfers) {
    if (isTxProcessed(t.transaction_id)) continue;
    const value = Number(t.value);
    const i = pending.findIndex((o) => o.amount_units === value && o.created_at - 5 * 60_000 <= t.block_timestamp);
    if (i >= 0) {
      const [match] = pending.splice(i, 1);
      await paid(match.id, t.transaction_id, "USDT");
    } else {
      recordTx(t.transaction_id, null);
      console.log(`[pay] unmatched USDT transfer ${t.transaction_id} value=${value}`);
    }
  }
  const newest = Math.max(watermark, ...transfers.map((t) => t.block_timestamp));
  if (newest > watermark) setCounter(USDT_WATERMARK, newest);
}

async function pollCoin(coin: Coin) {
  const orders = pendingOrders(coin);
  let failed = 0;
  for (const o of orders) {
    try {
      const { confirmed, unconfirmed, txid } = await receivedUnits(coin, o.address);
      if (confirmed >= o.min_units && txid) await paid(o.id, txid, coin);
      else if (confirmed + unconfirmed >= o.min_units && !o.seen_at) markSeen(o.id);
    } catch (e) {
      failed++;
      console.error(`[pay] ${coin} poll failed for ${o.id}:`, e);
    }
  }
  if (failed > 0 && failed === orders.length) {
    throw new Error(`${coin} explorer unreachable for all ${failed} pending address(es)`);
  }
}

type Source = { poll: () => Promise<void>; failures: number; nextAt: number };

const sources = new Map<Currency, Source>();

function sourceFor(currency: Currency): Source {
  let source = sources.get(currency);
  if (!source) {
    const poll = currency === "USDT" ? pollUsdt : () => pollCoin(currency);
    source = { poll, failures: 0, nextAt: 0 };
    sources.set(currency, source);
  }
  return source;
}

export async function pollOnce() {
  expireOrders();
  for (const currency of enabledCurrencies()) {
    const source = sourceFor(currency);
    if (source.nextAt > Date.now()) continue;
    try {
      await source.poll();
      if (source.failures > 0) console.log(`[pay] ${currency} recovered after ${source.failures} failed polls`);
      source.failures = 0;
      source.nextAt = 0;
    } catch (e) {
      source.failures++;
      const wait = Math.min(POLL_MS * 2 ** source.failures, MAX_BACKOFF_MS);
      source.nextAt = Date.now() + wait;
      console.error(
        `[pay] ${currency} poll failed (${source.failures} in a row), retrying in ${Math.round(wait / 1000)}s:`,
        e,
      );
    }
  }
}

const g = globalThis as unknown as { __checkoutWatcher?: NodeJS.Timeout };

export function startWatcher() {
  if (g.__checkoutWatcher) return;
  const enabled = enabledCurrencies();
  if (enabled.length === 0) {
    console.warn("[pay] no currencies configured (USDT_ADDRESS / BTC_XPUB / LTC_XPUB); watcher disabled");
    return;
  }
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await pollOnce();
    } catch (e) {
      console.error("[pay] poll failed:", e);
    } finally {
      running = false;
    }
  };
  g.__checkoutWatcher = setInterval(tick, POLL_MS);
  tick();
  console.log(`[pay] watching ${enabled.join(", ")} every ${POLL_MS / 1000}s`);
}
