# The payment core, and its other two copies

The modules in `src/lib` that take money were not written here. They were copied from a private
repository that sells a single licence key, and a third copy of them runs in a private storefront
downstream of this one:

| copy | visibility | role |
|---|---|---|
| the private upstream | private | origin of the code; sells one thing, a licence key |
| `crypto-checkout` (this one) | public, MIT | a generalised copy: arbitrary products, three delivery types, signed webhooks |
| the private storefront | private | a third copy, downstream of this one |

There is no shared package. That was considered and deferred; see
[ADR 0001](adr/0001-keep-the-payment-core-duplicated.md) for why and for what would have to be
decided before it changes. Until then the copies are kept honest by hand, and this document is
the record of what is the same and what is not.

## Module by module

State as of 4 Nov 2026.

### Keep byte-identical

A change to one of these must be applied to all three copies, unchanged. A `diff` between the
copies should stay empty.

| module | what it owns |
|---|---|
| `chains.ts` | BIP84 address derivation, Esplora `receivedUnits`, `formatUnits`, the BTC/LTC network table |
| `tron.ts` | the USDT TRC-20 contract address and the TronGrid transfer query |
| `stats.ts` | `recordHit`, `recordEvent`, `summary` |
| `storage.ts` | the `useSyncExternalStore` localStorage hook |

### Diverged on purpose

A change to one of these has to be re-expressed, not copied.

| module | the divergence |
|---|---|
| `prices.ts` | the upstream prices BTC and LTC only, via `coinUsdPrice(coin)`. Here that is generalised to `usdPrice(asset)` over a `PricedAsset` union that also covers TRX and USDT, with `coinUsdPrice` kept as a shim. Both share the same 5-minute cache and the same stale-cache-on-error fallback. |
| the order store | the upstream mints a licence key into an `orders.license_key` column and has one fixed key format. Here that is `orders.product` plus a generic `orders.deliverable`, a `downloads` table with expiring tokens, a `LICENSE_PREFIX` env var and a looser key regex. `createOrder` takes a `Product` because the price belongs to the Product, not to an env var; `markPaid` returns the whole `Order` rather than a key. |
| `order-view.ts` | the same projection either side, but the paid Order discloses `deliverable` here and a licence key upstream, and this one carries `product`. |
| `watcher.ts` | this copy adds an HMAC-signed `WEBHOOK_URL` notification on payment and makes the poll interval and order TTL env-tunable. Both copies have the per-currency polling `Source` and its backoff. |

### Only in this copy

`products.ts` (the product catalogue and delivery types), `deliverables.ts` (what a paid Order
hands over), `fees.ts` (per-rail fee estimates), `tron-address.ts` (base58 validation of a TRON
address), `site.ts`. The upstream needs none of them.

## The shape the three copies share

Three seams, no barrel:

| module | owns |
|---|---|
| `src/lib/sqlite.ts` | the connection, the WAL pragma, **every** `CREATE TABLE`, and the additive `migrate()`. Exports `db` only. |
| `src/lib/orders.ts` | the `Order` type, `usdtAddress`, `enabledCurrencies`, `createOrder`, `getOrder`, `expireOrders`, `pendingOrders`, `isTxProcessed`, `recordTx`, `markPaid` |
| `src/lib/deliverables.ts` | `licenseKey()`, `isLicenseValid()`, `fulfill()`, `takeDownload()`. The upstream's equivalent is narrower and is called `licenses.ts`. |

`orders.ts` imports `fulfill` from `deliverables.ts` and passes it an order id and a product id,
never an `Order`; `deliverables.ts` therefore has no dependency on `orders.ts` and there is no
cycle.

The `hits` and `events` DDL lives in `sqlite.ts`, not in `stats.ts`, so the schema no longer
depends on which module gets imported first. `stats.ts` only queries.

`chains.ts` was deliberately **not** touched when the store was split, even though `usdtAddress`
and `enabledCurrencies` arguably belong with the currency notion. Keeping it byte-identical
across three copies is worth more than that tidiness.

`src/lib/order-view.ts` is the Order's public shape -- unit formatting, the BIP21 URI, and the
rule that the deliverable is disclosed only once the Order is paid. It belongs beside the Order,
not in `src/app/api`.

The watcher's `pollOnce()` polls each enabled currency as a `Source`: a poll closure, a
consecutive-failure count and a `nextAt`, held in a module-level `Map` and polled inside its own
`try`/`catch`. Backoff is `POLL_MS * 2 ** failures` capped at 5 minutes, reset on the first
success. `pollCoin` reports failure to its source only when **every** pending address in the
batch failed, which is what tells a dead explorer from a dead address. `expireOrders()` runs
every tick regardless of any backoff. `429` and `Retry-After` are deliberately not special-cased:
honouring them would mean surfacing the HTTP status out of `chains.ts` and `tron.ts`, and that
divergence costs more than the nuance is worth.

## Rules for the next change

1. Touching a byte-identical module? Apply it to all three copies and keep the `diff` empty.
2. Touching a diverged module? Read the divergence row above first, then re-express the change.
3. Widening a divergence on purpose? Add a row here in the same commit.
4. Never copy an env var name across copies without checking it. This repo's are `USDT_ADDRESS`,
   `BTC_XPUB`, `LTC_XPUB`, `TRONGRID_API_KEY`, `ORDER_TTL_MINUTES`, `POLL_SECONDS`,
   `LICENSE_PREFIX`, `WEBHOOK_URL`, `WEBHOOK_SECRET`, `STATS_KEY`, `DATA_DIR` and the
   `NEXT_PUBLIC_*` ones in `.env.example`. The private copies have their own, and theirs never
   travel here.
5. This repo is public and MIT; the other two are private. Nothing specific to them -- their
   domain, their prices, their licence prefix, their repository names -- travels outward.
