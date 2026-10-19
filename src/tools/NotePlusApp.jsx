import { useState, useRef, useEffect, useCallback } from "react";

// ── Storage helpers ──
const SK = (email, name) => `noteplus_${name}_${email}`;

// ── Paper background patterns ──
const PAPER_TYPES = [
  { id: "blank",  label: "Vuoto",     icon: "📄" },
  { id: "lined",  label: "Righe",     icon: "📝" },
  { id: "grid",   label: "Quadretti", icon: "📐" },
  { id: "dotted", label: "Puntini",   icon: "⚬" },
  { id: "cornell", label: "Cornell",  icon: "🎓" },
];

const COLORS = [
  "#ffffff", "#ff4444", "#ff8800", "#ffcc00", "#44cc44",
  "#4488ff", "#8844ff", "#ff44aa", "#00cccc", "#888888",
];

const PEN_SIZES = [1, 2, 3, 5, 8, 12];
const HIGHLIGHTER_SIZES = [10, 15, 20, 30];

// ── Notebook colors ──
const NOTEBOOK_COLORS = [
  "#7c3aed", "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#ec4899", "#6366f1", "#14b8a6", "#f97316", "#8b5cf6",
];

// ── Default notebook ──
const createNotebook = (name = "Nuovo Quaderno", color = "#7c3aed", subject = "") => ({
  id: Date.now(),
  name,
  subject,
  color,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  pages: [createPage()],
  bookmarks: [],
});

const createPage = (paperType = "lined") => ({
  id: Date.now() + Math.random(),
  paperType,
  textBlocks: [],
  drawings: [],
  images: [],
  richContent: "",
  createdAt: new Date().toISOString(),
});

// ── Paper background renderer ──
function PaperBackground({ type, c }) {
  const dark = c?.dark;
  const lineColor = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
  const dotColor  = dark ? "rgba(255,255,255,0.1)"  : "rgba(0,0,0,0.12)";
  const redLine   = dark ? "rgba(255,80,80,0.15)"   : "rgba(255,80,80,0.25)";

  if (type === "lined") return (
    <svg width="100%" height="100%" style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
      <defs>
        <pattern id="lines" width="100%" height="32" patternUnits="userSpaceOnUse">
          <line x1="0" y1="31" x2="100%" y2="31" stroke={lineColor} strokeWidth="1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#lines)"/>
      <line x1="60" y1="0" x2="60" y2="100%" stroke={redLine} strokeWidth="1"/>
    </svg>
  );
  if (type === "grid") return (
    <svg width="100%" height="100%" style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
      <defs>
        <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke={lineColor} strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)"/>
    </svg>
  );
  if (type === "dotted") return (
    <svg width="100%" height="100%" style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
      <defs>
        <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="12" cy="12" r="1" fill={dotColor}/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dots)"/>
    </svg>
  );
  if (type === "cornell") return (
    <svg width="100%" height="100%" style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
      <defs>
        <pattern id="cornell-lines" width="100%" height="32" patternUnits="userSpaceOnUse">
          <line x1="0" y1="31" x2="100%" y2="31" stroke={lineColor} strokeWidth="1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#cornell-lines)"/>
      {/* Cornell left margin */}
      <line x1="30%" y1="80" x2="30%" y2="100%" stroke={redLine} strokeWidth="1.5"/>
      {/* Cornell top summary area */}
      <line x1="0" y1="80" x2="100%" y2="80" stroke={redLine} strokeWidth="1.5"/>
      {/* Cornell bottom summary area */}
      <rect x="0" y="calc(100% - 120px)" width="100%" height="1.5" fill={redLine}/>
    </svg>
  );
  return null; // blank
}

// ── Drawing Canvas ──
function DrawingCanvas({ page, onUpdate, c, activeTool, penColor, penSize, eraserSize, highlighterColor, highlighterSize }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const isDrawing = useRef(false);
  const pathsRef = useRef(page.drawings || []);
  const currentPath = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    const ctx = canvas.getContext("2d");
    ctx.scale(2, 2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctxRef.current = ctx;
    redraw();
  }, []);

  const redraw = useCallback(() => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pathsRef.current.forEach(p => {
      if (!p.points || p.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size;
      ctx.globalAlpha = p.tool === "highlighter" ? 0.35 : 1;
      ctx.globalCompositeOperation = p.tool === "eraser" ? "destination-out" : "source-over";
      ctx.moveTo(p.points[0].x, p.points[0].y);
      for (let i = 1; i < p.points.length; i++) {
        ctx.lineTo(p.points[i].x, p.points[i].y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    });
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return {
      x: (touch.clientX - rect.left),
      y: (touch.clientY - rect.top),
    };
  };

  const startDraw = (e) => {
    if (activeTool === "text" || activeTool === "select") return;
    e.preventDefault();
    isDrawing.current = true;
    const pos = getPos(e);
    const tool = activeTool === "highlighter" ? "highlighter" : (activeTool === "eraser" ? "eraser" : "pen");
    const color = tool === "highlighter" ? highlighterColor : (tool === "eraser" ? "#000" : penColor);
    const size = tool === "highlighter" ? highlighterSize : (tool === "eraser" ? eraserSize : penSize);
    currentPath.current = { tool, color, size, points: [pos] };
  };

  const draw = (e) => {
    if (!isDrawing.current || !currentPath.current) return;
    e.preventDefault();
    const pos = getPos(e);
    currentPath.current.points.push(pos);
    const ctx = ctxRef.current;
    if (!ctx) return;
    const p = currentPath.current;
    ctx.beginPath();
    ctx.strokeStyle = p.color;
    ctx.lineWidth = p.size;
    ctx.globalAlpha = p.tool === "highlighter" ? 0.35 : 1;
    ctx.globalCompositeOperation = p.tool === "eraser" ? "destination-out" : "source-over";
    const pts = p.points;
    if (pts.length >= 2) {
      ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  };

  const endDraw = () => {
    if (!isDrawing.current || !currentPath.current) return;
    isDrawing.current = false;
    if (currentPath.current.points.length >= 2) {
      pathsRef.current = [...pathsRef.current, currentPath.current];
      onUpdate({ ...page, drawings: pathsRef.current });
    }
    currentPath.current = null;
  };

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        cursor: activeTool === "pen" ? "crosshair" : (activeTool === "eraser" ? "cell" : (activeTool === "highlighter" ? "crosshair" : "default")),
        touchAction: "none",
        zIndex: (activeTool === "pen" || activeTool === "eraser" || activeTool === "highlighter") ? 10 : 1,
        pointerEvents: (activeTool === "pen" || activeTool === "eraser" || activeTool === "highlighter") ? "auto" : "none",
      }}
      onPointerDown={startDraw}
      onPointerMove={draw}
      onPointerUp={endDraw}
      onPointerLeave={endDraw}
    />
  );
}

// ── Flashcard Component ──
function FlashcardViewer({ cards, c, onClose }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState([]);

  if (!cards || cards.length === 0) return (
    <div style={{ padding: 40, textAlign: "center", color: c.textMuted }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
      <div>Nessuna flashcard trovata. Creane una nel tuo quaderno!</div>
    </div>
  );

  const card = cards[idx];
  const progress = known.length / cards.length * 100;

  return (
    <div style={{ padding: "20px", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: c.text, cursor: "pointer", fontSize: 20 }}>← Indietro</button>
        <div style={{ fontSize: 13, color: c.textMuted }}>{idx + 1} / {cards.length}</div>
      </div>
      {/* Progress bar */}
      <div style={{ height: 4, borderRadius: 2, background: c.border, marginBottom: 20 }}>
        <div style={{ height: "100%", width: `${progress}%`, background: "#10b981", borderRadius: 2, transition: "width .3s" }}/>
      </div>
      {/* Card */}
      <div onClick={() => setFlipped(!flipped)} style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        background: c.surface, border: `1px solid ${c.border}`, borderRadius: 20,
        cursor: "pointer", padding: 32, perspective: "1000px", userSelect: "none",
      }}>
        <div style={{
          fontSize: flipped ? 18 : 22, fontWeight: flipped ? 400 : 600,
          color: flipped ? c.textMuted : c.text,
          textAlign: "center", lineHeight: 1.6,
          transform: flipped ? "rotateY(180deg)" : "rotateY(0)",
          transition: "transform .4s",
        }}>
          <div style={{ transform: flipped ? "rotateY(180deg)" : "none" }}>
            {flipped ? card.answer : card.question}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: c.textHint, textAlign: "center", marginTop: 8 }}>Tocca per girare la carta</div>
      {/* Actions */}
      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button onClick={() => { setKnown(k => [...k, idx]); setFlipped(false); setIdx(i => Math.min(i + 1, cards.length - 1)); }}
          style={{ flex: 1, padding: "14px 0", borderRadius: 12, border: "none", background: "#10b981", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 15 }}>
          ✓ Lo so
        </button>
        <button onClick={() => { setFlipped(false); setIdx(i => Math.min(i + 1, cards.length - 1)); }}
          style={{ flex: 1, padding: "14px 0", borderRadius: 12, border: "none", background: "#ef4444", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 15 }}>
          ✗ Da rivedere
        </button>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button disabled={idx === 0} onClick={() => { setFlipped(false); setIdx(i => i - 1); }}
          style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `1px solid ${c.border}`, background: "transparent", color: c.text, cursor: "pointer" }}>
          ← Precedente
        </button>
        <button disabled={idx === cards.length - 1} onClick={() => { setFlipped(false); setIdx(i => i + 1); }}
          style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `1px solid ${c.border}`, background: "transparent", color: c.text, cursor: "pointer" }}>
          Successiva →
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// ── MAIN: NotePlusApp ──
// ────────────────────────────────────────────
export default function NotePlusApp({ email, c }) {
  const storageKey = SK(email, "notebooks");
  const load = () => { try { return JSON.parse(localStorage.getItem(storageKey) || "[]"); } catch { return []; } };

  const [notebooks, setNotebooks] = useState(load);
  const [activeNb, setActiveNb] = useState(null);    // notebook id
  const [activePage, setActivePage] = useState(0);    // page index
  const [view, setView] = useState("list");           // "list" | "editor" | "flashcards"
  const [search, setSearch] = useState("");
  const [showNewNb, setShowNewNb] = useState(false);
  const [newNbName, setNewNbName] = useState("");
  const [newNbSubject, setNewNbSubject] = useState("");
  const [newNbColor, setNewNbColor] = useState(NOTEBOOK_COLORS[0]);
  const [activeTool, setActiveTool] = useState("text"); // "text"|"pen"|"highlighter"|"eraser"|"select"
  const [penColor, setPenColor] = useState("#ffffff");
  const [penSize, setPenSize] = useState(2);
  const [highlighterColor, setHighlighterColor] = useState("#ffcc00");
  const [highlighterSize, setHighlighterSize] = useState(15);
  const [eraserSize, setEraserSize] = useState(20);
  const [showToolOptions, setShowToolOptions] = useState(false);
  const [showPageTypes, setShowPageTypes] = useState(false);
  const [showFlashcardForm, setShowFlashcardForm] = useState(false);
  const [fcQuestion, setFcQuestion] = useState("");
  const [fcAnswer, setFcAnswer] = useState("");
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);

  const save = (nbs) => { setNotebooks(nbs); localStorage.setItem(storageKey, JSON.stringify(nbs)); };
  const nb = notebooks.find(n => n.id === activeNb);
  const page = nb?.pages?.[activePage];

  // ── Notebooks CRUD ──
  const createNb = () => {
    if (!newNbName.trim()) return;
    const n = createNotebook(newNbName.trim(), newNbColor, newNbSubject.trim());
    save([n, ...notebooks]);
    setNewNbName(""); setNewNbSubject(""); setShowNewNb(false);
    setActiveNb(n.id); setActivePage(0); setView("editor");
  };

  const deleteNb = (id) => {
    const nbs = notebooks.filter(n => n.id !== id);
    save(nbs);
    if (activeNb === id) { setActiveNb(null); setView("list"); }
  };

  const duplicateNb = (id) => {
    const src = notebooks.find(n => n.id === id);
    if (!src) return;
    const dup = { ...JSON.parse(JSON.stringify(src)), id: Date.now(), name: src.name + " (copia)", createdAt: new Date().toISOString() };
    save([dup, ...notebooks]);
  };

  // ── Page management ──
  const addPage = (paperType = "lined") => {
    if (!nb) return;
    const newPage = createPage(paperType);
    const updated = notebooks.map(n => n.id === nb.id ? { ...n, pages: [...n.pages, newPage], updatedAt: new Date().toISOString() } : n);
    save(updated);
    setActivePage(nb.pages.length);
  };

  const deletePage = (idx) => {
    if (!nb || nb.pages.length <= 1) return;
    const updated = notebooks.map(n => n.id === nb.id ? { ...n, pages: n.pages.filter((_, i) => i !== idx), updatedAt: new Date().toISOString() } : n);
    save(updated);
    if (activePage >= nb.pages.length - 1) setActivePage(Math.max(0, activePage - 1));
  };

  const updatePage = (updatedPage) => {
    if (!nb) return;
    const updated = notebooks.map(n => n.id === nb.id ? {
      ...n,
      pages: n.pages.map((p, i) => i === activePage ? updatedPage : p),
      updatedAt: new Date().toISOString(),
    } : n);
    save(updated);
  };

  const changePageType = (type) => {
    if (!page) return;
    updatePage({ ...page, paperType: type });
    setShowPageTypes(false);
  };

  // ── Rich text ──
  const execCmd = (cmd, value) => {
    document.execCommand(cmd, false, value || null);
    editorRef.current?.focus();
    setTimeout(() => {
      if (editorRef.current && page) updatePage({ ...page, richContent: editorRef.current.innerHTML });
    }, 10);
  };

  // ── Bookmark ──
  const toggleBookmark = () => {
    if (!nb) return;
    const bm = nb.bookmarks || [];
    const exists = bm.includes(activePage);
    const updated = notebooks.map(n => n.id === nb.id ? {
      ...n, bookmarks: exists ? bm.filter(b => b !== activePage) : [...bm, activePage],
    } : n);
    save(updated);
  };

  // ── Flashcard ──
  const addFlashcard = () => {
    if (!fcQuestion.trim() || !fcAnswer.trim() || !nb) return;
    const fc = { id: Date.now(), question: fcQuestion.trim(), answer: fcAnswer.trim() };
    const updated = notebooks.map(n => n.id === nb.id ? {
      ...n, flashcards: [...(n.flashcards || []), fc],
    } : n);
    save(updated);
    setFcQuestion(""); setFcAnswer(""); setShowFlashcardForm(false);
  };

  // ── Image insert ──
  const insertImage = (e) => {
    const file = e.target.files?.[0];
    if (!file || !page) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = ev.target.result;
      if (editorRef.current) {
        editorRef.current.focus();
        document.execCommand("insertImage", false, img);
        setTimeout(() => updatePage({ ...page, richContent: editorRef.current.innerHTML }), 10);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ── Audio recording ──
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlobs, setAudioBlobs] = useState([]);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mr = new MediaRecorder(stream);
        audioChunksRef.current = [];
        mr.ondataavailable = (e) => audioChunksRef.current.push(e.data);
        mr.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const url = URL.createObjectURL(blob);
          setAudioBlobs(prev => [...prev, { id: Date.now(), url, name: `Registrazione ${new Date().toLocaleTimeString()}` }]);
          stream.getTracks().forEach(t => t.stop());
        };
        mr.start();
        mediaRecorderRef.current = mr;
        setIsRecording(true);
      } catch { alert("Impossibile accedere al microfono"); }
    }
  };

  // ── Export as PDF (print) ──
  const exportPDF = () => {
    const printArea = document.getElementById("noteplus-print-area");
    if (!printArea) return;
    const w = window.open("", "_blank");
    w.document.write(`<html><head><title>${nb?.name || "Nota"}</title><style>
      body { font-family: 'Segoe UI', sans-serif; padding: 40px; }
      img { max-width: 100%; }
    </style></head><body>${printArea.innerHTML}</body></html>`);
    w.document.close();
    w.print();
  };

  // ── Search ──
  const filteredNbs = search
    ? notebooks.filter(n =>
      n.name.toLowerCase().includes(search.toLowerCase()) ||
      n.subject.toLowerCase().includes(search.toLowerCase()) ||
      n.pages.some(p => (p.richContent || "").toLowerCase().includes(search.toLowerCase()))
    ) : notebooks;

  // ── Flashcards view ──
  if (view === "flashcards" && nb) {
    return <FlashcardViewer cards={nb.flashcards || []} c={c} onClose={() => setView("editor")} />;
  }

  // ────────────────────────────
  // ── EDITOR VIEW ──
  // ────────────────────────────
  if (view === "editor" && nb && page) {
    const isBookmarked = (nb.bookmarks || []).includes(activePage);
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: `1px solid ${c.border}`, flexWrap: "wrap", minHeight: 48 }}>
          <button onClick={() => { setView("list"); setActiveNb(null); }} style={{ background: "none", border: "none", color: c.text, cursor: "pointer", fontSize: 16, padding: "4px 8px" }}>← </button>
          <div style={{ fontSize: 15, fontWeight: 600, color: c.text, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nb.name}</div>
          <button onClick={toggleBookmark} title="Segnalibro" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: isBookmarked ? "#f59e0b" : c.textMuted }}>
            {isBookmarked ? "🔖" : "📑"}
          </button>
          <button onClick={() => setView("flashcards")} title="Flashcards" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: c.textMuted }}>🃏</button>
          <button onClick={() => setShowFlashcardForm(!showFlashcardForm)} title="Nuova Flashcard" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: c.textMuted }}>➕</button>
          <button onClick={exportPDF} title="Esporta PDF" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: c.textMuted }}>📤</button>
        </div>

        {/* Flashcard form */}
        {showFlashcardForm && (
          <div style={{ padding: "10px 12px", borderBottom: `1px solid ${c.border}`, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input value={fcQuestion} onChange={e => setFcQuestion(e.target.value)} placeholder="Domanda..." style={{ flex: 1, minWidth: 120, padding: "8px 10px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.inputBg, color: c.text, fontSize: 13, outline: "none" }}/>
            <input value={fcAnswer} onChange={e => setFcAnswer(e.target.value)} placeholder="Risposta..." style={{ flex: 1, minWidth: 120, padding: "8px 10px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.inputBg, color: c.text, fontSize: 13, outline: "none" }}/>
            <button onClick={addFlashcard} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: c.accent, color: c.accentText, cursor: "pointer", fontWeight: 600, fontSize: 12 }}>Aggiungi</button>
          </div>
        )}

        {/* Drawing / Text toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderBottom: `1px solid ${c.border}`, overflowX: "auto", flexShrink: 0 }}>
          {/* Tool selection */}
          {[
            { id: "text", icon: "T", label: "Testo" },
            { id: "pen", icon: "✒️", label: "Penna" },
            { id: "highlighter", icon: "🖍️", label: "Evidenziatore" },
            { id: "eraser", icon: "◻️", label: "Gomma" },
          ].map(t => (
            <button key={t.id} onClick={() => { setActiveTool(t.id); setShowToolOptions(activeTool === t.id ? !showToolOptions : true); }}
              style={{
                padding: "6px 10px", borderRadius: 8, fontSize: 14, cursor: "pointer",
                border: `1.5px solid ${activeTool === t.id ? c.accent : c.border}`,
                background: activeTool === t.id ? c.accentBg : "transparent",
                color: activeTool === t.id ? c.accent : c.textMuted,
                fontWeight: activeTool === t.id ? 600 : 400,
              }} title={t.label}>
              {t.icon}
            </button>
          ))}
          <div style={{ width: 1, height: 20, background: c.border, margin: "0 4px" }}/>
          {/* Text formatting (only when text tool active) */}
          {activeTool === "text" && (
            <>
              {[
                { cmd: "bold", icon: "B", style: { fontWeight: 700 } },
                { cmd: "italic", icon: "I", style: { fontStyle: "italic" } },
                { cmd: "underline", icon: "U", style: { textDecoration: "underline" } },
                { cmd: "strikeThrough", icon: "S", style: { textDecoration: "line-through" } },
              ].map(b => (
                <button key={b.cmd} onClick={() => execCmd(b.cmd)}
                  style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${c.border}`, background: "transparent", color: c.text, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", ...b.style }}>
                  {b.icon}
                </button>
              ))}
              <div style={{ width: 1, height: 20, background: c.border, margin: "0 2px" }}/>
              <select onChange={e => execCmd("formatBlock", e.target.value)} style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${c.border}`, background: c.inputBg, color: c.text, fontSize: 12, outline: "none" }}>
                <option value="p">Paragrafo</option>
                <option value="h1">Titolo 1</option>
                <option value="h2">Titolo 2</option>
                <option value="h3">Titolo 3</option>
              </select>
              <button onClick={() => execCmd("insertUnorderedList")} style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${c.border}`, background: "transparent", color: c.text, cursor: "pointer", fontSize: 14 }}>•</button>
              <button onClick={() => execCmd("insertOrderedList")} style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${c.border}`, background: "transparent", color: c.text, cursor: "pointer", fontSize: 14 }}>1.</button>
              <button onClick={() => fileInputRef.current?.click()} style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${c.border}`, background: "transparent", color: c.text, cursor: "pointer", fontSize: 14 }} title="Inserisci immagine">🖼</button>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={insertImage}/>
            </>
          )}
          <div style={{ width: 1, height: 20, background: c.border, margin: "0 4px" }}/>
          {/* Record button */}
          <button onClick={toggleRecording} style={{
            padding: "6px 10px", borderRadius: 8, border: `1.5px solid ${isRecording ? "#ef4444" : c.border}`,
            background: isRecording ? "rgba(239,68,68,0.15)" : "transparent",
            color: isRecording ? "#ef4444" : c.textMuted, cursor: "pointer", fontSize: 14,
            animation: isRecording ? "pulse 1.5s infinite" : "none",
          }} title={isRecording ? "Stop registrazione" : "Registra audio"}>
            {isRecording ? "⏹" : "🎙"}
          </button>
          {/* Paper type */}
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowPageTypes(!showPageTypes)} style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${c.border}`, background: "transparent", color: c.textMuted, cursor: "pointer", fontSize: 14 }} title="Tipo pagina">📃</button>
            {showPageTypes && (
              <div style={{ position: "absolute", top: "100%", right: 0, zIndex: 50, background: c.dark ? "#1a1a1a" : "#fff", border: `1px solid ${c.border}`, borderRadius: 12, padding: 8, minWidth: 150, boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}>
                {PAPER_TYPES.map(pt => (
                  <button key={pt.id} onClick={() => changePageType(pt.id)}
                    style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px", borderRadius: 8, border: "none", background: page.paperType === pt.id ? c.accentBg : "transparent", color: page.paperType === pt.id ? c.accent : c.text, cursor: "pointer", fontSize: 13 }}>
                    <span>{pt.icon}</span> {pt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tool options bar */}
        {showToolOptions && activeTool !== "text" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: `1px solid ${c.border}`, flexWrap: "wrap" }}>
            {activeTool === "pen" && (
              <>
                <span style={{ fontSize: 11, color: c.textHint }}>Colore:</span>
                {COLORS.map(col => (
                  <button key={col} onClick={() => setPenColor(col)} style={{
                    width: 22, height: 22, borderRadius: "50%", border: penColor === col ? `2px solid ${c.accent}` : `1px solid ${c.border}`,
                    background: col, cursor: "pointer",
                  }}/>
                ))}
                <span style={{ fontSize: 11, color: c.textHint, marginLeft: 8 }}>Spessore:</span>
                {PEN_SIZES.map(s => (
                  <button key={s} onClick={() => setPenSize(s)} style={{
                    width: 28, height: 28, borderRadius: 6, border: penSize === s ? `2px solid ${c.accent}` : `1px solid ${c.border}`,
                    background: "transparent", color: c.text, cursor: "pointer", fontSize: 11, fontWeight: 600,
                  }}>{s}</button>
                ))}
              </>
            )}
            {activeTool === "highlighter" && (
              <>
                <span style={{ fontSize: 11, color: c.textHint }}>Colore:</span>
                {["#ffcc00","#44ff44","#44ccff","#ff88cc","#ff8844"].map(col => (
                  <button key={col} onClick={() => setHighlighterColor(col)} style={{
                    width: 22, height: 22, borderRadius: "50%", border: highlighterColor === col ? `2px solid ${c.accent}` : `1px solid ${c.border}`,
                    background: col, cursor: "pointer", opacity: 0.7,
                  }}/>
                ))}
                <span style={{ fontSize: 11, color: c.textHint, marginLeft: 8 }}>Spessore:</span>
                {HIGHLIGHTER_SIZES.map(s => (
                  <button key={s} onClick={() => setHighlighterSize(s)} style={{
                    width: 28, height: 28, borderRadius: 6, border: highlighterSize === s ? `2px solid ${c.accent}` : `1px solid ${c.border}`,
                    background: "transparent", color: c.text, cursor: "pointer", fontSize: 11,
                  }}>{s}</button>
                ))}
              </>
            )}
            {activeTool === "eraser" && (
              <>
                <span style={{ fontSize: 11, color: c.textHint }}>Dimensione gomma:</span>
                {[10, 20, 30, 50].map(s => (
                  <button key={s} onClick={() => setEraserSize(s)} style={{
                    width: 28, height: 28, borderRadius: 6, border: eraserSize === s ? `2px solid ${c.accent}` : `1px solid ${c.border}`,
                    background: "transparent", color: c.text, cursor: "pointer", fontSize: 11,
                  }}>{s}</button>
                ))}
              </>
            )}
          </div>
        )}

        {/* Audio recordings */}
        {audioBlobs.length > 0 && (
          <div style={{ display: "flex", gap: 8, padding: "6px 12px", borderBottom: `1px solid ${c.border}`, overflowX: "auto" }}>
            {audioBlobs.map(a => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 8, background: c.accentBg, fontSize: 12 }}>
                <span>🎙</span>
                <audio controls src={a.url} style={{ height: 28, maxWidth: 200 }}/>
                <span style={{ color: c.textMuted, fontSize: 10 }}>{a.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Page editor area ── */}
        <div style={{ flex: 1, position: "relative", overflow: "auto" }}>
          <PaperBackground type={page.paperType} c={c}/>
          <DrawingCanvas
            page={page}
            onUpdate={updatePage}
            c={c}
            activeTool={activeTool}
            penColor={penColor}
            penSize={penSize}
            eraserSize={eraserSize}
            highlighterColor={highlighterColor}
            highlighterSize={highlighterSize}
          />
          <div id="noteplus-print-area"
            ref={editorRef}
            contentEditable={activeTool === "text"}
            suppressContentEditableWarning
            onInput={() => {
              if (editorRef.current && page) updatePage({ ...page, richContent: editorRef.current.innerHTML });
            }}
            dangerouslySetInnerHTML={{ __html: page.richContent || "" }}
            style={{
              position: "relative", zIndex: activeTool === "text" ? 10 : 0,
              minHeight: "100%", padding: page.paperType === "cornell" ? "90px 20px 130px 35%" : "16px 20px 60px 70px",
              outline: "none", fontSize: 15, lineHeight: page.paperType === "lined" || page.paperType === "cornell" ? "32px" : 1.7,
              color: c.text, caretColor: c.accent,
              pointerEvents: activeTool === "text" ? "auto" : "none",
            }}
          />
        </div>

        {/* ── Page navigation ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderTop: `1px solid ${c.border}`, overflowX: "auto" }}>
          {nb.pages.map((p, i) => {
            const isBm = (nb.bookmarks || []).includes(i);
            return (
              <button key={p.id} onClick={() => setActivePage(i)}
                style={{
                  padding: "6px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer", position: "relative",
                  border: `1.5px solid ${i === activePage ? c.accent : c.border}`,
                  background: i === activePage ? c.accentBg : "transparent",
                  color: i === activePage ? c.accent : c.textMuted,
                  fontWeight: i === activePage ? 600 : 400,
                }}>
                {isBm && <span style={{ position: "absolute", top: -4, right: -4, fontSize: 10 }}>🔖</span>}
                {i + 1}
              </button>
            );
          })}
          <button onClick={() => addPage(page.paperType)} style={{ width: 30, height: 30, borderRadius: 8, border: `1px dashed ${c.border}`, background: "transparent", color: c.textMuted, cursor: "pointer", fontSize: 16 }}>+</button>
          {nb.pages.length > 1 && (
            <button onClick={() => deletePage(activePage)} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid rgba(239,68,68,0.3)`, background: "transparent", color: "#ef4444", cursor: "pointer", fontSize: 12 }}>🗑</button>
          )}
        </div>
      </div>
    );
  }

  // ────────────────────────────
  // ── NOTEBOOK LIST VIEW ──
  // ────────────────────────────
  return (
    <div style={{ height: "100%", overflow: "auto", padding: "16px" }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: c.text }}>📓 Note PLUS</div>
          <div style={{ fontSize: 13, color: c.textMuted, marginTop: 2 }}>I tuoi quaderni per la scuola</div>
        </div>
        <button onClick={() => setShowNewNb(true)} style={{
          padding: "10px 18px", borderRadius: 12, border: "none", background: c.accent, color: c.accentText,
          fontWeight: 600, fontSize: 14, cursor: "pointer", boxShadow: `0 4px 16px ${c.accent}44`,
        }}>+ Nuovo Quaderno</button>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, opacity: 0.5 }}>🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca nei quaderni..."
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 10px 10px 38px", borderRadius: 12, border: `1px solid ${c.border}`, background: c.inputBg, color: c.text, fontSize: 14, outline: "none" }}/>
      </div>

      {/* New notebook form */}
      {showNewNb && (
        <div style={{ marginBottom: 16, padding: 16, borderRadius: 16, border: `1px solid ${c.border}`, background: c.surface }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: c.text, marginBottom: 12 }}>Nuovo Quaderno</div>
          <input value={newNbName} onChange={e => setNewNbName(e.target.value)} placeholder="Nome quaderno (es. Matematica)"
            style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: `1px solid ${c.border}`, background: c.inputBg, color: c.text, fontSize: 14, outline: "none", marginBottom: 8 }}/>
          <input value={newNbSubject} onChange={e => setNewNbSubject(e.target.value)} placeholder="Materia (opzionale)"
            style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: `1px solid ${c.border}`, background: c.inputBg, color: c.text, fontSize: 14, outline: "none", marginBottom: 10 }}/>
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
            {NOTEBOOK_COLORS.map(col => (
              <button key={col} onClick={() => setNewNbColor(col)} style={{
                width: 28, height: 28, borderRadius: "50%", border: newNbColor === col ? "3px solid #fff" : "2px solid transparent",
                background: col, cursor: "pointer", boxShadow: newNbColor === col ? `0 0 0 2px ${col}` : "none",
              }}/>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={createNb} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: newNbColor, color: "#fff", fontWeight: 600, cursor: "pointer" }}>Crea</button>
            <button onClick={() => setShowNewNb(false)} style={{ padding: "10px 20px", borderRadius: 10, border: `1px solid ${c.border}`, background: "transparent", color: c.text, cursor: "pointer" }}>Annulla</button>
          </div>
        </div>
      )}

      {/* Notebook cards */}
      {filteredNbs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: c.textMuted }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>📓</div>
          <div style={{ fontSize: 16, marginBottom: 8 }}>Nessun quaderno ancora</div>
          <div style={{ fontSize: 13 }}>Crea il tuo primo quaderno per iniziare!</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
          {filteredNbs.map(n => (
            <div key={n.id} onClick={() => { setActiveNb(n.id); setActivePage(0); setView("editor"); }}
              style={{
                borderRadius: 16, overflow: "hidden", cursor: "pointer", border: `1px solid ${c.border}`,
                background: c.surface, transition: "transform .2s, box-shadow .2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 8px 24px ${n.color}22`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
              {/* Color strip */}
              <div style={{ height: 6, background: `linear-gradient(90deg, ${n.color}, ${n.color}88)` }}/>
              <div style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${n.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📓</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: c.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.name}</div>
                    {n.subject && <div style={{ fontSize: 11, color: n.color, fontWeight: 500 }}>{n.subject}</div>}
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: c.textHint }}>
                  <span>{n.pages.length} pagine</span>
                  <span>{(n.flashcards||[]).length} flashcard</span>
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  <button onClick={(e) => { e.stopPropagation(); duplicateNb(n.id); }} style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: `1px solid ${c.border}`, background: "transparent", color: c.textMuted, cursor: "pointer", fontSize: 11 }}>📋 Duplica</button>
                  <button onClick={(e) => { e.stopPropagation(); if (confirm("Eliminare questo quaderno?")) deleteNb(n.id); }} style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)", background: "transparent", color: "#ef4444", cursor: "pointer", fontSize: 11 }}>🗑 Elimina</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
