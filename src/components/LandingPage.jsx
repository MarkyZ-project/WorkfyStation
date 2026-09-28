import { useState, useEffect, useRef } from "react";

const NEON  = "#ff6b9d";
const NEON2 = "#ff1493";
const GOLD  = "#FFD700";

const FEATURES = [
  { icon: "✏️", title: "Note", desc: "Editor di testo completo per appunti, idee e documenti." },
  { icon: "✅", title: "Tasks", desc: "Gestisci le attività con checklist, priorità e scadenze." },
  { icon: "📊", title: "Foglio", desc: "Fogli di calcolo con formule, grafici e filtri integrati." },
  { icon: "🎨", title: "Disegno", desc: "Canvas di disegno libero con pennelli, forme e colori." },
  { icon: "📐", title: "Slide", desc: "Crea presentazioni professionali con template e animazioni." },
  { icon: "🧮", title: "Calcola", desc: "Calcolatrice scientifica con cronologia e conversioni." },
  { icon: "🖼️", title: "Editor Img", desc: "Modifica immagini con filtri, ritaglio e annotazioni." },
  { icon: "📄", title: "PDF / Word", desc: "Visualizza e gestisci documenti PDF e Word." },
  { icon: "🎵", title: "Musica", desc: "Lettore musicale integrato con playlist e equalizzatore." },
  { icon: "⏱️", title: "Cronometro", desc: "Timer, cronometro e conto alla rovescia." },
  { icon: "🔄", title: "Convertitore", desc: "Converti unità di misura, valute e molto altro." },
];

const PLUS_FEATURES = [
  { icon: "💻", title: "WorkingCode IDE", desc: "Ambiente di sviluppo integrato per C, C++ e Java con terminale interattivo." },
  { icon: "☁️", title: "Sync Cloud", desc: "Sincronizza i tuoi dati su tutti i dispositivi." },
  { icon: "🤖", title: "AI Assistant", desc: "Assistente intelligente per produttività e coding." },
  { icon: "🎨", title: "Temi Premium", desc: "Temi esclusivi e personalizzazione avanzata." },
];

function useInView(ref) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.15 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref]);
  return visible;
}

function Section({ children, delay = 0 }) {
  const ref = useRef(null);
  const visible = useInView(ref);
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(40px)",
      transition: `all 0.8s cubic-bezier(.16,1,.3,1) ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

export default function LandingPage({ onEnter }) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const heroRef = useRef(null);

  useEffect(() => {
    const h = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, []);

  const glow = `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255,107,157,0.06), transparent 60%)`;

  return (
    <div style={{ background: "#050505", color: "#fff", fontFamily: "'Segoe UI','Inter',sans-serif", minHeight: "100vh", overflowX: "hidden", position: "relative" }}>
      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes glow-ring { 0%{box-shadow:0 0 20px ${NEON}44} 50%{box-shadow:0 0 40px ${NEON}88,0 0 80px ${NEON2}44} 100%{box-shadow:0 0 20px ${NEON}44} }
        @keyframes gradient-move { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes pulse-slow { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
        @keyframes slide-up { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
        .landing-btn:hover { transform: scale(1.05) !important; box-shadow: 0 0 30px ${NEON}88, 0 0 60px ${NEON2}44 !important; }
        .feature-card:hover { transform: translateY(-6px) !important; border-color: ${NEON}88 !important; background: rgba(255,107,157,0.08) !important; }
        .plus-card:hover { transform: translateY(-6px) !important; border-color: ${GOLD}88 !important; }
        ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-track{background:#0a0a0a} ::-webkit-scrollbar-thumb{background:${NEON}44;border-radius:3px}
      `}</style>

      {/* Cursor glow */}
      <div style={{ position: "fixed", inset: 0, background: glow, pointerEvents: "none", zIndex: 0 }} />

      {/* ═══════ HERO ═══════ */}
      <div ref={heroRef} style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", padding: "60px 20px", textAlign: "center" }}>
        
        {/* Bg decorations */}
        <div style={{ position: "absolute", top: "10%", left: "15%", width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle, ${NEON}11, transparent 70%)`, animation: "pulse-slow 4s infinite", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "15%", right: "10%", width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, ${NEON2}0a, transparent 70%)`, animation: "pulse-slow 5s infinite 1s", pointerEvents: "none" }} />

        {/* Logo */}
        <div style={{ animation: "float 4s ease-in-out infinite, glow-ring 3s infinite, slide-up 1s ease", width: 120, height: 120, borderRadius: 28, background: "linear-gradient(135deg, rgba(255,107,157,0.15), rgba(255,20,147,0.08))", border: `2px solid ${NEON}66`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 32 }}>
          <img src="/WorkfyStation/WorkfyLogo.png" alt="WorkfyStation" style={{ width: 80, height: 80, objectFit: "contain" }}
               onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span style="font-size:48px">🚀</span>'; }} />
        </div>

        {/* Title */}
        <h1 style={{ fontSize: "clamp(42px, 7vw, 80px)", fontWeight: 800, margin: "0 0 8px", letterSpacing: -2, background: `linear-gradient(135deg, #fff 0%, ${NEON} 50%, ${NEON2} 100%)`, backgroundSize: "200% 200%", animation: "gradient-move 4s ease infinite, slide-up 1s ease .2s both", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.1 }}>
          WorkfyStation
        </h1>

        {/* Subtitle */}
        <p style={{ fontSize: "clamp(16px, 2.5vw, 22px)", color: "rgba(255,255,255,0.5)", maxWidth: 600, margin: "0 auto 12px", animation: "slide-up 1s ease .4s both", lineHeight: 1.5 }}>
          La tua suite di produttività completa.
        </p>
        <p style={{ fontSize: "clamp(14px, 2vw, 17px)", color: "rgba(255,107,157,0.6)", maxWidth: 500, margin: "0 auto 40px", animation: "slide-up 1s ease .5s both" }}>
          Note · Tasks · Fogli · Disegno · Slide · Musica · PDF · Coding — tutto in un'unica app.
        </p>

        {/* Hero badges */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", animation: "slide-up 1s ease .6s both" }}>
          {[
            { emoji: "🔒", text: "100% Offline" },
            { emoji: "⚡", text: "Zero tracciamento" },
            { emoji: "🆓", text: "Gratuita" },
          ].map((b, i) => (
            <div key={i} style={{ padding: "10px 20px", borderRadius: 50, border: `1px solid ${NEON}33`, background: "rgba(255,107,157,0.05)", display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
              <span>{b.emoji}</span> {b.text}
            </div>
          ))}
        </div>

        {/* Scroll hint */}
        <div style={{ position: "absolute", bottom: 30, animation: "float 2s ease-in-out infinite", opacity: 0.3, fontSize: 24 }}>↓</div>
      </div>

      {/* ═══════ WHAT IS ═══════ */}
      <div style={{ padding: "100px 20px", maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
        <Section>
          <div style={{ fontSize: 13, color: NEON, letterSpacing: 3, marginBottom: 16, fontWeight: 600 }}>COS'È WORKFYSTATION</div>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 700, margin: "0 0 24px", lineHeight: 1.2 }}>
            Tutto ciò che serve per lavorare.<br />
            <span style={{ color: NEON }}>In un unico posto.</span>
          </h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.5)", lineHeight: 1.8, maxWidth: 700, margin: "0 auto" }}>
            WorkfyStation è una suite di produttività completa che funziona direttamente nel browser.
            Nessuna installazione, nessun account cloud, nessun tracciamento.
            I tuoi dati restano sul <strong style={{ color: "rgba(255,255,255,0.8)" }}>tuo dispositivo</strong>, sempre.
          </p>
        </Section>
      </div>

      {/* ═══════ FEATURES GRID ═══════ */}
      <div style={{ padding: "60px 20px 100px", maxWidth: 1100, margin: "0 auto" }}>
        <Section>
          <div style={{ fontSize: 13, color: NEON, letterSpacing: 3, marginBottom: 16, fontWeight: 600, textAlign: "center" }}>STRUMENTI</div>
          <h2 style={{ fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 700, textAlign: "center", marginBottom: 48 }}>
            11 strumenti professionali. <span style={{ color: NEON }}>Gratis.</span>
          </h2>
        </Section>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
          {FEATURES.map((f, i) => (
            <Section key={i} delay={i * 60}>
              <div className="feature-card" style={{
                padding: "28px 24px", borderRadius: 16, border: `1px solid rgba(255,107,157,0.15)`,
                background: "rgba(255,255,255,0.02)", cursor: "default", transition: "all .3s",
                display: "flex", gap: 16, alignItems: "flex-start",
              }}>
                <div style={{ fontSize: 28, flexShrink: 0, width: 48, height: 48, borderRadius: 12, background: `rgba(255,107,157,0.08)`, display: "flex", alignItems: "center", justifyContent: "center" }}>{f.icon}</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: "#fff" }}>{f.title}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>{f.desc}</div>
                </div>
              </div>
            </Section>
          ))}
        </div>
      </div>

      {/* ═══════ PRIVACY ═══════ */}
      <div style={{ padding: "80px 20px", textAlign: "center", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, transparent, rgba(255,107,157,0.03), transparent)`, pointerEvents: "none" }} />
        <Section>
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <div style={{ fontSize: 60, marginBottom: 20 }}>🔐</div>
            <div style={{ fontSize: 13, color: NEON, letterSpacing: 3, marginBottom: 16, fontWeight: 600 }}>PRIVACY FIRST</div>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 700, marginBottom: 20 }}>
              I tuoi dati sono <span style={{ color: NEON }}>solo tuoi.</span>
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", lineHeight: 1.8, maxWidth: 600, margin: "0 auto 32px" }}>
              Architettura Zero-Knowledge: non raccogliamo, non tracciamo e non inviamo nessun dato a server esterni.
              Tutto resta nel tuo browser, sotto il tuo controllo.
            </p>
            <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}>
              {[
                { icon: "🚫", text: "Zero tracking" },
                { icon: "💾", text: "Dati in locale" },
                { icon: "🛡️", text: "Zero-Knowledge" },
                { icon: "📵", text: "Funziona offline" },
              ].map((b, i) => (
                <div key={i} style={{ padding: "12px 20px", borderRadius: 12, border: `1px solid rgba(255,107,157,0.15)`, background: "rgba(255,107,157,0.04)", fontSize: 13, color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{b.icon}</span> {b.text}
                </div>
              ))}
            </div>
          </div>
        </Section>
      </div>

      {/* ═══════ PLUS ═══════ */}
      <div style={{ padding: "80px 20px 100px", maxWidth: 1000, margin: "0 auto" }}>
        <Section>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontSize: 13, color: GOLD, letterSpacing: 3, marginBottom: 16, fontWeight: 600 }}>PROSSIMAMENTE</div>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 700, marginBottom: 8 }}>
              Workfy <span style={{ background: `linear-gradient(90deg, ${GOLD}, #FFA500)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>PLUS</span>
            </h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", maxWidth: 500, margin: "0 auto" }}>
              Sblocca funzionalità premium per portare la produttività al livello successivo.
            </p>
          </div>
        </Section>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
          {PLUS_FEATURES.map((f, i) => (
            <Section key={i} delay={i * 80}>
              <div className="plus-card" style={{
                padding: "28px 24px", borderRadius: 16, border: `1px solid ${GOLD}22`,
                background: `linear-gradient(135deg, rgba(255,215,0,0.03), rgba(255,165,0,0.02))`,
                cursor: "default", transition: "all .3s", textAlign: "center",
              }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{f.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: GOLD }}>{f.title}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            </Section>
          ))}
        </div>
      </div>

      {/* ═══════ CTA FINALE ═══════ */}
      <div style={{ padding: "80px 20px 120px", textAlign: "center", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at center bottom, rgba(255,107,157,0.08), transparent 60%)`, pointerEvents: "none" }} />
        <Section>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, marginBottom: 16, lineHeight: 1.2 }}>
            Pronto a iniziare?
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", marginBottom: 40, maxWidth: 450, margin: "0 auto 40px" }}>
            Entra in WorkfyStation e scopri un nuovo modo di lavorare. Gratis, per sempre.
          </p>
          <button
            className="landing-btn"
            onClick={onEnter}
            style={{
              padding: "18px 56px", borderRadius: 16, border: "none",
              background: `linear-gradient(135deg, ${NEON}, ${NEON2})`,
              color: "#fff", fontSize: 18, fontWeight: 700, cursor: "pointer",
              boxShadow: `0 0 20px ${NEON}55, 0 0 40px ${NEON2}33`,
              transition: "all .3s", letterSpacing: 0.5,
            }}
          >
            🚀 Entra in WorkfyStation
          </button>
          <div style={{ marginTop: 20, fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
            Nessuna registrazione richiesta · 100% gratuito · I tuoi dati restano tuoi
          </div>
        </Section>
      </div>

      {/* Footer */}
      <div style={{ padding: "30px 20px", borderTop: `1px solid rgba(255,107,157,0.1)`, textAlign: "center" }}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
          © {new Date().getFullYear()} WorkfyStation · Made with ❤️
        </div>
      </div>
    </div>
  );
}
