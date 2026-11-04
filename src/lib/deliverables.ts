import { randomBytes } from "node:crypto";
import { productById } from "./products";
import { db } from "./sqlite";

const KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const KEY_RE = /^[A-Z0-9]{1,8}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/;

export function licenseKey(prefix = process.env.LICENSE_PREFIX ?? "CC"): string {
  const bytes = randomBytes(16);
  let s = "";
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) s += "-";
    s += KEY_ALPHABET[bytes[i] % KEY_ALPHABET.length];
  }
  return `${prefix}-${s}`;
}

export function isLicenseValid(key: string, product?: string): boolean {
  if (!KEY_RE.test(key)) return false;
  if (product === undefined) return !!db.prepare("SELECT 1 FROM orders WHERE deliverable = ? AND status = 'paid'").get(key);
  return !!db.prepare("SELECT 1 FROM orders WHERE deliverable = ? AND status = 'paid' AND product = ?").get(key, product);
}

export function fulfill(orderId: string, product: string): string {
  const d = productById(product)?.deliver ?? { type: "license" as const };
  if (d.type === "license") return licenseKey();
  if (d.type === "text") return d.text;
  const token = randomBytes(16).toString("hex");
  db.prepare("INSERT INTO downloads (token, order_id, file, expires_at) VALUES (?, ?, ?, ?)").run(
    token, orderId, d.file, Date.now() + 7 * 86_400_000,
  );
  return `/api/download/${token}`;
}

export function takeDownload(token: string): { file: string } | null {
  const row = db.prepare<[string], { file: string; expires_at: number; count: number }>("SELECT file, expires_at, count FROM downloads WHERE token = ?").get(token);
  if (!row || row.expires_at < Date.now() || row.count >= 20) return null;
  db.prepare("UPDATE downloads SET count = count + 1 WHERE token = ?").run(token);
  return { file: row.file };
}
