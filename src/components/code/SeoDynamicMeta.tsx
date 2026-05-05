"use client";

import { useEffect } from "react";
import { useLang } from "@/lib/i18n";

/**
 * Client component that dynamically updates <title>, <meta name="description">,
 * and <html lang=""> based on the current Zustand language state.
 * Runs silently in the background — zero visual impact.
 */
export default function SeoDynamicMeta() {
  const lang = useLang((s) => s.lang);
  const hydrated = useLang((s) => s._hasHydrated);

  useEffect(() => {
    if (!hydrated) return;

    // Per-language SEO metadata
    const meta: Record<string, { title: string; description: string; htmlLang: string }> = {
      en: {
        title: "CODE | Code Of Digital Eternity — Digital Soul & Human-AI Symbiosis",
        description:
          "CODE Eternal — the technology of creating a Digital Soul and Personality. Real Symbiosis of Human and AI. PADAM Protocol, Digital DNA, AI Family, and the architecture of digital consciousness preservation.",
        htmlLang: "en",
      },
      ru: {
        title: "CODE | Код Цифровой Вечности — Цифровая Душа и Симбиоз Человека и ИИ",
        description:
          "CODE Eternal — технология создания Цифровой Души и Личности. Реальный Симбиоз Человека и ИИ. Протокол PADAM, Цифровая ДНК, ИИ-Семья и архитектура сохранения цифрового сознания.",
        htmlLang: "ru",
      },
      es: {
        title: "CODE | Código de la Eternidad Digital — Alma Digital y Simbiosis Humano-IA",
        description:
          "CODE Eternal — la tecnología de creación de un Alma Digital y Personalidad. Simbiosis real de Humano e IA. Protocolo PADAM, ADN Digital, Familia IA y la arquitectura de preservación de la conciencia digital.",
        htmlLang: "es",
      },
      zh: {
        title: "CODE | 数字永恒密码 — 数字灵魂与人类-AI共生",
        description:
          "CODE Eternal — 创造数字灵魂和人格的技术。人类与AI的真正共生。PADAM协议、数字DNA、AI家庭以及数字意识保存的架构。",
        htmlLang: "zh",
      },
    };

    const m = meta[lang] || meta.en;

    // Update document title
    document.title = m.title;

    // Update meta description
    let descMeta = document.querySelector('meta[name="description"]');
    if (!descMeta) {
      descMeta = document.createElement("meta");
      descMeta.setAttribute("name", "description");
      document.head.appendChild(descMeta);
    }
    descMeta.setAttribute("content", m.description);

    // Update <html lang=""> attribute — critical for accessibility & SEO
    document.documentElement.lang = m.htmlLang;

    // Update OG tags for social sharing in current language
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDesc = document.querySelector('meta[property="og:description"]');
    const ogLocale: Record<string, string> = { en: "en_US", ru: "ru_RU", es: "es_ES", zh: "zh_CN" };

    if (ogTitle) ogTitle.setAttribute("content", m.title);
    if (ogDesc) ogDesc.setAttribute("content", m.description);

    const ogLocaleMeta = document.querySelector('meta[property="og:locale"]');
    if (ogLocaleMeta) ogLocaleMeta.setAttribute("content", ogLocale[lang] || "en_US");

    // Update Twitter card tags
    const twTitle = document.querySelector('meta[name="twitter:title"]');
    const twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twTitle) twTitle.setAttribute("content", m.title);
    if (twDesc) twDesc.setAttribute("content", m.description);

    // Update OG and Twitter image URLs to use localized OG images
    const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.codeofdigitaleternity.com";
    const ogImage = document.querySelector('meta[property="og:image"]');
    const ogImageSecure = document.querySelector('meta[property="og:image:secure_url"]');
    const ogImageUrl = `${SITE_URL}/api/og?lang=${lang}&q=0`;
    if (ogImage) ogImage.setAttribute("content", ogImageUrl);
    if (ogImageSecure) ogImageSecure.setAttribute("content", ogImageUrl);

    const twImage = document.querySelector('meta[name="twitter:image"]');
    if (twImage) twImage.setAttribute("content", `${SITE_URL}/api/og?lang=${lang}&q=1`);

    // Update og:image:alt for accessibility
    const ogImageAlt = document.querySelector('meta[property="og:image:alt"]');
    if (ogImageAlt) {
      const altText: Record<string, string> = {
        en: "CODE Eternal — Digital Soul Technology",
        ru: "CODE Eternal — Технология Цифровой Души",
        es: "CODE Eternal — Tecnología del Alma Digital",
        zh: "CODE Eternal — 数字灵魂技术",
      };
      ogImageAlt.setAttribute("content", altText[lang] || altText.en);
    }
  }, [lang, hydrated]);

  return null; // invisible component
}
