"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient, hasSupabase } from "@/lib/supabase";
import { flushPendingProfile } from "@/lib/auth-profile";
import { C, HEAD } from "@/lib/pricing";

/**
 * Handles Supabase email confirm / magic-link redirects
 * (`/#access_token=...` or `?code=...`).
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [msg, setMsg] = useState("Confirming your account…");

  useEffect(() => {
    if (!hasSupabase) {
      router.replace("/");
      return;
    }

    let cancelled = false;
    const sb = browserClient();

    (async () => {
      try {
        const qs = new URLSearchParams(window.location.search);
        const code = qs.get("code");
        if (code) {
          const { error } = await sb.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (window.location.hash?.includes("access_token")) {
          // Implicit flow — give the client a moment to parse the hash
          await new Promise((r) => setTimeout(r, 500));
        }

        let { data, error } = await sb.auth.getSession();
        if (error) throw error;

        // One more try if hash was slow to parse
        if (!data?.session && window.location.hash?.includes("access_token")) {
          await new Promise((r) => setTimeout(r, 600));
          ({ data, error } = await sb.auth.getSession());
          if (error) throw error;
        }

        if (!data?.session?.user) {
          if (!cancelled) setMsg("Link expired or already used — please sign in.");
          setTimeout(() => router.replace("/"), 2500);
          return;
        }

        await flushPendingProfile(data.session.user);
        window.history.replaceState({}, "", "/auth/callback");

        if (!cancelled) {
          setMsg("You're in — redirecting…");
          router.replace("/account");
        }
      } catch (e) {
        if (!cancelled) {
          setMsg(e?.message || "Could not confirm — try signing in.");
          setTimeout(() => router.replace("/"), 2800);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [router]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center px-5 text-center">
      <p className="text-[12px] tracking-[.22em] mb-3" style={{ fontFamily: HEAD, color: C.green }}>DORON GOLDSTEIN</p>
      <p className="text-[16px] text-neutral-600" style={{ fontFamily: HEAD }}>{msg}</p>
    </div>
  );
}
