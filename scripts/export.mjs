// Builds the public site as static files in out/ for Cloudflare Pages (free; the site no longer needs
// this laptop). Steps:
//  1. every local photo and video poster in the media manifest → WebP at 640/1080/1600/2400 px
//     in public/media/sized (skipped when already made; generated, so git-ignored);
//  2. next build with VELORA_EXPORT=1 (studio and APIs left out, see next.config.ts);
//  3. out/ is trimmed to what the live site uses: local .mp4 copies (videos stream from the source CDNs),
//     untouched photo originals and graded full-size copies (served from /media/sized instead) are removed.
// Run: node scripts/export.mjs   then deploy with: npx wrangler pages deploy out
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import sharp from "sharp";

const ROOT = join(dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..");
const WIDTHS = [640, 1080, 1600, 2400];
const manifest = JSON.parse(readFileSync(join(ROOT, "media/manifest.json"), "utf8"));

// 1. sized images
const srcs = new Set();
for (const a of manifest) {
  if (a.web?.poster?.startsWith("/media/")) srcs.add(a.web.poster);
  if (a.web?.src?.startsWith("/media/")) srcs.add(a.web.src);
}
// Stills the pages reference directly (chosen frames such as poster-park.jpg), not via the manifest.
for (const dir of readdirSync(join(ROOT, "public/media/web"))) {
  for (const f of ["poster-park.jpg"]) if (existsSync(join(ROOT, "public/media/web", dir, f))) srcs.add(`/media/web/${dir}/${f}`);
}
let made = 0;
for (const src of srcs) {
  const file = join(ROOT, "public", src);
  if (!existsSync(file)) continue;
  const base = src.slice("/media/".length).replace(/\.[a-z]+$/i, "");
  for (const w of WIDTHS) {
    const out = join(ROOT, "public/media/sized", `${base}-${w}.webp`);
    if (existsSync(out)) continue;
    mkdirSync(dirname(out), { recursive: true });
    await sharp(file).resize({ width: w, withoutEnlargement: true }).webp({ quality: w >= 1600 ? 82 : 78, effort: 5 }).toFile(out);
    made++;
  }
}
console.log(`sized images: ${srcs.size} sources, ${made} new files`);

// 2. build
rmSync(join(ROOT, "out"), { recursive: true, force: true });
execSync("npx next build", { cwd: ROOT, stdio: "inherit", env: { ...process.env, VELORA_EXPORT: "1" } });

// 3. trim
const OUT = join(ROOT, "out");
let removed = 0;
let bytes = 0;
const walk = (dir, fn) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, fn);
    else fn(p);
  }
};
const drop = (p) => {
  bytes += statSync(p).size;
  rmSync(p);
  removed++;
};
walk(join(OUT, "media"), (p) => {
  const rel = p.slice(OUT.length).replace(/\\/g, "/");
  // media/clips holds the few site-hosted, size-optimised clips (served from the site itself, not a CDN).
  if (rel.endsWith(".mp4") && !rel.startsWith("/media/clips/")) drop(p);
  else if (rel.startsWith("/media/photos/") || rel.startsWith("/media/graded/")) drop(p);
});
// Next writes per-page navigation data as folders (__next.thrillverse/attractions/__PAGE__.txt) but the
// browser asks for the flat name (__next.thrillverse.attractions.__PAGE__.txt). Add the flat copies so
// in-site links stay instant instead of falling back to full page loads.
let flat = 0;
const flatten = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (!statSync(p).isDirectory()) continue;
    if (name.startsWith("__next.")) {
      walk(p, (f) => {
        const rel = f.slice(dir.length + 1).replace(/\\/g, "/").split("/").join(".");
        writeFileSync(join(dir, rel), readFileSync(f));
        flat++;
      });
    } else flatten(p);
  }
};
flatten(OUT);
console.log(`navigation data: ${flat} flat copies`);
let total = 0;
let files = 0;
walk(OUT, (p) => {
  total += statSync(p).size;
  files++;
});
console.log(`trimmed ${removed} files (${Math.round(bytes / 1e6)} MB). out/: ${files} files, ${Math.round(total / 1e6)} MB`);
