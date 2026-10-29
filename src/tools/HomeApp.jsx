import { useRef, useEffect } from "react";

const FEATURES = [
  { icon: "✏️", id: "note",         label: "Note",          desc: "Scrivi e organizza le tue note con stile. Titoli, formattazione e anteprima istantanea.",       color: "#3b82f6" },
  { icon: "📊", id: "foglio",       label: "Foglio",         desc: "Fogli di calcolo con formule avanzate: SOMMA, MEDIA, MAX, MIN e molto altro.",                    color: "#0ea5e9" },
  { icon: "🎨", id: "disegno",      label: "Disegno",        desc: "Canvas completo con penna, forme, frecce, testo e importazione immagini.",                       color: "#ec4899" },
  { icon: "📐", id: "slide",        label: "Slide",          desc: "Crea presentazioni con slide multiple, testi posizionabili e immagini di sfondo.",               color: "#f59e0b" },
  { icon: "🧮", id: "calc",         label: "Calcolatrice",   desc: "Modalità standard e scientifica con sin, cos, log, radici e cronologia dei calcoli.",             color: "#10b981" },
  { icon: "⏱️", id: "cronometro",   label: "Cronometro",     desc: "Cronometro con giri e timer con conto alla rovescia. Preciso al centesimo di secondo.",           color: "#6366f1" },
  { icon: "🔄", id: "convertitore", label: "Convertitore",   desc: "Valute in tempo reale, lunghezza, peso, temperatura, area, velocità e volume.",                  color: "#f97316" },
  { icon: "🖼️", id: "imageeditor",  label: "Editor Img",    desc: "Modifica le tue immagini con filtri, preset, rotazione e scaricale in alta qualità.",             color: "#14b8a6" },
  { icon: "📄", id: "pdfviewer",    label: "PDF / Word",     desc: "Visualizza file PDF e documenti Word direttamente nel browser, senza installare niente.",         color: "#a855f7" },
  { icon: "📓", id: "noteplus",     label: "Note PLUS",      desc: "Quaderni digitali con penna, evidenziatore, flashcard, registratore audio e sfondi personalizzati.", color: "#ec4899" },
];

const GLASS_DOCK_ITEMS = [
  { id: "note",        label: "Note",        icon: "✏️", glow: "#3b82f6" },
  { id: "todo",        label: "Tasks",       icon: "✅", glow: "#10b981" },
  { id: "foglio",      label: "Foglio",      icon: "📊", glow: "#0ea5e9" },
  { id: "disegno",     label: "Disegno",     icon: "🎨", glow: "#f97316" },
  { id: "slide",       label: "Slide",       icon: "📐", glow: "#f43f5e" },
  { id: "calc",        label: "Calcola",     icon: "🧮", glow: "#ec4899" },
  { id: "music",       label: "Musica",      icon: "🎵", glow: "#a855f7" },
  { id: "imageeditor", label: "Editor Img",  icon: "🖼️", glow: "#38bdf8" },
];

const WHY = [
  { icon: "🔒", title: "Privato",          desc: "I tuoi dati restano sul tuo dispositivo. Nessun server, nessun tracciamento." },
  { icon: "⚡", title: "Veloce",           desc: "Nessun caricamento, nessuna attesa. Tutto gira in locale, istantaneamente." },
  { icon: "📱", title: "Ovunque",          desc: "Funziona su telefono, tablet, PC e Mac. Installabile come app desktop o web." },
  { icon: "🆓", title: "Gratis",           desc: "Nessun abbonamento, nessuna pubblicità, nessuna limitazione." },
  { icon: "🎨", title: "Liquid Glass 3D",  desc: "Vetro smerigliato 3D stile Apple o tema bianco e nero ad alto contrasto." },
  { icon: "🔧", title: "In crescita",      desc: "Nuove funzioni aggiunte continuamente. La tua suite si evolve con te." },
];

function parseRgb(color) {
  if (!color || typeof color !== "string") return "255,255,255";
  let h = color.trim().replace("#", "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16) || 255;
    const g = parseInt(h.slice(2, 4), 16) || 255;
    const b = parseInt(h.slice(4, 6), 16) || 255;
    return `${r},${g},${b}`;
  }
  return "255,255,255";
}

function ParticlesBG({ color = "#ffffff" }) {
  const ref = useRef();
  const rgb = parseRgb(color);

  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    let w = c.width = c.offsetWidth;
    let h = c.height = c.offsetHeight;
    const pts = Array.from({ length: 50 }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3,
      r: Math.random() * 1.8 + .4, a: Math.random() * 0.5 + 0.1,
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},${p.a * 0.4})`; ctx.fill();
      });
      pts.forEach((p, i) => pts.slice(i + 1).forEach(q => {
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < 100) {
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(${rgb},${(1 - d / 100) * 0.1})`;
          ctx.lineWidth = .5; ctx.stroke();
        }
      }));
      raf = requestAnimationFrame(draw);
    };
    draw();
    const resize = () => { w = c.width = c.offsetWidth; h = c.height = c.offsetHeight; };
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [rgb]);
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
}

export default function HomeApp({ c, user, onNavigate }) {
  const scrollRef = useRef();
  const dark = c?.dark ?? (c?.bg === "#0a0a0a" || c?.bg === "#000000");
  const isBW = c?.isBW !== false;
  const accent = c?.accent || "#ffffff";
  const accentText = c?.accentText || (dark ? "#000000" : "#ffffff");
  const blurPx = c?.glassBlur || 34;

  const scrollCards = (dir) => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: dir * 300, behavior: "smooth" });
  };

  return (
    <div style={{ height: "100%", overflow: "auto", position: "relative", color: c.text }}>

      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
        .feat-card:hover { transform: translateY(-6px) !important; box-shadow: ${c.glass ? '0 22px 48px rgba(0,0,0,0.28), inset 0 2px 1.5px rgba(255,255,255,0.85)' : '0 10px 30px rgba(0,0,0,0.3)'} !important; border-color: ${c.glass ? c.glassBtnBorder : c.accent} !important; }
        .why-card:hover { transform: translateY(-3px); border-color: ${c.glass ? c.glassBtnBorder : c.accent} !important; }
        .glass-dock-tile:hover { transform: translateY(-6px) scale(1.05) !important; }
        .feat-card { transition: transform .25s, box-shadow .25s, border-color .25s !important; }
        .why-card { transition: transform .25s, border-color .25s, box-shadow .25s !important; }
      `}</style>

      {/* Hero */}
      <div style={{
        position: "relative", minHeight: 340, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: c.glass ? "36px 24px 28px" : "60px 24px 40px", overflow: "hidden",
        background: c.glass
          ? "transparent"
          : (dark
              ? (isBW ? "linear-gradient(180deg, #000000 0%, #0c0c0c 100%)" : `linear-gradient(180deg, ${c.bg} 0%, rgba(${parseRgb(accent)},0.08) 100%)`)
              : (isBW ? "linear-gradient(180deg, #ffffff 0%, #f4f4f5 100%)" : `linear-gradient(180deg, #ffffff 0%, rgba(${parseRgb(accent)},0.06) 100%)`)),
        borderBottom: c.glass ? "none" : `1px solid ${c.border}`,
      }}>
        {!c.glass && <ParticlesBG color={accent} />}

        {/* Cerchi decorativi sfumati quando non è attivo glass */}
        {!isBW && !c.glass && (
          <>
            <div style={{ position: "absolute", top: -60, right: -60, width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle, rgba(${parseRgb(accent)},0.12) 0%, transparent 70%)`, pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: -40, left: -40, width: 200, height: 200, borderRadius: "50%", background: `radial-gradient(circle, rgba(${parseRgb(accent)},0.08) 0%, transparent 70%)`, pointerEvents: "none" }} />
          </>
        )}

        <div
          className={c.glass ? "glass-card-3d glass-edge" : ""}
          style={{
            position: "relative",
            zIndex: 1,
            textAlign: "center",
            animation: "fadeUp .8s ease both",
            ...(c.glass
              ? {
                  maxWidth: 820,
                  width: "100%",
                  padding: "38px 32px 34px",
                  borderRadius: 28,
                  background: c.glassCard,
                  border: `1.5px solid ${c.glassBorder}`,
                  boxShadow: c.glassShadow,
                  backdropFilter: `blur(${blurPx}px) saturate(220%)`,
                  WebkitBackdropFilter: `blur(${blurPx}px) saturate(220%)`,
                }
              : {}),
          }}
        >
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 12, letterSpacing: 4, color: c.glass ? c.textMuted : (isBW ? c.textMuted : accent), marginBottom: 14, fontWeight: 600 }}>
              BENVENUTO/A, {user?.nome?.toUpperCase() || "UTENTE"}
            </div>
            <h1 style={{ fontSize: "clamp(30px,5.5vw,50px)", fontWeight: 700, color: c.text, margin: "0 0 14px", lineHeight: 1.15 }}>
              La tua suite di<br />
              <span style={{
                background: c.glass
                  ? (dark
                      ? "linear-gradient(90deg, #ffffff 0%, #bae6fd 50%, #f5d0fe 100%)"
                      : "linear-gradient(90deg, #ffffff 0%, #e0f2fe 100%)")
                  : (isBW
                      ? (dark ? "linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.7) 100%)" : "linear-gradient(180deg, #000000 0%, #444444 100%)")
                      : `linear-gradient(90deg, ${accent}, #a855f7)`),
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: c.glass && !dark && c.glassPreset === "orchid" ? c.text : "transparent",
              }}>
                produttività completa
              </span>
            </h1>
            <p style={{ fontSize: 15, color: c.textMuted, maxWidth: 520, margin: "0 auto 26px", lineHeight: 1.7 }}>
              Tutti gli strumenti essenziali per lavorare. Veloce, minimale e 100% offline-first.
            </p>

            {/* Se Liquid Glass è attivo: griglia 2x4 di icone Squircle 3D in vetro smerigliato (come Immagine 1) */}
            {c.glass && (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                gap: 18,
                maxWidth: 620,
                margin: "0 auto 28px",
                padding: "8px 4px",
              }}>
                {GLASS_DOCK_ITEMS.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className="glass-dock-tile"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 10,
                      cursor: "pointer",
                      transition: "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
                    }}
                  >
                    <div
                      className={dark ? "glass-squircle-dark" : "glass-squircle"}
                      style={{
                        width: 68,
                        height: 68,
                        borderRadius: 20,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 30,
                        position: "relative",
                        boxShadow: `0 14px 28px -6px ${item.glow}44, inset 0 2px 2px rgba(255,255,255,0.88), inset 0 -2px 6px ${item.glow}33`,
                      }}
                    >
                      <span style={{ filter: `drop-shadow(0 4px 8px ${item.glow}88)` }}>{item.icon}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: c.text, letterSpacing: 0.2 }}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => onNavigate("note")}
                className={c.glass ? "glass-btn" : ""}
                style={{
                  padding: "12px 30px", borderRadius: 30,
                  border: c.glass ? `1.5px solid ${c.glassBtnBorder}` : "none",
                  background: c.glass ? c.glassBtn : accent,
                  color: c.glass ? c.text : accentText,
                  fontSize: 15, fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: c.glass ? c.glassShadow : (isBW ? "0 4px 16px rgba(0,0,0,0.2)" : `0 0 20px ${accent}66`),
                  transition: "all .2s",
                }}
              >
                Inizia ora →
              </button>
              <button
                onClick={() => document.getElementById("features-section")?.scrollIntoView({ behavior: "smooth" })}
                className={c.glass ? "glass-btn" : ""}
                style={{
                  padding: "12px 28px", borderRadius: 30,
                  border: `1.5px solid ${c.glass ? c.glassBtnBorder : c.border}`,
                  background: c.glass ? c.surface : "transparent",
                  color: c.text, fontSize: 15, fontWeight: 500, cursor: "pointer", transition: "all .2s",
                }}
              >
                Scopri di più
              </button>
            </div>
          </div>
        </div>

        {/* Icone fluttuanti (solo modalità standard) */}
        {!c.glass && (
          <div style={{ position: "absolute", zIndex: 0, inset: 0, pointerEvents: "none", overflow: "hidden" }}>
            {["✏️","📊","🎨","📐","🧮","⏱️","🔄","🖼️","📄"].map((icon, i) => (
              <div key={i} style={{
                position: "absolute", fontSize: 22, opacity: 0.12,
                left: `${8 + (i * 11)}%`, top: `${15 + (i % 3) * 25}%`,
                animation: `float ${3 + i * 0.4}s ease-in-out ${i * 0.3}s infinite`,
              }}>{icon}</div>
            ))}
          </div>
        )}
      </div>

      {/* Widgets strumenti scrollabili */}
      <div id="features-section" style={{ padding: "32px 24px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, color: c.text }}>I tuoi strumenti</div>
            <div style={{ fontSize: 13, color: c.textMuted, marginTop: 3 }}>Clicca su uno strumento per aprirlo</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => scrollCards(-1)} className={c.glass?"glass-btn":""} style={{ width: 38, height: 38, borderRadius: "50%", border: `1.5px solid ${c.glass?c.glassBtnBorder:c.border}`, background: c.glass?c.glassBtn:c.surface, color: c.text, cursor: "pointer", fontSize: 16 }}>‹</button>
            <button onClick={() => scrollCards(1)}  className={c.glass?"glass-btn":""} style={{ width: 38, height: 38, borderRadius: "50%", border: `1.5px solid ${c.glass?c.glassBtnBorder:c.border}`, background: c.glass?c.glassBtn:c.surface, color: c.text, cursor: "pointer", fontSize: 16 }}>›</button>
          </div>
        </div>

        <div ref={scrollRef} style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 14, scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {FEATURES.map((f, i) => (
            <div key={i} className={`feat-card${c.glass?' glass-card-3d glass-edge':''}`} onClick={() => onNavigate(f.id)}
              style={{
                flexShrink: 0, width: 210,
                background: c.glass ? c.glassCard : c.surface,
                border: `1.5px solid ${c.glass ? c.glassBorder : c.border}`,
                borderRadius: 22, padding: 20, cursor: "pointer", position: "relative", overflow: "hidden",
                backdropFilter: c.glass ? `blur(${blurPx}px) saturate(215%)` : "none",
                WebkitBackdropFilter: c.glass ? `blur(${blurPx}px) saturate(215%)` : "none",
                boxShadow: c.glass ? c.glassShadow : "none",
              }}>
              <div style={{ position: "relative", zIndex: 1 }}>
                <div
                  className={c.glass ? (dark ? "glass-squircle-dark" : "glass-squircle") : ""}
                  style={{
                    width: 52, height: 52, borderRadius: 16,
                    background: c.glass ? undefined : (isBW ? c.accentBg : `${f.color}18`),
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 25, marginBottom: 14,
                    border: c.glass ? undefined : `1px solid ${isBW ? c.border : f.color + "33"}`,
                    boxShadow: c.glass ? `0 10px 22px -6px ${f.color}55, inset 0 2px 2px rgba(255,255,255,0.85)` : undefined,
                  }}
                >
                  <span style={c.glass ? { filter: `drop-shadow(0 3px 6px ${f.color}77)` } : undefined}>{f.icon}</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: c.text, marginBottom: 8 }}>{f.label}</div>
                <div style={{ fontSize: 12, color: c.textMuted, lineHeight: 1.6 }}>{f.desc}</div>
                <div style={{ marginTop: 14, fontSize: 12, color: c.glass ? c.text : (isBW ? c.text : f.color), fontWeight: 600 }}>Apri →</div>
              </div>
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
            <div key={i} className={`why-card${c.glass?' glass-card-3d glass-edge':''}`}
              style={{
                background: c.glass ? c.glassCard : c.surface,
                border: `1.5px solid ${c.glass ? c.glassBorder : c.border}`,
                borderRadius: 20, padding: "20px 18px", display: "flex", flexDirection: "column", gap: 10,
                backdropFilter: c.glass ? `blur(${blurPx}px) saturate(215%)` : "none",
                WebkitBackdropFilter: c.glass ? `blur(${blurPx}px) saturate(215%)` : "none",
                boxShadow: c.glass ? c.glassShadow : "none",
              }}>
              <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <div
                  className={c.glass ? (dark ? "glass-squircle-dark" : "glass-squircle") : ""}
                  style={c.glass ? { width: 44, height: 44, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 } : { fontSize: 28 }}
                >
                  {w.icon}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: c.text }}>{w.title}</div>
                <div style={{ fontSize: 13, color: c.textMuted, lineHeight: 1.6 }}>{w.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "20px 24px", borderTop: `1px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 13, color: c.textHint }}>WorkfyStation · Privacy & Productivity Suite</div>
        <div style={{ display: "flex", gap: 6 }}>
          {["✏️","📊","🎨","📐","🧮"].map((icon, i) => (
            <div key={i} style={{ fontSize: 18, opacity: 0.4 }}>{icon}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
