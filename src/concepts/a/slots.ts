import { poolSlot } from "@/shared/media/pools";
import type { AssetCategory, MediaSlot } from "@/shared/media/types";

// Wonderverse. Candidates come only from the Wonderverse pool (media/pools.json); order = preference.
// The S03 coaster tile and the S04 rush scene keep their approved footage (kept exactly by decision).
const s = (key: string, needs: string, preferred: string[], from: AssetCategory[]): MediaSlot => poolSlot("wonderverse", key, needs, preferred, from);

export const slotsA = {
  hero: s("s01.hero", "Wide establishing shot of the park at golden hour", ["pexels-33945522", "pexels-28000865", "pexels-32072284"], ["aerial", "night"]),
  panorama: s("s02.panorama", "Daytime aerial panorama of the whole park", ["pexels-12794397", "pexels-33945522", "pexels-32963332"], ["aerial"]),
  detail: s("s02.detail", "Close ride detail for the foreground parallax layer", ["pexels-749061", "pexels-27993338"], ["rides", "family"]),
  coaster: s("s03.coaster", "Night Comet: illuminated family coaster", ["pexels-39670423", "pixabay-126085", "pexels-31466062"], ["coaster"]),
  swing: s("s03.swing", "Orbit Flyer: tower swings at dusk", ["pexels-13002893"], ["rides", "night"]),
  carousel: s("s03.carousel", "Aurelia Carousel: close-up with lights", ["pexels-27993338"], ["rides", "family"]),
  wheel: s("s03.wheel", "The VELORA Wheel against the sky", ["pexels-32072284"], ["rides", "night"]),
  water: s("s03.water", "Lagoon Rapids: splash boat or gentle water ride", ["pexels-29905597", "pexels-33243268", "pexels-2605030"], ["water"]),
  rush: s("s04.rush", "Roller coaster rider point-of-view (approved scene, kept)", ["pexels-40268711", "pexels-39670423"], ["coaster"]),
  rushNight: s("s04.rush-night", "Coaster at night with light trails (approved scene, kept)", ["pexels-18925870", "pexels-27349945"], ["coaster", "night"]),
  rushSpin: s("s04.rush-spin", "Spinning ride, fast motion (approved scene, kept)", ["pexels-27349945"], ["rides"]),
  family1: s("s05.family-1", "A family on a carousel", ["pexels-9523083", "pexels-18242981"], ["family"]),
  family2: s("s05.family-2", "Children laughing on a ride", ["pexels-35134246", "pexels-5486824"], ["family"]),
  family3: s("s05.family-3", "A couple sharing a treat at the fair", ["pixabay-168213"], ["family", "food"]),
  family4: s("s05.family-4", "Portrait: kids on carousel horses", ["pexels-12226882"], ["family"]),
  food: s("s06.food", "Treats being made at a food stand", ["pexels-35876717", "pexels-35345803", "pexels-29736780"], ["food"]),
  shows: s("s06.shows", "A live performer on stage", ["pexels-11657969", "pexels-13174519", "pexels-15231832"], ["shows"]),
  water2: s("s06.water", "Splash Lagoon: gentle slides, pools and splash play", ["pexels-31166929", "pexels-39762097"], ["water"]),
  dusk: s("s07.dusk", "The park at sunset, lights coming on", ["pexels-28000865"], ["night"]),
  night1: s("s07.night-1", "Rides lit up at night", ["pexels-19026924"], ["night"]),
  night2: s("s07.night-2", "Ferris wheels glowing at night", ["pexels-38908305"], ["night"]),
  finale: s("s07.finale", "Ferris wheel, full frame, at night", ["pexels-32072284"], ["night"]),
  visit: s("s08.visit", "Aerial photograph for the visit section", ["pexels-2799169", "pexels-12794397"], ["aerial"]),
  final: s("s09.final", "Closing wide shot of the park at night", ["pexels-26575927", "pexels-19026924"], ["night"]),
} satisfies Record<string, MediaSlot>;

export const allSlotsA = Object.values(slotsA);
