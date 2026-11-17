import { slotsA } from "./slots";

export const SCENES_A = [
  { n: "01", title: "The opening", slot: slotsA.hero },
  { n: "02", title: "Enter the wonder", slot: slotsA.panorama },
  { n: "03", title: "The attractions", slot: slotsA.coaster },
  { n: "04", title: "Feel the adrenaline", slot: slotsA.rushSpin },
  { n: "05", title: "A world for everyone", slot: slotsA.family1 },
  { n: "06", title: "Beyond the rides", slot: slotsA.food },
  { n: "07", title: "After dark", slot: slotsA.night1 },
  { n: "08", title: "Plan your visit", slot: slotsA.visit },
  { n: "09", title: "The final moment", slot: slotsA.final },
] as const;

export const sceneId = (n: string) => `a-scene-${n}`;
