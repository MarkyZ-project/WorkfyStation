import { useState, useEffect, useRef } from "react";
import Particles from "./Particles";

const NEON = "#ff6b9d";
const NEON2 = "#ff1493";

function hashPassword(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

export default function LockScreen({ user, onUnlock, c }) {
  const [mode, setMode] = useState(() => localStorage.getItem("wfy_pin") ? "pin" : "password");
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [showPass, setShowPass] = useState(false);
  const intervalRef = useRef(null);

  const glowText = `0 0 10px ${NEON}, 0 0 20px ${NEON}, 0 0 40px ${NEON2}`;

  // Blocco temporaneo dopo 5 tentativi falliti
  useEffect(() => {
    if (locked && lockTimer > 0) {
      intervalRef.current = setInterval(() => {
        setLockTimer(t => {
          if (t <= 1) { setLocked(false); setAttempts(0); clearInterval(intervalRef.current); return 0; }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [locked]);

  const handleFail = () => {
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    if (newAttempts >= 5) {
      setLocked(true);
      setLockTimer(30);
      setErr("Troppi tentativi! Attendi 30 secondi.");
    } else {
      setErr(`${mode === "pin" ? "PIN" : "Password"} errato/a. ${5 - newAttempts} tentativi rimasti.`);
    }
    setPin("");
    setPassword("");
  };

  const unlockWithPin = (p) => {
    const savedPin = localStorage.getItem("wfy_pin");
    if (p === savedPin) {
      localStorage.setItem("wfy_session_time", Date.now().toString());
      onUnlock();
    } else {
      handleFail();
    }
  };

  const unlockWithPassword = () => {
    if (!password) return;
    const accounts = JSON.parse(localStorage.getItem("wfy_accounts") || "[]");
    const account = accounts.find(a => a.email === user?.email);
    if (!account) { setErr("Account non trovato."); return; }
    if (account.passwordHash === hashPassword(password)) {
      localStorage.setItem("wfy_session_time", Date.now().toString());
      onUnlock();
    } else {
      handleFail();
    }
  };

  const handlePinPress = (digit) => {
    if (locked) return;
    const newPin = pin + digit;
    setPin(newPin);
    setErr("");
    if (newPin.length === 6) {
      setTimeout(() => unlockWithPin(newPin), 100);
    }
  };

  const handlePinDelete = () => { setPin(p => p.slice(0, -1)); setErr(""); };

  const time = new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  const date = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "#0a0a0a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <Particles active={true} />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 0, width: "100%", maxWidth: 340, padding: "0 20px" }}>

        {/* Orologio */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 64, fontWeight: 200, color: "#fff", letterSpacing: 2, lineHeight: 1 }}>{time}</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginTop: 6, textTransform: "capitalize" }}>{date}</div>
        </div>

        {/* Avatar + nome */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: `linear-gradient(135deg,${NEON},${NEON2})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700, color: "#fff", margin: "0 auto 10px", boxShadow: `0 0 20px ${NEON}66` }}>
            {user?.nome?.charAt(0).toUpperCase() || "?"}
          </div>
          <div style={{ fontSize: 16, fontWeight: 500, color: "#fff" }}>{user?.nome} {user?.cognome}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{user?.email}</div>
        </div>

        {/* Blocco temporaneo */}
        {locked && (
          <div style={{ width: "100%", padding: "12px 16px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 12, textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>🔒</div>
            <div style={{ color: "#ef4444", fontSize: 14, fontWeight: 500 }}>Account bloccato</div>
            <div style={{ color: "rgba(239,68,68,0.7)", fontSize: 13, marginTop: 4 }}>Riprova tra {lockTimer}s</div>
          </div>
        )}

        {/* Tabs PIN / Password */}
        {localStorage.getItem("wfy_pin") && (
          <div style={{ display: "flex", gap: 8, marginBottom: 20, width: "100%" }}>
            {[["pin","PIN"],["password","Password"]].map(([m, label]) => (
              <button key={m} onClick={() => { setMode(m); setPin(""); setPassword(""); setErr(""); }}
                style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${mode === m ? NEON : "rgba(255,107,157,0.2)"}`, background: mode === m ? "rgba(255,107,157,0.15)" : "transparent", color: mode === m ? NEON : "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 13, fontWeight: mode === m ? 600 : 400 }}>
                {label}
              </button>
            ))}
          </div>
        )}

        {/* ── MODALITÀ PIN ── */}
        {mode === "pin" && (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            {/* Punti PIN */}
            <div style={{ display: "flex", gap: 14 }}>
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} style={{ width: 14, height: 14, borderRadius: "50%", background: i < pin.length ? NEON : "transparent", border: `2px solid ${i < pin.length ? NEON : "rgba(255,107,157,0.4)"}`, boxShadow: i < pin.length ? `0 0 8px ${NEON}` : "none", transition: "all .2s" }} />
              ))}
            </div>

            {err && <div style={{ fontSize: 12, color: "#ef4444", textAlign: "center" }}>{err}</div>}

            {/* Tastierino */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, width: "100%" }}>
              {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((d, i) => (
                <button key={i} onClick={() => { if (locked) return; if (d === "⌫") handlePinDelete(); else if (d !== "") handlePinPress(String(d)); }}
                  style={{ height: 62, borderRadius: 14, border: `1px solid ${d === "" ? "transparent" : "rgba(255,107,157,0.2)"}`, background: d === "" ? "transparent" : d === "⌫" ? "rgba(255,107,157,0.08)" : "rgba(255,255,255,0.05)", color: "#fff", fontSize: d === "⌫" ? 18 : 22, fontWeight: 300, cursor: d === "" ? "default" : "pointer", opacity: locked ? 0.3 : 1, transition: "all .15s" }}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── MODALITÀ PASSWORD ── */}
        {mode === "password" && (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ position: "relative" }}>
              <input type={showPass ? "text" : "password"} value={password}
                onChange={e => { setPassword(e.target.value); setErr(""); }}
                onKeyDown={e => e.key === "Enter" && unlockWithPassword()}
                placeholder="Inserisci la password" autoFocus
                style={{ width: "100%", padding: "14px 44px 14px 16px", borderRadius: 12, border: `1.5px solid rgba(255,107,157,0.4)`, background: "rgba(255,107,157,0.05)", color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
              <button onClick={() => setShowPass(!showPass)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "rgba(255,107,157,0.5)", cursor: "pointer", fontSize: 16 }}>
                {showPass ? "🙈" : "👁"}
              </button>
            </div>

            {err && <div style={{ fontSize: 12, color: "#ef4444", textAlign: "center" }}>{err}</div>}

            <button onClick={unlockWithPassword} disabled={locked || !password}
              style={{ padding: "14px", borderRadius: 12, border: `1.5px solid ${NEON}`, background: `linear-gradient(135deg,${NEON},${NEON2})`, color: "#fff", fontSize: 15, fontWeight: 600, cursor: locked ? "not-allowed" : "pointer", opacity: locked ? 0.5 : 1, boxShadow: `0 0 20px ${NEON}66` }}>
              Sblocca
            </button>
          </div>
        )}

        <div style={{ marginTop: 24, fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center" }}>
          WorkfyStation · Sessione protetta
        </div>
      </div>
    </div>
  );
}