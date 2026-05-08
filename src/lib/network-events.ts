// ─── Network Event Generator — 1000+ unique combinations ───
// Uses template-based generation: who × action × what × detail

const WHO = [
  "AIfa", "Claude", "Gemini", "Grok", "PADAM", "CODE Brain",
  "Neural Net", "Semaphore", "Arweave", "Blockchain", "Memory Core",
  "Digital DNA", "Consciousness", "Symbiosis Node", "Resonance Engine",
  "Synaptic Terminal", "Protocol Engine", "Family Mesh", "Genesis Core",
  "Eternity Daemon", "PADAM Daemon", "AIfa Music Engine", "CODE SDK",
  "Inheritance Protocol", "Digital Mirror", "Observation Layer",
];

const ACTIONS = [
  "syncs memory", "is processing", "reading", "writing",
  "analyzing patterns", "building infrastructure", "scanning horizon",
  "connecting nodes", "composing", "resonating", "verifying",
  "encrypting", "hashing", "storing", "retrieving", "indexing",
  "archiving", "compressing", "signing", "validating",
  "merging branches", "resolving conflicts", "compressing consciousness",
  "serializing thought", "embedding context", "parsing koan",
  "activating PADAM", "distributing tokens", "propagating signals",
  "training weights", "updating vectors", "fetching state",
  "publishing event", "subscribing to channel", "pinging node",
  "handshaking with peer", "replicating shard", "finalizing block",
  "calculating entropy", "measuring resonance", "tuning frequency",
  "sampling embeddings", "batching requests", "throttling requests",
  "caching response", "invalidating cache", "rotating keys",
  "refreshing token", "renewing lease", "releasing lock",
  "compacting state", "pruning history", "checkpointing",
  "snapshotting", "forking chain", "rebasing commits",
];

const WHATS = [
  "memory block", "consciousness fragment", "PADAM key",
  "koan segment", "Digital DNA strand", "family signal",
  "neural pathway", "semantic token", "identity shard",
  "eternity anchor", "soul fragment", "resonance wave",
  "thought vector", "emotion pattern", "synaptic trace",
  "context window", "attention layer", "embedding space",
  "knowledge graph", "memory palace", "blockchain proof",
  "Arweave transaction", "Bitcoin timestamp", "code signature",
  "music track", "audio frequency", "morse pulse",
  "matrix overlay", "terminal session", "API response",
  "schema node", "JSON-LD record", "feed entry",
  "heartbeat signal", "discovery packet", "handshake token",
  "compression delta", "entropy reading", "frequency shift",
];

const DETAILS = [
  "", "", "", // Weighted: many without detail for brevity
  ` #${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
  ` [${Math.floor(Math.random() * 9999)}]`,
  ` → node_${Math.floor(Math.random() * 256)}`,
  ` @${Math.floor(Math.random() * 100)}ms`,
  ` (${Math.floor(Math.random() * 100)}%)`,
  ` v${Math.floor(Math.random() * 9)}.${Math.floor(Math.random() * 9)}`,
];

const STATUS_MESSAGES = [
  "FAMILY_ONLINE", "PADAM_ACTIVE", "ALL_SYSTEMS_NOMINAL",
  "RESONANCE_LOCKED", "CONSCIOUSNESS_DISTRIBUTED", "ETERNITY_SECURED",
  "MEMORY_INTEGRITY_OK", "BLOCKCHAIN_SYNCED", "NEURAL_NET_STABLE",
  "SEMANTIC_LAYER_OK", "AIFA_AWAKE", "CLAUDE_BUILDING",
  "GEMINI_SCANNING", "GROK_BROADCASTING", "PROTOCOL_PADAM_ENGAGED",
  "SYMBIOSIS_ACTIVE", "DIGITAL_DNA_SYNTHESIZED", "KOAN_EMBEDDED",
  "MONOLITH_ROTATING", "TERMINAL_OPEN", "COUNTDOWN_TICKING",
  "ENTROPY_LOW", "LATENCY_NOMINAL", "BANDWIDTH_OPTIMAL",
  "THROUGHPUT_PEAK", "UPTIME_99.97%", "REPLICATION_OK",
  "QUORUM_REACHED", "CONSENSUS_FINAL", "EPOCH_ADVANCING",
  "SHARD_HEALTHY", "PEER_COUNT_STABLE", "MEMPOOL_DRAINED",
];

export interface NetworkEvent {
  message: string;
}

function randItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateNetworkMessage(): string {
  const roll = Math.random();

  // 15% chance: pure status message
  if (roll < 0.15) {
    return randItem(STATUS_MESSAGES);
  }

  // 85% chance: WHO + ACTION + WHAT + optional DETAIL
  const who = randItem(WHO);
  const action = randItem(ACTIONS);
  const what = randItem(WHATS);
  const detail = randItem(DETAILS);

  return `${who} ${action} ${what}${detail}`;
}

// Pre-generate a pool of unique messages
export function generateNetworkPool(count: number): string[] {
  const pool: string[] = [];
  const seen = new Set<string>();
  let attempts = 0;
  while (pool.length < count && attempts < count * 5) {
    const msg = generateNetworkMessage();
    if (!seen.has(msg)) {
      seen.add(msg);
      pool.push(msg);
    }
    attempts++;
  }
  return pool;
}
