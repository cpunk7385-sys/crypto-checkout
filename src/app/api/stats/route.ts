import { NextResponse } from "next/server";
import { summary } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = process.env.STATS_KEY;
  if (!key || url.searchParams.get("key") !== key) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days") ?? 14)));
  return NextResponse.json(summary(days));
}
