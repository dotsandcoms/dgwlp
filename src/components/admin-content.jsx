"use client";
import React, { useEffect, useRef, useState } from "react";
import { Loader2, Save, FileText } from "lucide-react";
import { C, HEAD } from "@/lib/pricing";
import { DEFAULT_SITE_CONTENT, mergeSiteContent, getHowSteps } from "@/lib/site-content";
import { friendlyError } from "@/lib/errors";
import * as db from "@/lib/admin-data";
import { Pill } from "./primitives";

const inp = {
  className: "w-full py-2.5 px-3 text-[14px] outline-none bg-white resize-y",
  style: { border: `1px solid ${C.line}`, borderRadius: 4 },
};

const SECTIONS = [
  {
    id: "home",
    title: "Home page",
    hint: "Hero intro, how-it-works steps, and the about teaser.",
    fields: [
      { key: "intro", label: "Introduction paragraph", rows: 4 },
    ],
    howSteps: true,
    moreFields: [
      { key: "aboutTeaser", label: "About teaser (A life behind the lens)", rows: 3 },
    ],
  },
  {
    id: "about",
    title: "About page",
    hint: "Hero subtitle, story paragraphs, quote, and shop CTA blurb.",
    fields: [
      { key: "heroSubtitle", label: "Hero subtitle", rows: 2 },
      { key: "openingP1", label: "Opening paragraph 1", rows: 4 },
      { key: "openingP2", label: "Opening paragraph 2", rows: 3 },
      { key: "changeFocusP1", label: "A change of focus — paragraph 1", rows: 4 },
      { key: "changeFocusP2", label: "A change of focus — paragraph 2", rows: 3 },
      { key: "workP1", label: "The work — paragraph 1", rows: 4 },
      { key: "workP2", label: "The work — paragraph 2", rows: 4 },
      { key: "workP3", label: "The work — paragraph 3", rows: 3 },
      { key: "quote", label: "Quote", rows: 2 },
      { key: "ctaBlurb", label: "Shop CTA blurb", rows: 2 },
    ],
  },
  {
    id: "contact",
    title: "Contact page",
    hint: "Orders note, sidebar note, and closing band blurb.",
    fields: [
      { key: "ordersNote", label: "Orders line", rows: 2 },
      { key: "sidebarCta", label: "Sidebar note", rows: 3 },
      { key: "closingBlurb", label: "Closing band blurb", rows: 2 },
    ],
  },
  {
    id: "account",
    title: "Account page",
    fields: [{ key: "browseBlurb", label: "Continue collecting blurb", rows: 2 }],
  },
];

function Field({ label, value, onChange, rows = 3, input = "textarea" }) {
  return (
    <label className="block mb-4 last:mb-0">
      <span className="block text-[12px] tracking-[.08em] text-neutral-500 mb-1.5" style={{ fontFamily: HEAD }}>{label}</span>
      {input === "input" ? (
        <input type="text" value={value} onChange={onChange} className={inp.className.replace("resize-y", "")} style={inp.style} />
      ) : (
        <textarea value={value} onChange={onChange} rows={rows} {...inp} />
      )}
    </label>
  );
}

function HowStepsFields({ steps, onChange }) {
  return (
    <div className="mb-2">
      <p className="text-[12px] tracking-[.1em] text-neutral-500 mb-4" style={{ fontFamily: HEAD }}>HOW IT WORKS</p>
      {steps.map((step, i) => (
        <div key={step.n || i} className="mb-5 pb-5 last:pb-0 last:mb-0" style={{ borderBottom: i < steps.length - 1 ? `1px solid ${C.line}` : undefined }}>
          <p className="text-[11px] tracking-[.12em] text-neutral-400 mb-3" style={{ fontFamily: HEAD }}>STEP {step.n || String(i + 1).padStart(2, "0")}</p>
          <Field
            label="Title"
            input="input"
            value={step.title}
            onChange={(e) => onChange(i, "title", e.target.value)}
            rows={1}
          />
          <Field
            label="Body"
            value={step.body}
            onChange={(e) => onChange(i, "body", e.target.value)}
            rows={2}
          />
        </div>
      ))}
    </div>
  );
}

/** Admin editor for marketing copy stored in site_settings.content */
export function LiveContent({ toast }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState(() => mergeSiteContent());
  const [openId, setOpenId] = useState("home");
  const toastRef = useRef(toast);
  toastRef.current = toast;

  useEffect(() => {
    let cancelled = false;
    db.fetchSiteContent()
      .then((data) => { if (!cancelled) setContent(data); })
      .catch((e) => toastRef.current(friendlyError(e, "Failed to load site content")))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const setField = (page, key) => (e) => {
    setContent((prev) => ({
      ...prev,
      [page]: { ...prev[page], [key]: e.target.value },
    }));
  };

  const setHowStep = (index, key, value) => {
    setContent((prev) => {
      const current = getHowSteps(prev.home || {});
      const howSteps = current.map((s, i) => (i === index ? { title: s.title, body: s.body, [key]: value } : { title: s.title, body: s.body }));
      return { ...prev, home: { ...prev.home, howSteps } };
    });
  };

  const resetSection = (pageId) => {
    setContent((prev) => ({
      ...prev,
      [pageId]: { ...DEFAULT_SITE_CONTENT[pageId] },
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const saved = await db.saveSiteContent(content);
      setContent(saved);
      toast("Site content saved");
    } catch (e) {
      toast(friendlyError(e, "Failed to save site content"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center gap-2 text-neutral-500 text-[14px]">
        <Loader2 size={16} className="animate-spin" /> Loading content…
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[20px] mb-1" style={{ fontFamily: HEAD }}>Site content</h2>
          <p className="text-[13px] text-neutral-500 max-w-xl">
            Edit text shown on the home, about, contact, and account pages. Changes go live after you save.
          </p>
        </div>
        <Pill onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Pill>
      </div>

      <div className="space-y-3">
        {SECTIONS.map((section) => {
          const open = openId === section.id;
          return (
            <section key={section.id} className="bg-white overflow-hidden" style={{ border: `1px solid ${C.line}`, borderRadius: 8 }}>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : section.id)}
                className="w-full flex items-center gap-3 p-4 sm:p-5 text-left"
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: C.greenSoft, color: C.green }}>
                  <FileText size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[16px]" style={{ fontFamily: HEAD }}>{section.title}</h3>
                  {section.hint && !open && <p className="text-[12px] text-neutral-500 mt-0.5 truncate">{section.hint}</p>}
                </div>
              </button>
              {open && (
                <div className="px-4 sm:px-5 pb-5 pt-0">
                  {section.hint && <p className="text-[13px] text-neutral-500 mb-5 -mt-1">{section.hint}</p>}
                  {(section.fields || []).map((field) => (
                    <Field
                      key={field.key}
                      label={field.label}
                      rows={field.rows}
                      value={content[section.id]?.[field.key] || ""}
                      onChange={setField(section.id, field.key)}
                    />
                  ))}
                  {section.howSteps && (
                    <HowStepsFields
                      steps={getHowSteps(content.home || {})}
                      onChange={setHowStep}
                    />
                  )}
                  {(section.moreFields || []).map((field) => (
                    <Field
                      key={field.key}
                      label={field.label}
                      rows={field.rows}
                      value={content[section.id]?.[field.key] || ""}
                      onChange={setField(section.id, field.key)}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => resetSection(section.id)}
                    className="text-[12px] text-neutral-500 hover:text-neutral-700 mt-2"
                  >
                    Reset {section.title.toLowerCase()} to defaults
                  </button>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
