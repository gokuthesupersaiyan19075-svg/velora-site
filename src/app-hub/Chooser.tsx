"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { getAsset } from "@/shared/media/library";
import { setTry } from "@/shared/media/try-store";
import type { MediaAsset, RemoteRendition } from "@/shared/media/types";

export type ChooseOption = {
  id: string;
  kind: "video" | "photo";
  title: string;
  width: number;
  height: number;
  duration: number | null;
  creator: string;
  thumb: string;
  local: boolean;
  remote: { uhd?: RemoteRendition; fhd?: RemoteRendition; hd?: RemoteRendition } | null;
  sourceUrl: string;
  vivid: boolean;
  score: number;
  isNew: boolean;
  /** Pasted by the site owner (see the link box). */
  fromLink?: boolean;
};
type LinkEntry = { key: string; url: string; slot: string; note: string; status: "ready" | "pending" | "unsupported"; message: string; option?: ChooseOption; licenceUnknown?: boolean };
export type ChooseFrame = { slot: string; needs: string; locked: boolean; current: ChooseOption | null; options: ChooseOption[] };
type World = "wonderverse" | "thrillverse";

const SCENES: Record<World, Record<string, [string, string]>> = {
  wonderverse: {
    s01: ["Opening", "a-scene-01"],
    s02: ["The park from above", "a-scene-02"],
    s03: ["The attractions", "a-scene-03"],
    s04: ["Coaster scene (approved, kept exactly)", "a-scene-04"],
    s05: ["Room for everyone", "a-scene-05"],
    s06: ["Beyond the rides", "a-scene-06"],
    s07: ["After dark", "a-scene-07"],
    s08: ["Plan your visit", "a-scene-08"],
    s09: ["Finale", "a-scene-09"],
  },
  thrillverse: {
    s01: ["Hero", "top"],
    s02: ["Park reveal", "park"],
    s03: ["Pick your ride", "rides"],
    s04: ["Ride POV", "thrill"],
    s05: ["Adventure challenges", "family"],
    s06: ["Fuel, Ride, Surf", "eat"],
    s07: ["Night", "night"],
    s08: ["Plan your visit", "visit"],
    s09: ["Final", "final"],
  },
};
/** Inner-page frames: their group in the chooser and the page that shows them. */
const PAGES: Record<World, [RegExp, string, string][]> = {
  wonderverse: [
    [/^attractions\.(.+)$/, "Attractions pages", "/wonderverse/attractions/$1"],
    [/^(food|shows|food-and-shows)\./, "Food and shows page", "/wonderverse/food-and-shows"],
  ],
  thrillverse: [
    [/^p\.attractions\./, "Attractions page", "/thrillverse/attractions"],
    [/^p\.food\./, "Food and shows page", "/thrillverse/food-and-shows"],
    [/^p\.plan\./, "Plan your visit page", "/thrillverse/plan"],
    [/^p\.tickets\./, "Tickets page", "/thrillverse/tickets"],
  ],
};
/** A frame's group: its home scene (s01…s09) or its inner page. */
function groupOf(world: World, slot: string): { key: string; label: string; href: string } {
  const rest = slot.split(".").slice(1).join(".");
  const scene = rest.split(".")[0];
  if (/^s\d\d$/.test(scene)) {
    const [label, anchor] = SCENES[world][scene] ?? [scene, ""];
    return { key: scene, label: `Home, scene ${scene.slice(1)}: ${label}`, href: `/${world}#${anchor}` };
  }
  for (const [re, label, href] of PAGES[world]) {
    const m = rest.match(re);
    if (m) return { key: label, label, href: href.replace("$1", m[1] ?? "") };
  }
  return { key: scene, label: scene, href: `/${world}` };
}
const WANT = 6;

const imgUrl = (o: ChooseOption, w: number) => (o.local ? o.thumb : `${o.thumb}?auto=compress&cs=tinysrgb&w=${w}`);

/** A chooser option as a full media asset, so it can be previewed in the real page. */
function toAsset(o: ChooseOption): MediaAsset {
  const known = getAsset(o.id);
  if (known) return known;
  const photoSrc = imgUrl(o, 2400);
  return {
    id: o.id,
    kind: o.kind,
    provider: o.id.startsWith("pixabay") ? "pixabay" : o.id.startsWith("coverr") ? "coverr" : "pexels",
    category: "rides",
    title: o.title,
    description: o.title,
    sourceUrl: o.sourceUrl,
    creator: o.creator,
    creatorUrl: null,
    width: o.width,
    height: o.height,
    duration: o.duration,
    fps: null,
    license: { name: "Pexels License", url: "https://www.pexels.com/license/" },
    original: null,
    web: o.kind === "photo" ? { poster: photoSrc, src: photoSrc } : { poster: imgUrl(o, 1440), ...(o.remote && { remote: o.remote }) },
  };
}

export function Chooser({ data, world }: { data: Record<World, ChooseFrame[]>; world: World }) {
  const router = useRouter();
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [links, setLinks] = useState<LinkEntry[]>([]);
  const [apply, setApply] = useState<{ state: "idle" | "working" | "done" | "failed"; text?: string }>({ state: "idle" });

  useEffect(() => {
    fetch("/api/scout-picks")
      .then((r) => r.json())
      .then(setPicks)
      .catch(() => {});
    fetch("/api/links")
      .then((r) => r.json())
      .then(setLinks)
      .catch(() => {});
  }, []);

  async function applyToSite() {
    setApply({ state: "working" });
    try {
      const r = await fetch("/api/apply-picks", { method: "POST" });
      const j = await r.json();
      setApply(j.ok ? { state: "done", text: "Done. Your choices are on the site now; open a world to see them." } : { state: "failed", text: `Stopped at ${j.step}: ${j.error}` });
    } catch {
      setApply({ state: "failed", text: "Could not reach the dev server." });
    }
  }

  // Coming back from "Preview on site": scroll to the frame that was previewed.
  useEffect(() => {
    const target = window.location.hash.slice(1);
    if (target.includes(".")) document.getElementById(target)?.scrollIntoView({ block: "start" });
  }, [world]);

  // Pasted links that resolved become options on their frame (first in the row).
  const frames = useMemo(
    () =>
      data[world].map((f) => {
        const mine = links.filter((l) => l.slot === f.slot && l.status === "ready" && l.option).map((l) => ({ ...l.option!, fromLink: true }));
        return mine.length ? { ...f, options: [...mine, ...f.options.filter((o) => !mine.some((m) => m.id === o.id))] } : f;
      }),
    [data, world, links],
  );
  const scenes = useMemo(() => {
    const m = new Map<string, { label: string; href: string; list: ChooseFrame[] }>();
    for (const f of frames) {
      const g = groupOf(world, f.slot);
      const cur = m.get(g.key) ?? { label: g.label, href: g.href, list: [] };
      cur.list.push(f);
      m.set(g.key, cur);
    }
    return [...m.entries()];
  }, [frames, world]);
  const chosen = frames.filter((f) => picks[f.slot]).length;
  const open = frames.filter((f) => !f.locked).length;

  async function choose(slot: string, id: string | null) {
    setBusy(slot);
    try {
      const r = await fetch("/api/scout-picks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slot, id }) });
      const j = await r.json();
      if (j.picks) setPicks(j.picks);
    } finally {
      setBusy(null);
    }
  }

  function preview(f: ChooseFrame, o: ChooseOption) {
    setTry({ slot: f.slot, asset: toAsset(o), returnTo: `/studio/choose/${world}#${f.slot}` });
    router.push(groupOf(world, f.slot).href);
  }

  return (
    <main className="choose">
      <p className="choose-crumbs">
        <Link href="/studio">Studio</Link> / Picture chooser
      </p>
      <h1 className="choose-title">Choose the pictures</h1>
      <p className="choose-intro">
        Every frame lists up to {WANT} new options that match its description. Nothing appears twice, across both worlds. Options are ranked by colour and exposure; washed-out and murky
        clips were left out. Hover to play. <strong>Preview on site</strong> shows the option in the real page without choosing it. <strong>Choose this</strong> marks it; tell Claude when you
        are done and the chosen ones are added.
      </p>
      <div className="choose-tabs" role="group" aria-label="World">
        {(["wonderverse", "thrillverse"] as World[]).map((w) => (
          <Link key={w} href={`/studio/choose/${w}`} aria-current={world === w ? "page" : undefined} className="choose-tab">
            {w === "wonderverse" ? "Wonderverse" : "Thrillverse"}
            <span>
              {data[w].filter((f) => picks[f.slot]).length} chosen of {data[w].filter((f) => !f.locked).length}
            </span>
          </Link>
        ))}
      </div>
      <p className="choose-progress" aria-live="polite">
        {chosen} of {open} frames chosen in {world === "wonderverse" ? "Wonderverse" : "Thrillverse"}. Frames you leave alone keep their current picture.
      </p>

      <LinkBox data={data} links={links} setLinks={setLinks} setPicks={setPicks} defaultWorld={world} />

      <div className="choose-apply">
        <button type="button" className="choose-pick" onClick={applyToSite} disabled={apply.state === "working"}>
          {apply.state === "working" ? "Putting your choices on the site…" : "Apply my choices to the site"}
        </button>
        <p aria-live="polite">{apply.text ?? "Adds every chosen picture and pasted link to the real pages (takes about a minute)."}</p>
      </div>

      {scenes.map(([key, { label, list }]) => (
        <section key={key} className="choose-scene">
          <h2>{label}</h2>
          {list.map((f) => (
            <article key={f.slot} id={f.slot} className="choose-frame">
              <header>
                <h3>{f.needs}</h3>
                {picks[f.slot] && (
                  <button type="button" className="choose-clear" onClick={() => choose(f.slot, null)} disabled={busy === f.slot}>
                    Undo my choice
                  </button>
                )}
              </header>
              {f.locked ? (
                <p className="choose-note">Approved and kept exactly as it is. No new options.</p>
              ) : (
                <>
                  {f.options.length < WANT && (
                    <p className="choose-note">
                      Only {f.options.length} strong {f.options.length === 1 ? "match" : "matches"} for this exact shot on Pexels that are not already used elsewhere.
                    </p>
                  )}
                  <div className="choose-grid">
                    {f.current && <Card o={f.current} label="Current picture" picked={!picks[f.slot]} />}
                    {f.options.map((o) => (
                      <Card
                        key={o.id}
                        o={o}
                        picked={picks[f.slot] === o.id}
                        onChoose={() => choose(f.slot, picks[f.slot] === o.id ? null : o.id)}
                        onPreview={() => preview(f, o)}
                        busy={busy === f.slot}
                      />
                    ))}
                  </div>
                </>
              )}
            </article>
          ))}
        </section>
      ))}
    </main>
  );
}

function Card({ o, label, picked, onChoose, onPreview, busy }: { o: ChooseOption; label?: string; picked: boolean; onChoose?: () => void; onPreview?: () => void; busy?: boolean }) {
  const vid = useRef<HTMLVideoElement>(null);
  const [hover, setHover] = useState(false);
  const [playing, setPlaying] = useState(false);
  const clip = o.kind === "video" ? (o.remote?.hd ?? o.remote?.fhd)?.url : undefined;
  const enter = () => {
    setHover(true);
    vid.current?.play().catch(() => {});
  };
  const leave = () => {
    setHover(false);
    vid.current?.pause();
    setPlaying(false);
  };
  return (
    <div className={`choose-card${picked ? " is-picked" : ""}${label ? " is-current" : ""}`}>
      <div className="choose-media" onPointerEnter={enter} onPointerLeave={leave}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgUrl(o, 640)} alt={o.title} loading="lazy" />
        {clip && (
          <video ref={vid} src={clip} muted loop playsInline preload="none" onPlaying={() => setPlaying(true)} className={playing ? "is-playing" : ""} aria-hidden="true" />
        )}
        {hover && clip && !playing && <span className="choose-loading">Loading preview…</span>}
        <span className="choose-badges">
          {label && <span className="b-current">{label}</span>}
          {o.fromLink && <span className="b-link">Your link</span>}
          {o.vivid && <span className="b-vivid">Vivid</span>}
          {o.remote?.uhd && <span>4K</span>}
          <span>{o.kind === "video" ? `${o.duration ?? "?"}s` : "Photo"}</span>
        </span>
      </div>
      <div className="choose-body">
        <p className="choose-name">{o.title}</p>
        <p className="choose-meta">
          {o.width}×{o.height} · {o.creator || "Unknown"} · {o.fromLink ? "pasted by you" : o.isNew ? "new find" : "already in library"}
        </p>
        <div className="choose-actions">
          {onChoose && (
            <button type="button" className="choose-pick" aria-pressed={picked} onClick={onChoose} disabled={busy}>
              {picked ? "✓ Chosen" : "Choose this"}
            </button>
          )}
          {onPreview && (
            <button type="button" className="choose-try" onClick={onPreview}>
              Preview on site
            </button>
          )}
          <a href={o.sourceUrl} target="_blank" rel="noreferrer">
            Source
          </a>
        </div>
      </div>
    </div>
  );
}

/** Paste a link to a video or photo you like and pick where it goes. */
function LinkBox({
  data,
  links,
  setLinks,
  setPicks,
  defaultWorld,
}: {
  data: Record<World, ChooseFrame[]>;
  links: LinkEntry[];
  setLinks: (l: LinkEntry[]) => void;
  setPicks: (p: Record<string, string>) => void;
  defaultWorld: World;
}) {
  const [url, setUrl] = useState("");
  const [slot, setSlot] = useState("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<{ working: boolean; error?: string }>({ working: false });
  const nameOf = (slotId: string) => {
    const w = slotId.split(".")[0] as World;
    const f = data[w]?.find((x) => x.slot === slotId);
    return `${w === "wonderverse" ? "Wonderverse" : "Thrillverse"}: ${f?.needs ?? slotId}`;
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return setState({ working: false, error: "Paste a link first." });
    if (!slot) return setState({ working: false, error: "Pick the spot on the site it is for." });
    setState({ working: true });
    try {
      const r = await fetch("/api/links", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url, slot, note }) });
      const j = await r.json();
      if (!r.ok) return setState({ working: false, error: j.error ?? "That did not work." });
      setLinks(j.links);
      setPicks(j.picks);
      setUrl("");
      setNote("");
      setState({ working: false });
    } catch {
      setState({ working: false, error: "Could not reach the dev server." });
    }
  }

  async function remove(key: string) {
    const r = await fetch("/api/links", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ key }) });
    const j = await r.json();
    setLinks(j.links);
    setPicks(j.picks);
  }

  return (
    <section className="choose-links" aria-labelledby="choose-links-title">
      <h2 id="choose-links-title">Paste a link</h2>
      <p className="choose-note">
        Found a video or photo you like? Paste its link (a Pexels or Pixabay page, or a direct .mp4 or .jpg file), pick where it should go, and it becomes the chosen picture for that
        spot. Videos must be at least 720p, photos at least 1600 px wide. Links that cannot be read automatically wait here for Claude.
      </p>
      <form className="choose-link-form" onSubmit={submit}>
        <label>
          <span>Link</span>
          <input type="url" inputMode="url" placeholder="https://www.pexels.com/video/…" value={url} onChange={(e) => setUrl(e.target.value)} required />
        </label>
        <label>
          <span>Where it goes</span>
          <select value={slot} onChange={(e) => setSlot(e.target.value)} required>
            <option value="">Choose a spot…</option>
            {(["wonderverse", "thrillverse"] as World[])
              .sort((a) => (a === defaultWorld ? -1 : 1))
              .map((w) => {
                const groups = new Map<string, ChooseFrame[]>();
                for (const f of data[w]) {
                  if (f.locked) continue;
                  const g = groupOf(w, f.slot).label;
                  groups.set(g, [...(groups.get(g) ?? []), f]);
                }
                return [...groups.entries()].map(([g, list]) => (
                  <optgroup key={`${w}-${g}`} label={`${w === "wonderverse" ? "Wonderverse" : "Thrillverse"}: ${g}`}>
                    {list.map((f) => (
                      <option key={f.slot} value={f.slot}>
                        {f.needs}
                      </option>
                    ))}
                  </optgroup>
                ));
              })}
          </select>
        </label>
        <label>
          <span>Note for Claude (optional)</span>
          <input type="text" placeholder="e.g. use the part where the train drops" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
        </label>
        <button type="submit" className="choose-pick" disabled={state.working}>
          {state.working ? "Checking the link…" : "Use this link"}
        </button>
        {state.error && (
          <p className="choose-link-error" role="alert">
            {state.error}
          </p>
        )}
      </form>
      {links.length > 0 && (
        <ul className="choose-link-list">
          {links.map((l) => (
            <li key={l.key} data-status={l.status}>
              <span className="choose-link-status">{l.status === "ready" ? "Chosen" : l.status === "pending" ? "Waiting for Claude" : "Cannot be used"}</span>
              <span className="choose-link-body">
                <a href={l.url} target="_blank" rel="noreferrer">
                  {l.url.length > 70 ? `${l.url.slice(0, 70)}…` : l.url}
                </a>
                <span>
                  For {nameOf(l.slot)}. {l.message}
                  {l.note && ` Note: ${l.note}`}
                </span>
              </span>
              <button type="button" className="choose-clear" onClick={() => remove(l.key)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
