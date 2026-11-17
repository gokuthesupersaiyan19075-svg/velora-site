import { attractionsIn, zone, type Attraction } from "@/park/content";
import type { MediaSlot } from "@/shared/media/types";
import { rideSlot } from "./slots-pages";

/** Thrillverse's own way of grouping the shared attractions (presentation only; the content stays in src/park). */
export type RideTag = "coaster" | "thrill" | "water" | "adventure";
export type RideFilterId = "all" | RideTag;

export const TAG_LABEL: Record<RideTag, string> = { coaster: "Coaster", thrill: "Thrill", water: "Extreme water", adventure: "Adventure" };
export const RIDE_FILTERS: { id: RideFilterId; label: string }[] = [
  { id: "all", label: "All rides" },
  { id: "coaster", label: "Coasters" },
  { id: "thrill", label: "Thrill" },
  { id: "water", label: "Extreme water" },
  { id: "adventure", label: "Adventure" },
];

export function rideTag(a: Attraction): RideTag {
  if (a.category === "water") return "water";
  if (a.category === "adventure") return "adventure";
  return /coaster/i.test(a.type) ? "coaster" : "thrill";
}

export type ThrillRide = { ride: Attraction; tag: RideTag; slot: MediaSlot; zoneName: string; href: string };

export const rideHref = (slug: string) => `/thrillverse/attractions/${slug}`;

export function thrillRides(): ThrillRide[] {
  return attractionsIn("thrillverse").map((ride) => ({ ride, tag: rideTag(ride), slot: rideSlot(ride.slug), zoneName: zone(ride.zone).name, href: rideHref(ride.slug) }));
}

/** Same group first, then same zone, never the ride itself. */
export function relatedRides(slug: string, count = 3): ThrillRide[] {
  const all = thrillRides();
  const me = all.find((r) => r.ride.slug === slug);
  if (!me) return [];
  const others = all.filter((r) => r.ride.slug !== slug);
  const score = (r: ThrillRide) => (r.tag === me.tag ? 2 : 0) + (r.ride.zone === me.ride.zone ? 1 : 0);
  return [...others].sort((a, b) => score(b) - score(a)).slice(0, count);
}

export const intensityLabel = (v: Attraction["facts"]["intensity"]) => (v ? v[0].toUpperCase() + v.slice(1) : null);
