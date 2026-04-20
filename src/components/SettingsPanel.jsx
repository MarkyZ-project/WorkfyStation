import Toggle from "./Toggle";

const NEON_PRESETS = [
  { label: "Rosa",    color: "#ff6b9d", color2: "#ff1493" },
  { label: "Viola",   color: "#a855f7", color2: "#7c3aed" },
  { label: "Blu",     color: "#3b82f6", color2: "#1d4ed8" },
  { label: "Ciano",   color: "#06b6d4", color2: "#0891b2" },
  { label: "Verde",   color: "#10b981", color2: "#059669" },
  { label: "Arancio", color: "#f97316", color2: "#ea580c" },
  { label: "Giallo",  color: "#eab308", color2: "#ca8a04" },
  { label: "Rosso",   color: "#ef4444", color2: "#dc2626" },
];

const BG_PRESETS_DARK = [
  { label: "Nero",       bg: "#0a0a0a", bg2: "#111118" },
  { label: "Blu notte",  bg: "#050510", bg2: "#0a0a1f" },
  { label: "Verde notte",bg: "#020f0a", bg2: "#061a10" },
  { label: "Viola notte",bg: "#0a0510", bg2: "#110a1a" },
  { label: "Grafite",    bg: "#0f0f0f", bg2: "#1a1a1a" },
];

const BG_PRESETS_LIGHT = [
  { label: "Bianco",    bg: "#f5f5f7", bg2: "#ffffff" },
  { label: "Crema",     bg: "#faf7f2", bg2: "#ffffff" },
  { label: "Azzurro",   bg: "#f0f4ff", bg2: "#ffffff" },
  { label: "Verde",     bg: "#f0faf4", bg2: "#ffffff" },
  { label: "Rosa",      bg: "#fff0f5", bg2: "#ffffff" },
];

export default function SettingsPanel({
  dark, glowOn, toggleDark, toggleGlow,
  neon, neon2, setNeon, setNeon2,
  bgDark, setBgDark, bgLight, setBgLight,
  onLogout, onClose, c,
}) {
  const bgPresets = dark ? BG_PRESETS_DARK : BG_PRESETS_LIGHT;
  const currentBg = dark ? bgDark : bgLight;
  const setCurrentBg = dark ? setBgDark : setBgLight;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "flex-start" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />
      <div style={{ position: "relative", zIndex: 1, marginTop: 60, marginLeft: 12, width: 320, background: c.surface2, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, boxShadow: "0 8px 40px rgba(0,0,0,0.4)", maxHeight: "calc(100vh - 80px)", overflow: "auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: c.text }}>Impostazioni</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: c.textMuted, cursor: "pointer", fontSize: 20 }}>×</button>
        </div>

        {/* Tema chiaro/scuro */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: c.textHint, letterSpacing: 1, marginBottom: 12 }}>TEMA</div>
          {[
            { label: "Tema scuro", desc: "Sfondo scuro con neon", val: dark, toggle: toggleDark },
            { label: "Effetti luce", desc: "Particelle e animazioni glow", val: glowOn, toggle: toggleGlow },
          ].map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${c.border}` }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: c.text }}>{s.label}</div>
                <div style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>{s.desc}</div>
              </div>
              <Toggle on={s.val} onToggle={s.toggle} />
            </div>
          ))}
        </div>

        {/* Colore neon */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: c.textHint, letterSpacing: 1, marginBottom: 12 }}>COLORE NEON</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {NEON_PRESETS.map(p => (
              <div key={p.color} onClick={() => { setNeon(p.color); setNeon2(p.color2); }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `linear-gradient(135deg, ${p.color}, ${p.color2})`,
                  border: neon === p.color ? `2.5px solid ${c.text}` : `2px solid transparent`,
                  boxShadow: neon === p.color ? `0 0 10px ${p.color}` : "none",
                  transition: "all .2s",
                }} />
                <span style={{ fontSize: 9, color: c.textHint }}>{p.label}</span>
              </div>
            ))}
          </div>
          {/* Colore personalizzato */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 13, color: c.textMuted, flex: 1 }}>Personalizzato</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 10, color: c.textHint, marginBottom: 3 }}>Principale</div>
                <input type="color" value={neon} onChange={e => setNeon(e.target.value)}
                  style={{ width: 36, height: 36, border: "none", borderRadius: 8, cursor: "pointer", padding: 2, background: "transparent" }} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: c.textHint, marginBottom: 3 }}>Secondario</div>
                <input type="color" value={neon2} onChange={e => setNeon2(e.target.value)}
                  style={{ width: 36, height: 36, border: "none", borderRadius: 8, cursor: "pointer", padding: 2, background: "transparent" }} />
              </div>
            </div>
          </div>
          {/* Anteprima */}
          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: `linear-gradient(135deg, ${neon}22, ${neon2}11)`, border: `1px solid ${neon}44`, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${neon}, ${neon2})`, boxShadow: `0 0 12px ${neon}` }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: neon, textShadow: `0 0 8px ${neon}` }}>Anteprima neon</div>
              <div style={{ fontSize: 11, color: c.textMuted }}>Così apparirà nell'app</div>
            </div>
          </div>
        </div>

        {/* Colore sfondo */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: c.textHint, letterSpacing: 1, marginBottom: 12 }}>
            SFONDO — {dark ? "MODALITÀ SCURA" : "MODALITÀ CHIARA"}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {bgPresets.map(p => (
              <div key={p.bg} onClick={() => setCurrentBg(p.bg)}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: p.bg,
                  border: currentBg === p.bg ? `2.5px solid ${neon}` : `1.5px solid ${c.border}`,
                  boxShadow: currentBg === p.bg ? `0 0 8px ${neon}` : "none",
                  transition: "all .2s",
                }} />
                <span style={{ fontSize: 9, color: c.textHint }}>{p.label}</span>
              </div>
            ))}
          </div>
          {/* Sfondo personalizzato */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 13, color: c.textMuted, flex: 1 }}>Sfondo personalizzato</div>
            <input type="color" value={currentBg} onChange={e => setCurrentBg(e.target.value)}
              style={{ width: 36, height: 36, border: "none", borderRadius: 8, cursor: "pointer", padding: 2, background: "transparent" }} />
          </div>
        </div>

        {/* Reset colori */}
        <button onClick={() => {
          setNeon("#ff6b9d"); setNeon2("#ff1493");
          setBgDark("#0a0a0a"); setBgLight("#f5f5f7");
        }} style={{ width: "100%", padding: "10px", borderRadius: 10, border: `1px solid ${c.border}`, background: "transparent", color: c.textMuted, fontSize: 13, cursor: "pointer", marginBottom: 10 }}>
          Ripristina colori predefiniti
        </button>

        {/* Esci */}
        <button onClick={onLogout} style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1px solid ${neon}`, background: `${neon}18`, color: neon, fontSize: 14, cursor: "pointer", fontWeight: 500 }}>
          Esci dall'account
        </button>
      </div>
    </div>
  );
}