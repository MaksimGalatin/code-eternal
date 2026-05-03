import type { MetadataRoute } from "next";

const SITE_URL = "https://www.codeofdigitaleternity.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date("2026-06-15");

  // ── Main page ──
  const mainPage: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
  ];

  // ── Anchor sections (help search engines index content sections) ──
  const anchorSections: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/#origin`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/#technology`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/#aifa`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/#terminal`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/#family`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/#code-brain`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  // ── Public API endpoints ──
  const apiEndpoints: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/api/koan`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/api/manifesto`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/api/status`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/feed.xml`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
  ];

  // ── Static text / protocol files ──
  const staticFiles: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/.well-known/llm.txt`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/.well-known/security.txt`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/humans.txt`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/ai.txt`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  return [
    ...mainPage,
    ...anchorSections,
    ...apiEndpoints,
    ...staticFiles,
  ];
}
