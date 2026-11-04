import { describe, expect, it } from "vitest";
import { freshApp, mockFetch, priceRoute } from "./helpers";

const demo = { id: "demo", title: "Demo", description: "", priceUsd: 1, deliver: { type: "license" as const } };

describe("stats summary", () => {
  it("reports the highest derivation index issued per coin so wallets can be scanned far enough", async () => {
    const app = await freshApp();
    const { summary } = await import("@/lib/stats");
    mockFetch([priceRoute({ bitcoin: 80_000, litecoin: 75, tron: 0.3, tether: 1 })]);
    await app.createOrder(demo, "BTC");
    await app.createOrder(demo, "BTC");
    await app.createOrder(demo, "LTC");
    expect(summary(1).addressIndexes).toEqual({ BTC: 1, LTC: 0 });
  });
});
