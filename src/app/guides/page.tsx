import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Guides: accepting crypto payments yourself",
  description: "Practical guides for merchants accepting USDT, Bitcoin and Litecoin without a payment processor.",
};

const GUIDES = [
  {
    href: "/guides/accept-usdt-trc20-without-processor",
    title: "How to accept USDT (TRC-20) on your website without a payment processor",
    blurb: "Matching payments to orders, what transfers cost, late and duplicate payments, freezes, poisoning.",
  },
  {
    href: "/guides/zero-confirmation-bitcoin",
    title: "Zero-confirmation Bitcoin payments are no longer safe for merchants",
    blurb: "Full-RBF made unconfirmed double-spends cheap. What to do instead for digital goods.",
  },
];

export default function Guides() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-semibold tracking-tight">Guides</h1>
      <ul className="mt-8 space-y-6">
        {GUIDES.map((g) => (
          <li key={g.href}>
            <Link href={g.href} className="text-lg font-medium hover:text-accent">{g.title}</Link>
            <p className="mt-1 text-sm text-muted">{g.blurb}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
