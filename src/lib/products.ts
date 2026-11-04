import { existsSync } from "node:fs";
import path from "node:path";

export type Deliver =
  | { type: "license" }
  | { type: "download"; file: string }
  | { type: "text"; text: string };

export type Product = {
  id: string;
  title: string;
  description: string;
  priceUsd: number;
  deliver: Deliver;
};

export const filesDir = () => path.join(process.env.DATA_DIR ?? path.join(process.cwd(), "data"), "files");

export const PRODUCTS: Product[] = [
  {
    id: "demo",
    title: "Demo purchase",
    description: "A $1 test order. You get a license key back, exactly like a real product would.",
    priceUsd: 1,
    deliver: { type: "license" },
  },
  {
    id: "storefront",
    title: "Crypto Checkout storefront bundle",
    description:
      "Everything in the open-source core plus a multi-product storefront, file delivery with expiring links, admin dashboard, webhooks, email receipts, Docker + Traefik deployment and a setup guide.",
    priceUsd: 39,
    deliver: { type: "download", file: "crypto-checkout-storefront.zip" },
  },
];

export const productById = (id: string) => PRODUCTS.find((p) => p.id === id);

export function productAvailable(p: Product): boolean {
  if (p.deliver.type === "download") return existsSync(path.join(filesDir(), p.deliver.file));
  return true;
}

export function publicProduct(p: Product) {
  return { id: p.id, title: p.title, description: p.description, priceUsd: p.priceUsd, available: productAvailable(p) };
}
