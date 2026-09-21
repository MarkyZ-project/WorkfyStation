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

// Detect if code uses any input function
function codeNeedsInput(code, langId) {
  if (langId === "c")    return /scanf\s*\(|gets\s*\(|fgets\s*\(.*stdin|getchar\s*\(/.test(code);
  if (langId === "cpp")  return /cin\s*>>|getline\s*\(\s*cin|scanf\s*\(/.test(code);
  if (langId === "java") return /\.next\s*\(|\.nextLine\s*\(|\.nextInt\s*\(|\.nextDouble\s*\(|\.nextFloat\s*\(/.test(code);
  return false;
}

// After getting output, interleave user inputs at prompt lines to simulate Dev-C++ terminal
function buildDevCView(rawOutput, userInputs) {
  if (!userInputs.length) return rawOutput;
  const outLines = rawOutput.split("\n");
  const result = [];
  let inputIdx = 0;

  for (let i = 0; i < outLines.length; i++) {
    result.push(outLines[i]);
    // Heuristic: if this line ends with ":" or "?" and looks like a prompt, echo user input
    const trimmed = outLines[i].trim();
    if (inputIdx < userInputs.length && (trimmed.endsWith(":") || trimmed.endsWith("?"))) {
      result.push(userInputs[inputIdx]);
      inputIdx++;
    }
  }
  return result.join("\n");
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

// ── Find & Replace ──
function FindBar({ code, onChange, onClose }) {
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const m = find ? (code.match(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: BG3, borderBottom: BORDER, flexShrink: 0, flexWrap: "wrap" }}>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Cerca:</span>
      <input value={find} onChange={e => setFind(e.target.value)} placeholder="trova..." style={{ padding: "4px 8px", borderRadius: 6, border: BORDER, background: "#1a0005", color: "#fff", fontSize: 12, outline: "none", width: 140 }}/>
      {find && <span style={{ fontSize: 11, color: m > 0 ? ACCENT : "rgba(255,255,255,0.3)" }}>{m}</span>}
      <input value={replace} onChange={e => setReplace(e.target.value)} placeholder="sostituisci..." style={{ padding: "4px 8px", borderRadius: 6, border: BORDER, background: "#1a0005", color: "#fff", fontSize: 12, outline: "none", width: 140 }}/>
      <button onClick={() => find && onChange(code.replace(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), replace))} style={{ padding: "4px 10px", borderRadius: 6, border: BORDER, background: BG3, color: ACCENT, fontSize: 11, cursor: "pointer" }}>Uno</button>
      <button onClick={() => find && onChange(code.replaceAll(find, replace))} style={{ padding: "4px 10px", borderRadius: 6, border: BORDER, background: BG3, color: ACCENT, fontSize: 11, cursor: "pointer" }}>Tutte</button>
      <button onClick={onClose} style={{ padding: "4px 8px", border: "none", background: "transparent", color: "rgba(255,255,255,0.3)", fontSize: 14, cursor: "pointer" }}>✕</button>
    </div>
  );
}

/*
  ═══════════════════════════════════════════════
  TERMINALE INTERATTIVO (simula Dev-C++)
  
  Flusso:
  1) L'utente preme ▶ Esegui
  2) Se il codice ha scanf/cin → modo "input":
     - Il terminale mostra "Scrivi i valori..."
     - L'utente digita un valore per riga
     - Riga vuota (doppio Invio) = "ho finito, esegui"
  3) Il programma viene eseguito con tutti gli input
  4) L'output viene mostrato con gli input intercalati
     alle righe prompt (tipo "Inserisci il 1 valore:")
     per sembrare un vero terminale come Dev-C++
  ═══════════════════════════════════════════════
*/
function DevTerminal({ height, onRunStateChange, onTest, btn }) {
  const [termLines, setTermLines]     = useState([]);     // { type, text }
  const [inputVal, setInputVal]       = useState("");
  const [mode, setMode]               = useState("idle"); // idle | input | running | done
  const [collectedInputs, setCollectedInputs] = useState([]);
  const [pendingJob, setPendingJob]    = useState(null);   // { compiler, code, langId }
  const termRef  = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [termLines]);

  // Auto-focus input
  useEffect(() => {
    if (mode === "input" && inputRef.current) inputRef.current.focus();
  }, [mode, termLines]);

  const pushLine = (type, text) => setTermLines(prev => [...prev, { type, text }]);

  // ── Called from parent when user presses Run ──
  const startExecution = useCallback((compiler, code, langId) => {
    const needsInput = codeNeedsInput(code, langId);

    if (needsInput) {
      // Enter input collection mode
      setMode("input");
      setCollectedInputs([]);
      setPendingJob({ compiler, code, langId });
      setTermLines([
        { type: "system", text: `─── WorkingCode Terminal ───` },
        { type: "system", text: `⚙️  Compilazione...` },
        { type: "prompt", text: `📥 Il programma richiede input (scanf/cin).` },
        { type: "prompt", text: `   Scrivi i valori uno per riga.` },
        { type: "prompt", text: `   Riga vuota (doppio Invio) = esegui il programma.` },
        { type: "prompt", text: `` },
      ]);
      onRunStateChange(false); // not actually running on server yet
    } else {
      // No input → run immediately
      setMode("running");
      setCollectedInputs([]);
      setPendingJob(null);
      setTermLines([
        { type: "system", text: `─── WorkingCode Terminal ───` },
        { type: "system", text: `⚙️  Compilazione ed esecuzione...` },
      ]);
      doExecute(compiler, code, []);
    }
  }, []);

  // ── Execute code on Wandbox ──
  const doExecute = async (compiler, code, inputs) => {
    setMode("running");
    onRunStateChange(true);
    const t0 = Date.now();
    try {
      const stdinStr = inputs.join("\n") + (inputs.length ? "\n" : "");
      const data = await wandboxRun(compiler, code, stdinStr);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(2);

      const cErr = data.compiler_error  || "";
      const cMsg = data.compiler_message|| "";
      const pOut = data.program_output  || "";
      const pErr = data.program_error   || "";
      const sig  = data.signal          || "";
      const exitCode = data.status      || "0";

      if (cErr && !pOut && exitCode !== "0") {
        pushLine("blank", "");
        pushLine("error", "❌ ERRORE DI COMPILAZIONE:");
        cErr.split("\n").forEach(l => pushLine("error", l));
        pushLine("info", "💡 Controlla la sintassi e riprova.");
      } else {
        if (cMsg) { pushLine("warn", "⚠️ Avvisi:"); cMsg.split("\n").forEach(l => pushLine("warn", l)); pushLine("blank", ""); }

        // Build the Dev-C++ style interleaved output
        const interleaved = inputs.length > 0 ? buildDevCView(pOut, inputs) : pOut;

        if (interleaved) {
          pushLine("blank", "");
          interleaved.split("\n").forEach(line => {
            // Check if this line is one of the user's inputs (echo)
            if (inputs.includes(line.trim())) {
              pushLine("userinput", line);
            } else {
              pushLine("output", line);
            }
          });
        }
        if (pErr) { pushLine("warn", "Stderr:"); pErr.split("\n").forEach(l => pushLine("warn", l)); }
        if (!pOut && !pErr && !cErr) pushLine("output", "(nessun output)");
        if (sig) pushLine("warn", "Segnale: " + sig);

        const ok = exitCode === "0" || exitCode === 0;
        pushLine("blank", "");
        pushLine("status", "─".repeat(36));
        pushLine("status", `${ok ? "✅" : "❌"} Terminato (codice ${exitCode}) · ${elapsed}s`);
      }
    } catch (err) {
      pushLine("error", "❌ ERRORE: " + err.message);
      pushLine("info", "Prova '🔬 Test' per verificare la connessione.");
    }
    setMode("done");
    onRunStateChange(false);
  };

  // ── Handle terminal input ──
  const handleEnter = () => {
    const val = inputVal.trim();
    setInputVal("");

    if (mode === "input") {
      if (val === "") {
        // Empty line = user is done, execute!
        if (collectedInputs.length === 0) {
          pushLine("info", "⚠️ Nessun valore inserito. Scrivi almeno un valore, oppure premi ▶ Esegui per programmi senza input.");
          return;
        }
        pushLine("blank", "");
        pushLine("system", `⚙️  Esecuzione con ${collectedInputs.length} valori...`);
        doExecute(pendingJob.compiler, pendingJob.code, collectedInputs);
      } else {
        // Collect this value
        const newInputs = [...collectedInputs, val];
        setCollectedInputs(newInputs);
        pushLine("userinput", val);
      }
    }
  };

  // Force execute with current inputs (button click)
  const forceExecute = () => {
    if (mode === "input" && pendingJob) {
      pushLine("blank", "");
      pushLine("system", `⚙️  Esecuzione con ${collectedInputs.length} valori...`);
      doExecute(pendingJob.compiler, pendingJob.code, collectedInputs);
    }
  };

  const clear = () => {
    setTermLines([]);
    setMode("idle");
    setCollectedInputs([]);
    setPendingJob(null);
  };

  // Expose startExecution to parent via window
  useEffect(() => {
    window.__wcTerminal = { startExecution, forceExecute };
    return () => { delete window.__wcTerminal; };
  }, [startExecution, collectedInputs, pendingJob]);

  const lineColor = (type) => {
    switch(type) {
      case "system":    return "rgba(255,45,85,0.5)";
      case "prompt":    return "#34d399";
      case "output":    return "#e2e8f0";
      case "error":     return "#fca5a5";
      case "warn":      return "#fbbf24";
      case "userinput": return "#60a5fa";
      case "info":      return "#34d399";
      case "status":    return "rgba(255,255,255,0.4)";
      default:          return "transparent";
    }
  };

  const isInput = mode === "input";

  return (
    <div style={{ height, flexShrink: 0, display: "flex", flexDirection: "column", background: "#020000" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: "#0a0000", borderBottom: BORDER, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 5, marginRight: 4 }}>
          {["#ff5f57","#febc2e","#28c840"].map((c,i) => <div key={i} style={{ width:10,height:10,borderRadius:"50%",background:c,opacity:.8 }}/>)}
        </div>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", flex: 1, textAlign: "center" }}>
          TERMINALE
          {isInput && <span style={{ color: "#34d399", marginLeft: 8 }}>● INSERISCI VALORI ({collectedInputs.length} inseriti)</span>}
          {mode === "running" && <span style={{ color: "#fbbf24", marginLeft: 8 }}>● ESECUZIONE...</span>}
        </span>
        {btn("🔬 Test", onTest, "#a78bfa", "Testa connessione")}
        {btn("🗑", clear, "rgba(255,255,255,0.25)", "Pulisci")}
      </div>

      {/* Output area */}
      <div ref={termRef} style={{ flex: 1, overflow: "auto", padding: "10px 14px", fontFamily: "'Consolas','Courier New',monospace", fontSize: 13, lineHeight: 1.65 }}>
        {termLines.length === 0 && mode === "idle" && (
          <span style={{ color: "rgba(255,255,255,0.15)", fontStyle: "italic" }}>Premi ▶ Esegui (F5) per avviare il programma...</span>
        )}
        {termLines.map((l, i) => (
          <div key={i} style={{ color: lineColor(l.type), minHeight: l.type === "blank" ? 8 : "auto" }}>
            {l.type === "userinput" ? (
              <><span style={{ color: "rgba(52,211,153,0.5)" }}>{">"} </span><span style={{ color: "#60a5fa", fontWeight: 600 }}>{l.text}</span></>
            ) : l.text}
          </div>
        ))}
        {mode === "running" && (
          <div style={{ color: "#fbbf24", marginTop: 4 }}>
            <span style={{ animation: "wc-blink 1s infinite" }}>▌</span> Esecuzione...
          </div>
        )}
      </div>

      {/* Input area */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6, padding: "8px 10px",
        borderTop: `1px solid ${isInput ? "rgba(52,211,153,0.3)" : BORDER}`,
        background: isInput ? "rgba(0,30,15,0.8)" : "#040000",
        transition: "all .3s",
      }}>
        <span style={{ color: isInput ? "#34d399" : "rgba(255,255,255,0.2)", fontSize: 14, fontFamily: "Consolas", flexShrink: 0, fontWeight: 700 }}>
          {isInput ? "▶" : "$"}
        </span>
        <input
          ref={inputRef}
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleEnter(); } }}
          placeholder={
            isInput
              ? `Digita valore e Invio · Riga vuota = esegui (${collectedInputs.length} inseriti)`
              : mode === "running" ? "Esecuzione..." : "Terminale pronto"
          }
          disabled={mode === "running"}
          autoFocus={isInput}
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            color: isInput ? "#60a5fa" : "#34d399",
            fontFamily: "'Consolas','Courier New',monospace", fontSize: 14,
            caretColor: isInput ? "#60a5fa" : "#34d399",
          }}
        />
        {isInput && collectedInputs.length > 0 && (
          <button onClick={forceExecute}
            style={{
              padding: "5px 14px", borderRadius: 7, border: "none",
              background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`,
              color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer",
              boxShadow: `0 0 10px ${ACCENT}55`, flexShrink: 0,
            }}>
            ▶ Esegui ({collectedInputs.length} valori)
          </button>
        )}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════
//  MAIN EDITOR COMPONENT
// ═══════════════════════════════════════
export default function WorkingCodeEditor() {
  const validLangIds = LANGUAGES.map(l => l.id);
  const [tabs, setTabs] = useState(() => {
    try {
      const t = JSON.parse(localStorage.getItem(TABS_KEY));
      if (t?.length) {
        const valid = t.filter(tab => validLangIds.includes(tab.langId));
        if (valid.length) return valid;
      }
    } catch {}
    localStorage.removeItem(TABS_KEY);
    localStorage.removeItem(ACTIVE_KEY);
    return [newTab(LANGUAGES[0])];
  });
  const [activeId, setActiveId] = useState(() => { try { return localStorage.getItem(ACTIVE_KEY) || null; } catch { return null; } });
  const [running,  setRunning]  = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [showFind, setShowFind] = useState(false);
  const [panelH,   setPanelH]   = useState(260);
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

  const updateCode = (code) => setTabs(ts => ts.map(t => t.id === activeTab.id ? { ...t, code, saved: false } : t));
  const saveTab    = ()     => { setTabs(ts => ts.map(t => t.id === activeTab.id ? { ...t, saved: true } : t)); setStatus("💾"); setTimeout(() => setStatus(""), 1500); };
  const addTab     = (lid)  => { const l = LANGUAGES.find(l => l.id === lid) || LANGUAGES[0]; const t = newTab(l); setTabs(ts => [...ts, t]); setActiveId(t.id); };
  const closeTab   = (id)   => { const nl = tabs.filter(t => t.id !== id); if (!nl.length) nl.push(newTab(LANGUAGES[0])); setTabs(nl); if (activeId === id) setActiveId(nl[nl.length - 1].id); };
  const renameTab  = (id)   => { const t = tabs.find(t => t.id === id); const n = window.prompt("Rinomina:", t.name); if (n) setTabs(ts => ts.map(t => t.id === id ? { ...t, name: n } : t)); };

  const handleRun = () => {
    if (!activeTab || running) return;
    setRunning(true);
    setStatus("🔄");
    if (window.__wcTerminal) {
      window.__wcTerminal.startExecution(lang.compiler, activeTab.code, lang.id);
    }
  };

  const testApi = async () => {
    setRunning(true);
    try {
      const data = await wandboxRun("gcc-head-c", '#include <stdio.h>\nint main(){printf("OK!");return 0;}', "");
      if (data.program_output?.includes("OK")) {
        alert("✅ Server Wandbox raggiungibile! Funziona tutto.");
        setStatus("✅");
      } else {
        alert("⚠️ Risposta inattesa: " + JSON.stringify(data));
      }
    } catch (e) {
      alert("❌ Server non raggiungibile: " + e.message);
      setStatus("❌");
    }
    setRunning(false);
  };

  const downloadCode = () => { const b = new Blob([activeTab.code], { type: "text/plain" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = activeTab.name; a.click(); URL.revokeObjectURL(u); };
  const copyCode     = () => { navigator.clipboard.writeText(activeTab.code); setStatus("📋"); setTimeout(() => setStatus(""), 1500); };

  const btn = (label, onClick, color, title, disabled) => (
    <button onClick={onClick} title={title} disabled={disabled}
      style={{ padding: "5px 11px", borderRadius: 7, border: `1px solid ${color}44`, background: `${color}12`, color: disabled ? "rgba(255,255,255,0.25)" : color, fontSize: 12, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", transition: "all .15s", flexShrink: 0 }}>
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
          style={{ padding: "6px 16px", borderRadius: 8, border: "none", background: running ? "#1a0005" : `linear-gradient(135deg,${ACCENT},${ACCENT2})`, color: "#fff", fontWeight: 700, fontSize: 13, cursor: running ? "not-allowed" : "pointer", boxShadow: running ? "none" : `0 0 14px ${ACCENT}66`, display: "flex", alignItems: "center", gap: 6, flexShrink: 0, transition: "all .2s" }}>
          {running ? "⏳ Esecuzione..." : "▶ Esegui"}
        </button>
        <div style={{ width: 1, height: 24, background: BORDER, margin: "0 4px" }}/>
        <select value={lang.id}
          onChange={e => { const l = LANGUAGES.find(x => x.id === e.target.value); setTabs(ts => ts.map(t => t.id === activeTab.id ? { ...t, langId: l.id, name: `main.${l.ext}`, code: l.template } : t)); }}
          style={{ padding: "5px 10px", borderRadius: 7, border: BORDER, background: BG3, color: "#fff", fontSize: 12, cursor: "pointer", outline: "none" }}>
          {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
        <div style={{ width: 1, height: 24, background: BORDER, margin: "0 4px" }}/>
        {btn("💾", saveTab, "#4ade80", "Salva (Ctrl+S)")}
        {btn("📋", copyCode, "#60a5fa", "Copia codice")}
        {btn("⬇", downloadCode, "#a78bfa", "Scarica file")}
        {btn("🔍", () => setShowFind(f => !f), "#fbbf24", "Cerca (Ctrl+F)")}
        <div style={{ width: 1, height: 24, background: BORDER, margin: "0 4px" }}/>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
          <button onClick={() => setFontSize(s => Math.max(11, s - 1))} style={{ background: "transparent", border: BORDER, color: "rgba(255,255,255,0.5)", borderRadius: 5, width: 22, height: 22, cursor: "pointer", fontSize: 14 }}>-</button>
          <span style={{ minWidth: 20, textAlign: "center", color: "#fff" }}>{fontSize}</span>
          <button onClick={() => setFontSize(s => Math.min(22, s + 1))} style={{ background: "transparent", border: BORDER, color: "rgba(255,255,255,0.5)", borderRadius: 5, width: 22, height: 22, cursor: "pointer", fontSize: 14 }}>+</button>
        </div>
        <button onClick={() => { if (window.confirm("Ripristinare il template?")) updateCode(lang.template); }}
          style={{ padding: "5px 10px", borderRadius: 7, border: BORDER, background: BG3, color: "rgba(255,255,255,0.35)", fontSize: 11, cursor: "pointer" }}>Reset</button>
        <div style={{ flex: 1 }}/>
        {status && <span style={{ fontSize: 14 }}>{status}</span>}
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", flexShrink: 0 }}>F5 = Esegui</span>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", alignItems: "center", background: BG2, borderBottom: BORDER, overflow: "auto", flexShrink: 0 }}>
        {tabs.map(t => (
          <div key={t.id} className="wc-tab" onClick={() => setActiveId(t.id)} onDoubleClick={() => renameTab(t.id)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: t.id === activeTab.id ? BG : "transparent", borderRight: BORDER, borderBottom: t.id === activeTab.id ? `2px solid ${ACCENT}` : "2px solid transparent", cursor: "pointer", fontSize: 12, flexShrink: 0, color: t.id === activeTab.id ? "#fff" : "rgba(255,255,255,0.4)" }}>
            <span>{t.saved ? "" : "●"}{t.name}</span>
            <span onClick={e => { e.stopPropagation(); closeTab(t.id); }} style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", lineHeight: 1, padding: "0 2px" }}>×</span>
          </div>
        ))}
        <select onChange={e => { if (e.target.value) { addTab(e.target.value); e.target.value = ""; } }} value=""
          style={{ margin: "0 4px", padding: "4px 8px", background: "transparent", border: BORDER, color: "rgba(255,255,255,0.4)", fontSize: 11, cursor: "pointer", borderRadius: 6, outline: "none" }}>
          <option value="">+ Nuovo</option>
          {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
      </div>

      {showFind && <FindBar code={activeTab.code} onChange={updateCode} onClose={() => setShowFind(false)} />}

      {/* EDITOR */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
        <CodeEditor code={activeTab.code} onChange={updateCode} fontSize={fontSize} />
      </div>

      {/* DIVIDER */}
      <div onMouseDown={() => setDragging(true)}
        style={{ height: 6, flexShrink: 0, background: dragging ? ACCENT : BG3, borderTop: BORDER, cursor: "row-resize", display: "flex", alignItems: "center", justifyContent: "center", transition: "background .15s" }}>
        <div style={{ width: 40, height: 2, borderRadius: 2, background: "rgba(255,45,85,0.3)" }}/>
      </div>

      {/* TERMINAL */}
      <DevTerminal
        height={panelH}
        onRunStateChange={(isRunning) => { setRunning(isRunning); if (!isRunning) setTimeout(() => setStatus(""), 2000); }}
        onTest={testApi}
        btn={btn}
      />
    </div>
  );
}
