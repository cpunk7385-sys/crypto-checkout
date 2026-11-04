import { db } from "./sqlite";

const today = () => new Date().toISOString().slice(0, 10);

const MAX_ROWS_PER_DAY = 2_000;

export function recordHit(path: string, referrer: string, newSession: boolean) {
  const day = today();
  const exists = db.prepare("SELECT 1 FROM hits WHERE day = ? AND path = ? AND referrer = ?").get(day, path.slice(0, 120), referrer.slice(0, 80));
  if (!exists) {
    const { n } = db.prepare<[string], { n: number }>("SELECT COUNT(*) n FROM hits WHERE day = ?").get(day)!;
    if (n >= MAX_ROWS_PER_DAY) return;
  }
  db.prepare(
    `INSERT INTO hits (day, path, referrer, views, sessions) VALUES (?, ?, ?, 1, ?)
     ON CONFLICT(day, path, referrer) DO UPDATE SET views = views + 1, sessions = sessions + excluded.sessions`,
  ).run(day, path.slice(0, 120), referrer.slice(0, 80), newSession ? 1 : 0);
}

export function recordEvent(name: string, label = "") {
  db.prepare(
    `INSERT INTO events (day, name, label, count) VALUES (?, ?, ?, 1)
     ON CONFLICT(day, name, label) DO UPDATE SET count = count + 1`,
  ).run(today(), name, label);
}

export function summary(days = 14) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const byDay = db
    .prepare<[string], { day: string; views: number; sessions: number }>(
      "SELECT day, SUM(views) views, SUM(sessions) sessions FROM hits WHERE day >= ? GROUP BY day ORDER BY day",
    )
    .all(since);
  const topPaths = db
    .prepare<[string], { path: string; views: number }>(
      "SELECT path, SUM(views) views FROM hits WHERE day >= ? GROUP BY path ORDER BY views DESC LIMIT 15",
    )
    .all(since);
  const referrers = db
    .prepare<[string], { referrer: string; sessions: number }>(
      "SELECT referrer, SUM(sessions) sessions FROM hits WHERE day >= ? AND referrer != '' GROUP BY referrer ORDER BY sessions DESC LIMIT 15",
    )
    .all(since);
  const events = db
    .prepare<[string], { name: string; label: string; count: number }>(
      "SELECT name, label, SUM(count) count FROM events WHERE day >= ? GROUP BY name, label ORDER BY name, count DESC",
    )
    .all(since);
  const orders = db
    .prepare<[], { status: string; currency: string; n: number }>(
      "SELECT status, currency, COUNT(*) n FROM orders GROUP BY status, currency",
    )
    .all();
  return { since, byDay, topPaths, referrers, events, orders };
}
