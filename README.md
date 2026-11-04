# Crypto Checkout

Accept **USDT (TRC-20), Bitcoin and Litecoin** on your own site with no payment processor, no KYC and no private keys on the server. Self-hosted, one Docker container, MIT.

Live demo with a real $1 order: **https://cryptocheckout.duckdns.org/demo**

## How it works

- **USDT on TRON**: every order gets a unique amount (`12.0371`). The watcher polls TronGrid for transfers to your address and matches the order by amount. One address, no key.
- **BTC / LTC**: every order gets its own bech32 address derived from your BIP84 account xpub. mempool.space / litecoinspace.org are polled; the order is delivered once 1 confirmation covers the amount (1.5% tolerance for wallet rounding). A payment seen unconfirmed marks the order *seen* and extends its expiry by 24 h so it can't expire while confirming. Zero-confirmation delivery was dropped: with full-RBF the default in Bitcoin Core, an unconfirmed payment can be replaced for a few cents after the goods are out.
- **Delivery**: a license key, an expiring download link, a text, or a signed webhook to your own backend. Orders live in SQLite.

Prices are locked at order time from CoinGecko; orders expire after 60 minutes.

## Quick start

```bash
git clone https://github.com/cpunk7385-sys/crypto-checkout && cd crypto-checkout
pnpm install
cp .env.example .env.local      # fill USDT_ADDRESS and/or BTC_XPUB / LTC_XPUB
pnpm dev                        # http://localhost:3000/demo
```

Get an xpub without exposing keys: Sparrow or Electrum → wallet → export the account's extended public key (BIP84, `m/84'/0'/0'` for BTC, `m/84'/2'/0'` for LTC). The server derives `m/84'/coin'/0'/0/<n>` for order `n`.

## Define products

`src/lib/products.ts`:

```ts
{ id: "ebook", title: "My book", description: "...", priceUsd: 9, deliver: { type: "download", file: "book.pdf" } }
{ id: "pro",   title: "Pro license", description: "...", priceUsd: 29, deliver: { type: "license" } }
```

Downloadable files go in `$DATA_DIR/files/`. Then render `<Checkout product="ebook" priceUsd={9} currencies={["USDT","BTC","LTC"]} />` anywhere.

## API

| Route | What |
|---|---|
| `GET /api/products` | products and enabled currencies |
| `POST /api/orders` `{product, currency}` | creates an order: amount, address, URI for a QR |
| `GET /api/orders/:id` | status; `deliverable` once paid |
| `POST /api/license/verify` `{key}` | `{valid}` |
| `GET /api/download/:token` | file download (7 days, 20 downloads) |
| `GET /api/stats?key=` | views, referrers, events, orders |

Webhook: set `WEBHOOK_URL`; on payment the server POSTs `{event: "order.paid", order}` with `x-signature: hex(hmac-sha256(WEBHOOK_SECRET, body))`.

## Deploy

`Dockerfile` builds a standalone image; `deploy/docker-compose.yml` runs it behind Traefik with automatic TLS. Mount a volume at `/data`: it holds the SQLite database (the only record of who paid) and your downloadable files.

## Free tools on the demo site

- `/tools/fees`: live comparison of USDT-TRC20 (funded vs fresh address), LTC and BTC transfer fees.
- `/tools/tron-address`: validate a TRON address, see whether it holds USDT (half the energy fee), poisoning reminder.

## Storefront bundle ($39) and installation ($99)

The core above is complete for a single product. The paid bundle adds a multi-product storefront, download limits, an admin dashboard (orders, revenue, unmatched payments), SMTP receipts, Telegram notifications, Traefik compose with backups and a setup guide: https://cryptocheckout.duckdns.org/buy. Installation on your VPS within 48 hours: email cpunk7385@gmail.com.

## Limits, honestly

- BTC/LTC need 1 confirmation before delivery (about 10 minutes for BTC, 2–3 for LTC). Buyers see "payment seen" in the meantime.
- USDT matching by amount needs the buyer to send exactly; exchanges that deduct fees from the amount break it (the page says so). Unmatched transfers are logged for manual handling.
- No refunds flow: crypto has no chargebacks; you refund by sending from your wallet.
- Tether can freeze USDT addresses; keep operating balances small.

## License

MIT.
