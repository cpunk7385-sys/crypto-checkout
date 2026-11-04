import { NextResponse } from "next/server";
import { summary } from "@/lib/stats";
import { secretEquals } from "@/lib/guard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const given = req.headers.get("x-stats-key") ?? url.searchParams.get("key");
  if (!secretEquals(given, process.env.STATS_KEY)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days") ?? 14)));
  return NextResponse.json(summary(days));
}
