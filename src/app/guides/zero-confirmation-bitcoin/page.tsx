import type { Metadata } from "next";
import Link from "next/link";
import { Article, H2 } from "../Article";

export const metadata: Metadata = {
  title: "Zero-confirmation Bitcoin payments are no longer safe for merchants",
  description:
    "Why delivering goods on an unconfirmed Bitcoin transaction stopped being a reasonable risk once full-RBF became the default, what it costs an attacker, and what to do instead for digital goods.",
};

export default function Page() {
  return (
    <Article
      title="Zero-confirmation Bitcoin payments are no longer safe for merchants"
      lede="For years, small online shops delivered digital goods the moment a Bitcoin payment appeared in the mempool. That shortcut now costs an attacker a few cents to defeat. Here is why, and what to do instead."
      updated="2026-11-05"
    >
      <H2>What zero-conf meant</H2>
      <p>
        A Bitcoin transaction is broadcast first and included in a block later, on average about ten minutes later and
        sometimes much longer. Waiting for that first confirmation is a poor checkout experience, so many merchants
        delivered as soon as the transaction was seen. The bet was that replacing an unconfirmed transaction with a
        different one, a double-spend, was hard: most nodes would keep the first version they saw.
      </p>

      <H2>What changed</H2>
      <p>
        Replace-by-fee (RBF) lets a sender rebroadcast a transaction with a higher fee. Originally a transaction had to opt
        in by signalling it, and a merchant could refuse those. With <strong>full-RBF</strong>, nodes accept a
        higher-fee replacement whether or not the original signalled. Bitcoin Core made full-RBF the default in version 28
        (2024), and most of the network and mining pools now behave that way.
      </p>
      <p>
        The attack is now simple: pay at a very low fee rate, wait for the shop to deliver, then broadcast a replacement
        that pays the same coins back to yourself at a slightly higher fee. Miners take the replacement because it pays
        them more. The cost is the fee difference, typically cents. A license key or download link, once delivered, is
        gone.
      </p>

      <H2>Is it still OK for small amounts?</H2>
      <p>
        It used to be argued that nobody bothers for a $10 item. That only holds until a script exists, and the script is
        a few lines. The economics no longer depend on the amount: the attack costs the same for $10 as for $1,000. For
        digital goods with no way to claw them back, the safe default is <strong>one confirmation</strong>.
      </p>

      <H2>Making one confirmation feel fast</H2>
      <ul className="list-disc space-y-3 pl-5">
        <li>
          <strong>Show that you&apos;ve seen the payment.</strong> As soon as the transaction appears unconfirmed, switch the
          checkout to &ldquo;payment seen, waiting for 1 confirmation&rdquo;. Buyers mind waiting much less once they know
          the money arrived.
        </li>
        <li>
          <strong>Don&apos;t let the order expire while it confirms.</strong> If your orders expire after an hour, extend the
          expiry the moment you see the payment; a low-fee transaction can take hours.
        </li>
        <li>
          <strong>Offer Litecoin.</strong> Blocks every 2.5 minutes means one confirmation usually arrives before the buyer
          has closed the wallet app, and fees are a fraction of a cent. Our{" "}
          <Link href="/tools/fees" className="text-accent hover:underline">fee comparer</Link> shows the difference live.
        </li>
        <li>
          <strong>Offer USDT on TRON.</strong> TRON confirms in about a minute; the trade-off is a fixed ~$2 fee for the
          sender (see the <Link href="/guides/accept-usdt-trc20-without-processor" className="text-accent hover:underline">USDT guide</Link>).
        </li>
        <li>
          <strong>Use Lightning if you can run it.</strong> It settles instantly and safely, but needs a node and channel
          liquidity, which is a different operational commitment.
        </li>
      </ul>

      <H2>What we do</H2>
      <p>
        Crypto Checkout used to deliver Bitcoin and Litecoin payments on first sight. We changed that after a security
        review: orders now need one confirmation, the checkout shows the seen state, and a seen order stays open for 24
        hours. It costs buyers a few minutes and removes a free double-spend.
      </p>
    </Article>
  );
}
