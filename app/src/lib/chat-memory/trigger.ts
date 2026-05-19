// Client-side trigger logic — decides when to persist a memory chunk
// Target: ~80KB of unsaved messages (keeps total payload under Irys 100KB free tier)
export const CHUNK_MAX_BYTES = 80_000;

export function shouldSaveChunk(
  msgs: { from: string; text: string }[],
  lastSavedCount: number,
): boolean {
  if (msgs.length <= lastSavedCount) return false;
  const unsaved = msgs.slice(lastSavedCount);
  return JSON.stringify(unsaved).length >= CHUNK_MAX_BYTES;
}

export function hasUnsavedMessages(totalMessages: number, lastSavedCount: number): boolean {
  return totalMessages > lastSavedCount && totalMessages > 0;
}
