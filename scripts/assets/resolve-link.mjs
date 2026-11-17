// Turns a link the site owner pasted into the picture chooser into a chooser option.
// Works out what the link points to, checks it is good enough (videos at least 720p on the short side,
// photos at least 1600 px wide), finds its sizes (4K / 1080p / 720p where the source publishes them)
// and, for videos without a published preview image, saves one poster frame. Nothing else is downloaded.
//
// Recognised: Pexels photo and video pages, Pexels/Pixabay/Coverr file links, Pexels image links,
// and any direct video (.mp4 .webm .mov .m4v) or photo (.jpg .jpeg .png .webp .avif) file.
// Pages that block automated reading (Pixabay, Pexels video pages not seen before) come back "pending":
// Claude opens them in the browser and finishes the job.
//
// Usage: node scripts/assets/resolve-link.mjs '<url>'   → prints one JSON object
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";

const run = promisify(execFile);
const ROOT = join(dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..", "..");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36";
const MIN_VIDEO_SHORT = 700;
const MIN_PHOTO_W = 1600;

const out = (o) => {
  process.stdout.write(JSON.stringify(o));
  process.exit(0);
};
const titleFrom = (slug) => (slug || "Pasted link").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim().replace(/^./, (c) => c.toUpperCase());

/** Size (and duration) of a remote video or image, read from its header by ffmpeg. */
async function probe(url) {
  let text = "";
  try {
    await run(ffmpegPath, ["-hide_banner", "-user_agent", UA, "-i", url], { timeout: 30000 });
  } catch (e) {
    text = String(e.stderr ?? "");
  }
  const m = text.match(/(?:Video|Stream)[^\n]*?, (\d{2,5})x(\d{2,5})/);
  if (!m) return null;
  const d = text.match(/Duration: (\d+):(\d+):([\d.]+)/);
  const duration = d ? Math.round(+d[1] * 3600 + +d[2] * 60 + +d[3]) : null;
  return { w: +m[1], h: +m[2], duration: duration && duration > 0 ? duration : null };
}

async function exists(url) {
  try {
    const res = await fetch(url, { headers: { range: "bytes=0-0", "user-agent": UA } });
    await res.body?.cancel();
    return res.status === 206 || res.status === 200;
  } catch {
    return false;
  }
}

/** Sort files into the site's tiers by their short side. */
function tiers(files) {
  const t = {};
  for (const f of [...files].sort((a, b) => Math.min(b.w, b.h) - Math.min(a.w, a.h))) {
    const s = Math.min(f.w, f.h);
    const tier = s >= 1400 ? "uhd" : s >= 1000 ? "fhd" : s >= 700 ? "hd" : null;
    if (tier && !t[tier]) t[tier] = { url: f.url, w: f.w, h: f.h };
  }
  return t;
}

/** One frame from a third of the way in, saved as the clip's poster (1440 px wide). */
async function poster(id, url, duration) {
  const dir = join(ROOT, "public/media/web", id);
  const file = join(dir, "poster.jpg");
  if (!existsSync(file)) {
    mkdirSync(dir, { recursive: true });
    const at = Math.max(0.5, (duration ?? 6) * 0.33);
    await run(ffmpegPath, ["-hide_banner", "-loglevel", "error", "-user_agent", UA, "-ss", String(at), "-i", url, "-frames:v", "1", "-vf", "scale=1440:-2", "-q:v", "3", "-y", file], { timeout: 60000 });
  }
  return `/media/web/${id}/poster.jpg`;
}

function videoOption({ id, title, slug, w, h, duration, creator, thumb, local, remote, sourceUrl }) {
  return { id, kind: "video", title, slug, width: w, height: h, duration, creator: creator ?? "", thumb, local, remote, sourceUrl, vivid: false, score: 0, isNew: true, fromLink: true };
}
function photoOption({ id, title, slug, w, h, creator, thumb, photoUrl, sourceUrl }) {
  return { id, kind: "photo", title, slug, width: w, height: h, duration: null, creator: creator ?? "", thumb, photoUrl, local: false, remote: null, sourceUrl, vivid: false, score: 0, isNew: true, fromLink: true };
}

function tooSmallVideo(w, h) {
  return Math.min(w, h) < MIN_VIDEO_SHORT ? `This clip is only ${w}×${h}. The site needs at least 720p (1280×720); look for a larger size of the same clip.` : null;
}

/** A Pexels clip we have seen before in a search (media/intake): its file list is already known. */
function knownPexelsVideo(id) {
  const dirs = [join(ROOT, "media/intake"), join(ROOT, "media/scout")];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (!/^(v\d?-.*\.(json|txt)|raw-\d+\.txt)$/.test(name)) continue;
      const txt = readFileSync(join(dir, name), "utf8");
      const rows = (name.endsWith(".json") ? JSON.parse(txt).rows : txt).split(/\r?\n/);
      for (const line of rows) {
        const f = line.split(";");
        if (f[0] !== id) continue;
        const [, slug, wh, dur, , creator, , file] = f;
        const [w, h] = wh.split("x").map(Number);
        const dims = (n) => n?.match(/_(\d+)_(\d+)_[\d.]+fps\.mp4$/);
        const files = [f[8], f[9], f[10]].filter(Boolean).map((n) => {
          const d = dims(n);
          return { url: `https://videos.pexels.com/video-files/${id}/${n}`, w: d ? +d[1] : w, h: d ? +d[2] : h };
        });
        return { slug, w, h, duration: +dur || null, creator, thumb: `https://images.pexels.com/videos/${id}/${file}`, files };
      }
    }
  }
  // Already in the library?
  const manifest = JSON.parse(readFileSync(join(ROOT, "media/manifest.json"), "utf8"));
  const a = manifest.find((x) => x.id === `pexels-${id}`);
  if (a?.web?.remote) return { slug: a.title, w: a.width, h: a.height, duration: a.duration, creator: a.creator, thumb: a.web.poster, local: true, files: Object.values(a.web.remote) };
  return null;
}

/** Pexels publishes 1080p and 720p files beside the original under predictable names. */
async function pexelsSiblings(url, w, h) {
  const file = url.split("/").pop();
  const dir = url.slice(0, -file.length);
  const fps = file.match(/_(\d+(?:\.\d+)?fps)\.mp4$/)?.[1];
  const files = [{ url, w, h }];
  if (!fps) return files;
  const named = file.match(/^(\d+)-(uhd|hd|sd)_/);
  const numeric = file.match(/^(\d+)_\d+_\d+_/);
  const landscape = w >= h;
  for (const short of [1080, 720]) {
    if (Math.min(w, h) <= short) continue;
    const long = Math.round((Math.max(w, h) * short) / Math.min(w, h));
    const longs = [...new Set([long, long + (long % 2), long - (long % 2), short === 1080 ? 1920 : 1280])];
    for (const l of longs) {
      const [gw, gh] = landscape ? [l, short] : [short, l];
      const guesses = [];
      if (named) guesses.push(`${dir}${named[1]}-hd_${gw}_${gh}_${fps}.mp4`);
      if (numeric) for (let k = 1; k <= 6; k++) guesses.push(`${dir}${+numeric[1] - k}_${gw}_${gh}_${fps}.mp4`);
      let found = null;
      for (const g of guesses) if (await exists(g)) found = g;
      if (found) {
        files.push({ url: found, w: gw, h: gh });
        break;
      }
    }
  }
  return files;
}

const raw = (process.argv[2] ?? "").trim();
let u;
try {
  u = new URL(raw);
  if (!/^https?:$/.test(u.protocol)) throw new Error();
} catch {
  out({ status: "unsupported", message: "That is not a web link. Paste the full address, starting with https://" });
}
const host = u.hostname.replace(/^www\./, "");
const path = decodeURIComponent(u.pathname);
const ext = path.split(".").pop().toLowerCase();

// ---------- Pexels photo page / image link ----------
let m = host === "pexels.com" && path.match(/\/photo\/(?:([^/]*?)-)?(\d+)\/?$/);
if (!m && host === "images.pexels.com") {
  const p = path.match(/\/photos\/(\d+)\//);
  if (p) m = [null, null, p[1]];
}
if (m) {
  const id = m[2];
  const img = `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg`;
  const d = await probe(img);
  if (!d) out({ status: "pending", message: "Could not read this Pexels photo automatically. Claude will open it in the browser." });
  if (d.w < MIN_PHOTO_W) out({ status: "unsupported", message: `This photo is only ${d.w}×${d.h}. The site needs at least ${MIN_PHOTO_W} px wide.` });
  out({
    status: "ready",
    message: `Pexels photo, ${d.w}×${d.h}.`,
    option: photoOption({ id: `pexels-${id}`, title: titleFrom(m[1]), slug: m[1] || `photo-${id}`, w: d.w, h: d.h, thumb: img, photoUrl: `${img}?auto=compress&cs=tinysrgb&w=2400`, sourceUrl: `https://www.pexels.com/photo/${m[1] ? `${m[1]}-` : ""}${id}/` }),
  });
}

// ---------- Pexels video page ----------
m = host === "pexels.com" && path.match(/\/(?:[a-z-]+\/)?video\/(?:([^/]*?)-)?(\d+)\/?$/);
if (m) {
  const id = m[2];
  const k = knownPexelsVideo(id);
  if (!k) out({ status: "pending", message: "Pexels does not let the site read its video pages automatically. Claude will open it in the browser and add it." });
  const remote = tiers(k.files);
  if (!Object.keys(remote).length) out({ status: "unsupported", message: tooSmallVideo(k.w, k.h) ?? "No 720p or larger file for this clip." });
  out({
    status: "ready",
    message: `Pexels video, best size ${k.w}×${k.h}.`,
    option: videoOption({ id: `pexels-${id}`, title: titleFrom(k.slug ?? m[1]), slug: k.slug ?? m[1], w: k.w, h: k.h, duration: k.duration, creator: k.creator, thumb: k.thumb, local: !!k.local, remote, sourceUrl: `https://www.pexels.com/video/${m[1] ? `${m[1]}-` : ""}${id}/` }),
  });
}

// ---------- Video files ----------
if (["mp4", "webm", "mov", "m4v"].includes(ext)) {
  const d = await probe(raw);
  if (!d) out({ status: "unsupported", message: "This video file could not be opened. Check the link plays in a new tab." });
  const small = tooSmallVideo(d.w, d.h);
  let id;
  let files = [{ url: raw, w: d.w, h: d.h }];
  let sourceUrl = raw;
  let slug = path.split("/").pop().replace(/\.[^.]+$/, "");
  const px = host === "videos.pexels.com" && path.match(/\/video-files\/(\d+)\//);
  const pb = host === "cdn.pixabay.com" && path.match(/\/video\/\d{4}\/\d{2}\/\d{2}\/(\d+)-[^/]*?_(large|medium|small|tiny)\.mp4$/);
  if (px) {
    id = `pexels-${px[1]}`;
    files = await pexelsSiblings(raw, d.w, d.h);
    sourceUrl = `https://www.pexels.com/video/${px[1]}/`;
    slug = `video-${px[1]}`;
  } else if (pb) {
    id = `pixabay-${pb[1]}`;
    files = [];
    for (const size of ["large", "medium", "small"]) {
      const v = raw.replace(/_(large|medium|small|tiny)\.mp4$/, `_${size}.mp4`);
      const p = size === pb[2] ? d : await probe(v);
      if (p) files.push({ url: v, w: p.w, h: p.h });
    }
    sourceUrl = `https://pixabay.com/videos/id-${pb[1]}/`;
    slug = `video-${pb[1]}`;
  } else {
    id = `link-${createHash("sha1").update(raw).digest("hex").slice(0, 8)}`;
  }
  const remote = tiers(files);
  if (!Object.keys(remote).length) out({ status: "unsupported", message: small ?? "No 720p or larger file for this clip." });
  const thumb = await poster(id, (remote.hd ?? remote.fhd ?? remote.uhd).url, d.duration);
  const best = files.reduce((a, b) => (Math.min(b.w, b.h) > Math.min(a.w, a.h) ? b : a));
  out({
    status: "ready",
    message: `${id.startsWith("link-") ? "Video file" : id.startsWith("pexels") ? "Pexels video" : "Pixabay video"}, best size ${best.w}×${best.h}${id.startsWith("link-") ? ". Its licence is not known: make sure you may use it." : "."}`,
    option: videoOption({ id, title: titleFrom(slug), slug, w: best.w, h: best.h, duration: d.duration, creator: "", thumb, local: true, remote, sourceUrl }),
    licenceUnknown: id.startsWith("link-"),
  });
}

// ---------- Photo files ----------
if (["jpg", "jpeg", "png", "webp", "avif"].includes(ext)) {
  const d = await probe(raw);
  if (!d) out({ status: "unsupported", message: "This image could not be opened. Check the link shows the picture in a new tab." });
  if (d.w < MIN_PHOTO_W) out({ status: "unsupported", message: `This photo is only ${d.w}×${d.h}. The site needs at least ${MIN_PHOTO_W} px wide.` });
  const id = `link-${createHash("sha1").update(raw).digest("hex").slice(0, 8)}`;
  const slug = path.split("/").pop().replace(/\.[^.]+$/, "");
  out({
    status: "ready",
    message: `Photo file, ${d.w}×${d.h}. Its licence is not known: make sure you may use it.`,
    option: photoOption({ id, title: titleFrom(slug), slug, w: d.w, h: d.h, thumb: raw, photoUrl: raw, sourceUrl: raw }),
    licenceUnknown: true,
  });
}

// ---------- Everything else ----------
if (/youtube\.com|youtu\.be|vimeo\.com|instagram\.com|tiktok\.com|facebook\.com/.test(host)) {
  out({ status: "unsupported", message: "Videos on YouTube, Vimeo or social sites cannot play as background film on the site. Find the clip (or a similar one) on Pexels or Pixabay and paste that link." });
}
out({ status: "pending", message: "This page cannot be read automatically. Claude will open it in the browser and add the video or photo." });
