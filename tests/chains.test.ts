import { describe, expect, it, vi } from "vitest";
import { accountXpub, json, mockFetch } from "./helpers";

async function chains(env: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return import("@/lib/chains");
}

describe("deriveAddress", () => {
  it("matches the BIP84 reference vectors for the first two receive addresses", async () => {
    const { deriveAddress } = await chains({ BTC_XPUB: accountXpub(0) });
    expect(deriveAddress("BTC", 0)).toBe("bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu");
    expect(deriveAddress("BTC", 1)).toBe("bc1qnjg0jd8228aq7egyzacy8cys3knf9xvrerkf9g");
  });

  it("produces litecoin bech32 addresses that differ per index", async () => {
    const { deriveAddress } = await chains({ LTC_XPUB: accountXpub(2) });
    const a = deriveAddress("LTC", 0);
    const b = deriveAddress("LTC", 1);
    expect(a).toMatch(/^ltc1q[02-9ac-hj-np-z]{38}$/);
    expect(b).toMatch(/^ltc1q/);
    expect(a).not.toBe(b);
  });

  it("refuses to derive when the coin has no xpub configured", async () => {
    const { deriveAddress, coinEnabled } = await chains({ BTC_XPUB: "" });
    expect(coinEnabled("BTC")).toBe(false);
    expect(() => deriveAddress("BTC", 0)).toThrow("BTC not configured");
  });
});

describe("receivedUnits", () => {
  const ADDR = "bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu";

  it("separates confirmed from unconfirmed value and reports the first confirming txid", async () => {
    const { receivedUnits } = await chains({});
    mockFetch([
      {
        match: (u) => u.endsWith(`/address/${ADDR}/txs`),
        respond: () =>
          json([
            { txid: "aa", status: { confirmed: false }, vout: [{ scriptpubkey_address: ADDR, value: 10_000 }, { scriptpubkey_address: "bc1qother", value: 99_999 }] },
            { txid: "bb", status: { confirmed: true }, vout: [{ scriptpubkey_address: ADDR, value: 2_500 }] },
          ]),
      },
    ]);
    await expect(receivedUnits("BTC", ADDR)).resolves.toEqual({ confirmed: 2_500, unconfirmed: 10_000, txid: "bb", txids: ["bb"] });
  });

  it("reports nothing for an unused address", async () => {
    const { receivedUnits } = await chains({});
    mockFetch([{ match: () => true, respond: () => json([]) }]);
    await expect(receivedUnits("BTC", ADDR)).resolves.toEqual({ confirmed: 0, unconfirmed: 0, txid: null, txids: [] });
  });

  it("throws when the explorer answers with an error status", async () => {
    const { receivedUnits } = await chains({});
    mockFetch([{ match: () => true, respond: () => json({ error: "rate limited" }, 429) }]);
    await expect(receivedUnits("LTC", "ltc1qxyz")).rejects.toThrow("LTC explorer 429");
  });

  it("falls back to a second Bitcoin explorer when the first is down", async () => {
    const { receivedUnits } = await chains({});
    mockFetch([
      { match: (u) => u.startsWith("https://mempool.space/"), respond: () => Promise.reject(new TypeError("fetch failed")) },
      {
        match: (u) => u.startsWith("https://blockstream.info/"),
        respond: () => json([{ txid: "cc", status: { confirmed: true }, vout: [{ scriptpubkey_address: ADDR, value: 777 }] }]),
      },
    ]);
    await expect(receivedUnits("BTC", ADDR)).resolves.toEqual({ confirmed: 777, unconfirmed: 0, txid: "cc", txids: ["cc"] });
  });

  it("reports the last explorer's error when every Bitcoin explorer fails", async () => {
    const { receivedUnits } = await chains({});
    mockFetch([
      { match: (u) => u.startsWith("https://mempool.space/"), respond: () => json({}, 503) },
      { match: (u) => u.startsWith("https://blockstream.info/"), respond: () => json({}, 429) },
    ]);
    await expect(receivedUnits("BTC", ADDR)).rejects.toThrow("BTC explorer 429");
  });
});

describe("formatUnits", () => {
  it.each([
    [0, 8, "0"],
    [1, 8, "0.00000001"],
    [100_000_000, 8, "1"],
    [15_365, 8, "0.00015365"],
    [12_037_100, 6, "12.0371"],
    [12_000_000, 6, "12"],
  ])("formats %i with %i decimals as %s", async (units, decimals, expected) => {
    const { formatUnits } = await chains({});
    expect(formatUnits(units, decimals)).toBe(expected);
  });
});
