// Records, for every candidate video, the renditions its source CDN already serves (no downloads).
// Output: media/remote.json  { "<id>": { uhd?: R, fhd?: R, hd?: R } }  where R = { url, w, h }
//   uhd = 4K-class (short side >= 1400), fhd = 1080p-class, hd = 720p-class.
// Pexels: official API (needs PEXELS_API_KEY, a free key the user creates). Pixabay: _large/_medium/_small, sized with ffprobe.
// Coverr: 1080p/720p. Run: node scripts/assets/remote-renditions.mjs [--only id,id]
import { execFile } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";

const ROOT = join(dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..", "..");
const OUT = join(ROOT, "media/remote.json");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";
const sources = JSON.parse(readFileSync(join(ROOT, "media/sources.json"), "utf8"));
const out = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const onlyArg = process.argv.indexOf("--only");
const only = onlyArg > 0 ? new Set(process.argv[onlyArg + 1].split(",")) : null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const run = promisify(execFile);

// By the SHORT side, so unusual aspect ratios (e.g. 1864x1080) land in the right tier.
const tier = (w, h) => {
  const short = Math.min(w, h);
  return short >= 1400 ? "uhd" : short >= 1000 ? "fhd" : short >= 700 ? "hd" : null;
};

/** Keep the best file per tier: landscape first, then highest fps ≤ 60, then largest. */
function pick(files) {
  const r = {};
  for (const f of files) {
    const t = tier(f.w, f.h);
    if (!t) continue;
    const cur = r[t];
    const better = !cur || f.w * f.h > cur.w * cur.h || (f.w * f.h === cur.w * cur.h && (f.fps ?? 0) > (cur.fps ?? 0) && (f.fps ?? 0) <= 60);
    if (better) r[t] = f;
  }
  for (const t of Object.keys(r)) r[t] = { url: r[t].url, w: r[t].w, h: r[t].h };
  return r;
}

// Pexels' official API (free key from https://www.pexels.com/api/, 200 requests/hour). Set PEXELS_API_KEY.
const PEXELS_KEY = process.env.PEXELS_API_KEY;
async function pexels(s) {
  if (!PEXELS_KEY) return pexelsDerived(s);
  const res = await fetch(`https://api.pexels.com/videos/videos/${s.id}`, { headers: { authorization: PEXELS_KEY } });
  if (!res.ok) throw new Error(`api ${res.status}`);
  const data = await res.json();
  const files = (data.video_files ?? [])
    .filter((f) => f.file_type === "video/mp4" && f.width && f.height && f.link)
    .map((f) => ({ url: f.link, w: f.width, h: f.height, fps: f.fps ?? null }));
  if (!files.length) throw new Error("no files in api response");
  return pick(files);
}

/** True if the CDN serves this file (1-byte range request; nothing is downloaded). */
async function exists(url) {
  try {
    const res = await fetch(url, { headers: { range: "bytes=0-0" } });
    await res.body?.cancel();
    return res.status === 206 || res.status === 200;
  } catch {
    return false;
  }
}

/**
 * Without an API key (Pexels has paused new keys): start from the file link recorded when the clip was
 * downloaded (its best size) and find the 1080p/720p files Pexels publishes beside it. Pexels names them
 * predictably: "<clip>-hd_<w>_<h>_<fps>fps.mp4", or sequential file ids just below the original's.
 * Every guess is confirmed on the CDN before it is recorded.
 */
async function pexelsDerived(s) {
  const file = s.url.split("/").pop();
  const dir = s.url.slice(0, -file.length);
  const fps = file.match(/_(\d+(?:\.\d+)?fps)\.mp4$/)?.[1];
  if (!fps) throw new Error(`unrecognised file name ${file}`);
  const files = [{ url: s.url, w: s.width, h: s.height }];
  const named = file.match(/^(\d+)-(uhd|hd|sd)_/);
  const numeric = file.match(/^(\d+)_\d+_\d+_/);
  const landscape = s.width >= s.height;
  for (const short of [1080, 720]) {
    if (Math.min(s.width, s.height) <= short) continue; // the original already is this size or smaller
    const long = Math.round((Math.max(s.width, s.height) * short) / Math.min(s.width, s.height));
    const longs = [...new Set([long, long + (long % 2), long - (long % 2), short === 1080 ? 1920 : 1280])];
    const dims = longs.map((l) => (landscape ? [l, short] : [short, l]));
    const guesses = [];
    for (const [w, h] of dims) {
      if (named) guesses.push(`${dir}${named[1]}-${short >= 720 ? "hd" : "sd"}_${w}_${h}_${fps}.mp4`);
      if (numeric) for (let k = 1; k <= Number(process.env.PEXELS_BACK ?? 6); k++) guesses.push(`${dir}${+numeric[1] - k}_${w}_${h}_${fps}.mp4`);
    }
    for (const url of guesses) {
      if (await exists(url)) {
        const [, w, h] = url.match(/_(\d+)_(\d+)_[\d.]+fps\.mp4$/);
        files.push({ url, w: +w, h: +h });
        break;
      }
    }
  }
  return pick(files);
}

async function probe(url) {
  try {
    await run(ffmpegPath, ["-hide_banner", "-user_agent", UA, "-i", url], { timeout: 30000 });
  } catch (e) {
    const m = String(e.stderr ?? "").match(/Video: [^\n]*?, (\d{3,5})x(\d{3,5})/);
    if (m) return { w: +m[1], h: +m[2] };
  }
  return null;
}

async function viaProbe(urls) {
  const files = [];
  for (const url of urls) {
    const d = await probe(url);
    if (d) files.push({ url, ...d });
  }
  return pick(files);
}

const pixabay = (s) => viaProbe(["_large", "_medium", "_small"].map((x) => s.url.replace(/_(large|medium|small|tiny)\.mp4$/, `${x}.mp4`)));
const coverr = (s) => viaProbe(["1080p", "720p"].map((x) => s.url.replace(/\/(1080p|720p|2160p)\.mp4$/, `/${x}.mp4`)));

const videos = sources.filter((s) => s.kind === "v" && (!only || only.has(`${s.provider}-${s.id}`)));
let done = 0;
for (const s of videos) {
  const id = `${s.provider}-${s.id}`;
  try {
    const r = s.provider === "pexels" ? await pexels(s) : s.provider === "pixabay" ? await pixabay(s) : await coverr(s);
    out[id] = r;
    console.log(`${++done}/${videos.length} ${id} ${Object.entries(r).map(([t, f]) => `${t}:${f.w}x${f.h}`).join(" ")}`);
  } catch (e) {
    console.log(`${++done}/${videos.length} ${id} FAILED ${e.message}`);
  }
  writeFileSync(OUT, JSON.stringify(out, null, 1));
  if (s.provider === "pexels") await sleep(150); // be gentle with the CDN
}
const n = Object.keys(out).length;
const has = (t) => Object.values(out).filter((r) => r[t]).length;
console.log(`recorded ${n}: uhd ${has("uhd")}, fhd ${has("fhd")}, hd ${has("hd")}`);
