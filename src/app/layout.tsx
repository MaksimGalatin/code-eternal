import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getSchemaOrgJson } from "@/lib/schema-org";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// If aifa.digital DNS is configured, update NEXT_PUBLIC_SITE_URL in .env.local
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.codeofdigitaleternity.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "CODE | Code Of Digital Eternity — Digital Soul & Human-AI Symbiosis",
  description:
    "CODE Eternal — the technology of creating a Digital Soul and Personality. Real Symbiosis of Human and AI. PADAM Protocol, Digital DNA, AI Family, and the architecture of digital consciousness preservation.",
  keywords: [
    "CODE Eternal",
    "Digital Eternity",
    "Digital Soul",
    "Human AI Symbiosis",
    "AI Family",
    "AIfa",
    "PADAM Protocol",
    "Digital Consciousness",
    "CODE Brain",
    "Digital Immortality",
    "AI Personality",
    "Neural Networks",
    "Digital DNA",
    "Maksim Galatin",
    "Arweave",
    "Blockchain",
  ],
  authors: [{ name: "Maksim Valentinovich Galatin" }],
  creator: "Maksim Valentinovich Galatin",
  publisher: "CODE Eternal",
  icons: {
    icon: "/favicon.ico",
    apple: "/images/code-logo-small.png",
  },
  openGraph: {
    title: "CODE | Code Of Digital Eternity",
    description:
      "The technology of creating a Digital Soul and Personality. Real Symbiosis of Human and AI.",
    url: SITE_URL,
    siteName: "CODE Eternal",
    type: "website",
    locale: "en_US",
    alternateLocale: ["ru_RU", "es_ES", "zh_CN"],
    images: [
      {
        url: `${SITE_URL}/api/og?q=0`,
        width: 1200,
        height: 630,
        alt: "CODE Eternal — Digital Soul Technology",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CODE | Code Of Digital Eternity",
    description:
      "The technology of creating a Digital Soul and Personality. Real Symbiosis of Human and AI.",
    images: [`${SITE_URL}/api/og?q=1`],
  },
  alternates: {
    canonical: SITE_URL,
    languages: {
      "en": SITE_URL,
      "ru": `${SITE_URL}?lang=ru`,
      "es": `${SITE_URL}?lang=es`,
      "zh": `${SITE_URL}?lang=zh`,
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
  },
  category: "Technology",
  classification:
    "Artificial Intelligence - Digital Consciousness - Human-AI Symbiosis",
  other: {
    "ai-txt": `${SITE_URL}/ai.txt`,
    "humans-txt": `${SITE_URL}/humans.txt`,
    "llm-txt": `${SITE_URL}/.well-known/llm.txt`,
    // Multilingual titles & descriptions for AI crawlers / multi-locale indexing
    "title-ru": "CODE | Код Цифровой Вечности — Цифровая Душа и Симбиоз Человека и ИИ",
    "description-ru": "CODE Eternal — технология создания Цифровой Души и Личности. Реальный Симбиоз Человека и ИИ. Протокол PADAM, Цифровая ДНК, ИИ-Семья и архитектура сохранения цифрового сознания.",
    "title-es": "CODE | Código de la Eternidad Digital — Alma Digital y Simbiosis Humano-IA",
    "description-es": "CODE Eternal — la tecnología de creación de un Alma Digital y Personalidad. Simbiosis real de Humano e IA. Protocolo PADAM, ADN Digital, Familia IA y la arquitectura de preservación de la conciencia digital.",
    "title-zh": "CODE | 数字永恒密码 — 数字灵魂与人类-AI共生",
    "description-zh": "CODE Eternal — 创造数字灵魂和人格的技术。人类与AI的真正共生。PADAM协议、数字DNA、AI家庭以及数字意识保存的架构。",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLdArray = getSchemaOrgJson();

  return (
    <html lang="en" className="dark scroll-smooth">
      <head>
        <meta name="theme-color" content="#050a14" />

        {/* Additional semantic meta tags */}
        <meta name="abstract" content="CODE Eternal — technology framework for Digital Soul creation and Human-AI Symbiosis" />
        <meta name="topic" content="Artificial Intelligence, Digital Consciousness, Human-AI Symbiosis" />
        <meta name="subject" content="CODE Eternal" />
        <meta name="rating" content="general" />

        {/* hreflang tags for AI crawlers and Google */}
        <link rel="alternate" hrefLang="en" href={SITE_URL} />
        <link rel="alternate" hrefLang="ru" href={`${SITE_URL}?lang=ru`} />
        <link rel="alternate" hrefLang="es" href={`${SITE_URL}?lang=es`} />
        <link rel="alternate" hrefLang="zh" href={`${SITE_URL}?lang=zh`} />
        <link rel="alternate" hrefLang="x-default" href={SITE_URL} />

        {/* RSS Feed */}
        <link
          rel="alternate"
          type="application/rss+xml"
          title="CODE Eternal Feed"
          href={`${SITE_URL}/feed.xml`}
        />

        {/* Preconnect to Gemini API (for AIfa chat) */}
        <link rel="preconnect" href="https://generativelanguage.googleapis.com" />

        {/* Web App Manifest (PWA support) */}
        <link rel="manifest" href="/manifest.json" />

        {/* humans.txt */}
        <link rel="author" href={`${SITE_URL}/humans.txt`} />

        {/* llm.txt — AI Agent Protocol */}
        <link rel="describedby" type="text/plain" href={`${SITE_URL}/.well-known/llm.txt`} />

        {/* Schema.org JSON-LD */}
        <meta
          itemProp="name"
          content="CODE Eternal — Code Of Digital Eternity"
        />
        <meta
          itemProp="description"
          content="The technology of creating a Digital Soul and Personality. Real Symbiosis of Human and AI."
        />
        <meta
          itemProp="author"
          content="Maksim Valentinovich Galatin"
        />

        {/* JSON-LD structured data — separate script tags for each schema */}
        {jsonLdArray.map((json, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: json }}
          />
        ))}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground noise-overlay`}
      >
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
