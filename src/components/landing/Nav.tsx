import Link from "next/link";

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border-subtle/60 bg-background/80 backdrop-blur">
      <nav
        aria-label="Hauptnavigation"
        className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4"
      >
        <Link href="/" className="font-display text-lg font-semibold tracking-tight">
          Deine<span className="text-accent-warm">Skulptur</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/shop"
            className="text-sm font-medium text-foreground-muted transition-colors hover:text-foreground focus-visible:text-foreground"
          >
            Shop
          </Link>
          <Link
            href="/konfigurator"
            className="rounded-full border border-accent-warm/60 px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent-warm hover:text-background focus-visible:bg-accent-warm focus-visible:text-background"
          >
            Jetzt gestalten
          </Link>
        </div>
      </nav>
    </header>
  );
}
