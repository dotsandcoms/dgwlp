import { getProducts, getCategories } from "@/lib/data";
import { ShopClient } from "@/components/shop";
export const metadata = { title: "Shop — Doron Goldstein Photography" };
export default async function Page() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  return <ShopClient products={products} categories={categories} />;
}
