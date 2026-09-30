import { useState, useEffect } from "react";

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isAndroid() {
  return /android/i.test(navigator.userAgent);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
}

export default function PWAPrompt({ c }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState("desktop");

  const accent = c?.accent || "#ffffff";
  const accentText = c?.accentText || (accent === "#ffffff" ? "#000000" : "#ffffff");
  const isBW = !c || c.isBW !== false;

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem("wfy_pwa_dismissed")) return;

    if (isIOS()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlatform("ios");
      setTimeout(() => setShow(true), 3000);
      return;
    }
    if (isAndroid()) setPlatform("android");

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShow(true), 3000);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const timer = setTimeout(() => {
      if (!deferredPrompt) setShow(true);
    }, 5000);

    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setTimeout(() => setShow(false), 3000);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
      setTimeout(() => setShow(false), 2000);
    }
  };

  const dismiss = () => {
    setShow(false);
    localStorage.setItem("wfy_pwa_dismissed", "1");
  };

  const dismissTemp = () => setShow(false);

  if (!show) return null;

  // Steps per iOS
  const iosSteps = [
    { icon: "1️⃣", text: <>Tocca il bottone <strong style={{ color: accent }}>Condividi</strong> in basso nel browser Safari</> },
    { icon: "2️⃣", text: <>Scorri e tocca <strong style={{ color: accent }}>"Aggiungi a schermata Home"</strong></> },
    { icon: "3️⃣", text: <>Tocca <strong style={{ color: accent }}>"Aggiungi"</strong> in alto a destra</> },
  ];

  // Steps per Android/Desktop
  const androidSteps = [
    { icon: "1️⃣", text: <>Tocca il menu <strong style={{ color: accent }}>⋮</strong> in alto a destra nel browser</> },
    { icon: "2️⃣", text: <>Tocca <strong style={{ color: accent }}>"Aggiungi a schermata Home"</strong> o <strong style={{ color: accent }}>"Installa app"</strong></> },
    { icon: "3️⃣", text: <>Tocca <strong style={{ color: accent }}>"Aggiungi"</strong> per confermare</> },
  ];

  return (
    <>
      <style>{`
        @keyframes slideUp { from{opacity:0;transform:translateY(100px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Overlay sfondo */}
      <div onClick={dismissTemp} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, backdropFilter: "blur(4px)" }} />

      {/* Card principale */}
      <div style={{
        position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
        width: "min(440px, calc(100vw - 32px))",
        background: c.dark ? (c.isBW ? "#121212" : "#13101a") : "#ffffff",
        border: `1px solid ${c.border}`,
        borderRadius: 20, padding: 28, zIndex: 201,
        animation: "slideUp .4s cubic-bezier(.16,1,.3,1) both",
        boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
      }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: c.accentBg,
            border: `1.5px solid ${c.accent}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 700, flexShrink: 0,
            color: c.accent,
          }}>W</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: c.text }}>
              Installa WorkfyStation
            </div>
            <div style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>
              Aggiungila alla schermata home come app
            </div>
          </div>
          <button onClick={dismissTemp} style={{ marginLeft: "auto", background: "transparent", border: "none", color: c.textHint, cursor: "pointer", fontSize: 22, lineHeight: 1, flexShrink: 0 }}>×</button>
        </div>

        {/* Benefici */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {[
            { icon: "⚡", text: "Più veloce" },
            { icon: "📴", text: "Funziona offline" },
            { icon: "🖥️", text: "Schermo intero" },
            { icon: "🔔", text: "Come app nativa" },
          ].map((b, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "5px 10px", borderRadius: 20,
              background: c.accentBg2,
              border: `1px solid ${c.border}`,
              fontSize: 12, color: c.textMuted,
            }}>
              <span>{b.icon}</span> {b.text}
            </div>
          ))}
        </div>

        {/* Installazione automatica (Chrome/Android) */}
        {deferredPrompt && (
          <button onClick={handleInstall} style={{
            width: "100%", padding: "14px", borderRadius: 12,
            background: accent,
            border: "none", color: accentText, fontSize: 15, fontWeight: 600,
            cursor: "pointer", marginBottom: 10,
            boxShadow: isBW ? "0 4px 20px rgba(255,255,255,0.2)" : `0 4px 20px ${accent}44`,
          }}>
            {installed ? "✓ Installata!" : "⬇ Installa ora"}
          </button>
        )}

        {/* Guida manuale iOS */}
        {platform === "ios" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: c.textHint, letterSpacing: 1, marginBottom: 4 }}>COME INSTALLARE SU IPHONE / IPAD</div>
            {iosSteps.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: c.accentBg2, border: `1px solid ${c.border}` }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{s.icon}</span>
                <span style={{ fontSize: 13, color: c.text, lineHeight: 1.5 }}>{s.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Guida manuale Android/Desktop senza prompt */}
        {!deferredPrompt && platform !== "ios" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: c.textHint, letterSpacing: 1, marginBottom: 4 }}>
              {platform === "android" ? "COME INSTALLARE SU ANDROID" : "COME INSTALLARE SU PC"}
            </div>
            {(platform === "android" ? androidSteps : [
              { icon: "1️⃣", text: <>Clicca sull'icona <strong style={{ color: accent }}>⊕</strong> nella barra degli indirizzi di Chrome</> },
              { icon: "2️⃣", text: <>Oppure clicca <strong style={{ color: accent }}>⋮ → Installa WorkfyStation</strong></> },
              { icon: "3️⃣", text: <>Clicca <strong style={{ color: accent }}>"Installa"</strong> per confermare</> },
            ]).map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: c.accentBg2, border: `1px solid ${c.border}` }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{s.icon}</span>
                <span style={{ fontSize: 13, color: c.text, lineHeight: 1.5 }}>{s.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Bottoni azione */}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={dismiss} style={{
            flex: 1, padding: "10px", borderRadius: 10,
            border: `1px solid ${c.border}`, background: "transparent",
            color: c.textMuted, fontSize: 13, cursor: "pointer",
          }}>
            Non mostrare più
          </button>
          <button onClick={dismissTemp} style={{
            flex: 1, padding: "10px", borderRadius: 10,
            border: `1px solid ${c.border}`, background: c.accentBg,
            color: c.accent, fontSize: 13, cursor: "pointer", fontWeight: 500,
          }}>
            Dopo
          </button>
        </div>
      </div>
    </>
  );
}