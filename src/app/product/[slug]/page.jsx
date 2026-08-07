import { notFound } from "next/navigation";
import { getProduct } from "@/lib/data";
import { ProductDetail } from "@/components/product";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  return { title: product ? `${product.name} — Doron Goldstein Photography` : "Print not found" };
}

export default async function Page({ params }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  return <ProductDetail product={product} />;
}
