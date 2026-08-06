import { Suspense } from "react";
import { AuthView } from "@/components/account";
export const metadata = { title: "Sign in or register — Doron Goldstein Photography" };
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AuthView />
    </Suspense>
  );
}
