# Glossary

The words this codebase uses for its own domain. A module named after one of these concepts
should use the word exactly; a new concept gets a row here before it gets a module.

## What is sold

**Product** — one thing on sale: an id, a title, a price in USD, and how it is delivered.
Declared in `src/lib/products.ts`; there is no catalogue in the database.

**Delivery type** — how a Product is handed over: a `license`, a `download` of a file from
`$DATA_DIR/files`, or a `text`. The three cases of `Deliver`.

**Deliverable** — what a buyer actually receives once their Order is paid: a licence key, a
download link, or the text. One string, stored in `orders.deliverable` and disclosed only after
payment. `src/lib/deliverables.ts`.

**License** — the `PREFIX-XXXX-XXXX-XXXX-XXXX` key minted for a Product with the `license`
delivery type. The prefix is `LICENSE_PREFIX`. It is the whole of what such a buyer gets; there
are no accounts.

**Download token** — the 32-hex token behind a download link. Expires after 7 days or 20
downloads, whichever comes first; rows live in the `downloads` table.

## Taking the money

**Order** — one attempt to pay for a Product: a currency, an amount, an address, a 60-minute
life (`ORDER_TTL_MINUTES`), and a terminal state of `paid` or `expired`. `src/lib/orders.ts`.

**Currency** — what an Order can be paid in: `USDT` on TRON, or a **Coin** (`BTC`, `LTC`) whose
address is derived per Order from an account xpub. `src/lib/chains.ts`.

**Unique amount** — the USDT matching rule. Every pending USDT Order gets a distinct amount, and
a transfer to the one shared address is matched to an Order by that amount.

**Source** (watcher) — one currency's view of the world outside: a poll against one explorer,
with its own consecutive-failure count and backoff. `src/lib/watcher.ts`.

**Payment core** — the modules that take money, shared with two private sibling copies. See
`docs/PAYMENT-CORE.md`.

## The free tools

**Rail** — one way to move value, as the fee comparison names them: USDT on TRON to a funded or
to a fresh address, Litecoin on-chain, Bitcoin on-chain. `src/lib/fees.ts`.
