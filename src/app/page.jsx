import { getProducts, getFeaturedProducts } from "@/lib/data";
import { Home } from "@/components/home";

export const dynamic = "force-dynamic";

export default async function Page() {
  const products = await getProducts();
  const featured = await getFeaturedProducts(products);
  return <Home products={products} featured={featured} />;
}
