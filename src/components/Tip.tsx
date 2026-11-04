export function Tip() {
  const ltc = process.env.NEXT_PUBLIC_TIP_LTC;
  const usdt = process.env.NEXT_PUBLIC_TIP_USDT;
  const btc = process.env.NEXT_PUBLIC_TIP_BTC;
  if (!ltc && !usdt && !btc) return null;
  return (
    <div className="mt-10 rounded-lg border border-border bg-panel p-4 text-sm">
      <p>
        These tools are free and carry no affiliate links. If one saved you a fee, a tip keeps the explorer API bills
        paid. Litecoin takes any amount; a USDT transfer costs about $2 in TRX, so it only makes sense from 5 USDT.
      </p>
      <dl className="mt-3 grid gap-2 font-mono text-xs text-muted sm:grid-cols-[auto_1fr]">
        {ltc && (<><dt className="text-foreground">LTC</dt><dd className="select-all break-all">{ltc}</dd></>)}
        {usdt && (<><dt className="text-foreground">USDT (TRC-20)</dt><dd className="select-all break-all">{usdt}</dd></>)}
        {btc && (<><dt className="text-foreground">BTC</dt><dd className="select-all break-all">{btc}</dd></>)}
      </dl>
      <p className="mt-3 text-xs text-muted">
        These addresses are the only ones this site uses; the same ones are in the GitHub repo. Tips buy no features and no
        influence; the code stays MIT either way. Free ways to help: star the repo, report a bug.
      </p>
    </div>
  );
}
