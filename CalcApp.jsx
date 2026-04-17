import { useState } from "react";

const NEON = "#ff6b9d";

const fmt = (n) => {
  if (isNaN(n) || !isFinite(n)) return "Errore";
  const num = parseFloat(n);
  if (Math.abs(num) > 1e15 || (Math.abs(num) < 1e-10 && num !== 0)) return num.toExponential(4);
  return parseFloat(num.toFixed(10)).toString();
};

export default function CalcApp({ c }) {
  const [display, setDisplay] = useState("0");
  const [expr, setExpr] = useState("");
  const [history, setHistory] = useState([]);
  const [mode, setMode] = useState("standard");
  const [showHistory, setShowHistory] = useState(false);

  const press = (v) => {
    if (v === "AC") { setDisplay("0"); setExpr(""); return; }
    if (v === "CE") { setDisplay("0"); return; }
    if (v === "=") {
      try {
        const full = expr + display;
        const san = full.replace(/x/g, "*").replace(/÷/g, "/");
        const r = eval(san);
        const res = fmt(r);
        setHistory(h => [{ expr: full, res }, ...h].slice(0, 20));
        setDisplay(res); setExpr("");
      } catch (e) { setDisplay("Errore"); setExpr(""); }
      return;
    }
    if (v === "+/-") { setDisplay(d => d.startsWith("-") ? d.slice(1) : "-" + d); return; }
    if (v === "%")    { setDisplay(d => fmt(parseFloat(d) / 100)); return; }
    if (v === "sqrt") { setDisplay(d => { const n = parseFloat(d); return n < 0 ? "Errore" : fmt(Math.sqrt(n)); }); return; }
    if (v === "sq")   { setDisplay(d => fmt(Math.pow(parseFloat(d), 2))); return; }
    if (v === "cube") { setDisplay(d => fmt(Math.pow(parseFloat(d), 3))); return; }
    if (v === "inv")  { setDisplay(d => { const n = parseFloat(d); return n === 0 ? "Errore" : fmt(1 / n); }); return; }
    if (v === "sin")  { setDisplay(d => fmt(Math.sin(parseFloat(d) * Math.PI / 180))); return; }
    if (v === "cos")  { setDisplay(d => fmt(Math.cos(parseFloat(d) * Math.PI / 180))); return; }
    if (v === "tan")  { setDisplay(d => { const n = parseFloat(d); const r = Math.tan(n * Math.PI / 180); return Math.abs(r) > 1e12 ? "Errore" : fmt(r); }); return; }
    if (v === "asin") { setDisplay(d => fmt(Math.asin(parseFloat(d)) * 180 / Math.PI)); return; }
    if (v === "acos") { setDisplay(d => fmt(Math.acos(parseFloat(d)) * 180 / Math.PI)); return; }
    if (v === "atan") { setDisplay(d => fmt(Math.atan(parseFloat(d)) * 180 / Math.PI)); return; }
    if (v === "log")  { setDisplay(d => { const n = parseFloat(d); return n <= 0 ? "Errore" : fmt(Math.log10(n)); }); return; }
    if (v === "ln")   { setDisplay(d => { const n = parseFloat(d); return n <= 0 ? "Errore" : fmt(Math.log(n)); }); return; }
    if (v === "exp")  { setDisplay(d => fmt(Math.exp(parseFloat(d)))); return; }
    if (v === "pi")   { setDisplay(fmt(Math.PI)); return; }
    if (v === "e")    { setDisplay(fmt(Math.E)); return; }
    if (v === "abs")  { setDisplay(d => fmt(Math.abs(parseFloat(d)))); return; }
    if (v === "floor"){ setDisplay(d => fmt(Math.floor(parseFloat(d)))); return; }
    if (v === "ceil") { setDisplay(d => fmt(Math.ceil(parseFloat(d)))); return; }
    if (v === "BS")   { setDisplay(d => d.length > 1 ? d.slice(0, -1) : "0"); return; }
    if (["+", "-", "x", "÷"].includes(v)) { setExpr(display + v); setDisplay("0"); return; }
    if (v === ".") { if (!display.includes(".")) setDisplay(d => d + "."); return; }
    if (display === "0" || display === "Errore") { setDisplay(v); } else { setDisplay(d => d + v); }
  };

  const std = [
    [{ v:"AC",l:"AC",t:"action"},{v:"CE",l:"CE",t:"action"},{v:"%",l:"%",t:"action"},{v:"÷",l:"÷",t:"op"}],
    [{ v:"7",l:"7"},{v:"8",l:"8"},{v:"9",l:"9"},{v:"x",l:"×",t:"op"}],
    [{ v:"4",l:"4"},{v:"5",l:"5"},{v:"6",l:"6"},{v:"-",l:"−",t:"op"}],
    [{ v:"1",l:"1"},{v:"2",l:"2"},{v:"3",l:"3"},{v:"+",l:"+",t:"op"}],
    [{ v:"+/-",l:"+/−"},{v:"0",l:"0"},{v:".",l:"."},{v:"=",l:"=",t:"eq"}],
  ];
  const sci = [
    [{v:"sin",l:"sin",t:"fn"},{v:"cos",l:"cos",t:"fn"},{v:"tan",l:"tan",t:"fn"},{v:"pi",l:"π",t:"fn"},{v:"e",l:"e",t:"fn"}],
    [{v:"asin",l:"sin⁻¹",t:"fn"},{v:"acos",l:"cos⁻¹",t:"fn"},{v:"atan",l:"tan⁻¹",t:"fn"},{v:"log",l:"log",t:"fn"},{v:"ln",l:"ln",t:"fn"}],
    [{v:"sqrt",l:"√x",t:"fn"},{v:"sq",l:"x²",t:"fn"},{v:"cube",l:"x³",t:"fn"},{v:"inv",l:"1/x",t:"fn"},{v:"exp",l:"eˣ",t:"fn"}],
    [{v:"abs",l:"|x|",t:"fn"},{v:"floor",l:"⌊x⌋",t:"fn"},{v:"ceil",l:"⌈x⌉",t:"fn"},{v:"BS",l:"⌫",t:"action"},{v:"%",l:"%",t:"action"}],
    ...std,
  ];

  const rows = mode === "standard" ? std : sci;
  const cols = mode === "standard" ? 4 : 5;

  const bc = (t) =>
    t === "eq"     ? { bg: NEON, color: "#fff", border: NEON } :
    t === "op"     ? { bg: c.accentBg, color: c.accent, border: c.accent } :
    t === "fn"     ? { bg: c.accentBg2, color: c.textMuted, border: c.border } :
    t === "action" ? { bg: c.accentBg2, color: c.textMuted, border: c.border } :
                     { bg: c.surface, color: c.text, border: c.border };

  return (
    <div style={{ maxWidth: mode === "standard" ? 320 : 460, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 8 }}>
        {["standard", "scientifico"].map(m => (
          <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${mode === m ? c.accent : c.border}`, background: mode === m ? c.accentBg : "transparent", cursor: "pointer", fontSize: 13, color: mode === m ? c.accent : c.textMuted }}>
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
        <button onClick={() => setShowHistory(!showHistory)} style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${showHistory ? c.accent : c.border}`, background: showHistory ? c.accentBg : "transparent", cursor: "pointer", fontSize: 12, color: showHistory ? c.accent : c.textMuted }}>
          Cronologia
        </button>
      </div>

      {showHistory && (
        <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 10, padding: 12, maxHeight: 120, overflow: "auto" }}>
          {history.length === 0
            ? <div style={{ fontSize: 12, color: c.textHint, textAlign: "center" }}>Nessun calcolo</div>
            : history.map((h, i) => (
              <div key={i} onClick={() => setDisplay(h.res)} style={{ fontSize: 12, padding: "4px 0", borderBottom: `1px solid ${c.border}`, cursor: "pointer", display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: c.textMuted }}>{h.expr}</span>
                <span style={{ color: c.accent, fontWeight: 500 }}>= {h.res}</span>
              </div>
            ))}
        </div>
      )}

      <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 14, padding: "16px 20px" }}>
        <div style={{ fontSize: 12, color: c.textHint, minHeight: 20, textAlign: "right" }}>{expr || " "}</div>
        <div style={{ fontSize: display.length > 12 ? 22 : 36, fontWeight: 500, color: c.text, textAlign: "right", wordBreak: "break-all" }}>{display}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8 }}>
        {rows.flat().map((b, i) => {
          const bcc = bc(b.t);
          return (
            <button key={i} onClick={() => press(b.v)}
              style={{ padding: "15px 4px", borderRadius: 12, fontSize: b.l.length > 3 ? 11 : b.l.length > 2 ? 13 : 18, border: `1px solid ${bcc.border}`, cursor: "pointer", background: bcc.bg, color: bcc.color, transition: "all .15s", lineHeight: 1 }}>
              {b.l}
            </button>
          );
        })}
      </div>
    </div>
  );
}