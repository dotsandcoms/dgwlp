import { getProduct } from "@/lib/data";
import { About } from "@/components/misc";
export const metadata = { title: "About Doron Goldstein" };
export default async function Page() {
  const portrait = (await getProduct("zebra")) || (await getProduct("leopard-colour"));
  return <About portrait={portrait} />;
}
