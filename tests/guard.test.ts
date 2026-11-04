import { afterEach, describe, expect, it, vi } from "vitest";
import { clientIp, rateLimiter, secretEquals } from "@/lib/guard";

afterEach(() => {
  vi.useRealTimers();
});

describe("rateLimiter", () => {
  it("allows the limit within a window, then refuses until the window resets", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(0);
    const allow = rateLimiter(3, 60_000);
    expect([allow("a"), allow("a"), allow("a"), allow("a")]).toEqual([true, true, true, false]);
    expect(allow("b")).toBe(true);
    vi.setSystemTime(60_001);
    expect(allow("a")).toBe(true);
  });
});

describe("rateLimiter when its table is full", () => {
  it("evicts the oldest client instead of refusing everyone", async () => {
    const allow = rateLimiter(1, 60_000);
    for (let i = 0; i < 20_000; i++) allow(`ip-${i}`);
    expect(allow("newcomer")).toBe(true);
    expect(allow("ip-19999")).toBe(false);
  });
});

describe("secretEquals", () => {
  it("matches only the exact configured secret", () => {
    expect(secretEquals("s3cret", "s3cret")).toBe(true);
    expect(secretEquals("s3cre", "s3cret")).toBe(false);
    expect(secretEquals("S3cret", "s3cret")).toBe(false);
    expect(secretEquals(null, "s3cret")).toBe(false);
  });

  it("refuses everything when no secret is configured", () => {
    expect(secretEquals("", undefined)).toBe(false);
    expect(secretEquals("", "")).toBe(false);
  });
});

describe("clientIp", () => {
  it("uses the first X-Forwarded-For entry set by the proxy", () => {
    expect(clientIp(new Request("http://x", { headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.2" } }))).toBe("203.0.113.7");
    expect(clientIp(new Request("http://x"))).toBe("unknown");
  });
});
