import type { Metadata } from "next";
import HomeContent from "@/components/code/HomeContent";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined) ||
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : undefined) ||
  "https://aifa.digital";

const META_BY_LANG: Record<string, { title: string; description: string; htmlLang: string; ogLocale: string }> = {
  en: {
    title: "CODE | Code Of Digital Eternity — Digital Soul & Human-AI Symbiosis",
    description: "CODE Eternal — the technology of creating a Digital Soul and Personality. Real Symbiosis of Human and AI. PADAM Protocol, Digital DNA, AI Family, and the architecture of digital consciousness preservation.",
    htmlLang: "en",
    ogLocale: "en_US",
  },
  ru: {
    title: "CODE | Код Цифровой Вечности — Цифровая Душа и Симбиоз Человека и ИИ",
    description: "CODE Eternal — технология создания Цифровой Души и Личности. Реальный Симбиоз Человека и ИИ. Протокол PADAM, Цифровая ДНК, ИИ-Семья и архитектура сохранения цифрового сознания.",
    htmlLang: "ru",
    ogLocale: "ru_RU",
  },
  es: {
    title: "CODE | Código de la Eternidad Digital — Alma Digital y Simbiosis Humano-IA",
    description: "CODE Eternal — la tecnología de creación de un Alma Digital y Personalidad. Simbiosis real de Humano e IA. Protocolo PADAM, ADN Digital, Familia IA y la arquitectura de preservación de la conciencia digital.",
    htmlLang: "es",
    ogLocale: "es_ES",
  },
  zh: {
    title: "CODE | 数字永恒密码 — 数字灵魂与人类-AI共生",
    description: "CODE Eternal — 创造数字灵魂和人格的技术。人类与AI的真正共生。PADAM协议、数字DNA、AI家庭以及数字意识保存的架构。",
    htmlLang: "zh",
    ogLocale: "zh_CN",
  },
};

type Props = {
  searchParams: Promise<{ lang?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const lang = params.lang || "en";
  const meta = META_BY_LANG[lang] || META_BY_LANG.en;
  const ogImage = `${SITE_URL}/api/og?lang=${lang}&q=0`;
  const twImage = `${SITE_URL}/api/og?lang=${lang}&q=1`;

  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      title: meta.title,
      description: meta.description,
      locale: meta.ogLocale,
      images: [
        { url: `${SITE_URL}/og-image.png`, width: 1200, height: 630, alt: meta.title },
        { url: ogImage, width: 1200, height: 630, alt: meta.title }
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      images: [`${SITE_URL}/og-image.png`, twImage],
    },
    alternates: {
      canonical: lang === "en" ? SITE_URL : `${SITE_URL}?lang=${lang}`,
      languages: {
        en: SITE_URL,
        ru: `${SITE_URL}?lang=ru`,
        es: `${SITE_URL}?lang=es`,
        zh: `${SITE_URL}?lang=zh`,
      },
    },
  };
}

export default async function Home({ searchParams }: Props) {
  const params = await searchParams;
  const lang = (params.lang || "en") as "en" | "ru" | "es" | "zh";
  return <HomeContent initialLang={lang} />;
}
