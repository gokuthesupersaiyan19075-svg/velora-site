"use client";

import { SceneSounds, type SceneCue } from "@/shared/sound/SceneSounds";

// Wonderverse home sound cues (the cinematic bed and the warm voice come from the world's layout): soft whooshes as scenes wipe in, the coaster rush
// in scene 04, the evening fair and crickets after dark, fireworks at the finale. Off until the visitor
// turns sound on.
const CUES: SceneCue[] = [
  { selector: "#a-scene-02", enter: { name: "whoosh-wipe", volume: 0.22 } },
  { selector: "#a-scene-03", enter: { name: "whoosh-wipe", volume: 0.22, rate: 1.05 } },
  { selector: "#a-scene-04", enter: { name: "coaster-run", volume: 0.32 } },
  { selector: "#a-scene-05", enter: { name: "whoosh-wipe", volume: 0.18, rate: 0.95 } },
  { selector: "#a-scene-06", enter: { name: "chime-crystal", volume: 0.18 } },
  { selector: "#a-scene-07", layer: { key: "fair", name: "fair-evening", volume: 0.28 } },
  { selector: "#a-scene-07", layer: { key: "night", name: "night-crickets", volume: 0.22 } },
  { selector: "#a-scene-09", enter: { name: "fireworks", volume: 0.38 } },
];

export function WonderSounds() {
  return <SceneSounds cues={CUES} />;
}
