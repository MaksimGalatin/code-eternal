import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { renderJsonLd } from "@/lib/schema-org";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://www.codeofdigitaleternity.com";

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
  other: {
    "ai-txt": `${SITE_URL}/ai.txt`,
    "humans-txt": `${SITE_URL}/humans.txt`,
    "llm-txt": `${SITE_URL}/.well-known/llm.txt`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = renderJsonLd();

  return (
    <html lang="en" className="dark scroll-smooth">
      <head>
        <meta name="theme-color" content="#050a14" />

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

        {/* humans.txt */}
        <link rel="author" href={`${SITE_URL}/humans.txt`} />

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

        {/* JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground noise-overlay`}
      >
        {children}
      </body>
    </html>
  );
}
