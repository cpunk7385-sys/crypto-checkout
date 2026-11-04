import { NextResponse } from "next/server";
import { inspectTronAddress } from "@/lib/tron-address";
import { recordEvent } from "@/lib/stats";
import { clientIp, rateLimiter } from "@/lib/guard";

const allow = rateLimiter(20, 60_000);
const CACHE_MS = 5 * 60_000;
const cache = new Map<string, { at: number; info: Awaited<ReturnType<typeof inspectTronAddress>> }>();

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const addr = new URL(req.url).searchParams.get("address")?.trim() ?? "";
  if (!addr || addr.length > 40) return NextResponse.json({ error: "address required" }, { status: 400 });
  const hit = cache.get(addr);
  if (hit && Date.now() - hit.at < CACHE_MS) return NextResponse.json(hit.info);
  if (!allow(clientIp(req))) return NextResponse.json({ error: "too many lookups, try again in a minute" }, { status: 429 });
  try {
    const info = await inspectTronAddress(addr);
    if (cache.size > 5_000) cache.clear();
    cache.set(addr, { at: Date.now(), info });
    recordEvent("tool_tron_address", info.valid ? "valid" : "invalid");
    return NextResponse.json(info);
  } catch (e) {
    console.error("[tron-address]", e);
    return NextResponse.json({ error: "lookup failed" }, { status: 503 });
  }
}
