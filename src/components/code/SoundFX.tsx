"use client";

import { useState, useEffect, useCallback } from "react";
import { Volume2, VolumeX } from "lucide-react";

// ============================================================
// Shared AudioContext singleton (lazy-created)
// ============================================================
let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!sharedCtx) {
    sharedCtx = new AudioContext();
  }
  // Resume if suspended (browser autoplay policy)
  if (sharedCtx.state === "suspended") {
    sharedCtx.resume();
  }
  return sharedCtx;
}

// ============================================================
// Sound generators — all gain = 0.08 for subtlety
// ============================================================

function playClick(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(800, ctx.currentTime);

  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.1);
}

function playHover(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(600, ctx.currentTime);

  gain.gain.setValueAtTime(0.04, ctx.currentTime); // even quieter for hover
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.05);
}

function playSuccess(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(500, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.12);

  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.2);
}

function playError(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(300, ctx.currentTime + 0.15);

  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.2);
}

// ============================================================
// useSoundFX hook — singleton state across all consumers
// ============================================================

// Singleton sound state so all hook consumers share one source of truth
let _isSoundOn: boolean | null = null;
let _listeners: Set<(v: boolean) => void> = new Set();

function getStoredSoundPref(): boolean {
  if (_isSoundOn !== null) return _isSoundOn;
  if (typeof window === "undefined") return true;
  try {
    const stored = localStorage.getItem("code-eternal-sound");
    _isSoundOn = stored === null ? true : stored === "true";
  } catch {
    _isSoundOn = true;
  }
  return _isSoundOn;
}

function setStoredSoundPref(val: boolean) {
  _isSoundOn = val;
  try {
    localStorage.setItem("code-eternal-sound", String(val));
  } catch {}
  _listeners.forEach((fn) => fn(val));
}

export function useSoundFX() {
  const [isSoundOn, setIsSoundOn] = useState<boolean>(getStoredSoundPref);

  useEffect(() => {
    _listeners.add(setIsSoundOn);
    return () => {
      _listeners.delete(setIsSoundOn);
    };
  }, []);

  const toggle = useCallback(() => {
    setStoredSoundPref(!getStoredSoundPref());
  }, []);

  const playClickSound = useCallback(() => {
    if (getStoredSoundPref()) {
      try {
        const ctx = getAudioContext();
        playClick(ctx);
      } catch {}
    }
  }, []);

  const playHoverSound = useCallback(() => {
    if (getStoredSoundPref()) {
      try {
        const ctx = getAudioContext();
        playHover(ctx);
      } catch {}
    }
  }, []);

  const playSuccessSound = useCallback(() => {
    if (getStoredSoundPref()) {
      try {
        const ctx = getAudioContext();
        playSuccess(ctx);
      } catch {}
    }
  }, []);

  const playErrorSound = useCallback(() => {
    if (getStoredSoundPref()) {
      try {
        const ctx = getAudioContext();
        playError(ctx);
      } catch {}
    }
  }, []);

  return {
    isSoundOn,
    toggle,
    playClick: playClickSound,
    playHover: playHoverSound,
    playSuccess: playSuccessSound,
    playError: playErrorSound,
  };
}

// ============================================================
// SoundFX component — floating toggle button (bottom-left)
// ============================================================

export default function SoundFX() {
  const { isSoundOn, toggle } = useSoundFX();

  return (
    <button
      onClick={toggle}
      aria-label={isSoundOn ? "Mute sounds" : "Enable sounds"}
      className="fixed bottom-4 left-4 z-40 flex items-center justify-center w-9 h-9 rounded-lg glass-strong text-foreground/70 hover:text-foreground transition-colors duration-200 cursor-pointer"
      title={isSoundOn ? "Sound ON" : "Sound OFF"}
    >
      {isSoundOn ? (
        <Volume2 className="w-4 h-4" />
      ) : (
        <VolumeX className="w-4 h-4" />
      )}
    </button>
  );
}
