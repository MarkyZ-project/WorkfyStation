import { useState, useEffect } from "react";
import Particles from "./Particles";

const NEON = "#ff6b9d";
const NEON2 = "#ff1493";

export default function WelcomeScreen({ user, onDone }) {
  const [visible, setVisible] = useState(false);
  const glowText = `0 0 10px ${NEON}, 0 0 20px ${NEON}, 0 0 40px ${NEON2}`;

  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (visible) setTimeout(() => onDone(), 2500); }, [visible]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a", flexDirection: "column" }}>
      <Particles active={true} />
      <div style={{ position: "relative", zIndex: 1, textAlign: "center", opacity: visible ? 1 : 0, transform: visible ? "scale(1)" : "scale(.9)", transition: "all 1s" }}>
        <div style={{ fontSize: 18, color: "rgba(255,107,157,0.7)", letterSpacing: 4, marginBottom: 16 }}>BENVENUTO/A</div>
        <div style={{ fontSize: 48, fontWeight: 700, color: "#fff", textShadow: glowText, marginBottom: 8 }}>{user.nome} {user.cognome}</div>
        <div style={{ color: "rgba(255,107,157,0.6)", fontSize: 15, marginBottom: 30 }}>Preparazione workspace...</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: NEON, animation: `pulse 1s ${i * 0.2}s infinite alternate` }} />
          ))}
        </div>
      </div>
      <style>{`@keyframes pulse{from{opacity:.2;transform:scale(.8)}to{opacity:1;transform:scale(1.2)}}`}</style>
    </div>
  );
}