import { useState } from "react";
import WorkingCodeWelcome from "./WorkingCodeWelcome";

const ACCENT  = "#ff2d55";
const ACCENT2 = "#ff0020";
const GOLD    = "#FFD700";

const WC_TOOLS = [
  { id: "welcome",   label: "Home",       icon: "🏠" },
  { id: "editor",    label: "Editor",     icon: "⌨️" },
  { id: "terminal",  label: "Terminale",  icon: "🖥️" },
  { id: "projects",  label: "Progetti",   icon: "📁" },
  { id: "lessons",   label: "Lezioni",    icon: "🎓" },
  { id: "snippets",  label: "Snippets",   icon: "🧩" },
];

function ComingSoon({ label, icon }) {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 16,
      color: "#fff", fontFamily: "'Segoe UI', sans-serif",
      background: "#080000",
    }}>
      <div style={{ fontSize: 64, opacity: .2 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 700, opacity: .5 }}>{label}</div>
      <div style={{
        padding: "8px 20px", borderRadius: 20,
        border: `1px solid ${ACCENT}55`, background: `rgba(255,45,85,0.1)`,
        fontSize: 12, color: ACCENT, fontWeight: 600, letterSpacing: 1,
      }}>
        IN ARRIVO
      </div>
    </div>
  );
}

export default function WorkingCodeApp({ user, onSwitchBack }) {
  const [active, setActive]     = useState("welcome");
  const [sideOpen, setSideOpen] = useState(true);

  const currentTool = WC_TOOLS.find(t => t.id === active) || WC_TOOLS[0];

  function renderPanel() {
    if (active === "welcome") return <WorkingCodeWelcome onEnter={() => setActive("editor")} />;
    return <ComingSoon label={currentTool.label} icon={currentTool.icon} />;
  }

  return (
    <div style={{
      display: "flex", height: "100vh", overflow: "hidden",
      background: "#080000", fontFamily: "'Segoe UI', sans-serif",
    }}>
      <style>{`
        @keyframes wc-fadeIn { from{opacity:0} to{opacity:1} }
        .wc-tool-btn:hover { background: rgba(255,45,85,0.09) !important; }
        .wc-tool-btn.wc-active { background: rgba(255,45,85,0.14) !important; border-color: ${ACCENT}77 !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,45,85,0.2); border-radius: 2px; }
      `}</style>

      {/* ── SIDEBAR ── */}
      <div style={{
        width: sideOpen ? 220 : 64, flexShrink: 0,
        background: "#0d0000",
        borderRight: `1px solid rgba(255,45,85,0.15)`,
        display: "flex", flexDirection: "column",
        transition: "width .3s", overflow: "hidden",
      }}>

        {/* Header */}
        <div style={{
          padding: "16px 12px",
          borderBottom: `1px solid rgba(255,45,85,0.12)`,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          {/* Logo */}
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: `rgba(255,45,85,0.12)`,
            border: `1px solid ${ACCENT}66`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 12px ${ACCENT}44`,
            overflow: "hidden",
          }}>
            <img
              src="/WorkfyStation/WorkingCodeLogo.png"
              alt="WorkingCode"
              style={{ width: 24, height: 24, objectFit: "contain" }}
              onError={e => { e.target.style.display = "none"; e.target.parentElement.innerHTML = '<span style="font-size:18px">💻</span>'; }}
            />
          </div>

          {sideOpen && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
                background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT2})`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>WorkingCode</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>IDE · Gratuito</div>
            </div>
          )}

          {sideOpen && (
            <button
              onClick={onSwitchBack}
              title="Torna a WorkfyStation"
              style={{
                background: "transparent", border: `1px solid rgba(255,45,85,0.2)`,
                borderRadius: 8, width: 28, height: 28, cursor: "pointer",
                color: "rgba(255,255,255,0.4)", fontSize: 13, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all .2s",
              }}>←</button>
          )}
        </div>

        {/* Account */}
        {sideOpen && user && (
          <div style={{ padding: "10px 14px", borderBottom: `1px solid rgba(255,45,85,0.08)` }}>
            <div style={{ fontSize: 10, color: `rgba(255,45,85,0.6)`, letterSpacing: 1, marginBottom: 4 }}>ACCOUNT</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{user.nome} {user.cognome}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>{user.email}</div>

            {/* Badge Workfy PLUS */}
            <div style={{
              marginTop: 10, padding: "7px 10px", borderRadius: 8,
              border: `1px solid ${GOLD}44`, background: `rgba(255,215,0,0.06)`,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ fontSize: 12 }}>👑</span>
              <span style={{
                fontSize: 11, fontWeight: 700,
                background: `linear-gradient(90deg, ${GOLD}, #FFA500)`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>Workfy PLUS</span>
              <span style={{
                marginLeft: "auto", fontSize: 9, padding: "2px 6px",
                borderRadius: 6, background: `rgba(255,215,0,0.15)`,
                color: GOLD, fontWeight: 700, letterSpacing: .5,
              }}>ATTIVO</span>
            </div>
          </div>
        )}

        {/* Strumenti */}
        <div style={{ flex: 1, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 3, overflowY: "auto" }}>
          {WC_TOOLS.map(t => (
            <button key={t.id}
              className={`wc-tool-btn${active === t.id ? " wc-active" : ""}`}
              onClick={() => setActive(t.id)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "9px 12px", borderRadius: 9,
                border: "1px solid transparent",
                background: "transparent", cursor: "pointer",
                color: active === t.id ? ACCENT : "rgba(255,255,255,0.4)",
                fontSize: 13, textAlign: "left", width: "100%",
                fontWeight: active === t.id ? 600 : 400,
                transition: "all .2s",
              }}>
              <span style={{ fontSize: 17, flexShrink: 0 }}>{t.icon}</span>
              {sideOpen && <span style={{ whiteSpace: "nowrap" }}>{t.label}</span>}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: "10px 8px", borderTop: `1px solid rgba(255,45,85,0.08)` }}>
          <button
            onClick={() => setSideOpen(!sideOpen)}
            style={{
              width: "100%", padding: "7px", borderRadius: 8,
              border: `1px solid rgba(255,45,85,0.15)`,
              background: "transparent", cursor: "pointer",
              color: "rgba(255,255,255,0.3)", fontSize: 12,
              transition: "all .2s",
            }}>
            {sideOpen ? "« Chiudi" : "»"}
          </button>
        </div>
      </div>

      {/* ── AREA PRINCIPALE ── */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
        animation: "wc-fadeIn .3s ease",
      }}>

        {/* Header */}
        <div style={{
          padding: "12px 24px",
          borderBottom: `1px solid rgba(255,45,85,0.12)`,
          display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
          background: `rgba(255,45,85,0.02)`,
        }}>
          <span style={{ fontSize: 18 }}>{currentTool.icon}</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{currentTool.label}</span>
          <div style={{ flex: 1 }}/>
          <div style={{
            fontSize: 11, padding: "4px 10px", borderRadius: 12,
            border: `1px solid ${ACCENT}44`, color: ACCENT,
            background: `rgba(255,45,85,0.08)`,
          }}>WorkingCode · Gratuito</div>
          <button
            onClick={onSwitchBack}
            style={{
              padding: "6px 12px", borderRadius: 8, cursor: "pointer",
              border: `1px solid rgba(255,45,85,0.2)`,
              background: "transparent", color: "rgba(255,255,255,0.4)",
              fontSize: 12, display: "flex", alignItems: "center", gap: 6,
              transition: "all .2s",
            }}>
            ← WorkfyStation
          </button>
        </div>

        {/* Contenuto */}
        <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
          {renderPanel()}
        </div>
      </div>
    </div>
  );
}
