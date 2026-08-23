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
import { LowPolyMesh, SharedMaterialSource } from "./LowPolyMesh";
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
 * rein aus dem aktuellen Zahlenwert abgeleitet sind). Danach wird es in den
 * universellen Materialpool absorbiert, dort verdeckt an das neue Motiv
 * übergeben und aus derselben Quelle wieder ins bisherige Chaos entlassen.
 * Der NEUE Zusammenbau ist dann wieder organisch per Mausbewegung gesteuert
 * (kein automatisches Wieder-Zusammenfügen).
 * `mouseTravel` wird beim Wechsel zurückgesetzt, damit jedes Motiv frische
 * Mausbewegung braucht statt vom bereits verbrauchten Weg des vorherigen
 * Motivs zu profitieren. Das gilt fuer JEDEN Slide gleich (auch den
 * allerersten Katzen-Slide) - `organicControlActive` ist praktisch immer
 * an, ausser waehrend der kurzen automatischen Sprengen-Animation selbst.
 */

const SCROLL_ASSEMBLE_PX = 420;
// Bewusst doppelt so groß wie ein "natürlicher" Wert - der Zusammenbau per
// Maus soll sich spürbar wie eine eigene Anstrengung anfühlen, nicht wie ein
// Nebeneffekt normaler Mausbewegung.
const MOUSE_ASSEMBLE_PX = 1120;
const AUTO_ADVANCE_MS = 7000;
const EXPLODE_DURATION = 0.9;
// Alt und Neu werden nur im dichtesten, neutral überlagerten Materialpool
// gekreuzt. Der kurze Fade versteckt dort den Identitätswechsel; Konvergenz
// und Austritt aus der Quelle haben eigene, längere Bewegungsphasen.
const CROSSFADE_DURATION = 0.35;
const SOURCE_CONVERGE_DURATION = 0.68;
const SOURCE_EMERGE_DURATION = 0.68;
// Sobald die maus-/scroll-getriebene Montage diese Schwelle erreicht,
// uebernimmt eine garantiert weiche, fest getimte Animation den letzten
// Rest bis progress=1 (siehe weldTakeover unten) - der rohe Mauswert
// selbst kann in einem einzigen Frame ueber das ganze Nahtausblenden-/
// Vollbild-Fenster hinwegspringen (abhaengig von Mausgeschwindigkeit),
// was den finalen "Verschweissen"-Moment als abrupten Sprung statt als
// Uebergang wirken liess. Schwelle deutlich VOR dem Nahtstellen-Ausblenden
// (0.92) gesetzt, nicht knapp davor - bei einer knappen Schwelle war die
// Montage oft schon 98%+ fertig, wenn die Uebernahme startete, wodurch die
// "garantiert weiche" Animation kaum noch sichtbare Strecke zum Gleiten
// hatte und der Effekt trotzdem wie ein Sprung wirkte. Mit 0.75 bleibt
// genug Weg fuer ein spuerbares, absichtliches Eingleiten. easeInOut statt
// eines am Start steilen Easings, damit der UEBERGANG selbst (roher
// Mauswert -> Animation) keinen Ruck erzeugt, da die Animation sanft statt
// mit hoher Anfangsgeschwindigkeit einsetzt.
const WELD_TAKEOVER_THRESHOLD = 0.75;
const WELD_TAKEOVER_DURATION = 0.75;
const subscribeHydration = () => () => {};
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

interface SourceStageBounds {
  left: number;
  top: number;
  width: number;
  height: number;
  fallDistance: number;
  restMinX: number;
  restMaxX: number;
  sourceMinY: number;
  sourceMaxY: number;
}

function smoothEnvironmentStep(value: number): number {
  const clamped = Math.min(1, Math.max(0, value));
  return clamped * clamped * (3 - 2 * clamped);
}

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
  const hasHydrated = useSyncExternalStore(
    subscribeHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot
  );
  const shouldReduceMotion = hasHydrated && prefersReducedMotion;
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

  // Vormotiv, das bis zum verdeckten Handoff im universellen Pool erhalten
  // bleibt - null = kein Übergangs-Mesh aktiv.
  const [leavingSlideIndex, setLeavingSlideIndex] = useState<number | null>(null);
  // Deckkraft dieses Overlays; wird innerhalb des Pool-Handoffs animiert.
  const leavingOpacity = useMotionValue(1);
  const activeMeshOpacity = useMotionValue(1);

  const progress = useMotionValue(0);
  // 0 = bestehendes modellspezifisches Chaos, 1 = dichter universeller
  // Materialpool. Dieses MotionValue gehoert dem Hero und wird von altem,
  // neuem und neutralem Quell-Layer gemeinsam gelesen.
  const sourceProgress = useMotionValue(0);
  // SSR/erster Client-Render starten deterministisch bei 0. Erst nach der
  // Hydration schreibt der reale Seiten-Scroll in diese Umwelteinwirkung.
  const fallProgress = useMotionValue(0);
  const fallDirection = useMotionValue(0);
  const returnSourcePresence = useMotionValue(0);
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
  // 1 = echter Zusammenbau, 0 = Rueckwaerts-Sprengen. `progress` allein
  // enthaelt keine Richtungsinformation; diese MotionValue verhindert,
  // dass der Welding-Prototyp beim Explodieren rueckwaerts aufblitzt.
  const assemblyDirection = useMotionValue(1);

  const organicControlActive = useRef(true);
  const isTransitioning = useRef(false);
  const autoAdvanceStarted = useRef(false);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoveringRef = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const previousScrollY = useRef(0);
  const scrollEnvironment = useRef({ start: 100, rest: 1000 });
  const [sourceStageBounds, setSourceStageBounds] = useState<SourceStageBounds | null>(null);

  // --- Organische Erstmontage (nur für den allerersten Slide beim Laden) -
  // exakt das bisherige LowPolyCat-Verhalten, nur jetzt hier in der
  // Karussell-Ebene, da `progress` slide-übergreifend geteilt wird.
  const { scrollY } = useScroll();
  const scrollAssemble = useTransform(scrollY, [0, SCROLL_ASSEMBLE_PX], [0, 1]);
  const mouseTravel = useMotionValue(0);
  const mouseAssemble = useTransform(mouseTravel, [0, MOUSE_ASSEMBLE_PX], [0, 1]);
  const realFragmentVisibility = useTransform(fallProgress, [0, 0.08, 0.22], [1, 0.84, 0]);
  const leavingMeshOpacity = useTransform(
    [leavingOpacity, realFragmentVisibility],
    (values: number[]) => values[0] * values[1]
  );
  const visibleActiveMeshOpacity = useTransform(
    [activeMeshOpacity, realFragmentVisibility],
    (values: number[]) => values[0] * values[1]
  );

  // Die eine bestehende Quelle wird nach der Hydration exakt ueber ihrer
  // Hero-Buehne fixiert. So kann sie rein visuell durch spaetere Sektionen
  // fallen, ohne DOM-Knoten umzuziehen, Dokumenthoehe zu veraendern oder
  // eine zweite Quelle zu rendern.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const updateFallProgress = (latestScroll: number) => {
      const { start, rest } = scrollEnvironment.current;
      const raw = (latestScroll - start) / Math.max(1, rest - start);
      const direction =
        latestScroll === previousScrollY.current
          ? 0
          : latestScroll > previousScrollY.current
            ? 1
            : -1;
      const nextFallProgress = shouldReduceMotion ? 0 : smoothEnvironmentStep(raw);
      fallDirection.set(direction);
      if (shouldReduceMotion || (direction > 0 && nextFallProgress > 0.02)) {
        returnSourcePresence.set(0);
      } else if (direction < 0 && nextFallProgress < 0.16) {
        returnSourcePresence.set(0.32);
      }
      previousScrollY.current = latestScroll;
      fallProgress.set(nextFallProgress);
    };

    const measure = () => {
      const rect = stage.getBoundingClientRect();
      const documentTop = rect.top + window.scrollY;
      const unitScale = Math.min(rect.width / 240, rect.height / 300);
      const letterboxY = (rect.height - 300 * unitScale) / 2;
      const sourceCenterY = documentTop + letterboxY + 177 * unitScale;
      const restingCenterY = window.innerHeight * 0.84;
      const viewportInset = Math.min(28, window.innerWidth * 0.035);
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const hero = stage.closest("section");
      const heroHeight = hero?.getBoundingClientRect().height ?? window.innerHeight;

      scrollEnvironment.current = {
        start: Math.min(heroHeight * 0.12, window.innerHeight * 0.12),
        rest: Math.max(heroHeight * 0.45, maxScroll * 0.92),
      };
      setSourceStageBounds({
        left: rect.left,
        top: documentTop,
        width: rect.width,
        height: rect.height,
        // Auch auf dem schmalen Layout, wo die Hero-Buehne bereits tief
        // sitzt, bleibt eine kleine sichtbare gemeinsame Fallstrecke.
        fallDistance: Math.max(
          14,
          (restingCenterY - sourceCenterY) / Math.max(0.001, unitScale)
        ),
        restMinX: (viewportInset - rect.left) / Math.max(0.001, unitScale),
        restMaxX:
          (window.innerWidth - viewportInset - rect.left) / Math.max(0.001, unitScale),
        sourceMinY:
          (viewportInset - documentTop - letterboxY) / Math.max(0.001, unitScale),
        sourceMaxY:
          (window.innerHeight - viewportInset - documentTop - letterboxY) /
          Math.max(0.001, unitScale),
      });
      updateFallProgress(window.scrollY);
    };

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(stage);
    window.addEventListener("resize", measure);
    const unsubscribeScroll = scrollY.on("change", updateFallProgress);
    return () => {
      unsubscribeScroll();
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [fallDirection, fallProgress, returnSourcePresence, scrollY, shouldReduceMotion]);

  useAnimationFrame(() => {
    if (
      !organicControlActive.current ||
      shouldReduceMotion ||
      !consentResolved ||
      fallProgress.get() > 0.055
    ) return;
    // Scrollen darf die urspruengliche Erstmontage nur im unmittelbaren
    // Hero-Bereich unterstuetzen. Noch bevor Gravity die Interaktion ganz
    // sperrt, wird dieser Eingang weich ausgeblendet; sonst koennte der alte
    // absolute scrollY-Wert auf dem Weg nach unten unbemerkt bis zum Welding-
    // Takeover anwachsen und das Motiv fernab des Heros fertig montieren.
    const scrollAssemblyWeight =
      1 - smoothEnvironmentStep(fallProgress.get() / 0.04);
    const current = Math.max(
      scrollAssemble.get() * scrollAssemblyWeight,
      mouseAssemble.get()
    );
    if (current >= WELD_TAKEOVER_THRESHOLD && progress.get() < 1) {
      organicControlActive.current = false;
      animate(progress, 1, { duration: WELD_TAKEOVER_DURATION, ease: "easeInOut" }).then(() => {
        organicControlActive.current = true;
      });
      return;
    }
    if (current > progress.get()) progress.set(current);
  });

  useEffect(() => {
    if (shouldReduceMotion || !consentResolved) return;
    let last: { x: number; y: number } | null = null;

    function handlePointerMove(e: PointerEvent) {
      pointerX.set(e.clientX / window.innerWidth - 0.5);
      pointerY.set(e.clientY / window.innerHeight - 0.5);
      if (organicControlActive.current && fallProgress.get() <= 0.055 && last) {
        const delta = Math.hypot(e.clientX - last.x, e.clientY - last.y);
        mouseTravel.set(mouseTravel.get() + delta);
        if (returnSourcePresence.get() > 0) {
          returnSourcePresence.set(Math.max(0, returnSourcePresence.get() - delta / 900));
        }
      }
      last = { x: e.clientX, y: e.clientY };
    }

    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [
    shouldReduceMotion,
    consentResolved,
    pointerX,
    pointerY,
    mouseTravel,
    fallProgress,
    returnSourcePresence,
  ]);

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
      assemblyDirection.set(0);
      setChaosEnabled(true);
      sourceProgress.set(0);
      activeMeshOpacity.set(1);
      leavingOpacity.set(1);

      if (shouldReduceMotion) {
        setLeavingSlideIndex(null);
        setActiveIndex(wrapped);
        progress.set(1);
        sourceProgress.set(0);
        returnSourcePresence.set(0);
        isTransitioning.current = false;
        return;
      }

      // Defensive Bereinigung eines eventuell noch vorhandenen Vormotivs.
      // Die Interaktionssperre verhindert regulär überlappende Wechsel.
      setLeavingSlideIndex(null);

      await animate(progress, 0, { duration: EXPLODE_DURATION, ease: [0.55, 0, 1, 0.45] });
      chaosStartTime.set(time.get());
      // Text und Dot wechseln weiterhin exakt am bisherigen Zeitpunkt: nach
      // der bestehenden Explosion. Das neue Mesh ist waehrend der folgenden
      // Absorption jedoch unsichtbar; nur das alte reale Facettenfeld reist
      // als leaving-Layer weiter in die universelle Quelle.
      activeMeshOpacity.set(0);
      setLeavingSlideIndex(activeIndexRef.current);
      setActiveIndex(wrapped);
      mouseTravel.set(0);

      await animate(sourceProgress, 1, {
        duration: SOURCE_CONVERGE_DURATION,
        ease: [0.45, 0, 0.35, 1],
      });

      // Erst im dichtesten, neutral ueberlagerten Pool werden Alt- und
      // Neumotiv uebergeben. Beide realen Meshes sind hier stark gedimmt;
      // die Form-/Farbidentitaet wechselt somit innerhalb derselben Quelle.
      await Promise.all([
        animate(leavingOpacity, 0, {
          duration: CROSSFADE_DURATION,
          ease: "easeOut",
        }),
        animate(activeMeshOpacity, 1, {
          duration: CROSSFADE_DURATION,
          ease: "easeIn",
        }),
      ]);
      setLeavingSlideIndex(null);

      // Das neue reale Mesh verlaesst dieselben Quell-Slots und landet wieder
      // im unveraenderten bisherigen Chaos. Erst danach uebernimmt erneut die
      // bestehende maus-/scrollgesteuerte Montage.
      await animate(sourceProgress, 0, {
        duration: SOURCE_EMERGE_DURATION,
        ease: [0.45, 0, 0.35, 1],
      });
      returnSourcePresence.set(0);
      assemblyDirection.set(1);
      organicControlActive.current = true;
      isTransitioning.current = false;
    },
    [
      shouldReduceMotion,
      progress,
      mouseTravel,
      time,
      chaosStartTime,
      assemblyDirection,
      sourceProgress,
      returnSourcePresence,
      activeMeshOpacity,
      leavingOpacity,
    ]
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
    if (shouldReduceMotion || autoAdvanceStarted.current) return;
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
  const textInitial = shouldReduceMotion ? {} : { opacity: 0, y: 12 };
  const textAnimate = shouldReduceMotion ? {} : { opacity: 1, y: 0 };
  const textExit = shouldReduceMotion ? {} : { opacity: 0, y: -8 };

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
        <div className="relative z-30 flex h-full flex-col items-center justify-center text-center md:items-start md:justify-end md:pb-6 md:text-left">
          <AnimatePresence mode="sync">
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
              <div className="mt-8 flex flex-wrap justify-center gap-4 md:justify-start">
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

        {/* Feste Seitenverhaeltnis-Box statt der frueheren, vom jeweiligen
            Foto-Seitenverhaeltnis abhaengigen Hoehe (240x255 bei der Katze
            vs. 827x1300 beim Hocker) - sonst aenderte sich die Hoehe der
            gesamten Hero-Section pro Slide, und Text/CTA-Buttons konnten je
            nach Motiv unter die Falz rutschen. Das Foto/Mesh wird darin
            zentriert eingepasst (SVG-Default "meet", KEIN Zuschneiden/
            Verzerren) - je nach eigenem Seitenverhaeltnis mit etwas
            Leerraum oben/unten oder links/rechts, aber die Box selbst ist
            bei jedem Slide exakt gleich gross. Der Chaos-Streu-/Treib-
            Bereich ignoriert diese Box ohnehin (overflow: visible). */}
        <div
          ref={stageRef}
          className="relative mx-auto aspect-[4/5]"
          // 65svh Hoehe * 4/5 = 52svh Breite. Nur die Breite festlegen,
          // damit `aspect-ratio` die Hoehe wirklich ableitet; die fruehere
          // Kombination aus w-full + max-height stauchte die Box auf grossen
          // Screens fast quadratisch und brach die Chaos-Screen-Normalisierung.
          style={{ width: "min(100%, 52svh, 42rem)" }}
        >
          {/* Vormotiv für Absorption und verdeckten Pool-Handoff. Es teilt
              Zeit, progress und sourceProgress mit dem neuen Mesh, besitzt
              aber eigene SVG-ID-Präfixe, damit die gleichzeitig gerenderten
              Filter und ClipPaths nicht kollidieren. */}
          {leavingSlideIndex !== null && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ opacity: leavingMeshOpacity }}
            >
              <LowPolyMesh
                facets={HERO_SLIDES[leavingSlideIndex].facets}
                viewBox={HERO_SLIDES[leavingSlideIndex].viewBox}
                center={HERO_SLIDES[leavingSlideIndex].center}
                scatterDistance={HERO_SLIDES[leavingSlideIndex].scatterDistance}
                chaosEnabled={chaosEnabled}
                time={time}
                chaosStartTime={chaosStartTime}
                progress={progress}
                sourceProgress={sourceProgress}
                assemblyDirection={assemblyDirection}
                pointerX={pointerX}
                pointerY={pointerY}
                ariaLabel={HERO_SLIDES[leavingSlideIndex].ariaLabel}
                imageUrl={HERO_SLIDES[leavingSlideIndex].imageUrl}
                tintColor={HERO_SLIDES[leavingSlideIndex].tintColor}
                tintDarkMix={HERO_SLIDES[leavingSlideIndex].tintDarkMix}
                tintLightMix={HERO_SLIDES[leavingSlideIndex].tintLightMix}
                tintFilterId="photo-tint-leaving"
                clipIdPrefix="hero-leaving"
                className="h-full w-full"
              />
            </motion.div>
          )}
          <motion.div
            className="relative z-10 h-full w-full"
            style={{ opacity: visibleActiveMeshOpacity }}
          >
            <LowPolyMesh
              facets={slide.facets}
              viewBox={slide.viewBox}
              center={slide.center}
              scatterDistance={slide.scatterDistance}
              chaosEnabled={chaosEnabled}
              time={time}
              chaosStartTime={chaosStartTime}
              progress={progress}
              sourceProgress={sourceProgress}
              assemblyDirection={assemblyDirection}
              pointerX={pointerX}
              pointerY={pointerY}
              ariaLabel={slide.ariaLabel}
              imageUrl={slide.imageUrl}
              tintColor={slide.tintColor}
              tintDarkMix={slide.tintDarkMix}
              tintLightMix={slide.tintLightMix}
              clipIdPrefix="hero-active"
              className="h-full w-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
            />
          </motion.div>
          <SharedMaterialSource
            time={time}
            sourceProgress={sourceProgress}
            fallProgress={fallProgress}
            fallDirection={fallDirection}
            returnPresence={returnSourcePresence}
            pointerX={pointerX}
            pointerY={pointerY}
            fixedBounds={sourceStageBounds ?? undefined}
            className={
              sourceStageBounds
                ? "pointer-events-none fixed z-20"
                : "pointer-events-none absolute inset-0 z-20 h-full w-full"
            }
          />
        </div>
      </div>

      <button
        type="button"
        aria-label="Vorheriges Motiv"
        onClick={() => handleManualNav(activeIndex - 1)}
        className="absolute left-2 top-1/2 z-30 -translate-y-1/2 rounded-full p-3 text-foreground opacity-40 transition-opacity hover:opacity-100 focus-visible:opacity-100 md:left-6"
      >
        <ArrowIcon direction="left" />
      </button>
      <button
        type="button"
        aria-label="Nächstes Motiv"
        onClick={() => handleManualNav(activeIndex + 1)}
        className="absolute right-2 top-1/2 z-30 -translate-y-1/2 rounded-full p-3 text-foreground opacity-40 transition-opacity hover:opacity-100 focus-visible:opacity-100 md:right-6"
      >
        <ArrowIcon direction="right" />
      </button>

      <div className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 gap-2 md:bottom-10">
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
