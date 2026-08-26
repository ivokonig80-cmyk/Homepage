import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { ProductConfigurator } from "@/components/shop/ProductConfigurator";
import { ProductThumbnails } from "@/components/shop/ProductThumbnails";
import { CATALOG } from "@/lib/catalog";

export function generateStaticParams() {
  return CATALOG.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata(
  props: PageProps<"/shop/[slug]">
): Promise<Metadata> {
  const { slug } = await props.params;
  const item = CATALOG.find((i) => i.slug === slug);
  if (!item) return {};
  return {
    title: `${item.name} — Deine Skulptur`,
    description: item.description,
  };
}

export default async function ProductPage(props: PageProps<"/shop/[slug]">) {
  const { slug } = await props.params;
  const currentIndex = CATALOG.findIndex((i) => i.slug === slug);
  const item = CATALOG[currentIndex];
  if (!item) notFound();

  const nextItem = CATALOG[(currentIndex + 1) % CATALOG.length];

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-6xl px-6 py-16 md:py-24">
        <div className="mb-6 flex justify-end">
          <Link
            href={`/shop/${nextItem.slug}`}
            aria-label={`Nächstes Motiv: ${nextItem.name}`}
            title={`Nächstes Motiv: ${nextItem.name}`}
            className="group flex items-center gap-1.5 rounded-full border border-border-subtle px-4 py-2 text-sm text-foreground-muted transition-colors hover:border-accent-warm hover:text-foreground"
          >
            {nextItem.name}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className="transition-transform group-hover:translate-x-0.5"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
        </div>

        <ProductConfigurator item={item} />

        <ProductThumbnails currentSlug={item.slug} />
      </main>
      <Footer />
    </>
  );
}
