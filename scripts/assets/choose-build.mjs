// Builds the picture chooser (/studio/choose): for every frame of both worlds, up to 6 options that
// MATCH the frame's description (by title keywords), are vivid (measured colour and exposure), and are
// UNIQUE (no option appears in two frames, and nothing already picked is offered again).
// Pool: search results saved in media/intake (v-*, p-*, t-*) and media/scout/raw-*.txt, plus the
// existing candidates in media/manifest.json. Nothing is downloaded: colour is measured with ffmpeg from
// each clip's small preview image (cached in media/scout/stats.json).
// Run: node scripts/assets/choose-build.mjs
import { spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import ffmpeg from "ffmpeg-static";

const ROOT = join(dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..", "..");
const read = (f, d) => (existsSync(join(ROOT, f)) ? JSON.parse(readFileSync(join(ROOT, f), "utf8")) : d);
const manifest = read("media/manifest.json", []);
const grades = read("media/grades.json", {});
const choices = read("media/slot-choices.json", {});
const statsCache = read("media/scout/stats.json", {});

// ---------- Frames and what they must show (regexes run on the title/slug/alt text) ----------
const ok = (r, t) => (typeof r === "function" ? r(t) : r.test(t));
const all = (...res) => (t) => res.every((r) => ok(r, t));
const any = (...res) => (t) => res.some((r) => ok(r, t));
const not = (f, r) => (t) => f(t) && !r.test(t);
const PARK = /amusement|theme park|carnival|fair|funfair|fairground|ride|coaster|ferris/;
const NIGHT = /night|neon|illuminat|lights|lit |glow|after dark/;
// "tower" in titles that are not rides.
const TOWER_NOT = /forest|tv tower|radar|watch|castle|skylon|landmark|petrin|mast|lookout|statue|skyline|cityscape|berlin|prague/;

const FRAMES = {
  wonderverse: [
    ["s01.hero", "Wide establishing shot of the park at golden hour", "video", all(/sunset|dusk|golden|twilight|evening/, PARK)],
    ["s02.panorama", "Daytime aerial panorama of the whole park", "any", not(all(/aerial|drone|bird|top view|above/, PARK), /night/)],
    ["s02.detail", "Close ride detail for the foreground parallax layer", "any", not(all(/carousel|ride|lights|colorful|vibrant/, PARK), /aerial|drone/)],
    ["s03.coaster", "Night Comet: illuminated family coaster", "video", all(/coaster/, NIGHT)],
    ["s03.swing", "Orbit Flyer: tower swings at dusk", "video", any(/swing|swinger|chain ride/)],
    ["s03.carousel", "Aurelia Carousel: close-up with lights", "video", any(/carousel|merry.go/)],
    ["s03.wheel", "The VELORA Wheel against the sky", "video", not(any(/ferris|big wheel|observation wheel/), /night|neon/)],
    ["s03.water", "Lagoon Rapids: splash boat or gentle water ride", "video", not(any(/log flume|flume|splash|water ride|boat ride/), /raft|surf|extreme/)],
    ["s05.family-1", "A family on a carousel", "any", all(/family|mother|father|parent|mom|dad/, /carousel|merry|ride|amusement|fair/)],
    ["s05.family-2", "Children laughing on a ride", "any", not(all(/child|children|kid|girl|boy|toddler/, /ride|laugh|smil|fun|bumper|amusement|fair|carousel/), /couple/)],
    ["s05.family-3", "A couple sharing a treat at the fair", "any", all(/couple|lovers|boyfriend|girlfriend/, /candy|cotton|treat|ice cream|popcorn|fair|carnival|amusement/)],
    ["s05.family-4", "Portrait: kids on carousel horses", "any", all(/child|children|kid|girl|boy/, /carousel|horse/)],
    ["s06.food", "Treats being made at a food stand", "any", not(any(/cotton candy|popcorn|candy|churro|donut|doughnut|snack|treat|sweets|food stand|ice cream/), /couple/)],
    ["s06.shows", "A live performer on stage", "any", any(/perform|parade|circus|juggl|acrobat|fire (show|dancer|performer|breath)|dancer|stage|show/)],
    ["s06.water", "Splash Lagoon: gentle slides, pools and splash play", "any", not(any(/water ?park|pool|splash pad|kids.*water|lazy river/), /raft|surf|extreme/)],
    ["s07.dusk", "The park at sunset, lights coming on", "any", all(/sunset|dusk|twilight|evening/, PARK)],
    ["s07.night-1", "Rides lit up at night", "any", not(all(NIGHT, PARK), /ferris|wheel/)],
    ["s07.night-2", "Ferris wheels glowing at night", "any", all(/ferris|wheel/, NIGHT)],
    ["s07.finale", "Ferris wheel, full frame, at night", "video", all(/ferris|wheel/, NIGHT)],
    ["s08.visit", "Aerial photograph for the visit section", "photo", all(/aerial|drone|top view|bird|above/, PARK)],
    ["s09.final", "Closing wide shot of the park at night", "any", any(/firework/, all(/aerial|drone|wide|panoram|skyline/, NIGHT, PARK))],
    // Inner pages
    ["attractions.bumper-bay", "Bumper Bay: bumper cars with riders laughing", "any", any(/bumper|dodgem/), "pexels-5486824"],
    ["attractions.whirligig", "Whirligig: a colourful family spinning ride", "any", not(any(/spin|teacup|tea cup|whirl|twirl|rotat/), /extreme|thrill|wheel/), "pexels-32820838"],
    ["attractions.little-comet", "Little Comet: a small junior coaster with gentle hills", "any", all(/coaster/, /kid|child|junior|family|small|little|mini/), "pexels-9445929"],
    ["attractions.cascade-slides", "Cascade Slides: a tower of twisting water slides", "any", all(/slide/, /water|aqua|pool|park/), "pexels-2605030"],
    ["food.midway-kitchen", "Midway Kitchen: people gathered at a food stand", "any", any(/food (stand|stall|truck)|street food|vendor|concession|hot dog|burger/), "pexels-15721552"],
    ["food.lantern-night-market", "Lantern Night Market: street-food stalls under lights", "any", all(/market|stall|street food|vendor|food/, /night|lantern|lights|neon|evening/), "pexels-32223212"],
    ["shows.parade-of-lights", "Parade of Lights: costumed performers in a moving parade", "any", any(/parade|costume|performer|carnival danc/), "pexels-36218475"],
    ["shows.night-bloom", "Night Bloom: fireworks over water at night", "any", any(/firework/), "pexels-18686281"],
    ["food-and-shows.hero", "Food and shows page opening shot: treats being made at night", "any", any(/cotton candy|popcorn|candy|churro|donut|doughnut|sweets|treat|ice cream|caramel/), "pexels-35345803"],
  ],
  thrillverse: [
    ["s01.hero", "Extreme coaster at full speed", "video", not(any(/coaster/), /kid|child|junior|family|toy/)],
    ["s02.aerial", "Fast aerial sweep over the thrill rides", "video", not(all(/aerial|drone/, /coaster|ride|thrill|amusement|fair|carnival/), /water|pool|slide/)],
    ["s02.flash-1", "Quick cut: Tempest, giant pendulum", "video", any(/pendulum|frisbee|tempest|extreme ride|thrill ride/)],
    ["s02.flash-2", "Quick cut: Starfall Tower drop", "video", not(any(/drop|free ?fall|freefall|tower/), TOWER_NOT)],
    ["s02.flash-3", "Quick cut: Freefall Flume extreme slide", "video", all(/slide/, /water|aqua|pool/)],
    ["s03.ride-coaster", "Skyline Serpent: looping coaster", "video", not(any(/coaster/), /kid|child|junior|night|aerial|drone/)],
    ["s03.ride-swing", "Tempest: giant swinging pendulum", "video", any(/pendulum|frisbee|extreme ride|thrill ride/)],
    ["s03.ride-spin", "Vortex: spinning thrill ride", "video", not(any(/spin|rotat|twirl|whirl|vortex|octopus|tilt|scrambler/), /carousel|wheel/)],
    ["s03.ride-carousel", "Velocity Ridge: high-speed coaster, airtime", "video", not(any(/coaster/), /kid|child|junior|night/)],
    ["s03.ride-bumper", "Starfall Tower: drop tower", "video", not(any(/drop|free ?fall|tower/), TOWER_NOT)],
    ["s03.ride-splash", "Riptide Rapids: white-water rafting", "video", any(/rafting|raft|white ?water/)],
    ["s03.ride-slides", "Freefall Flume: extreme speed slide", "video", all(/slide/, /water|aqua|pool|park/)],
    ["s04.thrill", "Coaster POV for the scroll-scrubbed sequence", "video", all(/coaster/, /pov|point of view|first person|onboard|front seat|riding|riders|people (on|riding|enjoying)/)],
    ["s04.cut-1", "Cut: spinning ride close", "video", not(any(/spin|rotat|twirl|whirl|octopus|tilt|scrambler/), /wheel|carousel/)],
    ["s04.cut-2", "Cut: ride at night, fast", "video", not(all(NIGHT, /ride|coaster|thrill/), /carousel|wheel/)],
    ["s05.family-1", "Adventure: Summit Challenge zip line or ropes course", "video", any(/zip ?line|ziplin|ropes course|high rope/)],
    ["s05.family-2", "Adventure: climbing or high ropes", "any", any(/climb|rope|obstacle|bridge|tree ?top/)],
    ["s05.family-3", "Breaker Bay: powerful surf wave", "video", any(/surf|big wave|waves/)],
    ["s05.family-4", "Rider POV or screaming riders", "video", not(any(/scream|riders|people (on|riding)|thrill|excit/), /watercraft|jet ?ski|boat|ferris|wheel|carousel/)],
    ["s06.food-1", "Fuel: hearty food between rides", "any", not(any(/(food|burgers?|hot dogs?|fries|grill|street food|eat|eating|snacks?)/), /slide|pool|water ?park|paint|cotton candy/)],
    ["s06.food-2", "Link tile to Wonderverse treats and shows", "any", any(/(food|snacks?|treats?|candy|popcorn|drinks?|ice cream)/)],
    ["s06.show-1", "Ride: Summit Challenge zip line", "video", any(/zip ?line|ziplin/)],
    ["s06.show-2", "Ride: Vortex after dark", "video", not(all(NIGHT, /spin|ride|thrill/), /carousel|wheel/)],
    ["s06.show-3", "Ride: Velocity Ridge airtime", "video", any(/coaster/)],
    ["s06.splash", "Surf: Breaker Bay waves", "video", any(/surf|wave/)],
    ["s07.night-1", "Coasters lit at night", "video", all(/coaster|thrill ride|night ride/, NIGHT)],
    ["s07.night-2", "Thrill rides lit at night", "video", not(all(NIGHT, /ride|thrill/), /carousel|ferris|wheel/)],
    ["s07.night-3", "Swing or drop ride at night", "video", all(/swing|drop|tower|pendulum/, NIGHT)],
    ["s08.visit", "Aerial photograph of the park by day", "photo", not(all(/aerial|drone|top view|bird|above/, PARK), /night/)],
    ["s09.final", "Closing shot: coaster or thrill ride at night", "video", not(all(/coaster|thrill|ride/, NIGHT), /carousel|merry/)],
    // Inner pages
    ["p.attractions.hero", "Attractions page hero: coaster train on a steep drop or a line-up of thrill rides", "video", not(any(/coaster|drop|thrill ride/), /kid|child|junior|family/), "pexels-40268459"],
    ["p.food.hero", "Food page hero: hearty food between rides (burgers, grill, street food)", "any", not(any(/burgers?|grill|street food|hot dogs?|fries|bbq|barbecue/), /cotton candy|candy/), "pexels-6184158"],
    ["p.plan.hero", "Plan page hero: wide daytime view over the thrill rides", "any", not(all(/aerial|drone|wide|panoram|view/, /coaster|ride|amusement|theme park/), /night/), "pexels-6115291"],
    ["p.tickets.hero", "Tickets page hero: coaster or thrill ride lit at night, fast", "video", not(all(/coaster|thrill|ride/, NIGHT), /carousel|merry|ferris/), "pexels-32668864"],
  ],
};
// Frames that are approved and kept exactly (no new options offered).
const LOCKED = new Set(["wonderverse.s04.rush", "wonderverse.s04.rush-night", "wonderverse.s04.rush-spin"]);
const OPTIONS = 6;

// ---------- Pool ----------
const pool = new Map();
function addItem(it) {
  if (!pool.has(it.id)) pool.set(it.id, it);
}
const rowsOf = (file) => {
  const txt = readFileSync(file, "utf8");
  return (file.endsWith(".json") ? JSON.parse(txt).rows : txt).split(/\r?\n/).filter((l) => l.trim() && !l.startsWith("#"));
};
const dims = (n) => {
  const m = n?.match(/_(\d+)_(\d+)_[\d.]+fps\.mp4$/);
  return m ? { w: +m[1], h: +m[2] } : {};
};
function fromRow(kind, line) {
  const f = line.split(";");
  const [id, slug, wh, dur, fps, creator, handle, file] = f;
  if (!id || !slug) return;
  const [w, h] = wh.split("x").map(Number);
  const text = `${slug.replace(/-/g, " ")} ${kind === "photo" ? f[10] ?? "" : ""}`.toLowerCase();
  const base = { id: `pexels-${id}`, kind, title: slug.replace(/-/g, " "), text, width: w, height: h, creator, creatorHandle: handle, isNew: true };
  if (kind === "video") {
    const r = (n) => (n ? { url: `https://videos.pexels.com/video-files/${id}/${n}`, ...dims(n) } : undefined);
    const remote = Object.fromEntries(Object.entries({ uhd: r(f[8]), fhd: r(f[9]), hd: r(f[10]) }).filter(([, v]) => v));
    addItem({ ...base, duration: +dur, fps: +fps, thumb: `https://images.pexels.com/videos/${id}/${file}`, remote, sourceUrl: `https://www.pexels.com/video/${slug}-${id}/` });
  } else {
    addItem({ ...base, thumb: `https://images.pexels.com/photos/${id}/${file}`, sourceUrl: `https://www.pexels.com/photo/${slug}-${id}/` });
  }
}
// Existing candidates first (so their richer data wins), then new search results.
for (const a of manifest) {
  addItem({
    id: a.id, kind: a.kind, title: a.title, text: `${a.title} ${a.description}`.toLowerCase(), width: a.width, height: a.height,
    duration: a.duration, fps: a.fps, creator: a.creator, thumb: a.kind === "photo" ? a.web.src : a.web.poster, local: true,
    remote: a.web.remote, sourceUrl: a.sourceUrl, isNew: false,
  });
}
for (const name of readdirSync(join(ROOT, "media/intake"))) {
  const m = name.match(/^([vpt])\d?-([a-z0-9-]+)\.(json|txt)$/);
  if (m) for (const line of rowsOf(join(ROOT, "media/intake", name))) fromRow(m[1] === "p" ? "photo" : "video", line);
}
for (const name of readdirSync(join(ROOT, "media/scout"))) if (/^raw-\d+\.txt$/.test(name)) for (const line of rowsOf(join(ROOT, "media/scout", name))) fromRow("video", line);

// ---------- Colour and exposure ----------
function measure(src, at) {
  return new Promise((resolve) => {
    const p = spawn(ffmpeg, ["-hide_banner", "-loglevel", "error", ...(at ? ["-ss", String(at)] : []), "-i", src, "-frames:v", "1", "-vf", "scale=240:-2,signalstats,metadata=print:file=-", "-f", "null", "-"]);
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    const timer = setTimeout(() => p.kill(), 20000);
    p.on("close", () => {
      clearTimeout(timer);
      const get = (k) => +(out.match(new RegExp(`lavfi\\.signalstats\\.${k}=([\\d.]+)`))?.[1] ?? NaN);
      const yavg = get("YAVG");
      resolve(Number.isNaN(yavg) ? null : { yavg, yhigh: get("YHIGH"), sat: get("SATAVG") });
    });
  });
}
// v2 = measured mid-clip (video thumbnails are often a dark fade-in frame, which reads as colourless).
const todo = [...pool.values()].filter((it) => statsCache[it.id]?.v !== 2 && !(grades[it.id]?.stats));
let n = 0;
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (todo.length) {
      const it = todo.shift();
      // Videos: one frame from the middle of the 720p (or 1080p) file, read with a range request.
      const clip = it.kind === "video" ? (it.remote?.hd ?? it.remote?.fhd)?.url : null;
      const src = clip ?? (it.local ? join(ROOT, "public", it.thumb) : `${it.thumb}?auto=compress&cs=tinysrgb&w=320`);
      const m = await measure(src, clip ? Math.max(1, (it.duration || 8) * 0.45) : null);
      statsCache[it.id] = m ? { ...m, v: 2 } : null;
      if (++n % 50 === 0) console.log(`measured ${n}`);
    }
  }),
);
writeFileSync(join(ROOT, "media/scout/stats.json"), JSON.stringify(statsCache));

for (const it of pool.values()) {
  const s = grades[it.id]?.stats ?? statsCache[it.id];
  it.stats = s ?? null;
  if (!s) {
    it.score = -1;
    continue;
  }
  let score = s.sat * 1.6;
  if (s.yavg > 150) score -= (s.yavg - 150) * 1.2;
  if (s.yhigh > 245 && s.yavg > 120) score -= 12;
  if (s.yavg < 30) score -= (30 - s.yavg) * 1.5;
  if (s.yavg >= 60 && s.yavg <= 130) score += 8;
  it.score = Math.round(score);
  it.vivid = s.sat >= 25;
  it.washed = s.sat < 12 || s.yavg > 175;
}

// ---------- Allocation: scarcest frames first, each option used once overall ----------
const used = new Set(Object.values(choices));
for (const list of Object.values(FRAMES)) for (const f of list) if (f[4]) used.add(f[4]);
const frames = [];
for (const [world, list] of Object.entries(FRAMES)) for (const [key, needs, kind, match, shown] of list) frames.push({ world, slot: `${world}.${key}`, needs, kind, match, shown });
// Light level must fit the frame: night frames need a dark picture, daytime frames a bright one.
const isNightFrame = (fr) => /night|after dark|dusk|sunset|lit |glowing|lights coming/i.test(fr.needs) || /night/.test(fr.slot);
const isDayFrame = (fr) => /daytime|by day|against the sky|aerial photograph of the park by day/i.test(fr.needs) || /panorama|s08\.visit|s03\.wheel/.test(fr.slot);
const lightOk = (fr, it) => !it.stats || ((!isDayFrame(fr) || it.stats.yavg >= 75) && (!isNightFrame(fr) || it.stats.yavg <= 110));
// Hand exclusions after looking at the pictures (title says one thing, picture shows another).
const EXCLUDE = new Set(read("media/scout/exclude.json", []));
// Branded parks and characters are not licensed for our use and would read as someone else's park.
const BRANDED = /mardi gras|carnival mask|masks? beside|disney|universal|mickey|minnie|legoland|lego|six flags|warner|seaworld|busch gardens|harry potter|marvel/;
const eligible = (fr) =>
  [...pool.values()]
    .filter((it) => !EXCLUDE.has(it.id) && !BRANDED.test(it.text) && !it.washed && it.score >= 0 && (fr.kind === "any" || it.kind === fr.kind) && (it.kind === "photo" || it.width >= it.height) && fr.match(it.text) && lightOk(fr, it))
    .sort((a, b) => b.score - a.score);
for (const fr of frames) fr.count = eligible(fr).length;
if (process.argv.includes("--counts")) console.log(frames.map((f) => `${f.slot}:${f.count}`).join(" "));
const out = { wonderverse: [], thrillverse: [] };
// Round-robin: every frame takes one option per round (scarcest frames first), so frames that share a
// subject (e.g. several coaster frames) split the available clips fairly instead of the first one taking six.
const order = [...frames].sort((a, b) => a.count - b.count);
for (const fr of order) fr.options = [];
for (let round = 0; round < OPTIONS; round++) {
  for (const fr of order) {
    if (LOCKED.has(fr.slot) || fr.options.length > round) continue;
    const next = eligible(fr).find((it) => !used.has(it.id));
    if (next) {
      used.add(next.id);
      fr.options.push(next);
    }
  }
}
const pick = (it) => it && { id: it.id, kind: it.kind, title: it.title, width: it.width, height: it.height, duration: it.duration ?? null, creator: it.creator, thumb: it.thumb, local: !!it.local, remote: it.remote ?? null, sourceUrl: it.sourceUrl, vivid: !!it.vivid, score: it.score, isNew: it.isNew };
for (const fr of frames) {
  // What the frame shows today: the confirmed choice, else the page's default picture.
  const current = pool.get(choices[fr.slot] ?? fr.shown ?? "") ?? null;
  out[fr.world].push({ slot: fr.slot, needs: fr.needs, locked: LOCKED.has(fr.slot), current: pick(current), options: fr.options.map(pick) });
}
writeFileSync(join(ROOT, "media/scout/choose.json"), JSON.stringify(out));
for (const w of Object.keys(out)) {
  const short = out[w].filter((f) => !f.locked && f.options.length < OPTIONS).map((f) => `${f.slot.split(".").slice(1).join(".")}:${f.options.length}`);
  console.log(`${w}: ${out[w].length} frames; short of ${OPTIONS}: ${short.join(" ") || "none"}`);
}
