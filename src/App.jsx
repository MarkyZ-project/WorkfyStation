import { useState } from "react";

import Particles from "./components/Particles";
import PWAPrompt from "./components/PWAPrompt";
import RegisterScreen from "./components/RegisterScreen";
import WelcomeScreen from "./components/WelcomeScreen";
import SettingsPanel from "./components/SettingsPanel";

import HomeApp from "./tools/HomeApp";
import AIApp from "./tools/AIApp";
import NoteApp from "./tools/NoteApp";
import FoglioApp from "./tools/FoglioApp";
import DisegnoApp from "./tools/DisegnoApp";
import SlideApp from "./tools/SlideApp";
import CalcApp from "./tools/CalcApp";
import CronometroApp from "./tools/CronometroApp";
import ConvertitoreApp from "./tools/ConvertitoreApp";
import ImageEditorApp from "./tools/ImageEditorApp";
import PdfViewerApp from "./tools/PdfViewerApp";

// ── Theme ──
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

// ── Tools list ──
const TOOLS = [
  { id: "home",         label: "Home",         icon: "🏠" },
  { id: "ai",           label: "AI Assistant", icon: "🤖" },
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

// ── Main App ──
export default function App() {
  const [screen, setScreen] = useState(() => localStorage.getItem("wfy_user") ? "app" : "register");
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem("wfy_user") || "null"); } catch (e) { return null; } });
  const [active, setActive] = useState("home");
  const [sideOpen, setSideOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { dark, glowOn, toggleDark, toggleGlow } = useTheme();
  const c = getC(dark);

  const handleRegister = (u) => { setUser(u); setScreen("welcome"); };
  const handleWelcomeDone = () => setScreen("app");
  const logout = () => { localStorage.removeItem("wfy_user"); setUser(null); setScreen("register"); setSettingsOpen(false); };

  if (screen === "register") return <RegisterScreen onDone={handleRegister} />;
  if (screen === "welcome")  return <WelcomeScreen user={user} onDone={handleWelcomeDone} />;

  const email = user?.email || "guest";
  const panels = {
    home:         <HomeApp        c={c} user={user} onNavigate={setActive} />,
    ai:           <AIApp          c={c} />,
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

  return (
    <div style={{ display: "flex", height: "100vh", background: c.bg, fontFamily: "'Segoe UI', sans-serif", overflow: "hidden", color: c.text }}>
      <style>{`
        ${glowOn ? `@keyframes glow-pulse{0%,100%{box-shadow:0 0 8px ${NEON};}50%{box-shadow:0 0 20px ${NEON},0 0 40px ${NEON2};}}` : ""}
        .tool-btn:hover { background: ${c.accentBg} !important; }
        .tool-btn.active { background: ${c.accentBg} !important; border-color: ${c.accent} !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${c.border}; border-radius: 2px; }
        input::placeholder, textarea::placeholder { color: ${c.textHint}; }
        button:active { transform: scale(0.97); }
      `}</style>

      {settingsOpen && (
        <SettingsPanel
          dark={dark} glowOn={glowOn}
          toggleDark={toggleDark} toggleGlow={toggleGlow}
          onLogout={logout} onClose={() => setSettingsOpen(false)} c={c}
        />
      )}

      <PWAPrompt c={c} />

      {/* Sidebar */}
      <div style={{ width: sideOpen ? 220 : 64, background: c.surface, borderRight: `1px solid ${c.border}`, display: "flex", flexDirection: "column", transition: "width .3s", overflow: "hidden", flexShrink: 0 }}>
        <div style={{ padding: "16px 12px", borderBottom: `1px solid ${c.border}`, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: c.accentBg, border: `1px solid ${c.accent}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, boxShadow: glowS(NEON, 6), animation: glowOn ? "glow-pulse 3s infinite" : "none" }}>W</div>
          {sideOpen && <div style={{ color: c.accent, fontWeight: 600, fontSize: 14, textShadow: glowTx, whiteSpace: "nowrap", flex: 1 }}>WorkfyStation</div>}
          {sideOpen && (
            <button onClick={() => setSettingsOpen(true)} style={{ background: "transparent", border: `1px solid ${c.border}`, borderRadius: 8, width: 30, height: 30, cursor: "pointer", color: c.textMuted, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>⚙</button>
          )}
        </div>

        {sideOpen && user && (
          <div style={{ padding: "10px 16px", borderBottom: `1px solid ${c.border}` }}>
            <div style={{ color: c.textHint, fontSize: 11, letterSpacing: 1 }}>UTENTE</div>
            <div style={{ color: c.text, fontSize: 13, marginTop: 2, fontWeight: 500 }}>{user.nome} {user.cognome}</div>
            <div style={{ color: c.textMuted, fontSize: 11, marginTop: 1 }}>{user.email}</div>
          </div>
        )}

        <div style={{ flex: 1, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
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
          {!sideOpen && (
            <button onClick={() => setSettingsOpen(true)} style={{ width: "100%", padding: "8px", borderRadius: 8, border: `1px solid ${c.border}`, background: "transparent", cursor: "pointer", color: c.textMuted, fontSize: 16, marginBottom: 4 }}>⚙</button>
          )}
          <button onClick={() => setSideOpen(!sideOpen)} style={{ width: "100%", padding: "8px", borderRadius: 8, border: `1px solid ${c.border}`, background: "transparent", cursor: "pointer", color: c.textMuted, fontSize: 12 }}>
            {sideOpen ? "« Chiudi" : "»"}
          </button>
        </div>
      </div>

      {/* Main panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "14px 24px", borderBottom: `1px solid ${c.border}`, background: c.headerBg, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22 }}>{TOOLS.find(t => t.id === active)?.icon}</span>
          <span style={{ fontSize: 17, fontWeight: 500, color: c.text }}>{TOOLS.find(t => t.id === active)?.label}</span>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 12, color: c.textHint }}>v1.0</div>
        </div>
        <div style={{ flex: 1, padding: 20, overflow: "auto" }}>
          <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, height: "calc(100% - 48px)" }}>
            {panels[active]}
          </div>
        </div>
      </div>
    </div>
  );
}