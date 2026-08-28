import { getProducts, getFeaturedProducts } from "@/lib/data";
import { getSiteContent } from "@/lib/site-content-server";
import { Home } from "@/components/home";

export const dynamic = "force-dynamic";

export default async function Page() {
  const products = await getProducts();
  const [featured, content] = await Promise.all([
    getFeaturedProducts(products),
    getSiteContent(),
  ]);
  return <Home products={products} featured={featured} content={content} />;
}
