"use client";

/**
 * Entrance variation 1, "The Gate": the two worlds meet at a glowing seam.
 * Pointer, wheel, drag or arrow keys push the seam; past a threshold a world opens full-bleed.
 * Only transforms and opacity move. One rAF loop runs while something is settling, then sleeps.
 */
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent, type RefObject } from "react";
import { Bodoni_Moda, Outfit } from "next/font/google";
import { fhdSources } from "@/shared/media/delivery";
import { getSoundEngine } from "@/shared/sound/engine";
import { prefersReducedMotion, useReducedMotion } from "@/shared/motion/useReducedMotion";
import { clamp, gsap, SplitText, useGSAP } from "./gsap";
import {
  chimeFor,
  EnterLink,
  EntranceBar,
  EntranceFoot,
  enterWorld,
  mediaAsset,
  other,
  SkipIntro,
  THRILL,
  useEntranceSound,
  useSideBySide,
  useSkipOnInput,
  WONDER,
  world,
  WORLD_LINE,
  WORLD_MEDIA,
  worldVars,
  WorldVideo,
  type ExperienceId,
} from "./shared";

const outfit = Outfit({ subsets: ["latin"], weight: ["300", "500"], display: "swap" });
const bodoni = Bodoni_Moda({ subsets: ["latin"], weight: "500", style: "italic", display: "swap" });

type Mode = "split" | ExperienceId;
const SIDE_QUERY = "(min-width: 768px) and (min-aspect-ratio: 1/1)";

export function Gate() {
  useEntranceSound();
  const introAsset = mediaAsset("pexels-26575927"); // approved night aerial: the park wakes up
  const reduced = useReducedMotion();
  const sideBySide = useSideBySide();
  const [mode, setMode] = useState<Mode>("split");
  const [hovered, setHovered] = useState<ExperienceId | null>(null);
  const [lean, setLean] = useState<ExperienceId | null>(null);
  const [paused, setPaused] = useState(false);
  const [intro, setIntro] = useState(true);
  const [filmReady, setFilmReady] = useState(false);
  const [touched, setTouched] = useState(false);

  const root = useRef<HTMLDivElement>(null);
  const filmRef = useRef<HTMLVideoElement>(null);
  // When the opening film is removed, stop its download so it cannot compete with the world clips.
  useEffect(() => {
    const film = filmRef.current;
    return () => {
      if (!film) return;
      film.pause();
      film.querySelectorAll("source").forEach((s) => s.remove());
      film.removeAttribute("src");
      film.load();
    };
  }, [intro]);
  const stage = useRef<HTMLDivElement>(null);
  const mask = useRef<HTMLDivElement>(null);
  const maskInner = useRef<HTMLDivElement>(null);
  const seam = useRef<HTMLDivElement>(null);
  const handle = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  const nameW = useRef<HTMLDivElement>(null);
  const nameT = useRef<HTMLDivElement>(null);
  const restW = useRef<HTMLDivElement>(null);
  const restT = useRef<HTMLDivElement>(null);
  const dimW = useRef<HTMLSpanElement>(null);
  const dimT = useRef<HTMLSpanElement>(null);
  const introTl = useRef<gsap.core.Timeline | null>(null);

  const modeRef = useRef<Mode>("split");
  const axisX = useRef(true);
  const reducedRef = useRef(false);
  const leanRef = useRef<ExperienceId | null>(null);
  const hoverRef = useRef<ExperienceId | null>(null);
  const S = useRef({
    s: 0.5,
    target: 0.5,
    magnet: 0,
    push: 0,
    keys: 0,
    backAcc: 0,
    lastWheel: 0,
    lock: 0,
    hy: 0.5,
    hyT: 0.5,
    hx: 0,
    hxT: 0,
    W: 1,
    H: 1,
    nW: 1,
    nT: 1,
    pad: 24,
    raf: 0,
    last: 0,
    dragging: false,
    tweening: false,
    valueNow: -1,
  });

  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);

  // ---------- frame ----------
  const render = useCallback(() => {
    const st = S.current;
    const m = mask.current;
    const mi = maskInner.current;
    const se = seam.current;
    const h = handle.current;
    if (!m || !mi || !se || !h) return;
    const x = axisX.current;
    const s = st.s;
    const tr = (v: number) => (x ? `translate3d(${v}%,0,0)` : `translate3d(0,${v}%,0)`);
    m.style.transform = tr((s - 1) * 100);
    mi.style.transform = tr((1 - s) * 100);
    const pos = x ? s * st.W : s * st.H;
    se.style.transform = x ? `translate3d(${pos}px,0,0)` : `translate3d(0,${pos}px,0)`;
    se.style.opacity = String(clamp(Math.min(s, 1 - s) / 0.05, 0, 1));
    h.style.transform = x ? `translate3d(${st.hx}px,${st.hy * st.H}px,0)` : `translate3d(${st.hy * st.W}px,${st.hx}px,0)`;

    const fit = (frac: number, natural: number) =>
      x
        ? clamp((frac * st.W - 2 * st.pad) / natural, 0.42, 1.6)
        : clamp(Math.min((st.W - 2 * st.pad) / natural, 0.8 + (frac - 0.5) * 0.7), 0.7, 1.15);
    if (nameW.current) nameW.current.style.transform = `scale(${fit(s, st.nW)})`;
    if (nameT.current) nameT.current.style.transform = `scale(${fit(1 - s, st.nT)})`;
    if (restW.current) restW.current.style.opacity = String(clamp((s - 0.34) / 0.14, 0, 1));
    if (restT.current) restT.current.style.opacity = String(clamp((0.66 - s) / 0.14, 0, 1));
    if (dimW.current) dimW.current.style.opacity = String(clamp((0.5 - s) * 2.2, 0, 0.62));
    if (dimT.current) dimT.current.style.opacity = String(clamp((s - 0.5) * 2.2, 0, 0.62));

    const l = s > 0.56 ? WONDER : s < 0.44 ? THRILL : null;
    if (l !== leanRef.current) {
      leanRef.current = l;
      setLean(l);
    }
    const v = Math.round(s * 100);
    if (v !== st.valueNow) {
      st.valueNow = v;
      h.setAttribute("aria-valuenow", String(v));
      h.setAttribute(
        "aria-valuetext",
        v >= 97 ? "Wonderverse open" : v <= 3 ? "Thrillverse open" : l ? `Leaning to ${world(l).name}` : "Balanced between Wonderverse and Thrillverse",
      );
    }
  }, []);

  /** One frame of easing; returns false once everything has settled. */
  const step = useCallback(
    (t: number): boolean => {
      const st = S.current;
      const dt = Math.min(0.05, Math.max(0.001, (t - st.last) / 1000));
      st.last = t;
      if (t - st.lastWheel > 260) st.push *= Math.exp(-dt * 3);
      if (Math.abs(st.push) < 0.0005) st.push = 0;
      if (modeRef.current === "split" && !st.dragging && !st.tweening) st.target = clamp(0.5 + st.magnet + st.push + st.keys, 0.06, 0.94);
      const fast = reducedRef.current ? 1 : 1 - Math.exp(-dt * (st.dragging ? 20 : 6.5));
      const soft = reducedRef.current ? 1 : 1 - Math.exp(-dt * 9);
      if (!st.tweening) st.s += (st.target - st.s) * fast;
      st.hy += (st.hyT - st.hy) * soft;
      st.hx += (st.hxT - st.hx) * soft;
      render();
      const settled =
        !st.tweening && !st.dragging && st.push === 0 && Math.abs(st.target - st.s) < 0.0004 && Math.abs(st.hyT - st.hy) < 0.001 && Math.abs(st.hxT - st.hx) < 0.2;
      if (settled) {
        st.s = st.target;
        render();
      }
      return !settled;
    },
    [render],
  );

  /** Runs the loop until it settles, then sleeps (no idle rAF). */
  const kick = useCallback(() => {
    const st = S.current;
    if (st.raf) return;
    st.last = performance.now();
    const loop = (t: number) => {
      st.raf = step(t) ? requestAnimationFrame(loop) : 0;
    };
    st.raf = requestAnimationFrame(loop);
  }, [step]);

  // ---------- size ----------
  const measure = useCallback(() => {
    const st = S.current;
    const el = stage.current;
    if (!el) return;
    st.W = el.clientWidth || 1;
    st.H = el.clientHeight || 1;
    const copy = el.querySelector<HTMLElement>(".ent-gate-world--w .ent-gate-copy");
    st.pad = (copy && parseFloat(getComputedStyle(copy).left)) || 24;
    st.nW = nameW.current?.offsetWidth || 1;
    st.nT = nameT.current?.offsetWidth || 1;
    render();
  }, [render]);

  useEffect(() => {
    axisX.current = sideBySide;
    measure();
  }, [sideBySide, measure]);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    document.fonts?.ready.then(measure).catch(() => {});
    const st = S.current;
    return () => {
      ro.disconnect();
      cancelAnimationFrame(st.raf);
      st.raf = 0;
      gsap.killTweensOf(st);
    };
  }, [measure]);

  // ---------- open / close ----------
  const openWorld = useCallback(
    (id: ExperienceId, fast = false) => {
      const st = S.current;
      st.push = 0;
      st.keys = 0;
      st.backAcc = 0;
      st.lock = performance.now() + 700;
      modeRef.current = id;
      setMode(id);
      setTouched(true);
      const v = id === WONDER ? 1 : 0;
      gsap.killTweensOf(st);
      if (reducedRef.current) {
        st.s = st.target = v;
        st.tweening = false;
        render();
        return;
      }
      st.tweening = true;
      gsap.to(st, {
        s: v,
        target: v,
        duration: fast ? 0.7 : 1.05,
        ease: "expo.inOut",
        onUpdate: render,
        onComplete: () => {
          st.tweening = false;
        },
      });
      kick();
    },
    [kick, render],
  );

  const closeToSplit = useCallback(() => {
    const st = S.current;
    st.push = 0;
    st.keys = 0;
    st.backAcc = 0;
    st.lock = performance.now() + 500;
    modeRef.current = "split";
    setMode("split");
    const v = clamp(0.5 + st.magnet, 0.06, 0.94);
    gsap.killTweensOf(st);
    if (reducedRef.current) {
      st.s = st.target = v;
      st.tweening = false;
      render();
      return;
    }
    st.tweening = true;
    gsap.to(st, {
      s: v,
      target: v,
      duration: 0.9,
      ease: "expo.inOut",
      onUpdate: render,
      onComplete: () => {
        st.tweening = false;
        kick();
      },
    });
  }, [kick, render]);

  const enter = useCallback(
    (id: ExperienceId) => {
      if (reducedRef.current || modeRef.current === id) return enterWorld(id);
      openWorld(id, true);
      window.setTimeout(() => enterWorld(id), 380);
    },
    [openWorld],
  );

  // ---------- pointer ----------
  const sideAt = (clientX: number, clientY: number): { main: number; cross: number } => {
    const r = stage.current!.getBoundingClientRect();
    const x = axisX.current;
    const px = (clientX - r.left) / r.width;
    const py = (clientY - r.top) / r.height;
    return x ? { main: px, cross: py } : { main: py, cross: px };
  };

  const onStageMove = (e: PointerEvent<HTMLDivElement>) => {
    const st = S.current;
    if (st.dragging || e.pointerType !== "mouse" || intro) return;
    const { main, cross } = sideAt(e.clientX, e.clientY);
    if (modeRef.current === "split") {
      // The side under the pointer leans open (eased so the middle stays calm).
      const m = (0.5 - main) * 2;
      st.magnet = reducedRef.current ? 0 : 0.17 * Math.sign(m) * Math.pow(Math.abs(m), 0.7);
      const side = main < st.s ? WONDER : THRILL;
      if (side !== hoverRef.current) {
        hoverRef.current = side;
        setHovered(side);
        chimeFor(side);
      }
    }
    // Magnetic handle: slides along the seam with the pointer and is drawn toward it when close.
    st.hyT = clamp(cross, 0.16, 0.84);
    const dist = (main - st.s) * (axisX.current ? st.W : st.H);
    st.hxT = Math.abs(dist) < 150 && !reducedRef.current ? dist * 0.16 : 0;
    kick();
  };

  const onStageLeave = () => {
    const st = S.current;
    st.magnet = 0;
    st.hyT = 0.5;
    st.hxT = 0;
    hoverRef.current = null;
    setHovered(null);
    kick();
  };

  const onStageClick = (e: MouseEvent<HTMLDivElement>) => {
    if (modeRef.current !== "split" || intro) return;
    if ((e.target as Element).closest("a, button, [role='slider']")) return;
    const { main } = sideAt(e.clientX, e.clientY);
    openWorld(main < S.current.s ? WONDER : THRILL);
  };

  // Wheel / trackpad: pushes the seam; far enough opens a world, the other way returns to the gate.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (introTl.current?.isActive()) return;
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      if (horizontal) e.preventDefault(); // no back-swipe navigation; this page does not scroll
      const st = S.current;
      const now = performance.now();
      if (now < st.lock) return;
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
      const dv = (horizontal ? e.deltaX : e.deltaY) * unit;
      const m = modeRef.current;
      if (m === "split") {
        st.push = clamp(st.push - dv * 0.0011, -0.45, 0.45);
        st.lastWheel = now;
        setTouched(true);
        if (0.5 + st.push > 0.8) openWorld(WONDER);
        else if (0.5 + st.push < 0.2) openWorld(THRILL);
        else kick();
      } else {
        const toward = m === WONDER ? dv > 0 : dv < 0;
        st.backAcc = toward ? st.backAcc + Math.abs(dv) : 0;
        if (st.backAcc > 140) closeToSplit();
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [openWorld, closeToSplit, kick]);

  // ---------- handle: drag + keyboard ----------
  const onHandleDown = (e: PointerEvent<HTMLDivElement>) => {
    if (intro) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const st = S.current;
    gsap.killTweensOf(st);
    st.tweening = false;
    st.dragging = true;
    setTouched(true);
    kick();
  };
  const onHandleMove = (e: PointerEvent<HTMLDivElement>) => {
    const st = S.current;
    if (!st.dragging) return;
    const { main, cross } = sideAt(e.clientX, e.clientY);
    st.target = clamp(main, 0.02, 0.98);
    st.hyT = clamp(cross, 0.16, 0.84);
    st.hxT = 0;
    kick();
  };
  const onHandleUp = () => {
    const st = S.current;
    if (!st.dragging) return;
    st.dragging = false;
    if (st.target > 0.74) openWorld(WONDER);
    else if (st.target < 0.26) openWorld(THRILL);
    else if (modeRef.current !== "split") closeToSplit();
    else kick();
  };

  const onHandleKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const x = axisX.current;
    const growKey = x ? "ArrowRight" : "ArrowDown"; // seam moves toward Thrillverse: Wonderverse grows
    const shrinkKey = x ? "ArrowLeft" : "ArrowUp";
    const st = S.current;
    const focusBack = () => requestAnimationFrame(() => back.current?.focus({ preventScroll: true }));
    if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      openWorld(e.key === "End" ? WONDER : THRILL);
      focusBack();
      return;
    }
    if (e.key !== growKey && e.key !== shrinkKey) return;
    e.preventDefault();
    setTouched(true);
    st.keys = clamp(st.keys + (e.key === growKey ? 0.12 : -0.12), -0.45, 0.45);
    if (0.5 + st.keys >= 0.79) {
      openWorld(WONDER);
      focusBack();
    } else if (0.5 + st.keys <= 0.21) {
      openWorld(THRILL);
      focusBack();
    } else kick();
  };

  // Escape returns to the gate from an open world.
  useEffect(() => {
    if (mode === "split") return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        closeToSplit();
        requestAnimationFrame(() => handle.current?.focus({ preventScroll: true }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, closeToSplit]);

  // ---------- opening ----------
  useGSAP(
    () => {
      if (prefersReducedMotion()) {
        setIntro(false);
        return;
      }
      const q = gsap.utils.selector(root);
      const word = SplitText.create(q(".ent-gate-film-word"), { type: "chars", mask: "chars" });
      const names = SplitText.create(q(".ent-gate-name"), { type: "chars", mask: "chars" });
      const tl = gsap.timeline({ paused: true, defaults: { ease: "expo.out" }, onComplete: () => setIntro(false) });
      // "The Awakening": a slow push-in over the night park, the lights settle, then the words. About 5 seconds.
      tl.fromTo(q(".ent-gate-film-media"), { scale: 1 }, { scale: 1.06, duration: 5, ease: "none" }, 0)
        .fromTo(q(".ent-gate-film-scrim"), { opacity: 0.55 }, { opacity: 0.2, duration: 1.6, ease: "power2.out" }, 0)
        .set(q(".ent-gate-film-word"), { visibility: "visible" }, 1.05)
        .fromTo(q(".ent-gate-film-lead"), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.8 }, 0.9)
        .from(word.chars, { yPercent: 110, duration: 0.9, stagger: 0.05 }, 1.1)
        .fromTo(q(".ent-gate-film-tag"), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.8 }, 2.3)
        // hand over to the selector: the film lifts away while the seam, names and buttons arrive
        .to(q(".ent-gate-film-copy"), { opacity: 0, duration: 0.5, ease: "power1.in" }, 4.0)
        .to(q(".ent-gate-film"), { opacity: 0, scale: 1.04, duration: 0.9, ease: "power2.inOut" }, 4.1)
        .from(q(".ent-gate-seam-inner"), { opacity: 0, duration: 0.7, ease: "power1.out" }, 4.35)
        .from(names.chars, { yPercent: 115, duration: 0.95, stagger: 0.022 }, 4.4)
        .from(q(".ent-gate-reveal"), { y: 18, opacity: 0, duration: 0.8, stagger: 0.05 }, 4.65)
        .from(q(".ent-gate-knob"), { scale: 0.4, opacity: 0, duration: 0.7, ease: "back.out(2)", clearProps: "transform,opacity" }, 4.7);
      introTl.current = tl;
      // Coming back from a world ("Back"): straight to the selector, no opening film.
      if (new URLSearchParams(window.location.search).has("choose")) {
        window.history.replaceState(null, "", window.location.pathname);
        tl.progress(1);
        return;
      }
      // The film starts only once a few seconds of it are buffered (or after a short wait), and the animation
      // starts when it is really playing: playing straight away from the CDN stalled and stuttered at the start.
      const film = root.current?.querySelector<HTMLVideoElement>(".ent-gate-film-media");
      let started = false;
      const start = () => {
        if (started) return;
        started = true;
        tl.play();
      };
      // The world clips start buffering only once the film holds the whole intro (about 5.6 s), so their
      // downloads never starve it mid-play; if that never happens they start when the intro ends (!intro).
      const INTRO_S = 6;
      const bufferedTo = () => (film && film.buffered.length ? film.buffered.end(0) : 0);
      const ahead = () => {
        if (!film) return 0;
        for (let i = 0; i < film.buffered.length; i++) if (film.buffered.start(i) <= film.currentTime + 0.1) return film.buffered.end(i) - film.currentTime;
        return 0;
      };
      let launched = false;
      const launch = () => {
        if (launched || !film) return;
        launched = true;
        film.addEventListener("playing", start, { once: true });
        film.play().catch(start);
      };
      const check = () => {
        if (film && (film.readyState >= 4 || ahead() >= 3)) launch();
        if (bufferedTo() >= INTRO_S || (film && film.duration > 0 && bufferedTo() >= film.duration - 0.1)) setFilmReady(true);
      };
      film?.addEventListener("progress", check);
      film?.addEventListener("canplaythrough", check);
      check();
      const timer = window.setTimeout(launch, 2000);
      const fallback = window.setTimeout(start, 3200);
      return () => {
        window.clearTimeout(timer);
        window.clearTimeout(fallback);
        film?.removeEventListener("playing", start);
        film?.removeEventListener("progress", check);
        film?.removeEventListener("canplaythrough", check);
      };
    },
    { scope: root },
  );

  const skip = useCallback(() => introTl.current?.progress(1), []);
  useSkipOnInput(intro, skip);

  const playing: ExperienceId | null = mode !== "split" ? mode : (lean ?? hovered);

  // Hovering a world plays that world's ride sound effects, not music: Wonderverse the amusement-park rides and
  // fairground, Thrillverse a roller coaster run and a scream as it drops. Silent unless the visitor switched sound on; fades out when the pointer leaves.
  useEffect(() => {
    if (intro) return;
    const e = getSoundEngine();
    if (playing === WONDER) {
      e.layer("gate-world", "fair-evening", 0.34);
    } else if (playing === THRILL) {
      e.layer("gate-world", "coaster-run", 0.36);
      const t = window.setTimeout(() => e.sfx("ride-scream", { volume: 0.2 }), 700);
      return () => window.clearTimeout(t);
    } else {
      e.layer("gate-world", null);
    }
  }, [playing, intro]);
  useEffect(() => () => getSoundEngine().layer("gate-world", null), []);
  const openOther = mode === "split" ? null : other(mode);

  return (
    <div ref={root} className="ent ent-gate" data-axis={sideBySide ? "x" : "y"} data-mode={mode} data-intro={intro || undefined}>
      <EntranceBar paused={paused} onTogglePause={() => setPaused((p) => !p)} className="ent-gate-bar">
        <h1 className="ent-gate-title">Two worlds, one park. Step through either side.</h1>
      </EntranceBar>

      <div ref={stage} className="ent-gate-stage" inert={intro} onPointerMove={onStageMove} onPointerLeave={onStageLeave} onClick={onStageClick}>
        <GateWorld ready={filmReady || !intro} id={THRILL} nameRef={nameT} restRef={restT} dimRef={dimT} active={!intro && playing === THRILL} paused={paused} covered={mode === WONDER} onEnter={enter} />
        <div ref={mask} className="ent-gate-mask">
          <div ref={maskInner} className="ent-gate-mask-inner">
            <GateWorld ready={filmReady || !intro} id={WONDER} nameRef={nameW} restRef={restW} dimRef={dimW} active={!intro && playing === WONDER} paused={paused} covered={mode === THRILL} onEnter={enter} />
          </div>
        </div>

        <div ref={seam} className="ent-gate-seam">
          <span className="ent-gate-seam-inner" aria-hidden="true">
            <i className="ent-gate-glow" />
            <i className="ent-gate-line" />
            <i className="ent-gate-spark" />
          </span>
          <div
            ref={handle}
            className="ent-gate-handle"
            role="slider"
            tabIndex={mode === "split" ? 0 : -1}
            aria-label="The gate between Wonderverse and Thrillverse"
            aria-orientation={sideBySide ? "horizontal" : "vertical"}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={50}
            aria-valuetext="Balanced between Wonderverse and Thrillverse"
            onKeyDown={onHandleKey}
            onPointerDown={onHandleDown}
            onPointerMove={onHandleMove}
            onPointerUp={onHandleUp}
            onPointerCancel={onHandleUp}
          >
            <span className="ent-gate-knob" aria-hidden="true">
              <svg viewBox="0 0 32 16" width="30" height="15">
                <path d="M9 2 3 8l6 6M23 2l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="ent-gate-hint" data-hidden={touched || mode !== "split" || undefined} aria-hidden="true">
              <span className="ent-gate-hint-fine">Drag the seam, or click a side to look in</span>
              <span className="ent-gate-hint-touch">Drag the seam, or tap a world to look in</span>
            </span>
          </div>
        </div>

        <div className="ent-gate-opennav" data-show={mode !== "split" || undefined} inert={mode === "split"}>
          <button ref={back} type="button" className="ent-chip ent-gate-back" onClick={closeToSplit}>
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
              <path d="M17 10H4M9 4.5 3.5 10 9 15.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Back to both worlds</span>
          </button>
          {openOther && (
            <button type="button" className="ent-chip ent-gate-peek" style={worldVars(openOther)} onClick={() => openWorld(openOther)}>
              <span className="ent-continue-dot" aria-hidden="true" />
              <span>Look at {world(openOther).name}</span>
            </button>
          )}
        </div>
      </div>

      <EntranceFoot className="ent-gate-foot" />

      {intro && (
        <div className="ent-gate-intro" aria-hidden="true">
          <div className="ent-gate-film">
            <video ref={filmRef} className="ent-gate-film-media" muted loop playsInline preload="auto" poster={introAsset.web.poster}>
              {/* Always 1080p: the 4K file (108 MB) lagged and starved the world clips buffering behind it. */}
              {fhdSources(introAsset).map((v, i) => (
                <source key={`${i}-${v.src}`} src={v.src} type="video/mp4" />
              ))}
            </video>
            <span className="ent-gate-film-scrim" />
            <div className="ent-gate-film-copy">
              <p className={`ent-gate-film-lead ${outfit.className}`}>WELCOME TO</p>
              <p className={`ent-gate-film-word ${outfit.className}`}>VELORA</p>
              <p className={`ent-gate-film-tag ${bodoni.className}`}>A world beyond the ordinary.</p>
            </div>
          </div>
        </div>
      )}
      <SkipIntro hidden={!intro} onSkip={skip} />
    </div>
  );
}

function GateWorld({
  id,
  nameRef,
  restRef,
  dimRef,
  active,
  paused,
  covered,
  onEnter,
  ready,
}: {
  id: ExperienceId;
  nameRef: RefObject<HTMLDivElement | null>;
  restRef: RefObject<HTMLDivElement | null>;
  dimRef: RefObject<HTMLSpanElement | null>;
  active: boolean;
  paused: boolean;
  covered: boolean;
  onEnter: (id: ExperienceId) => void;
  ready: boolean;
}) {
  const w = world(id);
  const key = id === WONDER ? "w" : "t";
  return (
    <section className={`ent-gate-world ent-gate-world--${key}`} style={worldVars(id)} aria-labelledby={`ent-gate-name-${key}`} inert={covered}>
      <div className="ent-gate-media">
        <WorldVideo asset={mediaAsset(WORLD_MEDIA[id].hero)} active={active} paused={paused} preload={ready ? "auto" : "none"} className="ent-gate-video" />
        <span className="ent-gate-tint" />
        <span ref={dimRef} className="ent-gate-dim" />
      </div>
      <div className="ent-gate-copy">
        <div ref={nameRef} className="ent-gate-namebox">
          <h2 id={`ent-gate-name-${key}`} className="ent-gate-name">
            {w.name}
          </h2>
        </div>
        <p className="ent-gate-promise ent-gate-reveal">{w.promise}</p>
        <div ref={restRef} className="ent-gate-rest">
          <p className="ent-gate-line-copy ent-gate-reveal">{WORLD_LINE[id]}</p>
        </div>
        <div className="ent-gate-actions ent-gate-reveal">
          <EnterLink id={id} onEnter={() => onEnter(id)} className="ent-gate-enter" />
        </div>
      </div>
    </section>
  );
}
