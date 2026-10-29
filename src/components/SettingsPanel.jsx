import { useState, useEffect } from "react";
import Toggle from "./Toggle";
import { isTauriApp, getDesktopInfo, checkForUpdate, installUpdate } from "../workingcode/tauriBridge";

const NEON_PRESETS = [
  { label: "B&W",      color: "#ffffff", color2: "#ffffff", isBW: true },
  { label: "Viola",    color: "#a855f7", color2: "#7c3aed" },
  { label: "Rosa",     color: "#ff6b9d", color2: "#ff1493" },
  { label: "Blu",      color: "#3b82f6", color2: "#1d4ed8" },
  { label: "Ciano",    color: "#06b6d4", color2: "#0891b2" },
  { label: "Verde",    color: "#10b981", color2: "#059669" },
  { label: "Arancio",  color: "#f97316", color2: "#ea580c" },
  { label: "Giallo",   color: "#eab308", color2: "#ca8a04" },
  { label: "Rosso",    color: "#ef4444", color2: "#dc2626" },
];

const GLASS_PRESETS = [
  {
    id: "aurora",
    label: "Aurora 3D",
    sub: "Sfere Ciano, Corallo & Indaco",
    preview: "linear-gradient(135deg, #5b6ef7 0%, #8e84fc 50%, #fb7185 100%)",
    orb1: "radial-gradient(circle at 30% 30%, #ffffff, #38bdf8)",
    orb2: "radial-gradient(circle at 30% 30%, #ffffff, #fb7185)",
  },
  {
    id: "orchid",
    label: "Orchid Soft",
    sub: "Pastello Rosa & Lilla",
    preview: "linear-gradient(135deg, #e599f7 0%, #f3c4fb 55%, #a2d2ff 100%)",
    orb1: "radial-gradient(circle at 30% 30%, #ffffff, #e879f9)",
    orb2: "radial-gradient(circle at 30% 30%, #ffffff, #7dd3fc)",
  },
  {
    id: "azure",
    label: "Azure Glass",
    sub: "Cristallo Blu & Cobalto",
    preview: "linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)",
    orb1: "radial-gradient(circle at 30% 30%, #ffffff, #00b4d8)",
    orb2: "radial-gradient(circle at 30% 30%, #bae6fd, #023e8a)",
  },
  {
    id: "crystal",
    label: "Cristallo Tema",
    sub: "Usa i tuoi colori attuali",
    preview: "linear-gradient(135deg, #334155 0%, #64748b 50%, #cbd5e1 100%)",
    orb1: "radial-gradient(circle at 30% 30%, #ffffff, #94a3b8)",
    orb2: "radial-gradient(circle at 30% 30%, #ffffff, #c084fc)",
  },
];

const BG_PRESETS_DARK = [
  { label: "Nero puro",   bg: "#000000" },
  { label: "Nero notte",  bg: "#0a0a0a" },
  { label: "Grafite",     bg: "#141414" },
  { label: "Viola notte", bg: "#0e0918" },
  { label: "Blu notte",   bg: "#060814" },
  { label: "Verde notte", bg: "#030f09" },
];

const BG_PRESETS_LIGHT = [
  { label: "Bianco puro",   bg: "#ffffff" },
  { label: "Bianco neve",   bg: "#f5f5f7" },
  { label: "Grigio chiaro", bg: "#f0f0f2" },
  { label: "Crema",         bg: "#faf7f2" },
  { label: "Azzurro",       bg: "#f0f4ff" },
  { label: "Rosa",          bg: "#fff0f5" },
];

const TIMEOUT_OPTIONS = [
  { value: 0,    label: "Mai" },
  { value: 5,    label: "5 minuti" },
  { value: 15,   label: "15 minuti" },
  { value: 30,   label: "30 minuti" },
  { value: 60,   label: "1 ora" },
];

function hashPassword(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

export default function SettingsPanel({
  dark, glowOn, glass,
  glassPreset = "aurora", setGlassPreset,
  glassBlur = 34, setGlassBlur,
  glassOrbs = true, toggleGlassOrbs,
  toggleDark, toggleGlow, toggleGlass,
  neon, neon2, setNeon, setNeon2,
  bgDark, setBgDark, bgLight, setBgLight,
  timeout, setTimeout: setTimeoutVal,
  onLogout, onLock, onClose, c,
}) {
  const [section, setSection] = useState("tema");
  const [pinStep, setPinStep] = useState("idle"); // idle | enter | confirm
  const [pinInput, setPinInput] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinErr, setPinErr] = useState("");
  const [pinSuccess, setPinSuccess] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passErr, setPassErr] = useState("");
  const [passSuccess, setPassSuccess] = useState("");

  const bgPresets = dark ? BG_PRESETS_DARK : BG_PRESETS_LIGHT;
  const currentBg = dark ? bgDark : bgLight;
  const setCurrentBg = dark ? setBgDark : setBgLight;
  const hasPin = !!localStorage.getItem("wfy_pin");

  // ── PIN ──
  const handlePinDigit = (d) => {
    if (pinStep === "enter") {
      const np = pinInput + d;
      setPinInput(np);
      if (np.length === 6) setPinStep("confirm");
    } else if (pinStep === "confirm") {
      const np = pinConfirm + d;
      setPinConfirm(np);
      if (np.length === 6) {
        if (np === pinInput) {
          localStorage.setItem("wfy_pin", np);
          setPinStep("idle"); setPinInput(""); setPinConfirm("");
          setPinSuccess("PIN impostato con successo!"); setPinErr("");
          setTimeout(() => setPinSuccess(""), 3000);
        } else {
          setPinErr("I PIN non coincidono. Riprova."); setPinStep("enter"); setPinInput(""); setPinConfirm("");
        }
      }
    }
  };

  const removePin = () => {
    localStorage.removeItem("wfy_pin");
    setPinStep("idle"); setPinInput(""); setPinConfirm("");
    setPinSuccess("PIN rimosso."); setPinErr("");
    setTimeout(() => setPinSuccess(""), 3000);
  };

  // ── CAMBIO PASSWORD ──
  const changePassword = () => {
    setPassErr(""); setPassSuccess("");
    const user = JSON.parse(localStorage.getItem("wfy_user") || "null");
    if (!user) return;
    const accounts = JSON.parse(localStorage.getItem("wfy_accounts") || "[]");
    const acc = accounts.find(a => a.email === user.email);
    if (!acc) return;
    if (acc.passwordHash !== hashPassword(oldPassword)) { setPassErr("Password attuale errata!"); return; }
    if (newPassword.length < 6) { setPassErr("Nuova password min. 6 caratteri!"); return; }
    if (newPassword !== confirmNewPassword) { setPassErr("Le password non coincidono!"); return; }
    const updated = accounts.map(a => a.email === user.email ? { ...a, passwordHash: hashPassword(newPassword) } : a);
    localStorage.setItem("wfy_accounts", JSON.stringify(updated));
    setOldPassword(""); setNewPassword(""); setConfirmNewPassword("");
    setPassSuccess("Password cambiata con successo!"); setTimeout(() => setPassSuccess(""), 3000);
  };

  const [isDesktop, setIsDesktop] = useState(false);
  const [desktopInfo, setDesktopInfo] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState("");

  useEffect(() => {
    isTauriApp().then((ok) => {
      setIsDesktop(ok);
      if (ok) getDesktopInfo().then((info) => setDesktopInfo(info));
    });
  }, []);

  const handleUpdate = async () => {
    setUpdating(true);
    setUpdateMsg("⏳ Controllo aggiornamenti firmati in corso...");
    try {
      if (!isDesktop) {
        setUpdateMsg("ℹ️ Per aggiornare l'app desktop scarica il setup qui sotto.");
        return;
      }
      const update = await checkForUpdate();
      if (!update) {
        setUpdateMsg("✅ L'applicazione è già aggiornata all'ultima versione disponibile!");
        return;
      }
      setUpdateMsg(`📥 Trovata versione v${update.version}. Download e verifica firma...`);
      await installUpdate(update, (progress) => {
        if (progress !== null) {
          setUpdateMsg(`📥 Download: ${Math.round(progress * 100)}%...`);
        }
      });
      setUpdateMsg("✅ Aggiornamento completato con successo! Riavvia l'applicazione.");
    } catch (e) {
      setUpdateMsg("❌ Errore aggiornamento: " + (e.message || e));
    } finally {
      setUpdating(false);
    }
  };

  const SECTIONS = [
    { id: "tema",      label: "🎨 Tema & Stile" },
    { id: "sicurezza", label: "🔒 Sicurezza" },
    { id: "sessione",  label: "⏱ Sessione" },
    { id: "account",   label: "👤 Account" },
    { id: "aggiorna",  label: "🔄 Aggiornamenti" },
  ];

  const inp = { width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.inputBg, color: c.text, fontSize: 13, outline: "none", boxSizing: "border-box" };
  const lbl = (t) => <div style={{ fontSize: 10, color: c.textHint, letterSpacing: 1, marginBottom: 6, marginTop: 14, fontWeight: 600 }}>{t}</div>;

  const currentPin = pinStep === "enter" ? pinInput : pinStep === "confirm" ? pinConfirm : "";
  const pinDots = (val) => Array.from({ length: 6 }, (_, i) => (
    <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: i < val.length ? c.accent : "transparent", border: `2px solid ${i < val.length ? c.accent : c.border}`, transition: "all .2s" }}/>
  ));

  const activePresetObj = GLASS_PRESETS.find((p) => p.id === glassPreset) || GLASS_PRESETS[0];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "flex-start" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}/>
      <div
        className={c.glass ? "glass-card-3d glass-edge" : ""}
        style={{
          position: "relative", zIndex: 1, marginTop: 56, marginLeft: 14, width: 380, maxWidth: "calc(100vw - 28px)",
          background: c.glass
            ? (c.dark
                ? "linear-gradient(135deg, rgba(28, 25, 54, 0.72) 0%, rgba(18, 16, 38, 0.56) 100%)"
                : "linear-gradient(135deg, rgba(255, 255, 255, 0.76) 0%, rgba(255, 255, 255, 0.44) 100%)")
            : c.surface2,
          border: `1.5px solid ${c.glass ? c.glassBtnBorder : c.border}`,
          borderRadius: 24,
          boxShadow: c.glass ? c.glassShadow : "0 12px 48px rgba(0,0,0,0.6)",
          display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 76px)", overflow: "hidden",
          ...(c.glass ? { backdropFilter: `blur(${glassBlur}px) saturate(220%)`, WebkitBackdropFilter: `blur(${glassBlur}px) saturate(220%)` } : {}),
        }}
      >

        {/* Header */}
        <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${c.border}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: c.text }}>Impostazioni</div>
            {glass && (
              <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 12, background: c.glassBtn, border: `1px solid ${c.glassBtnBorder}`, color: c.text, fontWeight: 700 }}>
                LIQUID 3D
              </span>
            )}
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: c.textMuted, cursor: "pointer", fontSize: 20 }}>×</button>
        </div>

        {/* Tabs sezioni */}
        <div style={{ position: "relative", zIndex: 1, display: "flex", gap: 4, padding: "10px 12px", borderBottom: `1px solid ${c.border}`, flexShrink: 0, flexWrap: "wrap" }}>
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)}
              style={{
                padding: "6px 10px", borderRadius: 10,
                border: `1px solid ${section===s.id?(c.glass?c.glassBtnBorder:c.accent):c.border}`,
                background: section===s.id?(c.glass?c.glassBtn:c.accentBg):"transparent",
                color: section===s.id?(c.glass?c.text:c.accent):c.textMuted,
                cursor: "pointer", fontSize: 11, fontWeight: section===s.id?600:400, transition: "all .2s",
              }}>
              {s.label}
            </button>
          ))}
        </div>

        <div style={{ position: "relative", zIndex: 1, overflow: "auto", flex: 1, padding: "14px 16px" }}>

          {/* ── TEMA ── */}
          {section === "tema" && <>
            <div style={{ fontSize: 11, color: c.textHint, letterSpacing: 1, marginBottom: 8, fontWeight: 600 }}>MODALITÀ E VETRO 3D</div>
            
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${c.border}` }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: c.text }}>{dark ? "Modalità Scura (Notte)" : "Modalità Chiara (Luce & Pastello)"}</div>
                <div style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>{dark ? "Profondità scura o vetro notturno" : "Luminosa, ideale per l'effetto vetro pastello"}</div>
              </div>
              <Toggle on={dark} onToggle={toggleDark} color={c.accent} dark={dark}/>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${c.border}` }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: c.text }}>Effetti luce & Glow</div>
                <div style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>Riflessi luminosi e bagliori dinamici</div>
              </div>
              <Toggle on={glowOn} onToggle={toggleGlow} color={c.accent} dark={dark}/>
            </div>

            {/* ── LIQUID GLASS 3D TOGGLE ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${c.border}` }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: c.text, display: "flex", alignItems: "center", gap: 8 }}>
                  Liquid Glass 3D
                  <span style={{
                    fontSize: 9, padding: "2px 8px", borderRadius: 10,
                    background: glass ? "linear-gradient(135deg, rgba(56,189,248,0.35), rgba(236,72,153,0.35))" : "transparent",
                    border: `1px solid ${glass ? c.glassBtnBorder || c.accent : c.border}`,
                    color: glass ? c.text : c.textHint,
                    fontWeight: 700, letterSpacing: 0.5,
                  }}>3D GLASS</span>
                </div>
                <div style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>
                  Vetro smerigliato con rifrazione 3D, bordi speculari e sfere fluttuanti
                </div>
              </div>
              <Toggle on={glass} onToggle={toggleGlass} color={c.accent} dark={dark}/>
            </div>

            {/* ── STUDIO DI PERSONALIZZAZIONE LIQUID GLASS ── */}
            {glass && (
              <div style={{
                marginTop: 12,
                padding: 14,
                borderRadius: 18,
                background: c.dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.38)",
                border: `1.5px solid ${c.glassBorder}`,
                boxShadow: "inset 0 1.5px 1px rgba(255,255,255,0.65)",
              }}>
                {/* Live 3D Glassmorphism Mini Showcase (Ispirato alle 3 immagini di riferimento) */}
                <div style={{
                  position: "relative",
                  height: 158,
                  borderRadius: 16,
                  background: activePresetObj.preview,
                  overflow: "hidden",
                  padding: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 10px 26px rgba(0,0,0,0.22)",
                  marginBottom: 14,
                }}>
                  {/* Sfere 3D dietro il vetro nella card di anteprima */}
                  {glassOrbs && (
                    <>
                      <div style={{
                        position: "absolute", top: 8, left: 16, width: 64, height: 64, borderRadius: "50%",
                        background: activePresetObj.orb1,
                        boxShadow: "inset 0 6px 12px rgba(255,255,255,0.9), 0 8px 20px rgba(0,0,0,0.2)",
                      }} />
                      <div style={{
                        position: "absolute", bottom: 8, right: 14, width: 76, height: 76, borderRadius: "50%",
                        background: activePresetObj.orb2,
                        boxShadow: "inset 0 6px 12px rgba(255,255,255,0.9), 0 8px 20px rgba(0,0,0,0.22)",
                      }} />
                    </>
                  )}

                  {/* Lastra di vetro smerigliato sopra le sfere */}
                  <div style={{
                    position: "relative",
                    zIndex: 2,
                    width: "92%",
                    padding: "12px 14px",
                    borderRadius: 16,
                    background: "linear-gradient(135deg, rgba(255,255,255,0.44) 0%, rgba(255,255,255,0.16) 100%)",
                    backdropFilter: `blur(${Math.round(glassBlur * 0.6)}px) saturate(210%)`,
                    WebkitBackdropFilter: `blur(${Math.round(glassBlur * 0.6)}px) saturate(210%)`,
                    border: "1.5px solid rgba(255,255,255,0.75)",
                    boxShadow: "0 14px 32px rgba(0,0,0,0.22), inset 0 1.5px 1px rgba(255,255,255,0.9)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}>
                    {/* Riga 1: 4 Squircle Icon 3D (come Immagine 1) */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                      {[
                        { icon: "🕒", label: "Storia", col: "#3b82f6" },
                        { icon: "▶️", label: "Media",  col: "#0ea5e9" },
                        { icon: "⭐", label: "Preferiti", col: "#f97316" },
                        { icon: "❤️", label: "Like",   col: "#f43f5e" },
                      ].map((it, idx) => (
                        <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <div style={{
                            width: 38, height: 38, borderRadius: 12,
                            background: "linear-gradient(145deg, rgba(255,255,255,0.82), rgba(255,255,255,0.32))",
                            border: "1px solid rgba(255,255,255,0.9)",
                            boxShadow: `0 6px 14px ${it.col}44, inset 0 1.5px 1px #ffffff`,
                            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
                          }}>
                            <span style={{ filter: `drop-shadow(0 2px 4px ${it.col}88)` }}>{it.icon}</span>
                          </div>
                          <span style={{ fontSize: 9, fontWeight: 600, color: "#ffffff", textShadow: "0 1px 3px rgba(0,0,0,0.25)" }}>{it.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Riga 2: Barra Pill Glassmorphism (come Immagine 3) */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{
                        flex: 1, padding: "5px 10px", borderRadius: 20,
                        background: "linear-gradient(135deg, rgba(255,255,255,0.45), rgba(255,255,255,0.18))",
                        border: "1px solid rgba(255,255,255,0.75)",
                        color: "#ffffff", fontSize: 10, fontWeight: 500,
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                      }}>
                        <span>🔍 Liquid Glass...</span>
                        <span>▾</span>
                      </div>
                      <div style={{
                        width: 24, height: 24, borderRadius: "50%",
                        background: "linear-gradient(135deg, rgba(255,255,255,0.55), rgba(255,255,255,0.2))",
                        border: "1px solid rgba(255,255,255,0.85)",
                        color: "#fff", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center",
                      }}>★</div>
                    </div>
                  </div>
                </div>

                {/* Selettore Atmosfera Liquid Glass (4 Preset) */}
                <div style={{ fontSize: 10, fontWeight: 700, color: c.text, letterSpacing: 0.8, marginBottom: 8 }}>
                  ATMOSFERA LIQUID GLASS
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                  {GLASS_PRESETS.map((p) => {
                    const active = glassPreset === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setGlassPreset?.(p.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 10px",
                          borderRadius: 12,
                          border: active ? "2px solid #ffffff" : `1px solid ${c.border}`,
                          background: active
                            ? "linear-gradient(135deg, rgba(255,255,255,0.34), rgba(255,255,255,0.14))"
                            : "rgba(255,255,255,0.08)",
                          color: c.text,
                          cursor: "pointer",
                          textAlign: "left",
                          boxShadow: active ? "0 6px 18px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.8)" : "none",
                          transition: "all 0.2s",
                        }}
                      >
                        <div style={{
                          width: 26, height: 26, borderRadius: 8,
                          background: p.preview,
                          border: "1.5px solid rgba(255,255,255,0.85)",
                          flexShrink: 0,
                        }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {p.label}
                          </div>
                          <div style={{ fontSize: 9, color: c.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {p.sub}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Slider Smerigliatura (Blur) */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: c.text, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>Intensità Smerigliatura (Blur)</span>
                    <span style={{ fontWeight: 700 }}>{glassBlur}px</span>
                  </div>
                  <input
                    type="range"
                    min={16}
                    max={48}
                    step={2}
                    value={glassBlur}
                    onChange={(e) => setGlassBlur?.(parseInt(e.target.value, 10))}
                    style={{ width: "100%", cursor: "pointer", accentColor: c.accent }}
                  />
                </div>

                {/* Toggle Sfere 3D */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 6, borderTop: `1px solid ${c.border}` }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: c.text }}>Sfere 3D Fluttuanti</div>
                    <div style={{ fontSize: 10, color: c.textMuted }}>Sfere luminose rifratte dietro i pannelli</div>
                  </div>
                  <Toggle on={glassOrbs} onToggle={toggleGlassOrbs} color={c.accent} dark={dark} />
                </div>
              </div>
            )}

            {lbl("STILE E ACCENTO")}
            <div style={{ fontSize: 11, color: c.textMuted, marginBottom: 8 }}>
              Scegli <strong>B&W (Bianco e Nero)</strong> o attiva un colore neon:
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              {NEON_PRESETS.map(p => {
                const isSelected = (p.isBW && (neon === "#ffffff" || neon === "#fff")) || (!p.isBW && neon === p.color);
                return (
                  <div key={p.label} onClick={() => { setNeon(p.color); setNeon2(p.color2); }}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer" }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: p.isBW ? (dark ? "#ffffff" : "#000000") : `linear-gradient(135deg,${p.color},${p.color2})`,
                      border: isSelected ? `2.5px solid ${c.text}` : `1.5px solid ${c.border}`,
                      boxShadow: isSelected ? (p.isBW ? "0 0 10px rgba(255,255,255,0.4)" : `0 0 10px ${p.color}`) : "none",
                      transition: "all .2s",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: p.isBW ? (dark ? "#000" : "#fff") : "#fff",
                      fontSize: 10, fontWeight: 700,
                    }}>
                      {p.isBW ? "BW" : ""}
                    </div>
                    <span style={{ fontSize: 9, color: isSelected ? c.accent : c.textHint, fontWeight: isSelected ? 600 : 400 }}>{p.label}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: c.textMuted }}>Colore personalizzato:</span>
              <input type="color" value={neon} onChange={e => { setNeon(e.target.value); setNeon2(e.target.value); }} style={{ width: 34, height: 28, border: "none", borderRadius: 6, cursor: "pointer", padding: 1 }}/>
            </div>

            {lbl("SFONDO BASE")}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              {bgPresets.map(p => (
                <div key={p.bg} onClick={() => setCurrentBg(p.bg)}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: p.bg, border: currentBg === p.bg ? `2.5px solid ${c.accent}` : `1.5px solid ${c.border}`, boxShadow: currentBg === p.bg ? `0 0 6px ${c.accent}` : "none", transition: "all .2s" }}/>
                  <span style={{ fontSize: 8, color: currentBg === p.bg ? c.accent : c.textHint }}>{p.label}</span>
                </div>
              ))}
              <input type="color" value={currentBg} onChange={e => setCurrentBg(e.target.value)} style={{ width: 32, height: 32, border: "none", borderRadius: 8, cursor: "pointer", padding: 1 }} title="Personalizzato"/>
            </div>

            <button onClick={() => { setNeon("#ffffff"); setNeon2("#ffffff"); setBgDark("#000000"); setBgLight("#ffffff"); setGlassPreset?.("aurora"); setGlassBlur?.(34); }}
              style={{ width: "100%", padding: "9px", borderRadius: 10, border: `1px solid ${c.border}`, background: "transparent", color: c.textMuted, cursor: "pointer", fontSize: 12, marginTop: 8 }}>
              Ripristina predefiniti
            </button>
          </>}

          {/* ── SICUREZZA ── */}
          {section === "sicurezza" && <>
            {/* PIN */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: c.text, marginBottom: 4 }}>PIN di sblocco</div>
              <div style={{ fontSize: 12, color: c.textMuted, marginBottom: 12 }}>
                {hasPin ? "PIN attivo — usa 6 cifre per sbloccare rapidamente." : "Imposta un PIN a 6 cifre per sblocco rapido."}
              </div>

              {pinSuccess && <div style={{ padding: "8px 12px", background: "rgba(16,185,129,0.1)", border: "1px solid #10b981", borderRadius: 8, color: "#10b981", fontSize: 12, marginBottom: 8 }}>{pinSuccess}</div>}
              {pinErr && <div style={{ padding: "8px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid #ef4444", borderRadius: 8, color: "#ef4444", fontSize: 12, marginBottom: 8 }}>{pinErr}</div>}

              {pinStep === "idle" && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { setPinStep("enter"); setPinInput(""); setPinConfirm(""); setPinErr(""); }}
                    style={{ flex: 1, padding: "9px", borderRadius: 9, border: `1px solid ${c.accent}`, background: c.accentBg, color: c.accent, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
                    {hasPin ? "Cambia PIN" : "+ Imposta PIN"}
                  </button>
                  {hasPin && <button onClick={removePin}
                    style={{ padding: "9px 14px", borderRadius: 9, border: "1px solid #ef4444", background: "rgba(239,68,68,0.08)", color: "#ef4444", cursor: "pointer", fontSize: 13 }}>
                    Rimuovi
                  </button>}
                </div>
              )}

              {(pinStep === "enter" || pinStep === "confirm") && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                  <div style={{ fontSize: 13, color: c.textMuted }}>
                    {pinStep === "enter" ? "Inserisci nuovo PIN (6 cifre)" : "Conferma PIN"}
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>{pinDots(currentPin)}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, width: "100%" }}>
                    {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((d,i) => (
                      <button key={i} onClick={() => { if (d==="⌫") { if(pinStep==="enter") setPinInput(p=>p.slice(0,-1)); else setPinConfirm(p=>p.slice(0,-1)); } else if(d!=="") handlePinDigit(String(d)); }}
                        style={{ height: 48, borderRadius: 10, border: `1px solid ${d===""?"transparent":c.border}`, background: d===""?"transparent":"rgba(255,255,255,0.04)", color: c.text, fontSize: d==="⌫"?16:18, cursor: d===""?"default":"pointer" }}>
                        {d}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => { setPinStep("idle"); setPinInput(""); setPinConfirm(""); setPinErr(""); }}
                    style={{ fontSize: 12, color: c.textMuted, background: "transparent", border: "none", cursor: "pointer" }}>
                    Annulla
                  </button>
                </div>
              )}
            </div>

            <div style={{ height: 1, background: c.border, margin: "8px 0 16px" }}/>

            {/* Cambio password */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: c.text, marginBottom: 4 }}>Cambia password</div>
              {passSuccess && <div style={{ padding: "8px 12px", background: "rgba(16,185,129,0.1)", border: "1px solid #10b981", borderRadius: 8, color: "#10b981", fontSize: 12, marginBottom: 8 }}>{passSuccess}</div>}
              {passErr && <div style={{ padding: "8px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid #ef4444", borderRadius: 8, color: "#ef4444", fontSize: 12, marginBottom: 8 }}>{passErr}</div>}
              {lbl("PASSWORD ATTUALE")}
              <input type="password" value={oldPassword} onChange={e=>setOldPassword(e.target.value)} placeholder="Password attuale" style={inp}/>
              {lbl("NUOVA PASSWORD")}
              <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Minimo 6 caratteri" style={inp}/>
              {lbl("CONFERMA NUOVA")}
              <input type="password" value={confirmNewPassword} onChange={e=>setConfirmNewPassword(e.target.value)} placeholder="Ripeti la password" style={{ ...inp, border: `1px solid ${confirmNewPassword&&confirmNewPassword!==newPassword?"#ef4444":confirmNewPassword&&confirmNewPassword===newPassword?"#10b981":c.border}` }}/>
              <button onClick={changePassword} style={{ width: "100%", marginTop: 10, padding: "9px", borderRadius: 9, border: `1px solid ${c.accent}`, background: c.accentBg, color: c.accent, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
                Aggiorna password
              </button>
            </div>
          </>}

          {/* ── SESSIONE ── */}
          {section === "sessione" && <>
            <div style={{ fontSize: 14, fontWeight: 600, color: c.text, marginBottom: 4 }}>Blocco automatico</div>
            <div style={{ fontSize: 12, color: c.textMuted, marginBottom: 14 }}>L'app si blocca automaticamente dopo il tempo di inattività selezionato.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {TIMEOUT_OPTIONS.map(opt => (
                <div key={opt.value} onClick={() => setTimeoutVal(opt.value)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", borderRadius: 10, border: `1px solid ${timeout===opt.value?c.accent:c.border}`, background: timeout===opt.value?c.accentBg:"transparent", cursor: "pointer", transition: "all .2s" }}>
                  <span style={{ fontSize: 14, color: timeout===opt.value?c.accent:c.text }}>{opt.label}</span>
                  {timeout===opt.value && <div style={{ width: 18, height: 18, borderRadius: "50%", background: c.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: c.accentText || "#000", fontWeight: 700 }}>✓</div>}
                </div>
              ))}
            </div>
            <button onClick={onLock} style={{ width: "100%", marginTop: 16, padding: "11px", borderRadius: 10, border: `1px solid ${c.accent}`, background: c.accentBg, color: c.accent, cursor: "pointer", fontSize: 14, fontWeight: 500 }}>
              🔒 Blocca ora
            </button>
          </>}

          {/* ── ACCOUNT ── */}
          {section === "account" && <>
            <div style={{ padding: "14px 16px", background: c.accentBg2, borderRadius: 12, marginBottom: 16 }}>
              {(() => { const u = JSON.parse(localStorage.getItem("wfy_user")||"null"); return u ? <>
                <div style={{ fontSize: 11, color: c.textHint, letterSpacing: 1, marginBottom: 8 }}>ACCOUNT ATTIVO</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: c.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: c.accentText || "#000" }}>{u.nome?.charAt(0).toUpperCase()}</div>
                  <div><div style={{ fontSize: 14, fontWeight: 500, color: c.text }}>{u.nome} {u.cognome}</div><div style={{ fontSize: 12, color: c.textMuted }}>{u.email}</div></div>
                </div>
              </> : null; })()}
            </div>
            <button onClick={onLogout} style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1px solid #ef4444`, background: "rgba(239,68,68,0.08)", color: "#ef4444", fontSize: 14, cursor: "pointer", fontWeight: 500, marginBottom: 16 }}>
              Esci dall'account
            </button>
            <div style={{ textAlign: "center", fontSize: 11, color: c.textHint }}>
              <a href={`${import.meta.env.BASE_URL}TERMS.txt`} target="_blank" rel="noopener noreferrer" style={{ color: c.textHint, textDecoration: "underline" }}>Termini, Condizioni & Privacy Policy</a>
              <div style={{ marginTop: 4 }}>App Offline-First. I dati rimangono solo sul tuo dispositivo.</div>
            </div>
          </>}

          {/* ── AGGIORNAMENTI ── */}
          {section === "aggiorna" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{
                padding: "14px 16px", borderRadius: 12,
                background: isDesktop ? "rgba(16,185,129,0.08)" : "rgba(59,130,246,0.08)",
                border: `1px solid ${isDesktop ? "rgba(16,185,129,0.3)" : "rgba(59,130,246,0.3)"}`,
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <div style={{ fontSize: 28 }}>{isDesktop ? "💻" : "🌐"}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: c.text }}>
                    {isDesktop
                      ? `WorkfyStation Desktop (${desktopInfo?.platform === "macos" ? "macOS" : "Windows"})`
                      : "WorkfyStation Web"}
                  </div>
                  <div style={{ fontSize: 11, color: c.textMuted }}>
                    {isDesktop
                      ? `Versione v${desktopInfo?.version || "1.1.0"} installata · Utente: ${desktopInfo?.username || "Utente"}`
                      : "Stai visualizzando l'applicazione tramite browser web."}
                  </div>
                </div>
              </div>

              {/* Status & Update Button */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: c.text, marginBottom: 6 }}>
                  Aggiornamento Applicazione
                </div>
                <div style={{ fontSize: 12, color: c.textMuted, marginBottom: 12, lineHeight: 1.5 }}>
                  {isDesktop
                    ? "Clicca sul pulsante per scaricare l'ultimo aggiornamento e installarlo automaticamente sopra a questa versione."
                    : "Scarica l'applicazione desktop per Windows o macOS per avere il terminale nativo e la suite completa offline."}
                </div>

                {updateMsg && (
                  <div style={{
                    padding: "10px 14px", borderRadius: 8, fontSize: 12, marginBottom: 10,
                    background: updateMsg.startsWith("❌") ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
                    border: `1px solid ${updateMsg.startsWith("❌") ? "#ef4444" : "#10b981"}`,
                    color: updateMsg.startsWith("❌") ? "#ef4444" : "#10b981",
                  }}>
                    {updateMsg}
                  </div>
                )}

                <button
                  onClick={handleUpdate}
                  disabled={updating}
                  style={{
                    width: "100%", padding: "12px", borderRadius: 10,
                    border: `1px solid ${c.accent}`,
                    background: c.accentBg, color: c.accent,
                    fontSize: 14, fontWeight: 600, cursor: updating ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    marginBottom: 10,
                  }}>
                  {updating ? "⏳ Aggiornamento in corso..." : "🔄 Aggiorna Applicazione Ora"}
                </button>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <a
                    href={`${import.meta.env.BASE_URL}WorkfyStation-Setup.exe`}
                    download="WorkfyStation-Setup.exe"
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      width: "100%", padding: "10px", borderRadius: 10,
                      border: `1px solid ${c.border}`, background: "rgba(255,255,255,0.04)",
                      color: c.text, fontSize: 12, textDecoration: "none", cursor: "pointer",
                      boxSizing: "border-box",
                    }}>
                    🪟 Scarica per Windows (WorkfyStation-Setup.exe)
                  </a>
                  <a
                    href="https://github.com/MarkyZ-project/WorkfyStation/releases/latest/download/WorkfyStation.dmg"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      width: "100%", padding: "10px", borderRadius: 10,
                      border: `1px solid ${c.border}`, background: "rgba(255,255,255,0.04)",
                      color: c.text, fontSize: 12, textDecoration: "none", cursor: "pointer",
                      boxSizing: "border-box",
                    }}>
                    🍎 Scarica per macOS (WorkfyStation.dmg)
                  </a>
                </div>
              </div>

              {/* Guida all'aggiornamento */}
              <div style={{
                marginTop: 6, padding: "12px 14px", borderRadius: 10,
                background: "rgba(255,255,255,0.03)", border: `1px solid ${c.border}`,
                fontSize: 11, color: c.textMuted, lineHeight: 1.6,
              }}>
                <div style={{ fontWeight: 700, color: c.text, marginBottom: 4 }}>
                  💡 Come funziona l'aggiornamento:
                </div>
                <div>• <strong>Nessuna perdita dati:</strong> Note, progetti, impostazioni e account rimangono salvati al 100%.</div>
                <div>• L'installatore aggiorna solo il codice e gli eseguibili dell'applicazione.</div>
                <div>• Una volta completato il setup (richiede circa 5 secondi), riavvia l'app ed è pronta!</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
