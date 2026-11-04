import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomBytes, randomInt } from "node:crypto";
import { COIN_DECIMALS, coinEnabled, deriveAddress, type Coin, type Currency } from "./chains";
import { coinUsdPrice } from "./prices";
import { productById, type Product } from "./products";

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
};

const ORDER_TTL_MS = Number(process.env.ORDER_TTL_MINUTES ?? 60) * 60_000;
const COIN_TOLERANCE = 0.985;

function open() {
  const dir = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  const db = new Database(path.join(dir, "checkout.sqlite"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      product TEXT NOT NULL,
      currency TEXT NOT NULL,
      address TEXT NOT NULL,
      amount_units INTEGER NOT NULL,
      min_units INTEGER NOT NULL,
      addr_index INTEGER,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      paid_at INTEGER,
      tx_id TEXT,
      deliverable TEXT
    );
    CREATE INDEX IF NOT EXISTS orders_pending ON orders(status, currency);
    CREATE TABLE IF NOT EXISTS processed_txs (tx_id TEXT PRIMARY KEY, order_id TEXT, seen_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS counters (name TEXT PRIMARY KEY, value INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS downloads (
      token TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      file TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      count INTEGER NOT NULL DEFAULT 0
    );
  `);
  return db;
}

const g = globalThis as unknown as { __checkoutDb?: Database.Database };
export const db = (g.__checkoutDb ??= open());

export const usdtAddress = () => process.env.USDT_ADDRESS ?? "";

export function enabledCurrencies(): Currency[] {
  const out: Currency[] = [];
  if (usdtAddress()) out.push("USDT");
  if (coinEnabled("BTC")) out.push("BTC");
  if (coinEnabled("LTC")) out.push("LTC");
  return out;
}

const KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function licenseKey(prefix = process.env.LICENSE_PREFIX ?? "CC"): string {
  const bytes = randomBytes(16);
  let s = "";
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) s += "-";
    s += KEY_ALPHABET[bytes[i] % KEY_ALPHABET.length];
  }
  return `${prefix}-${s}`;
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
  const base = { id: randomBytes(8).toString("hex"), product: product.id, status: "pending" as const, created_at: now, expires_at: now + ORDER_TTL_MS, paid_at: null, tx_id: null, deliverable: null };
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

function fulfill(order: Order): string {
  const p = productById(order.product);
  const d = p?.deliver ?? { type: "license" as const };
  if (d.type === "license") return licenseKey();
  if (d.type === "text") return d.text;
  const token = randomBytes(16).toString("hex");
  db.prepare("INSERT INTO downloads (token, order_id, file, expires_at) VALUES (?, ?, ?, ?)").run(
    token, order.id, d.file, Date.now() + 7 * 86_400_000,
  );
  return `/api/download/${token}`;
}

export function markPaid(orderId: string, txId: string): Order | undefined {
  return db.transaction(() => {
    const o = getOrder(orderId);
    if (!o || o.status !== "pending") return undefined;
    const deliverable = fulfill(o);
    db.prepare("UPDATE orders SET status = 'paid', paid_at = ?, tx_id = ?, deliverable = ? WHERE id = ?").run(Date.now(), txId, deliverable, orderId);
    recordTx(txId, orderId);
    return getOrder(orderId);
  })();
}

export function isLicenseValid(key: string): boolean {
  if (!/^[A-Z0-9]{1,8}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(key)) return false;
  return !!db.prepare("SELECT 1 FROM orders WHERE deliverable = ? AND status = 'paid'").get(key);
}

export function takeDownload(token: string): { file: string } | null {
  const row = db.prepare<[string], { file: string; expires_at: number; count: number }>("SELECT file, expires_at, count FROM downloads WHERE token = ?").get(token);
  if (!row || row.expires_at < Date.now() || row.count >= 20) return null;
  db.prepare("UPDATE downloads SET count = count + 1 WHERE token = ?").run(token);
  return { file: row.file };
}
