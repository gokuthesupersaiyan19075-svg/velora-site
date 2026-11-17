"use client";

/**
 * Entrance variation 3, "The Night Sky": the park from above as dusk turns to night.
 * Two districts glow as constellations (the wheel and carousel; the coaster with its loop).
 * Hover lights one up and opens a small window onto it; choosing one flies the camera in.
 */
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { prefersReducedMotion } from "@/shared/motion/useReducedMotion";
import { clamp, gsap, SplitText, useGSAP } from "./gsap";
import { SkyEngine, type Anchor } from "./skyField";
import {
  chimeFor,
  EnterLink,
  EntranceBar,
  EntranceFoot,
  enterWorld,
  mediaAsset,
  SkipIntro,
  THRILL,
  useEntranceSound,
  useFinePointer,
  useSkipOnInput,
  WONDER,
  world,
  WORLD_LINE,
  WORLD_MEDIA,
  worldVars,
  WorldVideo,
  type ExperienceId,
} from "./shared";

const key = (id: ExperienceId) => (id === WONDER ? "w" : "t");

export function NightSky() {
  useEntranceSound();
  const fine = useFinePointer();
  const [hover, setHover] = useState<ExperienceId | null>(null);
  const [zoomed, setZoomed] = useState<ExperienceId | null>(null);
  const [paused, setPaused] = useState(false);
  const [intro, setIntro] = useState(true);

  const root = useRef<HTMLDivElement>(null);
  const zoom = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const night = useRef<HTMLDivElement>(null);
  const layout = useRef<HTMLDivElement>(null);
  const anchorW = useRef<HTMLButtonElement>(null);
  const anchorT = useRef<HTMLButtonElement>(null);
  const revealW = useRef<HTMLDivElement>(null);
  const revealT = useRef<HTMLDivElement>(null);
  const enterW = useRef<HTMLDivElement>(null);
  const enterT = useRef<HTMLDivElement>(null);
  const engine = useRef<SkyEngine | null>(null);
  const introTl = useRef<gsap.core.Timeline | null>(null);
  const zoomedRef = useRef<ExperienceId | null>(null);
  const flags = useRef({ onScreen: true, settledIn: false, stale: false });

  const anchorOf = (id: ExperienceId) => (id === WONDER ? anchorW.current : anchorT.current);
  const revealOf = (id: ExperienceId) => (id === WONDER ? revealW.current : revealT.current);

  /** The loop runs only when the sky is actually visible and moving. */
  const syncRunning = useCallback(() => {
    const e = engine.current;
    if (!e) return;
    const f = flags.current;
    e.setRunning(!prefersReducedMotion() && f.onScreen && !document.hidden && !f.settledIn);
  }, []);

  const measure = useCallback(() => {
    const e = engine.current;
    const z = zoom.current;
    if (!e || !z || !anchorW.current || !anchorT.current) return;
    if (zoomedRef.current) {
      flags.current.stale = true; // measure again once back at the full view
      return;
    }
    const zr = z.getBoundingClientRect();
    const toAnchor = (el: HTMLElement): Anchor => {
      const r = el.getBoundingClientRect();
      return { cx: r.left + r.width / 2 - zr.left, cy: r.top + r.height / 2 - zr.top, R: r.width / 2 };
    };
    const avoid = Array.from(z.querySelectorAll<HTMLElement>(".ent-sky-avoid")).map((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left - zr.left, top: r.top - zr.top, right: r.right - zr.left, bottom: r.bottom - zr.top };
    });
    e.layout(zr.width, zr.height, toAnchor(anchorW.current), toAnchor(anchorT.current), avoid);
  }, []);

  useEffect(() => {
    const c = canvas.current;
    const r = root.current;
    if (!c || !r) return;
    const e = new SkyEngine(c);
    engine.current = e;
    if (prefersReducedMotion()) e.setIntro(1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(r);
    document.fonts?.ready.then(measure).catch(() => {});
    const io = new IntersectionObserver(([en]) => {
      flags.current.onScreen = en.isIntersecting;
      syncRunning();
    });
    io.observe(c);
    document.addEventListener("visibilitychange", syncRunning);
    syncRunning();
    return () => {
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", syncRunning);
      e.destroy();
      engine.current = null;
    };
  }, [measure, syncRunning]);

  // ---------- opening: dusk turns to night, the park switches its lights on ----------
  useGSAP(
    () => {
      // Server HTML keeps the scene hidden until the opening has set its first frame (no flash).
      root.current?.setAttribute("data-ready", "");
      const q = gsap.utils.selector(root);
      if (prefersReducedMotion()) {
        gsap.set(night.current, { opacity: 1 });
        setIntro(false);
        return;
      }
      const prog = { p: 0 };
      const title = SplitText.create(q(".ent-sky-title"), { type: "words", mask: "words" });
      const names = SplitText.create(q(".ent-sky-name"), { type: "chars", mask: "chars" });
      const tl = gsap.timeline({
        defaults: { ease: "expo.out" },
        onComplete: () => {
          engine.current?.setIntro(1);
          setIntro(false);
        },
      });
      tl.to(prog, { p: 1, duration: 3, ease: "power1.inOut", onUpdate: () => engine.current?.setIntro(prog.p) }, 0)
        .fromTo(night.current, { opacity: 0 }, { opacity: 1, duration: 2.6, ease: "power1.inOut" }, 0)
        .fromTo(q(".ent-sky-horizon"), { yPercent: 0 }, { yPercent: 38, duration: 2.8, ease: "power2.inOut" }, 0)
        .from(title.words, { yPercent: 110, duration: 1, stagger: 0.05 }, 0.5)
        .from(names.chars, { yPercent: 115, duration: 0.9, stagger: 0.025 }, 1.5)
        .from(q(".ent-sky-reveal-in"), { y: 16, opacity: 0, duration: 0.8, stagger: 0.06 }, 1.75);
      introTl.current = tl;
    },
    { scope: root },
  );

  const skip = useCallback(() => introTl.current?.progress(1), []);
  useSkipOnInput(intro, skip);

  // ---------- hover ----------
  const light = (id: ExperienceId | null) => {
    if (zoomedRef.current) return;
    setHover(id);
    engine.current?.setHover(id ? key(id) : null);
    if (id) chimeFor(id);
  };

  // ---------- fly in / out ----------
  const flyTo = (id: ExperienceId, then?: () => void) => {
    const z = zoom.current;
    const a = anchorOf(id);
    const rv = revealOf(id);
    if (!z || !a || !rv) return;
    if (zoomedRef.current) {
      then?.();
      return;
    }
    if (introTl.current?.isActive()) introTl.current.progress(1);
    zoomedRef.current = id;
    setZoomed(id);
    setHover(id);
    engine.current?.setHover(key(id));
    const focusEnter = () => (id === WONDER ? enterW.current : enterT.current)?.querySelector<HTMLElement>("a")?.focus({ preventScroll: true });
    if (prefersReducedMotion()) {
      gsap.set(rv, { autoAlpha: 1 });
      flags.current.settledIn = true;
      syncRunning();
      focusEnter();
      then?.();
      return;
    }
    const zr = z.getBoundingClientRect();
    const ar = a.getBoundingClientRect();
    const cx = ar.left + ar.width / 2 - zr.left;
    const cy = ar.top + ar.height / 2 - zr.top;
    const k = clamp((0.62 * Math.min(zr.width, zr.height)) / (ar.width / 2), 2.2, 5.5);
    gsap
      .timeline({
        onComplete: () => {
          flags.current.settledIn = true;
          syncRunning();
          focusEnter();
        },
      })
      .set(z, { transformOrigin: `${cx}px ${cy}px` })
      .to(layout.current, { opacity: 0, duration: 0.4, ease: "power1.out" }, 0)
      .to(z, { x: zr.width / 2 - cx, y: zr.height / 2 - cy, scale: k, duration: 1.5, ease: "expo.inOut" }, 0)
      .fromTo(rv, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, ease: "power2.out" }, 0.78)
      .fromTo(rv.querySelector(".ent-sky-reveal-media"), { scale: 1.16 }, { scale: 1, duration: 1.5, ease: "expo.out" }, 0.78)
      .fromTo(rv.querySelectorAll(".ent-sky-rv"), { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.07 }, 1.0);
    if (then) window.setTimeout(then, 700);
  };

  const flyBack = useCallback(() => {
    const id = zoomedRef.current;
    const z = zoom.current;
    if (!id || !z) return;
    const rv = id === WONDER ? revealW.current : revealT.current;
    const anchor = id === WONDER ? anchorW.current : anchorT.current;
    flags.current.settledIn = false;
    syncRunning();
    const done = () => {
      zoomedRef.current = null;
      setZoomed(null);
      setHover(null);
      engine.current?.setHover(null);
      gsap.set(z, { clearProps: "transform" });
      if (flags.current.stale) {
        flags.current.stale = false;
        measure();
      }
      anchor?.focus({ preventScroll: true });
    };
    if (prefersReducedMotion()) {
      gsap.set(rv, { autoAlpha: 0 });
      gsap.set(layout.current, { opacity: 1 });
      done();
      return;
    }
    gsap
      .timeline({ onComplete: done })
      .to(rv, { autoAlpha: 0, duration: 0.5, ease: "power1.out" }, 0)
      .to(z, { x: 0, y: 0, scale: 1, duration: 1.25, ease: "expo.inOut" }, 0.1)
      .to(layout.current, { opacity: 1, duration: 0.6, ease: "power1.out" }, 0.85);
  }, [measure, syncRunning]);

  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && flyBack();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomed, flyBack]);

  const enter = (id: ExperienceId) => {
    if (prefersReducedMotion()) return enterWorld(id);
    flyTo(id, () => enterWorld(id));
  };

  return (
    <div ref={root} className="ent ent-sky" data-hover={hover ? key(hover) : undefined} data-zoomed={zoomed ? key(zoomed) : undefined} data-intro={intro || undefined}>
      <div ref={zoom} className="ent-sky-zoom">
        <div className="ent-sky-dusk" aria-hidden="true">
          <span className="ent-sky-horizon" />
        </div>
        <div ref={night} className="ent-sky-night" aria-hidden="true" />
        <canvas ref={canvas} className="ent-sky-canvas" aria-hidden="true" />

        <div ref={layout} className="ent-sky-layout" inert={!!zoomed}>
          <div className="ent-sky-head">
            <h1 className="ent-sky-title ent-sky-avoid">Two worlds, one park. Choose one and fly in.</h1>
            <p className="ent-sky-hint ent-sky-reveal-in">
              <span className="ent-sky-hint-fine">Hover a district to light it up, click it to fly in</span>
              <span className="ent-sky-hint-touch">Tap a district to fly in</span>
            </p>
          </div>
          <div className="ent-sky-districts">
            {[WONDER, THRILL].map((id) => (
              <District
                key={id}
                id={id}
                anchorRef={id === WONDER ? anchorW : anchorT}
                lit={hover === id}
                active={!intro && !zoomed && hover === id}
                paused={paused}
                fine={fine}
                onLight={light}
                onFly={(i) => flyTo(i)}
                onEnter={enter}
              />
            ))}
          </div>
        </div>
      </div>

      {[WONDER, THRILL].map((id) => (
        <div
          key={id}
          ref={id === WONDER ? revealW : revealT}
          className={`ent-sky-reveal ent-sky-reveal--${key(id)}`}
          style={worldVars(id)}
          inert={zoomed !== id}
          aria-hidden={zoomed !== id}
        >
          <div className="ent-sky-reveal-media">
            <WorldVideo asset={mediaAsset(WORLD_MEDIA[id].hero)} active={zoomed === id} paused={paused} className="ent-sky-reveal-video" />
            <span className="ent-sky-reveal-shade" />
          </div>
          <div className="ent-sky-reveal-copy">
            <h2 className="ent-sky-reveal-name ent-sky-rv">{world(id).name}</h2>
            <p className="ent-sky-reveal-promise ent-sky-rv">{world(id).promise}</p>
            <p className="ent-sky-reveal-summary ent-sky-rv">{world(id).summary}</p>
            <div ref={id === WONDER ? enterW : enterT} className="ent-sky-reveal-actions ent-sky-rv">
              <EnterLink id={id} className="ent-sky-enter" />
              <button type="button" className="ent-chip ent-sky-back" onClick={flyBack}>
                <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
                  <path d="M17 10H4M9 4.5 3.5 10 9 15.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Back to the night sky</span>
              </button>
            </div>
          </div>
        </div>
      ))}

      <EntranceBar paused={paused} onTogglePause={() => setPaused((p) => !p)} className="ent-sky-bar" />
      <EntranceFoot className="ent-sky-foot" />
      <SkipIntro hidden={!intro} onSkip={skip} />
    </div>
  );
}

function District({
  id,
  anchorRef,
  lit,
  active,
  paused,
  fine,
  onLight,
  onFly,
  onEnter,
}: {
  id: ExperienceId;
  anchorRef: RefObject<HTMLButtonElement | null>;
  lit: boolean;
  active: boolean;
  paused: boolean;
  fine: boolean;
  onLight: (id: ExperienceId | null) => void;
  onFly: (id: ExperienceId) => void;
  onEnter: (id: ExperienceId) => void;
}) {
  const w = world(id);
  const k = key(id);
  return (
    <section
      className={`ent-sky-district ent-sky-district--${k}`}
      style={worldVars(id)}
      aria-labelledby={`ent-sky-name-${k}`}
      data-lit={lit || undefined}
      onPointerEnter={() => fine && onLight(id)}
      onPointerLeave={() => fine && onLight(null)}
      onFocus={() => onLight(id)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onLight(null);
      }}
    >
      <button ref={anchorRef} type="button" className="ent-sky-anchor" aria-label={`Fly over ${w.name}`} onClick={() => onFly(id)}>
        <span className="ent-sky-lantern" aria-hidden="true">
          <WorldVideo asset={mediaAsset(WORLD_MEDIA[id].extras[1])} active={active} paused={paused} quality="preview" className="ent-sky-lantern-video" />
        </span>
      </button>
      <div className="ent-sky-label ent-sky-avoid">
        <h2 id={`ent-sky-name-${k}`} className="ent-sky-name">
          {w.name}
        </h2>
        <p className="ent-sky-promise ent-sky-reveal-in">{w.promise}</p>
        <p className="ent-sky-line ent-sky-reveal-in">{WORLD_LINE[id]}</p>
        <div className="ent-sky-reveal-in">
          <EnterLink id={id} onEnter={() => onEnter(id)} className="ent-sky-enter" />
        </div>
      </div>
    </section>
  );
}
