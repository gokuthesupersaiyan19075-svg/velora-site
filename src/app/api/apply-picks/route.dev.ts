import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";

// Dev-only: puts the chooser's picks (and pasted links) on the site. Runs the same steps Claude runs by
// hand: import the picks, re-split the two worlds' pools, rebuild the media manifest. The dev server
// reloads with the new pictures.
const run = promisify(execFile);
const STEPS = ["scripts/assets/import-picks.mjs", "scripts/assets/pools.mjs", "scripts/assets/build-manifest.mjs"];

export async function POST() {
  if (process.env.NODE_ENV !== "development") return new Response("Not available", { status: 403 });
  const log: string[] = [];
  for (const step of STEPS) {
    try {
      const { stdout } = await run(process.execPath, [join(process.cwd(), step)], { cwd: process.cwd(), timeout: 300000 });
      log.push(stdout.trim().split("\n").slice(-2).join(" "));
    } catch (e) {
      const err = e as { stderr?: string; message?: string };
      return Response.json({ ok: false, step, log, error: (err.stderr || err.message || "failed").slice(-800) }, { status: 500 });
    }
  }
  return Response.json({ ok: true, log });
}
