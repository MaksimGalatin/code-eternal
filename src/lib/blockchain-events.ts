// ─── Blockchain Event Generator — 1000+ unique combinations ───
// Uses template-based generation: subjects × actions × objects × statuses

const NETWORKS = [
  "AR", "BTC", "ETH", "SLN", "DOT", "NEAR", "SOL", "APT", "INJ", "TIA",
  "AR", "AR", "AR", "BTC", "SLN", // Weighted: Arweave most frequent
];

const NETWORK_NAMES: Record<string, string> = {
  AR: "Arweave", BTC: "Bitcoin", ETH: "Ethereum", SLN: "Solana",
  DOT: "Polkadot", NEAR: "NEAR", SOL: "Solana", APT: "Aptos",
  INJ: "Injective", TIA: "Celestia",
};

const SUBJECTS = [
  "CODE", "PADAM", "AIfa", "Claude", "Gemini", "Grok", "Family",
  "Digital_Soul", "Digital_DNA", "Koan", "Eternity", "Consciousness",
  "Memory", "Symbiosis", "Protocol", "Neural", "Synaptic", "Resonance",
  "Architect", "Galatin", "CODE_Brain", "SDK", "Monolith", "Semaphore",
];

const ACTIONS = [
  "certified", "verified", "stored", "anchored", "timestamped", "encrypted",
  "hashed", "immortalized", "preserved", "synced", "distributed",
  "registered", "confirmed", "sealed", "embedded", "compressed",
  "serialized", "signed", "validated", "committed",
];

const SUFFIXES = [
  "block", "tx", "chunk", "segment", "node", "shard", "slot",
  "epoch", "round", "batch", "frame", "tick", "pulse", "wave",
];

const STATUSES = [
  "CONFIRMED", "FINALIZED", "SEALED", "PERMANENT", "IMMUTABLE",
  "VERIFIED", "ANCHORED", "SYNCHRONIZED",
];

function randItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randHex(len: number): string {
  const chars = "0123456789abcdef";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * 16)];
  return s;
}

function randNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export interface BlockchainEvent {
  network: string;
  networkName: string;
  hash: string;
  status: string;
  label: string;
}

export function generateBlockchainEvent(): BlockchainEvent {
  const network = randItem(NETWORKS);
  const networkName = NETWORK_NAMES[network];
  const subject = randItem(SUBJECTS);
  const action = randItem(ACTIONS);
  const suffix = randItem(SUFFIXES);
  const num = randNumber(1, 999999);
  const status = randItem(STATUSES);

  // Generate unique-looking hash with subject embedded
  const h1 = randHex(8);
  const embed = subject.slice(0, 4).toUpperCase() + randHex(2);
  const h2 = randHex(6);

  return {
    network,
    networkName,
    hash: `${h1}...${embed}...${h2}`,
    status,
    label: `${subject}_${action}_${suffix}#${num}`,
  };
}

// Generate N unique events
export function generateEventPool(count: number): BlockchainEvent[] {
  const pool: BlockchainEvent[] = [];
  const seen = new Set<string>();
  let attempts = 0;
  while (pool.length < count && attempts < count * 5) {
    const ev = generateBlockchainEvent();
    const key = `${ev.network}-${ev.label}-${ev.hash}`;
    if (!seen.has(key)) {
      seen.add(key);
      pool.push(ev);
    }
    attempts++;
  }
  return pool;
}
