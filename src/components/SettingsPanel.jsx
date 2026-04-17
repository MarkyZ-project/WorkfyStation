import Toggle from "./Toggle";

const NEON = "#ff6b9d";

export default function SettingsPanel({ dark, glowOn, toggleDark, toggleGlow, onLogout, onClose, c }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "flex-start" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />
      <div style={{ position: "relative", zIndex: 1, marginTop: 60, marginLeft: 12, width: 300, background: c.surface2, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, boxShadow: "0 8px 40px rgba(0,0,0,0.4)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: c.text }}>Impostazioni</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: c.textMuted, cursor: "pointer", fontSize: 20 }}>×</button>
        </div>
        {[
          { label: "Tema scuro", desc: "Sfondo nero con neon", val: dark, toggle: toggleDark },
          { label: "Effetti luce", desc: "Particelle e animazioni glow", val: glowOn, toggle: toggleGlow },
        ].map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: `1px solid ${c.border}` }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: c.text }}>{s.label}</div>
              <div style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>{s.desc}</div>
            </div>
            <Toggle on={s.val} onToggle={s.toggle} />
          </div>
        ))}
        <div style={{ paddingTop: 16 }}>
          <button onClick={onLogout} style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1px solid ${NEON}`, background: "rgba(255,20,147,0.08)", color: NEON, fontSize: 14, cursor: "pointer", fontWeight: 500 }}>
            Esci dall'account
          </button>
        </div>
      </div>
    </div>
  );
}