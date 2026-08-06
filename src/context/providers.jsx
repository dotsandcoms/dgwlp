"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { browserClient, hasSupabase } from "@/lib/supabase";

/* ------------------------------- Toast ----------------------------- */
const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((msg) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);
  return <ToastCtx.Provider value={{ toast, toasts }}>{children}</ToastCtx.Provider>;
}

/* -------------------------------- Cart ----------------------------- */
const CartCtx = createContext(null);
export const useCart = () => useContext(CartCtx);

function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try { const s = localStorage.getItem("dg_cart"); if (s) setItems(JSON.parse(s)); } catch {}
    setReady(true);
  }, []);
  useEffect(() => { if (ready) { try { localStorage.setItem("dg_cart", JSON.stringify(items)); } catch {} } }, [items, ready]);

  const add = (item) => setItems((c) => [...c, item]);
  const remove = (key) => setItems((c) => c.filter((i) => i.key !== key));
  const setQty = (key, d) => setItems((c) => c.map((i) => i.key === key ? { ...i, qty: Math.max(1, i.qty + d) } : i));
  const clear = () => setItems([]);
  const count = items.reduce((n, i) => n + i.qty, 0);
  const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);

  return (
    <CartCtx.Provider value={{ items, add, remove, setQty, clear, count, subtotal, open, setOpen }}>
      {children}
    </CartCtx.Provider>
  );
}

/* -------------------------------- Auth ----------------------------- */
const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try { const s = localStorage.getItem("dg_user"); if (s) setUser(JSON.parse(s)); } catch {}
    setReady(true);
  }, []);
  const persist = (u) => { setUser(u); try { u ? localStorage.setItem("dg_user", JSON.stringify(u)) : localStorage.removeItem("dg_user"); } catch {} };

  // Registration also captures the delivery address. When Supabase is
  // configured we create a real auth user + profile + address; otherwise
  // we keep the profile locally so the flow works in demo mode.
  const register = async (data) => {
    if (hasSupabase) {
      try {
        const sb = browserClient();
        const { data: auth, error } = await sb.auth.signUp({
          email: data.email, password: data.pass || Math.random().toString(36),
          options: { data: { full_name: data.name } },
        });
        if (!error && auth?.user) {
          await sb.from("profiles").upsert({ id: auth.user.id, full_name: data.name, phone: data.phone });
          if (data.address) await sb.from("addresses").insert({ user_id: auth.user.id, ...data.address, is_default: true });
        }
      } catch {}
    }
    persist({ name: data.name, email: data.email, phone: data.phone, address: data.address || null });
  };

  const login = async (data) => {
    if (hasSupabase) {
      try { await browserClient().auth.signInWithPassword({ email: data.email, password: data.pass }); } catch {}
    }
    const name = data.name || data.email.split("@")[0].replace(/\b\w/g, (c) => c.toUpperCase());
    persist({ name, email: data.email, phone: "", address: data.address || null });
  };

  const logout = async () => {
    if (hasSupabase) { try { await browserClient().auth.signOut(); } catch {} }
    persist(null);
  };

  return <AuthCtx.Provider value={{ user, ready, register, login, logout, setUser: persist }}>{children}</AuthCtx.Provider>;
}

/* ------------------------------ wrapper ---------------------------- */
export function Providers({ children }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>{children}</CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
