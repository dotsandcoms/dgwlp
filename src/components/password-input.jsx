"use client";
import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const baseInp = {
  className: "w-full py-3.5 px-4 text-[14px] outline-none bg-white",
  style: { border: `1px solid #e6e6e3`, borderRadius: 4 },
};

/** Password field with show/hide toggle. */
export function PasswordInput({ value, onChange, placeholder = "Password", autoComplete = "current-password", className, style }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={className || baseInp.className}
        style={{ ...(style || baseInp.style), paddingRight: 44 }}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
        aria-label={show ? "Hide password" : "Show password"}
        tabIndex={-1}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
