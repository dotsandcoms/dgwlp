import { PROVINCES } from "@/lib/pricing";

/** Map a Google / free-text province string onto our PROVINCES list. */
export function matchProvince(raw) {
  if (!raw) return PROVINCES[0];
  const n = String(raw).toLowerCase().replace(/\s+province$/, "").trim();
  const hit = PROVINCES.find(
    (p) => p.toLowerCase() === n || n.includes(p.toLowerCase()) || p.toLowerCase().includes(n)
  );
  return hit || PROVINCES[0];
}

/** True when a country name / ISO code refers to South Africa. */
export function isSouthAfrica(country) {
  const n = String(country || "").trim().toLowerCase();
  if (!n) return false;
  return (
    n === "za" ||
    n === "zaf" ||
    n === "south africa" ||
    n === "republic of south africa" ||
    n.includes("south africa")
  );
}

/**
 * Parse Google Places address_components into our form shape.
 * @param {google.maps.GeocoderAddressComponent[]} components
 */
export function parseGoogleAddress(components = []) {
  const get = (...types) => {
    for (const t of types) {
      const c = components.find((x) => x.types.includes(t));
      if (c) return c.long_name;
    }
    return "";
  };
  const getShort = (...types) => {
    for (const t of types) {
      const c = components.find((x) => x.types.includes(t));
      if (c) return c.short_name;
    }
    return "";
  };

  const streetNumber = get("street_number");
  const route = get("route");
  const street = [streetNumber, route].filter(Boolean).join(" ").trim()
    || get("premise")
    || "";

  const suburb =
    get("sublocality_level_1", "sublocality", "neighborhood", "sublocality_level_2") || "";

  const city =
    get("locality", "postal_town", "administrative_area_level_2") || "";

  const countryLong = get("country") || "";
  const countryCode = getShort("country") || "";
  const provinceRaw = get("administrative_area_level_1");
  const province = isSouthAfrica(countryLong || countryCode)
    ? matchProvince(provinceRaw)
    : (provinceRaw || "");
  const postal = get("postal_code") || "";

  return {
    street,
    suburb,
    city,
    province,
    postal,
    country: countryLong || countryCode || "",
    countryCode: countryCode || "",
  };
}

/** Shape for Supabase `addresses` insert (maps `postal` → `postal_code`). */
export function toDbAddress(addr, userId) {
  if (!addr) return null;
  return {
    user_id: userId,
    street: addr.street || "",
    suburb: addr.suburb || null,
    city: addr.city || "",
    province: addr.province || PROVINCES[0],
    postal_code: addr.postal || addr.postal_code || "",
    notes: addr.notes || null,
    is_default: true,
  };
}

export const emptyAddress = () => ({
  destination: "za", // "za" | "international"
  street: "",
  suburb: "",
  city: "",
  province: PROVINCES[0],
  country: "",
  postal: "",
  notes: "",
});
