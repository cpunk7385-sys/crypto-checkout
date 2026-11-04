import Link from "next/link";
import { REPO } from "@/lib/site";

const SNIPPET = `// 1. put your public receive details in .env
USDT_ADDRESS=T...            // TRON address that receives USDT
BTC_XPUB=xpub...             // BIP84 account key, per-order addresses are derived
LTC_XPUB=xpub...

// 2. describe what you sell
{ id: "ebook", title: "My book", priceUsd: 9, deliver: { type: "download", file: "book.pdf" } }

// 3. drop the component on a page
<Checkout product="ebook" priceUsd={9} currencies={["USDT", "BTC", "LTC"]} />`;

export default function Home() {
  return (
    <div className="space-y-16">
      <section className="max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Accept USDT, Bitcoin and Litecoin on your site. <span className="text-accent">No processor, no KYC.</span>
        </h1>
        <p className="mt-4 text-lg text-muted">
          A self-hosted checkout that watches the blockchain for your payment and delivers the product: a license key, a
          file, or a webhook to your own system. Funds go straight to your wallet. The server only ever sees public
          addresses.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/demo" className="rounded-md bg-accent px-5 py-2.5 font-medium text-black">Try a $1 demo order</Link>
          <a href={REPO} className="rounded-md border border-border px-5 py-2.5 hover:bg-panel">Source on GitHub</a>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {[
          ["USDT on TRON", "Each order gets a unique amount (12.0371 USDT). TronGrid is polled for transfers to your address and the order is matched by amount. One address, no key."],
          ["BTC and LTC", "Each order gets its own address derived from your account xpub. mempool.space and litecoinspace are polled; paid on first sight, with a 1.5% tolerance for wallet rounding."],
          ["Delivery", "License keys, expiring download links, or a signed webhook to your backend. SQLite keeps orders; one Docker container runs everything."],
        ].map(([t, d]) => (
          <div key={t} className="rounded-lg border border-border p-5">
            <h2 className="font-semibold">{t}</h2>
            <p className="mt-2 text-sm text-muted">{d}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Three steps</h2>
        <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-panel p-4 text-xs leading-relaxed"><code>{SNIPPET}</code></pre>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold">Open source core (free, MIT)</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-muted">
            <li>USDT TRC-20, BTC and LTC detection</li>
            <li>Unique amounts and xpub address derivation</li>
            <li>License keys, download links, webhooks</li>
            <li>Next.js app with the checkout component</li>
            <li>Dockerfile and GitHub Actions build</li>
          </ul>
        </div>
        <div className="rounded-lg border border-accent/40 p-6">
          <h2 className="text-lg font-semibold">Storefront bundle <span className="ml-2 text-sm font-normal text-muted">$39 one-time</span></h2>
          <ul className="mt-3 space-y-1.5 text-sm text-muted">
            <li>Multi-product storefront with cart-free product pages</li>
            <li>File delivery with expiring links and download limits</li>
            <li>Admin dashboard: orders, revenue, unmatched payments</li>
            <li>Email receipts (SMTP) and Telegram notifications</li>
            <li>Traefik compose with automatic TLS, backups, setup guide</li>
            <li>Need it installed? $99, done within 48 hours</li>
          </ul>
          <Link href="/buy" className="mt-5 inline-block text-sm text-accent hover:underline">Get the bundle →</Link>
        </div>
      </section>

      <section className="text-sm text-muted">
        <h2 className="text-lg font-semibold text-foreground">Who this is for</h2>
        <p className="mt-2 max-w-3xl">
          Sellers of digital goods, small hosting and proxy providers, Telegram channel operators and developers in
          countries where Stripe and PayPal are unavailable. If your customers already pay in USDT, a card checkout is
          friction; this removes the processor and its 3% and its account reviews. It is not for you if you need fiat
          settlement or chargebacks.
        </p>
      </section>
    </div>
  );
}
