import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const VAULT_PDA   = "4tL3hpb5VnujtirGtNbRxWyCq7LEbh4hkFGstdUxHNqt";
const USDC_MINT   = process.env.NEXT_PUBLIC_USDC_MINT ?? "5f76mcT9Cgo8oRfWDnsHnZjj9ZqvjcqaXPcrEMEbQsy5";
const RPC_URL     = process.env.NEXT_PUBLIC_RPC_URL ?? "";

async function rpc(method: string, params: unknown[]) {
  if (!RPC_URL) return null;
  try {
    const res = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    return data.result ?? null;
  } catch {
    return null;
  }
}

async function getTreasuryUsdc(): Promise<number> {
  const result = await rpc("getTokenAccountsByOwner", [
    VAULT_PDA,
    { mint: USDC_MINT },
    { encoding: "jsonParsed" },
  ]);
  const account = result?.value?.[0];
  const raw = account?.account?.data?.parsed?.info?.tokenAmount?.amount;
  if (!raw) return 0;
  return parseInt(raw, 10) / 1_000_000;
}

async function getCurrentSlot(): Promise<number> {
  const result = await rpc("getSlot", [{ commitment: "finalized" }]);
  return typeof result === "number" ? result : 0;
}

export async function GET() {
  try {
    const [burnedRes, txRes, walletsRes, histRes, treasuryUsdc, currentSlot] = await Promise.all([
      db.query(`SELECT COALESCE(SUM(amount),0) as total FROM burn_events`),
      db.query(`SELECT COUNT(*) as total FROM burn_events`),
      db.query(`SELECT COUNT(DISTINCT wallet) as total FROM users WHERE tier > 0`),
      db.query(`
        SELECT to_char(date_trunc('month', created_at),'Mon') as month,
               COALESCE(SUM(amount * 100),0) as amount
        FROM burn_events
        WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY date_trunc('month', created_at)
        ORDER BY date_trunc('month', created_at) ASC
      `),
      getTreasuryUsdc(),
      getCurrentSlot(),
    ]);

    const burnedUsdc  = parseFloat(burnedRes.rows[0].total) || 0;
    const burnedCode  = Math.round(burnedUsdc * 100);
    const totalTxns   = parseInt(txRes.rows[0].total) || 0;
    const wallets     = parseInt(walletsRes.rows[0].total) || 0;

    const histMap: Record<string, number> = {};
    for (const r of histRes.rows) histMap[r.month] = parseFloat(r.amount) || 0;
    const burnHistory = MONTHS.map(m => ({ month: m, amount: histMap[m] ?? 0 }));

    return NextResponse.json({
      burnedCode,
      totalTransactions: totalTxns,
      activeWallets: wallets,
      treasuryUsdc: Math.round(treasuryUsdc * 100) / 100,
      avgFee: 0.00025,
      currentSlot,
      burnHistory,
    }, { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" } });
  } catch (e) {
    console.error("metrics error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
