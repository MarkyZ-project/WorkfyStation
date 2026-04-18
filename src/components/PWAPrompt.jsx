import { useState, useEffect } from "react";

const NEON = "#ff6b9d";
const NEON2 = "#ff1493";

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

  useEffect(() => {
    // Non mostrare se già installata o già rifiutata
    if (isStandalone()) return;
    if (localStorage.getItem("wfy_pwa_dismissed")) return;

    if (isIOS()) {
      setPlatform("ios");
      setTimeout(() => setShow(true), 3000);
      return;
    }
    if (isAndroid()) setPlatform("android");

    // Ascolta evento installazione (Chrome/Android)
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShow(true), 3000);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Su desktop mostra comunque la guida dopo 5 secondi
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
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferredPrompt(null);
      setShow(false);
    }
  };

  const dismiss = () => {
    setShow(false);
    localStorage.setItem("wfy_pwa_dismissed", "1");
  };

  const dismissTemp = () => setShow(false);

  if (!show) return null;

  const glowText = `0 0 8px ${NEON}, 0 0 16px ${NEON2}`;

  // Steps per iOS
  const iosSteps = [
    { icon: "1️⃣", text: <>Tocca il bottone <strong style={{ color: NEON }}>Condividi</strong> in basso nel browser Safari</> },
    { icon: "2️⃣", text: <>Scorri e tocca <strong style={{ color: NEON }}>"Aggiungi a schermata Home"</strong></> },
    { icon: "3️⃣", text: <>Tocca <strong style={{ color: NEON }}>"Aggiungi"</strong> in alto a destra</> },
  ];

  // Steps per Android/Desktop
  const androidSteps = [
    { icon: "1️⃣", text: <>Tocca il menu <strong style={{ color: NEON }}>⋮</strong> in alto a destra nel browser</> },
    { icon: "2️⃣", text: <>Tocca <strong style={{ color: NEON }}>"Aggiungi a schermata Home"</strong> o <strong style={{ color: NEON }}>"Installa app"</strong></> },
    { icon: "3️⃣", text: <>Tocca <strong style={{ color: NEON }}>"Aggiungi"</strong> per confermare</> },
  ];

  return (
    <>
      <style>{`
        @keyframes slideUp { from{opacity:0;transform:translateY(100px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse-neon { 0%,100%{box-shadow:0 0 10px ${NEON};} 50%{box-shadow:0 0 25px ${NEON},0 0 50px ${NEON2};} }
      `}</style>

      {/* Overlay sfondo */}
      <div onClick={dismissTemp} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, backdropFilter: "blur(4px)" }} />

      {/* Card principale */}
      <div style={{
        position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
        width: "min(440px, calc(100vw - 32px))",
        background: c.bg === "#0a0a0a" ? "#13101a" : "#fff",
        border: `1px solid ${NEON}`,
        borderRadius: 20, padding: 28, zIndex: 201,
        animation: "slideUp .4s cubic-bezier(.16,1,.3,1) both",
        boxShadow: `0 0 40px rgba(255,107,157,0.2), 0 20px 60px rgba(0,0,0,0.5)`,
      }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: "rgba(255,107,157,0.15)",
            border: `1.5px solid ${NEON}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26, flexShrink: 0,
            animation: "pulse-neon 3s infinite",
          }}>W</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: c.text, textShadow: glowText }}>
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
              background: "rgba(255,107,157,0.08)",
              border: "1px solid rgba(255,107,157,0.2)",
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
            background: `linear-gradient(135deg, ${NEON}, ${NEON2})`,
            border: "none", color: "#fff", fontSize: 15, fontWeight: 600,
            cursor: "pointer", marginBottom: 10,
            boxShadow: `0 4px 20px rgba(255,107,157,0.4)`,
          }}>
            {installed ? "✓ Installata!" : "⬇ Installa ora"}
          </button>
        )}

        {/* Guida manuale iOS */}
        {platform === "ios" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: c.textHint, letterSpacing: 1, marginBottom: 4 }}>COME INSTALLARE SU IPHONE / IPAD</div>
            {iosSteps.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(255,107,157,0.06)", border: "1px solid rgba(255,107,157,0.15)" }}>
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
              { icon: "1️⃣", text: <>Clicca sull'icona <strong style={{ color: NEON }}>⊕</strong> nella barra degli indirizzi di Chrome</> },
              { icon: "2️⃣", text: <>Oppure clicca <strong style={{ color: NEON }}>⋮ → Installa WorkfyStation</strong></> },
              { icon: "3️⃣", text: <>Clicca <strong style={{ color: NEON }}>"Installa"</strong> per confermare</> },
            ]).map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(255,107,157,0.06)", border: "1px solid rgba(255,107,157,0.15)" }}>
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
            border: `1px solid ${NEON}`, background: "rgba(255,107,157,0.1)",
            color: NEON, fontSize: 13, cursor: "pointer", fontWeight: 500,
          }}>
            Dopo
          </button>
        </div>
      </div>
    </>
  );
}