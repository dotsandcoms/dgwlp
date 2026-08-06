"use client";
import React, { useState } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import { C, HEAD, PROVINCES } from "@/lib/pricing";
import { Pill } from "./primitives";

const inp = { className: "w-full py-3 px-3 text-[14px] outline-none", style: { border: `1px solid ${C.line}`, borderRadius: 4 } };

export function RegisterForm({ onDone, compact }) {
  const [f, setF] = useState({ name: "", email: "", pass: "", phone: "", street: "", suburb: "", city: "", province: PROVINCES[0], postal: "", notes: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const ready = f.name && f.email && f.pass && f.street && f.city && f.postal;
  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <input placeholder="Full name" value={f.name} onChange={set("name")} {...inp} />
        <input placeholder="Email address" type="email" value={f.email} onChange={set("email")} {...inp} />
        <input placeholder="Password" type="password" value={f.pass} onChange={set("pass")} {...inp} />
        <input placeholder="Mobile number" value={f.phone} onChange={set("phone")} {...inp} />
      </div>
      <div className="text-[13px] tracking-[.1em] text-neutral-500 mt-4 mb-2 flex items-center gap-2" style={{ fontFamily: HEAD }}><MapPin size={14} /> DELIVERY ADDRESS</div>
      <input placeholder="Street address" value={f.street} onChange={set("street")} {...inp} />
      <div className="grid sm:grid-cols-2 gap-3 my-3">
        <input placeholder="Suburb" value={f.suburb} onChange={set("suburb")} {...inp} />
        <input placeholder="City" value={f.city} onChange={set("city")} {...inp} />
        <div className="relative">
          <select value={f.province} onChange={set("province")} className="w-full appearance-none py-3 px-3 text-[14px] outline-none" style={{ border: `1px solid ${C.line}`, borderRadius: 4 }}>
            {PROVINCES.map((p) => <option key={p}>{p}</option>)}
          </select><ChevronDown size={15} className="absolute right-3 top-3.5 pointer-events-none" />
        </div>
        <input placeholder="Postal code" value={f.postal} onChange={set("postal")} {...inp} />
      </div>
      <input placeholder="Delivery notes (optional — gate code, etc.)" value={f.notes} onChange={set("notes")} {...inp} />
      <div className="mt-5">
        <Pill onClick={() => ready && onDone({ name: f.name, email: f.email, pass: f.pass, phone: f.phone, address: { street: f.street, suburb: f.suburb, city: f.city, province: f.province, postal: f.postal, notes: f.notes } })}
          style={{ width: "100%", opacity: ready ? 1 : .5, pointerEvents: ready ? "auto" : "none" }}>
          {compact ? "Create account & continue →" : "Create account"}
        </Pill>
      </div>
    </div>
  );
}

export function LoginForm({ onDone }) {
  const [f, setF] = useState({ email: "", pass: "" });
  const ready = f.email && f.pass;
  return (
    <div>
      <input placeholder="Email address" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} {...inp} />
      <div className="h-3" />
      <input placeholder="Password" type="password" value={f.pass} onChange={(e) => setF({ ...f, pass: e.target.value })} {...inp} />
      <div className="mt-5"><Pill onClick={() => ready && onDone({ email: f.email, pass: f.pass })} style={{ width: "100%", opacity: ready ? 1 : .5, pointerEvents: ready ? "auto" : "none" }}>Sign in</Pill></div>
    </div>
  );
}
