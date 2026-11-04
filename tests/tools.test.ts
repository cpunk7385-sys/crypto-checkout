import { describe, expect, it, vi } from "vitest";
import { json, mockFetch } from "./helpers";

describe("validateTronAddress", () => {
  it("accepts a well-formed address with a correct checksum", async () => {
    const { validateTronAddress } = await import("@/lib/tron-address");
    expect(validateTronAddress("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t")).toEqual({ ok: true });
  });

  it.each([
    ["one character changed", "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6u", "checksum"],
    ["too short", "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6", "34 characters"],
    ["not starting with T", "AR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", "34 characters"],
    ["contains a zero", "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj60", "34 characters"],
    ["a bitcoin address", "bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu", "34 characters"],
  ])("rejects an address that is %s", async (_name, addr, reason) => {
    const { validateTronAddress } = await import("@/lib/tron-address");
    const r = validateTronAddress(addr);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain(reason);
  });
});

describe("inspectTronAddress", () => {
  it("reports USDT holdings, which halve the sender's energy cost", async () => {
    vi.resetModules();
    const { inspectTronAddress } = await import("@/lib/tron-address");
    mockFetch([
      {
        match: (u) => u.includes("/v1/accounts/"),
        respond: () => json({ data: [{ balance: 5_000_000, create_time: 1700000000000, trc20: [{ TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t: "12500000" }] }] }),
      },
    ]);
    const info = await inspectTronAddress("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t");
    expect(info).toMatchObject({ valid: true, activated: true, holdsUsdt: true, usdtBalance: 12.5, trxBalance: 5 });
  });

  it("does not call the network for an invalid address", async () => {
    vi.resetModules();
    const { inspectTronAddress } = await import("@/lib/tron-address");
    const calls = mockFetch([]);
    const info = await inspectTronAddress("not-an-address");
    expect(info.valid).toBe(false);
    expect(calls).toHaveLength(0);
  });
});

describe("compareFees", () => {
  it("prices a TRC-20 transfer from chain parameters and sorts rails by USD cost", async () => {
    vi.resetModules();
    const { compareFees } = await import("@/lib/fees");
    mockFetch([
      { match: (u) => u.includes("mempool.space"), respond: () => json({ fastestFee: 10, halfHourFee: 5, hourFee: 2 }) },
      { match: (u) => u.includes("litecoinspace.org"), respond: () => json({ fastestFee: 2, halfHourFee: 1, hourFee: 1 }) },
      {
        match: (u) => u.includes("getchainparameters"),
        respond: () => json({ chainParameter: [{ key: "getEnergyFee", value: 100 }, { key: "getTransactionFee", value: 1000 }] }),
      },
      { match: (u) => u.includes("coingecko"), respond: () => json({ bitcoin: { usd: 80_000 }, litecoin: { usd: 75 }, tron: { usd: 0.3 }, tether: { usd: 1 } }) },
    ]);
    const { rails } = await compareFees();
    const funded = rails.find((r) => r.network.includes("already holds"))!;
    const fresh = rails.find((r) => r.network.includes("never held"))!;
    expect(funded.feeNative).toBe(`${((65_000 * 100 + 345 * 1000) / 1e6).toFixed(2)} TRX`);
    expect(fresh.feeUsd).toBeCloseTo(((130_000 * 100 + 345 * 1000) / 1e6) * 0.3, 6);
    expect(rails.map((r) => r.feeUsd)).toEqual([...rails.map((r) => r.feeUsd)].sort((a, b) => a - b));
    expect(rails[0].rail).toBe("LTC");
  });
});
