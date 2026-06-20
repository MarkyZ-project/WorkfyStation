import { useState } from "react";
import Toggle from "./Toggle";

const NEON = "#ff6b9d";
const NEON2 = "#ff1493";

const NEON_PRESETS = [
  { label:"Rosa",    color:"#ff6b9d", color2:"#ff1493" },
  { label:"Viola",   color:"#a855f7", color2:"#7c3aed" },
  { label:"Blu",     color:"#3b82f6", color2:"#1d4ed8" },
  { label:"Ciano",   color:"#06b6d4", color2:"#0891b2" },
  { label:"Verde",   color:"#10b981", color2:"#059669" },
  { label:"Arancio", color:"#f97316", color2:"#ea580c" },
  { label:"Giallo",  color:"#eab308", color2:"#ca8a04" },
  { label:"Rosso",   color:"#ef4444", color2:"#dc2626" },
];

const BG_PRESETS_DARK = [
  { label:"Nero",        bg:"#0a0a0a" },
  { label:"Blu notte",   bg:"#050510" },
  { label:"Verde notte", bg:"#020f0a" },
  { label:"Viola notte", bg:"#0a0510" },
  { label:"Grafite",     bg:"#0f0f0f" },
];

const BG_PRESETS_LIGHT = [
  { label:"Bianco", bg:"#f5f5f7" },
  { label:"Crema",  bg:"#faf7f2" },
  { label:"Azzurro",bg:"#f0f4ff" },
  { label:"Verde",  bg:"#f0faf4" },
  { label:"Rosa",   bg:"#fff0f5" },
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
  dark, glowOn, toggleDark, toggleGlow,
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

  const SECTIONS = [
    { id:"tema",     label:"🎨 Tema" },
    { id:"sicurezza",label:"🔒 Sicurezza" },
    { id:"sessione", label:"⏱ Sessione" },
    { id:"account",  label:"👤 Account" },
  ];

  const inp = { width:"100%", padding:"8px 10px", borderRadius:8, border:`1px solid ${c.border}`, background:c.inputBg, color:c.text, fontSize:13, outline:"none", boxSizing:"border-box" };
  const lbl = (t) => <div style={{ fontSize:10, color:c.textHint, letterSpacing:1, marginBottom:4, marginTop:10 }}>{t}</div>;

  const currentPin = pinStep === "enter" ? pinInput : pinStep === "confirm" ? pinConfirm : "";
  const pinDots = (val) => Array.from({ length: 6 }, (_, i) => (
    <div key={i} style={{ width:12, height:12, borderRadius:"50%", background: i < val.length ? neon : "transparent", border:`2px solid ${i < val.length ? neon : c.border}`, transition:"all .2s" }}/>
  ));

  return (
    <div style={{ position:"fixed", inset:0, zIndex:100, display:"flex", alignItems:"flex-start", justifyContent:"flex-start" }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.5)" }}/>
      <div style={{ position:"relative", zIndex:1, marginTop:60, marginLeft:12, width:340, background:c.surface2, border:`1px solid ${c.border}`, borderRadius:16, boxShadow:"0 8px 40px rgba(0,0,0,0.4)", display:"flex", flexDirection:"column", maxHeight:"calc(100vh - 80px)", overflow:"hidden" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", borderBottom:`1px solid ${c.border}`, flexShrink:0 }}>
          <div style={{ fontSize:16, fontWeight:600, color:c.text }}>Impostazioni</div>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:c.textMuted, cursor:"pointer", fontSize:20 }}>×</button>
        </div>

        {/* Tabs sezioni */}
        <div style={{ display:"flex", gap:4, padding:"10px 12px", borderBottom:`1px solid ${c.border}`, flexShrink:0, flexWrap:"wrap" }}>
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)}
              style={{ padding:"5px 10px", borderRadius:8, border:`1px solid ${section===s.id?neon:c.border}`, background:section===s.id?c.accentBg:"transparent", color:section===s.id?neon:c.textMuted, cursor:"pointer", fontSize:11, fontWeight:section===s.id?600:400 }}>
              {s.label}
            </button>
          ))}
        </div>

        <div style={{ overflow:"auto", flex:1, padding:"14px 16px" }}>

          {/* ── TEMA ── */}
          {section === "tema" && <>
            <div style={{ fontSize:11, color:c.textHint, letterSpacing:1, marginBottom:10 }}>MODALITÀ</div>
            {[{ label:"Tema scuro", desc:"Sfondo scuro con neon", val:dark, toggle:toggleDark },
              { label:"Effetti luce", desc:"Particelle e animazioni glow", val:glowOn, toggle:toggleGlow }].map((s,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom:`1px solid ${c.border}` }}>
                <div><div style={{ fontSize:14, fontWeight:500, color:c.text }}>{s.label}</div><div style={{ fontSize:11, color:c.textMuted, marginTop:2 }}>{s.desc}</div></div>
                <Toggle on={s.val} onToggle={s.toggle}/>
              </div>
            ))}

            {lbl("COLORE NEON")}
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:10 }}>
              {NEON_PRESETS.map(p => (
                <div key={p.color} onClick={() => { setNeon(p.color); setNeon2(p.color2); }}
                  style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, cursor:"pointer" }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:`linear-gradient(135deg,${p.color},${p.color2})`, border:neon===p.color?`2.5px solid ${c.text}`:"2px solid transparent", boxShadow:neon===p.color?`0 0 8px ${p.color}`:"none", transition:"all .2s" }}/>
                  <span style={{ fontSize:8, color:c.textHint }}>{p.label}</span>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:10 }}>
              <span style={{ fontSize:12, color:c.textMuted }}>Personalizzato:</span>
              <input type="color" value={neon} onChange={e=>setNeon(e.target.value)} style={{ width:34, height:28, border:"none", borderRadius:6, cursor:"pointer", padding:1 }}/>
              <input type="color" value={neon2} onChange={e=>setNeon2(e.target.value)} style={{ width:34, height:28, border:"none", borderRadius:6, cursor:"pointer", padding:1 }}/>
            </div>

            {lbl("SFONDO")}
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:10 }}>
              {bgPresets.map(p => (
                <div key={p.bg} onClick={() => setCurrentBg(p.bg)}
                  style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, cursor:"pointer" }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:p.bg, border:currentBg===p.bg?`2.5px solid ${neon}`:`1.5px solid ${c.border}`, boxShadow:currentBg===p.bg?`0 0 6px ${neon}`:"none", transition:"all .2s" }}/>
                  <span style={{ fontSize:8, color:c.textHint }}>{p.label}</span>
                </div>
              ))}
              <input type="color" value={currentBg} onChange={e=>setCurrentBg(e.target.value)} style={{ width:32, height:32, border:"none", borderRadius:8, cursor:"pointer", padding:1 }} title="Personalizzato"/>
            </div>

            <button onClick={() => { setNeon("#ff6b9d"); setNeon2("#ff1493"); setBgDark("#0a0a0a"); setBgLight("#f5f5f7"); }}
              style={{ width:"100%", padding:"8px", borderRadius:8, border:`1px solid ${c.border}`, background:"transparent", color:c.textMuted, cursor:"pointer", fontSize:12, marginTop:4 }}>
              Ripristina predefiniti
            </button>
          </>}

          {/* ── SICUREZZA ── */}
          {section === "sicurezza" && <>
            {/* PIN */}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:600, color:c.text, marginBottom:4 }}>PIN di sblocco</div>
              <div style={{ fontSize:12, color:c.textMuted, marginBottom:12 }}>
                {hasPin ? "PIN attivo — usa 6 cifre per sbloccare rapidamente." : "Imposta un PIN a 6 cifre per sblocco rapido."}
              </div>

              {pinSuccess && <div style={{ padding:"8px 12px", background:"rgba(16,185,129,0.1)", border:"1px solid #10b981", borderRadius:8, color:"#10b981", fontSize:12, marginBottom:8 }}>{pinSuccess}</div>}
              {pinErr && <div style={{ padding:"8px 12px", background:"rgba(239,68,68,0.1)", border:"1px solid #ef4444", borderRadius:8, color:"#ef4444", fontSize:12, marginBottom:8 }}>{pinErr}</div>}

              {pinStep === "idle" && (
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={() => { setPinStep("enter"); setPinInput(""); setPinConfirm(""); setPinErr(""); }}
                    style={{ flex:1, padding:"9px", borderRadius:9, border:`1px solid ${neon}`, background:c.accentBg, color:neon, cursor:"pointer", fontSize:13, fontWeight:500 }}>
                    {hasPin ? "Cambia PIN" : "+ Imposta PIN"}
                  </button>
                  {hasPin && <button onClick={removePin}
                    style={{ padding:"9px 14px", borderRadius:9, border:"1px solid #ef4444", background:"rgba(239,68,68,0.08)", color:"#ef4444", cursor:"pointer", fontSize:13 }}>
                    Rimuovi
                  </button>}
                </div>
              )}

              {(pinStep === "enter" || pinStep === "confirm") && (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14 }}>
                  <div style={{ fontSize:13, color:c.textMuted }}>
                    {pinStep === "enter" ? "Inserisci nuovo PIN (6 cifre)" : "Conferma PIN"}
                  </div>
                  <div style={{ display:"flex", gap:10 }}>{pinDots(currentPin)}</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, width:"100%" }}>
                    {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((d,i) => (
                      <button key={i} onClick={() => { if (d==="⌫") { if(pinStep==="enter") setPinInput(p=>p.slice(0,-1)); else setPinConfirm(p=>p.slice(0,-1)); } else if(d!=="") handlePinDigit(String(d)); }}
                        style={{ height:48, borderRadius:10, border:`1px solid ${d===""?"transparent":c.border}`, background:d===""?"transparent":"rgba(255,255,255,0.04)", color:c.text, fontSize:d==="⌫"?16:18, cursor:d===""?"default":"pointer" }}>
                        {d}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => { setPinStep("idle"); setPinInput(""); setPinConfirm(""); setPinErr(""); }}
                    style={{ fontSize:12, color:c.textMuted, background:"transparent", border:"none", cursor:"pointer" }}>
                    Annulla
                  </button>
                </div>
              )}
            </div>

            <div style={{ height:1, background:c.border, margin:"8px 0 16px" }}/>

            {/* Cambio password */}
            <div>
              <div style={{ fontSize:14, fontWeight:600, color:c.text, marginBottom:4 }}>Cambia password</div>
              {passSuccess && <div style={{ padding:"8px 12px", background:"rgba(16,185,129,0.1)", border:"1px solid #10b981", borderRadius:8, color:"#10b981", fontSize:12, marginBottom:8 }}>{passSuccess}</div>}
              {passErr && <div style={{ padding:"8px 12px", background:"rgba(239,68,68,0.1)", border:"1px solid #ef4444", borderRadius:8, color:"#ef4444", fontSize:12, marginBottom:8 }}>{passErr}</div>}
              {lbl("PASSWORD ATTUALE")}
              <input type="password" value={oldPassword} onChange={e=>setOldPassword(e.target.value)} placeholder="Password attuale" style={inp}/>
              {lbl("NUOVA PASSWORD")}
              <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Minimo 6 caratteri" style={inp}/>
              {lbl("CONFERMA NUOVA")}
              <input type="password" value={confirmNewPassword} onChange={e=>setConfirmNewPassword(e.target.value)} placeholder="Ripeti la password" style={{ ...inp, border:`1px solid ${confirmNewPassword&&confirmNewPassword!==newPassword?"#ef4444":confirmNewPassword&&confirmNewPassword===newPassword?"#10b981":c.border}` }}/>
              <button onClick={changePassword} style={{ width:"100%", marginTop:10, padding:"9px", borderRadius:9, border:`1px solid ${neon}`, background:c.accentBg, color:neon, cursor:"pointer", fontSize:13, fontWeight:500 }}>
                Aggiorna password
              </button>
            </div>
          </>}

          {/* ── SESSIONE ── */}
          {section === "sessione" && <>
            <div style={{ fontSize:14, fontWeight:600, color:c.text, marginBottom:4 }}>Blocco automatico</div>
            <div style={{ fontSize:12, color:c.textMuted, marginBottom:14 }}>L'app si blocca automaticamente dopo il tempo di inattività selezionato.</div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {TIMEOUT_OPTIONS.map(opt => (
                <div key={opt.value} onClick={() => setTimeoutVal(opt.value)}
                  style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 14px", borderRadius:10, border:`1px solid ${timeout===opt.value?neon:c.border}`, background:timeout===opt.value?c.accentBg:"transparent", cursor:"pointer", transition:"all .2s" }}>
                  <span style={{ fontSize:14, color:timeout===opt.value?neon:c.text }}>{opt.label}</span>
                  {timeout===opt.value && <div style={{ width:18, height:18, borderRadius:"50%", background:neon, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:"#fff", fontWeight:700 }}>✓</div>}
                </div>
              ))}
            </div>
            <button onClick={onLock} style={{ width:"100%", marginTop:16, padding:"11px", borderRadius:10, border:`1px solid ${neon}`, background:c.accentBg, color:neon, cursor:"pointer", fontSize:14, fontWeight:500 }}>
              🔒 Blocca ora
            </button>
          </>}

          {/* ── ACCOUNT ── */}
          {section === "account" && <>
            <div style={{ padding:"14px 16px", background:c.accentBg2, borderRadius:12, marginBottom:16 }}>
              {(() => { const u = JSON.parse(localStorage.getItem("wfy_user")||"null"); return u ? <>
                <div style={{ fontSize:11, color:c.textHint, letterSpacing:1, marginBottom:8 }}>ACCOUNT ATTIVO</div>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:40, height:40, borderRadius:"50%", background:`linear-gradient(135deg,${neon},${neon2})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:700, color:"#fff" }}>{u.nome?.charAt(0).toUpperCase()}</div>
                  <div><div style={{ fontSize:14, fontWeight:500, color:c.text }}>{u.nome} {u.cognome}</div><div style={{ fontSize:12, color:c.textMuted }}>{u.email}</div></div>
                </div>
              </> : null; })()}
            </div>
            <button onClick={onLogout} style={{ width:"100%", padding:"12px", borderRadius:10, border:`1px solid #ef4444`, background:"rgba(239,68,68,0.08)", color:"#ef4444", fontSize:14, cursor:"pointer", fontWeight:500, marginBottom: 16 }}>
              Esci dall'account
            </button>
            <div style={{ textAlign:"center", fontSize:11, color:c.textHint }}>
              <a href="/WorkfyStation/TERMS.txt" target="_blank" rel="noopener noreferrer" style={{ color:c.textHint, textDecoration:"underline" }}>Termini, Condizioni & Privacy Policy</a>
              <div style={{ marginTop:4 }}>App Offline-First. I dati rimangono solo sul tuo dispositivo.</div>
            </div>
          </>}
        </div>
      </div>
    </div>
  );
}