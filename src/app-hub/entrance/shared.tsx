"use client";

/**
 * Building blocks shared by the three entrance variations (studio mockups of the public portal).
 * Business logic stays in src/experiences: these only wrap registry data, switching and media.
 */
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { experienceById, experiences, type Experience, type ExperienceId } from "@/experiences/registry";
import { navigateToExperience, rememberExperience, usePreferredExperience } from "@/experiences/switching";
import { previewSrc, videoSources } from "@/shared/media/delivery";
import { getAsset } from "@/shared/media/library";
import type { MediaAsset } from "@/shared/media/types";
import { useReducedMotion } from "@/shared/motion/useReducedMotion";
import { MUSIC_LEVEL } from "@/shared/sound/engine";
import { SoundToggle } from "@/shared/sound/SoundToggle";
import { useSoundBed } from "@/shared/sound/useSound";

export type { ExperienceId };
export const WONDER: ExperienceId = "wonderverse";
export const THRILL: ExperienceId = "thrillverse";
export const other = (id: ExperienceId): ExperienceId => (id === WONDER ? THRILL : WONDER);
export const worlds = experiences;
export const world = (id: ExperienceId): Experience => experienceById(id);

/** One-line summaries, condensed from the registry summaries (no new facts). */
export const WORLD_LINE: Record<ExperienceId, string> = {
  wonderverse: "Carousels, the wheel, gentle water, shows and treats, from golden light to a glowing night.",
  thrillverse: "Extreme coasters, big drops, white water and adventure, at full speed.",
};

/** Each world's own footage. Never mix: a Wonderverse clip never appears on the Thrillverse side. */
export const WORLD_MEDIA: Record<ExperienceId, { hero: string; extras: [string, string, string] }> = {
  wonderverse: { hero: "pexels-28000865", extras: ["pexels-27993338", "pexels-32072284", "pexels-19026924"] },
  thrillverse: { hero: "pexels-14367734", extras: ["pexels-40268519", "pexels-35876722", "pexels-34370024"] },
};

export function mediaAsset(id: string): MediaAsset {
  const a = getAsset(id);
  if (!a) throw new Error(`Entrance: media asset "${id}" is not in the library`);
  return a;
}

/** CSS custom properties carrying a world's registry colours. */
export const worldVars = (id: ExperienceId): CSSProperties => {
  const c = world(id).colors;
  return { ["--w-bg" as string]: c.bg, ["--w-fg" as string]: c.fg, ["--w-accent" as string]: c.accent };
};

// ---------- media query hook ----------
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

/** Wide, landscape screens lay the two worlds side by side; phones and portrait tablets stack them. */
export const useSideBySide = () => useMediaQuery("(min-width: 768px) and (min-aspect-ratio: 1/1)", true);
export const useFinePointer = () => useMediaQuery("(hover: hover) and (pointer: fine)", true);

// ---------- sound ----------
let lastChime = { id: "", t: 0 };
/** Soft chime when a world is hovered (throttled, quiet; silent unless the visitor turned sound on). */
export function chimeFor(id: ExperienceId) {
  const now = performance.now();
  if (lastChime.id === id && now - lastChime.t < 900) return;
  lastChime = { id, t: now };
  void id; // no hover chime: the entrance plays only the ride sounds of the side being hovered (see Gate)
}

/** The portal's ambient bed (plays only once the visitor switches sound on). */
export function useEntranceSound() {
  // Quiet synthwave bed on the entrance; the chosen world's own music takes over (crossfaded) when entering.
  useSoundBed("music-gate", MUSIC_LEVEL);
}

// ---------- entering a world ----------
export function enterWorld(id: ExperienceId) {
  rememberExperience(id);
  navigateToExperience(id, world(id).href);
}

/**
 * A real link to the world (works without JS, opens in a new tab with modifier keys).
 * A plain click runs `onEnter` (a variation's own exit animation, which must end in enterWorld) or enterWorld.
 */
export function EnterLink({
  id,
  className = "",
  children,
  onEnter,
  onFocus,
  tabIndex,
}: {
  id: ExperienceId;
  className?: string;
  children?: ReactNode;
  onEnter?: () => void;
  onFocus?: () => void;
  tabIndex?: number;
}) {
  const w = world(id);
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    e.stopPropagation();
    if (onEnter) onEnter();
    else enterWorld(id);
  };
  return (
    <Link href={w.href} className={`ent-enter ${className}`} onClick={onClick} onFocus={onFocus} tabIndex={tabIndex} style={worldVars(id)}>
      {children ?? (
        <>
          <span>Enter {w.name}</span>
          <Arrow />
        </>
      )}
    </Link>
  );
}

export function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg className={`ent-arrow ${className}`} viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
      <path d="M3 10h13M11 4.5 16.5 10 11 15.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---------- chrome ----------
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span className={`ent-brand ${className}`} aria-label="VELORA" role="img">
      <span className="ent-brand-word" aria-hidden="true">
        VELORA
      </span>
    </span>
  );
}

/** "Continue in Wonderverse" for returning visitors (remembered on this device). */
export function ContinueLink({ className = "" }: { className?: string }) {
  const preferred = usePreferredExperience();
  if (!preferred) return null;
  return (
    <EnterLink id={preferred} className={`ent-continue ${className}`}>
      <span className="ent-continue-dot" aria-hidden="true" />
      <span>
        Continue in <strong>{world(preferred).name}</strong>
      </span>
      <Arrow />
    </EnterLink>
  );
}

export function PauseVideoButton({ paused, onToggle, className = "" }: { paused: boolean; onToggle: () => void; className?: string }) {
  return (
    <button type="button" className={`ent-chip ${className}`} aria-pressed={paused} onClick={onToggle}>
      {paused ? (
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="M4 2.5v11l9.5-5.5z" fill="currentColor" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <rect x="3" y="2" width="3.5" height="12" rx="1" fill="currentColor" />
          <rect x="9.5" y="2" width="3.5" height="12" rx="1" fill="currentColor" />
        </svg>
      )}
      <span className="ent-chip-label">Pause video</span>
    </button>
  );
}

export function EntranceBar({ paused, onTogglePause, children, className = "" }: { paused: boolean; onTogglePause: () => void; children?: ReactNode; className?: string }) {
  return (
    <header className={`ent-bar ${className}`}>
      <BrandMark />
      {children}
      <div className="ent-bar-actions">
        <PauseVideoButton paused={paused} onToggle={onTogglePause} />
        <SoundToggle className="ent-chip ent-sound" />
      </div>
    </header>
  );
}

export function EntranceFoot({ className = "" }: { className?: string }) {
  return <p className={`ent-foot ${className}`}>VELORA · Lake Aurelia Road, Novara Bay · Open daily 10:00 to 22:00</p>;
}

export function SkipIntro({ onSkip, hidden }: { onSkip: () => void; hidden: boolean }) {
  if (hidden) return null;
  return (
    <button type="button" className="ent-skip" onClick={onSkip}>
      Skip intro
    </button>
  );
}

/** Any key (Escape, Enter, Space) or a click/tap skips the opening. */
export function useSkipOnInput(active: boolean, skip: () => void) {
  const fn = useRef(skip);
  useEffect(() => {
    fn.current = skip;
  });
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") fn.current();
    };
    const onDown = (e: PointerEvent) => {
      if ((e.target as Element | null)?.closest(".ent-skip")) return;
      fn.current();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [active]);
}

// ---------- video ----------
/**
 * A world's clip. Poster first, nothing downloads until it is the active one (preload="none"),
 * and it plays only while active, on screen, with the tab visible and motion allowed.
 * Each variation keeps at most one `active` video at a time.
 */
export function WorldVideo({
  asset,
  active,
  paused,
  quality = "full",
  preload = "auto",
  className = "",
  style,
}: {
  asset: MediaAsset;
  active: boolean;
  paused: boolean;
  quality?: "full" | "preview";
  /** The Gate holds its two world clips back until the intro film is playing, so they never compete with it. */
  preload?: "none" | "auto";
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();
  const want = active && !paused && !reduced;

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    let onScreen = true;
    const apply = () => {
      if (want && onScreen && !document.hidden) v.play().catch(() => {});
      else v.pause();
    };
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      apply();
    });
    io.observe(v);
    apply();
    document.addEventListener("visibilitychange", apply);
    // A play() refused while the file was still loading is retried once data arrives.
    v.addEventListener("canplay", apply);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", apply);
      v.removeEventListener("canplay", apply);
    };
  }, [want]);

  // The first render must match the pre-built HTML (measured: a connection-dependent source list here made
  // React rebuild the whole entrance mid-animation), so connection-aware ordering applies after mount.
  const [settled, setSettled] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- switch to browser-only inputs once hydrated
  useEffect(() => setSettled(true), []);
  const sources = quality === "preview" ? [{ src: previewSrc(asset) }].filter((s): s is { src: string } => !!s.src) : videoSources(asset, true, settled);
  if (asset.kind !== "video") return null;
  return (
    <video
      ref={ref}
      className={className}
      style={style}
      poster={asset.web.poster}
      muted
      loop
      playsInline
      // Full-size world clips buffer during the opening animation, so they are ready the moment the doors open.
      preload={quality === "preview" ? "none" : preload}
      aria-hidden="true"
      tabIndex={-1}
      disablePictureInPicture
    >
      {sources.map((s, i) => (
        <source key={`${i}-${s.src}`} src={s.src} type="video/mp4" media={"media" in s ? (s as { media?: string }).media : undefined} />
      ))}
    </video>
  );
}
