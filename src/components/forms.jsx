"use client";
import React, { useState } from "react";
import { C, HEAD } from "@/lib/pricing";
import { Pill } from "./primitives";
import { AddressFields } from "./address-fields";
import { emptyAddress } from "@/lib/address";

const inp = {
  className: "w-full py-3.5 px-4 text-[14px] outline-none bg-white",
  style: { border: `1px solid ${C.line}`, borderRadius: 4 },
};

export function RegisterForm({ onDone, compact }) {
  const [f, setF] = useState({ name: "", email: "", pass: "", phone: "" });
  const [addr, setAddr] = useState(emptyAddress);
  // Honeypot — bots fill this; humans never see it
  const [hp, setHp] = useState("");

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const ready = f.name && f.email && f.pass && addr.street && addr.city && addr.postal;

  const submit = () => {
    if (hp) return; // silently drop bots
    if (!ready) return;
    onDone({
      name: f.name.trim(),
      email: f.email.trim(),
      pass: f.pass,
      phone: f.phone.trim(),
      address: { ...addr },
    });
  };

  return (
    <div>
      {!compact && (
        <div className="mb-5">
          <h3 className="text-[18px] mb-1" style={{ fontFamily: HEAD }}>Your details</h3>
          <p className="text-[13px] text-neutral-500">We’ll use these for orders and delivery updates.</p>
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <input placeholder="Full name" value={f.name} onChange={set("name")} autoComplete="name" {...inp} />
        <input placeholder="Email address" type="email" value={f.email} onChange={set("email")} autoComplete="email" {...inp} />
        <input placeholder="Password" type="password" value={f.pass} onChange={set("pass")} autoComplete="new-password" {...inp} />
        <input placeholder="Mobile number" value={f.phone} onChange={set("phone")} autoComplete="tel" {...inp} />
      </div>

      {/* honeypot */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", top: "auto", width: 1, height: 1, overflow: "hidden" }}>
        <label>Company<input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} /></label>
      </div>

      <div className="mt-5">
        <AddressFields value={addr} onChange={setAddr} />
      </div>

      <div className="mt-6">
        <Pill onClick={submit} style={{ width: "100%", opacity: ready ? 1 : .5, pointerEvents: ready ? "auto" : "none" }}>
          {compact ? "Create account & continue →" : "Create account"}
        </Pill>
      </div>
    </div>
  );
}

export function LoginForm({ onDone }) {
  const [f, setF] = useState({ email: "", pass: "" });
  const [hp, setHp] = useState("");
  const ready = f.email && f.pass;
  return (
    <div>
      <p className="text-[13px] text-neutral-500 mb-5">Enter the email and password for your collector account.</p>
      <input placeholder="Email address" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" {...inp} />
      <div className="h-3" />
      <input placeholder="Password" type="password" value={f.pass} onChange={(e) => setF({ ...f, pass: e.target.value })} autoComplete="current-password" {...inp} />
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", top: "auto", width: 1, height: 1, overflow: "hidden" }}>
        <label>Company<input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} /></label>
      </div>
      <div className="mt-6">
        <Pill
          onClick={() => { if (hp || !ready) return; onDone({ email: f.email.trim(), pass: f.pass }); }}
          style={{ width: "100%", opacity: ready ? 1 : .5, pointerEvents: ready ? "auto" : "none" }}
        >
          Sign in
        </Pill>
      </div>
    </div>
  );
}
