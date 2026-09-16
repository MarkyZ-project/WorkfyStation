import { useState, useRef, useEffect } from "react";

const NEON = "#ff6b9d";

// Generate beep sound via Web Audio API (no external files needed)
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.8);
    // Second beep
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 1100;
    osc2.type = "sine";
    gain2.gain.setValueAtTime(0.4, ctx.currentTime + 0.3);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.1);
    osc2.start(ctx.currentTime + 0.3);
    osc2.stop(ctx.currentTime + 1.1);
    // Third beep (high)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.frequency.value = 1320;
    osc3.type = "sine";
    gain3.gain.setValueAtTime(0.5, ctx.currentTime + 0.6);
    gain3.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.6);
    osc3.start(ctx.currentTime + 0.6);
    osc3.stop(ctx.currentTime + 1.6);
    setTimeout(() => ctx.close(), 2000);
  } catch { /* browser may block audio */ }
}

function pad(n) { return String(n).padStart(2, "0"); }

function formatTime(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return { h, m, s, cs };
}

export default function CronometroApp({ c }) {
  const [tab, setTab] = useState("cronometro");

  // Cronometro
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [laps, setLaps] = useState([]);
  const startRef = useRef(null);
  const rafRef = useRef(null);

  // eslint-disable-next-line react-hooks/purity
  const tick = () => { setElapsed(Date.now() - startRef.current); rafRef.current = requestAnimationFrame(tick); };

  const startStop = () => {
    if (running) {
      cancelAnimationFrame(rafRef.current);
      setRunning(false);
    } else {
      startRef.current = Date.now() - elapsed;
      rafRef.current = requestAnimationFrame(tick);
      setRunning(true);
    }
  };

  const reset = () => {
    cancelAnimationFrame(rafRef.current);
    setRunning(false); setElapsed(0); setLaps([]);
  };

  const lap = () => { if (running) setLaps(l => [...l, elapsed]); };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // Timer
  const [timerInput, setTimerInput] = useState({ h: 0, m: 5, s: 0 });
  const [timerMs, setTimerMs] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerDone, setTimerDone] = useState(false);
  const timerStart = useRef(null);
  const timerTotal = useRef(0);
  const timerRaf = useRef(null);

  const timerTick = () => {
    // eslint-disable-next-line react-hooks/purity
    const remaining = timerTotal.current - (Date.now() - timerStart.current);
    if (remaining <= 0) {
      setTimerMs(0); setTimerRunning(false); setTimerDone(true);
      playBeep();
      cancelAnimationFrame(timerRaf.current); return;
    }
    setTimerMs(remaining);
    timerRaf.current = requestAnimationFrame(timerTick);
  };

  const startTimer = () => {
    const total = (timerInput.h * 3600 + timerInput.m * 60 + timerInput.s) * 1000;
    if (total <= 0) return;
    timerTotal.current = total;
    timerStart.current = Date.now();
    setTimerMs(total); setTimerRunning(true); setTimerDone(false);
    timerRaf.current = requestAnimationFrame(timerTick);
  };

  const stopTimer = () => { cancelAnimationFrame(timerRaf.current); setTimerRunning(false); };
  const resetTimer = () => { cancelAnimationFrame(timerRaf.current); setTimerRunning(false); setTimerMs(0); setTimerDone(false); };

  useEffect(() => () => cancelAnimationFrame(timerRaf.current), []);

  const { h, m, s, cs } = formatTime(elapsed);
  const tr = formatTime(timerMs);

  const btn = (active, color) => ({
    padding: "12px 24px", borderRadius: 10, fontSize: 15, fontWeight: 500, cursor: "pointer",
    border: `1px solid ${color || c.accent}`,
    background: active ? (color || c.accent) : "transparent",
    color: active ? "#fff" : (color || c.accent),
    transition: "all .2s",
  });

  const tabBtn = (id) => ({
    flex: 1, padding: "8px", borderRadius: 8, cursor: "pointer", fontSize: 13,
    border: `1px solid ${tab === id ? c.accent : c.border}`,
    background: tab === id ? c.accentBg : "transparent",
    color: tab === id ? c.accent : c.textMuted,
  });

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setTab("cronometro")} style={tabBtn("cronometro")}>Cronometro</button>
        <button onClick={() => setTab("timer")} style={tabBtn("timer")}>Timer</button>
      </div>

      {tab === "cronometro" && (
        <>
          <div style={{ textAlign: "center", padding: "32px 0", background: c.surface, border: `1px solid ${c.border}`, borderRadius: 16 }}>
            <div style={{ fontSize: 64, fontWeight: 200, color: c.text, letterSpacing: 4, fontVariantNumeric: "tabular-nums" }}>
              {pad(h)}:{pad(m)}:{pad(s)}
            </div>
            <div style={{ fontSize: 28, color: c.accent, marginTop: 4 }}>.{pad(cs)}</div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={startStop} style={btn(running)}>{running ? "Pausa" : elapsed > 0 ? "Riprendi" : "Avvia"}</button>
            <button onClick={lap} style={{ ...btn(false), opacity: running ? 1 : 0.4 }}>Giro</button>
            <button onClick={reset} style={btn(false, "#888")}>Reset</button>
          </div>
          {laps.length > 0 && (
            <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 12, padding: 16, maxHeight: 200, overflow: "auto" }}>
              <div style={{ fontSize: 12, color: c.textHint, marginBottom: 8, letterSpacing: 1 }}>GIRI</div>
              {[...laps].reverse().map((l, i) => {
                const { h, m, s, cs } = formatTime(l);
                const idx = laps.length - i;
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${c.border}`, fontSize: 14 }}>
                    <span style={{ color: c.textMuted }}>Giro {idx}</span>
                    <span style={{ color: c.text, fontVariantNumeric: "tabular-nums" }}>{pad(h)}:{pad(m)}:{pad(s)}.{pad(cs)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "timer" && (
        <>
          {!timerRunning && timerMs === 0 && (
            <div style={{ display: "flex", gap: 12, justifyContent: "center", alignItems: "center" }}>
              {[{ label: "Ore", key: "h", max: 23 }, { label: "Min", key: "m", max: 59 }, { label: "Sec", key: "s", max: 59 }].map(f => (
                <div key={f.key} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: c.textHint, marginBottom: 4, letterSpacing: 1 }}>{f.label.toUpperCase()}</div>
                  <input type="number" min="0" max={f.max} value={timerInput[f.key]}
                    onChange={e => setTimerInput(t => ({ ...t, [f.key]: Math.min(f.max, Math.max(0, Number(e.target.value))) }))}
                    style={{ width: 72, padding: "12px 8px", borderRadius: 10, border: `1px solid ${c.border}`, background: c.inputBg, color: c.text, fontSize: 28, textAlign: "center", outline: "none", fontVariantNumeric: "tabular-nums" }} />
                </div>
              ))}
            </div>
          )}
          {(timerRunning || timerMs > 0) && (
            <div style={{ textAlign: "center", padding: "32px 0", background: c.surface, border: `1px solid ${timerDone ? NEON : c.border}`, borderRadius: 16, boxShadow: timerDone ? `0 0 20px ${NEON}` : "none", transition: "all .5s" }}>
              <div style={{ fontSize: 64, fontWeight: 200, color: timerDone ? NEON : c.text, letterSpacing: 4 }}>
                {pad(tr.h)}:{pad(tr.m)}:{pad(tr.s)}
              </div>
              {timerDone && <div style={{ color: NEON, fontSize: 18, marginTop: 8, fontWeight: 500 }}>Tempo scaduto!</div>}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            {!timerRunning && timerMs === 0 && <button onClick={startTimer} style={btn(true)}>Avvia</button>}
            {timerRunning && <button onClick={stopTimer} style={btn(true)}>Pausa</button>}
            {!timerRunning && timerMs > 0 && !timerDone && <button onClick={() => { timerStart.current = Date.now(); setTimerRunning(true); timerRaf.current = requestAnimationFrame(timerTick); }} style={btn(false)}>Riprendi</button>}
            {timerMs > 0 && <button onClick={resetTimer} style={btn(false, "#888")}>Reset</button>}
          </div>
        </>
      )}
    </div>
  );
}