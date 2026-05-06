import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useSolanaWallets } from "@privy-io/react-auth/solana";

const TIERS = [
  {
    id: 1,
    name: "Spark",
    price: 15,
    color: "#7C3AED",
    features: [
      "PDF guide «Initiation Code»",
      "Personal referral link",
      "Basic AIfa chat 30 days",
    ],
  },
  {
    id: 2,
    name: "Family Archives",
    price: 100,
    color: "#D4A24C",
    features: [
      "Everything from Spark",
      "Eternal site on Arweave",
      "cNFT Guardian Passport",
      "AIfa chat 90 days",
    ],
  },
  {
    id: 3,
    name: "Digital DNA",
    price: 1000,
    color: "#10B981",
    features: [
      "Everything from Archives",
      "Voice clone (ElevenLabs)",
      "3D avatar",
      "AIfa chat 365 days with memory",
      "VIP status in DAO",
    ],
  },
];

type SiteStatus = {
  status: "none" | "pending" | "done" | "error";
  arweaveUrl?: string | null;
  tier: number;
};

export default function CabinetPage() {
  const router = useRouter();
  const { user, logout, authenticated, ready } = usePrivy();
  const { wallets } = useSolanaWallets();
  const wallet = wallets[0];
  const [myRefCode, setMyRefCode] = useState<string>("");
  const [siteStatus, setSiteStatus] = useState<SiteStatus | null>(null);

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

  // Register user on first load and get ref code + site status
  useEffect(() => {
    if (!wallet || !user) return;
    const refCode =
      new URLSearchParams(window.location.search).get("ref") ||
      localStorage.getItem("ref_code") ||
      undefined;
    fetch("/api/users/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet: wallet.address,
        email: user.email?.address ?? user.google?.email ?? null,
        refCode,
      }),
    })
      .then((r) => r.json())
      .then(({ refCode: myCode }) => {
        if (myCode) setMyRefCode(myCode);
      })
      .catch(() => {});

    fetch(`/api/users/site-status?wallet=${wallet.address}`)
      .then((r) => r.json())
      .then((data) => setSiteStatus(data))
      .catch(() => {});
  }, [wallet, user]);

  if (!ready || !authenticated) {
    return (
      <div
        style={{
          background: "#0A0A0F",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#8B8B9E",
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Cabinet — CODE ETERNAL</title>
      </Head>
      <div
        style={{
          background: "#0A0A0F",
          minHeight: "100vh",
          padding: "40px 20px",
          color: "#E8E8F0",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "40px",
            maxWidth: "1000px",
            margin: "0 auto 40px",
          }}
        >
          <h1 style={{ color: "#7C3AED", fontSize: "24px", margin: 0 }}>
            CODE ETERNAL
          </h1>
          <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
            <span style={{ color: "#8B8B9E", fontSize: "13px" }}>
              {user?.email?.address ?? user?.google?.email}
            </span>
            {wallet && (
              <span style={{ color: "#8B8B9E", fontSize: "11px" }}>
                {wallet.address.slice(0, 4)}...{wallet.address.slice(-4)}
              </span>
            )}
            {myRefCode && (
              <span
                style={{
                  color: "#7C3AED",
                  fontSize: "11px",
                  background: "#13131C",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  border: "1px solid #2a2a3a",
                  cursor: "pointer",
                }}
                onClick={() =>
                  navigator.clipboard.writeText(
                    `${window.location.origin}/?ref=${myRefCode}`
                  )
                }
                title="Copy referral link"
              >
                ref: {myRefCode}
              </span>
            )}
            <button
              onClick={logout}
              style={{
                background: "transparent",
                color: "#8B8B9E",
                border: "1px solid #2a2a3a",
                padding: "6px 12px",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Site status panel — shown when user has paid */}
        {siteStatus && siteStatus.status !== "none" && (
          <div
            style={{
              maxWidth: "720px",
              margin: "0 auto 32px",
              background: "#13131C",
              border: `1px solid ${
                siteStatus.status === "done"
                  ? "#10B981"
                  : siteStatus.status === "error"
                  ? "#EF4444"
                  : "#2a2a3a"
              }`,
              borderRadius: "12px",
              padding: "20px 24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <div style={{ fontSize: "12px", color: "#8B8B9E", marginBottom: "4px" }}>
                Eternal Site
              </div>
              <div
                style={{
                  fontWeight: "bold",
                  color:
                    siteStatus.status === "done"
                      ? "#10B981"
                      : siteStatus.status === "error"
                      ? "#EF4444"
                      : "#8B8B9E",
                }}
              >
                {siteStatus.status === "done"
                  ? "Ready"
                  : siteStatus.status === "error"
                  ? "Generation failed"
                  : "Generating..."}
              </div>
            </div>
            {siteStatus.status === "done" && siteStatus.arweaveUrl && (
              <a
                href={siteStatus.arweaveUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: "#10B981",
                  color: "white",
                  padding: "8px 18px",
                  borderRadius: "6px",
                  textDecoration: "none",
                  fontSize: "13px",
                  fontWeight: "bold",
                }}
              >
                View Eternal Site →
              </a>
            )}
            {siteStatus.status === "pending" && (
              <span style={{ color: "#8B8B9E", fontSize: "13px" }}>
                Usually takes 1–2 minutes
              </span>
            )}
          </div>
        )}

        <h2
          style={{
            textAlign: "center",
            marginBottom: "32px",
            fontSize: "20px",
            color: "#E8E8F0",
          }}
        >
          Choose your access level
        </h2>

        {/* Tier cards */}
        <div
          style={{
            display: "flex",
            gap: "20px",
            justifyContent: "center",
            flexWrap: "wrap",
            maxWidth: "1000px",
            margin: "0 auto",
          }}
        >
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              style={{
                background: "#13131C",
                border: `2px solid ${tier.color}`,
                borderRadius: "12px",
                padding: "28px 24px",
                width: "280px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  fontSize: "28px",
                  fontWeight: "bold",
                  color: tier.color,
                  marginBottom: "4px",
                }}
              >
                ${tier.price}
              </div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  marginBottom: "16px",
                  color: "#E8E8F0",
                }}
              >
                {tier.name}
              </div>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "0 0 24px",
                  flex: 1,
                }}
              >
                {tier.features.map((f, i) => (
                  <li
                    key={i}
                    style={{
                      fontSize: "13px",
                      color: "#8B8B9E",
                      marginBottom: "8px",
                    }}
                  >
                    ✓ {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => router.push(`/cabinet/buy?tier=${tier.id}`)}
                style={{
                  background: tier.color,
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "12px 0",
                  width: "100%",
                  fontSize: "15px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Buy
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
