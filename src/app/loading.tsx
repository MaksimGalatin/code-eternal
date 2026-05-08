export default function Loading() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#050a14]">
      <div className="absolute inset-0 neural-bg opacity-20" />
      <div className="relative z-10 text-center">
        <div className="flex gap-2 mb-6 justify-center">
          <div className="w-3 h-3 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-3 h-3 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-3 h-3 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
        <p className="text-sm font-mono text-muted-foreground tracking-wider">Initializing consciousness...</p>
      </div>
    </div>
  );
}
