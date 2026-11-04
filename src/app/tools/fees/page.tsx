import type { Metadata } from "next";
import { FeeComparer } from "@/components/FeeComparer";
import { Tip } from "@/components/Tip";

export const metadata: Metadata = {
  title: "USDT TRC-20 vs BTC vs LTC: cheapest way to send money right now",
  description:
    "Live transfer fees for USDT on TRON (funded vs fresh address), Litecoin and Bitcoin, in native units and USD, from mempool.space, litecoinspace and TRON chain parameters.",
};

export default function FeesPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight">Cheapest rail to send money right now</h1>
      <p className="mt-2 text-muted">
        Live network fees for the three rails people actually use for small transfers, for a plain one-input two-output
        transaction. USDT on TRON is listed twice because the first transfer to an address costs double.
      </p>
      <div className="mt-8"><FeeComparer /></div>
      <h2 className="mt-10 text-lg font-semibold">Why USDT on TRON costs what it costs</h2>
      <p className="mt-2 text-sm text-muted">
        A TRC-20 transfer burns energy: about 65,000 for a recipient who already holds USDT and about 130,000 for one who
        never has. Energy is paid in TRX at the chain&apos;s current energy price unless the sender has staked TRX for
        energy or rented it. The bandwidth part (~345 bytes) is usually covered by the free daily allowance. That is why
        exchanges charge a flat 1 USDT and why a $2 tip in USDT makes little sense while the same tip in Litecoin costs
        under a cent.
      </p>
      <Tip />
    </div>
  );
}
