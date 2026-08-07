"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { C, HEAD } from "@/lib/pricing";
import { siteImage } from "@/lib/supabase";
import { RegisterForm, LoginForm } from "./forms";
import { useAuth, useToast, useAuthModal } from "@/context/providers";
import { friendlyError } from "@/lib/errors";

/**
 * Blurred overlay auth modal — shows only Sign in OR Create account.
 * Centered on all breakpoints; scrolls inside on short phones.
 */
export function AuthModal() {
  const { open, mode, next, closeAuth, openAuth } = useAuthModal();
  const { register, login } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const isRegister = mode === "register";

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") closeAuth(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, closeAuth]);

  if (!open) return null;

  const afterAuth = (path) => {
    closeAuth();
    router.push(path || next || "/account");
  };

  const banner = siteImage(isRegister ? "1.jpg" : "hero.jpg");

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0"
        style={{ background: "rgba(20,20,18,.55)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
        onClick={closeAuth}
      />

      <div
        className="relative w-full max-w-[440px] max-h-[min(90dvh,720px)] bg-white flex flex-col overflow-hidden rounded-2xl"
        style={{ boxShadow: "0 24px 80px rgba(0,0,0,.28)" }}
      >
        <div className="relative shrink-0 overflow-hidden" style={{ height: 120 }}>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${banner})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "grayscale(1) contrast(1.05)",
            }}
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(20,20,18,.35),rgba(20,20,18,.78))" }} />
          <div className="relative h-full flex flex-col justify-end p-4 sm:p-5">
            <p className="text-[10px] tracking-[.24em] mb-1" style={{ fontFamily: HEAD, color: C.green }}>
              DORON GOLDSTEIN
            </p>
            <h2 id="auth-modal-title" className="text-white text-[26px] sm:text-[30px] leading-none font-light" style={{ fontFamily: HEAD }}>
              {isRegister ? "Create account" : "Sign in"}
            </h2>
          </div>
          <button
            type="button"
            onClick={closeAuth}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center"
            aria-label="Close"
          >
            <X size={18} color={C.ink} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 min-h-0">
          {isRegister ? (
            <RegisterForm
              onDone={async (d) => {
                try {
                  const result = await register(d);
                  if (result?.needsConfirmation) {
                    toast("Check your email to confirm your account, then sign in.");
                    closeAuth();
                    return;
                  }
                  toast(`Welcome, ${d.name.split(" ")[0]}`);
                  afterAuth(next);
                } catch (e) {
                  toast(friendlyError(e, "Could not create account"));
                }
              }}
            />
          ) : (
            <LoginForm
              onDone={async (d) => {
                try {
                  await login(d);
                  toast("Welcome back");
                  afterAuth(next);
                } catch (e) {
                  toast(friendlyError(e, "Sign in failed"));
                }
              }}
            />
          )}

          <p className="text-[13px] text-neutral-500 mt-5 text-center pb-1">
            {isRegister ? (
              <>
                Already collecting?{" "}
                <button
                  type="button"
                  onClick={() => openAuth("login", next)}
                  className="underline underline-offset-2"
                  style={{ color: C.green }}
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                New here?{" "}
                <button
                  type="button"
                  onClick={() => openAuth("register", next)}
                  className="underline underline-offset-2"
                  style={{ color: C.green }}
                >
                  Create an account
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
