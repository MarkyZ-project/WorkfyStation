import { useState } from "react";
import Particles from "./Particles";

function hashPassword(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

export default function RegisterScreen({ onDone, c }) {
  const [mode, setMode] = useState("register"); // register | login
  const [form, setForm] = useState({ nome: "", cognome: "", email: "", password: "", confirmPassword: "" });
  const [focused, setFocused] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr] = useState("");
  const [showPass, setShowPass] = useState(false);

  const bg = c?.bg || "#000000";
  const accent = c?.accent || "#ffffff";
  const accentText = c?.accentText || (accent === "#ffffff" ? "#000000" : "#ffffff");
  const border = c?.border || "rgba(255,255,255,0.15)";
  const text = c?.text || "#ffffff";
  const textMuted = c?.textMuted || "rgba(255,255,255,0.6)";
  const isBW = !c || c.isBW !== false;

  const register = () => {
    if (!form.nome || !form.cognome || !form.email || !form.password) { setErr("Compila tutti i campi!"); return; }
    if (!form.email.includes("@")) { setErr("Email non valida!"); return; }
    if (form.password.length < 6) { setErr("Password minimo 6 caratteri!"); return; }
    if (form.password !== form.confirmPassword) { setErr("Le password non coincidono!"); return; }

    // Controlla se email già registrata
    const existing = JSON.parse(localStorage.getItem("wfy_accounts") || "[]");
    if (existing.find(a => a.email === form.email)) { setErr("Email già registrata! Accedi."); return; }

    const user = { nome: form.nome, cognome: form.cognome, email: form.email };
    const account = { ...user, passwordHash: hashPassword(form.password) };

    localStorage.setItem("wfy_accounts", JSON.stringify([...existing, account]));
    localStorage.setItem("wfy_user", JSON.stringify(user));
    localStorage.setItem("wfy_session_time", Date.now().toString());

    setSubmitted(true);
    setTimeout(() => onDone(user), 1000);
  };

  const login = () => {
    if (!form.email || !form.password) { setErr("Inserisci email e password!"); return; }
    const accounts = JSON.parse(localStorage.getItem("wfy_accounts") || "[]");
    const account = accounts.find(a => a.email === form.email);
    if (!account) { setErr("Account non trovato. Registrati!"); return; }
    if (account.passwordHash !== hashPassword(form.password)) { setErr("Password errata!"); return; }

    const user = { nome: account.nome, cognome: account.cognome, email: account.email };
    localStorage.setItem("wfy_user", JSON.stringify(user));
    localStorage.setItem("wfy_session_time", Date.now().toString());

    setSubmitted(true);
    setTimeout(() => onDone(user), 1000);
  };

  const inputStyle = (id) => ({
    width: "100%", padding: "13px 16px", borderRadius: 10,
    background: "rgba(255,255,255,0.05)",
    border: `1.5px solid ${focused === id ? (isBW ? "#ffffff" : accent) : border}`,
    boxShadow: focused === id ? (isBW ? "0 0 10px rgba(255,255,255,0.2)" : `0 0 10px ${accent}44`) : "none",
    color: text, fontSize: 14, outline: "none",
    fontFamily: "inherit", boxSizing: "border-box",
    transition: "all .25s ease",
  });

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", background: bg, color: text }}>
      <Particles active={true} color={accent} />
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 440, padding: "20px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 38, fontWeight: 700, color: text, letterSpacing: -0.5, marginBottom: 6 }}>WorkfyStation</div>
          <div style={{ color: textMuted, fontSize: 12, letterSpacing: 3, fontWeight: 500 }}>YOUR WORKSPACE</div>
        </div>

        {/* Tab register/login */}
        <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", border: `1px solid ${border}`, borderRadius: 12, padding: 4, marginBottom: 20 }}>
          {[["register","Registrati"],["login","Accedi"]].map(([m, label]) => (
            <button key={m} onClick={() => { setMode(m); setErr(""); setForm({ nome:"", cognome:"", email:"", password:"", confirmPassword:"" }); }}
              style={{
                flex: 1, padding: "10px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, transition: "all .2s",
                background: mode === m ? accent : "transparent",
                color: mode === m ? accentText : textMuted,
                boxShadow: mode === m && !isBW ? `0 0 12px ${accent}66` : "none",
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Form Card */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${border}`, borderRadius: 20, padding: "30px 24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {mode === "register" && <>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: textMuted, fontSize: 11, marginBottom: 5, letterSpacing: 1 }}>NOME</div>
                  <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
                    onFocus={() => setFocused("nome")} onBlur={() => setFocused(null)}
                    placeholder="Nome" style={inputStyle("nome")} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: textMuted, fontSize: 11, marginBottom: 5, letterSpacing: 1 }}>COGNOME</div>
                  <input value={form.cognome} onChange={e => setForm({ ...form, cognome: e.target.value })}
                    onFocus={() => setFocused("cognome")} onBlur={() => setFocused(null)}
                    placeholder="Cognome" style={inputStyle("cognome")} />
                </div>
              </div>
            </>}

            <div>
              <div style={{ color: textMuted, fontSize: 11, marginBottom: 5, letterSpacing: 1 }}>EMAIL</div>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                onFocus={() => setFocused("email")} onBlur={() => setFocused(null)}
                placeholder="email@esempio.com" style={inputStyle("email")} />
            </div>

            <div>
              <div style={{ color: textMuted, fontSize: 11, marginBottom: 5, letterSpacing: 1 }}>PASSWORD</div>
              <div style={{ position: "relative" }}>
                <input type={showPass ? "text" : "password"} value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  onFocus={() => setFocused("password")} onBlur={() => setFocused(null)}
                  placeholder="Minimo 6 caratteri" style={{ ...inputStyle("password"), paddingRight: 44 }} />
                <button onClick={() => setShowPass(!showPass)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: textMuted, cursor: "pointer", fontSize: 16 }}>
                  {showPass ? "🙈" : "👁"}
                </button>
              </div>
              {mode === "register" && form.password && (
                <div style={{ marginTop: 6, display: "flex", gap: 4 }}>
                  {[
                    { test: form.password.length >= 6, label: "6+ car." },
                    { test: /[A-Z]/.test(form.password), label: "Maiusc." },
                    { test: /[0-9]/.test(form.password), label: "Numero" },
                    { test: /[^A-Za-z0-9]/.test(form.password), label: "Simbolo" },
                  ].map((r, i) => (
                    <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: r.test ? (isBW ? "#ffffff" : accent) : "rgba(255,255,255,0.12)", transition: "background .3s" }} title={r.label} />
                  ))}
                </div>
              )}
            </div>

            {mode === "register" && (
              <div>
                <div style={{ color: textMuted, fontSize: 11, marginBottom: 5, letterSpacing: 1 }}>CONFERMA PASSWORD</div>
                <input type={showPass ? "text" : "password"} value={form.confirmPassword}
                  onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                  onFocus={() => setFocused("confirmPassword")} onBlur={() => setFocused(null)}
                  placeholder="Ripeti la password"
                  style={{ ...inputStyle("confirmPassword"), border: `1.5px solid ${form.confirmPassword && form.confirmPassword !== form.password ? "#ef4444" : form.confirmPassword && form.confirmPassword === form.password ? "#10b981" : border}` }} />
                {form.confirmPassword && form.confirmPassword === form.password && (
                  <div style={{ fontSize: 11, color: "#10b981", marginTop: 4 }}>✓ Le password coincidono</div>
                )}
              </div>
            )}

            {err && <div style={{ color: "#ef4444", fontSize: 13, textAlign: "center", padding: "8px 12px", background: "rgba(239,68,68,0.1)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)" }}>{err}</div>}

            <button onClick={mode === "register" ? register : login}
              style={{
                marginTop: 6, padding: "14px", borderRadius: 12, border: "none",
                background: submitted ? "rgba(255,255,255,0.3)" : accent,
                color: accentText, fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: 0.5,
                boxShadow: isBW ? "0 4px 20px rgba(255,255,255,0.2)" : `0 0 20px ${accent}66`,
                transition: "all .3s",
              }}>
              {submitted ? "..." : mode === "register" ? "CREA ACCOUNT" : "ACCEDI"}
            </button>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 18, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
          I tuoi dati sono salvati localmente sul tuo dispositivo 🔒
        </div>
      </div>
    </div>
  );
}