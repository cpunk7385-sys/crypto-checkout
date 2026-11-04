"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { Currency } from "@/lib/chains";
import type { OrderView } from "@/lib/order-view";

const INFO: Record<Currency, { label: string; network: string; note: string }> = {
  USDT: { label: "USDT", network: "TRON (TRC-20)", note: "Send exactly this amount: it is unique to your order and is how the payment is recognised. Not ERC-20, not BEP-20." },
  BTC: { label: "Bitcoin", network: "on-chain (bech32), not Lightning", note: "The address is unique to your order, so any amount at or above the minimum counts. Marked paid as soon as the transaction is seen." },
  LTC: { label: "Litecoin", network: "on-chain (bech32)", note: "The address is unique to your order, so any amount at or above the minimum counts. Marked paid as soon as the transaction is seen." },
};

export function Checkout({
  product,
  priceUsd,
  currencies,
  renderDeliverable,
}: {
  product: string;
  priceUsd: number;
  currencies: Currency[];
  renderDeliverable?: (d: string) => React.ReactNode;
}) {
  const [currency, setCurrency] = useState<Currency>(currencies[0] ?? "USDT");
  const [order, setOrder] = useState<OrderView | null>(null);
  const [qr, setQr] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (!order) return;
    QRCode.toDataURL(order.uri, { margin: 1, width: 220 }).then(setQr);
  }, [order]);

  useEffect(() => {
    if (!order || order.status !== "pending") return;
    const t = setInterval(async () => {
      setLeft(Math.max(0, Math.round((order.expiresAt - Date.now()) / 1000)));
      try {
        const r = await fetch(`/api/orders/${order.id}`, { cache: "no-store" });
        if (!r.ok) return;
        const o = (await r.json()) as OrderView;
        if (o.status !== "pending") setOrder(o);
      } catch {}
    }, 5000);
    return () => clearInterval(t);
  }, [order]);

  async function start() {
    setError("");
    setBusy(true);
    try {
      const r = await fetch("/api/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ product, currency }) });
      if (!r.ok) {
        setError("Could not create an order. Try again in a minute.");
        return;
      }
      const o = (await r.json()) as OrderView;
      setOrder(o);
      setLeft(Math.round((o.expiresAt - Date.now()) / 1000));
    } finally {
      setBusy(false);
    }
  }

  if (order?.status === "paid") {
    return (
      <div className="rounded-lg border border-emerald-700/60 bg-emerald-900/20 p-6">
        <h2 className="text-lg font-semibold text-emerald-300">Payment received</h2>
        <div className="mt-3 text-sm">
          {order.deliverable && (renderDeliverable ? renderDeliverable(order.deliverable) : <code className="block rounded bg-black/40 px-3 py-2 font-mono">{order.deliverable}</code>)}
        </div>
        <p className="mt-3 text-xs text-muted">Order {order.id}, paid in {order.currency}.</p>
      </div>
    );
  }

  if (order?.status === "pending") {
    const info = INFO[order.currency];
    const mm = String(Math.floor(left / 60)).padStart(2, "0");
    const ss = String(left % 60).padStart(2, "0");
    return (
      <div className="rounded-lg border border-border bg-panel p-6">
        <h2 className="text-lg font-semibold">
          Pay with {info.label} <span className="text-sm font-normal text-muted">{info.network}</span>
        </h2>
        <p className="mt-1 text-sm text-muted">{info.note}</p>
        <div className="mt-5 grid gap-6 sm:grid-cols-[220px_1fr]">
          {qr && <img src={qr} alt="Payment QR code" className="h-[220px] w-[220px] rounded bg-white p-1" />}
          <div className="space-y-4 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">{order.currency === "USDT" ? "Amount (exact)" : "Amount"}</div>
              <code className="block select-all font-mono text-2xl font-semibold">{order.amount} {order.currency}</code>
              {order.currency !== "USDT" && <div className="mt-1 text-xs text-muted">minimum accepted: {order.minAmount} {order.currency}</div>}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">Address</div>
              <code className="block select-all break-all font-mono">{order.address}</code>
            </div>
            <div className="text-xs text-muted">Waiting for the payment… this page updates itself. Order expires in {mm}:{ss}.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {order?.status === "expired" && (
        <p className="rounded-md border border-amber-700/60 bg-amber-900/20 p-3 text-sm text-amber-200">That order expired. Create a new one; if you already paid, contact the seller with your transaction hash.</p>
      )}
      <div>
        <div className="text-xs uppercase tracking-wide text-muted">Pay with</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {currencies.map((c) => (
            <button key={c} onClick={() => setCurrency(c)} className={`rounded-md border px-4 py-2 text-sm ${currency === c ? "border-accent bg-accent/15 text-accent" : "border-border text-muted hover:text-foreground"}`}>
              {INFO[c].label}
              <span className="ml-1.5 text-xs opacity-70">{c === "USDT" ? "TRC-20" : "on-chain"}</span>
            </button>
          ))}
        </div>
      </div>
      <button onClick={start} disabled={busy || currencies.length === 0} className="rounded-md bg-accent px-5 py-3 font-medium text-black hover:brightness-110 disabled:opacity-60">
        {busy ? "Creating order…" : `Pay $${priceUsd} in ${INFO[currency].label}`}
      </button>
      {error && <p className="text-sm text-rose-400">{error}</p>}
    </div>
  );
}
