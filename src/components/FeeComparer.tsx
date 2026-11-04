"use client";

import { useEffect, useState } from "react";

type Rail = { rail: string; network: string; feeNative: string; feeUsd: number; note: string; minutes: string };

export function FeeComparer() {
  const [data, setData] = useState<{ at: number; rails: Rail[] } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    fetch("/api/tools/fees", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError(true));
  }, []);
  if (error) return <p className="text-sm text-rose-400">Fee sources are unreachable right now. Try again in a minute.</p>;
  if (!data) return <p className="text-sm text-muted">Fetching live fees…</p>;
  return (
    <div>
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-muted">
          <tr><th className="py-2">Rail</th><th className="py-2">Fee now</th><th className="py-2">≈ USD</th><th className="py-2">Confirms</th></tr>
        </thead>
        <tbody>
          {data.rails.map((r, i) => (
            <tr key={i} className="border-t border-border align-top">
              <td className="py-3">
                <div className="font-medium">{r.rail}</div>
                <div className="text-xs text-muted">{r.network}</div>
              </td>
              <td className="py-3 font-mono">{r.feeNative}</td>
              <td className="py-3 font-mono">${r.feeUsd.toFixed(2)}</td>
              <td className="py-3 text-muted">{r.minutes} min</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="mt-4 space-y-1 text-xs text-muted">
        {data.rails.map((r, i) => (<li key={i}><span className="text-foreground">{r.rail} ({r.network.split(",")[0]}):</span> {r.note}</li>))}
      </ul>
      <p className="mt-3 text-xs text-muted">Updated {new Date(data.at).toLocaleTimeString()}. Sources: mempool.space, litecoinspace.org, TRON chain parameters, CoinGecko prices. Cached for a minute.</p>
    </div>
  );
}
