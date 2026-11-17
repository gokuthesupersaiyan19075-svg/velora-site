/** The entrance redesigns shown under /studio/entrance. */
export const ENTRANCE_VARIATIONS = [
  { slug: "gate", name: "The Gate", description: "Two worlds meet at a glowing seam; push it with the pointer, wheel or keys until one world opens full screen." },
  { slug: "ticket", name: "The Ticket", description: "An oversized double pass that tilts and shimmers; tear off a stub and its world fills the screen." },
  { slug: "night-sky", name: "The Night Sky", description: "The park from above as dusk turns to night; two districts light up as constellations and you fly into one." },
  { slug: "marquee", name: "The Marquee", description: "The park sign as a wall of bulbs: VELORA lights letter by letter, then each world's film plays through the bulbs. Choose one and its bulbs swell into the clear film." },
  { slug: "track", name: "The Switch Track", description: "A coaster station at sunset. Throw the points: the gentle line rolls to the Ferris wheel, the other climbs into a loop. Ride it and the portal opens around you." },
] as const;

export type EntranceSlug = (typeof ENTRANCE_VARIATIONS)[number]["slug"];
