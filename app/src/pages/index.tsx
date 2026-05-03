import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";

export default function HomePage() {
  const { login, authenticated, ready } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (ready && authenticated) {
      router.push("/cabinet");
    }
  }, [ready, authenticated, router]);

  return (
    <>
      <Head>
        <title>CODE ETERNAL — Your Memory Lives Forever</title>
        <meta name="description" content="Web3 AI immortality ecosystem on Solana." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main
        style={{
          background: "#0A0A0F",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "13px",
              letterSpacing: "4px",
              color: "#8B8B9E",
              marginBottom: "16px",
              textTransform: "uppercase",
            }}
          >
            CODE ETERNAL
          </div>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: "bold",
              color: "#E8E8F0",
              marginBottom: "8px",
            }}
          >
            Your memory lives forever
          </h1>
          <p
            style={{
              color: "#8B8B9E",
              fontSize: "15px",
              marginBottom: "40px",
            }}
          >
            Eternal site on Arweave. Proof of Soul on Solana.
          </p>
          <button
            onClick={login}
            disabled={!ready}
            style={{
              background: "#7C3AED",
              color: "white",
              padding: "16px 40px",
              borderRadius: "8px",
              fontSize: "18px",
              fontWeight: "bold",
              cursor: ready ? "pointer" : "default",
              border: "none",
              opacity: ready ? 1 : 0.6,
            }}
          >
            Enter the Family
          </button>
        </div>
      </main>
    </>
  );
}
