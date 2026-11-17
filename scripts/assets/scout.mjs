// Builds the Wonderverse scouting shortlist (media/scout/scout.json) from search results saved in
// media/intake/ (v-*.json videos, p-*.json photos) and media/scout/raw-*.txt.
// Nothing is downloaded: colour and brightness are measured with ffmpeg straight from each clip's
// small preview image on the Pexels CDN, and washed-out or very dark candidates are dropped.
// Run: node scripts/assets/scout.mjs
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import ffmpeg from "ffmpeg-static";

const ROOT = join(dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..", "..");
const sources = JSON.parse(readFileSync(join(ROOT, "media/sources.json"), "utf8"));
const known = new Set(sources.map((s) => `${s.provider}-${s.id}`));

// Search group → the Wonderverse frames it is meant for (slot keys without the "wonderverse." prefix).
const GROUPS = {
  hero: ["s01.hero", "s07.dusk"],
  golden: ["s01.hero", "s07.dusk"],
  panorama: ["s02.panorama", "s01.hero", "s08.visit"],
  "carnival-day": ["s02.detail", "s02.panorama"],
  carousel: ["s03.carousel", "s02.detail"],
  swing: ["s03.swing"],
  "wheel-day": ["s03.wheel"],
  "splash-boat": ["s03.water"],
  "family-rides": ["s05.family-1", "s05.family-2", "s05.family-4"],
  treats: ["s06.food", "s05.family-3"],
  food: ["s06.food"],
  shows: ["s06.shows"],
  performer: ["s06.shows"],
  "water-family": ["s06.water"],
  "wheel-night": ["s07.night-2", "s07.finale"],
  "night-rides": ["s07.night-1", "s09.final"],
  fireworks: ["s09.final", "s07.finale"],
  colorful: ["s08.visit", "s02.panorama"],
  night: ["s07.night-1", "s07.night-2"],
  family: ["s05.family-1", "s05.family-2", "s05.family-3", "s05.family-4"],
  water: ["s06.water"],
};

const rowsOf = (file) => {
  const txt = readFileSync(file, "utf8");
  return (file.endsWith(".json") ? JSON.parse(txt).rows : txt).split(/\r?\n/).filter((l) => l.trim());
};

const items = new Map();
function add(group, kind, line) {
  const f = line.split(";");
  const [id, slug, wh, dur, fps, creator, handle, file] = f;
  const key = `pexels-${id}`;
  if (!id || known.has(key)) return;
  const [w, h] = wh.split("x").map(Number);
  const existing = items.get(key);
  if (existing) {
    for (const s of GROUPS[group] ?? []) if (!existing.sections.includes(s)) existing.sections.push(s);
    return;
  }
  const base = { id: key, pexelsId: id, kind, group, sections: [...(GROUPS[group] ?? [])], slug, title: slug.replace(/-/g, " "), width: w, height: h, creator, creatorHandle: handle };
  if (kind === "video") {
    const [uhd, fhd, hd] = f.slice(8, 11);
    const dims = (n) => {
      const m = n?.match(/_(\d+)_(\d+)_[\d.]+fps\.mp4$/);
      return m ? { w: +m[1], h: +m[2] } : null;
    };
    const r = (n) => (n ? { url: `https://videos.pexels.com/video-files/${id}/${n}`, ...dims(n) } : undefined);
    const remote = Object.fromEntries(Object.entries({ uhd: r(uhd), fhd: r(fhd), hd: r(hd) }).filter(([, v]) => v));
    items.set(key, { ...base, duration: +dur, fps: +fps, thumb: `https://images.pexels.com/videos/${id}/${file}`, remote, sourceUrl: `https://www.pexels.com/video/${slug}-${id}/` });
  } else {
    items.set(key, { ...base, thumb: `https://images.pexels.com/photos/${id}/${file}`, colors: f[8]?.split(",").filter(Boolean) ?? [], alt: f[10] ?? "", sourceUrl: `https://www.pexels.com/photo/${slug}-${id}/` });
  }
}

for (const name of readdirSync(join(ROOT, "media/intake"))) {
  const m = name.match(/^([vp])-([a-z-]+)\.(json|txt)$/);
  if (m) for (const line of rowsOf(join(ROOT, "media/intake", name))) add(m[2], m[1] === "v" ? "video" : "photo", line);
}
const scoutDir = join(ROOT, "media/scout");
for (const name of existsSync(scoutDir) ? readdirSync(scoutDir) : []) {
  if (!/^raw-\d+\.txt$/.test(name)) continue;
  let group = null;
  for (const line of rowsOf(join(scoutDir, name))) {
    if (line.startsWith("#")) group = line.slice(1).split(",")[0].trim();
    else if (group) add(group, "video", line);
  }
}

function measure(url) {
  return new Promise((resolve) => {
    const p = spawn(ffmpeg, ["-hide_banner", "-loglevel", "error", "-i", url, "-frames:v", "1", "-vf", "scale=240:-2,signalstats,metadata=print:file=-", "-f", "null", "-"]);
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    const timer = setTimeout(() => p.kill(), 20000);
    p.on("close", () => {
      clearTimeout(timer);
      const get = (k) => +(out.match(new RegExp(`lavfi\\.signalstats\\.${k}=([\\d.]+)`))?.[1] ?? NaN);
      const yavg = get("YAVG");
      resolve(Number.isNaN(yavg) ? null : { yavg, yhigh: get("YHIGH"), sat: get("SATAVG") });
    });
  });
}

const list = [...items.values()];
const queue = [...list];
let done = 0;
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const it = queue.shift();
      it.stats = await measure(`${it.thumb}?auto=compress&cs=tinysrgb&w=320`);
      if (++done % 40 === 0) console.log(`measured ${done}/${list.length}`);
    }
  }),
);

/**
 * Vibrancy score: colour saturation first, penalising washed-out (very bright, low contrast) and
 * murky (very dark, colourless) frames. Night shots are allowed to be dark if they are colourful.
 */
for (const it of list) {
  const s = it.stats;
  if (!s) {
    it.score = 0;
    it.verdict = "unmeasured";
    continue;
  }
  let score = s.sat * 1.6;
  if (s.yavg > 150) score -= (s.yavg - 150) * 1.2; // washed out
  if (s.yhigh > 245 && s.yavg > 120) score -= 12; // blown sky
  if (s.yavg < 35) score -= (35 - s.yavg) * 1.5; // too dark
  if (s.yavg >= 60 && s.yavg <= 130) score += 8; // healthy exposure
  it.score = Math.round(score);
  it.verdict = s.sat < 12 || s.yavg > 175 ? "washed-out" : s.yavg < 25 && s.sat < 30 ? "too-dark" : "ok";
  it.vivid = s.sat >= 25;
}

const keep = list.filter((it) => it.verdict === "ok").sort((a, b) => b.score - a.score);
const byVerdict = {};
for (const it of list) byVerdict[it.verdict] = (byVerdict[it.verdict] ?? 0) + 1;
console.log("verdicts", JSON.stringify(byVerdict));
writeFileSync(join(ROOT, "media/scout/all.json"), JSON.stringify(list.map(({ id, group, kind, stats, verdict }) => ({ id, group, kind, stats, verdict }))));
mkdirSync(scoutDir, { recursive: true });
writeFileSync(join(scoutDir, "scout.json"), JSON.stringify(keep, null, 1));
const dropped = list.length - keep.length;
console.log(`candidates ${list.length}, kept ${keep.length} (videos ${keep.filter((i) => i.kind === "video").length}, photos ${keep.filter((i) => i.kind === "photo").length}), dropped ${dropped} washed-out/dark/unmeasured`);
const per = {};
for (const it of keep) for (const s of it.sections) per[s] = (per[s] ?? 0) + 1;
console.log(Object.entries(per).sort().map(([s, n]) => `${s}:${n}`).join(" "));
