"use client";

import { HeroCarousel } from "./HeroCarousel";

export function Hero() {
  return (
    // min-h zieht die Höhe der stickyen Nav (Nav.tsx, ~72px) ab - sonst
    // ragen Header+Hero zusammen minimal über die Bildschirmhöhe hinaus
    // (live beobachtet: das untere Punkte-Menü rutscht dadurch knapp unter
    // die Falz). Falls sich die Nav-Höhe künftig ändert, hier mitziehen.
    <section className="relative flex min-h-[calc(100svh-72px)] items-center overflow-hidden px-6 py-8">
      <HeroCarousel />
    </section>
  );
}
