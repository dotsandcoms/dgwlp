"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import { C, HEAD, PROVINCES } from "@/lib/pricing";
import { loadGoogleMaps, mapsKey } from "@/lib/google-maps";
import { parseGoogleAddress, emptyAddress, isSouthAfrica } from "@/lib/address";

const inp = {
  className: "w-full py-3.5 px-4 text-[14px] outline-none bg-white",
  style: { border: `1px solid ${C.line}`, borderRadius: 4 },
};

/**
 * Delivery address fields with Google Places autocomplete on the street line.
 * Worldwide Places — when a suggestion is chosen outside South Africa, onDestinationHint("international") fires.
 */
export function AddressFields({
  value,
  onChange,
  showNotes = true,
  notesPlaceholder = "Delivery notes (optional — gate code, etc.)",
  international = false,
  onDestinationHint,
}) {
  const f = value || emptyAddress();
  const streetRef = useRef(null);
  const acRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const onHintRef = useRef(onDestinationHint);
  const valueRef = useRef(f);
  const [mapsReady, setMapsReady] = useState(false);
  const [mapsError, setMapsError] = useState("");

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onHintRef.current = onDestinationHint; }, [onDestinationHint]);
  useEffect(() => { valueRef.current = f; }, [f]);

  const patch = (partial) => onChange({ ...f, ...partial });
  const set = (k) => (e) => {
    const next = { ...f, [k]: e.target.value };
    onChange(next);
    if (k === "country" && e.target.value) {
      onHintRef.current?.(isSouthAfrica(e.target.value) ? "za" : "international");
    }
  };

  const detach = useCallback(() => {
    if (acRef.current && window.google?.maps?.event) {
      window.google.maps.event.clearInstanceListeners(acRef.current);
    }
    acRef.current = null;
  }, []);

  const attach = useCallback((input, google) => {
    if (!input || !google?.maps?.places) return;
    detach();
    // No country restriction — used to detect SA vs international automatically.
    const ac = new google.maps.places.Autocomplete(input, {
      fields: ["address_components", "formatted_address", "name"],
      types: ["address"],
    });
    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      if (!place?.address_components?.length) return;
      const parsed = parseGoogleAddress(place.address_components);
      if (!parsed.street && place.name) parsed.street = place.name;
      const za = isSouthAfrica(parsed.country || parsed.countryCode);
      const next = {
        ...valueRef.current,
        ...parsed,
        street: parsed.street || valueRef.current.street,
        destination: za ? "za" : "international",
        // Clear SA-only province when going international
        province: za ? (parsed.province || valueRef.current.province) : (parsed.province || ""),
      };
      onChangeRef.current(next);
      onHintRef.current?.(za ? "za" : "international");
    });
    acRef.current = ac;
    setMapsReady(true);
    setMapsError("");
  }, [detach]);

  useEffect(() => {
    if (!mapsKey()) {
      detach();
      setMapsReady(false);
      setMapsError("");
      return undefined;
    }

    let cancelled = false;
    let tries = 0;
    let timer = 0;

    const tryAttach = (google) => {
      if (cancelled) return;
      const input = streetRef.current;
      if (input) {
        attach(input, google);
        return;
      }
      if (tries++ < 20) {
        timer = window.setTimeout(() => tryAttach(google), 50);
      }
    };

    loadGoogleMaps()
      .then((google) => {
        requestAnimationFrame(() => tryAttach(google));
      })
      .catch(() => {
        if (!cancelled) setMapsError("Address search unavailable — enter details manually.");
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      detach();
      setMapsReady(false);
    };
  }, [attach, detach]);

  return (
    <div className="min-w-0 w-full max-w-full">
      <div className="text-[13px] tracking-[.1em] text-neutral-500 mb-2 flex items-center gap-2" style={{ fontFamily: HEAD }}>
        <MapPin size={14} /> DELIVERY ADDRESS
      </div>
      {mapsKey() && mapsReady && (
        <p className="text-[12px] text-neutral-500 mb-2">
          Start typing your street — pick a suggestion to autofill the rest.
          {!international && " Addresses outside South Africa switch to international shipping automatically."}
        </p>
      )}
      {mapsError && <p className="text-[12px] text-amber-700 mb-2">{mapsError}</p>}

      <input
        ref={streetRef}
        placeholder="Street address"
        value={f.street}
        onChange={set("street")}
        autoComplete="off"
        {...inp}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-3 min-w-0">
        <input placeholder="Suburb / area" value={f.suburb || ""} onChange={set("suburb")} autoComplete="address-level3" {...inp} />
        <input placeholder="City" value={f.city} onChange={set("city")} autoComplete="address-level2" {...inp} />
        {international ? (
          <input placeholder="Country" value={f.country || ""} onChange={set("country")} autoComplete="country-name" {...inp} />
        ) : (
          <div className="relative">
            <select
              value={f.province}
              onChange={set("province")}
              className="w-full appearance-none py-3.5 px-4 text-[14px] outline-none bg-white"
              style={{ border: `1px solid ${C.line}`, borderRadius: 4 }}
              autoComplete="address-level1"
            >
              {PROVINCES.map((p) => <option key={p}>{p}</option>)}
            </select>
            <ChevronDown size={15} className="absolute right-3 top-3.5 pointer-events-none" />
          </div>
        )}
        <input placeholder="Postal / ZIP code" value={f.postal} onChange={set("postal")} autoComplete="postal-code" {...inp} />
      </div>
      {showNotes && (
        <input placeholder={notesPlaceholder} value={f.notes} onChange={set("notes")} {...inp} />
      )}
    </div>
  );
}
