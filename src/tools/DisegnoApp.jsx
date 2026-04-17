import { useState, useRef, useEffect } from "react";

const key = (email, name) => `${name}_${email}`;
const DRAW_COLORS = ["#ff6b9d","#fff","#378add","#639922","#ba7517","#e24b4a","#0f6e56","#222","#aaa"];
const DRAW_SIZES = [2, 4, 8, 16, 24];
const TOOLS_LIST = [
  { id: "pen", label: "Penna" }, { id: "eraser", label: "Gomma" },
  { id: "rect", label: "Rettangolo" }, { id: "circle", label: "Cerchio" },
  { id: "triangle", label: "Triangolo" }, { id: "line", label: "Linea" },
  { id: "arrow", label: "Freccia" }, { id: "text", label: "Testo" },
];

export default function DisegnoApp({ email, c }) {
  const k = key(email, "canvas");
  const canvasRef = useRef();
  const fileRef = useRef();
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("#ff6b9d");
  const [size, setSize] = useState(4);
  const [tool, setTool] = useState("pen");
  const [textInput, setTextInput] = useState("");
  const [textPos, setTextPos] = useState(null);
  const [textSize, setTextSize] = useState(20);
  const startPos = useRef(null);
  const snapshot = useRef(null);

  useEffect(() => {
    const cv = canvasRef.current;
    cv.width = 800; cv.height = 500;
    const saved = localStorage.getItem(k);
    if (saved) { const img = new Image(); img.onload = () => cv.getContext("2d").drawImage(img, 0, 0); img.src = saved; }
  }, []);

  const saveCanvas = () => localStorage.setItem(k, canvasRef.current.toDataURL());
  const getPos = (e, cv) => {
    const r = cv.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - r.left) * (cv.width / r.width), y: (src.clientY - r.top) * (cv.height / r.height) };
  };

  const start = (e) => {
    e.preventDefault();
    const cv = canvasRef.current, ctx = cv.getContext("2d");
    const p = getPos(e, cv);
    if (tool === "text") { setTextPos(p); return; }
    snapshot.current = ctx.getImageData(0, 0, cv.width, cv.height);
    startPos.current = p;
    if (tool === "pen" || tool === "eraser") { ctx.beginPath(); ctx.moveTo(p.x, p.y); }
    setDrawing(true);
  };

  const move = (e) => {
    e.preventDefault();
    if (!drawing) return;
    const cv = canvasRef.current, ctx = cv.getContext("2d");
    const p = getPos(e, cv), sp = startPos.current;
    if (tool === "pen" || tool === "eraser") {
      ctx.lineWidth = size; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.strokeStyle = tool === "eraser" ? "#0a0a0a" : color;
      ctx.lineTo(p.x, p.y); ctx.stroke(); return;
    }
    ctx.putImageData(snapshot.current, 0, 0);
    ctx.strokeStyle = color; ctx.lineWidth = size; ctx.fillStyle = color + "44";
    if (tool === "rect") {
      ctx.beginPath(); ctx.rect(sp.x, sp.y, p.x - sp.x, p.y - sp.y); ctx.stroke(); ctx.fill();
    } else if (tool === "circle") {
      const rx = Math.abs(p.x - sp.x) / 2, ry = Math.abs(p.y - sp.y) / 2;
      ctx.beginPath(); ctx.ellipse(sp.x + (p.x - sp.x) / 2, sp.y + (p.y - sp.y) / 2, rx, ry, 0, 0, Math.PI * 2); ctx.stroke(); ctx.fill();
    } else if (tool === "line") {
      ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    } else if (tool === "triangle") {
      ctx.beginPath(); ctx.moveTo((sp.x + p.x) / 2, sp.y); ctx.lineTo(p.x, p.y); ctx.lineTo(sp.x, p.y); ctx.closePath(); ctx.stroke(); ctx.fill();
    } else if (tool === "arrow") {
      ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      const angle = Math.atan2(p.y - sp.y, p.x - sp.x), hw = 12, ha = 0.5;
      ctx.beginPath(); ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - hw * Math.cos(angle - ha), p.y - hw * Math.sin(angle - ha));
      ctx.lineTo(p.x - hw * Math.cos(angle + ha), p.y - hw * Math.sin(angle + ha));
      ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    }
  };

  const end = (e) => { e.preventDefault(); setDrawing(false); saveCanvas(); };

  const placeText = () => {
    if (!textInput || !textPos) return;
    const ctx = canvasRef.current.getContext("2d");
    ctx.font = `${textSize}px 'Segoe UI', sans-serif`;
    ctx.fillStyle = color; ctx.fillText(textInput, textPos.x, textPos.y);
    saveCanvas(); setTextInput(""); setTextPos(null);
  };

  const importImg = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { const img = new Image(); img.onload = () => { canvasRef.current.getContext("2d").drawImage(img, 0, 0, 800, 500); saveCanvas(); }; img.src = ev.target.result; };
    reader.readAsDataURL(file);
  };

  const clear = () => { canvasRef.current.getContext("2d").clearRect(0, 0, 800, 500); localStorage.removeItem(k); };

  const btn = (active) => ({
    padding: "5px 10px", borderRadius: 6,
    border: `1px solid ${active ? c.accent : c.border}`,
    background: active ? c.accentBg : "transparent",
    color: active ? c.accent : c.textMuted,
    cursor: "pointer", fontSize: 12, transition: "all .2s",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 8 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", paddingBottom: 8, borderBottom: `1px solid ${c.border}` }}>
        {TOOLS_LIST.map(t => <button key={t.id} onClick={() => setTool(t.id)} style={btn(tool === t.id)}>{t.label}</button>)}
        <div style={{ width: 1, height: 20, background: c.border, margin: "0 2px" }} />
        {DRAW_COLORS.map(cl => <div key={cl} onClick={() => setColor(cl)} style={{ width: 20, height: 20, borderRadius: "50%", background: cl, border: color === cl ? `2.5px solid ${c.accent}` : `1px solid ${c.border}`, cursor: "pointer", flexShrink: 0 }} />)}
        <div style={{ width: 1, height: 20, background: c.border, margin: "0 2px" }} />
        {DRAW_SIZES.map(s => <div key={s} onClick={() => setSize(s)} style={{ width: Math.min(s + 6, 22), height: Math.min(s + 6, 22), borderRadius: "50%", background: c.accent, opacity: size === s ? 1 : 0.3, cursor: "pointer", flexShrink: 0, minWidth: 8, minHeight: 8 }} />)}
        <button onClick={() => fileRef.current.click()} style={{ ...btn(false), marginLeft: "auto" }}>Importa img</button>
        <button onClick={clear} style={btn(false)}>Cancella</button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={importImg} />
      </div>
      {tool === "text" && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${c.border}` }}>
          <span style={{ fontSize: 12, color: c.textMuted }}>Testo:</span>
          <input value={textInput} onChange={e => setTextInput(e.target.value)} placeholder="Scrivi e clicca sul canvas"
            style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: `1px solid ${c.border}`, background: c.inputBg, color: c.text, fontSize: 13, outline: "none" }} />
          <span style={{ fontSize: 12, color: c.textMuted }}>Dim:</span>
          <input type="number" value={textSize} onChange={e => setTextSize(Number(e.target.value))} min="10" max="80"
            style={{ width: 55, padding: "6px", borderRadius: 6, border: `1px solid ${c.border}`, background: c.inputBg, color: c.text, fontSize: 13, outline: "none" }} />
          {textPos && <button onClick={placeText} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${c.accent}`, background: c.accentBg, color: c.accent, cursor: "pointer", fontSize: 12 }}>Inserisci</button>}
          <span style={{ fontSize: 11, color: c.textHint }}>{textPos ? "Clicca Inserisci" : "Clicca sul canvas"}</span>
        </div>
      )}
      <canvas ref={canvasRef}
        style={{ flex: 1, borderRadius: 10, border: `1px solid ${c.border}`, cursor: tool === "text" ? "text" : tool === "eraser" ? "cell" : "crosshair", touchAction: "none", width: "100%", background: "#0d0d0d" }}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end} />
    </div>
  );
}