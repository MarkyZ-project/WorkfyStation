import { useRef, useEffect, useState } from "react";

const NEON = "#ff6b9d";
const NEON2 = "#ff1493";

const FEATURES = [
  { icon: "✏️", label: "Note",          desc: "Scrivi e organizza le tue note con stile. Titoli, formattazione e anteprima istantanea.",       color: "#7c3aed" },
  { icon: "📊", label: "Foglio",         desc: "Fogli di calcolo con formule avanzate: SOMMA, MEDIA, MAX, MIN e molto altro.",                    color: "#0ea5e9" },
  { icon: "🎨", label: "Disegno",        desc: "Canvas completo con penna, forme, frecce, testo e importazione immagini.",                       color: "#ec4899" },
  { icon: "📐", label: "Slide",          desc: "Crea presentazioni con slide multiple, testi posizionabili e immagini di sfondo.",               color: "#f59e0b" },
  { icon: "🧮", label: "Calcolatrice",   desc: "Modalità standard e scientifica con sin, cos, log, radici e cronologia dei calcoli.",             color: "#10b981" },
  { icon: "⏱️", label: "Cronometro",     desc: "Cronometro con giri e timer con conto alla rovescia. Preciso al centesimo di secondo.",           color: "#6366f1" },
  { icon: "🔄", label: "Convertitore",   desc: "Valute in tempo reale, lunghezza, peso, temperatura, area, velocità e volume.",                  color: "#f97316" },
  { icon: "🖼️", label: "Editor Img",    desc: "Modifica le tue immagini con filtri, preset, rotazione e scaricale in alta qualità.",             color: "#14b8a6" },
  { icon: "📄", label: "PDF / Word",     desc: "Visualizza file PDF e documenti Word direttamente nel browser, senza installare niente.",         color: "#8b5cf6" },
];

const WHY = [
  { icon: "🔒", title: "Privato",        desc: "I tuoi dati restano sul tuo dispositivo. Nessun server, nessun tracciamento." },
  { icon: "⚡", title: "Veloce",         desc: "Nessun caricamento, nessuna attesa. Tutto gira in locale, istantaneamente." },
  { icon: "📱", title: "Ovunque",        desc: "Funziona su telefono, tablet e PC. Installabile come app dal browser." },
  { icon: "🆓", title: "Gratis",         desc: "Nessun abbonamento, nessuna pubblicità, nessuna limitazione." },
  { icon: "🎨", title: "Personalizzabile", desc: "Tema chiaro o scuro, effetti neon, tutto adattabile ai tuoi gusti." },
  { icon: "🔧", title: "In crescita",    desc: "Nuove funzioni aggiunte continuamente. La tua suite si evolve con te." },
];

function ParticlesBG() {
  const ref = useRef();
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    let w = c.width = c.offsetWidth;
    let h = c.height = c.offsetHeight;
    const pts = Array.from({ length: 60 }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3,
      r: Math.random() * 2 + .5, a: Math.random() * 0.5 + 0.1,
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,107,157,${p.a})`; ctx.fill();
      });
      pts.forEach((p, i) => pts.slice(i + 1).forEach(q => {
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < 100) {
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(255,107,157,${(1 - d / 100) * 0.12})`;
          ctx.lineWidth = .5; ctx.stroke();
        }
      }));
      raf = requestAnimationFrame(draw);
    };
    draw();
    const resize = () => { w = c.width = c.offsetWidth; h = c.height = c.offsetHeight; };
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
}

export default function HomeApp({ c, user, onNavigate }) {
  const scrollRef = useRef();
  const [scrolled, setScrolled] = useState(false);
  const dark = c.bg === "#0a0a0a";

  const glowText = `0 0 10px ${NEON}, 0 0 20px ${NEON}, 0 0 40px ${NEON2}`;

  const scrollCards = (dir) => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: dir * 300, behavior: "smooth" });
  };

  return (
    <div style={{ height: "100%", overflow: "auto", position: "relative" }}
      onScroll={e => setScrolled(e.target.scrollTop > 60)}>

      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        .feat-card:hover { transform: translateY(-6px) !important; box-shadow: 0 12px 40px rgba(255,107,157,0.2) !important; }
        .why-card:hover { border-color: ${NEON} !important; }
        .feat-card { transition: transform .3s, box-shadow .3s !important; }
        .why-card { transition: border-color .3s !important; }
      `}</style>

      {/* Hero */}
      <div style={{ position: "relative", minHeight: 340, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px 40px", overflow: "hidden", background: dark ? "linear-gradient(180deg,#0a0a0a 0%,#16061a 100%)" : "linear-gradient(180deg,#fff 0%,#fdf0f6 100%)" }}>
        <ParticlesBG />

        {/* Neon circles decorativi */}
        <div style={{ position: "absolute", top: -60, right: -60, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,20,147,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -40, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,107,157,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1, textAlign: "center", animation: "fadeUp .8s ease both" }}>
          <div style={{ fontSize: 13, letterSpacing: 4, color: NEON, marginBottom: 16, fontWeight: 500 }}>BENVENUTO/A, {user?.nome?.toUpperCase()}</div>
          <h1 style={{ fontSize: "clamp(32px,6vw,56px)", fontWeight: 700, color: dark ? "#fff" : "#111", margin: "0 0 16px", textShadow: dark ? glowText : "none", lineHeight: 1.15 }}>
            La tua suite di<br />
            <span style={{ background: `linear-gradient(90deg, ${NEON}, ${NEON2}, ${NEON})`, backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "shimmer 3s linear infinite" }}>
              produttività completa
            </span>
          </h1>
          <p style={{ fontSize: 16, color: c.textMuted, maxWidth: 480, margin: "0 auto 28px", lineHeight: 1.7 }}>
            9 strumenti integrati, tutto gratis, tutto privato. Lavora da qualsiasi dispositivo senza installare niente.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => onNavigate("note")} style={{ padding: "12px 28px", borderRadius: 30, border: `1.5px solid ${NEON}`, background: NEON, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", boxShadow: `0 0 20px rgba(255,107,157,0.4)` }}>
              Inizia ora →
            </button>
            <button onClick={() => document.getElementById("features-section").scrollIntoView({ behavior: "smooth" })}
              style={{ padding: "12px 28px", borderRadius: 30, border: `1.5px solid ${c.border}`, background: "transparent", color: c.text, fontSize: 15, cursor: "pointer" }}>
              Scopri di più
            </button>
          </div>
        </div>

        {/* Icone fluttuanti */}
        <div style={{ position: "absolute", zIndex: 0, inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          {["✏️","📊","🎨","📐","🧮","⏱️","🔄","🖼️","📄"].map((icon, i) => (
            <div key={i} style={{
              position: "absolute", fontSize: 22, opacity: 0.15,
              left: `${8 + (i * 11)}%`, top: `${15 + (i % 3) * 25}%`,
              animation: `float ${3 + i * 0.4}s ease-in-out ${i * 0.3}s infinite`,
            }}>{icon}</div>
          ))}
        </div>
      </div>

      {/* Widgets strumenti scrollabili */}
      <div id="features-section" style={{ padding: "40px 24px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, color: c.text }}>I tuoi strumenti</div>
            <div style={{ fontSize: 13, color: c.textMuted, marginTop: 3 }}>Clicca su uno strumento per aprirlo</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => scrollCards(-1)} style={{ width: 36, height: 36, borderRadius: "50%", border: `1px solid ${c.border}`, background: c.surface, color: c.textMuted, cursor: "pointer", fontSize: 16 }}>‹</button>
            <button onClick={() => scrollCards(1)}  style={{ width: 36, height: 36, borderRadius: "50%", border: `1px solid ${c.border}`, background: c.surface, color: c.textMuted, cursor: "pointer", fontSize: 16 }}>›</button>
          </div>
        </div>

        <div ref={scrollRef} style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 12, scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {FEATURES.map((f, i) => (
            <div key={i} className="feat-card" onClick={() => onNavigate(["note","foglio","disegno","slide","calc","cronometro","convertitore","imageeditor","pdfviewer"][i])}
              style={{ flexShrink: 0, width: 200, background: c.surface, border: `1px solid ${c.border}`, borderRadius: 16, padding: 20, cursor: "pointer", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: `radial-gradient(circle, ${f.color}22 0%, transparent 70%)` }} />
              <div style={{ width: 48, height: 48, borderRadius: 12, background: `${f.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 14, border: `1px solid ${f.color}33` }}>{f.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: c.text, marginBottom: 8 }}>{f.label}</div>
              <div style={{ fontSize: 12, color: c.textMuted, lineHeight: 1.6 }}>{f.desc}</div>
              <div style={{ marginTop: 14, fontSize: 12, color: f.color, fontWeight: 500 }}>Apri →</div>
            </div>
          ))}
        </div>
      </div>

      {/* Perché scegliere WorkfyStation */}
      <div style={{ padding: "16px 24px 40px" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: c.text }}>Perché WorkfyStation?</div>
          <div style={{ fontSize: 13, color: c.textMuted, marginTop: 3 }}>Tutto quello che ti serve, senza compromessi</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
          {WHY.map((w, i) => (
            <div key={i} className="why-card"
              style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 14, padding: "20px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 28 }}>{w.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: c.text }}>{w.title}</div>
              <div style={{ fontSize: 13, color: c.textMuted, lineHeight: 1.6 }}>{w.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "20px 24px", borderTop: `1px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 13, color: c.textHint }}>WorkfyStation v1.0 — Tutti gli strumenti in un posto</div>
        <div style={{ display: "flex", gap: 6 }}>
          {["✏️","📊","🎨","📐","🧮"].map((icon, i) => (
            <div key={i} style={{ fontSize: 18, opacity: 0.4 }}>{icon}</div>
          ))}
        </div>
      </div>
    </div>
  );
}