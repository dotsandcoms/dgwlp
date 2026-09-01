"use client";
import React, { useRef, useState, useCallback, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";

const baseInp = {
  className: "w-full py-3.5 px-4 text-[14px] outline-none bg-white",
  style: { border: `1px solid #e6e6e3`, borderRadius: 4 },
};

/** Password field with show/hide toggle. */
export function PasswordInput({
  value,
  onChange,
  placeholder = "Password",
  autoComplete = "current-password",
  name = "password",
  className,
  style,
  id,
}) {
  const [show, setShow] = useState(false);
  const inputRef = useRef(null);

  const syncFromDom = useCallback(() => {
    const el = inputRef.current;
    if (!el || !onChange) return;
    if (el.value !== (value ?? "")) {
      onChange({ target: el, currentTarget: el });
    }
  }, [onChange, value]);

  const toggleVisibility = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    syncFromDom();
    setShow((s) => !s);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      const len = el.value.length;
      try {
        el.setSelectionRange(len, len);
      } catch {
        // Some input types ignore selection
      }
    });
  }, [syncFromDom]);

  // Browser password managers autofill without firing React onChange — sync when detected.
  useEffect(() => {
    const el = inputRef.current;
    if (!el || !onChange) return undefined;

    const onAutoFill = () => syncFromDom();
    el.addEventListener("change", onAutoFill);

    const onAnim = (e) => {
      if (e.animationName === "dg-autofill-start") onAutoFill();
    };
    el.addEventListener("animationstart", onAnim);

    return () => {
      el.removeEventListener("change", onAutoFill);
      el.removeEventListener("animationstart", onAnim);
    };
  }, [onChange, syncFromDom]);

  const mergedStyle = { ...(style || baseInp.style), paddingRight: 44 };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        name={name}
        type={show ? "text" : "password"}
        value={value ?? ""}
        onChange={onChange}
        onInput={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`${className || baseInp.className} dg-password-input`}
        style={mergedStyle}
      />
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={toggleVisibility}
        className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
      >
        {show ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
      </button>
    </div>
  );
}
