import { NextResponse } from "next/server";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { takeDownload } from "@/lib/db";
import { filesDir } from "@/lib/products";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{32}$/.test(token)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const d = takeDownload(token);
  if (!d) return NextResponse.json({ error: "link expired or used up" }, { status: 410 });
  const file = path.join(filesDir(), path.basename(d.file));
  if (!existsSync(file)) return NextResponse.json({ error: "file missing" }, { status: 404 });
  const size = statSync(file).size;
  return new NextResponse(Readable.toWeb(createReadStream(file)) as ReadableStream, {
    headers: {
      "content-type": "application/zip",
      "content-length": String(size),
      "content-disposition": `attachment; filename="${path.basename(d.file)}"`,
      "cache-control": "no-store",
    },
  });
}
