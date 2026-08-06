/** Load the Google Maps JS API (Places) once per page. */

const CALLBACK = "__dgMapsReady";

let loading = null;

export function mapsKey() {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
}

export function loadGoogleMaps() {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.google?.maps?.places) return Promise.resolve(window.google);
  if (loading) return loading;

  const key = mapsKey();
  if (!key) return Promise.reject(new Error("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"));

  loading = new Promise((resolve, reject) => {
    const prev = window[CALLBACK];
    window[CALLBACK] = () => {
      if (typeof prev === "function") prev();
      resolve(window.google);
    };
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&callback=${CALLBACK}`;
    s.async = true;
    s.defer = true;
    s.onerror = () => {
      loading = null;
      reject(new Error("Failed to load Google Maps"));
    };
    document.head.appendChild(s);
  });

  return loading;
}
