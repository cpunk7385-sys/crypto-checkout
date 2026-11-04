import { NextResponse } from "next/server";
import { compareFees } from "@/lib/fees";

export const dynamic = "force-dynamic";

let cache: { at: number; data: Awaited<ReturnType<typeof compareFees>> } | null = null;

export async function GET() {
  try {
    if (!cache || Date.now() - cache.at > 60_000) cache = { at: Date.now(), data: await compareFees() };
    return NextResponse.json(cache.data);
  } catch (e) {
    console.error("[fees]", e);
    return NextResponse.json({ error: "fee sources unavailable" }, { status: 503 });
  }
}
