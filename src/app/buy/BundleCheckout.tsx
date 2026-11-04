"use client";

import { Checkout } from "@/components/Checkout";

export function BundleCheckout(props: { product: string; priceUsd: number; currencies: ("USDT" | "BTC" | "LTC")[] }) {
  return (
    <Checkout
      {...props}
      renderDeliverable={(d) => (
        <p>
          Your download link (valid 7 days, 20 downloads; save the file):{" "}
          <a href={d} className="text-accent underline">{d}</a>
        </p>
      )}
    />
  );
}
