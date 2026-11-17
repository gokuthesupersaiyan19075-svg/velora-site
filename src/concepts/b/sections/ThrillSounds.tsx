"use client";

import { SceneSounds, type SceneCue } from "@/shared/sound/SceneSounds";

// Thrillverse home sound cues (the energetic bed and the punchy voice come from the world's layout): fast whooshes on the cuts between sections. The ride
// (Thrill.tsx) adds the chain lift, the drop and the scream; chips tick; hold-to-launch rises.
const CUES: SceneCue[] = [
  { selector: "#park", enter: { name: "whoosh-fast", volume: 0.24 } },
  { selector: "#rides", enter: { name: "whoosh-fast", volume: 0.24, rate: 1.08 } },
  { selector: "#family", enter: { name: "whoosh-fast", volume: 0.2, rate: 0.92 } },
  { selector: "#eat", enter: { name: "whoosh-fast", volume: 0.2 } },
  { selector: "#night", enter: { name: "whoosh-deep", volume: 0.26 } },
];

export function ThrillSounds() {
  return <SceneSounds cues={CUES} preload={["chain-lift", "coaster-run", "ride-scream", "riser"]} />;
}
