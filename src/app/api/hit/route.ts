import { NextResponse } from "next/server";
import { recordHit } from "@/lib/stats";

export const dynamic = "force-dynamic";

function refDomain(r: string): string {
  try {
    const u = new URL(r);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { p?: string; r?: string; n?: boolean };
  if (typeof body.p !== "string" || !body.p.startsWith("/")) return new NextResponse(null, { status: 204 });
  const ref = refDomain(body.r ?? "");
  const self = new URL(req.url).hostname.replace(/^www\./, "");
  recordHit(body.p, ref === self ? "" : ref, !!body.n);
  return new NextResponse(null, { status: 204 });
}
