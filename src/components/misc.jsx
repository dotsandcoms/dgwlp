"use client";
import React, { useState } from "react";
import Link from "next/link";
import { C, HEAD } from "@/lib/pricing";
import { Plate, Reveal, Pill } from "./primitives";
import { useToast } from "@/context/providers";

export function About({ portrait }) {
  return (
    <div>
      <div style={{ background: C.dark }} className="text-white">
        <div className="max-w-[1240px] mx-auto px-5 py-16 grid md:grid-cols-2 gap-12 items-center">
          <Reveal><Plate product={portrait} style={{ width: "100%", aspectRatio: "3/4", borderRadius: 4 }} /></Reveal>
          <div>
            <Reveal><h1 className="text-[42px] sm:text-[64px] leading-none" style={{ fontFamily: HEAD, fontWeight: 300 }}>DORON <span style={{ color: C.green }}>GOLDSTEIN</span></h1></Reveal>
            <Reveal delay={100}><p className="mt-3 text-neutral-400 text-[15px]" style={{ fontFamily: HEAD }}>Wildlife Photographer</p></Reveal>
            <Reveal delay={200}><div className="mt-6 space-y-4 text-[14px] leading-relaxed opacity-90">
              <p>Doron Goldstein spent 33 years as a dentist — a career built on dedication, precision and patience. Following neck surgery that left him with a partially paralysed arm, he was forced into an early retirement. What felt like a devastating setback became the doorway to a lifelong passion: the African bush and its wildlife.</p>
              <p>Wildlife photography demands many of the same qualities as dentistry — patience, technical skill, careful observation, and knowing that the smallest movement can make all the difference. Having visited the Kruger National Park well over 100 times and the Kgalagadi Transfrontier Park on 15 occasions, the transition felt less like a new passion and more like deepening one that had existed for a lifetime.</p>
              <p className="italic" style={{ color: C.green }}>“Wildlife photography has reminded me that every ending can become the beginning of something new and special.”</p>
            </div></Reveal>
          </div>
        </div>
      </div>
      <div className="max-w-[1240px] mx-auto px-5 py-16 text-center">
        <Reveal><h2 className="text-[26px] sm:text-[34px] mb-6" style={{ fontFamily: HEAD, fontWeight: 300 }}>Bring the wild home</h2>
          <Link href="/shop"><Pill>Explore the collection →</Pill></Link></Reveal>
      </div>
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
