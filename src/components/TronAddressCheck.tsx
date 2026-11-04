"use client";

import { useState } from "react";

type Info = {
  address: string;
  valid: boolean;
  reason?: string;
  activated?: boolean;
  holdsUsdt?: boolean;
  usdtBalance?: number;
  trxBalance?: number;
  createdAt?: number | null;
  lookalike?: { prefix: string; suffix: string };
};

export function TronAddressCheck() {
  const [addr, setAddr] = useState("");
  const [info, setInfo] = useState<Info | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function check() {
    setError("");
    setInfo(null);
    setBusy(true);
    try {
      const r = await fetch(`/api/tools/tron-address?address=${encodeURIComponent(addr.trim())}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) setError(j.error ?? "lookup failed");
      else setInfo(j);
    } catch {
      setError("lookup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <input value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="T…" spellCheck={false} className="min-w-72 flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm" />
        <button onClick={check} disabled={busy || !addr.trim()} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-black disabled:opacity-60">{busy ? "Checking…" : "Check"}</button>
      </div>
      {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
      {info && !info.valid && <p className="mt-3 text-sm text-rose-400">Invalid: {info.reason}</p>}
      {info && info.valid && (
        <div className="mt-4 space-y-2 rounded-lg border border-border bg-panel p-4 text-sm">
          <p><span className="text-emerald-400">Valid TRON address.</span> Checksum passes.</p>
          <p>
            {info.activated ? "Activated on-chain" : "Never used on-chain (not activated)"}.{" "}
            {info.holdsUsdt
              ? `Holds USDT (${info.usdtBalance?.toFixed(2)}): a USDT transfer to it needs about 65,000 energy, the cheaper case.`
              : "Has never held USDT: the first USDT transfer to it costs about 130,000 energy, roughly double the usual fee."}
          </p>
          <p className="text-muted">TRX balance {info.trxBalance?.toFixed(2)}{info.createdAt ? `, created ${new Date(info.createdAt).toISOString().slice(0, 10)}` : ""}.</p>
          <p className="text-muted">
            Before sending, compare more than the ends: this address starts with <code className="font-mono">{info.lookalike?.prefix}</code> and ends with{" "}
            <code className="font-mono">{info.lookalike?.suffix}</code>. Address-poisoning scams plant lookalikes with the same first and last characters in your history; always copy from the recipient, never from a past transaction.
          </p>
        </div>
      )}
    </div>
  );
}
