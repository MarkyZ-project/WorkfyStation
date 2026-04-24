import { useEffect, useRef } from "react";

const GOLD = "#FFD700";
const GOLD2 = "#FFA500";
const GOLD3 = "#FFEC8B";

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
      r: Math.random() * 2 + .3, a: Math.random() * 0.5 + 0.1,
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,215,0,${p.a * 0.5})`; ctx.fill();
      });
      pts.forEach((p, i) => pts.slice(i + 1).forEach(q => {
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < 100) {
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(255,215,0,${(1 - d / 100) * 0.1})`;
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

// Icona corona SVG personalizzata
function CrownIcon({ size = 24, color = GOLD }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 17L5 9L9 13L12 6L15 13L19 9L21 17H3Z" fill={color} stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
      <rect x="3" y="17" width="18" height="2.5" rx="1.25" fill={color}/>
      <circle cx="12" cy="6" r="1.5" fill={color}/>
      <circle cx="5" cy="9" r="1.2" fill={color}/>
      <circle cx="19" cy="9" r="1.2" fill={color}/>
    </svg>
  );
}

const STANDARD_FEATURES = [
  { icon: "✏️", label: "Note illimitate",           available: true  },
  { icon: "📊", label: "Foglio di calcolo",          available: true  },
  { icon: "🎨", label: "Disegno e canvas",           available: true  },
  { icon: "📐", label: "Presentazioni base",         available: true  },
  { icon: "🧮", label: "Calcolatrice completa",      available: true  },
  { icon: "⏱️", label: "Cronometro e timer",         available: true  },
  { icon: "🔄", label: "Convertitore valute",        available: true  },
  { icon: "🖼️", label: "Editor immagini",           available: true  },
  { icon: "📄", label: "Visualizzatore PDF/Word",    available: true  },
  { icon: "🎵", label: "Lettore musicale",           available: true  },
  { icon: "✅", label: "To-Do List e progetti",      available: true  },
  { icon: "☁️", label: "Salvataggio cloud",          available: false },
  { icon: "🤖", label: "AI Assistant",               available: false },
  { icon: "👥", label: "Collaborazione in tempo reale", available: false },
  { icon: "📤", label: "Export PDF professionale",   available: false },
  { icon: "🎨", label: "Temi premium esclusivi",     available: false },
];

const PLUS_FEATURES = [
  { icon: "☁️", label: "Salvataggio cloud su tutti i dispositivi", hot: true  },
  { icon: "🤖", label: "AI Assistant avanzato senza limiti",       hot: true  },
  { icon: "👥", label: "Collaborazione in tempo reale",            hot: false },
  { icon: "📤", label: "Export PDF e DOCX professionale",          hot: false },
  { icon: "🎨", label: "Temi premium ed esclusivi",                hot: false },
  { icon: "📱", label: "App nativa iOS e Android",                 hot: true  },
  { icon: "🔒", label: "Cifratura avanzata dei dati",              hot: false },
  { icon: "⚡", label: "Accesso prioritario alle nuove funzioni",  hot: false },
  { icon: "🎯", label: "Statistiche e report avanzati",            hot: false },
  { icon: "💬", label: "Supporto prioritario 24/7",                hot: false },
];

export default function PlusScreen({ c, user }) {
  const glowGold = `0 0 10px ${GOLD}, 0 0 20px ${GOLD2}, 0 0 40px ${GOLD}`;

  return (
    <div style={{ height: "100%", overflow: "auto", position: "relative" }}>
      <style>{`
        @keyframes shimmerGold {
          0%   { background-position: 200% center }
          100% { background-position: -200% center }
        }
        @keyframes floatCrown {
          0%,100% { transform: translateY(0px) rotate(-3deg) }
          50%     { transform: translateY(-8px) rotate(3deg) }
        }
        @keyframes pulseGold {
          0%,100% { box-shadow: 0 0 12px ${GOLD}66 }
          50%     { box-shadow: 0 0 28px ${GOLD}, 0 0 50px ${GOLD2} }
        }
        @keyframes fadeUpG {
          from { opacity:0; transform:translateY(20px) }
          to   { opacity:1; transform:translateY(0) }
        }
        .plus-card:hover {
          transform: translateY(-4px) !important;
          box-shadow: 0 12px 40px rgba(255,215,0,0.2) !important;
        }
        .plus-card { transition: transform .3s, box-shadow .3s !important; }
      `}</style>

      {/* ── HERO ── */}
      <div style={{ position: "relative", minHeight: 280, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px 40px", overflow: "hidden", background: "linear-gradient(180deg,#0a0800 0%,#1a1200 60%,#0a0a0a 100%)" }}>
        <ParticlesBG />

        {/* Cerchi decorativi dorati */}
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle, ${GOLD}18 0%, transparent 70%)`, pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -40, left: -60, width: 200, height: 200, borderRadius: "50%", background: `radial-gradient(circle, ${GOLD2}12 0%, transparent 70%)`, pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
          {/* Corona animata */}
          <div style={{ animation: "floatCrown 3s ease-in-out infinite", display: "inline-block", marginBottom: 16, filter: `drop-shadow(0 0 12px ${GOLD})` }}>
            <CrownIcon size={64} color={GOLD} />
          </div>

          <h1 style={{ fontSize: "clamp(28px,5vw,48px)", fontWeight: 700, margin: "0 0 12px", lineHeight: 1.15 }}>
            <span style={{ background: `linear-gradient(90deg,${GOLD3},${GOLD},${GOLD2},${GOLD},${GOLD3})`, backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "shimmerGold 3s linear infinite" }}>
              Workfy PLUS
            </span>
          </h1>

          <p style={{ fontSize: 16, color: "rgba(255,215,0,0.6)", maxWidth: 460, margin: "0 auto 24px", lineHeight: 1.7 }}>
            Porta la tua produttività al livello successivo. Funzioni esclusive, AI avanzata, sincronizzazione cloud e molto altro.
          </p>

          {/* Badge "Prossimamente" */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 30, background: `linear-gradient(135deg,${GOLD}22,${GOLD2}11)`, border: `1px solid ${GOLD}44` }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: GOLD, boxShadow: `0 0 8px ${GOLD}`, animation: "pulseGold 2s infinite" }} />
            <span style={{ fontSize: 13, color: GOLD, fontWeight: 600, letterSpacing: 1 }}>PROSSIMAMENTE</span>
          </div>
        </div>
      </div>

      <div style={{ padding: "24px 20px", maxWidth: 860, margin: "0 auto" }}>

        {/* ── PIANO ATTUALE ── */}
        <div style={{ marginBottom: 12, fontSize: 12, color: c.textHint, letterSpacing: 1 }}>IL TUO PIANO ATTUALE</div>
        <div className="plus-card" style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 20, padding: "24px", marginBottom: 20, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: 120, background: "radial-gradient(circle,rgba(150,150,150,0.06) 0%,transparent 70%)", pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(150,150,150,0.1)", border: "1.5px solid rgba(150,150,150,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <path d="M3 17L5 9L9 13L12 6L15 13L19 9L21 17H3Z" fill="rgba(180,180,180,0.6)" stroke="rgba(180,180,180,0.6)" strokeWidth="1.5" strokeLinejoin="round"/>
                <rect x="3" y="17" width="18" height="2.5" rx="1.25" fill="rgba(180,180,180,0.6)"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: c.text }}>Standard</div>
              <div style={{ fontSize: 13, color: c.textMuted, marginTop: 2 }}>Piano gratuito · Nessuna scadenza</div>
            </div>
            <div style={{ marginLeft: "auto", padding: "6px 16px", borderRadius: 20, background: "rgba(150,150,150,0.1)", border: "1px solid rgba(150,150,150,0.3)", fontSize: 13, color: "rgba(180,180,180,0.8)", fontWeight: 600 }}>
              ATTIVO
            </div>
          </div>

          {/* Utente */}
          {user && (
            <div style={{ padding: "12px 16px", background: "rgba(150,150,150,0.06)", borderRadius: 12, marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(150,150,150,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "rgba(180,180,180,0.8)" }}>
                {user.nome?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: c.text }}>{user.nome} {user.cognome}</div>
                <div style={{ fontSize: 12, color: c.textMuted }}>{user.email}</div>
              </div>
            </div>
          )}

          {/* Funzioni standard */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 8 }}>
            {STANDARD_FEATURES.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, background: f.available ? "rgba(150,150,150,0.05)" : "transparent", opacity: f.available ? 1 : 0.4 }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: f.available ? "rgba(150,150,150,0.15)" : "transparent", border: `1px solid ${f.available ? "rgba(150,150,150,0.4)" : "rgba(150,150,150,0.15)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 9, color: f.available ? "rgba(180,180,180,0.8)" : "rgba(100,100,100,0.5)", fontWeight: 700 }}>
                  {f.available ? "✓" : "✕"}
                </div>
                <span style={{ fontSize: 12, color: f.available ? c.text : c.textHint }}>{f.icon} {f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── PIANO PLUS ── */}
        <div style={{ marginBottom: 12, fontSize: 12, color: c.textHint, letterSpacing: 1 }}>PASSA A PLUS</div>
        <div className="plus-card" style={{ background: "linear-gradient(135deg,#0f0a00,#1a1200,#0f0a00)", border: `1.5px solid ${GOLD}55`, borderRadius: 20, padding: "24px", position: "relative", overflow: "hidden", boxShadow: `0 4px 30px rgba(255,215,0,0.1)` }}>

          {/* Sfondo decorativo */}
          <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 80% 20%, ${GOLD}10 0%, transparent 60%)`, pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: -2, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${GOLD},${GOLD2},${GOLD},transparent)` }} />

          {/* Badge popolare */}
          <div style={{ position: "absolute", top: 20, right: 20, padding: "4px 12px", borderRadius: 20, background: `linear-gradient(135deg,${GOLD},${GOLD2})`, fontSize: 10, fontWeight: 700, color: "#000", letterSpacing: 1 }}>
            PREMIUM
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24, position: "relative", zIndex: 1 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg,${GOLD}33,${GOLD2}22)`, border: `1.5px solid ${GOLD}66`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 16px ${GOLD}44`, animation: "pulseGold 3s infinite" }}>
              <CrownIcon size={26} color={GOLD} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>
                <span style={{ background: `linear-gradient(90deg,${GOLD3},${GOLD},${GOLD2})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Workfy PLUS
                </span>
              </div>
              <div style={{ fontSize: 13, color: `${GOLD}99`, marginTop: 2 }}>Tutte le funzioni · Nessun limite</div>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right", position: "relative", zIndex: 1 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: GOLD, textShadow: `0 0 12px ${GOLD}` }}>
                ???
              </div>
              <div style={{ fontSize: 11, color: `${GOLD}66` }}>/ mese · Prossimamente</div>
            </div>
          </div>

          {/* Funzioni Plus */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 8, marginBottom: 24, position: "relative", zIndex: 1 }}>
            {PLUS_FEATURES.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, background: `linear-gradient(135deg,${GOLD}08,${GOLD2}04)`, border: `1px solid ${GOLD}22` }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: `linear-gradient(135deg,${GOLD}33,${GOLD2}22)`, border: `1px solid ${GOLD}55`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 10, color: GOLD, fontWeight: 700 }}>✓</div>
                <span style={{ fontSize: 12, color: `${GOLD}cc`, fontWeight: f.hot ? 500 : 400 }}>{f.icon} {f.label}</span>
                {f.hot && <div style={{ marginLeft: "auto", fontSize: 9, padding: "1px 6px", borderRadius: 8, background: `${GOLD}22`, color: GOLD, fontWeight: 700, whiteSpace: "nowrap" }}>HOT</div>}
              </div>
            ))}
          </div>

          {/* Bottone CTA */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <button disabled style={{ width: "100%", padding: "16px", borderRadius: 14, border: `1.5px solid ${GOLD}88`, background: `linear-gradient(135deg,${GOLD}22,${GOLD2}11)`, color: `${GOLD}88`, fontSize: 16, fontWeight: 700, cursor: "not-allowed", letterSpacing: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <CrownIcon size={20} color={`${GOLD}88`} />
              DISPONIBILE PROSSIMAMENTE
            </button>
            <div style={{ textAlign: "center", marginTop: 10, fontSize: 12, color: `${GOLD}55` }}>
              Stiamo lavorando per portarti il meglio · Resta aggiornato
            </div>
          </div>
        </div>

        {/* ── CONFRONTO ── */}
        <div style={{ marginTop: 24, marginBottom: 12, fontSize: 12, color: c.textHint, letterSpacing: 1 }}>CONFRONTO PIANI</div>
        <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: `1px solid ${c.border}` }}>
            <div style={{ padding: "12px 16px", fontSize: 12, color: c.textHint }}>FUNZIONE</div>
            <div style={{ padding: "12px 16px", fontSize: 12, color: "rgba(180,180,180,0.7)", textAlign: "center", borderLeft: `1px solid ${c.border}` }}>STANDARD</div>
            <div style={{ padding: "12px 16px", fontSize: 12, textAlign: "center", borderLeft: `1px solid ${c.border}`, background: `${GOLD}06` }}>
              <span style={{ background: `linear-gradient(90deg,${GOLD},${GOLD2})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 700 }}>PLUS</span>
            </div>
          </div>
          {[
            { label: "Tutti gli strumenti base", std: true,     plus: true     },
            { label: "Salvataggio locale",        std: true,     plus: true     },
            { label: "Temi personalizzabili",     std: true,     plus: true     },
            { label: "Salvataggio cloud",          std: false,    plus: true     },
            { label: "AI Assistant",               std: false,    plus: true     },
            { label: "Collaborazione",             std: false,    plus: true     },
            { label: "Export professionale",       std: false,    plus: true     },
            { label: "App nativa mobile",          std: false,    plus: true     },
            { label: "Supporto prioritario",       std: false,    plus: true     },
            { label: "Temi premium",               std: false,    plus: true     },
          ].map((row, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: i < 9 ? `1px solid ${c.border}` : "none" }}>
              <div style={{ padding: "10px 16px", fontSize: 13, color: c.text }}>{row.label}</div>
              <div style={{ padding: "10px 16px", textAlign: "center", borderLeft: `1px solid ${c.border}`, fontSize: 14, color: row.std ? "rgba(150,150,150,0.7)" : "rgba(100,100,100,0.3)" }}>{row.std ? "✓" : "—"}</div>
              <div style={{ padding: "10px 16px", textAlign: "center", borderLeft: `1px solid ${c.border}`, fontSize: 14, color: row.plus ? GOLD : `${GOLD}30`, background: `${GOLD}04`, fontWeight: row.plus ? 600 : 400 }}>{row.plus ? "✓" : "—"}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "24px 0 12px", color: c.textHint, fontSize: 12 }}>
          WorkfyStation · Piano Standard sempre gratuito · PLUS in arrivo
        </div>
      </div>
    </div>
  );
}