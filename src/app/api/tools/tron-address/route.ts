import { NextResponse } from "next/server";
import { inspectTronAddress } from "@/lib/tron-address";
import { recordEvent } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const addr = new URL(req.url).searchParams.get("address")?.trim() ?? "";
  if (!addr || addr.length > 40) return NextResponse.json({ error: "address required" }, { status: 400 });
  try {
    const info = await inspectTronAddress(addr);
    recordEvent("tool_tron_address", info.valid ? "valid" : "invalid");
    return NextResponse.json(info);
  } catch (e) {
    console.error("[tron-address]", e);
    return NextResponse.json({ error: "lookup failed" }, { status: 503 });
  }
}
