import { Suspense } from "react";
import { getProducts, getCategories } from "@/lib/data";
import { ShopClient } from "@/components/shop";
export const metadata = { title: "Shop — Doron Goldstein Photography" };
export const dynamic = "force-dynamic";
export default async function Page() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  return (
    <Suspense fallback={<div className="max-w-[1240px] mx-auto px-5 py-12 text-[14px] text-neutral-500">Loading shop…</div>}>
      <ShopClient products={products} categories={categories} />
    </Suspense>
  );
}
