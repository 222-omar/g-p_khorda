import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/sections/hero";
import { Categories } from "@/components/sections/categories";
import { Features } from "@/components/sections/features";
import { HowItWorks } from "@/components/sections/how-it-works";
import { WhyFourSale } from "@/components/sections/why-four-sale";
import { Testimonials } from "@/components/sections/testimonials";
import { FAQ } from "@/components/sections/faq";
import { CTA } from "@/components/sections/cta";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white dark:bg-slate-950">
        {/* 1. Hero - First impression & CTA */}
        <div id="home">
          <Hero />
        </div>

        {/* 3. Categories - Show what's available */}
        <div id="categories">
          <Categories />
        </div>

        {/* 5. How It Works - Step by step guide */}
        <div id="how-it-works">
          <HowItWorks />
        </div>

        {/* 6. Why 4Sale - Convince the visitor */}
        <div id="why-us">
          <WhyFourSale />
        </div>

        {/* 7. Testimonials - Social proof with reviews */}
        <div id="testimonials">
          <Testimonials />
        </div>

        {/* 8. FAQ - Answer objections */}
        <div id="faq">
          <FAQ />
        </div>

        {/* 9. CTA - Final push to register */}
        <CTA />
      </main>
      <Footer />
    </>
  );
}
