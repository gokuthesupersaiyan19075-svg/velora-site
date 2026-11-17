// Measures every original (brightness, highlight level, saturation) and writes an ffmpeg colour grade
// for it to media/grades.json. renditions.mjs bakes the grade into the web copies; originals are never touched.
// Manual overrides: media/grades-manual.json  { "<asset-id>": "<ffmpeg filter chain>" | "none" }
// Usage: node scripts/assets/analyze.mjs [--force]
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import ffmpeg from "ffmpeg-static";

const ROOT = join(dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..", "..");
const sources = JSON.parse(readFileSync(join(ROOT, "media/sources.json"), "utf8"));
const OUT = join(ROOT, "media/grades.json");
const force = process.argv.includes("--force");
const grades = existsSync(OUT) && !force ? JSON.parse(readFileSync(OUT, "utf8")) : {};

function stats(file, isVideo, duration) {
  // Sample three moments of a clip (or the photo itself), downscaled, and average signalstats.
  const times = isVideo ? [0.2, 0.5, 0.8].map((f) => Math.max(0, (duration || 6) * f)) : [null];
  const acc = { yavg: 0, yhigh: 0, ylow: 0, sat: 0, n: 0 };
  for (const t of times) {
    const args = ["-hide_banner", "-loglevel", "error", ...(t !== null ? ["-ss", String(t)] : []), "-i", file, "-frames:v", "1", "-vf", "scale=320:-2,signalstats,metadata=print:file=-", "-f", "null", "-"];
    const r = spawnSync(ffmpeg, args, { encoding: "utf8" });
    const txt = r.stdout || "";
    const get = (k) => {
      const m = txt.match(new RegExp(`lavfi\\.signalstats\\.${k}=([\\d.]+)`));
      return m ? +m[1] : null;
    };
    const yavg = get("YAVG");
    if (yavg === null) continue;
    acc.yavg += yavg;
    acc.yhigh += get("YHIGH") ?? 0;
    acc.ylow += get("YLOW") ?? 0;
    acc.sat += get("SATAVG") ?? 0;
    acc.n++;
  }
  if (!acc.n) return null;
  return { yavg: acc.yavg / acc.n, yhigh: acc.yhigh / acc.n, ylow: acc.ylow / acc.n, sat: acc.sat / acc.n };
}

/** Grade policy: tame bright/blown frames, keep nights deep, add vibrancy where colour is weak. */
function gradeFor(s) {
  const satBoost = s.sat < 25 ? 1.28 : s.sat < 40 ? 1.18 : 1.1;
  if (s.yavg > 135 || (s.yhigh >= 240 && s.yavg > 115)) {
    // Very bright / clipped sky: pull highlights and mids down, add contrast and colour.
    return `curves=all='0/0 0.5/0.44 0.85/0.74 1/0.9',eq=contrast=1.08:saturation=${(satBoost + 0.08).toFixed(2)}`;
  }
  if (s.yavg > 110) return `curves=all='0/0 0.5/0.47 0.9/0.84 1/0.95',eq=contrast=1.05:saturation=${satBoost.toFixed(2)}`;
  if (s.yavg < 60) return `eq=contrast=1.06:saturation=${Math.min(satBoost + 0.04, 1.3).toFixed(2)}`;
  return `eq=contrast=1.04:saturation=${satBoost.toFixed(2)}`;
}

const manual = existsSync(join(ROOT, "media/grades-manual.json")) ? JSON.parse(readFileSync(join(ROOT, "media/grades-manual.json"), "utf8")) : {};
let n = 0;
for (const s of sources) {
  if (!s.file) continue; // remote-only candidate: nothing local to analyse
  const id = `${s.provider}-${s.id}`;
  if (grades[id] && !manual[id]) continue;
  const st = grades[id]?.stats ?? stats(join(ROOT, s.file), s.kind === "v", s.duration);
  if (!st) {
    console.log(`skip ${id} (no stats)`);
    continue;
  }
  const filter = manual[id] === "none" ? "" : manual[id] ?? gradeFor(st);
  grades[id] = { stats: Object.fromEntries(Object.entries(st).map(([k, v]) => [k, Math.round(v * 10) / 10])), filter };
  n++;
  console.log(`${id}  yavg ${st.yavg.toFixed(0)}  yhigh ${st.yhigh.toFixed(0)}  sat ${st.sat.toFixed(0)}  →  ${filter || "none"}`);
}
writeFileSync(OUT, JSON.stringify(grades, null, 2));
console.log(`graded ${n}, total ${Object.keys(grades).length}`);
