// Client-side trigger logic — decides when to persist a memory chunk
export const CHUNK_SIZE = 20;

export function shouldSaveChunk(totalMessages: number, lastSavedCount: number): boolean {
  return totalMessages >= CHUNK_SIZE && totalMessages - lastSavedCount >= CHUNK_SIZE;
}

export function hasUnsavedMessages(totalMessages: number, lastSavedCount: number): boolean {
  return totalMessages > lastSavedCount && totalMessages > 0;
}
