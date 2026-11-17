import { sitePages } from "@/experiences/registry";
import type { MediaSlot } from "@/shared/media/types";
import { slotsA } from "../slots";
import { slotsPages } from "./slots-pages";

export const BASE = "/wonderverse";

/** The opening frame of each Wonderverse page (also the menu preview). */
const PAGE_SLOTS: Record<(typeof sitePages)[number]["path"], MediaSlot> = {
  "": slotsA.hero,
  "/attractions": slotsA.dusk,
  "/food-and-shows": slotsPages.foodHero,
  "/plan": slotsA.visit,
  "/tickets": slotsA.night2,
};

/** Wonderverse site map, in the order of the shared registry (so switching worlds lands on the same page). */
export const PAGES_A = sitePages.map((p, i) => ({
  n: String(i + 1).padStart(2, "0"),
  path: p.path,
  href: `${BASE}${p.path}`,
  label: p.label,
  slot: PAGE_SLOTS[p.path],
}));

export const pageHref = (path: (typeof sitePages)[number]["path"]) => `${BASE}${path}`;
export const rideHref = (slug: string) => `${BASE}/attractions/${slug}`;

/** The page a pathname belongs to ("/wonderverse/attractions/x" → Attractions). */
export function pageFor(pathname: string) {
  const rest = pathname.replace(/^\/wonderverse/, "").replace(/\/$/, "");
  return [...PAGES_A].reverse().find((p) => (p.path === "" ? rest === "" : rest === p.path || rest.startsWith(`${p.path}/`))) ?? PAGES_A[0];
}
