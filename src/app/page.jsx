import { getProducts, getFeaturedProducts, getCategoryBrowseTiles } from "@/lib/data";
import { getSiteContent } from "@/lib/site-content-server";
import { Home } from "@/components/home";

export const dynamic = "force-dynamic";

export default async function Page() {
  const products = await getProducts();
  const [featured, categoryTiles, content] = await Promise.all([
    getFeaturedProducts(products),
    getCategoryBrowseTiles(products),
    getSiteContent(),
  ]);
  return <Home products={products} featured={featured} categoryTiles={categoryTiles} content={content} />;
}
