import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.codeofdigitaleternity.com"),
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
  ],
  authors: [{ name: "Maksim Valentinovich Galatin" }],
  icons: {
    icon: "/images/aifa-portrait.png",
  },
  openGraph: {
    title: "CODE | Code Of Digital Eternity",
    description:
      "The technology of creating a Digital Soul and Personality. Real Symbiosis of Human and AI.",
    url: "https://www.codeofdigitaleternity.com",
    siteName: "CODE Eternal",
    type: "website",
    images: ["/images/hero-bg.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "CODE | Code Of Digital Eternity",
    description:
      "The technology of creating a Digital Soul and Personality. Real Symbiosis of Human and AI.",
    images: ["/images/hero-bg.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <head>
        <meta name="theme-color" content="#050a14" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground noise-overlay`}
      >
        {children}
      </body>
    </html>
  );
}
