import type { Metadata } from "next";
import Link from "next/link";
import { Article, Code, H2 } from "../Article";

export const metadata: Metadata = {
  title: "How to accept USDT (TRC-20) on your website without a payment processor",
  description:
    "Accept USDT on TRON directly to your own wallet: how to recognise which order a payment belongs to, what a transfer really costs, how to handle exchange withdrawals, late payments and frozen addresses. With code.",
};

export default function Page() {
  return (
    <Article
      title="How to accept USDT (TRC-20) on your website without a payment processor"
      lede="You don't need a gateway to take USDT. You need a TRON address you control, a way to tell which order a transfer belongs to, and a handful of rules for the cases that go wrong. Here is all of it."
      updated="2026-11-05"
    >
      <H2>Why people skip the processor</H2>
      <p>
        Hosted crypto gateways charge 0.5–1% per payment, hold your funds until payout, and usually want a merchant
        account with KYC. If your customers already pay in USDT, and many in markets without Stripe or PayPal do, the
        processor adds cost and an account that can be closed without adding anything you can&apos;t do yourself. A TRC-20
        USDT transfer settles in about a minute and costs the sender a fixed amount of TRX, not a percentage.
      </p>

      <H2>The core problem: which order is this payment for?</H2>
      <p>
        On TRON, a USDT transfer carries a sender, a recipient and an amount. There is no memo field your customer will
        reliably fill in. With one receiving address, the only signal you control is the <strong>amount</strong>. So give
        every order a unique one: for a $12 product, ask for <code>12.0371</code> USDT on one order and{" "}
        <code>12.4410</code> on the next.
      </p>
      <Code>{`// 9,900 possible amounts per price point; never hand out one that is pending,
// or that expired in the last 24 hours (a late payer may still send it)
const base = Math.round(priceUsd * 1_000_000);          // USDT has 6 decimals
const candidate = base + randomInt(100, 10_000) * 100;   // 12.0100 … 12.9999`}</Code>
      <p>
        Then poll TronGrid for confirmed incoming transfers of the USDT contract
        (<code>TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t</code>) to your address and match by exact amount:
      </p>
      <Code>{`GET https://api.trongrid.io/v1/accounts/{address}/transactions/trc20
    ?only_to=true&only_confirmed=true
    &contract_address=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
    &min_timestamp={watermark}&order_by=block_timestamp,asc&limit=100`}</Code>
      <p>
        Two details that are easy to get wrong. First, TronGrid returns the newest transfers first by default; ask for{" "}
        <code>block_timestamp,asc</code> and keep a watermark of the last transfer you processed, or a burst of more than
        100 transfers will silently skip the oldest. Second, keep polling even when no order is pending, or a payment
        that arrives after its order expired will never be seen.
      </p>
      <p>
        The alternative, one fresh TRON address per order, removes the matching problem but means activating each address
        (about 1 TRX) and sweeping funds out of each one, which costs energy every time. For small shops the unique-amount
        approach is simpler and cheaper.
      </p>

      <H2>What a transfer actually costs your customer</H2>
      <p>
        A TRC-20 transfer burns about <strong>65,000 energy</strong> when the recipient already holds USDT, and about{" "}
        <strong>130,000</strong> when it has never held any. Unless the sender has staked TRX for energy, it is paid in
        TRX at the network&apos;s current energy price, which puts it at roughly $2 and $4. Two practical consequences:
        receive into an address that already holds a little USDT, and don&apos;t sell anything under a few dollars in
        USDT. Our <Link href="/tools/fees" className="text-accent hover:underline">live fee comparer</Link> shows today&apos;s
        numbers next to Litecoin and Bitcoin, and the{" "}
        <Link href="/tools/tron-address" className="text-accent hover:underline">address checker</Link> tells you whether
        an address is in the cheap or the expensive case.
      </p>

      <H2>The cases that go wrong, and what to do</H2>
      <ul className="list-disc space-y-3 pl-5">
        <li>
          <strong>Exchange withdrawals that deduct the fee from the amount.</strong> The customer asks to send 12.0371 and
          you receive 11.0371. It won&apos;t match. Say on the checkout page that the amount must arrive exactly, and keep
          every unmatched transfer in a queue you can assign to an order by hand.
        </li>
        <li>
          <strong>Late payments.</strong> Exchanges batch withdrawals; a payment can land an hour after your order expired.
          Record it as unmatched (don&apos;t ignore it), and don&apos;t reissue that amount to a new order for a day.
        </li>
        <li>
          <strong>Paying twice.</strong> Mark each transaction id as processed. The second identical transfer should land
          in the unmatched queue, not be silently dropped and not deliver twice.
        </li>
        <li>
          <strong>Freezes.</strong> Tether can blacklist addresses, and blacklisted USDT can&apos;t be moved. In 2025 it
          froze thousands of TRON addresses, mostly for receiving stolen funds. Keep your operating balance small and sweep
          to a separate address regularly.
        </li>
        <li>
          <strong>Address poisoning.</strong> Scammers send dust from addresses that share the first and last characters of
          yours, hoping you copy the wrong one later. Never copy your own receiving address from transaction history.
        </li>
      </ul>

      <H2>Security checklist</H2>
      <ul className="list-disc space-y-2 pl-5">
        <li>The server needs only your public address. No private key belongs on it.</li>
        <li>Rate-limit order creation, or someone can exhaust your 9,900 unique amounts with a script.</li>
        <li>Generate license keys and download tokens with a cryptographic RNG, at least 80 bits.</li>
        <li>If you notify your backend by webhook, sign the timestamp and body together and reject old timestamps.</li>
      </ul>
    </Article>
  );
}
