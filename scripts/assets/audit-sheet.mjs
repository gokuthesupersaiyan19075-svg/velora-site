// Contact sheets of the chooser options for a visual check: one row per frame (current picture first,
// then the options), 5 frames per sheet. Written to the folder given as the first argument.
// Run: node scripts/assets/audit-sheet.mjs <outDir> [wonderverse|thrillverse]
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import ffmpeg from "ffmpeg-static";

const ROOT = join(dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..", "..");
const out = process.argv[2];
const worlds = process.argv[3] ? [process.argv[3]] : ["wonderverse", "thrillverse"];
mkdirSync(out, { recursive: true });
const data = JSON.parse(readFileSync(join(ROOT, "media/scout/choose.json"), "utf8"));
const W = 240, H = 135, COLS = 7, PER = 5;
const src = (o) => (o.local ? join(ROOT, "public", o.thumb) : `${o.thumb}?auto=compress&cs=tinysrgb&w=320`);

for (const world of worlds) {
  const frames = data[world].filter((f) => !f.locked);
  for (let s = 0; s * PER < frames.length; s++) {
    const chunk = frames.slice(s * PER, s * PER + PER);
    const inputs = [];
    const layout = [];
    chunk.forEach((f, r) => {
      const row = [f.current, ...f.options].slice(0, COLS);
      row.forEach((o, c) => {
        if (!o) return;
        inputs.push(src(o));
        layout.push(`${c * W}_${r * H}`);
      });
    });
    const scale = inputs.map((_, i) => `[${i}:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1[v${i}]`).join(";");
    const stack = `${inputs.map((_, i) => `[v${i}]`).join("")}xstack=inputs=${inputs.length}:layout=${layout.join("|")}:fill=black[o]`;
    const file = join(out, `${world}-${s + 1}.jpg`);
    const r = spawnSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", ...inputs.flatMap((i) => ["-i", i]), "-filter_complex", `${scale};${stack}`, "-map", "[o]", "-frames:v", "1", "-q:v", "4", file], { encoding: "utf8" });
    console.log(file, r.status === 0 ? "ok" : r.stderr.slice(0, 200), chunk.map((f) => f.slot.split(".").slice(1).join(".")).join(", "));
  }
}
