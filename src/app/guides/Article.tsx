import Link from "next/link";

export function Article({ title, lede, updated, children }: { title: string; lede: string; updated: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-2xl">
      <p className="text-xs uppercase tracking-wide text-muted">
        <Link href="/guides" className="hover:text-foreground">Guides</Link> · updated {updated}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-4 text-lg text-muted">{lede}</p>
      <div className="prose-guide mt-8 space-y-5 leading-relaxed">{children}</div>
      <div className="mt-12 rounded-lg border border-accent/40 bg-panel p-5 text-sm">
        <p>
          Crypto Checkout does all of this for you: USDT TRC-20, Bitcoin and Litecoin straight to your wallet, MIT licensed,
          one Docker container. <Link href="/demo" className="text-accent hover:underline">Try a $1 order</Link> or read the{" "}
          <a href="https://github.com/cpunk7385-sys/crypto-checkout" className="text-accent hover:underline">source</a>.
        </p>
      </div>
    </article>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="pt-4 text-xl font-semibold">{children}</h2>;
}

export function Code({ children }: { children: string }) {
  return <pre className="overflow-x-auto rounded-lg border border-border bg-panel p-4 text-xs leading-relaxed"><code>{children}</code></pre>;
}
