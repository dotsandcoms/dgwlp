import { AdminApp } from "@/components/admin";

export const metadata = {
  title: "Store admin",
  robots: { index: false, follow: false, nocache: true },
};

export default function Page() {
  return <AdminApp />;
}
