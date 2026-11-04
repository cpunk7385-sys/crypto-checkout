import { NextResponse } from "next/server";
import { recordHit } from "@/lib/stats";
import { clientIp, rateLimiter } from "@/lib/guard";

const allow = rateLimiter(120, 60_000);
const PATH_RE = /^\/[A-Za-z0-9\-._~/]{0,119}$/;

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
  if (typeof body.p !== "string" || !PATH_RE.test(body.p) || !allow(clientIp(req))) return new NextResponse(null, { status: 204 });
  const ref = refDomain(body.r ?? "");
  const self = new URL(req.url).hostname.replace(/^www\./, "");
  recordHit(body.p, ref === self ? "" : ref, !!body.n);
  return new NextResponse(null, { status: 204 });
}
