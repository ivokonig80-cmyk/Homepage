"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  AnimatePresence,
  animate,
  motion,
  useAnimationFrame,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTime,
  useTransform,
} from "framer-motion";
import { LowPolyMesh } from "./LowPolyMesh";
import { HERO_SLIDES } from "./heroSlides";
import { trackEvent } from "@/lib/analytics";
import { getServerSnapshot, readConsent, subscribe } from "@/lib/consent";

/**
 * Interaktives 4-Slide-Karussell für den Hero-Bereich. Ein einziges
 * `progress`-MotionValue (0 = verstreut, 1 = verschweißt) treibt jeweils das
 * AKTIVE Motiv (`LowPolyMesh`, siehe dort).
 *
 * Slide-Wechsel (Pfeil ODER Punkt): das aktuelle Motiv wird automatisch
 * gesprengt (progress -> 0, animiert - läuft exakt denselben Weg rückwärts,
 * den die Montage genommen hätte, da die Positions-Formeln in LowPolyMesh
 * rein aus dem aktuellen Zahlenwert abgeleitet sind), danach wird das
 * Facetten-Set getauscht - der NEUE Zusammenbau ist dann wieder organisch
 * per Mausbewegung gesteuert (kein automatisches Wieder-Zusammenfügen).
 * `mouseTravel` wird beim Wechsel zurückgesetzt, damit jedes Motiv frische
 * Mausbewegung braucht statt vom bereits verbrauchten Weg des vorherigen
 * Motivs zu profitieren. Das gilt fuer JEDEN Slide gleich (auch den
 * allerersten Katzen-Slide) - `organicControlActive` ist praktisch immer
 * an, ausser waehrend der kurzen automatischen Sprengen-Animation selbst.
 */

const SCROLL_ASSEMBLE_PX = 420;
const MOUSE_ASSEMBLE_PX = 560;
const AUTO_ADVANCE_MS = 7000;
const EXPLODE_DURATION = 0.9;

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {direction === "left" ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
    </svg>
  );
}

export function HeroCarousel() {
  const prefersReducedMotion = useReducedMotion();
  const consent = useSyncExternalStore(subscribe, readConsent, getServerSnapshot);
  const consentResolved = consent !== "unknown";

  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  // Ab der allerersten jemals ausgelösten Sprengung dauerhaft an - schaltet
  // in LowPolyMesh den großen Chaos-Streuradius + dauerhaftes Umhertreiben
  // im Ruhezustand frei (siehe dortiger Datei-Kommentar). Wird bewusst
  // gesetzt, BEVOR die Sprengen-Animation startet (progress steht dann noch
  // bei 1), damit der Radius-Wechsel keinen sichtbaren Sprung verursacht.
  const [chaosEnabled, setChaosEnabled] = useState(false);

  const progress = useMotionValue(0);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  // Gemeinsame Uhr fuer das Umhertreiben in LowPolyMesh - hier oben erzeugt
  // (statt dort), damit chaosStartTime (siehe unten) denselben Zeitwert
  // referenzieren kann.
  const time = useTime();
  // Zeitpunkt, an dem die letzte Sprengung fertig war (Uhr-Wert, nicht
  // Kalenderzeit) - LowPolyMesh nutzt das, um das Umhertreiben weich
  // einzublenden statt es im selben Frame mit voller Staerke zu starten, in
  // dem die Flugbewegung endet (sonst ein kleiner, aber sichtbarer Knick in
  // der Bewegungsrichtung genau am Uebergang).
  const chaosStartTime = useMotionValue(0);

  const organicControlActive = useRef(true);
  const isTransitioning = useRef(false);
  const autoAdvanceStarted = useRef(false);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoveringRef = useRef(false);

  // --- Organische Erstmontage (nur für den allerersten Slide beim Laden) -
  // exakt das bisherige LowPolyCat-Verhalten, nur jetzt hier in der
  // Karussell-Ebene, da `progress` slide-übergreifend geteilt wird.
  const { scrollY } = useScroll();
  const scrollAssemble = useTransform(scrollY, [0, SCROLL_ASSEMBLE_PX], [0, 1]);
  const mouseTravel = useMotionValue(0);
  const mouseAssemble = useTransform(mouseTravel, [0, MOUSE_ASSEMBLE_PX], [0, 1]);

  useAnimationFrame(() => {
    if (!organicControlActive.current || prefersReducedMotion || !consentResolved) return;
    const current = Math.max(scrollAssemble.get(), mouseAssemble.get());
    if (current > progress.get()) progress.set(current);
  });

  useEffect(() => {
    if (prefersReducedMotion || !consentResolved) return;
    let last: { x: number; y: number } | null = null;

    function handlePointerMove(e: PointerEvent) {
      pointerX.set(e.clientX / window.innerWidth - 0.5);
      pointerY.set(e.clientY / window.innerHeight - 0.5);
      if (organicControlActive.current && last) {
        const delta = Math.hypot(e.clientX - last.x, e.clientY - last.y);
        mouseTravel.set(mouseTravel.get() + delta);
      }
      last = { x: e.clientX, y: e.clientY };
    }

    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [prefersReducedMotion, consentResolved, pointerX, pointerY, mouseTravel]);

  // --- Slide-Wechsel: sprengen (progress -> 0, automatisch animiert),
  // Facetten tauschen, danach den Zusammenbau wieder der Maus überlassen
  // (organicControlActive wieder an, mouseTravel zurückgesetzt - siehe
  // Datei-Kommentar oben). Reduced-Motion: direkter, unanimierter Sprung
  // zum bereits verschweißten Zielmotiv (kein Sprengen, kein Warten auf
  // Mausbewegung).
  const goToSlide = useCallback(
    async (nextIndex: number) => {
      const wrapped = ((nextIndex % HERO_SLIDES.length) + HERO_SLIDES.length) % HERO_SLIDES.length;
      if (wrapped === activeIndexRef.current || isTransitioning.current) return;
      organicControlActive.current = false;
      isTransitioning.current = true;
      setChaosEnabled(true);

      if (prefersReducedMotion) {
        setActiveIndex(wrapped);
        progress.set(1);
        isTransitioning.current = false;
        return;
      }

      await animate(progress, 0, { duration: EXPLODE_DURATION, ease: [0.55, 0, 1, 0.45] });
      chaosStartTime.set(time.get());
      setActiveIndex(wrapped);
      mouseTravel.set(0);
      organicControlActive.current = true;
      isTransitioning.current = false;
    },
    [prefersReducedMotion, progress, mouseTravel, time, chaosStartTime]
  );

  // --- Auto-Advance: startet erst, sobald der aktive Slide zum ersten Mal
  // fertig verschweißt ist (nicht vorher - sonst würde es die Consent-Gate-
  // /Erstentdeckungs-Phase der Katze überholen). Pausiert bei Hover, setzt
  // sich nach jeder manuellen Navigation zurück. Rekursion über eine Ref
  // (statt sich selbst referenzierendem useCallback), da setTimeout-basierte
  // Selbst-Terminierung sonst vom Hooks-Linter als unsicher markiert wird.
  const scheduleAutoAdvanceRef = useRef<() => void>(() => {});
  useEffect(() => {
    scheduleAutoAdvanceRef.current = () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = setTimeout(() => {
        if (!hoveringRef.current) {
          goToSlide(activeIndexRef.current + 1);
        }
        scheduleAutoAdvanceRef.current();
      }, AUTO_ADVANCE_MS);
    };
  }, [goToSlide]);

  useMotionValueEvent(progress, "change", (v) => {
    if (prefersReducedMotion || autoAdvanceStarted.current) return;
    if (v >= 0.995) {
      autoAdvanceStarted.current = true;
      scheduleAutoAdvanceRef.current();
    }
  });

  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, []);

  function handleManualNav(nextIndex: number) {
    goToSlide(nextIndex);
    if (autoAdvanceStarted.current) scheduleAutoAdvanceRef.current();
  }

  const slide = HERO_SLIDES[activeIndex];
  const textInitial = prefersReducedMotion ? {} : { opacity: 0, y: 12 };
  const textAnimate = prefersReducedMotion ? {} : { opacity: 1, y: 0 };
  const textExit = prefersReducedMotion ? {} : { opacity: 0, y: -8 };

  return (
    <div
      className="contents"
      onMouseEnter={() => {
        hoveringRef.current = true;
      }}
      onMouseLeave={() => {
        hoveringRef.current = false;
      }}
    >
      <div className="mx-auto grid w-full max-w-7xl items-stretch gap-8 md:grid-cols-[1fr_1.3fr] md:gap-4">
        <div className="relative z-10 flex h-full flex-col items-center justify-center text-center md:justify-end md:pb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={textInitial}
              animate={textAnimate}
              exit={textExit}
              transition={{ duration: 0.45 }}
            >
              <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-accent-warm">
                {slide.eyebrow}
              </p>
              <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
                {slide.headingLines.map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < slide.headingLines.length - 1 && <br />}
                  </span>
                ))}
              </h1>
              <p className="mt-6 max-w-md text-lg text-foreground-muted">{slide.paragraph}</p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Link
                  href="/konfigurator"
                  onClick={() => trackEvent("cta_start_configurator", { location: "hero", slide: slide.id })}
                  className="rounded-full bg-accent-warm px-7 py-3 font-medium text-background transition-transform hover:scale-[1.03] focus-visible:scale-[1.03]"
                >
                  Jetzt gestalten
                </Link>
                <a
                  href="#so-funktionierts"
                  className="rounded-full border border-border-subtle px-7 py-3 font-medium text-foreground transition-colors hover:border-accent"
                >
                  Wie es funktioniert
                </a>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="relative mx-auto w-full max-w-2xl">
          <LowPolyMesh
            facets={slide.facets}
            viewBox={slide.viewBox}
            center={slide.center}
            scatterDistance={slide.scatterDistance}
            chaosEnabled={chaosEnabled}
            time={time}
            chaosStartTime={chaosStartTime}
            progress={progress}
            pointerX={pointerX}
            pointerY={pointerY}
            ariaLabel={slide.ariaLabel}
            className="w-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
          />
        </div>
      </div>

      <button
        type="button"
        aria-label="Vorheriges Motiv"
        onClick={() => handleManualNav(activeIndex - 1)}
        className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full p-3 text-foreground opacity-40 transition-opacity hover:opacity-100 focus-visible:opacity-100 md:left-6"
      >
        <ArrowIcon direction="left" />
      </button>
      <button
        type="button"
        aria-label="Nächstes Motiv"
        onClick={() => handleManualNav(activeIndex + 1)}
        className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full p-3 text-foreground opacity-40 transition-opacity hover:opacity-100 focus-visible:opacity-100 md:right-6"
      >
        <ArrowIcon direction="right" />
      </button>

      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2 md:bottom-10">
        {HERO_SLIDES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-label={`Motiv ${i + 1} von ${HERO_SLIDES.length}`}
            aria-current={i === activeIndex}
            onClick={() => handleManualNav(i)}
            className={`h-2 rounded-full transition-all ${
              i === activeIndex ? "w-6 bg-accent-warm" : "w-2 bg-foreground-muted/40 hover:bg-foreground-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
