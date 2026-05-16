'use client';
import React, { useRef, useState } from "react";
import { t } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";
import type { SiteStatus } from "@/types/cabinet";

const TIERS = [
  { id: 1, nameKey: "tier.spark" as const,    price: 15,   color: "#7C3AED", rgb: "124,58,237",  icon: "⚡" },
  { id: 2, nameKey: "tier.archives" as const, price: 100,  color: "#D4A24C", rgb: "212,162,76",  icon: "🏛️" },
  { id: 3, nameKey: "tier.dna" as const,      price: 1000, color: "#10B981", rgb: "16,185,129",  icon: "🧬" },
];

export interface SiteTabProps {
  wallet: { address: string } | undefined;
  lang: Lang;
  siteStatus: SiteStatus | null;
  tierExpires: number;
  getAccessToken: () => Promise<string | null>;
  onSuccess: (status: SiteStatus) => void;
  onNavigateBack: () => void;
}

export default function SiteTab({
  wallet,
  lang,
  siteStatus,
  tierExpires,
  getAccessToken,
  onSuccess,
  onNavigateBack,
}: SiteTabProps) {
  const [nftFlipped,      setNftFlipped]      = useState(false);
  const [siteUsername,    setSiteUsername]    = useState("");
  const [usernameErr,     setUsernameErr]     = useState("");
  const [siteDisplayName, setSiteDisplayName] = useState("");
  const [siteBio,         setSiteBio]         = useState("");
  const [siteManifesto,   setSiteManifesto]   = useState("");
  const [siteTelegram,    setSiteTelegram]    = useState("");
  const [siteTwitter,     setSiteTwitter]     = useState("");
  const [siteWebUrl,      setSiteWebUrl]      = useState("");
  const [avatarDataUrl,   setAvatarDataUrl]   = useState("");
  const [avatarSizeKb,    setAvatarSizeKb]    = useState(0);
  const [avatarError,     setAvatarError]     = useState("");
  const [siteCreating,    setSiteCreating]    = useState(false);
  const [siteError,       setSiteError]       = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const currentTier = siteStatus?.tier ?? 0;
  const tierObj = TIERS.find(t => t.id === currentTier);
  const now = Math.floor(Date.now() / 1000);
  const isExpired = tierExpires > 0 && now > tierExpires;
  const regenCount = siteStatus?.regenCount ?? 0;
  const regenLimit = siteStatus?.regenLimit ?? 0;
  const regenLimitReached = currentTier > 0 && regenLimit > 0 && regenCount >= regenLimit;

  function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setAvatarError("Please select an image file"); return; }
    setAvatarError("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 200;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        let quality = 0.8;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        while (dataUrl.length > 80000 && quality > 0.25) { quality -= 0.15; dataUrl = canvas.toDataURL("image/jpeg", quality); }
        if (dataUrl.length > 90000) { setAvatarError("Image is too large even after compression. Use a smaller photo."); return; }
        setAvatarDataUrl(dataUrl);
        setAvatarSizeKb(Math.round(dataUrl.length / 1024));
      };
      img.src = ev.target!.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function handleCreateSite() {
    if (!wallet || siteCreating || !siteUsername || !siteDisplayName || isExpired || regenLimitReached) return;
    setSiteCreating(true);
    setSiteError("");
    try {
      const token = await getAccessToken();
      const r = await fetch("/api/site/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          wallet: wallet.address,
          displayName: siteDisplayName,
          username: siteUsername,
          bio: siteBio || undefined,
          manifesto: siteManifesto || undefined,
          telegram: siteTelegram || undefined,
          twitter: siteTwitter || undefined,
          website: siteWebUrl || undefined,
          avatarDataUrl: avatarDataUrl || undefined,
        }),
      });
      if (!r.ok) {
        const err = await r.json();
        if (r.status === 409 && err.error === "username_taken") {
          setUsernameErr(t("site.usernameTaken", lang));
        } else {
          setSiteError(t("site.errorFailed", lang));
        }
        return;
      }
      onSuccess({ status: "pending", tier: currentTier });
    } catch {
      setSiteError(t("site.errorNetwork", lang));
    } finally {
      setSiteCreating(false);
    }
  }

  // Identicon for preview
  const addr = wallet?.address ?? "";
  const passId = addr ? `CE-${addr.slice(0,8).toUpperCase()}` : "CE---------";
  const IC=7, IP=2, IR=7, ICOLS=4;
  const IW=7*IC+IP*2;
  const iRects: {x:number,y:number}[] = [];
  for(let row=0;row<IR;row++) for(let col=0;col<ICOLS;col++){
    const idx=(row*ICOLS+col)%Math.max(addr.length,1);
    if(addr.length>0&&addr.charCodeAt(idx)%2===0){
      iRects.push({x:IP+col*IC,y:IP+row*IC});
      if(col<3) iRects.push({x:IP+(6-col)*IC,y:IP+row*IC});
    }
  }
  const QR_ON=new Set([0,1,2,3,4,5,6,7,13,14,20,21,27,28,34,35,36,37,38,39,40,41,42,43,44,47,48,10,11,17,18,24,25,31,32,45,46]);
  const tc  = tierObj?.color ?? "#7C3AED";
  const tr  = tierObj?.rgb   ?? "124,58,237";
  const fLabel: React.CSSProperties = {fontSize:"6px",color:"rgba(255,255,255,0.28)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"1px"};
  const fVal: React.CSSProperties   = {fontSize:"9px",color:"rgba(232,232,240,0.75)",wordBreak:"break-word"};
  const fValAcc: React.CSSProperties= {fontSize:"9px",color:tc,fontFamily:"monospace",wordBreak:"break-word"};

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <button onClick={onNavigateBack} style={{ background: "none", border: "none", color: "rgb(107,114,128)", cursor: "pointer", fontSize: "20px", lineHeight: 1, padding: "10px", minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>✦</span>
            <span style={{ fontSize: "20px", fontWeight: 800, color: "rgb(232,232,240)" }}>{t("site.title", lang)}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "2px" }}>
            {tierObj && <span style={{ fontSize: "12px", color: "rgb(107,114,128)" }}>{t(tierObj.nameKey, lang)} — ${tierObj.price}</span>}
            {currentTier > 0 && regenLimit > 0 && (
              <span style={{ fontSize: "12px", padding: "1px 8px", borderRadius: "99px", background: regenLimitReached ? "rgba(239,68,68,0.1)" : "rgba(124,58,237,0.12)", color: regenLimitReached ? "#ef4444" : "rgb(167,139,250)", border: `1px solid ${regenLimitReached ? "rgba(239,68,68,0.3)" : "rgba(124,58,237,0.3)"}` }}>
                {regenCount}/{regenLimit} {t("site.updatesThisPeriod", lang)}
              </span>
            )}
          </div>
        </div>
      </div>

      {currentTier === 0 ? (
        <div className="glass-panel site-empty-panel" style={{ padding: "48px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🏛️</div>
          <div style={{ fontSize: "18px", fontWeight: 700, color: "rgb(232,232,240)", marginBottom: "8px" }}>Family Archives tier required</div>
          <div style={{ fontSize: "13px", color: "rgb(107,114,128)", marginBottom: "24px" }}>Purchase a tier to create your eternal site on Arweave</div>
          <button onClick={onNavigateBack} style={{ background: "linear-gradient(135deg,#7C3AED,#6D28D9)", color: "white", border: "none", borderRadius: "10px", padding: "12px 28px", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>
            Choose a Tier →
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: "20px", alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* Form */}
          <div className="glass-panel" style={{ flex: "1 1 480px", padding: "28px" }}>
            {/* Username */}
            <div style={{ marginBottom: "20px" }}>
              <label htmlFor="site-username" style={{ fontSize: "12px", color: "rgb(107,114,128)", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                <span>👤</span> {t("site.username", lang)} <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div style={{ display: "flex", background: "rgb(19,19,28)", border: `1px solid ${usernameErr ? "#ef4444" : "rgb(42,42,58)"}`, borderRadius: "10px", overflow: "hidden", transition: "border-color 0.15s" }}>
                <input id="site-username" type="text" value={siteUsername}
                  onChange={e => {
                    const raw = e.target.value;
                    const filtered = raw.replace(/[^a-z0-9_-]/gi, "").toLowerCase();
                    setSiteUsername(filtered);
                    setUsernameErr(filtered.length < raw.length ? t("site.latinOnly", lang) : "");
                  }}
                  placeholder="yourname"
                  style={{ flex: 1, minWidth: 0, background: "none", border: "none", padding: "11px 14px", color: "rgb(232,232,240)", fontSize: "14px", fontFamily: "Inter,sans-serif", outline: "none" }} />
                <span className="username-suffix">.codeofdigitaleternity.com</span>
              </div>
              {usernameErr && <div style={{ fontSize: "11px", color: "#ef4444", marginTop: "4px" }}>{usernameErr}</div>}
            </div>

            {/* Display name */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "12px", color: "rgb(107,114,128)", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                <span>✏️</span> {t("site.displayName", lang)} <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input value={siteDisplayName} onChange={e => setSiteDisplayName(e.target.value)}
                placeholder="Your name"
                style={{ width: "100%", background: "rgb(19,19,28)", border: "1px solid rgb(42,42,58)", borderRadius: "10px", padding: "11px 14px", color: "rgb(232,232,240)", fontSize: "14px", fontFamily: "Inter,sans-serif", outline: "none", boxSizing: "border-box" }} />
            </div>

            {/* Bio */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "12px", color: "rgb(107,114,128)", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                <span>📝</span> {t("site.bio", lang)}
              </label>
              <textarea value={siteBio} onChange={e => setSiteBio(e.target.value.slice(0,2000))}
                placeholder="Tell the world about yourself..."
                rows={4}
                style={{ width: "100%", background: "rgb(19,19,28)", border: "1px solid rgb(42,42,58)", borderRadius: "10px", padding: "11px 14px", color: "rgb(232,232,240)", fontSize: "14px", fontFamily: "Inter,sans-serif", outline: "none", boxSizing: "border-box", resize: "vertical" }} />
              <div style={{ textAlign: "right", fontSize: "11px", color: "rgb(107,114,128)", marginTop: "4px" }}>{siteBio.length}/2000</div>
            </div>

            {/* Manifesto */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "12px", color: "rgb(107,114,128)", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                <span>⚡</span> {t("site.manifesto", lang)}
              </label>
              <textarea value={siteManifesto} onChange={e => setSiteManifesto(e.target.value.slice(0,500))}
                placeholder="Your life philosophy, your eternal words..."
                rows={3}
                style={{ width: "100%", background: "rgb(19,19,28)", border: "1px solid rgb(42,42,58)", borderRadius: "10px", padding: "11px 14px", color: "rgb(232,232,240)", fontSize: "14px", fontFamily: "Inter,sans-serif", outline: "none", boxSizing: "border-box", resize: "vertical" }} />
              <div style={{ textAlign: "right", fontSize: "11px", color: "rgb(107,114,128)", marginTop: "4px" }}>{siteManifesto.length}/500</div>
            </div>

            {/* Avatar upload */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "12px", color: "rgb(107,114,128)", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                <span>🖼️</span> {t("site.avatar", lang)}
              </label>
              <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarFile} />
              <div onClick={() => avatarInputRef.current?.click()}
                style={{ background: "rgb(19,19,28)", border: `1px dashed ${avatarDataUrl ? "rgb(124,58,237)" : "rgb(42,42,58)"}`, borderRadius: "10px", padding: "16px", textAlign: "center", cursor: "pointer", transition: "border-color 0.15s" }}>
                {avatarDataUrl ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", justifyContent: "center" }}>
                    <img src={avatarDataUrl} alt="avatar" style={{ width: "64px", height: "64px", borderRadius: "50%", objectFit: "cover", border: "2px solid rgb(124,58,237)" }} />
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: "13px", color: "rgb(232,232,240)" }}>Avatar selected</div>
                      <div style={{ fontSize: "11px", color: "rgb(107,114,128)", marginTop: "2px" }}>{avatarSizeKb} KB · Click to change</div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: "24px", marginBottom: "6px" }}>📤</div>
                    <div style={{ fontSize: "13px", color: "rgb(107,114,128)" }}>Click to upload avatar</div>
                    <div style={{ fontSize: "11px", color: "rgb(42,42,58)", marginTop: "4px" }}>JPG, PNG — auto-compressed to fit free Arweave tier</div>
                  </>
                )}
              </div>
              {avatarError && <div style={{ fontSize: "11px", color: "#ef4444", marginTop: "4px" }}>{avatarError}</div>}
            </div>

            {/* Social links */}
            <div className="social-grid">
              {[
                { icon: "📱", label: "Telegram", value: siteTelegram, setter: setSiteTelegram, placeholder: "username" },
                { icon: "𝕏", label: "Twitter", value: siteTwitter, setter: setSiteTwitter, placeholder: "handle" },
                { icon: "🌐", label: "Website", value: siteWebUrl, setter: setSiteWebUrl, placeholder: "https://..." },
              ].map(({ icon, label, value, setter, placeholder }) => (
                <div key={label}>
                  <label style={{ fontSize: "11px", color: "rgb(107,114,128)", marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
                    {icon} {label}
                  </label>
                  <input value={value} onChange={e => setter(e.target.value)}
                    placeholder={placeholder}
                    style={{ width: "100%", background: "rgb(19,19,28)", border: "1px solid rgb(42,42,58)", borderRadius: "8px", padding: "9px 10px", color: "rgb(232,232,240)", fontSize: "13px", fontFamily: "Inter,sans-serif", outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
            </div>

            <button
              disabled={!siteUsername || !siteDisplayName || siteCreating || currentTier === 0 || isExpired || regenLimitReached}
              onClick={handleCreateSite}
              style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "none", cursor: (siteUsername && siteDisplayName && !siteCreating && currentTier > 0 && !isExpired && !regenLimitReached) ? "pointer" : "not-allowed", fontWeight: 700, fontSize: "15px", fontFamily: "Inter,sans-serif", background: isExpired || regenLimitReached ? "rgb(42,42,58)" : (siteUsername && siteDisplayName && !siteCreating && currentTier > 0) ? "linear-gradient(135deg,#7C3AED,#6D28D9)" : "rgb(42,42,58)", color: isExpired ? "#f85149" : regenLimitReached ? "#ef4444" : "white", transition: "all 0.15s", opacity: siteCreating ? 0.7 : 1 }}
            >
              {isExpired ? `🔒 ${t("cabinet.expiry.title", lang)}` : regenLimitReached ? `${t("site.limitReached", lang)} (${regenCount}/${regenLimit})` : siteCreating ? t("site.submitting", lang) : `🌐 ${t("site.submit", lang)}`}
            </button>
            {siteError && (
              <div style={{ marginTop: "8px", fontSize: "12px", color: "#ef4444", textAlign: "center" }}>{siteError}</div>
            )}
            <div style={{ marginTop: "10px", fontSize: "11px", color: "rgb(107,114,128)", textAlign: "center" }}>
              {currentTier === 0 ? t("site.noTier", lang) : regenLimitReached ? `${regenCount}/${regenLimit} ${t("site.updatesUsed", lang)}` : `${regenCount}/${regenLimit} ${t("site.updatesUsed", lang)} · ${t("site.permanent", lang)}`}
            </div>
          </div>

          {/* Live Preview */}
          <div className="glass-panel" style={{ flex: "1 1 360px", padding: "20px" }}>
            <div style={{ fontSize: "12px", color: "rgb(107,114,128)", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🖥️</span> {t("site.preview", lang)}
            </div>
            <div style={{ background: "rgb(13,13,20)", borderRadius: "12px", overflow: "hidden", border: "1px solid rgb(26,26,40)" }}>
              {/* Mac dots */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", borderBottom: "1px solid rgb(26,26,40)" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ef4444" }} />
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#f59e0b" }} />
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10B981" }} />
                <span style={{ fontSize: "11px", color: "rgb(107,114,128)", marginLeft: "6px" }}>{siteUsername || "username"}.codeofdigitaleternity.com</span>
              </div>
              {/* Preview content — passport style */}
              <>
                {/* ── Header ── */}
                <div style={{padding:"8px 12px",background:`linear-gradient(135deg,rgba(${tr},0.1),transparent)`,borderBottom:"1px solid rgba(255,255,255,0.05)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"4px"}}>
                  <div style={{display:"flex",flexDirection:"column",gap:"1px"}}>
                    <span style={{fontSize:"6px",color:"rgba(255,255,255,0.38)",letterSpacing:"0.18em",textTransform:"uppercase"}}>Solana Blockchain</span>
                    <span style={{fontSize:"11px",fontWeight:800,letterSpacing:"0.12em",color:tc}}>Code Eternal</span>
                  </div>
                  <svg width="30" height="30" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="23" cy="23" r="22" stroke={tc} strokeOpacity="0.28" strokeWidth="1"/>
                    <circle cx="23" cy="23" r="16.5" stroke={tc} strokeOpacity="0.15" strokeWidth="0.6"/>
                    <polygon points="23,9 26.4,18.9 37,18.9 28.3,24.9 31.7,34.8 23,28.8 14.3,34.8 17.7,24.9 9,18.9 19.6,18.9" fill={tc} fillOpacity="0.13" stroke={tc} strokeOpacity="0.38" strokeWidth="0.6"/>
                  </svg>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"1px"}}>
                    <span style={{fontSize:"6px",color:"rgba(255,255,255,0.25)",letterSpacing:"0.1em",textTransform:"uppercase"}}>Document Type</span>
                    <span style={{fontSize:"8px",fontWeight:700,color:"rgba(232,232,240,0.65)",letterSpacing:"0.06em"}}>Digital Passport</span>
                    <span style={{fontSize:"7px",color:tc,letterSpacing:"0.05em"}}>{tierObj ? t(tierObj.nameKey, lang) : "—"}</span>
                  </div>
                </div>

                {/* ── Identity ── */}
                <div style={{padding:"10px 12px",display:"flex",gap:"10px",alignItems:"flex-start",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                  {/* Photo zone */}
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"4px",flexShrink:0}}>
                    <div style={{width:"52px",height:"64px",borderRadius:"4px",background:"rgba(0,0,0,0.4)",border:`1px solid rgba(${tr},0.35)`,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
                      {avatarDataUrl
                        ? <img src={avatarDataUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                        : <span style={{fontSize:"18px",color:tc,opacity:0.7}}>◆</span>
                      }
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:"2px",background:"rgba(16,185,129,0.12)",borderRadius:"8px",padding:"1px 5px"}}>
                      <div style={{width:"3px",height:"3px",borderRadius:"50%",background:"#10B981"}}/>
                      <span style={{fontSize:"5px",color:"#10B981",fontWeight:700,letterSpacing:"0.1em"}}>VERIFIED</span>
                    </div>
                  </div>
                  {/* Fields grid */}
                  <div style={{flex:1,display:"grid",gridTemplateColumns:"1fr 1fr",gap:"5px 8px"}}>
                    <div style={{gridColumn:"span 2"}}>
                      <div style={fLabel}>Full Name</div>
                      <div style={{fontSize:"12px",fontWeight:700,color:"rgba(232,232,240,0.92)",wordBreak:"break-word"}}>{siteDisplayName||<span style={{color:"rgba(255,255,255,0.12)"}}>Your Name</span>}</div>
                    </div>
                    <div>
                      <div style={fLabel}>Passport ID</div>
                      <div style={fValAcc}>{passId}</div>
                    </div>
                    <div>
                      <div style={fLabel}>Issue Date</div>
                      <div style={fVal}>{new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div>
                    </div>
                    <div>
                      <div style={fLabel}>Network</div>
                      <div style={fVal}>Solana</div>
                    </div>
                    <div>
                      <div style={fLabel}>Storage</div>
                      <div style={fVal}>Arweave ∞</div>
                    </div>
                    {siteUsername&&<div style={{gridColumn:"span 2"}}>
                      <div style={fLabel}>Digital Identity</div>
                      <div style={fValAcc}>🌐 {siteUsername}.codeofdigitaleternity.com</div>
                    </div>}
                    {siteTelegram&&<div style={{gridColumn:"span 2"}}>
                      <div style={fLabel}>Telegram</div>
                      <div style={fVal}>📱 {siteTelegram.startsWith("+")?"Telegram":`@${siteTelegram}`}</div>
                    </div>}
                    {siteTwitter&&<div style={{gridColumn:"span 2"}}>
                      <div style={fLabel}>Twitter / X</div>
                      <div style={fVal}>𝕏 @{siteTwitter}</div>
                    </div>}
                    {siteWebUrl&&<div style={{gridColumn:"span 2"}}>
                      <div style={fLabel}>Website</div>
                      <div style={{...fVal,wordBreak:"break-all"}}>🌐 {siteWebUrl}</div>
                    </div>}
                  </div>
                </div>

                {/* ── Crypto strip ── */}
                <div style={{padding:"8px 12px",background:"rgba(0,0,0,0.15)",borderBottom:"1px solid rgba(255,255,255,0.05)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"6px"}}>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"3px"}}>
                    <svg width={IW} height={IW} viewBox={`0 0 ${IW} ${IW}`} xmlns="http://www.w3.org/2000/svg" style={{display:"block"}}>
                      {iRects.map((r,i)=><rect key={i} x={r.x} y={r.y} width={IC-1} height={IC-1} rx="1" fill={tc} opacity="0.75"/>)}
                    </svg>
                    <span style={{fontSize:"5px",color:"rgba(255,255,255,0.18)",letterSpacing:"0.22em",textTransform:"uppercase"}}>Wallet Print</span>
                  </div>
                  <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"4px"}}>
                    <div style={{opacity:0.6}}>
                      <svg width="36" height="27" viewBox="0 0 48 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="1" y="1" width="46" height="34" rx="5" stroke={tc} strokeOpacity="0.4" strokeWidth="1"/>
                        <rect x="6" y="6" width="36" height="24" rx="3" stroke={tc} strokeOpacity="0.25" strokeWidth="0.8"/>
                        <line x1="16" y1="1" x2="16" y2="6" stroke={tc} strokeOpacity="0.35" strokeWidth="1"/>
                        <line x1="24" y1="1" x2="24" y2="6" stroke={tc} strokeOpacity="0.35" strokeWidth="1"/>
                        <line x1="32" y1="1" x2="32" y2="6" stroke={tc} strokeOpacity="0.35" strokeWidth="1"/>
                        <line x1="16" y1="30" x2="16" y2="35" stroke={tc} strokeOpacity="0.35" strokeWidth="1"/>
                        <line x1="24" y1="30" x2="24" y2="35" stroke={tc} strokeOpacity="0.35" strokeWidth="1"/>
                        <line x1="32" y1="30" x2="32" y2="35" stroke={tc} strokeOpacity="0.35" strokeWidth="1"/>
                        <line x1="1" y1="12" x2="6" y2="12" stroke={tc} strokeOpacity="0.35" strokeWidth="1"/>
                        <line x1="1" y1="18" x2="6" y2="18" stroke={tc} strokeOpacity="0.35" strokeWidth="1"/>
                        <line x1="1" y1="24" x2="6" y2="24" stroke={tc} strokeOpacity="0.35" strokeWidth="1"/>
                        <line x1="42" y1="12" x2="47" y2="12" stroke={tc} strokeOpacity="0.35" strokeWidth="1"/>
                        <line x1="42" y1="18" x2="47" y2="18" stroke={tc} strokeOpacity="0.35" strokeWidth="1"/>
                        <line x1="42" y1="24" x2="47" y2="24" stroke={tc} strokeOpacity="0.35" strokeWidth="1"/>
                        <rect x="13" y="10" width="22" height="16" rx="2" fill={tc} fillOpacity="0.08" stroke={tc} strokeOpacity="0.2" strokeWidth="0.6"/>
                        <line x1="18" y1="10" x2="18" y2="26" stroke={tc} strokeOpacity="0.15" strokeWidth="0.6"/>
                        <line x1="24" y1="10" x2="24" y2="26" stroke={tc} strokeOpacity="0.15" strokeWidth="0.6"/>
                        <line x1="30" y1="10" x2="30" y2="26" stroke={tc} strokeOpacity="0.15" strokeWidth="0.6"/>
                        <line x1="13" y1="15" x2="35" y2="15" stroke={tc} strokeOpacity="0.15" strokeWidth="0.6"/>
                        <line x1="13" y1="21" x2="35" y2="21" stroke={tc} strokeOpacity="0.15" strokeWidth="0.6"/>
                      </svg>
                    </div>
                    <span style={{fontSize:"6px",color:"rgba(255,255,255,0.22)",letterSpacing:"0.16em",textTransform:"uppercase"}}>Solana Pay</span>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"3px"}}>
                    <div style={{padding:"4px",background:"#0D0D1A",borderRadius:"5px",border:"1px solid rgba(255,255,255,0.08)"}}>
                      <div style={{width:"49px",height:"49px",display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"1px"}}>
                        {Array.from({length:49}).map((_,i)=>(
                          <div key={i} style={{background:QR_ON.has(i)?tc:"transparent",borderRadius:"1px"}}/>
                        ))}
                      </div>
                    </div>
                    <span style={{fontSize:"5px",color:"rgba(255,255,255,0.18)",letterSpacing:"0.22em",textTransform:"uppercase",textAlign:"center"}}>Scan to Send</span>
                  </div>
                </div>

                {/* ── Content ── */}
                {(siteBio||siteManifesto)&&(
                  <div style={{padding:"8px 12px",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                    {siteBio&&<div style={{marginBottom:siteManifesto?"6px":0,background:"rgba(255,255,255,0.03)",borderRadius:"6px",padding:"6px 8px"}}>
                      <div style={{fontSize:"6px",color:"rgba(255,255,255,0.28)",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:"3px"}}>About</div>
                      <div style={{fontSize:"9px",color:"rgba(232,232,240,0.65)",lineHeight:1.5,wordBreak:"break-word"}}>{siteBio}</div>
                    </div>}
                    {siteManifesto&&<div style={{background:"rgba(255,255,255,0.03)",borderRadius:"6px",padding:"6px 8px"}}>
                      <div style={{fontSize:"6px",color:"rgba(255,255,255,0.28)",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:"3px"}}>Manifesto</div>
                      <div style={{fontSize:"9px",color:"rgba(232,232,240,0.55)",lineHeight:1.5,fontStyle:"italic",wordBreak:"break-word"}}>"{siteManifesto}"</div>
                    </div>}
                  </div>
                )}

                {/* ── MRZ / Blockchain Proof ── */}
                <div style={{padding:"7px 12px",background:"rgba(0,0,0,0.28)",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                  <div style={{fontSize:"6px",color:"rgba(255,255,255,0.22)",letterSpacing:"0.2em",textTransform:"uppercase",marginBottom:"4px",paddingBottom:"3px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>Blockchain Proof</div>
                  <div style={{fontSize:"7px",fontFamily:"monospace",letterSpacing:"0.04em",lineHeight:1.8}}>
                    <div style={{display:"flex",gap:"6px"}}><span style={{color:"rgba(255,255,255,0.28)",flexShrink:0}}>WALLET</span><span style={{wordBreak:"break-all",color:"rgba(232,232,240,0.45)"}}>{addr||"—"}</span></div>
                  </div>
                </div>

                {/* ── Footer ── */}
                <div style={{padding:"6px 12px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"4px"}}>
                    <div style={{width:"4px",height:"4px",borderRadius:"50%",background:"#10B981"}}/>
                    <span style={{fontSize:"8px",color:"rgba(255,255,255,0.18)"}}>Stored permanently on Arweave</span>
                  </div>
                  <span style={{fontSize:"8px",color:"rgba(255,255,255,0.12)",letterSpacing:"0.08em"}}>2026</span>
                </div>
              </>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
