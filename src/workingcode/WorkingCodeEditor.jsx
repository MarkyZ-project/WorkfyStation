import { useState, useRef, useEffect, useCallback } from "react";

const ACCENT  = "#ff2d55";
const ACCENT2 = "#ff0020";
const BG      = "#080000";
const BG2     = "#0d0000";
const BG3     = "#120000";
const BORDER  = "rgba(255,45,85,0.18)";

const LANGUAGES = [
  { id: "c",   label: "C",    ext: "c",    compiler: "gcc-head-c", template: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}' },
  { id: "cpp", label: "C++",  ext: "cpp",  compiler: "gcc-head",   template: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}' },
  { id: "java",label: "Java", ext: "java", compiler: "openjdk-jdk-22+36", template: 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}' },
];

const TABS_KEY   = "wc_editor_tabs";
const ACTIVE_KEY = "wc_editor_active";

function newTab(lang) {
  return { id: Date.now() + Math.random(), name: `main.${lang.ext}`, langId: lang.id, code: lang.template, saved: true };
}

function codeNeedsInput(code, langId) {
  if (langId === "c")    return /scanf\s*\(|gets\s*\(|getchar\s*\(/.test(code);
  if (langId === "cpp")  return /cin\s*>>|getline\s*\(\s*cin|scanf\s*\(/.test(code);
  if (langId === "java") return /\.next\w*\s*\(/.test(code);
  return false;
}

async function wandboxRun(compiler, code, stdin) {
  const res = await fetch("https://wandbox.org/api/compile.json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ compiler, code, stdin: stdin || "" }),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error("Risposta non valida:\n" + text.substring(0, 500)); }
  if (!res.ok) throw new Error("Server " + res.status + ": " + (data.message || text));
  return data;
}

// Find indices of "prompt" lines (lines ending with : or ?)
function findPromptIndices(outputText) {
  const lines = outputText.split("\n");
  const indices = [];
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trimEnd();
    if (t.length > 1 && (t.endsWith(":") || t.endsWith("?"))) {
      indices.push(i);
    }
  }
  return indices;
}

// ── Code Editor ──
function CodeEditor({ code, onChange, fontSize }) {
  const taRef = useRef(null);
  const lnRef = useRef(null);
  const lines = code.split("\n");
  const syncScroll = () => { if (lnRef.current && taRef.current) lnRef.current.scrollTop = taRef.current.scrollTop; };
  const handleKeyDown = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.target, s = ta.selectionStart, end = ta.selectionEnd;
      const nc = code.substring(0, s) + "    " + code.substring(end);
      onChange(nc);
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = s + 4; }, 0);
    }
  };
  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden", fontFamily: "'Consolas','Courier New',monospace", fontSize }}>
      <div ref={lnRef} style={{ width: 44, flexShrink: 0, background: BG2, borderRight: BORDER, color: "rgba(255,45,85,0.3)", padding: "12px 0", textAlign: "right", lineHeight: "1.6", overflow: "hidden", userSelect: "none", fontSize, boxSizing: "border-box", pointerEvents: "none" }}>
        {lines.map((_, i) => <div key={i} style={{ paddingRight: 8 }}>{i + 1}</div>)}
      </div>
      <textarea ref={taRef} value={code} onChange={e => onChange(e.target.value)} onScroll={syncScroll} onKeyDown={handleKeyDown}
        spellCheck={false} autoComplete="off" autoCorrect="off" autoCapitalize="off"
        style={{ flex: 1, border: "none", outline: "none", resize: "none", background: BG, color: "#f8f8f8", padding: "12px 16px", lineHeight: "1.6", fontSize, fontFamily: "inherit", caretColor: ACCENT, tabSize: 4 }}
      />
    </div>
  );
}

// ── Find Bar ──
function FindBar({ code, onChange, onClose }) {
  const [find, setFind] = useState(""); const [replace, setReplace] = useState("");
  const m = find ? (code.match(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: BG3, borderBottom: BORDER, flexShrink: 0, flexWrap: "wrap" }}>
      <input value={find} onChange={e => setFind(e.target.value)} placeholder="Cerca..." style={{ padding: "4px 8px", borderRadius: 6, border: BORDER, background: "#1a0005", color: "#fff", fontSize: 12, outline: "none", width: 140 }}/>
      {find && <span style={{ fontSize: 11, color: m > 0 ? ACCENT : "rgba(255,255,255,0.3)" }}>{m}</span>}
      <input value={replace} onChange={e => setReplace(e.target.value)} placeholder="Sostituisci..." style={{ padding: "4px 8px", borderRadius: 6, border: BORDER, background: "#1a0005", color: "#fff", fontSize: 12, outline: "none", width: 140 }}/>
      <button onClick={() => find && onChange(code.replace(find, replace))} style={{ padding: "4px 10px", borderRadius: 6, border: BORDER, background: BG3, color: ACCENT, fontSize: 11, cursor: "pointer" }}>1</button>
      <button onClick={() => find && onChange(code.replaceAll(find, replace))} style={{ padding: "4px 10px", borderRadius: 6, border: BORDER, background: BG3, color: ACCENT, fontSize: 11, cursor: "pointer" }}>All</button>
      <button onClick={onClose} style={{ border: "none", background: "transparent", color: "rgba(255,255,255,0.3)", fontSize: 14, cursor: "pointer" }}>✕</button>
    </div>
  );
}

/*
 ╔══════════════════════════════════════════════════╗
 ║  TERMINALE INTERATTIVO STILE DEV-C++            ║
 ║                                                  ║
 ║  Come funziona:                                  ║
 ║  1. Premi ▶ → il programma viene compilato       ║
 ║  2. Il primo printf appare nel terminale         ║
 ║  3. Quando c'è scanf, ti fa scrivere il valore   ║
 ║  4. Appena scrivi, mostra il risultato (pari:...)║
 ║  5. Poi mostra il prossimo printf e aspetta      ║
 ║  6. Così via fino alla fine del programma        ║
 ║                                                  ║
 ║  Tecnicamente: ogni volta che inserisci un       ║
 ║  valore, il programma viene rieseguito sul       ║
 ║  server con tutti i valori inseriti finora.       ║
 ║  Viene mostrata SOLO la parte nuova dell'output. ║
 ╚══════════════════════════════════════════════════╝
*/
function DevTerminal({ height, onRunStateChange, onTest, btn }) {
  const [lines, setLines]       = useState([]);
  const [mode, setMode]         = useState("idle"); // idle | input | busy | done
  const [inputVal, setInputVal] = useState("");
  const [job, setJob]           = useState(null);
  const [inputs, setInputs]     = useState([]);
  const [step, setStep]         = useState(0);
  const termRef  = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight; }, [lines]);
  useEffect(() => { if (mode === "input" && inputRef.current) inputRef.current.focus(); }, [mode, lines]);

  const add = useCallback((type, text) => setLines(p => [...p, { type, text }]), []);

  // ── STEP 0: Initial run (empty stdin) to discover first prompt ──
  const startExecution = useCallback(async (compiler, code, langId) => {
    setJob({ compiler, code, langId });
    setInputs([]);
    setStep(0);
    setLines([{ type: "system", text: "─── Terminale WorkingCode ───" }]);

    if (!codeNeedsInput(code, langId)) {
      // No scanf → run once and show everything
      setMode("busy");
      onRunStateChange(true);
      try {
        const t0 = Date.now();
        const d = await wandboxRun(compiler, code, "");
        const el = ((Date.now() - t0) / 1000).toFixed(2);
        if (d.compiler_error && !d.program_output) {
          add("error", "❌ Errore compilazione:");
          d.compiler_error.split("\n").forEach(l => add("error", l));
        } else {
          if (d.compiler_message) { add("warn", d.compiler_message); add("blank", ""); }
          (d.program_output || "(nessun output)").split("\n").forEach(l => add("output", l));
          if (d.program_error) d.program_error.split("\n").forEach(l => add("warn", l));
          add("blank", "");
          add("status", `${"─".repeat(36)}`);
          add("status", `${(d.status||"0")==="0"?"✅":"❌"} Codice ${d.status||"0"} · ${el}s`);
        }
      } catch (e) { add("error", "❌ " + e.message); }
      setMode("done");
      onRunStateChange(false);
      return;
    }

    // Has scanf → step-by-step
    setMode("busy");
    onRunStateChange(true);
    add("system", "⚙️ Compilazione...");

    try {
      const d = await wandboxRun(compiler, code, "");
      if (d.compiler_error && !d.program_output) {
        add("error", "❌ Errore compilazione:");
        d.compiler_error.split("\n").forEach(l => add("error", l));
        setMode("done");
        onRunStateChange(false);
        return;
      }
      if (d.compiler_message) { add("warn", "⚠️ " + d.compiler_message.split("\n")[0]); }

      const output = d.program_output || "";
      const outLines = output.split("\n");
      const prompts = findPromptIndices(output);

      if (prompts.length > 0) {
        // Show output up to and including first prompt
        for (let i = 0; i <= prompts[0]; i++) {
          add("output", outLines[i]);
        }
        setMode("input");
      } else {
        // Has scanf but no recognizable prompts → show hint
        add("info", "Il programma è in attesa di input.");
        add("info", "Scrivi un valore e premi Invio.");
        setMode("input");
      }
    } catch (e) { add("error", "❌ " + e.message); setMode("done"); }
    onRunStateChange(false);
  }, [add, onRunStateChange]);

  // ── STEP N: User entered a value → re-run with all values, show new output ──
  const handleUserInput = useCallback(async () => {
    if (mode !== "input" || !job) return;
    const val = inputVal;
    setInputVal("");
    if (val.trim() === "") return;

    // Echo the user's input in the terminal (like Dev-C++ shows what you typed)
    add("userinput", val);

    const newInputs = [...inputs, val];
    setInputs(newInputs);
    const newStep = step + 1;
    setStep(newStep);

    setMode("busy");
    onRunStateChange(true);

    try {
      const stdinStr = newInputs.join("\n") + "\n";
      const t0 = Date.now();
      const d = await wandboxRun(job.compiler, job.code, stdinStr);
      const el = ((Date.now() - t0) / 1000).toFixed(2);
      const output = d.program_output || "";
      const outLines = output.split("\n");
      const prompts = findPromptIndices(output);

      // We're at step `newStep` (0-based: we've entered newStep values)
      // The prompt that asked for this value is prompts[newStep - 1]
      // The next prompt (if any) is prompts[newStep]

      const prevPrompt = prompts[newStep - 1]; // index of prompt that asked for this input
      const nextPrompt = prompts[newStep];      // index of next prompt (if exists)

      if (prevPrompt !== undefined) {
        // Show output from after previous prompt to next prompt (inclusive) or end
        const from = prevPrompt + 1;
        const to = nextPrompt !== undefined ? nextPrompt + 1 : outLines.length;

        for (let i = from; i < to; i++) {
          if (outLines[i] !== undefined) add("output", outLines[i]);
        }

        if (nextPrompt !== undefined) {
          setMode("input"); // wait for next value
        } else {
          // No more prompts → program finished
          const ok = (d.status || "0") === "0";
          if (d.program_error) d.program_error.split("\n").forEach(l => add("warn", l));
          add("blank", "");
          add("status", "─".repeat(36));
          add("status", `${ok ? "✅" : "❌"} Codice ${d.status || "0"} · ${el}s`);
          setMode("done");
        }
      } else {
        // Couldn't find prompts → show full remaining output
        outLines.forEach(l => add("output", l));
        add("blank", "");
        add("status", "─".repeat(36));
        add("status", `${(d.status||"0")==="0"?"✅":"❌"} Codice ${d.status||"0"} · ${el}s`);
        setMode("done");
      }
    } catch (e) { add("error", "❌ " + e.message); setMode("done"); }
    onRunStateChange(false);
  }, [mode, job, inputVal, inputs, step, add, onRunStateChange]);

  const clear = () => { setLines([]); setMode("idle"); setInputs([]); setStep(0); setJob(null); };

  // Expose to parent
  useEffect(() => {
    window.__wcTerminal = { startExecution };
    return () => { delete window.__wcTerminal; };
  }, [startExecution]);

  const clr = (t) => {
    const map = { system:"rgba(255,45,85,0.5)", output:"#e2e8f0", error:"#fca5a5", warn:"#fbbf24", userinput:"#60a5fa", info:"#34d399", status:"rgba(255,255,255,0.35)", prompt:"#34d399" };
    return map[t] || "transparent";
  };

  return (
    <div style={{ height, flexShrink: 0, display: "flex", flexDirection: "column", background: "#020000" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: "#0a0000", borderBottom: BORDER, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 5, marginRight: 4 }}>
          {["#ff5f57","#febc2e","#28c840"].map((c,i) => <div key={i} style={{ width:10,height:10,borderRadius:"50%",background:c,opacity:.8 }}/>)}
        </div>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", flex: 1, textAlign: "center" }}>
          TERMINALE
          {mode === "input" && <span style={{ color: "#34d399", marginLeft: 8 }}>● INSERISCI VALORE</span>}
          {mode === "busy"  && <span style={{ color: "#fbbf24", marginLeft: 8 }}>● ESECUZIONE</span>}
        </span>
        {btn("🔬", onTest, "#a78bfa", "Test API")}
        {btn("🗑", clear, "rgba(255,255,255,0.25)", "Pulisci")}
      </div>

      <div ref={termRef} style={{ flex: 1, overflow: "auto", padding: "10px 14px", fontFamily: "'Consolas','Courier New',monospace", fontSize: 13, lineHeight: 1.65 }}>
        {lines.length === 0 && <span style={{ color: "rgba(255,255,255,0.15)", fontStyle: "italic" }}>Premi ▶ Esegui (F5) per avviare...</span>}
        {lines.map((l, i) => (
          <div key={i} style={{ color: clr(l.type), minHeight: l.type === "blank" ? 6 : "auto" }}>
            {l.type === "userinput"
              ? <><span style={{ opacity: .5 }}>{">"} </span><span style={{ color: "#60a5fa", fontWeight: 600 }}>{l.text}</span></>
              : l.text}
          </div>
        ))}
        {mode === "busy" && <div style={{ color: "#fbbf24", marginTop: 4 }}><span style={{ animation: "wc-blink 1s infinite" }}>▌</span></div>}
      </div>

      <div style={{
        display: "flex", alignItems: "center", gap: 6, padding: "8px 10px",
        borderTop: `1px solid ${mode === "input" ? "rgba(52,211,153,0.3)" : BORDER}`,
        background: mode === "input" ? "rgba(0,26,13,0.9)" : "#040000",
      }}>
        <span style={{ color: mode === "input" ? "#34d399" : "rgba(255,255,255,0.2)", fontSize: 14, fontFamily: "Consolas", fontWeight: 700 }}>
          {mode === "input" ? "▶" : "$"}
        </span>
        <input
          ref={inputRef}
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleUserInput(); } }}
          placeholder={mode === "input" ? "Scrivi il valore e premi Invio..." : mode === "busy" ? "Attendere..." : "Pronto"}
          disabled={mode !== "input"}
          autoFocus={mode === "input"}
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: mode === "input" ? "#60a5fa" : "#34d399", fontFamily: "'Consolas',monospace", fontSize: 14, caretColor: "#60a5fa" }}
        />
      </div>
    </div>
  );
}


// ═══════════════════════════════════════
export default function WorkingCodeEditor() {
  const validLangIds = LANGUAGES.map(l => l.id);
  const [tabs, setTabs] = useState(() => {
    try { const t = JSON.parse(localStorage.getItem(TABS_KEY)); if (t?.length) { const v = t.filter(tab => validLangIds.includes(tab.langId)); if (v.length) return v; } } catch {}
    localStorage.removeItem(TABS_KEY); localStorage.removeItem(ACTIVE_KEY);
    return [newTab(LANGUAGES[0])];
  });
  const [activeId, setActiveId] = useState(() => { try { return localStorage.getItem(ACTIVE_KEY) || null; } catch { return null; } });
  const [running,  setRunning]  = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [showFind, setShowFind] = useState(false);
  const [panelH,   setPanelH]   = useState(280);
  const [dragging, setDragging] = useState(false);
  const [status,   setStatus]   = useState("");

  const activeTab = tabs.find(t => t.id === (activeId || tabs[0]?.id)) || tabs[0];
  const lang      = LANGUAGES.find(l => l.id === activeTab?.langId) || LANGUAGES[0];

  useEffect(() => { localStorage.setItem(TABS_KEY, JSON.stringify(tabs)); }, [tabs]);
  useEffect(() => { if (activeId) localStorage.setItem(ACTIVE_KEY, activeId); }, [activeId]);
  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey||e.metaKey) && e.key === "s") { e.preventDefault(); saveTab(); }
      if ((e.ctrlKey||e.metaKey) && e.key === "f") { e.preventDefault(); setShowFind(f => !f); }
      if ((e.ctrlKey||e.metaKey) && e.key === "Enter") { e.preventDefault(); handleRun(); }
      if (e.key === "F5") { e.preventDefault(); handleRun(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [tabs, activeId]);
  useEffect(() => {
    if (!dragging) return;
    const move = (e) => setPanelH(Math.max(120, Math.min(window.innerHeight - e.clientY, 520)));
    const up   = () => setDragging(false);
    window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [dragging]);

  const updateCode = (c) => setTabs(ts => ts.map(t => t.id === activeTab.id ? { ...t, code: c, saved: false } : t));
  const saveTab    = ()  => { setTabs(ts => ts.map(t => t.id === activeTab.id ? { ...t, saved: true } : t)); setStatus("💾"); setTimeout(() => setStatus(""), 1500); };
  const addTab     = (lid) => { const l = LANGUAGES.find(l => l.id === lid) || LANGUAGES[0]; const t = newTab(l); setTabs(ts => [...ts, t]); setActiveId(t.id); };
  const closeTab   = (id) => { const nl = tabs.filter(t => t.id !== id); if (!nl.length) nl.push(newTab(LANGUAGES[0])); setTabs(nl); if (activeId === id) setActiveId(nl[nl.length - 1].id); };
  const renameTab  = (id) => { const t = tabs.find(t => t.id === id); const n = window.prompt("Rinomina:", t.name); if (n) setTabs(ts => ts.map(t => t.id === id ? { ...t, name: n } : t)); };

  const handleRun = () => {
    if (!activeTab || running) return;
    setRunning(true); setStatus("🔄");
    if (window.__wcTerminal) window.__wcTerminal.startExecution(lang.compiler, activeTab.code, lang.id);
  };
  const testApi = async () => {
    setRunning(true);
    try { const d = await wandboxRun("gcc-head-c", '#include <stdio.h>\nint main(){printf("OK!");return 0;}', ""); alert(d.program_output?.includes("OK") ? "✅ Funziona!" : "⚠️ Risposta: " + JSON.stringify(d)); }
    catch (e) { alert("❌ " + e.message); }
    setRunning(false);
  };
  const downloadCode = () => { const b = new Blob([activeTab.code], { type: "text/plain" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = activeTab.name; a.click(); URL.revokeObjectURL(u); };
  const copyCode = () => { navigator.clipboard.writeText(activeTab.code); setStatus("📋"); setTimeout(() => setStatus(""), 1500); };

  const btn = (label, onClick, color, title, disabled) => (
    <button onClick={onClick} title={title} disabled={disabled}
      style={{ padding: "5px 11px", borderRadius: 7, border: `1px solid ${color}44`, background: `${color}12`, color: disabled ? "rgba(255,255,255,0.25)" : color, fontSize: 12, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", flexShrink: 0 }}>
      {label}
    </button>
  );

  if (!activeTab) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: BG, color: "#f0f0f0" }}>
      <style>{`
        .wc-tab:hover { background: rgba(255,45,85,0.08) !important; }
        button:active  { transform: scale(0.97); }
        textarea:focus { outline: none; }
        @keyframes wc-blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>

      {/* TOOLBAR */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", background: BG2, borderBottom: BORDER, flexShrink: 0, flexWrap: "wrap" }}>
        <button onClick={handleRun} disabled={running}
          style={{ padding: "6px 16px", borderRadius: 8, border: "none", background: running ? "#1a0005" : `linear-gradient(135deg,${ACCENT},${ACCENT2})`, color: "#fff", fontWeight: 700, fontSize: 13, cursor: running ? "not-allowed" : "pointer", boxShadow: running ? "none" : `0 0 14px ${ACCENT}66`, display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {running ? "⏳ ..." : "▶ Esegui"}
        </button>
        <div style={{ width: 1, height: 24, background: BORDER, margin: "0 4px" }}/>
        <select value={lang.id} onChange={e => { const l = LANGUAGES.find(x => x.id === e.target.value); setTabs(ts => ts.map(t => t.id === activeTab.id ? { ...t, langId: l.id, name: `main.${l.ext}`, code: l.template } : t)); }}
          style={{ padding: "5px 10px", borderRadius: 7, border: BORDER, background: BG3, color: "#fff", fontSize: 12, cursor: "pointer", outline: "none" }}>
          {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
        <div style={{ width: 1, height: 24, background: BORDER, margin: "0 4px" }}/>
        {btn("💾", saveTab, "#4ade80", "Salva")}
        {btn("📋", copyCode, "#60a5fa", "Copia")}
        {btn("⬇", downloadCode, "#a78bfa", "Scarica")}
        {btn("🔍", () => setShowFind(f => !f), "#fbbf24", "Cerca")}
        <div style={{ width: 1, height: 24, background: BORDER, margin: "0 4px" }}/>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button onClick={() => setFontSize(s => Math.max(11, s - 1))} style={{ background: "transparent", border: BORDER, color: "rgba(255,255,255,0.5)", borderRadius: 5, width: 22, height: 22, cursor: "pointer", fontSize: 14 }}>-</button>
          <span style={{ fontSize: 11, color: "#fff", minWidth: 20, textAlign: "center" }}>{fontSize}</span>
          <button onClick={() => setFontSize(s => Math.min(22, s + 1))} style={{ background: "transparent", border: BORDER, color: "rgba(255,255,255,0.5)", borderRadius: 5, width: 22, height: 22, cursor: "pointer", fontSize: 14 }}>+</button>
        </div>
        <div style={{ flex: 1 }}/>
        {status && <span style={{ fontSize: 14 }}>{status}</span>}
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.18)" }}>F5 = Esegui</span>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", alignItems: "center", background: BG2, borderBottom: BORDER, overflow: "auto", flexShrink: 0 }}>
        {tabs.map(t => (
          <div key={t.id} className="wc-tab" onClick={() => setActiveId(t.id)} onDoubleClick={() => renameTab(t.id)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: t.id === activeTab.id ? BG : "transparent", borderRight: BORDER, borderBottom: t.id === activeTab.id ? `2px solid ${ACCENT}` : "2px solid transparent", cursor: "pointer", fontSize: 12, flexShrink: 0, color: t.id === activeTab.id ? "#fff" : "rgba(255,255,255,0.4)" }}>
            <span>{t.saved ? "" : "●"}{t.name}</span>
            <span onClick={e => { e.stopPropagation(); closeTab(t.id); }} style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", padding: "0 2px" }}>×</span>
          </div>
        ))}
        <select onChange={e => { if (e.target.value) { addTab(e.target.value); e.target.value = ""; } }} value=""
          style={{ margin: "0 4px", padding: "4px 8px", background: "transparent", border: BORDER, color: "rgba(255,255,255,0.4)", fontSize: 11, cursor: "pointer", borderRadius: 6, outline: "none" }}>
          <option value="">+</option>
          {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
      </div>

      {showFind && <FindBar code={activeTab.code} onChange={updateCode} onClose={() => setShowFind(false)} />}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
        <CodeEditor code={activeTab.code} onChange={updateCode} fontSize={fontSize} />
      </div>

      <div onMouseDown={() => setDragging(true)}
        style={{ height: 6, flexShrink: 0, background: dragging ? ACCENT : BG3, borderTop: BORDER, cursor: "row-resize", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 40, height: 2, borderRadius: 2, background: "rgba(255,45,85,0.3)" }}/>
      </div>

      <DevTerminal height={panelH} onRunStateChange={(r) => { setRunning(r); if (!r) setTimeout(() => setStatus(""), 2000); }} onTest={testApi} btn={btn} />
    </div>
  );
}
