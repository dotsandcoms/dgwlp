"use client";
import React from "react";
import Link from "next/link";
import { C, HEAD } from "@/lib/pricing";
import { siteImage } from "@/lib/supabase";
import { Pill } from "./primitives";

/**
 * Full-bleed “out of frame” 404 — wildlife behind soft focus,
 * viewfinder corners, aperture ring, exposure readout.
 */
export function NotFoundView() {
  const bg = siteImage("wildebeest-herd.jpg");

  return (
    <section
      className="relative overflow-hidden"
      style={{ minHeight: "calc(100dvh - 68px)", background: C.dark }}
    >
      {/* Soft-focus field — the subject you almost caught */}
      <div className="absolute inset-0 nf-drift" aria-hidden>
        <div
          className="absolute inset-0 scale-110"
          style={{
            backgroundImage: `url(${bg})`,
            backgroundSize: "cover",
            backgroundPosition: "center 45%",
            filter: "grayscale(1) blur(14px) brightness(0.55) contrast(1.08)",
          }}
        />
      </div>
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse at 50% 42%, rgba(20,20,18,.15) 0%, rgba(20,20,18,.72) 55%, rgba(20,20,18,.94) 100%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        aria-hidden
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "160px 160px",
        }}
      />

      <div className="relative z-10 flex flex-col items-center justify-center text-center px-5 py-20 sm:py-28"
        style={{ minHeight: "calc(100dvh - 68px)" }}>

        {/* Viewfinder */}
        <div className="relative w-full max-w-[520px] aspect-[4/3] flex items-center justify-center nf-in">
          {/* Corner brackets */}
          {[
            { t: 0, l: 0, b: "auto", r: "auto", rot: 0 },
            { t: 0, l: "auto", b: "auto", r: 0, rot: 90 },
            { t: "auto", l: "auto", b: 0, r: 0, rot: 180 },
            { t: "auto", l: 0, b: 0, r: "auto", rot: 270 },
          ].map((c, i) => (
            <span
              key={i}
              aria-hidden
              className="absolute w-10 h-10 sm:w-12 sm:h-12"
              style={{
                top: c.t, left: c.l, bottom: c.b, right: c.r,
                transform: `rotate(${c.rot}deg)`,
                borderTop: "2px solid rgba(255,255,255,.75)",
                borderLeft: "2px solid rgba(255,255,255,.75)",
              }}
            />
          ))}

          {/* Aperture ring */}
          <div
            className="absolute rounded-full nf-aperture pointer-events-none"
            aria-hidden
            style={{
              width: "min(58%, 280px)",
              aspectRatio: "1",
              border: "1px solid rgba(255,255,255,.18)",
              boxShadow: "inset 0 0 0 1px rgba(85,107,47,.25), 0 0 60px rgba(0,0,0,.35)",
            }}
          >
            <div
              className="absolute inset-[12%] rounded-full"
              style={{ border: "1px dashed rgba(255,255,255,.12)" }}
            />
          </div>

          <div className="relative px-6">
            <p
              className="text-[11px] sm:text-[12px] tracking-[.32em] mb-4 nf-in"
              style={{ fontFamily: HEAD, color: C.green, animationDelay: "80ms" }}
            >
              DORON GOLDSTEIN
            </p>
            <h1
              className="text-white font-light leading-none nf-in"
              style={{
                fontFamily: HEAD,
                fontSize: "clamp(72px, 18vw, 140px)",
                letterSpacing: "0.04em",
                animationDelay: "140ms",
                textShadow: "0 8px 40px rgba(0,0,0,.45)",
              }}
            >
              404
            </h1>
            <p
              className="mt-3 text-[13px] sm:text-[14px] tracking-[.18em] text-white/55 nf-in"
              style={{ fontFamily: HEAD, animationDelay: "220ms" }}
            >
              OUT OF FRAME
            </p>
          </div>

          {/* Exposure readout */}
          <div
            className="absolute left-3 right-3 sm:left-4 sm:right-4 bottom-3 sm:bottom-4 flex justify-between text-[10px] sm:text-[11px] tracking-[.14em] text-white/40 nf-in"
            style={{ fontFamily: HEAD, animationDelay: "300ms" }}
            aria-hidden
          >
            <span>f/∞</span>
            <span>1/404s</span>
            <span>ISO —</span>
          </div>
        </div>

        <p
          className="mt-10 sm:mt-12 max-w-md text-[15px] sm:text-[17px] leading-relaxed text-white/75 nf-in"
          style={{ fontFamily: HEAD, fontWeight: 300, animationDelay: "360ms" }}
        >
          This page wandered off into the bush — or never made the edit.
          Let’s get you back to the collection.
        </p>

        <div
          className="mt-8 flex flex-wrap items-center justify-center gap-3 nf-in"
          style={{ animationDelay: "440ms" }}
        >
          <Link href="/shop">
            <Pill>Browse the shop</Pill>
          </Link>
          <Link href="/">
            <Pill
              variant="outline"
              style={{
                borderColor: "rgba(255,255,255,.35)",
                color: "#fff",
                background: "transparent",
              }}
            >
              Return home
            </Pill>
          </Link>
        </div>
      </div>
    </section>
  );
}
