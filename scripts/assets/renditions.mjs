// Derives graded web copies from the untouched originals (originals are only read).
//   public/media/web/<id>/poster.jpg   ≤1920w still
//   public/media/web/<id>/sd.mp4       ≤1280w H.264 — every clip (asset board, phones, fallback)
//   public/media/web/<id>/hd.mp4       ≤1920w H.264 — only clips in use (approved or picked), or all with --all
//   public/media/web/<id>/scrub.mp4    ≤1280w, keyframe every 2 frames — scroll-scrubbed clips in use
//   public/media/graded/<id>.jpg       graded full-resolution copy of each photo (served via next/image)
// The colour grade comes from media/grades.json (analyze.mjs). If a clip's grade changes, its copies are rebuilt.
// Files are written as *.part.* and renamed when complete. Two ffmpeg jobs run at once, 2 threads each.
// Usage: node scripts/assets/renditions.mjs [--all] [--only id,id]
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import ffmpeg from "ffmpeg-static";

const ROOT = join(dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..", "..");
const readJson = (p, d) => (existsSync(join(ROOT, p)) ? JSON.parse(readFileSync(join(ROOT, p), "utf8")) : d);
const sources = readJson("media/sources.json", []);
const grades = readJson("media/grades.json", {});
const approvals = readJson("media/approvals.json", {});
const choices = readJson("media/slot-choices.json", {});
const scrubList = readJson("media/scrub.json", []);
const SCRUB = new Set(scrubList);
const inUse = new Set([...Object.entries(approvals).filter(([, s]) => s === "approved").map(([id]) => id), ...Object.values(choices)]);

const all = process.argv.includes("--all");
const onlyArg = process.argv.indexOf("--only");
const only = onlyArg > -1 ? new Set(process.argv[onlyArg + 1].split(",")) : null;
const ENC = ["-threads", "2", "-filter_threads", "1", "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", "-fpsmax", "30"];

const idOf = (s) => `${s.provider}-${s.id}`;
// Remote-only candidates (no downloaded original) have nothing to encode.
const items = sources.filter((s) => s.file && (!only || only.has(idOf(s))));

function run(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", "-threads", "2", ...args], { stdio: ["ignore", "ignore", "inherit"] });
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error("ffmpeg exit " + code))));
  });
}

async function make(file, inputArgs, outputArgs) {
  if (existsSync(file)) return false;
  const part = file.replace(/\.(\w+)$/, ".part.$1");
  try {
    await run([...inputArgs, ...outputArgs, part]);
  } catch (e) {
    rmSync(part, { force: true });
    throw e;
  }
  renameSync(part, file);
  return true;
}

const vf = (id, scale) => [grades[id]?.filter, scale].filter(Boolean).join(",");

function prepare(s) {
  const id = idOf(s);
  const out = join(ROOT, "public/media/web", id);
  mkdirSync(out, { recursive: true });
  for (const f of readdirSync(out)) if (f.includes(".part.")) rmSync(join(out, f), { force: true });
  // Rebuild everything if the grade changed since the copies were made.
  const sig = join(out, "grade.txt");
  const want = grades[id]?.filter ?? "";
  if (!existsSync(sig) || readFileSync(sig, "utf8") !== want) {
    for (const f of ["poster.jpg", "sd.mp4", "hd.mp4", "scrub.mp4"]) rmSync(join(out, f), { force: true });
    writeFileSync(sig, want);
  }
  return out;
}

const JOBS = Number(process.env.JOBS ?? 2);
async function pool(tasks, size = JOBS) {
  const queue = [...tasks];
  let failed = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (queue.length) {
        const t = queue.shift();
        try {
          await t();
        } catch (e) {
          failed++;
          console.log("FAIL", e.message);
        }
      }
    }),
  );
  return failed;
}

const videos = items.filter((s) => s.kind === "v");
const photos = items.filter((s) => s.kind === "p");
const dirs = new Map(videos.map((s) => [idOf(s), prepare(s)]));

// Photos: graded full-resolution copy
await pool(
  photos.map((s) => async () => {
    const id = idOf(s);
    mkdirSync(join(ROOT, "public/media/graded"), { recursive: true });
    const sig = join(ROOT, "public/media/graded", `${id}.grade.txt`);
    const file = join(ROOT, "public/media/graded", `${id}.jpg`);
    const want = grades[id]?.filter ?? "";
    if (existsSync(sig) && readFileSync(sig, "utf8") !== want) rmSync(file, { force: true });
    if (await make(file, ["-i", join(ROOT, s.file)], [...(want ? ["-vf", want] : []), "-q:v", "2"])) console.log(`photo ${id}`);
    writeFileSync(sig, want);
  }),
);

// Pass 0: posters
await pool(
  videos.map((s) => async () => {
    const id = idOf(s);
    const at = s.duration && s.duration < 3 ? "0" : "1";
    if (await make(join(dirs.get(id), "poster.jpg"), ["-ss", at, "-i", join(ROOT, s.file)], ["-frames:v", "1", "-vf", vf(id, "scale='min(1920,iw)':-2"), "-q:v", "3"])) console.log(`poster ${id}`);
  }),
);

// Pass 1: sd for every clip
await pool(
  videos.map((s) => async () => {
    const id = idOf(s);
    const t0 = Date.now();
    if (await make(join(dirs.get(id), "sd.mp4"), ["-i", join(ROOT, s.file)], ["-vf", vf(id, "scale='min(1280,iw)':-2"), "-preset", "fast", "-crf", "24", ...ENC]))
      console.log(`sd ${id} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }),
);

// Pass 2: hd (+ scrub) for clips in use
await pool(
  videos
    .filter((s) => all || inUse.has(idOf(s)))
    .map((s) => async () => {
      const id = idOf(s);
      const t0 = Date.now();
      const a = await make(join(dirs.get(id), "hd.mp4"), ["-i", join(ROOT, s.file)], ["-vf", vf(id, "scale='min(1920,iw)':-2"), "-preset", "medium", "-crf", "21", ...ENC]);
      const b = SCRUB.has(id)
        ? await make(join(dirs.get(id), "scrub.mp4"), ["-i", join(ROOT, s.file)], ["-vf", vf(id, "scale='min(1280,iw)':-2"), "-preset", "medium", "-crf", "23", "-g", "2", "-keyint_min", "2", "-sc_threshold", "0", ...ENC])
        : false;
      if (a || b) console.log(`hd ${id} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    }),
);
console.log("renditions done");
