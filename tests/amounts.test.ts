import { afterEach, describe, expect, it, vi } from "vitest";
import { freshApp } from "./helpers";

const picks: number[] = [];

vi.mock("node:crypto", async (importOriginal) => {
  const real = await importOriginal<typeof import("node:crypto")>();
  return {
    ...real,
    default: real,
    randomInt: (min: number, max: number) => (picks.length ? picks.shift()! : real.randomInt(min, max)),
  };
});

afterEach(() => {
  vi.useRealTimers();
  picks.length = 0;
});

const demo = { id: "demo", title: "Demo", description: "", priceUsd: 12, deliver: { type: "license" as const } };

describe("USDT amount allocation", () => {
  it("does not hand a recently expired order's amount to a new order", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-05T00:00:00Z"));
    const app = await freshApp();
    picks.push(1234);
    const old = await app.createOrder(demo, "USDT");
    expect(old.amount_units).toBe(12_123_400);
    vi.setSystemTime(new Date("2026-11-05T02:00:00Z"));
    app.expireOrders();
    picks.push(1234, 4321);
    const fresh = await app.createOrder(demo, "USDT");
    expect(fresh.amount_units).toBe(12_432_100);
  });

  it("reuses an amount once the old order expired more than a day ago", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-05T00:00:00Z"));
    const app = await freshApp();
    picks.push(1234);
    await app.createOrder(demo, "USDT");
    vi.setSystemTime(new Date("2026-11-06T02:00:00Z"));
    app.expireOrders();
    picks.push(1234);
    expect((await app.createOrder(demo, "USDT")).amount_units).toBe(12_123_400);
  });
});
