import { NextResponse } from "next/server";
import { PRODUCTS, publicProduct } from "@/lib/products";
import { enabledCurrencies } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ products: PRODUCTS.map(publicProduct), currencies: enabledCurrencies() });
}
