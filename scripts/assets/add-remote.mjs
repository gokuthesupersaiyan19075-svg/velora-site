// Adds remote-only video candidates (scripts/assets/sources-round3.tsv) to media/sources.json and media/remote.json,
// and fetches each clip's small preview image as its poster. No video is downloaded.
// Run: node scripts/assets/add-remote.mjs scripts/assets/sources-round3.tsv
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = join(dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..", "..");
const tsv = process.argv[2];
if (!tsv) throw new Error("usage: node scripts/assets/add-remote.mjs <file.tsv>");
const sourcesPath = join(ROOT, "media/sources.json");
const remotePath = join(ROOT, "media/remote.json");
const sources = JSON.parse(readFileSync(sourcesPath, "utf8"));
const remote = existsSync(remotePath) ? JSON.parse(readFileSync(remotePath, "utf8")) : {};
const dims = (url) => {
  const m = url.match(/_(\d+)_(\d+)_[\d.]+fps\.mp4$/);
  return m ? { w: +m[1], h: +m[2] } : null;
};

let added = 0;
for (const line of readFileSync(join(ROOT, tsv), "utf8").split(/\r?\n/)) {
  if (!line.trim() || line.startsWith("#")) continue;
  const [category, id, slug, title, description, width, height, duration, fps, creator, creatorHandle, poster, uhd, fhd, hd] = line.split("\t");
  const key = `pexels-${id}`;
  const r = {};
  for (const [tier, url] of [["uhd", uhd], ["fhd", fhd], ["hd", hd]]) if (url) r[tier] = { url, ...dims(url) };
  remote[key] = r;
  if (!sources.some((s) => s.provider === "pexels" && s.id === id)) {
    sources.push({
      kind: "v", provider: "pexels", category, id, slug, title, description,
      width: +width, height: +height, duration: +duration, fps: +fps, creator, creatorHandle,
      url: uhd || fhd, status: "candidate", file: null, bytes: null, sha256: null, remoteOnly: true,
    });
    added++;
  }
  const dir = join(ROOT, "public/media/web", key);
  const file = join(dir, "poster.jpg");
  if (!existsSync(file)) {
    const res = await fetch(poster);
    if (!res.ok) {
      console.log(`poster failed ${key}: HTTP ${res.status}`);
      continue;
    }
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    console.log(`poster ${key}`);
  }
}
writeFileSync(sourcesPath, JSON.stringify(sources, null, 1));
writeFileSync(remotePath, JSON.stringify(remote, null, 1));
console.log(`added ${added} candidates; sources now ${sources.length}`);
