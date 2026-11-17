import { poolSlot } from "@/shared/media/pools";
import type { AssetCategory, MediaSlot } from "@/shared/media/types";

// Thrillverse. Candidates come only from the Thrillverse pool (media/pools.json); order = preference.
const s = (key: string, needs: string, preferred: string[], from: AssetCategory[]): MediaSlot => poolSlot("thrillverse", key, needs, preferred, from);

export const slotsB = {
  hero: s("s01.hero", "Extreme coaster at full speed", ["pixabay-126085"], ["coaster"]),
  aerial: s("s02.aerial", "Fast aerial sweep over the thrill rides", ["pexels-35364474", "pexels-32963341"], ["aerial"]),
  flash1: s("s02.flash-1", "Quick cut: Tempest, giant pendulum or swing", ["pexels-13002893"], ["rides"]),
  flash2: s("s02.flash-2", "Quick cut: Starfall Tower drop", ["pexels-34720022"], ["rides", "coaster"]),
  flash3: s("s02.flash-3", "Quick cut: Freefall Flume extreme slide", ["pexels-13279741", "pexels-32963347"], ["water"]),
  rideCoaster: s("s03.ride-coaster", "Skyline Serpent: looping coaster", ["pexels-10807092", "pexels-749061"], ["coaster"]),
  rideSwing: s("s03.ride-swing", "Tempest: giant swinging pendulum", ["pexels-13002893"], ["rides"]),
  rideSpin: s("s03.ride-spin", "Vortex: spinning thrill ride", ["pexels-35876722"], ["rides"]),
  rideCarousel: s("s03.ride-carousel", "Velocity Ridge: high-speed coaster, airtime", ["pexels-37482601", "pexels-40268459"], ["coaster"]),
  rideBumper: s("s03.ride-bumper", "Starfall Tower: drop tower", ["pexels-28000863"], ["rides", "coaster"]),
  rideSplash: s("s03.ride-splash", "Riptide Rapids: white-water rafting", ["pexels-34370024", "pexels-26599706", "pexels-30215763", "pexels-38326440", "pexels-36908501"], ["water"]),
  rideSlides: s("s03.ride-slides", "Freefall Flume: extreme speed slide", ["pexels-32950333", "pexels-13279741", "pexels-32963347"], ["water"]),
  thrill: s("s04.thrill", "Coaster POV for the scroll-scrubbed sequence", ["pexels-40268519", "pexels-13002893"], ["coaster"]),
  thrillCut1: s("s04.cut-1", "Cut: spinning ride close", [], ["rides"]),
  thrillCut2: s("s04.cut-2", "Cut: ride at night, fast", ["pexels-35876722"], ["night", "rides"]),
  family1: s("s05.family-1", "Adventure: Summit Challenge zip line or ropes course", ["pexels-40956054", "pexels-38323128", "pexels-38230652"], ["rides", "family"]),
  family2: s("s05.family-2", "Adventure: climbing or high ropes", ["pexels-4158876", "pexels-39876478"], ["family", "rides"]),
  family3: s("s05.family-3", "Breaker Bay: powerful surf wave", ["pexels-19955848", "pexels-15456436", "pexels-30152860"], ["water"]),
  family4: s("s05.family-4", "Rider POV or screaming riders", ["pexels-18242966", "pexels-3006889"], ["coaster", "rides"]),
  food1: s("s06.food-1", "Fuel: hearty food between rides", ["pexels-15566658"], ["food"]),
  food2: s("s06.food-2", "Link tile to Wonderverse treats and shows", ["pexels-27810299", "pexels-6184158"], ["food", "shows"]),
  show1: s("s06.show-1", "Ride: Summit Challenge zip line", ["pexels-39190336", "pexels-38323128"], ["rides"]),
  show2: s("s06.show-2", "Ride: Vortex after dark", [], ["night"]),
  show3: s("s06.show-3", "Ride: Velocity Ridge airtime", [], ["coaster"]),
  splash: s("s06.splash", "Surf: Breaker Bay waves", ["pexels-30152860", "pexels-39123182", "pexels-5892814"], ["water"]),
  night1: s("s07.night-1", "Coasters lit at night", [], ["night"]),
  night2: s("s07.night-2", "Thrill rides lit at night", [], ["night"]),
  night3: s("s07.night-3", "Swing or drop ride at night", [], ["night"]),
  visit: s("s08.visit", "Aerial photograph of the park by day", [], ["aerial"]),
  final: s("s09.final", "Closing shot: coaster at night", [], ["night", "coaster"]),
} satisfies Record<string, MediaSlot>;

export const allSlotsB = Object.values(slotsB);
