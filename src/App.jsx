import { useState, useEffect } from "react";

import RegisterScreen from "./components/RegisterScreen";
import WelcomeScreen from "./components/WelcomeScreen";
import SettingsPanel from "./components/SettingsPanel";
import PWAPrompt from "./components/PWAPrompt";

import HomeApp from "./tools/HomeApp";
import NoteApp from "./tools/NoteApp";
import FoglioApp from "./tools/FoglioApp";
import DisegnoApp from "./tools/DisegnoApp";
import SlideApp from "./tools/SlideApp";
import CalcApp from "./tools/CalcApp";
import CronometroApp from "./tools/CronometroApp";
import ConvertitoreApp from "./tools/ConvertitoreApp";
import ImageEditorApp from "./tools/ImageEditorApp";
import PdfViewerApp from "./tools/PdfViewerApp";

const NEON = "#ff6b9d";
const NEON2 = "#ff1493";

function useTheme() {
  const [dark, setDark] = useState(() => localStorage.getItem("wfy_dark") !== "false");
  const [glowOn, setGlowOn] = useState(() => localStorage.getItem("wfy_glow") !== "false");
  const toggleDark = () => { const v = !dark; setDark(v); localStorage.setItem("wfy_dark", v); };
  const toggleGlow = () => { const v = !glowOn; setGlowOn(v); localStorage.setItem("wfy_glow", v); };
  return { dark, glowOn, toggleDark, toggleGlow };
}

function getC(dark) {
  return dark ? {
    bg: "#0a0a0a", surface: "rgba(255,255,255,0.02)", surface2: "#16161f",
    border: "rgba(255,107,157,0.18)", text: "#fff",
    textMuted: "rgba(255,255,255,0.6)", textHint: "rgba(255,107,157,0.5)",
    accent: NEON, accentBg: "rgba(255,107,157,0.15)", accentBg2: "rgba(255,107,157,0.06)",
    headerBg: "rgba(255,255,255,0.01)", inputBg: "rgba(255,107,157,0.05)",
  } : {
    bg: "#f5f5f7", surface: "#ffffff", surface2: "#f0f0f5",
    border: "#e0e0e0", text: "#111", textMuted: "#555", textHint: "#999",
    accent: NEON2, accentBg: "rgba(255,20,147,0.08)", accentBg2: "rgba(255,20,147,0.04)",
    headerBg: "#ffffff", inputBg: "#fafafa",
  };
}

// Strumenti nella navbar mobile (solo i principali)
const MOBILE_TABS = [
  { id: "home",         label: "Home",     icon: "🏠" },
  { id: "note",         label: "Note",     icon: "✏️" },
  { id: "disegno",      label: "Disegno",  icon: "🎨" },
  { id: "calc",         label: "Calcola",  icon: "🧮" },
  { id: "more",         label: "Altro",    icon: "⋯"  },
];

const TOOLS = [
  { id: "home",         label: "Home",         icon: "🏠" },
  { id: "note",         label: "Note",         icon: "✏️" },
  { id: "foglio",       label: "Foglio",       icon: "📊" },
  { id: "disegno",      label: "Disegno",      icon: "🎨" },
  { id: "slide",        label: "Slide",        icon: "📐" },
  { id: "calc",         label: "Calcola",      icon: "🧮" },
  { id: "cronometro",   label: "Cronometro",   icon: "⏱️" },
  { id: "convertitore", label: "Convertitore", icon: "🔄" },
  { id: "imageeditor",  label: "Editor Img",   icon: "🖼️" },
  { id: "pdfviewer",    label: "PDF / Word",   icon: "📄" },
];

// ── Drawer "Altro" per mobile ──
function MobileDrawer({ c, active, setActive, onClose, glowOn }) {
  const glowTx = glowOn ? `0 0 10px ${NEON}, 0 0 20px ${NEON}` : "none";
  const otherTools = TOOLS.filter(t => !["home","note","disegno","calc"].includes(t.id));
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, backdropFilter: "blur(4px)" }} />
      <div style={{
        position: "fixed", bottom: 64, left: 0, right: 0, zIndex: 301,
        background: c.bg === "#0a0a0a" ? "#13101a" : "#fff",
        border: `1px solid ${c.border}`, borderRadius: "20px 20px 0 0",
        padding: "20px 16px 16px",
        animation: "slideUp .3s cubic-bezier(.16,1,.3,1) both",
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: c.border, margin: "0 auto 20px" }} />
        <div style={{ fontSize: 12, color: c.textHint, letterSpacing: 1, marginBottom: 12 }}>TUTTI GLI STRUMENTI</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {TOOLS.map(t => (
            <button key={t.id} onClick={() => { setActive(t.id); onClose(); }}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                padding: "14px 8px", borderRadius: 14, cursor: "pointer",
                border: `1px solid ${active === t.id ? c.accent : c.border}`,
                background: active === t.id ? c.accentBg : c.surface,
                color: active === t.id ? c.accent : c.textMuted,
              }}>
              <span style={{ fontSize: 24 }}>{t.icon}</span>
              <span style={{ fontSize: 10, fontWeight: active === t.id ? 600 : 400, textAlign: "center" }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export default function App() {
  const [screen, setScreen] = useState(() => localStorage.getItem("wfy_user") ? "app" : "register");
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem("wfy_user") || "null"); } catch (e) { return null; } });
  const [active, setActive] = useState("home");
  const [sideOpen, setSideOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { dark, glowOn, toggleDark, toggleGlow } = useTheme();
  const c = getC(dark);

  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  const handleRegister = (u) => { setUser(u); setScreen("welcome"); };
  const handleWelcomeDone = () => setScreen("app");
  const logout = () => { localStorage.removeItem("wfy_user"); setUser(null); setScreen("register"); setSettingsOpen(false); };

  if (screen === "register") return <RegisterScreen onDone={handleRegister} />;
  if (screen === "welcome")  return <WelcomeScreen user={user} onDone={handleWelcomeDone} />;

  const email = user?.email || "guest";

  const panels = {
    home:         <HomeApp        c={c} user={user} onNavigate={setActive} />,
    note:         <NoteApp        email={email} c={c} />,
    foglio:       <FoglioApp      email={email} c={c} />,
    disegno:      <DisegnoApp     email={email} c={c} />,
    slide:        <SlideApp       email={email} c={c} />,
    calc:         <CalcApp        c={c} />,
    cronometro:   <CronometroApp  c={c} />,
    convertitore: <ConvertitoreApp c={c} />,
    imageeditor:  <ImageEditorApp  c={c} />,
    pdfviewer:    <PdfViewerApp    c={c} />,
  };

  const glowS  = (color, size) => glowOn ? `0 0 ${size}px ${color}, 0 0 ${size * 2}px ${color}` : "none";
  const glowTx = glowOn ? `0 0 10px ${NEON}, 0 0 20px ${NEON}, 0 0 40px ${NEON2}` : "none";
  const currentTool = TOOLS.find(t => t.id === active);

  return (
    <div style={{ display: "flex", height: "100vh", background: c.bg, fontFamily: "'Segoe UI', sans-serif", overflow: "hidden", color: c.text }}>
      <style>{`
        ${glowOn ? `@keyframes glow-pulse{0%,100%{box-shadow:0 0 8px ${NEON};}50%{box-shadow:0 0 20px ${NEON},0 0 40px ${NEON2};}}` : ""}
        @keyframes slideUp { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        .tool-btn:hover { background: ${c.accentBg} !important; }
        .tool-btn.active { background: ${c.accentBg} !important; border-color: ${c.accent} !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${c.border}; border-radius: 2px; }
        input::placeholder, textarea::placeholder { color: ${c.textHint}; }
        button:active { transform: scale(0.97); }
      `}</style>

      {/* Modali */}
      {settingsOpen && (
        <SettingsPanel dark={dark} glowOn={glowOn} toggleDark={toggleDark} toggleGlow={toggleGlow} onLogout={logout} onClose={() => setSettingsOpen(false)} c={c} />
      )}
      {showDrawer && (
        <MobileDrawer c={c} active={active} setActive={setActive} onClose={() => setShowDrawer(false)} glowOn={glowOn} />
      )}

      {/* ── SIDEBAR DESKTOP ── */}
      {!isMobile && !focusMode && (
        <div style={{ width: sideOpen ? 220 : 64, background: c.surface, borderRight: `1px solid ${c.border}`, display: "flex", flexDirection: "column", transition: "width .3s", overflow: "hidden", flexShrink: 0 }}>
          <div style={{ padding: "16px 12px", borderBottom: `1px solid ${c.border}`, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: c.accentBg, border: `1px solid ${c.accent}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: glowS(NEON, 6), animation: glowOn ? "glow-pulse 3s infinite" : "none" }}>
              <img src="/WorkfyStation/WorkfyLogo.png" alt="logo" style={{ width: 24, height: 24, objectFit: "contain", borderRadius: 4 }} />
            </div>
            {sideOpen && <div style={{ color: c.accent, fontWeight: 600, fontSize: 14, textShadow: glowTx, whiteSpace: "nowrap", flex: 1 }}>WorkfyStation</div>}
            {sideOpen && <button onClick={() => setSettingsOpen(true)} style={{ background: "transparent", border: `1px solid ${c.border}`, borderRadius: 8, width: 30, height: 30, cursor: "pointer", color: c.textMuted, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>⚙</button>}
          </div>

          {sideOpen && user && (
            <div style={{ padding: "10px 16px", borderBottom: `1px solid ${c.border}` }}>
              <div style={{ color: c.textHint, fontSize: 11, letterSpacing: 1 }}>UTENTE</div>
              <div style={{ color: c.text, fontSize: 13, marginTop: 2, fontWeight: 500 }}>{user.nome} {user.cognome}</div>
              <div style={{ color: c.textMuted, fontSize: 11, marginTop: 1 }}>{user.email}</div>
            </div>
          )}

          <div style={{ flex: 1, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 4, overflowY: "auto" }}>
            {TOOLS.map(t => (
              <button key={t.id} onClick={() => setActive(t.id)}
                className={`tool-btn${active === t.id ? " active" : ""}`}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, border: "1px solid transparent", background: "transparent", cursor: "pointer", color: active === t.id ? c.accent : c.textMuted, fontSize: 13, textAlign: "left", transition: "all .2s", width: "100%", fontWeight: active === t.id ? "500" : "400" }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{t.icon}</span>
                {sideOpen && <span style={{ whiteSpace: "nowrap" }}>{t.label}</span>}
              </button>
            ))}
          </div>

          <div style={{ padding: "10px 8px", borderTop: `1px solid ${c.border}` }}>
            {!sideOpen && <button onClick={() => setSettingsOpen(true)} style={{ width: "100%", padding: "8px", borderRadius: 8, border: `1px solid ${c.border}`, background: "transparent", cursor: "pointer", color: c.textMuted, fontSize: 16, marginBottom: 4 }}>⚙</button>}
            <button onClick={() => setSideOpen(!sideOpen)} style={{ width: "100%", padding: "8px", borderRadius: 8, border: `1px solid ${c.border}`, background: "transparent", cursor: "pointer", color: c.textMuted, fontSize: 12 }}>
              {sideOpen ? "« Chiudi" : "»"}
            </button>
          </div>
        </div>
      )}

      {/* ── CONTENUTO PRINCIPALE ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        {!focusMode && (
          <div style={{ padding: isMobile ? "10px 16px" : "14px 24px", borderBottom: `1px solid ${c.border}`, background: c.headerBg, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            {isMobile && (
              <div style={{ width: 30, height: 30, borderRadius: 8, background: c.accentBg, border: `1px solid ${c.accent}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src="/WorkfyStation/WorkfyLogo.png" alt="logo" style={{ width: 20, height: 20, objectFit: "contain" }} />
              </div>
            )}
            <span style={{ fontSize: isMobile ? 18 : 22 }}>{currentTool?.icon}</span>
            <span style={{ fontSize: isMobile ? 15 : 17, fontWeight: 500, color: c.text }}>{currentTool?.label}</span>
            <div style={{ flex: 1 }} />
            {/* Bottone Focus Mode */}
            <button onClick={() => setFocusMode(true)} title="Modalità focus"
              style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${c.border}`, background: "transparent", cursor: "pointer", color: c.textMuted, fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
              <span>⛶</span>
              {!isMobile && <span>Focus</span>}
            </button>
            {isMobile && (
              <button onClick={() => setSettingsOpen(true)} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${c.border}`, background: "transparent", cursor: "pointer", color: c.textMuted, fontSize: 16 }}>⚙</button>
            )}
            {!isMobile && <div style={{ fontSize: 12, color: c.textHint }}>v1.0</div>}
          </div>
        )}

        {/* ── MODALITÀ FOCUS ── */}
        {focusMode && (
          <div style={{ position: "fixed", inset: 0, zIndex: 400, background: c.bg, display: "flex", flexDirection: "column", animation: "fadeIn .3s ease" }}>
            {/* Barra sottile in alto */}
            <div style={{ display: "flex", alignItems: "center", padding: "8px 16px", gap: 10, borderBottom: `1px solid ${c.border}`, background: c.headerBg }}>
              <span style={{ fontSize: 16 }}>{currentTool?.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: c.text }}>{currentTool?.label}</span>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: c.textHint }}>Modalità Focus</span>
              <button onClick={() => setFocusMode(false)}
                style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${c.accent}`, background: c.accentBg, cursor: "pointer", color: c.accent, fontSize: 12, fontWeight: 500 }}>
                ✕ Esci dal focus
              </button>
            </div>
            {/* Contenuto a schermo intero */}
            <div style={{ flex: 1, padding: 20, overflow: "auto" }}>
              <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, height: "calc(100% - 48px)" }}>
                {panels[active]}
              </div>
            </div>
          </div>
        )}

        {/* Pannello normale */}
        {!focusMode && (
          <div style={{ flex: 1, padding: isMobile ? 10 : 20, overflow: "auto", paddingBottom: isMobile ? 74 : 20 }}>
            <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 16, padding: isMobile ? 14 : 24, height: "calc(100% - 48px)" }}>
              {panels[active]}
            </div>
          </div>
        )}
      </div>

      {/* ── NAVBAR MOBILE IN BASSO ── */}
      {isMobile && !focusMode && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200,
          background: c.bg === "#0a0a0a" ? "rgba(10,10,10,0.95)" : "rgba(255,255,255,0.95)",
          borderTop: `1px solid ${c.border}`,
          backdropFilter: "blur(12px)",
          display: "flex", alignItems: "center",
          paddingBottom: "env(safe-area-inset-bottom)",
          height: 64,
        }}>
          {MOBILE_TABS.map(t => {
            const isActive = t.id === "more" ? false : active === t.id;
            return (
              <button key={t.id}
                onClick={() => t.id === "more" ? setShowDrawer(true) : setActive(t.id)}
                style={{
                  flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", gap: 3, padding: "8px 0",
                  border: "none", background: "transparent", cursor: "pointer",
                  color: isActive ? c.accent : c.textMuted,
                  transition: "all .2s",
                }}>
                <div style={{
                  width: 36, height: 26, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center",
                  background: isActive ? c.accentBg : "transparent",
                  transition: "all .2s",
                }}>
                  <span style={{ fontSize: 18 }}>{t.icon}</span>
                </div>
                <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400 }}>{t.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}