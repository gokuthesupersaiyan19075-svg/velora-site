// Downloads the curated sound set (originals untouched in media/originals/audio) and makes web copies in
// public/media/audio/<name>.m4a: loudness-levelled (EBU R128), trimmed, with short fades so loops are clean.
// Licences: Pixabay Content License (pixabay), Mixkit Sound Effects Free License (mixkit). Recorded in media/sounds.json.
import { spawnSync } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import ffmpeg from "ffmpeg-static";

const ROOT = join(dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..", "..");
const PIX = { name: "Pixabay Content License", url: "https://pixabay.com/service/license-summary/" };
const MIX = { name: "Mixkit Sound Effects Free License", url: "https://mixkit.co/license/#sfxFree" };

// name, kind (bed = looping background, sfx = one-shot), source, max seconds, target loudness
const SOUNDS = [
  // The Cinematic World
  { name: "cinematic-bed", kind: "bed", url: "https://cdn.pixabay.com/audio/2024/12/10/audio_be9ce1e057.mp3", source: "https://pixabay.com/music/ambient-cinematic-ambient-274889/", creator: "Kulakovka", license: PIX, max: 110, lufs: -24 },
  { name: "fair-evening", kind: "bed", url: "https://cdn.pixabay.com/audio/2022/03/09/audio_aa5bf7724b.mp3", source: "https://pixabay.com/sound-effects/amusement-park-ambience-24787/", creator: "freesound_community", license: PIX, max: 100, lufs: -26 },
  { name: "whoosh-wipe", kind: "sfx", url: "https://assets.mixkit.co/active_storage/sfx/1492/1492-preview.mp3", source: "https://mixkit.co/free-sound-effects/whoosh/", creator: "Mixkit", license: MIX, max: 4, lufs: -20 },
  { name: "whoosh-deep", kind: "sfx", url: "https://assets.mixkit.co/active_storage/sfx/1486/1486-preview.mp3", source: "https://mixkit.co/free-sound-effects/whoosh/", creator: "Mixkit", license: MIX, max: 5, lufs: -21 },
  { name: "fireworks", kind: "sfx", url: "https://assets.mixkit.co/active_storage/sfx/2993/2993-preview.mp3", source: "https://mixkit.co/free-sound-effects/fireworks/", creator: "Mixkit", license: MIX, max: 12, lufs: -24 },
  // The Adrenaline Rush
  { name: "rush-bed", kind: "bed", url: "https://cdn.pixabay.com/audio/2026/10/01/audio_1b787ba303.mp3", source: "https://pixabay.com/music/search/energetic%20trailer/ (id 613517)", creator: "AtlasAudio", license: PIX, max: 100, lufs: -23 },
  { name: "chain-lift", kind: "sfx", url: "https://cdn.pixabay.com/audio/2022/03/10/audio_53e4021ef1.mp3", source: "https://pixabay.com/sound-effects/rollercoaster-ratchet-33962/", creator: "freesound_community", license: PIX, max: 18, lufs: -22 },
  { name: "coaster-run", kind: "sfx", url: "https://cdn.pixabay.com/audio/2022/03/09/audio_2774947fa5.mp3", source: "https://pixabay.com/sound-effects/g42-01-roller-coaster-run-25877/", creator: "freesound_community", license: PIX, max: 40, lufs: -21 },
  { name: "ride-scream", kind: "sfx", url: "https://cdn.pixabay.com/audio/2022/03/15/audio_db8e4eb4f6.mp3", source: "https://pixabay.com/sound-effects/scream-ride-start-91271/", creator: "freesound_community", license: PIX, max: 4, lufs: -24 },
  { name: "riser", kind: "sfx", url: "https://assets.mixkit.co/active_storage/sfx/790/790-preview.mp3", source: "https://mixkit.co/free-sound-effects/cinematic/", creator: "Mixkit", license: MIX, max: 6, lufs: -21 },
  { name: "whoosh-fast", kind: "sfx", url: "https://assets.mixkit.co/active_storage/sfx/1490/1490-preview.mp3", source: "https://mixkit.co/free-sound-effects/whoosh/", creator: "Mixkit", license: MIX, max: 3, lufs: -20 },
  // The Living Universe
  { name: "universe-bed", kind: "bed", url: "https://cdn.pixabay.com/audio/2026/04/01/audio_b412c682a6.mp3", source: "https://pixabay.com/music/search/ethereal%20ambient/ (id 512265)", creator: "AtlasAudio", license: PIX, max: 120, lufs: -25 },
  { name: "lagoon-water", kind: "bed", url: "https://assets.mixkit.co/active_storage/sfx/3126/3126-preview.mp3", source: "https://mixkit.co/free-sound-effects/water/", creator: "Mixkit", license: MIX, max: 60, lufs: -30 },
  { name: "night-crickets", kind: "bed", url: "https://assets.mixkit.co/active_storage/sfx/1789/1789-preview.mp3", source: "https://mixkit.co/free-sound-effects/night/", creator: "Mixkit", license: MIX, max: 60, lufs: -30 },
  { name: "chime-crystal", kind: "sfx", url: "https://assets.mixkit.co/active_storage/sfx/3108/3108-preview.mp3", source: "https://mixkit.co/free-sound-effects/chime/", creator: "Mixkit", license: MIX, max: 4, lufs: -24 },
  // Portal
  { name: "portal-carousel", kind: "bed", url: "https://cdn.pixabay.com/audio/2022/03/09/audio_202ce34a00.mp3", source: "https://pixabay.com/sound-effects/carousel-train-carriages-amusement-park-holiday-24376/", creator: "freesound_community", license: PIX, max: 90, lufs: -28 },
];

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36";
mkdirSync(join(ROOT, "media/originals/audio"), { recursive: true });
mkdirSync(join(ROOT, "public/media/audio"), { recursive: true });

const record = [];
for (const s of SOUNDS) {
  const orig = join(ROOT, "media/originals/audio", `${s.name}.mp3`);
  if (!existsSync(orig)) {
    const res = await fetch(s.url, { headers: { "user-agent": UA } });
    if (!res.ok) {
      console.log(`FAIL ${s.name}: ${res.status}`);
      continue;
    }
    await pipeline(Readable.fromWeb(res.body), createWriteStream(orig + ".part"));
    renameSync(orig + ".part", orig);
  }
  const web = join(ROOT, "public/media/audio", `${s.name}.m4a`);
  if (!existsSync(web)) {
    const fade = s.kind === "bed" ? 3 : 0.05;
    const af = `atrim=0:${s.max},loudnorm=I=${s.lufs}:TP=-2:LRA=11,afade=t=in:d=${fade},areverse,afade=t=in:d=${s.kind === "bed" ? 3 : 0.3},areverse`;
    const r = spawnSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", "-i", orig, "-af", af, "-ac", "2", "-ar", "44100", "-c:a", "aac", "-b:a", s.kind === "bed" ? "112k" : "128k", "-movflags", "+faststart", web]);
    if (r.status !== 0) {
      console.log(`FAIL encode ${s.name}`);
      continue;
    }
  }
  record.push({ name: s.name, kind: s.kind, file: `/media/audio/${s.name}.m4a`, source: s.source, creator: s.creator, license: s.license });
  console.log(`ok ${s.name}`);
}
writeFileSync(join(ROOT, "media/sounds.json"), JSON.stringify(record, null, 2));
