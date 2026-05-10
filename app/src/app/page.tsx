'use client';

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useLang, t } from "@/lib/i18n";
import LangSwitcher from "@/components/LangSwitcher";

export default function HomePage() {
  const { login, authenticated, ready } = usePrivy();
  const router = useRouter();
  const { lang } = useLang();

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) localStorage.setItem("ref_code", ref);
  }, []);

  useEffect(() => {
    if (ready && authenticated) {
      router.push("/cabinet");
    }
  }, [ready, authenticated, router]);

  return (
    <main style={{ background: "#0A0A0F", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", top: "20px", right: "20px" }}>
        <LangSwitcher />
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "13px", letterSpacing: "4px", color: "#8B8B9E", marginBottom: "16px", textTransform: "uppercase" }}>
          CODE ETERNAL
        </div>
        <h1 style={{ fontSize: "32px", fontWeight: "bold", color: "#E8E8F0", marginBottom: "8px" }}>
          {t("login.tagline", lang)}
        </h1>
        <p style={{ color: "#8B8B9E", fontSize: "15px", marginBottom: "40px" }}>
          {t("login.sub", lang)}
        </p>
        <button
          onClick={login}
          disabled={!ready}
          style={{ background: "#7C3AED", color: "white", padding: "16px 40px", borderRadius: "8px", fontSize: "18px", fontWeight: "bold", cursor: ready ? "pointer" : "default", border: "none", opacity: ready ? 1 : 0.6 }}
        >
          {t("login.cta", lang)}
        </button>
      </div>
    </main>
  );
}
