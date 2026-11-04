import type { Metadata } from "next";
import { enabledCurrencies } from "@/lib/db";
import { productAvailable, productById } from "@/lib/products";
import { BundleCheckout } from "./BundleCheckout";

export const metadata: Metadata = { title: "Storefront bundle" };
export const dynamic = "force-dynamic";

export default function BuyPage() {
  const p = productById("storefront")!;
  const available = productAvailable(p);
  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Storefront bundle</h1>
        <p className="mt-2 text-xl">${p.priceUsd} <span className="text-base text-muted">one-time, source included, MIT</span></p>
        <p className="mt-4 text-muted">{p.description}</p>
        <ul className="mt-5 space-y-2 text-sm">
          <li>✓ Product catalog with per-product pages and delivery types</li>
          <li>✓ Expiring download links with download limits</li>
          <li>✓ Admin dashboard: orders, revenue by currency, unmatched payments to resolve</li>
          <li>✓ Email receipts over SMTP, Telegram notifications on payment</li>
          <li>✓ Traefik compose with Let&apos;s Encrypt, backup script, step-by-step setup guide</li>
          <li>✓ Updates for a year, delivered to the same download link</li>
        </ul>
        <p className="mt-6 text-sm text-muted">
          Want it running on your server instead? $99 includes the bundle and installation within 48 hours on a VPS you
          give access to. Email <a className="text-accent" href="mailto:cpunk7385@gmail.com">cpunk7385@gmail.com</a> with your
          stack.
        </p>
      </div>
      {available ? (
        <BundleCheckout product={p.id} priceUsd={p.priceUsd} currencies={enabledCurrencies()} />
      ) : (
        <div className="rounded-lg border border-border bg-panel p-6 text-sm text-muted">
          The bundle is being packaged; checkout opens here within days. The free core is already on GitHub.
        </div>
      )}
    </div>
  );
}
