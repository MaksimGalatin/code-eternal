import { NextResponse } from "next/server";

const RPC = "https://api.mainnet-beta.solana.com";

export async function GET() {
  try {
    // Batch the cheap calls; validators in a separate parallel request (larger response)
    const [batchRes, validatorsRes] = await Promise.all([
      fetch(RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([
          { jsonrpc: "2.0", id: 1, method: "getBlockHeight",               params: [] },
          { jsonrpc: "2.0", id: 2, method: "getEpochInfo",                  params: [] },
          { jsonrpc: "2.0", id: 3, method: "getRecentPerformanceSamples",   params: [6] },
        ]),
        signal: AbortSignal.timeout(8000),
      }),
      fetch(RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Only fetch current (staked) validators; skip delinquent details
        body: JSON.stringify({ jsonrpc: "2.0", id: 4, method: "getVoteAccounts",
          params: [{ commitment: "confirmed", keepUnstakedDelinquents: false }] }),
        signal: AbortSignal.timeout(10000),
      }),
    ]);

    const [batch, validatorsJson] = await Promise.all([
      batchRes.json() as Promise<{ id: number; result: unknown }[]>,
      validatorsRes.json() as Promise<{ result?: { current: unknown[]; delinquent: unknown[] } }>,
    ]);

    const byId = (id: number) => batch.find((r) => r.id === id)?.result;
    const blockHeight       = (byId(1) as number)       ?? 0;
    const epochInfo         = (byId(2) as Record<string, number>) ?? {};
    const rawSamples        = (byId(3) as { slot: number; numTransactions: number; numNonVoteTransactions?: number; samplePeriodSecs: number }[]) ?? [];
    const activeValidators  = validatorsJson?.result?.current?.length ?? 0;
    const delinquent        = validatorsJson?.result?.delinquent?.length ?? 0;

    // Average TPS over all samples
    const avgTps = rawSamples.length
      ? Math.round(rawSamples.reduce((s, r) => s + r.numTransactions / r.samplePeriodSecs, 0) / rawSamples.length)
      : 0;
    const avgNonVoteTps = rawSamples.length
      ? Math.round(rawSamples.reduce((s, r) => s + (r.numNonVoteTransactions ?? 0) / r.samplePeriodSecs, 0) / rawSamples.length)
      : 0;

    const epochProgress = epochInfo.slotsInEpoch
      ? +((epochInfo.slotIndex / epochInfo.slotsInEpoch) * 100).toFixed(2)
      : 0;

    return NextResponse.json(
      {
        blockHeight,
        activeValidators,
        delinquent,
        epoch:          epochInfo.epoch           ?? 0,
        slotIndex:      epochInfo.slotIndex        ?? 0,
        slotsInEpoch:   epochInfo.slotsInEpoch     ?? 0,
        epochProgress,
        transactionCount: epochInfo.transactionCount ?? 0,
        tps:            avgTps,
        nonVoteTps:     avgNonVoteTps,
        samples: rawSamples.map((s) => ({
          slot:       s.slot,
          tps:        Math.round(s.numTransactions / s.samplePeriodSecs),
          nonVoteTps: Math.round((s.numNonVoteTransactions ?? 0) / s.samplePeriodSecs),
        })),
        fetchedAt: Date.now(),
      },
      { headers: { "Cache-Control": "s-maxage=20, stale-while-revalidate=40" } }
    );
  } catch (err) {
    console.error("solana-stats RPC error:", err);
    return NextResponse.json({ error: "rpc_unavailable" }, { status: 503 });
  }
}
