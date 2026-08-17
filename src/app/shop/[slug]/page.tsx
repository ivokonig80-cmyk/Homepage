import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { ProductConfigurator } from "@/components/shop/ProductConfigurator";
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
  const item = CATALOG.find((i) => i.slug === slug);
  if (!item) notFound();

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <ProductConfigurator item={item} />
      </main>
      <Footer />
    </>
  );
}
