import { randomBytes, randomInt } from "node:crypto";
import { COIN_DECIMALS, coinEnabled, deriveAddress, type Coin, type Currency } from "./chains";
import { fulfill } from "./deliverables";
import { coinUsdPrice } from "./prices";
import { db } from "./sqlite";
import type { Product } from "./products";

export type Order = {
  id: string;
  product: string;
  currency: Currency;
  address: string;
  amount_units: number;
  min_units: number;
  addr_index: number | null;
  status: "pending" | "paid" | "expired";
  created_at: number;
  expires_at: number;
  paid_at: number | null;
  tx_id: string | null;
  deliverable: string | null;
  seen_at: number | null;
};

const ORDER_TTL_MS = Number(process.env.ORDER_TTL_MINUTES ?? 60) * 60_000;
const COIN_TOLERANCE = 0.985;

export const usdtAddress = () => process.env.USDT_ADDRESS ?? "";

export function enabledCurrencies(): Currency[] {
  const out: Currency[] = [];
  if (usdtAddress()) out.push("USDT");
  if (coinEnabled("BTC")) out.push("BTC");
  if (coinEnabled("LTC")) out.push("LTC");
  return out;
}

export function getCounter(name: string): number | null {
  return db.prepare<[string], { value: number }>("SELECT value FROM counters WHERE name = ?").get(name)?.value ?? null;
}

export function setCounter(name: string, value: number) {
  db.prepare("INSERT INTO counters (name, value) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET value = ?").run(name, value, value);
}

function nextIndex(name: string): number {
  return db.transaction(() => {
    const row = db.prepare<[string], { value: number }>("SELECT value FROM counters WHERE name = ?").get(name);
    const next = (row?.value ?? -1) + 1;
    db.prepare("INSERT INTO counters (name, value) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET value = ?").run(name, next, next);
    return next;
  })();
}

function uniqueUsdtAmount(priceUsd: number): number {
  const base = Math.round(priceUsd * 1_000_000);
  const taken = new Set(
    db.prepare<[], { amount_units: number }>("SELECT amount_units FROM orders WHERE status = 'pending' AND currency = 'USDT'").all().map((r) => r.amount_units),
  );
  for (let i = 0; i < 50; i++) {
    const candidate = base + randomInt(100, 10_000) * 100;
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error("Could not allocate a unique amount");
}

export async function createOrder(product: Product, currency: Currency): Promise<Order> {
  if (!enabledCurrencies().includes(currency)) throw new Error(`${currency} not available`);
  const now = Date.now();
  const base = { id: randomBytes(8).toString("hex"), product: product.id, status: "pending" as const, created_at: now, expires_at: now + ORDER_TTL_MS, paid_at: null, tx_id: null, deliverable: null, seen_at: null };
  let order: Order;
  if (currency === "USDT") {
    const units = uniqueUsdtAmount(product.priceUsd);
    order = { ...base, currency, address: usdtAddress(), amount_units: units, min_units: units, addr_index: null };
  } else {
    const coin: Coin = currency;
    const usd = await coinUsdPrice(coin);
    const units = Math.ceil((product.priceUsd / usd) * 10 ** COIN_DECIMALS);
    const idx = nextIndex(coin);
    order = { ...base, currency, address: deriveAddress(coin, idx), amount_units: units, min_units: Math.floor(units * COIN_TOLERANCE), addr_index: idx };
  }
  db.prepare(
    `INSERT INTO orders (id, product, currency, address, amount_units, min_units, addr_index, status, created_at, expires_at)
     VALUES (@id, @product, @currency, @address, @amount_units, @min_units, @addr_index, @status, @created_at, @expires_at)`,
  ).run(order);
  return order;
}

export const getOrder = (id: string) => db.prepare<[string], Order>("SELECT * FROM orders WHERE id = ?").get(id);

export function expireOrders() {
  db.prepare("UPDATE orders SET status = 'expired' WHERE status = 'pending' AND expires_at < ?").run(Date.now());
}

export function pendingOrders(currency?: Currency): Order[] {
  return currency
    ? db.prepare<[string], Order>("SELECT * FROM orders WHERE status = 'pending' AND currency = ?").all(currency)
    : db.prepare<[], Order>("SELECT * FROM orders WHERE status = 'pending'").all();
}

export const isTxProcessed = (txId: string) => !!db.prepare("SELECT 1 FROM processed_txs WHERE tx_id = ?").get(txId);

export function recordTx(txId: string, orderId: string | null) {
  db.prepare("INSERT OR IGNORE INTO processed_txs (tx_id, order_id, seen_at) VALUES (?, ?, ?)").run(txId, orderId, Date.now());
}

export function markPaid(orderId: string, txId: string): Order | undefined {
  return db.transaction(() => {
    const o = getOrder(orderId);
    if (!o || o.status !== "pending") return undefined;
    const deliverable = fulfill(o.id, o.product);
    db.prepare("UPDATE orders SET status = 'paid', paid_at = ?, tx_id = ?, deliverable = ? WHERE id = ?").run(Date.now(), txId, deliverable, orderId);
    recordTx(txId, orderId);
    return getOrder(orderId);
  })();
}

const CONFIRMATION_GRACE_MS = 24 * 60 * 60_000;

export function markSeen(orderId: string) {
  const now = Date.now();
  db.prepare(
    "UPDATE orders SET seen_at = ?, expires_at = MAX(expires_at, ?) WHERE id = ? AND status = 'pending' AND seen_at IS NULL",
  ).run(now, now + CONFIRMATION_GRACE_MS, orderId);
}
