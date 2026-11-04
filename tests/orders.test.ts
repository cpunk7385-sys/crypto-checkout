import { afterEach, describe, expect, it, vi } from "vitest";
import { freshApp, mockFetch, priceRoute, USDT_ADDRESS } from "./helpers";

afterEach(() => {
  vi.useRealTimers();
});

const demo = { id: "demo", title: "Demo", description: "", priceUsd: 12, deliver: { type: "license" as const } };

describe("enabledCurrencies", () => {
  it("offers only the currencies whose receive details are configured", async () => {
    const app = await freshApp({ BTC_XPUB: "", LTC_XPUB: "" });
    expect(app.enabledCurrencies()).toEqual(["USDT"]);
    await expect(app.createOrder(demo, "BTC")).rejects.toThrow("BTC not available");
  });
});

describe("USDT orders", () => {
  it("asks for the price plus a unique sub-dollar amount, payable to the shared address", async () => {
    const app = await freshApp();
    const o = await app.createOrder(demo, "USDT");
    expect(o.address).toBe(USDT_ADDRESS);
    expect(o.amount_units).toBeGreaterThan(12_000_000);
    expect(o.amount_units).toBeLessThan(13_000_000);
    expect(o.amount_units % 100).toBe(0);
    expect(o.min_units).toBe(o.amount_units);
    expect(o.status).toBe("pending");
  });

  it("never gives two pending orders the same amount", async () => {
    const app = await freshApp();
    const amounts = new Set<number>();
    for (let i = 0; i < 60; i++) amounts.add((await app.createOrder(demo, "USDT")).amount_units);
    expect(amounts.size).toBe(60);
  });
});

describe("coin orders", () => {
  it("locks the amount from the current price and accepts 98.5% of it", async () => {
    const app = await freshApp();
    mockFetch([priceRoute({ bitcoin: 80_000, litecoin: 75, tron: 0.3, tether: 1 })]);
    const o = await app.createOrder(demo, "BTC");
    expect(o.amount_units).toBe(Math.ceil((12 / 80_000) * 1e8));
    expect(o.min_units).toBe(Math.floor(o.amount_units * 0.985));
  });

  it("gives every order its own address from consecutive derivation indexes", async () => {
    const app = await freshApp();
    mockFetch([priceRoute({ bitcoin: 80_000, litecoin: 75, tron: 0.3, tether: 1 })]);
    const a = await app.createOrder(demo, "BTC");
    const b = await app.createOrder(demo, "BTC");
    const c = await app.createOrder(demo, "LTC");
    expect([a.addr_index, b.addr_index]).toEqual([0, 1]);
    expect(a.address).toBe("bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu");
    expect(b.address).toBe("bc1qnjg0jd8228aq7egyzacy8cys3knf9xvrerkf9g");
    expect(c.addr_index).toBe(0);
    expect(c.address).toMatch(/^ltc1q/);
  });

  it("refuses to create an order when no price is available", async () => {
    const app = await freshApp();
    mockFetch([{ match: () => true, respond: () => new Response("down", { status: 503 }) }]);
    await expect(app.createOrder(demo, "LTC")).rejects.toThrow("price feed 503");
  });
});

describe("expiry", () => {
  it("expires pending orders after the TTL and leaves paid ones alone", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-05T00:00:00Z"));
    const app = await freshApp({ ORDER_TTL_MINUTES: "60" });
    const stale = await app.createOrder(demo, "USDT");
    const paid = await app.createOrder(demo, "USDT");
    app.markPaid(paid.id, "tx-paid");
    vi.setSystemTime(new Date("2026-11-05T01:00:01Z"));
    const fresh = await app.createOrder(demo, "USDT");
    app.expireOrders();
    expect(app.getOrder(stale.id)?.status).toBe("expired");
    expect(app.getOrder(paid.id)?.status).toBe("paid");
    expect(app.getOrder(fresh.id)?.status).toBe("pending");
  });
});

describe("markPaid", () => {
  it("delivers exactly once even if the same order is settled twice", async () => {
    const app = await freshApp();
    const o = await app.createOrder(demo, "USDT");
    const first = app.markPaid(o.id, "tx-1");
    expect(first?.status).toBe("paid");
    expect(first?.tx_id).toBe("tx-1");
    expect(first?.deliverable).toMatch(/^CC-[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/);
    expect(app.markPaid(o.id, "tx-2")).toBeUndefined();
    expect(app.getOrder(o.id)?.deliverable).toBe(first?.deliverable);
    expect(app.isTxProcessed("tx-1")).toBe(true);
  });

  it("does not deliver for an order that already expired", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-05T00:00:00Z"));
    const app = await freshApp();
    const o = await app.createOrder(demo, "USDT");
    vi.setSystemTime(new Date("2026-11-05T02:00:00Z"));
    app.expireOrders();
    expect(app.markPaid(o.id, "tx-late")).toBeUndefined();
  });
});

