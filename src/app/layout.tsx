import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Beacon } from "@/components/Beacon";
import { REPO, SITE } from "@/lib/site";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Crypto Checkout: accept USDT, BTC and LTC on your site without a processor", template: "%s · Crypto Checkout" },
  description:
    "Self-hosted, non-custodial checkout for USDT (TRC-20), Bitcoin and Litecoin. No payment processor, no KYC, no private keys on the server. Open source, one Docker container.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Beacon />
        <header className="border-b border-border">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="font-semibold tracking-tight">Crypto<span className="text-accent">Checkout</span></Link>
            <div className="flex gap-5 text-sm text-muted">
              <Link href="/demo" className="hover:text-foreground">Demo</Link>
              <Link href="/tools/fees" className="hover:text-foreground">Fees</Link>
              <Link href="/tools/tron-address" className="hover:text-foreground">Address check</Link>
              <Link href="/guides" className="hover:text-foreground">Guides</Link>
              <a href={REPO} className="hover:text-foreground">GitHub</a>
              <Link href="/buy" className="text-accent hover:underline">Bundle</Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-border py-6 text-center text-xs text-muted">
          <p>MIT licensed. Payments go to your own wallet; this site never holds funds or keys.</p>
          <p className="mt-1">Questions: <a href="mailto:cpunk7385@gmail.com" className="hover:text-foreground">cpunk7385@gmail.com</a></p>
        </footer>
      </body>
    </html>
  );
}
