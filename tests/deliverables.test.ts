import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { freshApp } from "./helpers";

afterEach(() => {
  vi.useRealTimers();
});

describe("license keys", () => {
  it("validates a key only once its order is paid", async () => {
    const app = await freshApp({ LICENSE_PREFIX: "RD" });
    const demo = app.productById("demo")!;
    const o = await app.createOrder(demo, "USDT");
    const paid = app.markPaid(o.id, "tx-1")!;
    expect(paid.deliverable).toMatch(/^RD-/);
    expect(app.isLicenseValid(paid.deliverable!)).toBe(true);
    expect(app.isLicenseValid("RD-AAAA-BBBB-CCCC-DDDD")).toBe(false);
  });

  it("scopes a key to the product it was bought for when a product is given", async () => {
    const app = await freshApp();
    const o = await app.createOrder(app.productById("demo")!, "USDT");
    const key = app.markPaid(o.id, "tx-1")!.deliverable!;
    expect(app.isLicenseValid(key, "demo")).toBe(true);
    expect(app.isLicenseValid(key, "storefront")).toBe(false);
  });

  it("rejects malformed keys without touching the database", async () => {
    const app = await freshApp();
    for (const k of ["", "cc-aaaa-bbbb-cccc-dddd", "CC-AAAA-BBBB-CCCC", "CC-AAAA-BBBB-CCCC-DDDD' OR 1=1--", "CC-0000-1111-OOOO-IIII"]) {
      expect(app.isLicenseValid(k)).toBe(false);
    }
  });

  it("uses only unambiguous characters", async () => {
    const app = await freshApp();
    for (let i = 0; i < 200; i++) expect(app.licenseKey("X")).not.toMatch(/[01IO]/);
  });
});

describe("downloads", () => {
  async function paidDownload() {
    const app = await freshApp();
    const product = app.productById("storefront")!;
    expect(product.deliver.type).toBe("download");
    mkdirSync(app.filesDir(), { recursive: true });
    writeFileSync(path.join(app.filesDir(), (product.deliver as { file: string }).file), "zip");
    const o = await app.createOrder(product, "USDT");
    const paid = app.markPaid(o.id, "tx-1")!;
    const token = paid.deliverable!.replace("/api/download/", "");
    return { app, token };
  }

  it("serves a paid download up to 20 times", async () => {
    const { app, token } = await paidDownload();
    for (let i = 0; i < 20; i++) expect(app.takeDownload(token)).toEqual({ file: "crypto-checkout-storefront.zip" });
    expect(app.takeDownload(token)).toBeNull();
  });

  it("stops serving the link after 7 days", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-05T00:00:00Z"));
    const { app, token } = await paidDownload();
    vi.setSystemTime(new Date("2026-11-12T00:00:01Z"));
    expect(app.takeDownload(token)).toBeNull();
  });

  it("knows nothing about unknown tokens", async () => {
    const app = await freshApp();
    expect(app.takeDownload("0".repeat(32))).toBeNull();
  });
});
