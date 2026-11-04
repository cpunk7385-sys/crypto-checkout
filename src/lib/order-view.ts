import type { Order } from "./orders";
import { COIN_DECIMALS, coinUri, formatUnits } from "./chains";

export function orderView(o: Order) {
  const decimals = o.currency === "USDT" ? 6 : COIN_DECIMALS;
  const amount = formatUnits(o.amount_units, decimals);
  const minAmount = formatUnits(o.min_units, decimals);
  const uri = o.currency === "USDT" ? o.address : `${coinUri(o.currency)}:${o.address}?amount=${amount}`;
  return {
    id: o.id,
    product: o.product,
    currency: o.currency,
    amount,
    minAmount,
    address: o.address,
    uri,
    status: o.status,
    expiresAt: o.expires_at,
    deliverable: o.status === "paid" ? o.deliverable : null,
  };
}

export type OrderView = ReturnType<typeof orderView>;
