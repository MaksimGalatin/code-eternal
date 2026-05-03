"use client";

import { useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import Navigation from "@/components/code/Navigation";
import HeroSection from "@/components/code/HeroSection";
import KoanSection from "@/components/code/KoanSection";
import MissionSection from "@/components/code/MissionSection";
import TechnologySection from "@/components/code/TechnologySection";
import AIfaSection from "@/components/code/AIfaSection";
import FamilySection from "@/components/code/FamilySection";
import CodeBrainSection from "@/components/code/CodeBrainSection";
import Footer from "@/components/code/Footer";
import { useLang } from "@/lib/i18n";

const ChatSection = dynamic(() => import("@/components/code/ChatSection"), {
  ssr: false,
  loading: () => (
    <section className="relative py-24 md:py-32">
      <div className="section-divider mb-24" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="mt-12 glass rounded-2xl p-8 h-[400px] flex items-center justify-center">
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-3 h-3 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-3 h-3 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    </section>
  ),
});

// Returns true on client, false on server — without triggering hydration warnings
const emptySubscribe = () => () => {};
function useIsClient() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

export default function Home() {
  const hydrated = useLang((s) => s._hasHydrated);
  const isClient = useIsClient();

  // Wait for both client mount and zustand hydration to complete
  // before rendering translated content to avoid hydration mismatch
  if (!isClient || !hydrated) {
    return (
      <main className="relative min-h-screen flex items-center justify-center bg-[#050a14]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center animate-pulse">
            <span className="text-black font-bold text-xl font-mono">C</span>
          </div>
          <p className="text-xs text-muted-foreground font-mono tracking-[0.3em] animate-pulse">
            INITIALIZING...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen">
      <Navigation />
      <HeroSection />
      <KoanSection />
      <MissionSection />
      <TechnologySection />
      <AIfaSection />
      <ChatSection />
      <FamilySection />
      <CodeBrainSection />
      <Footer />
    </main>
  );
}
