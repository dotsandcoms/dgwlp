import { NotFoundView } from "@/components/not-found";

export const metadata = {
  title: "Out of frame — Doron Goldstein Photography",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return <NotFoundView />;
}
