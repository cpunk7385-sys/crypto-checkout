import type { Metadata } from "next";
import { TronAddressCheck } from "@/components/TronAddressCheck";
import { Tip } from "@/components/Tip";

export const metadata: Metadata = {
  title: "TRON address checker: valid? activated? has it held USDT?",
  description:
    "Check a TRON (TRC-20) address before sending USDT: checksum validity, whether it is activated on-chain, whether it already holds USDT (half the energy fee), and a reminder against address-poisoning lookalikes.",
};

export default function TronAddressPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight">Check a TRON address before you send USDT</h1>
      <p className="mt-2 text-muted">
        Paste the recipient address. You get: whether it is a valid address (checksum), whether it has ever been used,
        whether it already holds USDT (which halves the sender&apos;s energy cost), and the two ends to compare against
        poisoning lookalikes.
      </p>
      <div className="mt-8"><TronAddressCheck /></div>
      <h2 className="mt-10 text-lg font-semibold">What the results mean</h2>
      <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-muted">
        <li><span className="text-foreground">Invalid</span>: a typo. TRON addresses are 34 base58 characters starting with T, with a 4-byte checksum; one wrong character fails it.</li>
        <li><span className="text-foreground">Not activated</span>: fine to send to, but the first transfer pays for account creation (about 1 TRX extra) and the full 130,000 energy.</li>
        <li><span className="text-foreground">Holds USDT</span>: the cheaper case for the sender, about 65,000 energy.</li>
        <li><span className="text-foreground">Lookalike warning</span>: scammers send dust from addresses whose first and last characters match a contact of yours, hoping you copy the wrong one from history. Compare the middle, or better, copy from the recipient every time.</li>
      </ul>
      <Tip />
    </div>
  );
}
