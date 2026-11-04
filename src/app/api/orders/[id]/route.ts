import { NextResponse } from "next/server";
import { expireOrders, getOrder } from "@/lib/orders";
import { orderView } from "../../order-view";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{16}$/.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  expireOrders();
  const order = getOrder(id);
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(orderView(order));
}
