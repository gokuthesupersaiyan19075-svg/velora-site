// Applies the picture chooser picks (media/scout/picks.json):
// - new finds are added to media/sources.json (+ media/remote.json for videos) as approved, remote-only assets;
//   videos get their small preview image as a poster, photos are saved once at 2400 px (selected photos only);
// - every pick is approved (media/approvals.json) and set on its frame (media/slot-choices.json).
// Then run pools.mjs and build-manifest.mjs.  Run: node scripts/assets/import-picks.mjs
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = join(dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..", "..");
const read = (f, d) => (existsSync(join(ROOT, f)) ? JSON.parse(readFileSync(join(ROOT, f), "utf8")) : d);
const write = (f, v) => writeFileSync(join(ROOT, f), JSON.stringify(v, null, f.endsWith("sources.json") || f.endsWith("remote.json") ? 1 : 2));

// Your picks win; media/scout/defaults.json fills frames you left alone whose old default repeated
// another frame's picture or did not match its description.
const picks = { ...read("media/scout/defaults.json", {}), ...read("media/scout/picks.json", {}) };
const choose = read("media/scout/choose.json", {});
const sources = read("media/sources.json", []);
const remote = read("media/remote.json", {});
const approvals = read("media/approvals.json", {});
const choices = read("media/slot-choices.json", {});
const known = new Set(sources.map((s) => `${s.provider}-${s.id}`));

const options = new Map();
for (const frames of Object.values(choose)) for (const f of frames) for (const o of [f.current, ...f.options]) if (o) options.set(o.id, o);
// Links pasted into the chooser (media/scout/links.json) are options too.
const links = read("media/scout/links.json", []);
for (const l of links) if (l.status === "ready" && l.option) options.set(l.option.id, { ...l.option, licenceUnknown: !!l.licenceUnknown });

/** Library category from the frame the asset was picked for. */
function categoryFor(slot, needs) {
  const t = `${slot} ${needs}`.toLowerCase();
  if (/aerial|visit|panorama/.test(t)) return "aerial";
  if (/night|after dark|lit /.test(t)) return "night";
  if (/coaster|airtime|pov/.test(t)) return "coaster";
  if (/water|slide|flume|raft|surf|wave|splash/.test(t)) return "water";
  if (/food|treat|fuel/.test(t)) return "food";
  if (/show|perform/.test(t)) return "shows";
  if (/family|child|kid|couple/.test(t)) return "family";
  return "rides";
}

const needsOf = new Map();
for (const frames of Object.values(choose)) for (const f of frames) needsOf.set(f.slot, f.needs);

let added = 0;
for (const [slot, id] of Object.entries(picks)) {
  const world = slot.split(".")[0];
  if (!known.has(id)) {
    const o = options.get(id);
    if (!o) {
      console.log(`SKIP ${slot}: ${id} not found in the chooser data`);
      continue;
    }
    const [provider, num] = [id.split("-")[0], id.split("-").slice(1).join("-")];
    const slug = o.slug ?? o.sourceUrl.replace(/\/$/, "").split("/").pop().replace(new RegExp(`-${num}$`), "");
    const category = categoryFor(slot, needsOf.get(slot) ?? "");
    const entry = {
      kind: o.kind === "video" ? "v" : "p", provider, category, id: num, slug,
      title: o.title.replace(/^./, (c) => c.toUpperCase()), description: o.title.replace(/^./, (c) => c.toUpperCase()) + ".",
      width: o.width, height: o.height, duration: o.duration ?? null, fps: null, creator: o.creator || "Pexels contributor", creatorHandle: "",
      url: o.kind === "video" ? (o.remote?.uhd ?? o.remote?.fhd ?? o.remote?.hd)?.url : (o.photoUrl ?? `${o.thumb}?auto=compress&cs=tinysrgb&w=2400`),
      status: "approved", file: null, bytes: null, sha256: null, remoteOnly: true, world,
      // Pasted links: where it came from, and whether its licence still has to be confirmed.
      ...(o.fromLink && { pageUrl: o.sourceUrl }),
      ...(o.licenceUnknown && { licenceUnknown: true }),
    };
    if (o.kind === "video") {
      remote[id] = o.remote;
      const dir = join(ROOT, "public/media/web", id);
      if (!existsSync(join(dir, "poster.jpg"))) {
        const res = await fetch(`${o.thumb}?auto=compress&cs=tinysrgb&w=1440`);
        if (!res.ok) throw new Error(`poster ${id}: HTTP ${res.status}`);
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, "poster.jpg"), Buffer.from(await res.arrayBuffer()));
      }
    } else {
      // Photos are hosted with the site (not hotlinked): one 2400 px copy of the selected photo.
      const rel = `public/media/photos/${category}/${id}-${slug}.jpg`;
      if (!existsSync(join(ROOT, rel))) {
        const res = await fetch(entry.url);
        if (!res.ok) throw new Error(`photo ${id}: HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        mkdirSync(dirname(join(ROOT, rel)), { recursive: true });
        writeFileSync(join(ROOT, rel), buf);
        entry.bytes = buf.length;
        entry.sha256 = createHash("sha256").update(buf).digest("hex");
      }
      entry.file = rel;
    }
    sources.push(entry);
    known.add(id);
    added++;
  }
  approvals[id] = "approved";
  choices[slot] = id;
}

write("media/sources.json", sources);
write("media/remote.json", remote);
write("media/approvals.json", approvals);
write("media/slot-choices.json", choices);
console.log(`picks ${Object.keys(picks).length}: ${added} new assets added, all approved and set on their frames`);
