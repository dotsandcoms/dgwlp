import { notFound } from "next/navigation";
import { getProduct } from "@/lib/data";
import { ProductDetail } from "@/components/product";

export async function generateMetadata({ params }) {
  const product = await getProduct(params.slug);
  return { title: product ? `${product.name} — Doron Goldstein Photography` : "Print not found" };
}

export default async function Page({ params }) {
  const product = await getProduct(params.slug);
  if (!product) notFound();
  return <ProductDetail product={product} />;
}
