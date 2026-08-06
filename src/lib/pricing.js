// Brand tokens + domain model. Pure module — safe on server and client.

export const C = {
  green: "#556B2F", greenDark: "#3f5122", greenSoft: "#eef1e8",
  ink: "#1a1a1a", dark: "#141412", gray: "#6b7280", line: "#e6e6e3",
  wall: "#eceae6", floor: "#cdbfa8",
};
export const HEAD = '"Jost","Poppins","Century Gothic","Futura",system-ui,sans-serif';
export const BODY = '"Poppins","Nunito Sans",system-ui,sans-serif';
export const zar = (n) => "R" + Number(n || 0).toLocaleString("en-ZA");

export const CATEGORY_NAMES = ["Big Cats", "Elephants", "Rhino", "Plains Game", "Birds", "Landscapes", "Black & White"];
export const PROVINCES = ["Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape", "Free State", "Limpopo", "Mpumalanga", "North West", "Northern Cape"];

export const RATIOS = {
  landscape: { label: "Landscape 3:2", ar: "3 / 2", sizes: ["600x400", "900x600", "1200x800", "1500x1000"] },
  portrait: { label: "Portrait 4:3", ar: "3 / 4", sizes: ["400x300", "800x600", "1200x900", "1600x1200"] },
  pano: { label: "Panoramic 3:1", ar: "3 / 1", sizes: ["1200x400", "1800x600", "2400x800"] },
  pan2: { label: "Wide Pan 2:1", ar: "2 / 1", sizes: ["800x400", "1000x500", "1200x600", "2000x1000"] },
};

// [paper, paper_framed, canvas_rolled, canvas_framed, canvas_mounted]
export const MATERIALS = [
  { id: "paper", label: "Paper — unframed", i: 0, framed: false },
  { id: "paper_framed", label: "Paper — framed", i: 1, framed: true },
  { id: "canvas_rolled", label: "Canvas — rolled", i: 2, framed: false },
  { id: "canvas_framed", label: "Canvas — framed", i: 3, framed: true },
  { id: "canvas_mounted", label: "Canvas — mounted", i: 4, framed: false },
];

export const PRICING = {
  "600x400": [1500, 2300, 1500, 2300, 1900], "900x600": [2000, 3200, 2000, 3200, 2700],
  "1200x800": [2800, 5300, 2800, 5300, 3900], "1500x1000": [3700, 7500, 3700, 7500, 4900],
  "1200x400": [2500, 5300, 2500, 5300, 4100], "1800x600": [3700, 7600, 3700, 7600, 5300],
  "2400x800": [5900, 9800, 5900, 9800, 7600], "800x400": [1600, 2900, 1600, 2900, 2100],
  "1000x500": [2100, 3400, 2100, 3400, 2700], "1200x600": [2800, 5300, 2800, 5300, 3900],
  "2000x1000": [4000, 7900, 4000, 7900, 6300], "400x300": [1500, 2300, 1500, 2300, 1900],
  "800x600": [2000, 3200, 2000, 3200, 2700], "1200x900": [2800, 5300, 2800, 5300, 3900],
  "1600x1200": [3700, 7500, 3700, 7500, 4900],
};

export const SCALE = {
  "600x400": 34, "900x600": 44, "1200x800": 56, "1500x1000": 66, "400x300": 24, "800x600": 32,
  "1200x900": 42, "1600x1200": 52, "1200x400": 72, "1800x600": 82, "2400x800": 92,
  "800x400": 46, "1000x500": 54, "1200x600": 62, "2000x1000": 84,
};

export const FRAME_COLOURS = [
  { id: "black", label: "Black", c: "#141414" },
  { id: "white", label: "White", c: "#fdfdfd" },
  { id: "oak", label: "Natural oak", c: "#b7955c" },
];

export const ROOMS = [
  { id: "lounge", label: "Lounge" }, { id: "bedroom", label: "Bedroom" },
  { id: "study", label: "Study" }, { id: "gallery", label: "Gallery" },
];

export const sizesOf = (p) => (RATIOS[p.ratio] || RATIOS.landscape).sizes;
export const priceOf = (size, matId) => PRICING[size][MATERIALS.find((m) => m.id === matId).i];
export const rangeOf = (p) => {
  const all = [];
  sizesOf(p).forEach((s) => PRICING[s].forEach((v) => all.push(v)));
  return [Math.min(...all), Math.max(...all)];
};
export const sizeLabel = (s) => { const [w, h] = s.split("x"); return `${w} × ${h} mm`; };
