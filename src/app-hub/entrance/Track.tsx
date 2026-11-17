"use client";

/**
 * Entrance variation 5, "The Switch Track": a coaster station at golden hour.
 * The left line rolls gently to the Ferris wheel (Wonderverse); the right line climbs a lift hill
 * and drops into a vertical loop (Thrillverse). Each world's film plays inside its portal.
 * Throw the points to light a line; ride it and the portal opens around you.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/shared/motion/useReducedMotion";
import { getSoundEngine } from "@/shared/sound/engine";
import { CanvasClip } from "./canvasMedia";
import { gsap, SplitText, useGSAP } from "./gsap";
import { TrackEngine, type Side, type TrackParams } from "./trackField";
import {
  Arrow,
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

export function Track() {
  useEntranceSound();
  const fine = useFinePointer();
  const [points, setPointsState] = useState<ExperienceId | null>(null);
  const [riding, setRiding] = useState<ExperienceId | null>(null);
  const [paused, setPaused] = useState(false);
  const [intro, setIntro] = useState(true);

  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const clipHost = useRef<HTMLDivElement>(null);
  const engine = useRef<TrackEngine | null>(null);
  const clips = useRef<[CanvasClip, CanvasClip] | null>(null);
  const introTl = useRef<gsap.core.Timeline | null>(null);
  const params = useRef<TrackParams>({ draw: 0, lights: 0 });
  const state = useRef({ onScreen: true, paused: false, points: null as Side | null, riding: null as Side | null });

  /** Only the lit line's film plays (or the one being ridden to). */
  const sync = useCallback(() => {
    const e = engine.current;
    const c = clips.current;
    if (!e || !c) return;
    const s = state.current;
    const live = !prefersReducedMotion() && s.onScreen && !document.hidden;
    e.setRunning(live);
    const playing = s.riding ?? (s.paused ? null : s.points);
    c[0].play(live && playing === 0);
    c[1].play(live && playing === 1);
  }, []);

  useEffect(() => {
    const cv = canvas.current;
    const r = root.current;
    const host = clipHost.current;
    if (!cv || !r || !host) return;
    const pair: [CanvasClip, CanvasClip] = [
      new CanvasClip(mediaAsset(WORLD_MEDIA[WONDER].hero), host),
      new CanvasClip(mediaAsset(WORLD_MEDIA[THRILL].hero), host),
    ];
    clips.current = pair;
    const e = new TrackEngine(cv, pair, params.current);
    engine.current = e;
    if (prefersReducedMotion()) Object.assign(e.params, { draw: 1, lights: 1 });
    const measure = () => {
      const b = r.getBoundingClientRect();
      if (!e.busy) e.layout(b.width, b.height);
    };
    measure();
    pair.forEach((c) => c.poster.addEventListener("load", () => e.render()));
    const ro = new ResizeObserver(measure);
    ro.observe(r);
    const io = new IntersectionObserver(([en]) => {
      state.current.onScreen = en.isIntersecting;
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
    state.current.paused = paused;
    sync();
  }, [paused, sync]);

  // ---------- opening: the track draws out from the station, then the lights come on ----------
  useGSAP(
    () => {
      root.current?.setAttribute("data-ready", "");
      const q = gsap.utils.selector(root);
      if (prefersReducedMotion()) {
        setIntro(false);
        return;
      }
      const P = params.current;
      const title = SplitText.create(q(".ent-tr-title"), { type: "words", mask: "words" });
      const tl = gsap.timeline({ defaults: { ease: "expo.out" }, onComplete: () => setIntro(false) });
      tl.to(P, { draw: 1, duration: 2, ease: "power2.inOut" }, 0.15)
        .to(P, { lights: 1, duration: 0.9, ease: "power1.out", onStart: () => clips.current?.forEach((c) => c.warm()) }, 1.6)
        .from(title.words, { yPercent: 110, duration: 1, stagger: 0.06 }, 0.4)
        .from(q(".ent-tr-in"), { y: 18, opacity: 0, duration: 0.8, stagger: 0.07 }, 1.7);
      introTl.current = tl;
    },
    { scope: root },
  );

  const skip = useCallback(() => introTl.current?.progress(1), []);
  useSkipOnInput(intro, skip);

  // ---------- the points ----------
  const setPoints = useCallback(
    (id: ExperienceId | null, sound = true) => {
      if (state.current.riding !== null) return;
      const s = id ? sideOf(id) : null;
      if (s === state.current.points) return;
      state.current.points = s;
      setPointsState(id);
      engine.current?.setPoints(s);
      if (id && sound) {
        chimeFor(id);
        getSoundEngine().chime(196, { volume: 0.06, decay: 0.25 }); // the clack of the points
      }
      sync();
    },
    [sync],
  );

  /** Hovering the wheel or the loop lights its line. */
  const onMove = (ev: React.PointerEvent) => {
    const e = engine.current;
    if (!fine || !e || state.current.riding !== null) return;
    if ((ev.target as Element).closest(".ent-tr-block, .ent-tr-lever, .ent-bar")) return;
    const b = canvas.current!.getBoundingClientRect();
    const x = ev.clientX - b.left;
    const y = ev.clientY - b.top;
    const { wheel, loop } = e.portals();
    const inW = Math.hypot(x - wheel.x, y - wheel.y) < wheel.r * 1.1;
    const inT = Math.hypot(x - loop.x, y - loop.y) < loop.r * 1.15;
    if (inW) setPoints(WONDER);
    else if (inT) setPoints(THRILL);
    root.current!.toggleAttribute("data-over-portal", inW || inT);
  };

  const onCanvasClick = (ev: React.MouseEvent) => {
    const e = engine.current;
    if (!e || state.current.riding !== null) return;
    const b = canvas.current!.getBoundingClientRect();
    const x = ev.clientX - b.left;
    const y = ev.clientY - b.top;
    const { wheel, loop } = e.portals();
    if (Math.hypot(x - wheel.x, y - wheel.y) < wheel.r * 1.1) ride(WONDER);
    else if (Math.hypot(x - loop.x, y - loop.y) < loop.r * 1.15) ride(THRILL);
  };

  const ride = (id: ExperienceId) => {
    const e = engine.current;
    if (!e || prefersReducedMotion() || state.current.riding !== null) return enterWorld(id);
    if (introTl.current?.isActive()) introTl.current.progress(1);
    setPoints(id, false);
    const s = sideOf(id);
    state.current.riding = s;
    setRiding(id);
    sync();
    const snd = getSoundEngine();
    if (s === 1) snd.sfx("chain-lift", { volume: 0.4 });
    else snd.sfx("whoosh-wipe", { volume: 0.35 });
    e.startRide(s, {
      onDrop: () => {
        snd.sfx("coaster-run", { volume: 0.45 });
        snd.sfx("ride-scream", { volume: 0.3 });
      },
      onArrive: () => s === 0 && snd.sfx("chime-crystal", { volume: 0.3 }),
      onDone: () => enterWorld(id),
    });
  };

  const toggle = () => setPoints(points === WONDER ? THRILL : WONDER);
  const next = points === WONDER ? THRILL : WONDER;

  return (
    <div
      ref={root}
      className="ent ent-tr"
      data-points={points ? key(points) : undefined}
      data-riding={riding ? key(riding) : undefined}
      data-intro={intro || undefined}
      onPointerMove={onMove}
    >
      <canvas ref={canvas} className="ent-tr-canvas" aria-hidden="true" onClick={onCanvasClick} />
      <div ref={clipHost} className="ent-canvas-clips" aria-hidden="true" />

      <div className="ent-tr-layout" inert={!!riding}>
        <h1 className="ent-tr-title">Pick a track.</h1>
        <p className="ent-tr-hint ent-tr-in">
          <span className="ent-tr-hint-fine">Point at the wheel or the loop to set the points. Ride in from there.</span>
          <span className="ent-tr-hint-touch">Set the points, then ride in.</span>
        </p>

        {[WONDER, THRILL].map((id) => {
          const w = world(id);
          return (
            <section
              key={id}
              className={`ent-tr-block ent-tr-block--${key(id)}`}
              style={worldVars(id)}
              aria-labelledby={`ent-tr-name-${key(id)}`}
              data-set={points === id || undefined}
              onPointerEnter={() => fine && setPoints(id)}
              onFocus={() => setPoints(id)}
            >
              <h2 id={`ent-tr-name-${key(id)}`} className="ent-tr-name ent-tr-in">
                {w.name}
              </h2>
              <p className="ent-tr-promise ent-tr-in">{w.promise}</p>
              <p className="ent-tr-line ent-tr-in">{WORLD_LINE[id]}</p>
              <div className="ent-tr-in">
                <EnterLink id={id} onEnter={() => ride(id)} className="ent-tr-enter">
                  <span>
                    Ride to<span className="ent-tr-long"> {w.name}</span>
                  </span>
                  <Arrow />
                </EnterLink>
              </div>
            </section>
          );
        })}

        <button
          type="button"
          className="ent-tr-lever ent-tr-in"
          onClick={toggle}
          aria-label={`Set the points to ${world(next).name}`}
          data-side={points ? key(points) : undefined}
        >
          <svg viewBox="0 0 48 32" width="44" height="30" aria-hidden="true">
            <path d="M6 26h36" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            <g className="ent-tr-lever-arm">
              <path d="M24 26V9" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
              <circle cx="24" cy="7" r="4.2" fill="currentColor" />
            </g>
          </svg>
          <span>{points ? `Points set: ${world(points).name}` : "Switch the points"}</span>
        </button>
      </div>

      <EntranceBar paused={paused} onTogglePause={() => setPaused((p) => !p)} className="ent-tr-bar" />
      <EntranceFoot className="ent-tr-foot" />
      <SkipIntro hidden={!intro} onSkip={skip} />
    </div>
  );
}
