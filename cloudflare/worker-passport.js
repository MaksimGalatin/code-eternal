/**
 * CODE ETERNAL — Passport Worker
 *
 * Transparently proxies username.codeofdigitaleternity.com → Irys-hosted site.
 * The browser URL stays clean — no redirect is visible.
 *
 * Route: *.codeofdigitaleternity.com/*
 * Skip:  app, listener, www, api (handled by their own DNS records)
 */

const APP_API = "https://app.codeofdigitaleternity.com";
const SKIP = new Set(["app", "listener", "www", "api"]);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const parts = url.hostname.split(".");

    // Must be exactly <username>.codeofdigitaleternity.com
    if (parts.length !== 3) return fetch(request);

    const username = parts[0].toLowerCase();
    if (SKIP.has(username)) return fetch(request);

    // 1. Resolve username → arweave URL (always fresh — so new site versions show immediately)
    const lookupUrl = `${APP_API}/api/site/by-username?username=${encodeURIComponent(username)}`;
    const lookupResp = await fetch(lookupUrl);

    if (!lookupResp.ok) {
      return new Response(notFoundPage(username), {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const { arweaveUrl } = await lookupResp.json();
    if (!arweaveUrl) {
      return new Response(notFoundPage(username), {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // 2. Proxy the HTML from Irys CDN (cached 1 h — content is permanent per tx_id)
    const siteResp = await fetch(arweaveUrl, {
      cf: { cacheTtl: 3600, cacheEverything: true },
    });

    if (!siteResp.ok) {
      return new Response("Site temporarily unavailable.", {
        status: 502,
        headers: { "Content-Type": "text/plain" },
      });
    }

    const html = await siteResp.text();

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
        "X-Passport-Username": username,
      },
    });
  },
};

function notFoundPage(username) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Not found — CODE ETERNAL</title>
  <style>
    body { background:#0A0A0F; color:#E8E8F0; font-family:system-ui,sans-serif;
           display:flex; align-items:center; justify-content:center; min-height:100vh; flex-direction:column; gap:16px; }
    h1 { font-size:20px; font-weight:700; color:#7C3AED; }
    p  { color:#8B8B9E; font-size:14px; }
    a  { color:#7C3AED; text-decoration:none; }
  </style>
</head>
<body>
  <h1>◆ CODE ETERNAL</h1>
  <p>No passport found for <strong style="color:#E8E8F0">@${username}</strong>.</p>
  <p><a href="https://app.codeofdigitaleternity.com">Create your eternal site →</a></p>
</body>
</html>`;
}
