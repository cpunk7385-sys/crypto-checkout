import type { Metadata } from "next";
import { enabledCurrencies } from "@/lib/orders";
import { productById } from "@/lib/products";
import { Checkout } from "@/components/Checkout";

export const metadata: Metadata = { title: "Demo order" };
export const dynamic = "force-dynamic";

export default function DemoPage() {
  const p = productById("demo")!;
  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Try it with a real $1 order</h1>
        <p className="mt-3 text-muted">
          This is the exact flow your customers would see. Pick a currency, send the amount, and watch the page flip to
          &quot;paid&quot; with a license key. Payments go to this site&apos;s wallets (the $1 is a tip for running the
          demo).
        </p>
        <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm text-muted">
          <li>USDT: send the exact unique amount to the shared address. Matched by amount within 60 minutes.</li>
          <li>BTC / LTC: a fresh address is derived from the xpub for this order. Any amount above the minimum counts.</li>
          <li>The watcher polls every 20 seconds. USDT counts once TRON confirms it (about a minute); BTC and LTC are delivered after 1 confirmation, and the page shows when the payment has been seen.</li>
        </ol>
      </div>
      <Checkout product={p.id} priceUsd={p.priceUsd} currencies={enabledCurrencies()} />
    </div>
  );
}
