"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { approvals as initialApprovals, manifest, slotChoices as initialChoices, providerName } from "@/shared/media/library";
import type { AssetCategory, AssetStatus, MediaAsset, MediaSlot } from "@/shared/media/types";
import type { Storyboard } from "@/shared/storyboard/types";
import { previewSrc } from "@/shared/media/delivery";
import { allSlotsA } from "@/concepts/a/slots";
import { allSlotsB } from "@/concepts/b/slots";
import { storyboardA } from "@/concepts/a/storyboard";
import { storyboardB } from "@/concepts/b/storyboard";

const CATEGORY_LABEL: Record<AssetCategory, string> = {
  coaster: "Roller coasters",
  rides: "Thrill and spinning rides",
  aerial: "Aerial views",
  night: "Night and illuminated rides",
  family: "Families and children",
  food: "Food and treats",
  shows: "Shows and entertainment",
  water: "Water rides",
};
const ORDER: AssetCategory[] = ["coaster", "rides", "aerial", "night", "family", "food", "shows", "water"];

type ConceptKey = "wonderverse" | "thrillverse";
const CONCEPTS: { key: ConceptKey; name: string; sb: Storyboard; slots: MediaSlot[]; href: string }[] = [
  { key: "wonderverse", name: "Wonderverse", sb: storyboardA, slots: allSlotsA, href: "/wonderverse" },
  { key: "thrillverse", name: "Thrillverse", sb: storyboardB, slots: allSlotsB, href: "/thrillverse" },
];
const ALL_SLOTS: MediaSlot[] = CONCEPTS.flatMap((c) => c.slots);
const BY_ID = new Map(manifest.map((a) => [a.id, a]));

const PAGE_LABEL: Record<string, string> = {
  attractions: "Attractions pages",
  food: "Food and shows page",
  plan: "Plan your visit page",
  tickets: "Tickets page",
  portal: "Opening page preview",
};

/** "wonderverse.s03.coaster" → home scene 03; "wonderverse.attractions.tempest" → attractions page */
function parseSlot(id: string) {
  const [concept, group] = id.split(".");
  const scene = /^s\d{2}$/.test(group) ? group.slice(1) : null;
  return { concept: concept as ConceptKey, group, scene };
}

function groupTitle(slotId: string) {
  const { concept, group, scene } = parseSlot(slotId);
  const c = CONCEPTS.find((x) => x.key === concept)!;
  if (scene) {
    const sc = c.sb.scenes.find((x) => x.n === scene);
    return `Home, scene ${scene}${sc ? `: ${sc.title}` : ""}`;
  }
  return PAGE_LABEL[group] ?? group;
}

function slotLabel(slot: MediaSlot) {
  const { concept } = parseSlot(slot.id);
  const c = CONCEPTS.find((x) => x.key === concept)!;
  return `${c.name}, ${groupTitle(slot.id).toLowerCase()}: ${slot.needs.charAt(0).toLowerCase()}${slot.needs.slice(1)}`;
}

function fmtBytes(n: number) {
  return n > 1e9 ? `${(n / 1e9).toFixed(2)} GB` : `${(n / 1e6).toFixed(1)} MB`;
}

function meta(a: MediaAsset) {
  const parts = [a.kind === "video" ? "Video" : "Photo", `${a.width}×${a.height}`];
  if (a.duration) parts.push(`${a.duration}s`);
  return parts.join(", ");
}

export function AssetBoard() {
  const [status, setStatus] = useState<Record<string, AssetStatus>>(() => ({ ...initialApprovals }));
  const [choices, setChoices] = useState<Record<string, string>>(() => ({ ...initialChoices }));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [view, setView] = useState<"shots" | "files">("shots");
  const [concept, setConcept] = useState<ConceptKey>("wonderverse");
  const [filter, setFilter] = useState<"all" | AssetStatus>("all");

  const usage = useMemo(() => {
    const m = new Map<string, MediaSlot[]>();
    for (const s of ALL_SLOTS) for (const id of s.candidates) m.set(id, [...(m.get(id) ?? []), s]);
    return m;
  }, []);

  const statusOf = (id: string): AssetStatus => status[id] ?? "candidate";

  /** Mirrors resolveSlot(): a "Use this here" pick wins, then the frame's default (first candidate not rejected). */
  const inUse = (slot: MediaSlot): string | null => {
    const picked = choices[slot.id];
    if (picked && statusOf(picked) !== "rejected") return picked;
    return slot.candidates.find((id) => BY_ID.has(id) && statusOf(id) !== "rejected") ?? null;
  };

  async function post(body: object) {
    setError(null);
    const res = await fetch("/api/assets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      throw new Error(b.error ?? "The change was not saved. Check that the dev server is running.");
    }
  }

  async function decide(id: string, next: AssetStatus) {
    const prev = statusOf(id);
    setStatus((s) => ({ ...s, [id]: next }));
    try {
      await post({ id, status: next });
      setSaved(next === "approved" ? "Approved." : next === "rejected" ? "Rejected. It won't be used anywhere." : "Reset to waiting.");
    } catch (e) {
      setStatus((s) => ({ ...s, [id]: prev }));
      setError((e as Error).message);
    }
  }

  async function pickForSlot(slot: MediaSlot, assetId: string | null) {
    const prevChoices = choices;
    const prevStatus = status;
    setChoices((c) => {
      const n = { ...c };
      if (assetId) n[slot.id] = assetId;
      else delete n[slot.id];
      return n;
    });
    if (assetId) setStatus((s) => ({ ...s, [assetId]: "approved" }));
    try {
      await post({ slot: slot.id, asset: assetId });
      setSaved(assetId ? `Saved for ${slotLabel(slot)}. Reload that page to see it.` : "Pick cleared. The frame uses its default again.");
    } catch (e) {
      setChoices(prevChoices);
      setStatus(prevStatus);
      setError((e as Error).message);
    }
  }

  const filled = ALL_SLOTS.filter((s) => inUse(s)).length;
  const current = CONCEPTS.find((c) => c.key === concept)!;

  return (
    <div className="hub board">
      <header className="board-head">
        <nav className="hub-crumbs" aria-label="Breadcrumb">
          <Link href="/studio">Studio</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Asset board</span>
        </nav>
        <h1 className="board-title">Choose the pictures</h1>
        <p className="board-lede">
          Every picture frame in the two experiences is listed below, page by page. Each experience has its own set of clips and photos, so
          nothing is shared between them. Every frame starts with a default pick; press <strong>Use this here</strong> on another option to
          change it. These are stock files from Pexels, Pixabay and Coverr; they do not show VELORA.
        </p>
        <div className="board-bar">
          <p className="board-counts" aria-live="polite">
            {filled} of {ALL_SLOTS.length} frames have a picture.
          </p>
          <div className="board-filter" role="group" aria-label="View">
            <button type="button" aria-pressed={view === "shots"} onClick={() => setView("shots")}>
              Choose by shot
            </button>
            <button type="button" aria-pressed={view === "files"} onClick={() => setView("files")}>
              All files
            </button>
          </div>
        </div>
        <div aria-live="polite" className="board-status-line">
          {error ? (
            <p role="alert" className="board-error">
              {error}
            </p>
          ) : saved ? (
            <p className="board-saved">{saved}</p>
          ) : null}
        </div>
      </header>

      {view === "shots" ? (
        <>
          <div className="board-concepts" role="group" aria-label="Experience">
            {CONCEPTS.map((c) => {
              const done = c.slots.filter((s) => inUse(s)).length;
              return (
                <button key={c.key} type="button" aria-pressed={concept === c.key} onClick={() => setConcept(c.key)} className="board-concept-tab">
                  <span className="board-concept-name">
                    {c.name}
                  </span>
                  <span className="board-concept-count">
                    {done} of {c.slots.length} frames filled
                  </span>
                </button>
              );
            })}
          </div>

          {[...new Set(current.slots.map((s) => groupTitle(s.id)))]
            .map((title) => ({ title, slots: current.slots.filter((s) => groupTitle(s.id) === title) }))
            .map(({ title, slots }) => (
              <section key={title} className="board-section board-scene" aria-label={title}>
                <div className="board-scene-head">
                  <h2>{title}</h2>
                </div>
                <ul className="board-shots">
                  {slots.map((slot) => {
                    const using = inUse(slot);
                    const usingAsset = using ? BY_ID.get(using) : null;
                    return (
                      <li key={slot.id} id={slot.id} className="board-shot">
                        <div className="board-shot-head">
                          <h3>{slot.needs}</h3>
                          <p className={usingAsset ? "board-shot-state is-ok" : "board-shot-state"}>
                            {usingAsset ? `Showing: ${usingAsset.title}` : "Showing a placeholder. Pick one below."}
                          </p>
                          {choices[slot.id] && (
                            <button type="button" className="board-clear" onClick={() => pickForSlot(slot, null)}>
                              Clear my pick
                            </button>
                          )}
                        </div>
                        <ul className="board-options">
                          {slot.candidates
                            .map((id) => BY_ID.get(id))
                            .filter((a): a is MediaAsset => !!a)
                            .map((a) => (
                              <OptionTile
                                key={a.id}
                                asset={a}
                                inUse={using === a.id}
                                rejected={statusOf(a.id) === "rejected"}
                                onUse={() => pickForSlot(slot, a.id)}
                              />
                            ))}
                        </ul>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
        </>
      ) : (
        <>
          <div className="board-section">
            <div className="board-filter" role="group" aria-label="Show">
              {(["all", "approved", "candidate", "rejected"] as const).map((f) => (
                <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                  {f === "all" ? "All" : f === "candidate" ? "Waiting" : f[0].toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {ORDER.map((cat) => {
            const items = manifest.filter((a) => a.category === cat && (filter === "all" || statusOf(a.id) === filter));
            if (!items.length) return null;
            return (
              <section key={cat} className="board-section" aria-labelledby={`cat-${cat}`}>
                <h2 id={`cat-${cat}`}>{CATEGORY_LABEL[cat]}</h2>
                <ul className="board-grid">
                  {items.map((a) => (
                    <AssetCard key={a.id} asset={a} status={statusOf(a.id)} slots={usage.get(a.id) ?? []} onDecide={decide} />
                  ))}
                </ul>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}

/** Poster first (always available once encoded), video plays on hover/focus when its preview file exists. */
function Preview({ asset: a }: { asset: MediaAsset }) {
  const vid = useRef<HTMLVideoElement>(null);
  const [posterOk, setPosterOk] = useState(true);
  const [videoOk, setVideoOk] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [hovered, setHovered] = useState(false);
  const play = () => {
    setHovered(true);
    if (videoOk) vid.current?.play().catch(() => setVideoOk(false));
  };
  // Pause but keep the position and buffer, so a second hover resumes instantly.
  const stop = () => {
    setHovered(false);
    vid.current?.pause();
    setPlaying(false);
  };
  const still = a.kind === "photo" ? `/_next/image?url=${encodeURIComponent(a.web.src!)}&w=640&q=70` : a.web.poster;

  return (
    <div className="board-media" onPointerEnter={play} onPointerLeave={stop}>
      {posterOk ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={still} alt={a.description} loading="lazy" onError={() => setPosterOk(false)} />
      ) : (
        <div className="board-media-missing">
          <span>Preview is still being made.</span>
          <a href={a.sourceUrl} target="_blank" rel="noreferrer">
            Watch it on {providerName(a)}
          </a>
        </div>
      )}
      {a.kind === "video" && videoOk && (
        <video
          ref={vid}
          muted
          loop
          playsInline
          preload="none"
          src={previewSrc(a)}
          onError={() => setVideoOk(false)}
          onPlaying={() => setPlaying(true)}
          className={`board-media-video${playing ? " is-playing" : ""}`}
          aria-hidden="true"
        />
      )}
      {a.kind === "video" && hovered && !playing && videoOk && (
        <span className="board-loading" role="status">
          Loading preview…
        </span>
      )}
      {a.kind === "video" && (
        <span className="board-kind" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="10" height="10">
            <path d="M4 2.5v11l9.5-5.5z" fill="currentColor" />
          </svg>
          {a.duration}s
        </span>
      )}
    </div>
  );
}

function OptionTile({ asset: a, inUse, rejected, onUse }: { asset: MediaAsset; inUse: boolean; rejected: boolean; onUse: () => void }) {
  return (
    <li className={`board-option${inUse ? " is-inuse" : ""}${rejected ? " is-rejected" : ""}`}>
      <Preview asset={a} />
      <div className="board-option-body">
        <p className="board-option-title">{a.title}</p>
        <p className="board-option-meta">
          {meta(a)}. By {a.creator}.
        </p>
        <div className="board-option-actions">
          {inUse ? (
            <span className="board-inuse">
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                <path d="m3 8.5 3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              In use here
            </span>
          ) : (
            <button type="button" className="board-use" onClick={onUse}>
              Use this here
            </button>
          )}
          <a href={a.sourceUrl} target="_blank" rel="noreferrer" className="board-source">
            View source
          </a>
        </div>
      </div>
    </li>
  );
}

function AssetCard({
  asset: a,
  status,
  slots,
  onDecide,
}: {
  asset: MediaAsset;
  status: AssetStatus;
  slots: MediaSlot[];
  onDecide: (id: string, s: AssetStatus) => void;
}) {
  return (
    <li id={`asset-${a.id}`} className={`board-card is-${status}`}>
      <div className="board-card-media">
        <Preview asset={a} />
        <span className="board-status">{status === "candidate" ? "Waiting" : status === "approved" ? "Approved" : "Rejected"}</span>
      </div>
      <div className="board-body">
        <h3>{a.title}</h3>
        <dl>
          <div>
            <dt>Source</dt>
            <dd>
              <a href={a.sourceUrl} target="_blank" rel="noreferrer">
                {providerName(a)} page
              </a>
            </dd>
          </div>
          <div>
            <dt>Creator</dt>
            <dd>
              {a.creatorUrl ? (
                <a href={a.creatorUrl} target="_blank" rel="noreferrer">
                  {a.creator}
                </a>
              ) : (
                a.creator
              )}
            </dd>
          </div>
          <div>
            <dt>Original</dt>
            <dd>
              {a.width}×{a.height}
              {a.duration ? `, ${a.duration}s` : ""}
              {a.fps ? `, ${Math.round(a.fps)} fps` : ""}, {a.original ? fmtBytes(a.original.bytes) : "streamed from source"}
            </dd>
          </div>
          <div>
            <dt>Licence</dt>
            <dd>
              <a href={a.license.url} target="_blank" rel="noreferrer">
                {a.license.name}
              </a>{" "}
              (check on the source page)
            </dd>
          </div>
          <div>
            <dt>Can fill</dt>
            <dd>
              {slots.length ? (
                <ul className="board-uses">
                  {slots.map((s) => (
                    <li key={s.id}>{slotLabel(s)}</li>
                  ))}
                </ul>
              ) : (
                "No frame yet"
              )}
            </dd>
          </div>
        </dl>
        <div className="board-actions" role="group" aria-label={`Decision for ${a.title}`}>
          <button type="button" onClick={() => onDecide(a.id, "approved")} aria-pressed={status === "approved"}>
            Approve
          </button>
          <button type="button" onClick={() => onDecide(a.id, "rejected")} aria-pressed={status === "rejected"}>
            Reject
          </button>
          {status !== "candidate" && (
            <button type="button" onClick={() => onDecide(a.id, "candidate")}>
              Undo
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
