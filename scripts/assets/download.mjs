// Downloads every asset listed in sources.tsv at the largest available quality.
// Originals are written byte-for-byte (never re-encoded):
//   videos -> media/originals/videos/<provider>/<category>/<provider>-<id>-<slug>.mp4
//   photos -> public/media/photos/<category>/<provider>-<id>-<slug>.jpg  (served via next/image)
// Then writes media/sources.json with checksums and file sizes for build-manifest.mjs.
import { createHash } from "node:crypto";
import { createWriteStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync, renameSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { spawnSync } from "node:child_process";
import ffmpegPath from "ffmpeg-static";

const ROOT = join(dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..", "..");
const rows = readFileSync(join(ROOT, "scripts/assets/sources.tsv"), "utf8")
  .split(/\r?\n/)
  .filter((l) => l && !l.startsWith("#"))
  .map((l) => {
    const [kind, provider, category, id, slug, title, description, width, height, duration, fps, creator, creatorHandle, url, status] = l.split("\t");
    return { kind, provider, category, id, slug, title, description, width: +width, height: +height, duration: duration ? +duration : null, fps: fps ? +fps : null, creator, creatorHandle, url, status };
  });

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

function targetFor(r) {
  const name = `${r.provider}-${r.id}-${r.slug}`;
  return r.kind === "v"
    ? join(ROOT, "media/originals/videos", r.provider, r.category, `${name}.mp4`)
    : join(ROOT, "public/media/photos", r.category, `${name}.jpg`);
}

async function sha256(file) {
  const h = createHash("sha256");
  const { createReadStream } = await import("node:fs");
  await pipeline(createReadStream(file), h);
  return h.digest("hex");
}

async function download(r) {
  const out = targetFor(r);
  mkdirSync(dirname(out), { recursive: true });
  if (!existsSync(out)) {
    const res = await fetch(r.url, { headers: { "user-agent": UA } });
    if (!res.ok) throw new Error(`${res.status} ${r.url}`);
    const tmp = out + ".part";
    await pipeline(Readable.fromWeb(res.body), createWriteStream(tmp));
    renameSync(tmp, out);
  }
  const probed = r.kind === "v" && (!r.width || !r.duration || !r.fps) ? probe(out) : {};
  return { ...r, ...probed, file: relative(ROOT, out).replaceAll("\\", "/"), bytes: statSync(out).size, sha256: await sha256(out) };
}

// Reads width/height/duration/fps from the file itself (for sources whose pages don't list them).
function probe(file) {
  const r = spawnSync(ffmpegPath, ["-hide_banner", "-i", file], { encoding: "utf8" });
  const txt = r.stderr ?? "";
  const dur = txt.match(/Duration: (\d+):(\d+):([\d.]+)/);
  const vid = txt.match(/Video: .*?(\d{3,5})x(\d{3,5})/);
  const fps = txt.match(/([\d.]+) fps/);
  const out = {};
  if (dur) out.duration = Math.round(+dur[1] * 3600 + +dur[2] * 60 + +dur[3]);
  if (vid) {
    out.width = +vid[1];
    out.height = +vid[2];
  }
  if (fps) out.fps = +fps[1];
  return out;
}

const results = [];
const queue = [...rows];
let failed = 0;
async function worker() {
  while (queue.length) {
    const r = queue.shift();
    try {
      const d = await download(r);
      results.push(d);
      console.log(`ok   ${(d.bytes / 1e6).toFixed(1).padStart(7)} MB  ${d.file}`);
    } catch (e) {
      failed++;
      console.log(`FAIL ${r.provider}-${r.id}: ${e.message}`);
    }
  }
}
await Promise.all([worker(), worker(), worker()]);
results.sort((a, b) => rows.indexOf(rows.find((x) => x.id === a.id)) - rows.indexOf(rows.find((x) => x.id === b.id)));
writeFileSync(join(ROOT, "media/sources.json"), JSON.stringify(results, null, 2));
const total = results.reduce((s, r) => s + r.bytes, 0);
console.log(`\n${results.length} downloaded, ${failed} failed, ${(total / 1e9).toFixed(2)} GB`);
