"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { User, LogOut, MapPin } from "lucide-react";
import { C, HEAD, zar } from "@/lib/pricing";
import { MOCK_ORDERS } from "@/lib/mock";
import { Pill, StatusBadge } from "./primitives";
import { RegisterForm, LoginForm } from "./forms";
import { useAuth, useToast } from "@/context/providers";

export function AuthView() {
  const { register, login } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [tab, setTab] = useState("register");
  return (
    <div className="max-w-[560px] mx-auto px-5 py-12">
      <h1 className="text-[34px] mb-6" style={{ fontFamily: HEAD, fontWeight: 300 }}>{tab === "register" ? "CREATE ACCOUNT" : "SIGN IN"}</h1>
      <div className="flex gap-2 mb-6">
        {[["register", "Register"], ["login", "Sign in"]].map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} className="text-[13px] px-4 py-2 rounded-full" style={{ background: tab === id ? C.green : "transparent", color: tab === id ? "#fff" : C.gray, border: `1px solid ${tab === id ? C.green : C.line}`, fontFamily: HEAD }}>{l}</button>
        ))}
      </div>
      {tab === "register"
        ? <RegisterForm onDone={async (d) => { await register(d); toast(`Welcome, ${d.name.split(" ")[0]}`); router.push("/account"); }} />
        : <LoginForm onDone={async (d) => { await login(d); toast("Welcome back"); router.push("/account"); }} />}
    </div>
  );
}

export function AccountView() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  if (!user) return (
    <div className="max-w-[560px] mx-auto px-5 py-24 text-center">
      <User size={38} color={C.gray} className="mx-auto mb-5" />
      <h2 className="text-[26px] mb-3" style={{ fontFamily: HEAD, fontWeight: 300 }}>You're not signed in</h2>
      <Pill onClick={() => router.push("/auth")}>Sign in or register</Pill>
    </div>
  );
  return (
    <div className="max-w-[1040px] mx-auto px-5 py-12">
      <div className="flex items-center justify-between mb-8">
        <div><h1 className="text-[34px]" style={{ fontFamily: HEAD, fontWeight: 300 }}>MY ACCOUNT</h1><p className="text-neutral-500 text-[14px]">Welcome back, {user.name.split(" ")[0]}.</p></div>
        <button onClick={async () => { await logout(); toast("Signed out"); router.push("/"); }} className="flex items-center gap-2 text-[13px] text-neutral-500"><LogOut size={16} /> Sign out</button>
      </div>
      <div className="grid md:grid-cols-3 gap-8">
        <div className="p-5 rounded-lg h-fit" style={{ border: `1px solid ${C.line}` }}>
          <h3 className="text-[13px] tracking-[.1em] mb-3 text-neutral-500" style={{ fontFamily: HEAD }}>PROFILE</h3>
          <div className="text-[14px]" style={{ fontFamily: HEAD }}>{user.name}</div>
          <div className="text-[13px] text-neutral-600">{user.email}</div>
          {user.phone && <div className="text-[13px] text-neutral-600">{user.phone}</div>}
          {user.address && <>
            <div className="text-[13px] tracking-[.1em] mt-4 mb-1 text-neutral-500 flex items-center gap-1" style={{ fontFamily: HEAD }}><MapPin size={13} /> DELIVERY</div>
            <div className="text-[13px] text-neutral-600 leading-relaxed">{user.address.street}<br />{user.address.suburb && <>{user.address.suburb}<br /></>}{user.address.city}, {user.address.province}<br />{user.address.postal}</div>
          </>}
        </div>
        <div className="md:col-span-2">
          <h3 className="text-[14px] tracking-[.1em] mb-4" style={{ fontFamily: HEAD }}>ORDER HISTORY</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[14px]" style={{ minWidth: 480 }}>
              <thead><tr className="text-left text-neutral-500 text-[12px]" style={{ borderBottom: `1px solid ${C.line}` }}>{["ORDER", "DATE", "ITEMS", "TOTAL", "STATUS"].map((h) => <th key={h} className="py-3 font-normal">{h}</th>)}</tr></thead>
              <tbody>{MOCK_ORDERS.map((o) => (
                <tr key={o.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                  <td className="py-4" style={{ fontFamily: HEAD }}>{o.id}</td><td className="text-neutral-600">{o.date}</td>
                  <td className="text-neutral-600">{o.items}</td><td>{zar(o.total)}</td><td><StatusBadge s={o.status} /></td>
                </tr>))}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
