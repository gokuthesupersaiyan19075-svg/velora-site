import { poolSlot } from "@/shared/media/pools";
import type { AssetCategory, MediaSlot } from "@/shared/media/types";
import { slotsB } from "../slots";

// Extra Thrillverse frames for the inner pages. Candidates come only from the Thrillverse pool;
// the preferred ids are pool assets no home slot uses as its default, so the pages do not repeat the home page.
const s = (key: string, needs: string, preferred: string[], from: AssetCategory[]): MediaSlot => poolSlot("thrillverse", key, needs, preferred, from);

export const slotsPages = {
  attractionsHero: s("p.attractions.hero", "Attractions page hero: coaster train on a steep drop or a line-up of thrill rides", ["pexels-40268459", "pexels-749061", "pexels-29617855"], ["coaster"]),
  foodHero: s("p.food.hero", "Food page hero: hearty food between rides (burgers, grill, street food)", ["pexels-6184158"], ["food"]),
  planHero: s("p.plan.hero", "Plan page hero: wide daytime view over the thrill rides", ["pexels-6115291", "pexels-30870516", "pexels-2799169"], ["aerial"]),
  ticketsHero: s("p.tickets.hero", "Tickets page hero: coaster or thrill ride lit at night, fast", ["pexels-32668864", "pexels-34400486", "pexels-39257413"], ["night", "coaster"]),
} satisfies Record<string, MediaSlot>;

/** The frame shown for each Thrillverse attraction (reuses the home slots where the subject matches). */
export const rideSlots: Record<string, MediaSlot> = {
  "skyline-serpent": slotsB.rideCoaster,
  tempest: slotsB.rideSwing,
  vortex: slotsB.rideSpin,
  "velocity-ridge": slotsB.rideCarousel,
  "starfall-tower": slotsB.rideBumper,
  "riptide-rapids": slotsB.rideSplash,
  "freefall-flume": slotsB.rideSlides,
  "summit-challenge": slotsB.family1,
  "breaker-bay": slotsB.family3,
};

const fallbackSlot = s("p.ride.fallback", "Thrill ride in action (for a ride without its own frame yet)", [], ["rides", "coaster"]);
export const rideSlot = (slug: string): MediaSlot => rideSlots[slug] ?? fallbackSlot;
