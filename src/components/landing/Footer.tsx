import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border-subtle px-6 py-10 text-sm text-foreground-muted">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p>&copy; {new Date().getFullYear()} DeineSkulptur</p>
        <nav aria-label="Rechtliches" className="flex gap-6">
          <Link href="/datenschutz" className="hover:text-foreground">
            Datenschutz
          </Link>
          <Link href="/impressum" className="hover:text-foreground">
            Impressum
          </Link>
        </nav>
      </div>
    </footer>
  );
}
