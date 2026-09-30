import { useState, useEffect } from "react";
import Particles from "./Particles";

export default function WelcomeScreen({ user, onDone, c }) {
  const [visible, setVisible] = useState(false);
  const accent = c?.accent || "#ffffff";
  const bg = c?.bg || "#000000";
  const text = c?.text || "#ffffff";
  const textMuted = c?.textMuted || "rgba(255,255,255,0.6)";

  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (visible) setTimeout(() => onDone(), 2200); }, [visible]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: bg, flexDirection: "column", color: text }}>
      <Particles active={true} color={accent} />
      <div style={{ position: "relative", zIndex: 1, textAlign: "center", opacity: visible ? 1 : 0, transform: visible ? "scale(1)" : "scale(.95)", transition: "all .8s ease" }}>
        <div style={{ fontSize: 13, color: textMuted, letterSpacing: 4, marginBottom: 14, fontWeight: 500 }}>BENVENUTO/A</div>
        <div style={{ fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 700, color: text, marginBottom: 10 }}>{user?.nome} {user?.cognome}</div>
        <div style={{ color: textMuted, fontSize: 15, marginBottom: 28 }}>Preparazione workspace...</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: accent, animation: `pulse 1s ${i * 0.2}s infinite alternate` }} />
          ))}
        </div>
      </div>
      <style>{`@keyframes pulse{from{opacity:.2;transform:scale(.8)}to{opacity:1;transform:scale(1.2)}}`}</style>
    </div>
  );
}