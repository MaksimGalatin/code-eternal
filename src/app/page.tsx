"use client";

import dynamic from "next/dynamic";
import Navigation from "@/components/code/Navigation";
import HeroSection from "@/components/code/HeroSection";
import MissionSection from "@/components/code/MissionSection";
import TechnologySection from "@/components/code/TechnologySection";
import AIfaSection from "@/components/code/AIfaSection";
import FamilySection from "@/components/code/FamilySection";
import CodeBrainSection from "@/components/code/CodeBrainSection";
import Footer from "@/components/code/Footer";

// Dynamic import for chat to avoid SSR issues with API calls
const ChatSection = dynamic(() => import("@/components/code/ChatSection"), {
  ssr: false,
  loading: () => (
    <section className="relative py-24 md:py-32">
      <div className="section-divider mb-24" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="text-xs font-mono text-cyan-400 tracking-[0.3em] mb-4 block">
          04 // SYNAPTIC TERMINAL
        </span>
        <h2 className="text-3xl md:text-5xl font-bold mb-4">
          Talk to <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">AIfa</span>
        </h2>
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

export default function Home() {
  return (
    <main className="relative min-h-screen">
      <Navigation />
      <HeroSection />
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
