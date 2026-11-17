// Splits every asset into two disjoint pools, one per experience, by mood, balanced per category.
// Output: media/pools.json  { wonderverse: { <category>: [ids, most vibrant first] }, thrillverse: {...} }
// An asset appears in exactly one pool. Pins below override the scoring.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = join(dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..", "..");
const sources = JSON.parse(readFileSync(join(ROOT, "media/sources.json"), "utf8"));
const grades = JSON.parse(readFileSync(join(ROOT, "media/grades.json"), "utf8"));
const EXP = ["wonderverse", "thrillverse"];

// Worlds are split by INTENSITY, not land vs water:
// wonderverse = magical, family, children, gentle water, shows, food, exploring, lights;
// thrillverse = extreme coasters, high speed, big drops, extreme slides/rafting, intense waves, adventure, POV.
const PIN = {
  // Wonderverse keeps its approved coaster scene (S03 coaster tile + S04 rush, kept exactly) and its golden-hour shots.
  "pexels-39670423": "wonderverse", "pexels-40268711": "wonderverse", "pexels-18925870": "wonderverse", "pexels-27349945": "wonderverse",
  "pexels-28000865": "wonderverse", "pexels-19026924": "wonderverse", "pexels-32072285": "wonderverse", "pexels-32409527": "wonderverse",
  "pexels-32409526": "wonderverse", "pexels-37304489": "wonderverse", "pexels-20453549": "wonderverse", "pexels-27993338": "wonderverse",
  "pexels-32072284": "wonderverse", "pexels-38908305": "wonderverse",
  // Thrillverse: rider POV, coasters, swings, drops.
  "pexels-13002893": "thrillverse", "pexels-40268519": "thrillverse", "pexels-40268459": "thrillverse", "pexels-3006889": "thrillverse",
  "pexels-14367734": "thrillverse", "pixabay-126085": "thrillverse",
};

// The user's own picks from the first review round (media/slot-choices-round1.json), assigned to the world they now fit.
const USER = {
  wonderverse: ["pexels-12794397", "pexels-29905597", "pexels-9523083", "pexels-35134246", "pixabay-168213", "pexels-12226882", "pexels-35876717", "pexels-11657969", "pexels-31166929", "pexels-26575927", "pexels-5486824", "pexels-36218475", "pexels-10149156"],
  thrillverse: ["pexels-35364474", "pexels-40075194", "pexels-35876722", "pexels-33243268", "pexels-32963347", "pexels-15566658", "pexels-39762097"],
};
for (const [e, ids] of Object.entries(USER)) for (const id of ids) PIN[id] ??= e;
// Round 3 (remote-only) was sourced for Thrillverse's gaps: rafting, surf, zip line, extreme slides, ropes.
// Chooser picks belong to the world they were picked for; this beats every rule above.
const slotChoices = JSON.parse(readFileSync(join(ROOT, "media/slot-choices.json"), "utf8"));
for (const [slot, id] of Object.entries(slotChoices)) PIN[id] = slot.split(".")[0];
for (const src of sources) if (src.world) PIN[`${src.provider}-${src.id}`] ??= src.world;
for (const src of sources) if (src.remoteOnly) PIN[`${src.provider}-${src.id}`] ??= "thrillverse";
const USER_PICK = new Set(Object.values(USER).flat());

const MOOD = {
  wonderverse: /carousel|ferris|wheel|family|kid|child|girl|boy|parent|candy|popcorn|food|treat|parade|show|perform|juggl|circus|lantern|lights|sunset|dusk|twilight|golden|evening|vintage|horses|pool|fountain|relax|gentle|swimming/i,
  thrillverse: /coaster|pov|thrill|extreme|drop|tower|pendulum|loop|scream|speed|fast|rapid|raft|surf|wave|zip|slide|spin|swing|adventure|exciting/i,
};
// Share of each category that goes to Thrillverse (the rest to Wonderverse).
const THRILL_SHARE = { coaster: 0.75, rides: 0.6, water: 0.5, night: 0.4, aerial: 0.45, family: 0.1, food: 0.15, shows: 0.15 };

const items = sources.map((s) => {
  const id = `${s.provider}-${s.id}`;
  const g = grades[id]?.stats ?? { sat: 30, yavg: 90 };
  const text = `${s.slug} ${s.title}`;
  const score = Object.fromEntries(EXP.map((e) => [e, MOOD[e].test(text) ? 2 : 0]));
  return { id, category: s.category, kind: s.kind, vib: g.sat * (s.kind === "v" ? 1.15 : 1) + Math.min(s.width, 3840) / 400, score };
});

const pools = Object.fromEntries(EXP.map((e) => [e, {}]));
const add = (e, it) => ((pools[e][it.category] ??= []).push(it));

// Pinned first
for (const it of items) if (PIN[it.id]) add(PIN[it.id], it);
// Then per category: most vibrant first; the clearer intensity match wins while that world is under its share.
const cats = [...new Set(items.map((i) => i.category))];
for (const c of cats) {
  const all = items.filter((i) => i.category === c);
  const target = { thrillverse: Math.round(all.length * (THRILL_SHARE[c] ?? 0.5)) };
  target.wonderverse = all.length - target.thrillverse;
  const rest = all.filter((i) => !PIN[i.id]).sort((a, b) => b.vib - a.vib);
  for (const it of rest) {
    const count = (e) => pools[e][c]?.length ?? 0;
    const open = EXP.filter((e) => count(e) < target[e]);
    const choices = (open.length ? open : EXP).slice().sort((a, b) => it.score[b] - it.score[a] || (target[b] - count(b)) - (target[a] - count(a)));
    add(choices[0], it);
  }
}
// Order each pool most vibrant first; pinned assets lead.
const out = {};
for (const e of EXP) {
  out[e] = {};
  for (const [c, list] of Object.entries(pools[e])) out[e][c] = list.sort((a, b) => (USER_PICK.has(b.id) ? 2 : PIN[b.id] ? 1 : 0) - (USER_PICK.has(a.id) ? 2 : PIN[a.id] ? 1 : 0) || b.vib - a.vib).map((i) => i.id);
}
writeFileSync(join(ROOT, "media/pools.json"), JSON.stringify(out, null, 2));
for (const e of EXP) console.log(e, Object.entries(out[e]).map(([c, l]) => `${c}:${l.length}`).join(" "));
const all = EXP.flatMap((e) => Object.values(out[e]).flat());
console.log("total", all.length, "unique", new Set(all).size);
