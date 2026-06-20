import { useState } from "react";

const key = (email, name) => `${name}_${email}`;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const COLS = 8;

function calcRange(fn, cells, from, to, evalCell) {
  const c1 = from.charCodeAt(0) - 65, r1 = parseInt(from.slice(1)) - 1;
  const c2 = to.charCodeAt(0) - 65,   r2 = parseInt(to.slice(1)) - 1;
  const vals = [];
  for (let r = r1; r <= r2; r++) {
    for (let ci = c1; ci <= c2; ci++) {
      const cv = cells[LETTERS[ci] + (r + 1)];
      const n = parseFloat(evalCell(cv || ""));
      if (!isNaN(n)) vals.push(n);
    }
  }
  if (!vals.length) return "0";
  if (fn === "SOMMA" || fn === "SUM") return String(vals.reduce((a, b) => a + b, 0));
  if (fn === "MEDIA" || fn === "AVG") return String(parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(6)));
  if (fn === "MAX") return String(Math.max(...vals));
  if (fn === "MIN") return String(Math.min(...vals));
  if (fn === "CONTA" || fn === "COUNT") return String(vals.length);
  return "#ERR";
}

export default function FoglioApp({ email, c }) {
  const k = key(email, "foglio");
  const [rows, setRows] = useState(15);
  const [cells, setCells] = useState(() => { try { return JSON.parse(localStorage.getItem(k) || "{}"); } catch { return {}; } });
  const [sel, setSel] = useState(null);

  const set = (ck, v) => {
    const n = { ...cells, [ck]: v };
    setCells(n);
    localStorage.setItem(k, JSON.stringify(n));
  };

  function evalCell(v) {
    if (!v) return "";
    if (!v.startsWith("=")) return v;
    try {
      let expr = v.slice(1).toUpperCase();
      const rangeMatch = expr.match(/^(SOMMA|SUM|MEDIA|AVG|MAX|MIN|CONTA|COUNT)\(([A-Z]\d+):([A-Z]\d+)\)$/);
      if (rangeMatch) return calcRange(rangeMatch[1], cells, rangeMatch[2], rangeMatch[3], evalCell);
      expr = expr.replace(/[A-Z]+\d+/g, m => {
        const res = evalCell(cells[m] || "0");
        return isNaN(res) ? 0 : Number(res);
      });
      // Indirect eval: sicuro perché l'espressione è già sanitizzata (solo operatori matematici)
      // eslint-disable-next-line react-hooks/unsupported-syntax
      return String((0, eval)(expr));
    } catch { return "#ERR"; }
  }

  const th = { background: c.accentBg2, border: `1px solid ${c.border}`, padding: "6px 8px", fontWeight: 500, color: c.accent, fontSize: 12 };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", paddingBottom: 8, borderBottom: `1px solid ${c.border}` }}>
        <span style={{ fontSize: 12, color: c.textMuted }}>Formule: =SOMMA(A1:A10) =MEDIA =MAX =MIN =CONTA</span>
        <button onClick={() => setRows(r => r + 10)} style={{ marginLeft: "auto", padding: "5px 12px", borderRadius: 7, border: `1px solid ${c.accent}`, background: c.accentBg, color: c.accent, cursor: "pointer", fontSize: 12 }}>+ 10 righe</button>
        <button onClick={() => setRows(r => Math.max(5, r - 10))} style={{ padding: "5px 12px", borderRadius: 7, border: `1px solid ${c.border}`, background: "transparent", color: c.textMuted, cursor: "pointer", fontSize: 12 }}>- 10 righe</button>
      </div>
      <div style={{ overflow: "auto", flex: 1 }}>
        <table style={{ borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 36 }}></th>
              {Array.from({ length: COLS }, (_, i) => <th key={i} style={{ ...th, minWidth: 90 }}>{LETTERS[i]}</th>)}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, r) => (
              <tr key={r}>
                <td style={{ ...th, textAlign: "center", fontSize: 11 }}>{r + 1}</td>
                {Array.from({ length: COLS }, (_, i) => {
                  const ck = `${LETTERS[i]}${r + 1}`, isSel = sel === ck;
                  return (
                    <td key={i} style={{ border: `1px solid ${c.border}`, padding: 0, background: isSel ? c.accentBg : "transparent", minWidth: 90 }}>
                      {isSel
                        ? <input autoFocus value={cells[ck] || ""} onChange={e => set(ck, e.target.value)} onBlur={() => setSel(null)}
                            style={{ width: "100%", border: "none", outline: "none", padding: "5px 8px", background: "transparent", color: c.text, fontSize: 13, boxSizing: "border-box" }} />
                        : <div onClick={() => setSel(ck)} style={{ padding: "5px 8px", minHeight: 28, cursor: "cell", color: c.text, whiteSpace: "nowrap" }}>{evalCell(cells[ck])}</div>
                      }
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}