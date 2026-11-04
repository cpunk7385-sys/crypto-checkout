"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function Beacon() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname) return;
    const first = !sessionStorage.getItem("rd_s");
    if (first) sessionStorage.setItem("rd_s", "1");
    const body = JSON.stringify({ p: pathname, r: first ? document.referrer : "", n: first });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/hit", new Blob([body], { type: "application/json" }));
    else fetch("/api/hit", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true });
  }, [pathname]);
  return null;
}
