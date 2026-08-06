"use client";
import React, { useState } from "react";
import Link from "next/link";
import { C, HEAD } from "@/lib/pricing";
import { siteImage } from "@/lib/supabase";
import { Plate, Reveal, Pill, Parallax } from "./primitives";
import { useToast } from "@/context/providers";

export function About() {
  const portrait = {
    image: siteImage("about.jpg"),
    colour: "colour",
    name: "Doron Goldstein",
    grad: ["#2f2f2d", "#a9a49b"],
    angle: 120,
  };

  return (
    <div>
      {/* Hero — brand + portrait as one composition */}
      <section className="relative overflow-hidden" style={{ background: C.dark, minHeight: "78vh" }}>
        <div className="absolute inset-0 md:left-[42%]">
          <Parallax speed={0.18} className="absolute inset-0" style={{ top: "-8%", height: "116%" }}>
            <Plate product={portrait} showSig={false} style={{ width: "100%", height: "100%" }} />
          </Parallax>
          <div className="absolute inset-0" style={{ background: "linear-gradient(90deg,rgba(20,20,18,.92) 0%,rgba(20,20,18,.55) 42%,rgba(20,20,18,.25) 100%)" }} />
          <div className="absolute inset-0 md:hidden" style={{ background: "linear-gradient(180deg,rgba(20,20,18,.35) 0%,rgba(20,20,18,.88) 72%)" }} />
        </div>

        <div className="relative max-w-[1240px] mx-auto px-5 py-20 sm:py-28 flex flex-col justify-end md:justify-center min-h-[78vh]">
          <div className="max-w-xl text-white">
            <Reveal>
              <p className="tracking-[.28em] text-[12px] sm:text-[13px] mb-4" style={{ fontFamily: HEAD, color: C.green }}>THE PHOTOGRAPHER</p>
            </Reveal>
            <Reveal delay={100}>
              <h1 className="text-[44px] sm:text-[68px] leading-[0.92] font-light" style={{ fontFamily: HEAD, letterSpacing: ".02em" }}>
                DORON<br /><span style={{ color: C.green }}>GOLDSTEIN</span>
              </h1>
            </Reveal>
            <Reveal delay={200}>
              <p className="mt-6 text-[16px] sm:text-[18px] leading-relaxed text-white/80 max-w-md" style={{ fontFamily: HEAD, fontWeight: 300 }}>
                From the dental chair to the African bush — a life of precision, patience, and a deep love of wildlife.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Opening story */}
      <section className="max-w-[820px] mx-auto px-5 py-20 sm:py-24">
        <Reveal>
          <p className="text-[18px] sm:text-[22px] leading-relaxed text-neutral-700" style={{ fontFamily: HEAD, fontWeight: 300 }}>
            Doron Goldstein spent 33 years as a dentist, building a career founded on dedication, precision, patience, and an unwavering commitment to his patients. Following neck surgery, he was left with a partially paralysed arm, forcing him into an unexpected and premature retirement.
          </p>
        </Reveal>
        <Reveal delay={100}>
          <p className="text-[16px] sm:text-[18px] leading-relaxed text-neutral-600 mt-8">
            What initially felt like a devastating setback became an opportunity to pursue a lifelong passion that had always been waiting in the wings… The African bush and its wildlife.
          </p>
        </Reveal>
      </section>

      {/* Change of focus */}
      <section className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${C.greenSoft} 0%, #f7f5f0 55%, #ebe8e1 100%)` }}>
        <div className="max-w-[1100px] mx-auto px-5 py-20 sm:py-24 grid md:grid-cols-12 gap-10 items-center">
          <div className="md:col-span-5">
            <Reveal>
              <div className="overflow-hidden" style={{ borderRadius: 4 }}>
                <Plate product={portrait} showSig style={{ width: "100%", aspectRatio: "3/4" }} />
              </div>
            </Reveal>
          </div>
          <div className="md:col-span-7">
            <Reveal>
              <p className="text-[12px] tracking-[.22em] mb-3" style={{ fontFamily: HEAD, color: C.green }}>A CHANGE OF FOCUS</p>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="text-[28px] sm:text-[36px] leading-tight mb-6" style={{ fontFamily: HEAD, fontWeight: 300 }}>
                Retirement was never the end of Doron’s story.
              </h2>
            </Reveal>
            <Reveal delay={140}>
              <div className="space-y-5 text-[15px] leading-relaxed text-neutral-700">
                <p>
                  In many ways, wildlife photography demands many of the same qualities as dentistry. It requires patience, technical skill, careful observation, attention to detail, and knowing that the smallest movement can make all the difference. Those qualities naturally found a new home behind the lens of a camera.
                </p>
                <p>
                  Having visited the Kruger National Park well over 100 times and the Kgalagadi Transfrontier Park on 15 occasions, his transition into wildlife photography felt less like discovering a new passion and more like deepening one that had existed for a lifetime.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="max-w-[820px] mx-auto px-5 py-20 sm:py-24">
        <Reveal>
          <p className="text-[12px] tracking-[.22em] mb-3" style={{ fontFamily: HEAD, color: C.green }}>THE WORK</p>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="text-[28px] sm:text-[36px] leading-tight mb-8" style={{ fontFamily: HEAD, fontWeight: 300 }}>
            More than beautiful photographs.
          </h2>
        </Reveal>
        <Reveal delay={140}>
          <div className="space-y-6 text-[15px] sm:text-[16px] leading-relaxed text-neutral-700">
            <p>
              For Doron, wildlife photography is about far more than taking beautiful photographs. It is about immersing himself in nature, waiting patiently for hours, and capturing authentic moments that reveal not only an animal’s beauty, but also its personality, behaviour and place within the wild.
            </p>
            <p>
              Through his photographs, he invites others to experience the wonder of the natural world as he sees it. His images preserve moments that exist for only a fraction of a second, yet tell stories that endure long afterwards. Each photograph reflects his deep respect for wildlife and his belief that nature is something to be admired, protected and celebrated.
            </p>
            <p>
              His work demonstrates that retirement does not have to mark the closing of one chapter — it can be the beginning of another. What started as an unexpected consequence of adversity has become a creative pursuit filled with purpose, discovery and fulfilment.
            </p>
          </div>
        </Reveal>
      </section>

      {/* Quote */}
      <section className="px-5 py-20 sm:py-28" style={{ background: C.dark }}>
        <div className="max-w-[900px] mx-auto text-center">
          <Reveal>
            <p className="text-[12px] tracking-[.28em] mb-8" style={{ fontFamily: HEAD, color: C.green }}>IN HIS OWN WORDS</p>
          </Reveal>
          <Reveal delay={100}>
            <blockquote className="text-white text-[24px] sm:text-[34px] leading-snug font-light" style={{ fontFamily: HEAD }}>
              “Wildlife photography has reminded me that every ending can become the beginning of something new and special.”
            </blockquote>
          </Reveal>
          <Reveal delay={200}>
            <p className="mt-8 text-white/50 text-[13px] tracking-[.16em]" style={{ fontFamily: HEAD }}>— DORON GOLDSTEIN</p>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-[720px] mx-auto px-5 py-20 sm:py-24 text-center">
        <Reveal>
          <h2 className="text-[28px] sm:text-[36px] mb-4" style={{ fontFamily: HEAD, fontWeight: 300 }}>Bring the wild home</h2>
        </Reveal>
        <Reveal delay={80}>
          <p className="text-[15px] text-neutral-600 mb-8 max-w-md mx-auto">
            Signed, limited-edition archival prints from the Kruger, Kgalagadi and beyond.
          </p>
        </Reveal>
        <Reveal delay={140}>
          <Link href="/shop"><Pill>Explore the collection →</Pill></Link>
        </Reveal>
      </section>
    </div>
  );
}

export function Contact() {
  const { toast } = useToast();
  const [f, setF] = useState({ name: "", email: "", msg: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const inp = { className: "w-full py-3 px-3 text-[14px] outline-none mb-3", style: { border: `1px solid ${C.line}`, borderRadius: 4 } };
  return (
    <div className="max-w-[620px] mx-auto px-5 py-14">
      <h1 className="text-[38px] mb-2" style={{ fontFamily: HEAD, fontWeight: 300 }}>CONTACT</h1>
      <p className="text-neutral-600 text-[14px] mb-8">Commission a print, ask about custom sizes, or just say hello.</p>
      <input placeholder="Your name" value={f.name} onChange={set("name")} {...inp} />
      <input placeholder="Email address" value={f.email} onChange={set("email")} {...inp} />
      <textarea placeholder="Message" rows={5} value={f.msg} onChange={set("msg")} {...inp} />
      <Pill onClick={() => { setF({ name: "", email: "", msg: "" }); toast("Message sent — Doron will be in touch"); }} style={{ width: "100%" }}>Send message</Pill>
    </div>
  );
}
