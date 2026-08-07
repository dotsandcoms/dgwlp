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

      {/* CTA — parallax backdrop */}
      <section className="relative overflow-hidden" style={{ minHeight: 420 }}>
        <Parallax speed={0.28} className="absolute inset-0" style={{ top: "-18%", height: "136%" }}>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${siteImage("about2.jpg")})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        </Parallax>
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(20,20,18,.55),rgba(20,20,18,.72))" }} />
        <div className="relative max-w-[720px] mx-auto px-5 py-24 sm:py-32 text-center text-white">
          <Reveal>
            <h2 className="text-[28px] sm:text-[36px] mb-4" style={{ fontFamily: HEAD, fontWeight: 300 }}>Bring the wild home</h2>
          </Reveal>
          <Reveal delay={80}>
            <p className="text-[15px] text-white/80 mb-8 max-w-md mx-auto">
              Signed, limited-edition archival prints from the Kruger, Kgalagadi and beyond.
            </p>
          </Reveal>
          <Reveal delay={140}>
            <Link href="/shop"><Pill>Explore the collection →</Pill></Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

export function Contact() {
  const { toast } = useToast();
  const [f, setF] = useState({ name: "", email: "", subject: "", msg: "", company: "" });
  const [sending, setSending] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const inp = {
    className: "w-full py-3.5 px-4 text-[14px] outline-none bg-white/95",
    style: { border: `1px solid ${C.line}`, borderRadius: 4 },
  };

  const submit = async () => {
    if (f.company) {
      toast("Message sent — Doron will be in touch");
      return;
    }
    if (!f.name.trim() || !f.email.trim() || !f.msg.trim()) {
      toast("Please fill in your name, email and message");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.name.trim(),
          email: f.email.trim(),
          subject: f.subject.trim(),
          msg: f.msg.trim(),
          company: f.company,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast(data.error === "Too many requests" ? "Please wait a moment before sending again" : "Could not send — try again shortly");
        return;
      }
      setF({ name: "", email: "", subject: "", msg: "", company: "" });
      toast("Message sent — Doron will be in touch");
    } catch {
      toast("Could not send — check your connection");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: C.dark, minHeight: "62vh" }}>
        <div className="absolute inset-0">
          <Parallax speed={0.22} className="absolute inset-0" style={{ top: "-12%", height: "124%" }}>
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${siteImage("contact1.jpg")})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "grayscale(1) contrast(1.05)",
              }}
            />
          </Parallax>
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(20,20,18,.45) 0%,rgba(20,20,18,.78) 100%)" }} />
        </div>

        <div className="relative max-w-[1240px] mx-auto px-5 py-24 sm:py-32 flex flex-col justify-end min-h-[62vh]">
          <Reveal>
            <p className="tracking-[.28em] text-[12px] sm:text-[13px] mb-4" style={{ fontFamily: HEAD, color: C.green }}>SAY HELLO</p>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="text-white text-[44px] sm:text-[68px] leading-[0.92] font-light" style={{ fontFamily: HEAD, letterSpacing: ".02em" }}>
              CONTACT
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="mt-6 text-[16px] sm:text-[18px] leading-relaxed text-white/80 max-w-lg" style={{ fontFamily: HEAD, fontWeight: 300 }}>
              Commission a print, ask about custom sizes, or simply share what drew you to a frame.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Intro + form */}
      <section className="relative" style={{ background: `linear-gradient(180deg, #f7f5f0 0%, #fff 40%)` }}>
        <div className="max-w-[1100px] mx-auto px-5 py-16 sm:py-24 grid lg:grid-cols-12 gap-12 lg:gap-16">
          <div className="lg:col-span-5">
            <Reveal>
              <p className="text-[12px] tracking-[.22em] mb-3" style={{ fontFamily: HEAD, color: C.green }}>GET IN TOUCH</p>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="text-[28px] sm:text-[36px] leading-tight mb-6" style={{ fontFamily: HEAD, fontWeight: 300 }}>
                Let’s talk about the wild.
              </h2>
            </Reveal>
            <Reveal delay={140}>
              <p className="text-[15px] leading-relaxed text-neutral-600 mb-10">
                Whether you’re choosing a first print for your home or looking for a larger commission, Doron and the team are happy to help with sizing, finishes and framing.
              </p>
            </Reveal>

            <Reveal delay={200}>
              <div className="space-y-6">
                {[
                  { label: "Email", value: "orders@dgwlp.co.za", href: "mailto:orders@dgwlp.co.za" },
                  { label: "Studio", value: "Johannesburg, South Africa" },
                  { label: "Orders", value: "Archival paper & canvas · shipped nationwide" },
                ].map((item) => (
                  <div key={item.label} style={{ borderBottom: `1px solid ${C.line}` }} className="pb-5">
                    <div className="text-[11px] tracking-[.18em] text-neutral-500 mb-1.5" style={{ fontFamily: HEAD }}>{item.label.toUpperCase()}</div>
                    {item.href ? (
                      <a href={item.href} className="text-[16px] hover:opacity-70" style={{ fontFamily: HEAD, color: C.ink }}>{item.value}</a>
                    ) : (
                      <div className="text-[16px]" style={{ fontFamily: HEAD }}>{item.value}</div>
                    )}
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal delay={280}>
              <div className="mt-10 p-5" style={{ background: C.greenSoft, borderRadius: 6 }}>
                <p className="text-[13px] leading-relaxed text-neutral-700">
                  Looking for something specific? Browse the{" "}
                  <Link href="/shop" style={{ color: C.green, fontFamily: HEAD }}>collection</Link>
                  {" "}or read more{" "}
                  <Link href="/about" style={{ color: C.green, fontFamily: HEAD }}>about Doron</Link>.
                </p>
              </div>
            </Reveal>
          </div>

          <div className="lg:col-span-7">
            <Reveal delay={120}>
              <div className="p-6 sm:p-8 bg-white" style={{ border: `1px solid ${C.line}`, borderRadius: 8, boxShadow: "0 18px 50px rgba(20,20,18,.06)" }}>
                <h3 className="text-[18px] mb-1" style={{ fontFamily: HEAD }}>Send a message</h3>
                <p className="text-[13px] text-neutral-500 mb-6">We’ll get back to you as soon as we can.</p>

                <div className="grid sm:grid-cols-2 gap-3 mb-3">
                  <input placeholder="Your name" value={f.name} onChange={set("name")} autoComplete="name" {...inp} />
                  <input placeholder="Email address" type="email" value={f.email} onChange={set("email")} autoComplete="email" {...inp} />
                </div>
                {/* honeypot — leave empty */}
                <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", top: "auto", width: 1, height: 1, overflow: "hidden" }}>
                  <label>Company<input tabIndex={-1} autoComplete="off" value={f.company} onChange={set("company")} /></label>
                </div>
                <input placeholder="Subject (optional)" value={f.subject} onChange={set("subject")} className={`${inp.className} mb-3`} style={inp.style} />
                <textarea placeholder="How can we help?" rows={6} value={f.msg} onChange={set("msg")} className={`${inp.className} mb-5 resize-y`} style={inp.style} />
                <Pill onClick={submit} disabled={sending} style={{ width: "100%" }}>
                  {sending ? "Sending…" : "Send message"}
                </Pill>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Closing band */}
      <section className="relative overflow-hidden" style={{ minHeight: 320 }}>
        <Parallax speed={0.26} className="absolute inset-0" style={{ top: "-16%", height: "132%" }}>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${siteImage("contact2.jpg")})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "grayscale(1) contrast(1.04)",
            }}
          />
        </Parallax>
        <div className="absolute inset-0" style={{ background: "rgba(20,20,18,.68)" }} />
        <div className="relative max-w-[720px] mx-auto px-5 py-20 sm:py-24 text-center text-white">
          <Reveal>
            <p className="text-[12px] tracking-[.28em] mb-4" style={{ fontFamily: HEAD, color: C.green }}>THE COLLECTION</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="text-[28px] sm:text-[36px] mb-4 font-light" style={{ fontFamily: HEAD }}>Prefer to browse first?</h2>
          </Reveal>
          <Reveal delay={140}>
            <p className="text-[15px] text-white/75 mb-8 max-w-md mx-auto">
              Explore signed, limited-edition prints from the Kruger, Kgalagadi and beyond.
            </p>
          </Reveal>
          <Reveal delay={200}>
            <Link href="/shop"><Pill>View the collection →</Pill></Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

