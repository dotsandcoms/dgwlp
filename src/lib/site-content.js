/** Editable marketing copy — stored in site_settings.content */

export const HOW_STEP_NUMBERS = ["01", "02", "03"];

export const DEFAULT_SITE_CONTENT = {
  home: {
    intro:
      "Having spent the past sixty years visiting the Kruger, Kgalagadi and Timbavati, Doron has developed a deep connection with the wild. Every frame is a window into the animal world — a moment captured in time and printed to last a lifetime.",
    howSteps: [
      {
        title: "Choose your print",
        body: "Browse the collection and find the frame that belongs on your wall.",
      },
      {
        title: "Size & finish",
        body: "Select paper or canvas, framing, and the size that suits your space.",
      },
      {
        title: "Delivered to you",
        body: "Archival production and careful packing — couriered across South Africa and International.",
      },
    ],
    aboutTeaser:
      "After decades as a dentist, Doron turned a lifelong love of the African bush into high quality wildlife photographs — patience and precision, reframed.",
  },
  about: {
    heroSubtitle:
      "From the dental chair to the African bush — a life of precision, patience, and a deep love of wildlife.",
    openingP1:
      "Doron Goldstein spent 33 years as a dentist, building a career founded on dedication, precision, patience, and an unwavering commitment to his patients. Following neck surgery, he was left with a partially paralysed arm, forcing him into an unexpected and premature retirement.",
    openingP2:
      "What initially felt like a devastating setback became an opportunity to pursue a lifelong passion that had always been waiting in the wings… The African bush and its wildlife.",
    changeFocusP1:
      "In many ways, wildlife photography demands many of the same qualities as dentistry. It requires patience, technical skill, careful observation, attention to detail, and knowing that the smallest movement can make all the difference. Those qualities naturally found a new home behind the lens of a camera.",
    changeFocusP2:
      "Having visited the Kruger National Park well over 100 times and the Kgalagadi Transfrontier Park on 15 occasions, his transition into wildlife photography felt less like discovering a new passion and more like deepening one that had existed for a lifetime.",
    workP1:
      "For Doron, wildlife photography is about far more than taking beautiful photographs. It is about immersing himself in nature, waiting patiently for hours, and capturing authentic moments that reveal not only an animal’s beauty, but also its personality, behaviour and place within the wild.",
    workP2:
      "Through his photographs, he invites others to experience the wonder of the natural world as he sees it. His images preserve moments that exist for only a fraction of a second, yet tell stories that endure long afterwards. Each photograph reflects his deep respect for wildlife and his belief that nature is something to be admired, protected and celebrated.",
    workP3:
      "His work demonstrates that retirement does not have to mark the closing of one chapter — it can be the beginning of another. What started as an unexpected consequence of adversity has become a creative pursuit filled with purpose, discovery and fulfilment.",
    quote:
      "Wildlife photography has reminded me that every ending can become the beginning of something new and special.",
    ctaBlurb: "High Quality wildlife prints from the Kruger, Kgalagadi and beyond.",
  },
  contact: {
    ordersNote: "SA Shipping Free · International Shipped to be quoted on request",
    sidebarCta:
      "Looking for something specific? Browse the collection or contact us so we can fulfill your specific requirements.",
    closingBlurb: "Explore high quality wildlife prints from the Kruger National Park, Greater Kruger and Kgalagadi Transfrontier Park.",
  },
  account: {
    browseBlurb: "High Quality wildlife prints from the Kruger, Kgalagadi and beyond.",
  },
};

/** Home page “How it works” steps with display numbers. */
export function getHowSteps(home = {}) {
  const defaults = DEFAULT_SITE_CONTENT.home.howSteps;
  let steps = defaults;

  if (Array.isArray(home.howSteps)) {
    steps = defaults.map((d, i) => ({
      title: home.howSteps[i]?.title ?? d.title,
      body: home.howSteps[i]?.body ?? d.body,
    }));
  } else if (home.howStep3) {
    steps = defaults.map((d, i) => (i === 2 ? { ...d, body: home.howStep3 } : d));
  }

  return steps.map((s, i) => ({
    n: HOW_STEP_NUMBERS[i] || String(i + 1).padStart(2, "0"),
    title: s.title,
    body: s.body,
  }));
}

function mergeHowSteps(partialHome = {}) {
  const defaults = DEFAULT_SITE_CONTENT.home.howSteps;
  if (Array.isArray(partialHome.howSteps)) {
    return defaults.map((d, i) => ({
      title: partialHome.howSteps[i]?.title ?? d.title,
      body: partialHome.howSteps[i]?.body ?? d.body,
    }));
  }
  if (partialHome.howStep3) {
    return defaults.map((d, i) => (i === 2 ? { ...d, body: partialHome.howStep3 } : d));
  }
  return defaults.map((d) => ({ ...d }));
}

export function mergeSiteContent(partial = {}) {
  const p = partial || {};
  const out = {};
  for (const page of Object.keys(DEFAULT_SITE_CONTENT)) {
    out[page] = { ...DEFAULT_SITE_CONTENT[page], ...(p[page] || {}) };
    if (page === "home") {
      out.home.howSteps = mergeHowSteps(p.home || {});
      delete out.home.howStep3;
    }
  }
  return out;
}
