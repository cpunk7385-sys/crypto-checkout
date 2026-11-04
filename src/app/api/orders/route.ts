import { NextResponse } from "next/server";
import { createOrder, enabledCurrencies } from "@/lib/orders";
import type { Currency } from "@/lib/chains";
import { productAvailable, productById } from "@/lib/products";
import { recordEvent } from "@/lib/stats";
import { orderView } from "@/lib/order-view";
import { clientIp, rateLimiter } from "@/lib/guard";

const allow = rateLimiter(10, 10 * 60_000);

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ currencies: enabledCurrencies() });
}

export async function POST(req: Request) {
  if (!allow(clientIp(req))) return NextResponse.json({ error: "Too many orders from this address; try again in a few minutes." }, { status: 429 });
  const body = (await req.json().catch(() => ({}))) as { product?: string; currency?: string };
  const product = productById(body.product ?? "");
  if (!product || !productAvailable(product)) return NextResponse.json({ error: "unknown product" }, { status: 400 });
  const currency = (body.currency ?? "USDT").toUpperCase() as Currency;
  if (!enabledCurrencies().includes(currency)) return NextResponse.json({ error: `${currency} is not available` }, { status: 400 });
  try {
    const order = await createOrder(product, currency);
    recordEvent("order_created", `${product.id}/${currency}`);
    return NextResponse.json(orderView(order));
  } catch (e) {
    console.error("[orders] create failed:", e);
    return NextResponse.json({ error: "Could not create order" }, { status: 503 });
  }
}
