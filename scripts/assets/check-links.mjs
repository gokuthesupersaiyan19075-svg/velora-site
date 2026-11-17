// Checks that every remote video file the site uses still loads (run before each deploy).
// Default: only assets that a slot currently resolves to are checked; --all checks every candidate.
// Requests one byte of each file (a range request), so nothing is downloaded.
// Exit code 1 if any file is broken, with the slot to fix printed.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = join(dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..", "..");
const manifest = JSON.parse(readFileSync(join(ROOT, "media/manifest.json"), "utf8"));
const all = process.argv.includes("--all");

// Which ids are in use: the user's slot choices plus each pool's top picks are approximated by
// approvals + slot-choices; --all covers everything.
const read = (f) => {
  try {
    return JSON.parse(readFileSync(join(ROOT, f), "utf8"));
  } catch {
    return {};
  }
};
const choices = read("media/slot-choices.json");
const approvals = read("media/approvals.json");
const inUse = new Set([...Object.values(choices).filter(Boolean), ...Object.entries(approvals).filter(([, s]) => s === "approved").map(([id]) => id)]);

const targets = [];
for (const a of manifest) {
  if (a.kind !== "video" || !a.web.remote) continue;
  if (!all && !inUse.has(a.id)) continue;
  for (const [tier, r] of Object.entries(a.web.remote)) targets.push({ id: a.id, tier, url: r.url });
}

async function check(t) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(t.url, { headers: { range: "bytes=0-0", referer: "https://velora.pages.dev/" }, redirect: "follow" });
      await res.body?.cancel();
      if (res.status === 200 || res.status === 206) return null;
      if (attempt) return `HTTP ${res.status}`;
    } catch (e) {
      if (attempt) return e.message;
    }
  }
  return "failed";
}

let bad = 0;
const queue = [...targets];
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const t = queue.shift();
      const err = await check(t);
      if (err) {
        bad++;
        const slots = Object.entries(choices).filter(([, id]) => id === t.id).map(([s]) => s);
        console.log(`BROKEN ${t.id} ${t.tier} ${err}${slots.length ? `  used by ${slots.join(", ")}` : ""}\n  ${t.url}`);
      }
    }
  }),
);
console.log(`${targets.length - bad}/${targets.length} remote files OK${all ? " (all candidates)" : " (in use)"}`);
process.exit(bad ? 1 : 0);
