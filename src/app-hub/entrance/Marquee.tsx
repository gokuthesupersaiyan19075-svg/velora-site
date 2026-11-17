"use client";

/**
 * Entrance variation 4, "The Marquee": the park's sign as a wall of bulbs.
 * A chase runs round the frame, VELORA lights letter by letter, then each half of the sign becomes a
 * screen and plays its world's film through the bulbs. The pointer warms the bulbs it passes over;
 * choosing a world swells its bulbs until they merge into the clear film.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/shared/motion/useReducedMotion";
import { getSoundEngine } from "@/shared/sound/engine";
import { CanvasClip } from "./canvasMedia";
import { gsap, useGSAP } from "./gsap";
import { MarqueeEngine, type MarqueeParams, type Side } from "./marqueeField";
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
  type ExperienceId,
} from "./shared";

const sideOf = (id: ExperienceId): Side => (id === WONDER ? 0 : 1);
const key = (id: ExperienceId) => (id === WONDER ? "w" : "t");
/** One note per letter of VELORA as it lights (pentatonic, so any order sounds sweet). */
const NOTES = [523.3, 587.3, 659.3, 784, 880, 1046.5];

export function Marquee() {
  useEntranceSound();
  const fine = useFinePointer();
  const [hover, setHover] = useState<ExperienceId | null>(null);
  const [chosen, setChosen] = useState<ExperienceId | null>(null);
  const [paused, setPaused] = useState(false);
  const [intro, setIntro] = useState(true);

  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const clipHost = useRef<HTMLDivElement>(null);
  const engine = useRef<MarqueeEngine | null>(null);
  const clips = useRef<[CanvasClip, CanvasClip] | null>(null);
  const introTl = useRef<gsap.core.Timeline | null>(null);
  const flags = useRef({ onScreen: true, paused: false, chosen: false });
  const params = useRef<MarqueeParams>({ frame: 0, logo: 0, screen: 0, names: 0, bloom: 0 });

  /** Bulbs animate only when visible; films play only once the screens are on and not paused. */
  const sync = useCallback(() => {
    const e = engine.current;
    const c = clips.current;
    if (!e || !c) return;
    const f = flags.current;
    const live = !prefersReducedMotion() && f.onScreen && !document.hidden;
    e.setRunning(live);
    const films = live && e.params.screen > 0.05 && (!f.paused || f.chosen);
    c[0].play(films);
    c[1].play(films);
  }, []);

  useEffect(() => {
    const cv = canvas.current;
    const r = root.current;
    const host = clipHost.current;
    if (!cv || !r || !host) return;
    const cs = getComputedStyle(r);
    const fam = (v: string, fb: string) => cs.getPropertyValue(v).trim() || fb;
    const fonts = {
      wonder: fam("--font-ent-wonder", "Impact, sans-serif"),
      thrill: fam("--font-ent-thrill", "Arial Black, sans-serif"),
      brand: fam("--font-hub", "system-ui, sans-serif"),
    };
    const pair: [CanvasClip, CanvasClip] = [
      new CanvasClip(mediaAsset(WORLD_MEDIA[WONDER].hero), host),
      new CanvasClip(mediaAsset(WORLD_MEDIA[THRILL].hero), host),
    ];
    clips.current = pair;
    const e = new MarqueeEngine(cv, pair, fonts, params.current);
    engine.current = e;
    if (prefersReducedMotion()) Object.assign(e.params, { frame: 1, logo: 6, screen: 1, names: 1 });

    const measure = () => {
      const b = r.getBoundingClientRect();
      e.layout(b.width, b.height);
    };
    measure();
    // The bulb letters need the real faces: load them, then rasterise again.
    Promise.all([document.fonts.load(`800 64px ${fonts.wonder}`), document.fonts.load(`900 64px ${fonts.thrill}`)])
      .then(measure)
      .catch(() => {});
    pair.forEach((c) => c.poster.addEventListener("load", () => e.render()));
    const ro = new ResizeObserver(measure);
    ro.observe(r);
    const io = new IntersectionObserver(([en]) => {
      flags.current.onScreen = en.isIntersecting;
      sync();
    });
    io.observe(cv);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      e.destroy();
      pair.forEach((c) => c.destroy());
      engine.current = null;
      clips.current = null;
    };
  }, [sync]);

  useEffect(() => {
    flags.current.paused = paused;
    sync();
  }, [paused, sync]);

  // ---------- opening: the chase, VELORA letter by letter, then the screens switch on ----------
  useGSAP(
    () => {
      root.current?.setAttribute("data-ready", "");
      const q = gsap.utils.selector(root);
      if (prefersReducedMotion()) {
        setIntro(false);
        return;
      }
      const P = params.current;
      let lastLetter = -1;
      const tl = gsap.timeline({
        defaults: { ease: "power2.out" },
        onComplete: () => setIntro(false),
      });
      tl.to(P, { frame: 1, duration: 0.7 }, 0.1)
        .to(
          P,
          {
            logo: 6,
            duration: 1.5,
            ease: "none",
            onUpdate: () => {
              const L = Math.floor(P.logo);
              if (L !== lastLetter && L < 6) {
                lastLetter = L;
                getSoundEngine().chime(NOTES[L], { volume: 0.08, decay: 1.2 });
              }
            },
          },
          0.35,
        )
        .to(P, { screen: 1, duration: 1.3, ease: "power2.inOut", onStart: () => clips.current?.forEach((c) => c.warm()), onUpdate: sync }, 2.25)
        .to(P, { names: 1, duration: 0.8 }, 3.0)
        .from(q(".ent-mq-in"), { y: 18, opacity: 0, duration: 0.8, stagger: 0.07, ease: "expo.out" }, 3.15);
      introTl.current = tl;
    },
    { scope: root },
  );

  const skip = useCallback(() => {
    introTl.current?.progress(1);
    sync();
  }, [sync]);
  useSkipOnInput(intro, skip);

  // ---------- pointer: bulbs warm up where the pointer passes ----------
  const onMove = (e: React.PointerEvent) => {
    if (!fine || flags.current.chosen) return;
    const b = canvas.current!.getBoundingClientRect();
    engine.current?.setPointer(e.clientX - b.left, e.clientY - b.top, true);
  };
  const onLeave = () => engine.current?.setPointer(-1e4, -1e4, false);

  const light = (id: ExperienceId | null) => {
    if (flags.current.chosen) return;
    setHover(id);
    engine.current?.setHover(id ? sideOf(id) : null);
    if (id) chimeFor(id);
  };

  const enter = (id: ExperienceId) => {
    const e = engine.current;
    if (!e || prefersReducedMotion() || flags.current.chosen) return enterWorld(id);
    if (introTl.current?.isActive()) introTl.current.progress(1);
    flags.current.chosen = true;
    setChosen(id);
    setHover(id);
    e.setHover(sideOf(id));
    e.chosen = sideOf(id);
    e.setPointer(-1e4, -1e4, false);
    sync();
    getSoundEngine().sfx("whoosh-wipe", { volume: 0.4 });
    gsap.to(e.params, { bloom: 1, duration: 1.5, ease: "expo.inOut", onComplete: () => enterWorld(id) });
  };

  return (
    <div
      ref={root}
      className="ent ent-mq"
      data-hover={hover ? key(hover) : undefined}
      data-chosen={chosen ? key(chosen) : undefined}
      data-intro={intro || undefined}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <canvas ref={canvas} className="ent-mq-canvas" aria-hidden="true" />
      <div ref={clipHost} className="ent-canvas-clips" aria-hidden="true" />
      <h1 className="ent-sr">VELORA. Two worlds are lit up tonight: choose one.</h1>

      <div className="ent-mq-halves" inert={!!chosen}>
        {[WONDER, THRILL].map((id) => {
          const w = world(id);
          return (
            <section
              key={id}
              className={`ent-mq-half ent-mq-half--${key(id)}`}
              style={worldVars(id)}
              aria-labelledby={`ent-mq-name-${key(id)}`}
              onPointerEnter={() => fine && light(id)}
              onPointerLeave={() => fine && light(null)}
              onFocus={() => light(id)}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) light(null);
              }}
            >
              {/* the name itself is spelled in bulbs on the canvas */}
              <h2 id={`ent-mq-name-${key(id)}`} className="ent-sr">
                {w.name}
              </h2>
              <div className="ent-mq-copy">
                <p className="ent-mq-promise ent-mq-in">{w.promise}</p>
                <p className="ent-mq-line ent-mq-in">{WORLD_LINE[id]}</p>
                <div className="ent-mq-in">
                  <EnterLink id={id} onEnter={() => enter(id)} className="ent-mq-enter" />
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <p className="ent-mq-hint ent-mq-in" aria-hidden="true">
        <span className="ent-mq-hint-fine">Run the pointer across the sign. Pick a side to go in.</span>
        <span className="ent-mq-hint-touch">Pick a side to go in.</span>
      </p>

      <EntranceBar paused={paused} onTogglePause={() => setPaused((p) => !p)} className="ent-mq-bar" />
      <EntranceFoot className="ent-mq-foot" />
      <SkipIntro hidden={!intro} onSkip={skip} />
    </div>
  );
}
