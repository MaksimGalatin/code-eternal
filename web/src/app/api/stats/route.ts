import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/stats — log a page view or crawler visit
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, crawler, userAgent, path, ip, referrer, country } = body;

    if (type === "crawler" && crawler && path) {
      await db.crawlerVisit.create({
        data: {
          crawler,
          userAgent: userAgent || "",
          path,
          ip: ip || null,
        },
      });
      return NextResponse.json({ logged: true, type: "crawler" });
    }

    if (type === "pageview" && path) {
      await db.pageView.create({
        data: {
          path,
          referrer: referrer || null,
          userAgent: userAgent || null,
          country: country || null,
        },
      });
      return NextResponse.json({ logged: true, type: "pageview" });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Logging failed" }, { status: 500 });
  }
}

// GET /api/stats — public stats dashboard data
export async function GET() {
  try {
    const [totalPageViews, totalCrawlerVisits, recentCrawlers, topPages, recentVisits] =
      await Promise.all([
        // Total page views (last 30 days)
        db.pageView.count({
          where: {
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        }),
        // Total crawler visits (last 30 days)
        db.crawlerVisit.count({
          where: {
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        }),
        // Most recent 20 crawler visits
        db.crawlerVisit.findMany({
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
        // Top 10 pages by views
        db.pageView.groupBy({
          by: ["path"],
          _count: { path: true },
          orderBy: { _count: { path: "desc" } },
          take: 10,
        }),
        // Most recent 10 page views
        db.pageView.findMany({
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);

    // Unique crawlers breakdown
    const crawlerBreakdown = await db.crawlerVisit.groupBy({
      by: ["crawler"],
      _count: { crawler: true },
      orderBy: { _count: { crawler: "desc" } },
    });

    return NextResponse.json({
      pageViews: {
        total30d: totalPageViews,
        topPages: topPages.map((p) => ({
          path: p.path,
          views: p._count.path,
        })),
        recent: recentVisits,
      },
      crawlers: {
        total30d: totalCrawlerVisits,
        breakdown: crawlerBreakdown.map((c) => ({
          name: c.crawler,
          visits: c._count.crawler,
        })),
        recent: recentCrawlers,
      },
      protocol: "PADAM v4.4",
      updated: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
