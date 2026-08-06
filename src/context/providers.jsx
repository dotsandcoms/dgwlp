"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { browserClient, hasSupabase } from "@/lib/supabase";
import { checkIsAdmin } from "@/lib/admin-data";
import { stashPendingProfile, flushPendingProfile, signupMeta, saveDeliveryProfile, fetchMyProfile } from "@/lib/auth-profile";

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
  const [sessionUser, setSessionUser] = useState(null); // real Supabase auth.users row
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminReady, setAdminReady] = useState(!hasSupabase);

  useEffect(() => {
    try { const s = localStorage.getItem("dg_user"); if (s) setUser(JSON.parse(s)); } catch {}
    setReady(true);
  }, []);
  const persist = (u) => { setUser(u); try { u ? localStorage.setItem("dg_user", JSON.stringify(u)) : localStorage.removeItem("dg_user"); } catch {} };

  // Track the real Supabase session (separate from the local demo `user`
  // above) so RLS-gated admin checks reflect who is actually signed in.
  // When Supabase is configured, this is also the source of truth for the
  // header's logged-in display — a stale local `dg_user` blob must never
  // show "logged in" when there's no real session behind it.
  useEffect(() => {
    if (!hasSupabase) return;
    const sb = browserClient();
    let cancelled = false;

    const syncAdmin = async (authUser) => {
      setSessionUser(authUser || null);
      setAdminReady(false);
      try {
        if (authUser) {
          // Don't let profile/address sync block admin detection (menu shortcut).
          void flushPendingProfile(authUser);
          try {
            const profile = await fetchMyProfile(authUser);
            if (!cancelled) persist(profile);
          } catch {
            if (!cancelled) {
              persist({
                name: authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "",
                email: authUser.email || "",
                phone: "",
                address: null,
              });
            }
          }
          const admin = await checkIsAdmin();
          if (!cancelled) setIsAdmin(admin);
        } else {
          persist(null);
          if (!cancelled) setIsAdmin(false);
        }
      } finally {
        if (!cancelled) setAdminReady(true);
      }
    };

    // Recover session from email-confirm hash (#access_token=…) if present
    const boot = async () => {
      if (typeof window !== "undefined" && window.location.hash?.includes("access_token")) {
        const path = window.location.pathname || "/";
        if (!path.startsWith("/auth/callback")) {
          // Send confirm links that land on "/" to the dedicated callback handler
          window.location.replace(`/auth/callback${window.location.hash}`);
          return;
        }
      }
      const { data } = await sb.auth.getSession();
      await syncAdmin(data?.session?.user || null);
    };
    boot();
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => syncAdmin(session?.user || null));
    return () => { cancelled = true; sub?.subscription?.unsubscribe(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Registration also captures the delivery address. When Supabase is
  // configured we create a real auth user + profile + address, and the
  // session listener above takes over the logged-in display; otherwise we
  // keep the profile locally so the flow works in demo mode. Throws on a
  // real Supabase failure so the caller can show what actually went wrong.
  const register = async (data) => {
    if (hasSupabase) {
      const sb = browserClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { data: auth, error } = await sb.auth.signUp({
        email: data.email,
        password: data.pass || Math.random().toString(36),
        options: {
          // Trigger handle_new_user() reads these into profiles + addresses
          data: signupMeta(data),
          emailRedirectTo: origin ? `${origin}/auth/callback` : undefined,
        },
      });
      if (error) throw error;

      // Always stash so confirm/login can repair if the trigger didn't run yet
      stashPendingProfile(data);

      if (!auth?.session) {
        return { needsConfirmation: true };
      }

      // Immediate session — also write via RPC (idempotent with the trigger)
      if (auth?.user) {
        await saveDeliveryProfile(auth.user, data);
        try { localStorage.removeItem("dg_pending_profile"); } catch {}
      }
      return { needsConfirmation: false };
    }
    persist({ name: data.name, email: data.email, phone: data.phone, address: data.address || null });
    return { needsConfirmation: false };
  };

  const login = async (data) => {
    if (hasSupabase) {
      const sb = browserClient();
      const { data: auth, error } = await sb.auth.signInWithPassword({ email: data.email, password: data.pass });
      if (error) throw error;
      if (auth?.user) await flushPendingProfile(auth.user);
      return;
    }
    const name = data.name || data.email.split("@")[0].replace(/\b\w/g, (c) => c.toUpperCase());
    persist({ name, email: data.email, phone: "", address: data.address || null });
  };

  const updateProfile = async (data) => {
    if (hasSupabase) {
      const sb = browserClient();
      const { data: sess } = await sb.auth.getSession();
      const authUser = sess?.session?.user;
      if (!authUser) throw new Error("Please sign in again.");
      const result = await saveDeliveryProfile(authUser, data);
      if (!result.ok) throw result.error || new Error("Could not save profile");
      // Keep auth metadata in sync for display fallbacks
      try {
        await sb.auth.updateUser({
          data: {
            full_name: data.name || "",
            phone: data.phone || "",
          },
        });
      } catch {}
      // Prefer freshly saved values so a slow/failed re-fetch can't blank the UI
      const saved = {
        name: data.name || "",
        email: authUser.email || user?.email || "",
        phone: data.phone || "",
        address: data.address?.street ? data.address : null,
      };
      try {
        const profile = await fetchMyProfile(authUser);
        const merged = {
          name: profile.name || saved.name,
          email: profile.email || saved.email,
          phone: profile.phone || saved.phone,
          address: profile.address || saved.address,
        };
        persist(merged);
        return merged;
      } catch {
        persist(saved);
        return saved;
      }
    }
    const next = {
      name: data.name,
      email: user?.email || data.email || "",
      phone: data.phone || "",
      address: data.address || null,
    };
    persist(next);
    return next;
  };

  const logout = async () => {
    if (hasSupabase) { await browserClient().auth.signOut(); return; }
    persist(null);
  };

  return <AuthCtx.Provider value={{ user, ready, register, login, logout, updateProfile, setUser: persist, sessionUser, isAdmin, adminReady }}>{children}</AuthCtx.Provider>;
}

/* ---------------------------- Auth modal --------------------------- */
const AuthModalCtx = createContext(null);
export const useAuthModal = () => useContext(AuthModalCtx);

function AuthModalProvider({ children }) {
  const [state, setState] = useState({ open: false, mode: "login", next: "/account" });

  const openAuth = useCallback((mode = "login", next = "/account") => {
    const safeNext = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
    setState({
      open: true,
      mode: mode === "register" ? "register" : "login",
      next: safeNext,
    });
  }, []);

  const closeAuth = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
  }, []);

  return (
    <AuthModalCtx.Provider value={{ ...state, openAuth, closeAuth }}>
      {children}
    </AuthModalCtx.Provider>
  );
}

/* ------------------------------ wrapper ---------------------------- */
export function Providers({ children }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <AuthModalProvider>
          <CartProvider>{children}</CartProvider>
        </AuthModalProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
