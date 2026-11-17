// Builds media/manifest.json from media/sources.json + the files present in public/media/web.
// Seeds media/approvals.json (the user's 7 picks approved) only if it does not exist yet.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = join(dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..", "..");
const sources = JSON.parse(readFileSync(join(ROOT, "media/sources.json"), "utf8"));
// Source-CDN renditions (scripts/assets/remote-renditions.mjs). Videos with these stream from the CDN.
const remotePath = join(ROOT, "media/remote.json");
const remote = existsSync(remotePath) ? JSON.parse(readFileSync(remotePath, "utf8")) : {};
/** The rendition that IS the downloaded original gets its known byte size (for the 4K speed check). */
const withBytes = (r, s) => Object.fromEntries(Object.entries(r).map(([t, f]) => [t, f.url === s.url && s.bytes ? { ...f, bytes: s.bytes } : f]));

const SCRUB = new Set(["pexels-40268711", "pexels-40268519", "pexels-13002893", "pexels-27349945", "pexels-35876722", "pexels-28000865", "pexels-32072284"]);

const LICENSE = {
  pexels: { name: "Pexels License", url: "https://www.pexels.com/license/" },
  pixabay: { name: "Pixabay Content License", url: "https://pixabay.com/service/license-summary/" },
  coverr: { name: "Coverr License", url: "https://coverr.co/license" },
};
/** Files the owner pasted from elsewhere: credited to where they came from, licence to be confirmed. */
const licenceOf = (s) => (s.provider === "link" || s.licenceUnknown ? { name: "Licence to be confirmed by the site owner", url: s.pageUrl ?? s.url } : LICENSE[s.provider]);

function sourceUrl(s) {
  if (s.pageUrl) return s.pageUrl;
  if (s.provider === "link") return s.url;
  if (s.provider === "pixabay") return `https://pixabay.com/videos/${s.slug}-${s.id}/`;
  if (s.provider === "coverr") return `https://coverr.co/videos/${s.slug.replace(/^coverr-/, "").replace(/-\d+$/, "")}`;
  return `https://www.pexels.com/${s.kind === "v" ? "video" : "photo"}/${s.slug}-${s.id}/`;
}
function creatorUrl(s) {
  if (!s.creatorHandle || s.provider === "coverr" || s.provider === "link") return null;
  if (s.provider === "pixabay") return `https://pixabay.com/users/${s.creator}-${s.creatorHandle}/`;
  return `https://www.pexels.com/@${s.creatorHandle}/`;
}

const manifest = sources.map((s) => {
  const id = `${s.provider}-${s.id}`;
  const webDir = `/media/web/${id}`;
  const has = (f) => existsSync(join(ROOT, "public", webDir, f));
  const web =
    s.kind === "v"
      ? {
          poster: `${webDir}/poster.jpg`,
          ...(remote[id] && Object.keys(remote[id]).length && { remote: withBytes(remote[id], s) }),
          // sd exists for every clip; hd/scrub only once encoded (clips in use). MediaFrame falls back to sd.
          ...(has("sd.mp4") && { sd: `${webDir}/sd.mp4` }),
          ...(has("hd.mp4") && { hd: `${webDir}/hd.mp4` }),
          ...(has("scrub.mp4") && { scrub: `${webDir}/scrub.mp4` }),
        }
      : (() => {
          // Photos: the graded copy if it exists, otherwise the untouched original.
          const graded = existsSync(join(ROOT, "public/media/graded", `${id}.jpg`)) ? `/media/graded/${id}.jpg` : "/" + s.file.replace(/^public\//, "");
          return { poster: graded, src: graded };
        })();
  return {
    id,
    kind: s.kind === "v" ? "video" : "photo",
    provider: s.provider,
    category: s.category,
    title: s.title.trim(),
    description: s.description,
    sourceUrl: sourceUrl(s),
    creator: s.creator,
    creatorUrl: creatorUrl(s),
    width: s.width,
    height: s.height,
    duration: s.duration,
    fps: s.fps,
    license: licenceOf(s),
    // Remote-only candidates have no downloaded original.
    original: s.file ? { file: s.file, bytes: s.bytes, sha256: s.sha256 } : null,
    web,
  };
});

writeFileSync(join(ROOT, "media/manifest.json"), JSON.stringify(manifest, null, 2));
const approvalsPath = join(ROOT, "media/approvals.json");
if (!existsSync(approvalsPath)) {
  const approvals = Object.fromEntries(sources.filter((s) => s.status === "approved").map((s) => [`${s.provider}-${s.id}`, "approved"]));
  writeFileSync(approvalsPath, JSON.stringify(approvals, null, 2));
}
console.log(`manifest: ${manifest.length} assets`);
