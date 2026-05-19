// Client-side trigger logic — decides when to persist a memory chunk
// Target: ~80KB of unsaved messages (keeps total payload under Irys 100KB free tier)
export const CHUNK_MAX_BYTES = 80_000;

export function getUnsavedBytes(
  msgs: { from: string; text: string }[],
  lastSavedCount: number,
): number {
  if (msgs.length <= lastSavedCount) return 0;
  return JSON.stringify(msgs.slice(lastSavedCount)).length;
}

export function shouldSaveChunk(
  msgs: { from: string; text: string }[],
  lastSavedCount: number,
): boolean {
  return getUnsavedBytes(msgs, lastSavedCount) >= CHUNK_MAX_BYTES;
}

export function hasUnsavedMessages(totalMessages: number, lastSavedCount: number): boolean {
  return totalMessages > lastSavedCount && totalMessages > 0;
}
