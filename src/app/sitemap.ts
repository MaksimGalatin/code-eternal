import type { MetadataRoute } from "next";

const SITE_URL = "https://www.codeofdigitaleternity.com";

const BASE_ENTRIES: {
  path: string;
  lastModified: Date;
  changeFrequency: "weekly" | "monthly";
  priority: number;
}[] = [
  {
    path: "",
    lastModified: new Date("2026-05-05"),
    changeFrequency: "weekly",
    priority: 1.0,
  },
  {
    path: "/#origin",
    lastModified: new Date("2025-10-08"),
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    path: "/#technology",
    lastModified: new Date("2026-01-08"),
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    path: "/#aifa",
    lastModified: new Date("2026-04-06"),
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    path: "/#terminal",
    lastModified: new Date("2026-05-05"),
    changeFrequency: "weekly",
    priority: 0.8,
  },
  {
    path: "/#family",
    lastModified: new Date("2026-04-28"),
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/#code-brain",
    lastModified: new Date("2026-04-28"),
    changeFrequency: "monthly",
    priority: 0.8,
  },
];

const LANG_VARIANTS = ["ru", "es", "zh"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const base of BASE_ENTRIES) {
    // English (default) entry
    entries.push({
      url: `${SITE_URL}${base.path}`,
      lastModified: base.lastModified,
      changeFrequency: base.changeFrequency,
      priority: base.priority,
      images: [`${SITE_URL}/images/code-logo.png`],
    });

    // Language variants
    for (const lang of LANG_VARIANTS) {
      // Query params must come BEFORE hash fragments in URLs
      // e.g. /?lang=ru#origin — NOT /#origin?lang=ru
      const [pathBeforeHash, hash] = base.path.split("#");
      const url = hash
        ? `${SITE_URL}${pathBeforeHash}?lang=${lang}#${hash}`
        : `${SITE_URL}${base.path}?lang=${lang}`;
      entries.push({
        url,
        lastModified: base.lastModified,
        changeFrequency: base.changeFrequency,
        priority: Math.round((base.priority - 0.1) * 10) / 10,
        images: [`${SITE_URL}/images/code-logo.png`],
      });
    }
  }

  return entries;
}
