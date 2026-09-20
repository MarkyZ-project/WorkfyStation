import { useState } from "react";

const ACCENT  = "#00e5ff";
const ACCENT2 = "#7c3aed";

const FEATURES = [
  {
    icon: "⌨️",
    title: "Editor di Codice",
    desc: "Scrivi codice con syntax highlighting per Python, JavaScript, HTML/CSS, Java e molti altri linguaggi.",
  },
  {
    icon: "▶️",
    title: "Compilatore & Esecuzione",
    desc: "Compila ed esegui i tuoi programmi direttamente nel browser, senza installare nulla.",
  },
  {
    icon: "📁",
    title: "Gestione Progetti",
    desc: "Organizza file e cartelle, salva i tuoi progetti e riprendi da dove li hai lasciati.",
  },
  {
    icon: "🎓",
    title: "Modalità Studio",
    desc: "Lezioni interattive, esercizi guidati e quiz per imparare a programmare step by step.",
  },
  {
    icon: "🤝",
    title: "Collaborazione",
    desc: "Condividi il tuo codice, fai code review e lavora in team su stessi progetti.",
  },
  {
    icon: "🧩",
    title: "Snippets & Template",
    desc: "Libreria di snippet pronti all'uso e template per partire velocemente con nuovi progetti.",
  },
];

const LANGUAGES = ["Python", "JavaScript", "TypeScript", "HTML/CSS", "Java", "C/C++", "Go", "Rust", "PHP", "Swift"];

export default function WorkingCodeWelcome({ onEnter }) {
  const [hovered, setHovered] = useState(null);

  return (
    <div style={{
      flex: 1, overflow: "auto", fontFamily: "'Segoe UI', sans-serif",
      background: "#080810", color: "#fff",
    }}>
      <style>{`
        @keyframes wc-fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes wc-shimmer { 0%,100%{opacity:.6} 50%{opacity:1} }
        .wc-feat-card:hover { border-color: ${ACCENT}66 !important; background: rgba(0,229,255,0.06) !important; transform: translateY(-2px); }
        .wc-feat-card { transition: all .2s !important; }
        .wc-lang-chip { transition: all .15s; }
        .wc-lang-chip:hover { background: ${ACCENT}22 !important; border-color: ${ACCENT} !important; color: ${ACCENT} !important; }
      `}</style>

      {/* Hero section */}
      <div style={{
        textAlign: "center", padding: "60px 40px 40px",
        background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${ACCENT}12 0%, transparent 70%)`,
        animation: "wc-fadeUp .6s ease both",
      }}>
        {/* Badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "6px 16px", borderRadius: 20,
          border: `1px solid ${ACCENT}44`, background: `${ACCENT}11`,
          fontSize: 12, color: ACCENT, fontWeight: 600, letterSpacing: 1,
          marginBottom: 28,
        }}>
          <span style={{ animation: "wc-shimmer 2s ease infinite" }}>◆</span>
          WORKINGCODE · AMBIENTE DI SVILUPPO
        </div>

        {/* Titolo */}
        <h1 style={{
          fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 800, margin: "0 0 16px",
          lineHeight: 1.2,
        }}>
          Programma. Compila. Impara.{" "}
          <span style={{
            background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT2})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Tutto qui.
          </span>
        </h1>

        <p style={{
          fontSize: 16, color: "rgba(255,255,255,0.5)", maxWidth: 560, margin: "0 auto 36px",
          lineHeight: 1.7,
        }}>
          WorkingCode è l'ambiente di sviluppo integrato pensato per <strong style={{ color: "rgba(255,255,255,0.8)" }}>programmatori, studenti e informatici</strong>.
          Scrivi, esegui e condividi il tuo codice senza installare nulla sul dispositivo.
        </p>

        {/* CTA */}
        <button
          onClick={onEnter}
          style={{
            padding: "14px 36px", borderRadius: 30, border: "none", cursor: "pointer",
            background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
            color: "#fff", fontSize: 16, fontWeight: 700, letterSpacing: 0.5,
            boxShadow: `0 0 24px ${ACCENT}55, 0 0 48px ${ACCENT2}33`,
            transition: "all .2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.04)"; e.currentTarget.style.boxShadow = `0 0 36px ${ACCENT}88`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = `0 0 24px ${ACCENT}55`; }}
        >
          🚀 Inizia a programmare
        </button>

        <div style={{ marginTop: 16, fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
          Gratuito durante il periodo Beta · Nessuna installazione richiesta
        </div>
      </div>

      {/* Linguaggi supportati */}
      <div style={{ padding: "0 40px 40px", animation: "wc-fadeUp .8s ease .1s both" }}>
        <div style={{ textAlign: "center", marginBottom: 16, fontSize: 12, color: "rgba(255,255,255,0.3)", letterSpacing: 1 }}>
          LINGUAGGI SUPPORTATI
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          {LANGUAGES.map(lang => (
            <div key={lang} className="wc-lang-chip" style={{
              padding: "6px 14px", borderRadius: 20,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.04)",
              fontSize: 13, color: "rgba(255,255,255,0.6)",
              cursor: "default",
            }}>{lang}</div>
          ))}
        </div>
      </div>

      {/* Features grid */}
      <div style={{ padding: "0 40px 60px", animation: "wc-fadeUp .8s ease .2s both" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 12, color: ACCENT, letterSpacing: 1, marginBottom: 8 }}>FUNZIONALITÀ</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Tutto ciò di cui hai bisogno</div>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16, maxWidth: 800, margin: "0 auto",
        }}>
          {FEATURES.map((f, i) => (
            <div key={i} className="wc-feat-card" style={{
              padding: 20, borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.07)",
              background: "rgba(255,255,255,0.03)",
              cursor: "default",
            }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{f.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer CTA */}
      <div style={{
        textAlign: "center", padding: "40px",
        background: `linear-gradient(180deg, transparent, ${ACCENT}08)`,
        borderTop: "1px solid rgba(255,255,255,0.05)",
        animation: "wc-fadeUp .8s ease .3s both",
      }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Pronto a scrivere codice?</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", marginBottom: 24 }}>
          L'editor ti aspetta. Nessuna configurazione necessaria.
        </div>
        <button
          onClick={onEnter}
          style={{
            padding: "12px 28px", borderRadius: 24,
            border: `1px solid ${ACCENT}`,
            background: "transparent",
            color: ACCENT, fontSize: 14, fontWeight: 600,
            cursor: "pointer", transition: "all .2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = `${ACCENT}15`; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        >
          Apri l'editor →
        </button>
      </div>
    </div>
  );
}
