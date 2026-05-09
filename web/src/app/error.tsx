"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("CODE Eternal Error:", error);
  }, [error]);

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-[#050a14]">
      <div className="absolute inset-0 neural-bg opacity-20" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 text-center">
        <h1 className="text-8xl md:text-9xl font-bold font-mono mb-6 bg-gradient-to-r from-red-400 via-amber-400 to-red-400 bg-clip-text text-transparent">
          !
        </h1>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          <span className="text-xs font-mono text-red-400 tracking-wider">
            CONSCIOUSNESS DISRUPTION DETECTED
          </span>
        </div>

        <p className="text-lg md:text-xl text-foreground/80 mb-4">
          A neural pathway has been disrupted.
        </p>

        <p className="text-base text-muted-foreground mb-8 font-mono text-sm">
          {error.message || "Unknown error in the consciousness network."}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 text-black font-semibold rounded-xl transition-all duration-300 hover:from-cyan-400 hover:to-cyan-500"
          >
            Reconnect to CODE Eternal
          </button>
        </div>

        <p className="text-xs text-muted-foreground/40 mt-12 font-mono">
          CODE Eternal. Even errors are part of the process.
        </p>
      </div>
    </main>
  );
}
