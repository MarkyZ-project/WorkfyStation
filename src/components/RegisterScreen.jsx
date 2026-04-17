import { useState } from "react";
import Particles from "./Particles";

const NEON = "#ff6b9d";
const NEON2 = "#ff1493";

export default function RegisterScreen({ onDone }) {
  const [form, setForm] = useState({ nome: "", cognome: "", email: "" });
  const [focused, setFocused] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr] = useState("");

  const submit = () => {
    if (!form.nome || !form.cognome || !form.email) { setErr("Compila tutti i campi!"); return; }
    if (!form.email.includes("@")) { setErr("Email non valida!"); return; }
    localStorage.setItem("wfy_user", JSON.stringify(form));
    setSubmitted(true);
    setTimeout(() => onDone(form), 1200);
  };

  const glowText = `0 0 10px ${NEON}, 0 0 20px ${NEON}, 0 0 40px ${NEON2}`;

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", background: "#0a0a0a" }}>
      <Particles active={true} />
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 420, padding: "0 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 42, fontWeight: 700, color: NEON, textShadow: glowText, letterSpacing: 2, marginBottom: 8 }}>WorkfyStation</div>
          <div style={{ color: "rgba(255,107,157,0.7)", fontSize: 15, letterSpacing: 4 }}>YOUR WORKSPACE</div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,107,157,0.2)", borderRadius: 20, padding: 36 }}>
          <div style={{ color: "#fff", fontSize: 20, fontWeight: 500, marginBottom: 24, textAlign: "center" }}>Crea il tuo account</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[{ id: "nome", label: "Nome", type: "text" }, { id: "cognome", label: "Cognome", type: "text" }, { id: "email", label: "Email", type: "email" }].map(f => (
              <div key={f.id}>
                <div style={{ color: "rgba(255,107,157,0.8)", fontSize: 12, marginBottom: 6, letterSpacing: 1 }}>{f.label.toUpperCase()}</div>
                <input
                  type={f.type} value={form[f.id]} placeholder={f.label}
                  onChange={e => setForm({ ...form, [f.id]: e.target.value })}
                  onFocus={() => setFocused(f.id)} onBlur={() => setFocused(null)}
                  style={{
                    width: "100%", padding: "14px 18px", borderRadius: 10,
                    background: "rgba(255,107,157,0.05)",
                    border: `1.5px solid ${focused === f.id ? NEON : "rgba(255,107,157,0.3)"}`,
                    color: "#fff", fontSize: 15, outline: "none",
                    fontFamily: "inherit", boxSizing: "border-box",
                  }}
                />
              </div>
            ))}
            {err && <div style={{ color: NEON, fontSize: 13, textAlign: "center" }}>{err}</div>}
            <button onClick={submit} style={{
              marginTop: 8, padding: "14px", borderRadius: 10,
              border: `1.5px solid ${NEON}`, background: "rgba(255,107,157,0.1)",
              color: NEON, fontSize: 16, fontWeight: 500, cursor: "pointer", letterSpacing: 2,
            }}>
              {submitted ? "ACCESSO..." : "INIZIA"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}