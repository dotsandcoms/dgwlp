// Demo catalogue used until you connect Supabase (or add real products).
import { siteImage } from "./supabase";
const P = (o) => ({ colour: "bw", ratio: "landscape", image: null, ...o });

export const MOCK_PRODUCTS = [
  P({ id: "leopard-colour", slug: "leopard-colour", name: "Leopard — Colour", category: "Big Cats", colour: "colour",
    grad: ["#7c5f36", "#d9c39a"], angle: 120, sku: "leopard-c",
    desc: "The Leopard (Panthera pardus) is a sleek and powerful big cat known for its golden coat with black rosettes. Stealthy, strong and incredibly adaptable, leopards thrive across Africa and Asia — masters of camouflage and one of the most elusive predators in the wild." }),
  P({ id: "leopard-bw", slug: "leopard", name: "Leopard", category: "Big Cats", grad: ["#333", "#9a9a97"], angle: 135, sku: "leopard",
    desc: "Low in the golden grass of the Timbavati, this leopard holds Doron's gaze with the quiet intensity that defines his work." }),
  P({ id: "lion", slug: "lion", name: "Lion", category: "Big Cats", grad: ["#2b2b2b", "#8f8b83"], angle: 110, sku: "lion",
    desc: "A full-maned male photographed at first light in the Kruger — a study of stillness and restrained power." }),
  P({ id: "lioness", slug: "lioness", name: "Lioness", category: "Big Cats", grad: ["#33322e", "#a49f94"], angle: 150, sku: "lioness",
    desc: "A lioness on the move across the open plains, her attention fixed far beyond the frame." }),
  P({ id: "rhino", slug: "rhino", name: "Rhino", category: "Rhino", grad: ["#3d3d3d", "#9c9a95"], angle: 100, sku: "rhino",
    desc: "Two white rhino locked in a dusty standoff — a fragile, fiercely protected icon of the African bush." }),
  P({ id: "zebra", slug: "zebra", name: "Zebra", category: "Plains Game", ratio: "portrait", grad: ["#1f1f1f", "#efefef"], angle: 90, sku: "zebra",
    desc: "This rare image of a Zebra is a once-in-a-lifetime encounter — she looks almost as if she is inviting Doron in to take her photograph. The tones of this print sit best with earthy, natural interiors, making any room feel part of the wild." }),
  P({ id: "elephant", slug: "elephant-herd", name: "Elephant Herd", category: "Elephants", ratio: "pan2", image: siteImage("elephant-herd.jpg"), grad: ["#3a3733", "#a7a29a"], angle: 130, sku: "ele",
    desc: "A breeding herd moving together through the dust. Over sixty years of Kruger visits distilled into a single frame." }),
  P({ id: "lone-bull", slug: "lone-bull", name: "Lone Bull", category: "Elephants", ratio: "pano", image: siteImage("elephant-plains.jpg"), grad: ["#3a3733", "#a7a29a"], angle: 120, sku: "bull",
    desc: "A single bull crossing the open, storm-lit plains — small against the vastness of the wild. A panoramic study of scale and solitude." }),
  P({ id: "wildebeest-herd", slug: "wildebeest-herd", name: "Wildebeest Herd", category: "Plains Game", ratio: "pano", image: siteImage("wildebeest-herd.jpg"), grad: ["#2e2e2e", "#b7b4ad"], angle: 110, sku: "wildeherd",
    desc: "A long line of blue wildebeest strung out beneath an ancient Kalahari camelthorn — the herd moving as one across the Kgalagadi." }),
  P({ id: "wildebeest", slug: "wildebeest-at-dawn", name: "Wildebeest at Dawn", category: "Black & White", ratio: "landscape", image: siteImage("hero.jpg"), grad: ["#2e2e2e", "#b7b4ad"], angle: 115, sku: "wilde",
    desc: "Kgalagadi dawn — a line of wildebeest emerging through mist and dust, from one of fifteen trips Doron has made to the Transfrontier Park." }),
  P({ id: "kgalagadi", slug: "kgalagadi-mist", name: "Kgalagadi Mist", category: "Landscapes", ratio: "pano", grad: ["#40403c", "#c9c6bf"], angle: 100, sku: "kgm",
    desc: "First light burning through the Kalahari dust. A panoramic study of space, silence and scale." }),
];

export const MOCK_CATEGORIES = ["Big Cats", "Elephants", "Rhino", "Plains Game", "Birds", "Landscapes", "Black & White"];

export const MOCK_ORDERS = [
  {
    id: "DG-1042",
    date: "28 Jul 2026",
    itemsSummary: "Leopard — Colour · Paper framed · Large",
    itemCount: 1,
    subtotal: 5300,
    shipping: 0,
    total: 5300,
    status: "Delivered",
    pay: "PayFast",
    tracking: "CN458291037ZA",
    delivery: { street: "14 Rosebank Avenue", suburb: "Parktown North", city: "Johannesburg", province: "Gauteng", postal: "2193" },
    lines: [
      { name: "Leopard — Colour", summary: "Paper — framed · 1200 × 800 mm · Black", qty: 1, price: 5300, colour: "colour", ratio: "landscape", grad: ["#7c5f36", "#d9c39a"], angle: 120 },
    ],
  },
  {
    id: "DG-1039",
    date: "21 Jul 2026",
    itemsSummary: "Elephant Herd · Canvas mounted +1",
    itemCount: 2,
    subtotal: 6300,
    shipping: 300,
    total: 6600,
    status: "Shipped",
    pay: "Paystack",
    tracking: "CN458188204ZA",
    delivery: { street: "14 Rosebank Avenue", suburb: "Parktown North", city: "Johannesburg", province: "Gauteng", postal: "2193" },
    lines: [
      { name: "Elephant Herd", summary: "Canvas — mounted · 1200 × 600 mm", qty: 1, price: 3900, colour: "bw", ratio: "pan2", image: siteImage("elephant-herd.jpg"), grad: ["#3a3733", "#a7a29a"], angle: 130 },
      { name: "Wildebeest at Dawn", summary: "Paper — unframed · 900 × 600 mm", qty: 1, price: 2400, colour: "bw", ratio: "landscape", image: siteImage("hero.jpg"), grad: ["#2e2e2e", "#b7b4ad"], angle: 115 },
    ],
  },
  {
    id: "DG-1031",
    date: "02 Jul 2026",
    itemsSummary: "Lion · Canvas framed · XL",
    itemCount: 1,
    subtotal: 7500,
    shipping: 0,
    total: 7500,
    status: "Delivered",
    pay: "PayFast",
    tracking: null,
    delivery: { street: "14 Rosebank Avenue", suburb: "Parktown North", city: "Johannesburg", province: "Gauteng", postal: "2193" },
    lines: [
      { name: "Lion", summary: "Canvas — framed · 1500 × 1000 mm · Oak", qty: 1, price: 7500, colour: "bw", ratio: "landscape", grad: ["#2b2b2b", "#8f8b83"], angle: 110 },
    ],
  },
];
export const SALES = [{ m: "Feb", v: 18400 }, { m: "Mar", v: 26900 }, { m: "Apr", v: 22200 }, { m: "May", v: 34800 }, { m: "Jun", v: 31500 }, { m: "Jul", v: 47200 }];
