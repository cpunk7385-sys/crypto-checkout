import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { freshApp, json, mockFetch, priceRoute, USDT_ADDRESS } from "./helpers";

const USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const demo = { id: "demo", title: "Demo", description: "", priceUsd: 12, deliver: { type: "license" as const } };

function transfer(id: string, value: number, at: number, over: Partial<Record<string, unknown>> = {}) {
  return {
    transaction_id: id,
    token_info: { address: USDT_CONTRACT, decimals: 6 },
    block_timestamp: at,
    from: "TSenderxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    to: USDT_ADDRESS,
    type: "Transfer",
    value: String(value),
    ...over,
  };
}

const tron = (transfers: unknown[] | (() => Response)) => ({
  match: (u: string) => u.includes("api.trongrid.io"),
  respond: () => (typeof transfers === "function" ? transfers() : json({ data: transfers, success: true })),
});

const explorer = (byAddress: Record<string, { txid: string; value: number }[]> | (() => Response)) => ({
  match: (u: string) => u.includes("/address/") && u.endsWith("/txs"),
  respond: (u: string) => {
    if (typeof byAddress === "function") return byAddress();
    const addr = u.split("/address/")[1].replace("/txs", "");
    return json((byAddress[addr] ?? []).map((t) => ({ txid: t.txid, status: { confirmed: false }, vout: [{ scriptpubkey_address: addr, value: t.value }] })));
  },
});

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
});

async function setup(env: Record<string, string> = {}) {
  const app = await freshApp(env);
  const watcher = await import("@/lib/watcher");
  return { ...app, ...watcher };
}

describe("USDT matching", () => {
  it("pays the order whose unique amount arrives and delivers a key", async () => {
    const app = await setup();
    const o = await app.createOrder(demo, "USDT");
    mockFetch([tron([transfer("t1", o.amount_units, o.created_at + 1000)])]);
    await app.pollOnce();
    const after = app.getOrder(o.id)!;
    expect(after.status).toBe("paid");
    expect(after.tx_id).toBe("t1");
    expect(after.deliverable).toMatch(/^CC-/);
  });

  it("leaves the order pending when the amount differs by a single micro-unit", async () => {
    const app = await setup();
    const o = await app.createOrder(demo, "USDT");
    mockFetch([tron([transfer("t1", o.amount_units - 1, o.created_at + 1000)])]);
    await app.pollOnce();
    expect(app.getOrder(o.id)?.status).toBe("pending");
    expect(app.isTxProcessed("t1")).toBe(true);
  });

  it("ignores transfers of other tokens or to other addresses", async () => {
    const app = await setup();
    const o = await app.createOrder(demo, "USDT");
    mockFetch([
      tron([
        transfer("fake-token", o.amount_units, o.created_at + 1000, { token_info: { address: "TFakeUsdtContractxxxxxxxxxxxxxxxxx", decimals: 6 } }),
        transfer("other-to", o.amount_units, o.created_at + 1000, { to: "TOtherxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }),
        transfer("approval", o.amount_units, o.created_at + 1000, { type: "Approval" }),
      ]),
    ]);
    await app.pollOnce();
    expect(app.getOrder(o.id)?.status).toBe("pending");
  });

  it("does not let a transfer from before the order (minus 5 min slack) pay it", async () => {
    const app = await setup();
    const o = await app.createOrder(demo, "USDT");
    mockFetch([tron([transfer("old", o.amount_units, o.created_at - 6 * 60_000)])]);
    await app.pollOnce();
    expect(app.getOrder(o.id)?.status).toBe("pending");
  });

  it("records a second transfer of an already-matched amount instead of re-reading it forever", async () => {
    const app = await setup();
    const o = await app.createOrder(demo, "USDT");
    const transfers = [transfer("first", o.amount_units, o.created_at + 1000), transfer("dup", o.amount_units, o.created_at + 2000)];
    mockFetch([tron(transfers)]);
    await app.pollOnce();
    expect(app.getOrder(o.id)?.tx_id).toBe("first");
    expect(app.isTxProcessed("dup")).toBe(true);
  });

  it("signs the order.paid webhook with HMAC-SHA256 of the exact body", async () => {
    const app = await setup({ WEBHOOK_URL: "https://shop.example/hook", WEBHOOK_SECRET: "s3cret" });
    const o = await app.createOrder(demo, "USDT");
    const calls = mockFetch([
      tron([transfer("t1", o.amount_units, o.created_at + 1000)]),
      { match: (u) => u === "https://shop.example/hook", respond: () => new Response("ok") },
    ]);
    await app.pollOnce();
    const hook = calls.find((c) => c.url === "https://shop.example/hook")!;
    const body = hook.init!.body as string;
    const sig = (hook.init!.headers as Record<string, string>)["x-signature"];
    expect(JSON.parse(body)).toMatchObject({ event: "order.paid", order: { id: o.id, tx_id: "t1" } });
    expect(sig).toBe(createHmac("sha256", "s3cret").update(body).digest("hex"));
  });
});

describe("coin matching", () => {
  async function coinOrder(app: Awaited<ReturnType<typeof setup>>, currency: "BTC" | "LTC") {
    mockFetch([priceRoute({ bitcoin: 80_000, litecoin: 75, tron: 0.3, tether: 1 })]);
    return app.createOrder(demo, currency);
  }

  it("pays a coin order once 98.5% of the amount reaches its address", async () => {
    const app = await setup();
    const o = await coinOrder(app, "BTC");
    mockFetch([explorer({ [o.address]: [{ txid: "b1", value: o.min_units }] })]);
    await app.pollOnce();
    expect(app.getOrder(o.id)?.status).toBe("paid");
  });

  it("keeps waiting while the amount received is below the minimum", async () => {
    const app = await setup();
    const o = await coinOrder(app, "LTC");
    mockFetch([explorer({ [o.address]: [{ txid: "l1", value: o.min_units - 1 }] })]);
    await app.pollOnce();
    expect(app.getOrder(o.id)?.status).toBe("pending");
  });

  it("adds up partial payments to the same address", async () => {
    const app = await setup();
    const o = await coinOrder(app, "BTC");
    const half = Math.ceil(o.amount_units / 2);
    mockFetch([explorer({ [o.address]: [{ txid: "p1", value: half }, { txid: "p2", value: half }] })]);
    await app.pollOnce();
    expect(app.getOrder(o.id)?.status).toBe("paid");
  });
});

describe("resilience", () => {
  it("backs off a failing explorer without blocking the other currencies", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-05T00:00:00Z"));
    const app = await setup();
    const btcOrder = await coinOrder(app);
    const usdtOrder = await app.createOrder(demo, "USDT");
    const calls = mockFetch([
      explorer(() => new Response("busy", { status: 429 })),
      tron([transfer("t1", usdtOrder.amount_units, usdtOrder.created_at + 1000)]),
    ]);

    await app.pollOnce();
    expect(app.getOrder(usdtOrder.id)?.status).toBe("paid");
    expect(app.getOrder(btcOrder.id)?.status).toBe("pending");
    const explorerCalls = () => calls.filter((c) => c.url.includes("/address/")).length;
    const afterFailure = explorerCalls();
    expect(afterFailure).toBeGreaterThan(0);

    await app.pollOnce();
    expect(explorerCalls()).toBe(afterFailure);

    vi.setSystemTime(new Date("2026-11-05T00:01:00Z"));
    await app.pollOnce();
    expect(explorerCalls()).toBeGreaterThan(afterFailure);

    async function coinOrder(a: typeof app) {
      mockFetch([priceRoute({ bitcoin: 80_000, litecoin: 75, tron: 0.3, tether: 1 })]);
      return a.createOrder(demo, "BTC");
    }
  });

  it("keeps polling the other orders of a currency when one address lookup fails", async () => {
    const app = await setup();
    mockFetch([priceRoute({ bitcoin: 80_000, litecoin: 75, tron: 0.3, tether: 1 })]);
    const broken = await app.createOrder(demo, "BTC");
    const ok = await app.createOrder(demo, "BTC");
    mockFetch([
      {
        match: (u) => u.includes(`/address/${broken.address}/`),
        respond: () => new Response("err", { status: 500 }),
      },
      explorer({ [ok.address]: [{ txid: "ok1", value: ok.amount_units }] }),
    ]);
    await app.pollOnce();
    expect(app.getOrder(ok.id)?.status).toBe("paid");
    expect(app.getOrder(broken.id)?.status).toBe("pending");
  });
});
