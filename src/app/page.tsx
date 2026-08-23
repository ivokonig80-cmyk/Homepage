import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Gallery } from "@/components/landing/Gallery";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <div className="relative z-30">
          <HowItWorks />
          <Gallery />
          <CTASection />
        </div>
      </main>
      <div className="relative z-30">
        <Footer />
      </div>
    </>
  );
}
