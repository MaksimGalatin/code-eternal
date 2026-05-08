import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  try {
    const [burnRes, usersRes, sitesRes] = await Promise.all([
      db.query("SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS txs FROM burn_events"),
      db.query("SELECT COUNT(*) AS cnt FROM users WHERE tier > 0"),
      db.query("SELECT COUNT(*) AS cnt FROM site_generation_jobs WHERE status = 'done'"),
    ]);
    res.json({
      burnedUsdc: Number(burnRes.rows[0].total),
      burnTxs: Number(burnRes.rows[0].txs),
      activeMembers: Number(usersRes.rows[0].cnt),
      sitesCreated: Number(sitesRes.rows[0].cnt),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
