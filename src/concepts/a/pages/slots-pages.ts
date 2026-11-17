import { poolSlot } from "@/shared/media/pools";
import type { AssetCategory, MediaSlot } from "@/shared/media/types";
import { slotsA } from "../slots";

// Extra frames for the Wonderverse inner pages. Candidates come only from the Wonderverse pool.
// Where a home-page slot already shows the right subject it is reused (see RIDE_SLOTS / VENUE_SLOTS),
// so only the frames below are new. `from: []` keeps each list to hand-picked subjects, so a frame
// never falls back to a shot that is already used elsewhere on the same page.
const s = (key: string, needs: string, preferred: string[], from: AssetCategory[] = []): MediaSlot => poolSlot("wonderverse", key, needs, preferred, from);

export const slotsPages = {
  bumperBay: s("attractions.bumper-bay", "Bumper Bay: bumper cars with riders laughing", ["pexels-5486824", "pixabay-5626", "pexels-15895632"]),
  whirligig: s("attractions.whirligig", "Whirligig: a colourful family spinning ride", ["pexels-32820838", "pexels-8522321", "pexels-1748439"]),
  littleComet: s("attractions.little-comet", "Little Comet: a small junior coaster with gentle hills", ["pexels-9445929", "pexels-31466062"]),
  cascadeSlides: s("attractions.cascade-slides", "Cascade Slides: a tower of twisting water slides", ["pexels-2605030", "pexels-13177212", "pexels-31166924"]),
  midwayKitchen: s("food.midway-kitchen", "Midway Kitchen: people gathered at a food stand", ["pexels-15721552", "pexels-4512876"]),
  nightMarket: s("food.lantern-night-market", "Lantern Night Market: street-food stalls under lights", ["pexels-32223212", "pexels-4512876", "pexels-29736780"]),
  parade: s("shows.parade-of-lights", "Parade of Lights: costumed performers in a moving parade", ["pexels-36218475", "pexels-4017465", "pexels-15231832"]),
  nightBloom: s("shows.night-bloom", "Night Bloom: fireworks over water at night", ["pexels-18686281", "pexels-1503520", "pexels-266497"]),
  foodHero: s("food-and-shows.hero", "Food and shows page opening shot: treats being made at night", ["pexels-35345803", "pexels-7677398"]),
} satisfies Record<string, MediaSlot>;

export const allSlotsPages = Object.values(slotsPages);

/** Wonderverse attraction slug → its frame. */
const RIDE_SLOTS: Record<string, MediaSlot> = {
  "night-comet": slotsA.coaster,
  "orbit-flyer": slotsA.swing,
  "aurelia-carousel": slotsA.carousel,
  "velora-wheel": slotsA.wheel,
  "lagoon-rapids": slotsA.water,
  "wave-cove": slotsA.water2,
  "bumper-bay": slotsPages.bumperBay,
  whirligig: slotsPages.whirligig,
  "little-comet": slotsPages.littleComet,
  "cascade-slides": slotsPages.cascadeSlides,
};

/** Venue slug → its frame. */
const VENUE_SLOTS: Record<string, MediaSlot> = {
  "candy-lane": slotsA.food,
  "midway-kitchen": slotsPages.midwayKitchen,
  "lantern-night-market": slotsPages.nightMarket,
  "cirque-aurora": slotsA.shows,
  "parade-of-lights": slotsPages.parade,
  "night-bloom": slotsPages.nightBloom,
};

/** A ride or venue added to the park content later gets an honest placeholder until a frame is chosen. */
const pending = (key: string, name: string) => poolSlot("wonderverse", key, `${name}: photo or video needed`, [], []);

export const slotForRide = (slug: string, name: string) => RIDE_SLOTS[slug] ?? pending(`attractions.${slug}`, name);
export const slotForVenue = (slug: string, name: string) => VENUE_SLOTS[slug] ?? pending(`venues.${slug}`, name);
