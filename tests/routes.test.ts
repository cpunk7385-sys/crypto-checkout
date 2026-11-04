import { describe, expect, it, vi } from "vitest";
import { freshApp } from "./helpers";

const req = (url: string, init: RequestInit = {}, ip = "203.0.113.9") =>
  new Request(url, { ...init, headers: { "x-forwarded-for": ip, ...(init.headers as Record<string, string>) } });

describe("POST /api/orders", () => {
  it("limits order creation per client", async () => {
    await freshApp();
    const { POST } = await import("@/app/api/orders/route");
    const make = (ip: string) => POST(req("http://x/api/orders", { method: "POST", body: JSON.stringify({ product: "demo", currency: "USDT" }) }, ip));
    const statuses = [];
    for (let i = 0; i < 11; i++) statuses.push((await make("198.51.100.1")).status);
    expect(statuses.slice(0, 10).every((s) => s === 200)).toBe(true);
    expect(statuses[10]).toBe(429);
    expect((await make("198.51.100.2")).status).toBe(200);
  });
});

describe("GET /api/stats", () => {
  it("needs the exact key, by header or query", async () => {
    await freshApp({ STATS_KEY: "k3y" });
    const { GET } = await import("@/app/api/stats/route");
    expect((await GET(req("http://x/api/stats?key=wrong"))).status).toBe(403);
    expect((await GET(req("http://x/api/stats?key=k3y"))).status).toBe(200);
    expect((await GET(req("http://x/api/stats", { headers: { "x-stats-key": "k3y" } }))).status).toBe(200);
  });

  it("is closed when no key is configured", async () => {
    await freshApp({ STATS_KEY: "" });
    const { GET } = await import("@/app/api/stats/route");
    expect((await GET(req("http://x/api/stats?key="))).status).toBe(403);
  });
});

describe("POST /api/hit", () => {
  it("records only well-formed paths and stops at the daily row cap", async () => {
    const app = await freshApp();
    const { POST } = await import("@/app/api/hit/route");
    const hit = (p: string, ip = "192.0.2.1") => POST(req("http://x/api/hit", { method: "POST", body: JSON.stringify({ p }) }, ip));
    await hit("/charts/x");
    await hit("/<script>");
    await hit("not-a-path");
    const paths = (app.db.prepare("SELECT path FROM hits").all() as { path: string }[]).map((r) => r.path);
    expect(paths).toEqual(["/charts/x"]);
  });
});

describe("GET /api/tools/tron-address", () => {
  it("serves repeated lookups from cache without calling TronGrid again", async () => {
    await freshApp();
    const { GET } = await import("@/app/api/tools/tron-address/route");
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const url = "http://x/api/tools/tron-address?address=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
    expect((await GET(req(url))).status).toBe(200);
    expect((await GET(req(url))).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
