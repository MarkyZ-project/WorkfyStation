import { useEffect, useState } from "react";

const ACCENT = "#00e5ff";
const ACCENT2 = "#7c3aed";

export default function WorkingCodeLoading({ onDone }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Anima la progress bar e poi chiama onDone
    const start = Date.now();
    const duration = 2800;
    const frame = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgress(pct);
      if (elapsed < duration) {
        requestAnimationFrame(frame);
      } else {
        setTimeout(onDone, 200);
      }
    };
    requestAnimationFrame(frame);
  }, [onDone]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#080810",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 32, fontFamily: "'Segoe UI', sans-serif",
    }}>
      <style>{`
        @keyframes wc-pulse { 0%,100%{opacity:.3;transform:scale(.85)} 50%{opacity:1;transform:scale(1)} }
        @keyframes wc-glow  { 0%,100%{box-shadow:0 0 12px ${ACCENT}44} 50%{box-shadow:0 0 32px ${ACCENT}aa,0 0 64px ${ACCENT2}55} }
        @keyframes wc-dot1  { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
        @keyframes wc-dot2  { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
        @keyframes wc-dot3  { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
      `}</style>

      {/* Logo */}
      <div style={{
        width: 90, height: 90, borderRadius: 24,
        background: `linear-gradient(135deg, ${ACCENT}22, ${ACCENT2}22)`,
        border: `2px solid ${ACCENT}66`,
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "wc-glow 2s ease-in-out infinite",
      }}>
        <span style={{ fontSize: 44, filter: `drop-shadow(0 0 12px ${ACCENT})` }}>💻</span>
      </div>

      {/* Testo principale */}
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontSize: 26, fontWeight: 700, color: "#fff",
          letterSpacing: 1, marginBottom: 6,
        }}>
          Preparazione{" "}
          <span style={{
            background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT2})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>WorkingCode</span>
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
          Caricamento ambiente di sviluppo...
        </div>
      </div>

      {/* Pallini animati */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 10, height: 10, borderRadius: "50%",
            background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
            animation: `wc-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}/>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{
        width: 240, height: 3, borderRadius: 2,
        background: "rgba(255,255,255,0.08)", overflow: "hidden",
      }}>
        <div style={{
          height: "100%", borderRadius: 2,
          background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT2})`,
          width: `${progress}%`, transition: "width 60ms linear",
          boxShadow: `0 0 8px ${ACCENT}`,
        }}/>
      </div>
    </div>
  );
}
