import { getProducts } from "@/lib/data";
import { Home } from "@/components/home";

export default async function Page() {
  const products = await getProducts();
  return <Home products={products} />;
}
