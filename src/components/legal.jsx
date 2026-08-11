"use client";
import React from "react";
import { X } from "lucide-react";
import { C, HEAD } from "@/lib/pricing";

export const LEGAL_DOCS = {
  terms: {
    title: "Terms & conditions",
    eyebrow: "LEGAL",
    sections: [
      {
        heading: "About these terms",
        body: "These terms apply when you browse or buy from Doron Goldstein Photography (the “Site”). By placing an order you agree to them. If you have questions, contact us before you purchase.",
      },
      {
        heading: "Products",
        body: "We sell signed, limited-edition fine-art photographic prints on archival paper and canvas. Images on the Site are representative; slight variation in colour can occur between screen and print. Edition details and finishes are as described on each product page at the time of order.",
      },
      {
        heading: "Orders & payment",
        body: "Orders are confirmed once payment is successfully processed (or, for international shipping quotes, once we have agreed shipping and taken payment). Prices are shown in South African rand (ZAR). Any USD amount shown is an approximate guide only and is not charged. We reserve the right to cancel an order if an item is unavailable, mispriced, or payment fails — in that case we will refund any amount already taken.",
      },
      {
        heading: "Copyright",
        body: "All photographs and Site content remain the copyright of Doron Goldstein / Doron Goldstein Photography. Purchase of a print is for personal display only. You may not reproduce, publish, redistribute, or commercially exploit the image without written permission.",
      },
      {
        heading: "Returns",
        body: "Because prints are made to order and signed, we do not offer change-of-mind returns. If your order arrives damaged or defective, please contact us within 7 days of delivery with photos of the packaging and print so we can arrange a repair, replacement, or refund as appropriate.",
      },
      {
        heading: "Liability",
        body: "To the fullest extent permitted by South African law, our liability for any claim arising from an order is limited to the amount you paid for that order. Nothing in these terms excludes rights you have under the Consumer Protection Act that cannot be limited.",
      },
      {
        heading: "Changes",
        body: "We may update these terms from time to time. The version in force when you place an order applies to that order.",
      },
    ],
  },
  shipping: {
    title: "Shipping terms",
    eyebrow: "DELIVERY",
    sections: [
      {
        heading: "South Africa",
        body: "We ship nationwide by courier. Standard and express options (and any free-shipping threshold) are shown at checkout and may change. Delivery times are estimates from dispatch and exclude weekends and public holidays. You are responsible for providing a complete, accurate address and any access notes.",
      },
      {
        heading: "International",
        body: "International shipping is quoted on request and is not charged automatically at checkout. Request a quote from checkout or Contact with your destination and cart details. We will confirm cost, timing, and any customs implications before you pay for shipping.",
      },
      {
        heading: "Unframed for overseas",
        body: "Where enabled in our store settings, international orders are limited to unframed finishes (for safer packing and shipping). Framed options remain available for South African delivery.",
      },
      {
        heading: "Packing & risk",
        body: "Prints are packed for courier transport. Risk of loss or damage passes to you on delivery to the address supplied, except where damage is due to our packing failure — report that within 7 days as set out in our Terms.",
      },
      {
        heading: "Delays & customs",
        body: "We are not responsible for delays caused by the courier, weather, incorrect addresses, or customs clearance. International buyers are responsible for any import duties, taxes, or brokerage fees charged in their country.",
      },
      {
        heading: "Tracking",
        body: "Where tracking is available, we will share it once your order has shipped. If you have not received tracking or your parcel within a reasonable time after dispatch, contact us and we will follow up with the courier.",
      },
    ],
  },
};

/**
 * Scrollable legal document modal (terms or shipping).
 */
export function LegalModal({ docKey, onClose }) {
  const doc = LEGAL_DOCS[docKey];
  if (!doc) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0"
        style={{ background: "rgba(20,20,18,.55)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
        onClick={onClose}
      />
      <div
        className="relative w-full sm:max-w-[640px] max-h-[90vh] bg-white flex flex-col overflow-hidden sm:rounded-2xl rounded-t-2xl"
        style={{ boxShadow: "0 24px 80px rgba(0,0,0,.28)" }}
      >
        <div
          className="shrink-0 px-5 sm:px-6 pt-5 pb-4 flex items-start justify-between gap-4"
          style={{ borderBottom: `1px solid ${C.line}`, background: `linear-gradient(180deg, ${C.greenSoft}, #fff 88%)` }}
        >
          <div>
            <p className="text-[11px] tracking-[.2em] mb-1" style={{ fontFamily: HEAD, color: C.green }}>{doc.eyebrow}</p>
            <h2 id="legal-modal-title" className="text-[24px] sm:text-[28px] leading-none" style={{ fontFamily: HEAD, fontWeight: 300 }}>
              {doc.title}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/5 shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-6">
          {doc.sections.map((s) => (
            <section key={s.heading}>
              <h3 className="text-[15px] mb-2" style={{ fontFamily: HEAD }}>{s.heading}</h3>
              <p className="text-[14px] leading-relaxed text-neutral-600">{s.body}</p>
            </section>
          ))}
          <p className="text-[12px] text-neutral-400 pt-2" style={{ borderTop: `1px solid ${C.line}` }}>
            Doron Goldstein Photography · Johannesburg, South Africa
          </p>
        </div>

        <div className="shrink-0 px-5 sm:px-6 py-4 flex justify-end" style={{ borderTop: `1px solid ${C.line}` }}>
          <button
            type="button"
            onClick={onClose}
            className="text-[13px] px-5 py-2.5 rounded-full text-white"
            style={{ background: C.green, fontFamily: HEAD }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
