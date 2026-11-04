import { NextResponse } from "next/server";
import { isLicenseValid } from "@/lib/deliverables";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { key?: string };
  const key = typeof body.key === "string" ? body.key.trim().toUpperCase() : "";
  return NextResponse.json({ valid: isLicenseValid(key) });
}
