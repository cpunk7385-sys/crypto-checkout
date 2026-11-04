import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

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
    CREATE TABLE IF NOT EXISTS hits (
      day TEXT NOT NULL,
      path TEXT NOT NULL,
      referrer TEXT NOT NULL DEFAULT '',
      views INTEGER NOT NULL DEFAULT 0,
      sessions INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (day, path, referrer)
    );
    CREATE TABLE IF NOT EXISTS events (
      day TEXT NOT NULL,
      name TEXT NOT NULL,
      label TEXT NOT NULL DEFAULT '',
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (day, name, label)
    );
  `);
  migrate(db);
  return db;
}

const ORDER_COLUMNS: [string, string][] = [
  ["product", "TEXT NOT NULL DEFAULT ''"],
  ["currency", "TEXT NOT NULL DEFAULT 'USDT'"],
  ["address", "TEXT NOT NULL DEFAULT ''"],
  ["min_units", "INTEGER NOT NULL DEFAULT 0"],
  ["addr_index", "INTEGER"],
  ["paid_at", "INTEGER"],
  ["tx_id", "TEXT"],
  ["deliverable", "TEXT"],
];

function migrate(db: Database.Database) {
  const cols = new Set(
    db.prepare<[], { name: string }>("PRAGMA table_info(orders)").all().map((c) => c.name),
  );
  for (const [name, ddl] of ORDER_COLUMNS) {
    if (!cols.has(name)) db.exec(`ALTER TABLE orders ADD COLUMN ${name} ${ddl}`);
  }
  // a min_units of 0 would accept any amount, so never leave the column at its default
  db.exec("UPDATE orders SET min_units = amount_units WHERE min_units = 0");
}

const g = globalThis as unknown as { __checkoutDb?: Database.Database };
export const db = (g.__checkoutDb ??= open());
