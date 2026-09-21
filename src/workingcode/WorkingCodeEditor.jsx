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

// Count how many input reads the code has
function countInputCalls(code, langId) {
  if (langId === "c") {
    const scanfs = (code.match(/scanf\s*\(/g) || []).length;
    const gets   = (code.match(/gets\s*\(/g) || []).length;
    const fgets  = (code.match(/fgets\s*\(\s*\w+\s*,\s*\w+\s*,\s*stdin/g) || []).length;
    const getchar= (code.match(/getchar\s*\(/g) || []).length;
    return scanfs + gets + fgets + getchar;
  }
  if (langId === "cpp") {
    const cin    = (code.match(/cin\s*>>/g) || []).length;
    const getline= (code.match(/getline\s*\(\s*cin/g) || []).length;
    const scanfs = (code.match(/scanf\s*\(/g) || []).length;
    return cin + getline + scanfs;
  }
  if (langId === "java") {
    const next   = (code.match(/\.next\s*\(/g) || []).length;
    const nextLine=(code.match(/\.nextLine\s*\(/g) || []).length;
    const nextInt= (code.match(/\.nextInt\s*\(/g) || []).length;
    const nextDouble=(code.match(/\.nextDouble\s*\(/g) || []).length;
    return next + nextLine + nextInt + nextDouble;
  }
  return 0;
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
    const ta = e.target;
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;

    // Tab → 4 spaces (only this, nothing else fancy)
    if (e.key === "Tab") {
      e.preventDefault();
      const before = code.substring(0, start);
      const after  = code.substring(end);
      const newCode = before + "    " + after;
      onChange(newCode);
      // Set cursor after the 4 spaces
      setTimeout(() => {
        ta.selectionStart = ta.selectionEnd = start + 4;
      }, 0);
    }
  };

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden", fontFamily: "'Consolas','Courier New',monospace", fontSize }}>
      {/* Line numbers - pointer-events: none so clicks go through to textarea */}
      <div ref={lnRef} style={{
        width: 44, flexShrink: 0, background: BG2, borderRight: BORDER,
        color: "rgba(255,45,85,0.3)", padding: "12px 0", textAlign: "right",
        lineHeight: "1.6", overflow: "hidden", userSelect: "none", fontSize,
        boxSizing: "border-box", pointerEvents: "none", position: "relative", zIndex: 1,
      }}>
        {lines.map((_, i) => <div key={i} style={{ paddingRight: 8 }}>{i + 1}</div>)}
      </div>
      <textarea
        ref={taRef}
        value={code}
        onChange={e => onChange(e.target.value)}
        onScroll={syncScroll}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        style={{
          flex: 1, border: "none", outline: "none", resize: "none",
          background: BG, color: "#f8f8f8", padding: "12px 16px",
          lineHeight: "1.6", fontSize, fontFamily: "inherit",
          caretColor: ACCENT, tabSize: 4, position: "relative", zIndex: 2,
        }}
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
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>→</span>
      <input value={replace} onChange={e => setReplace(e.target.value)} placeholder="sostituisci..." style={{ padding: "4px 8px", borderRadius: 6, border: BORDER, background: "#1a0005", color: "#fff", fontSize: 12, outline: "none", width: 140 }}/>
      <button onClick={() => find && onChange(code.replace(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), replace))} style={{ padding: "4px 10px", borderRadius: 6, border: BORDER, background: BG3, color: ACCENT, fontSize: 11, cursor: "pointer" }}>Uno</button>
      <button onClick={() => find && onChange(code.replaceAll(find, replace))} style={{ padding: "4px 10px", borderRadius: 6, border: BORDER, background: BG3, color: ACCENT, fontSize: 11, cursor: "pointer" }}>Tutte</button>
      <button onClick={onClose} style={{ padding: "4px 8px", border: "none", background: "transparent", color: "rgba(255,255,255,0.3)", fontSize: 14, cursor: "pointer" }}>✕</button>
    </div>
  );
}

// ── Interactive Terminal ──
function InteractiveTerminal({ height, onRun, onTest, running, btn }) {
  const [lines, setLines]           = useState([{ type: "system", text: "WorkingCode Terminal — premi ▶ Esegui o F5" }]);
  const [inputVal, setInputVal]     = useState("");
  const [mode, setMode]             = useState("idle"); // idle | collecting | running | done
  const [inputsNeeded, setInputsNeeded] = useState(0);
  const [inputsCollected, setInputsCollected] = useState([]);
  const [pendingRun, setPendingRun] = useState(null); // { compiler, code, langId }
  const termRef  = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [lines]);

  useEffect(() => {
    if (mode === "collecting" && inputRef.current) inputRef.current.focus();
  }, [mode, lines]);

  const addLine = (type, text) => setLines(prev => [...prev, { type, text }]);

  // Called from parent to start execution
  const startRun = useCallback((compiler, code, langId) => {
    const needed = countInputCalls(code, langId);
    setLines([{ type: "system", text: `WorkingCode Terminal — ${new Date().toLocaleTimeString("it-IT")}` }]);

    if (needed > 0) {
      // Enter interactive input collection mode
      setMode("collecting");
      setInputsNeeded(needed);
      setInputsCollected([]);
      setPendingRun({ compiler, code, langId });
      setLines([
        { type: "system", text: `WorkingCode Terminal — ${new Date().toLocaleTimeString("it-IT")}` },
        { type: "system", text: `⚙️ Compilazione...` },
        { type: "info",   text: `Il programma richiede ${needed} input. Digita i valori uno alla volta:` },
      ]);
    } else {
      // No input needed → run immediately
      setMode("running");
      setInputsCollected([]);
      setPendingRun(null);
      setLines([
        { type: "system", text: `WorkingCode Terminal — ${new Date().toLocaleTimeString("it-IT")}` },
        { type: "system", text: `⚙️ Compilazione ed esecuzione...` },
      ]);
      executeCode(compiler, code, "");
    }
  }, []);

  // Execute on the server
  const executeCode = async (compiler, code, stdin) => {
    setMode("running");
    const t0 = Date.now();
    try {
      const data = await wandboxRun(compiler, code, stdin);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(2);

      const cErr = data.compiler_error  || "";
      const cMsg = data.compiler_message|| "";
      const pOut = data.program_output  || "";
      const pErr = data.program_error   || "";
      const sig  = data.signal          || "";
      const code_= data.status          || "0";

      if (cErr && !pOut && code_ !== "0") {
        addLine("error", `❌ ERRORE DI COMPILAZIONE:`);
        cErr.split("\n").forEach(l => addLine("error", l));
        addLine("info", `💡 Controlla la sintassi e riprova.`);
      } else {
        if (cMsg) { addLine("warn", `⚠️ Avvisi compilatore:`); cMsg.split("\n").forEach(l => addLine("warn", l)); addLine("blank", ""); }
        if (pOut) { pOut.split("\n").forEach(l => addLine("output", l)); }
        if (pErr) { addLine("warn", `Stderr:`); pErr.split("\n").forEach(l => addLine("warn", l)); }
        if (!pOut && !pErr && !cErr) addLine("output", "(nessun output)");
        if (sig)  addLine("warn", `Segnale: ${sig}`);
        const ok = code_ === "0" || code_ === 0;
        addLine("blank", "");
        addLine("status", `${"─".repeat(36)}`);
        addLine("status", `${ok ? "✅" : "❌"} Terminato (codice ${code_}) · ${elapsed}s`);
      }
    } catch (err) {
      addLine("error", `❌ ERRORE: ${err.message}`);
    }
    setMode("done");
    onRun(false); // tell parent we're done
  };

  // Handle Enter in input field
  const handleInput = () => {
    const val = inputVal;
    setInputVal("");

    if (mode === "collecting") {
      // Add the typed value as a "user typed" line
      addLine("userinput", val);
      const newCollected = [...inputsCollected, val];
      setInputsCollected(newCollected);

      if (newCollected.length >= inputsNeeded) {
        // All inputs collected → run!
        addLine("system", `\n⚙️ Esecuzione con ${newCollected.length} input...`);
        onRun(true); // tell parent we're running
        executeCode(pendingRun.compiler, pendingRun.code, newCollected.join("\n"));
      } else {
        // Ask for next input
        addLine("info", `(${newCollected.length}/${inputsNeeded}) Inserisci il prossimo valore:`);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); handleInput(); }
  };

  const clear = () => {
    setLines([{ type: "system", text: "WorkingCode Terminal — premi ▶ Esegui o F5" }]);
    setMode("idle");
    setInputsCollected([]);
    setInputsNeeded(0);
  };

  // Expose startRun to parent
  useEffect(() => {
    window.__wcTerminal = { startRun };
    return () => { delete window.__wcTerminal; };
  }, [startRun]);

  const lineColor = (type) => {
    switch(type) {
      case "system":    return "rgba(255,45,85,0.4)";
      case "info":      return "#34d399";
      case "output":    return "#e2e8f0";
      case "error":     return "#fca5a5";
      case "warn":      return "#fbbf24";
      case "userinput": return "#60a5fa";
      case "status":    return "rgba(255,255,255,0.4)";
      case "blank":     return "transparent";
      default:          return "#e2e8f0";
    }
  };

  const isInputActive = mode === "collecting";

  return (
    <div style={{ height, flexShrink: 0, display: "flex", flexDirection: "column", background: "#020000" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: "#0a0000", borderBottom: BORDER, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 5, marginRight: 4 }}>
          {["#ff5f57","#febc2e","#28c840"].map((c,i) => <div key={i} style={{ width:10,height:10,borderRadius:"50%",background:c,opacity:.8 }}/>)}
        </div>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", flex: 1, textAlign: "center" }}>
          TERMINALE — WorkingCode
          {mode === "collecting" && <span style={{ color: "#34d399", marginLeft: 8 }}>● INPUT</span>}
          {mode === "running"    && <span style={{ color: "#fbbf24", marginLeft: 8 }}>● ESECUZIONE</span>}
        </span>
        {btn("🔬 Test", onTest, "#a78bfa", "Testa connessione")}
        {btn("🗑", clear, "rgba(255,255,255,0.25)", "Pulisci")}
      </div>

      {/* Output area */}
      <div ref={termRef} style={{ flex: 1, overflow: "auto", padding: "10px 14px", fontFamily: "'Consolas','Courier New',monospace", fontSize: 13, lineHeight: 1.65 }}>
        {lines.map((l, i) => (
          <div key={i} style={{ color: lineColor(l.type), minHeight: l.type === "blank" ? 10 : "auto" }}>
            {l.type === "userinput" ? (
              <span><span style={{ color: "#34d399", opacity: 0.6 }}>{">"} </span><span style={{ color: "#60a5fa" }}>{l.text}</span></span>
            ) : l.type === "info" && mode === "collecting" ? (
              <span><span style={{ color: "#34d399" }}>{">"} </span>{l.text}</span>
            ) : (
              l.text
            )}
          </div>
        ))}
        {mode === "running" && (
          <div style={{ color: "#fbbf24", display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <span style={{ animation: "wc-blink 1s infinite" }}>▌</span> Esecuzione in corso...
          </div>
        )}
      </div>

      {/* Input row */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderTop: `1px solid ${isInputActive ? "#34d39944" : BORDER}`, background: isInputActive ? "#001a0a" : "#040000", transition: "all .3s" }}>
        <span style={{ color: isInputActive ? "#34d399" : "rgba(255,255,255,0.2)", fontSize: 14, fontFamily: "Consolas", flexShrink: 0, fontWeight: 700 }}>
          {isInputActive ? "▶" : "$"}
        </span>
        <input
          ref={inputRef}
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isInputActive
              ? `Inserisci valore ${inputsCollected.length + 1}/${inputsNeeded} e premi Invio...`
              : mode === "running" ? "Esecuzione in corso..." : "Terminale pronto"
          }
          disabled={mode === "running"}
          autoFocus={isInputActive}
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            color: isInputActive ? "#60a5fa" : "#34d399",
            fontFamily: "'Consolas','Courier New',monospace", fontSize: 14,
            caretColor: isInputActive ? "#60a5fa" : "#34d399",
          }}
        />
        {isInputActive && inputVal && (
          <button onClick={handleInput}
            style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid rgba(52,211,153,0.3)", background: "rgba(52,211,153,0.1)", color: "#34d399", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Invio ↵
          </button>
        )}
      </div>
    </div>
  );
}


// ── Main Editor ──
export default function WorkingCodeEditor() {
  const validLangIds = LANGUAGES.map(l => l.id);
  const [tabs,     setTabs]     = useState(() => {
    try {
      const t = JSON.parse(localStorage.getItem(TABS_KEY));
      if (t?.length) {
        // Filter out tabs with invalid langIds from old versions
        const valid = t.filter(tab => validLangIds.includes(tab.langId));
        if (valid.length) return valid;
      }
    } catch {}
    // Fresh start
    localStorage.removeItem(TABS_KEY);
    localStorage.removeItem(ACTIVE_KEY);
    return [newTab(LANGUAGES[0])];
  });
  const [activeId, setActiveId] = useState(() => { try { return localStorage.getItem(ACTIVE_KEY) || null; } catch { return null; } });
  const [running,  setRunning]  = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [showFind, setShowFind] = useState(false);
  const [panelH,   setPanelH]   = useState(240);
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
  const saveTab    = ()     => { setTabs(ts => ts.map(t => t.id === activeTab.id ? { ...t, saved: true } : t)); setStatus("💾 Salvato"); setTimeout(() => setStatus(""), 1500); };
  const addTab     = (lid)  => { const l = LANGUAGES.find(l => l.id === lid) || LANGUAGES[0]; const t = newTab(l); setTabs(ts => [...ts, t]); setActiveId(t.id); };
  const closeTab   = (id)   => { const nl = tabs.filter(t => t.id !== id); if (!nl.length) nl.push(newTab(LANGUAGES[0])); setTabs(nl); if (activeId === id) setActiveId(nl[nl.length - 1].id); };
  const renameTab  = (id)   => { const t = tabs.find(t => t.id === id); const n = window.prompt("Rinomina:", t.name); if (n) setTabs(ts => ts.map(t => t.id === id ? { ...t, name: n } : t)); };

  const handleRun = () => {
    if (!activeTab || running) return;
    setRunning(true);
    setStatus("🔄 ...");
    // Trigger terminal to start
    if (window.__wcTerminal) {
      window.__wcTerminal.startRun(lang.compiler, activeTab.code, lang.id);
    }
  };

  const testApi = async () => {
    setRunning(true);
    try {
      const data = await wandboxRun("gcc-head-c", '#include <stdio.h>\nint main(){printf("OK!");return 0;}', "");
      if (data.program_output?.includes("OK")) {
        if (window.__wcTerminal) {
          window.__wcTerminal.startRun._addResult?.("✅ Server OK");
        }
        setStatus("✅ API OK");
        alert("✅ Server Wandbox raggiungibile! Puoi eseguire il codice.");
      }
    } catch (e) {
      alert("❌ Server non raggiungibile: " + e.message);
      setStatus("❌ Offline");
    }
    setRunning(false);
  };

  const downloadCode = () => { const b = new Blob([activeTab.code], { type: "text/plain" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = activeTab.name; a.click(); URL.revokeObjectURL(u); };
  const copyCode     = () => { navigator.clipboard.writeText(activeTab.code); setStatus("📋 Copiato!"); setTimeout(() => setStatus(""), 1500); };

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

      {/* ── TOOLBAR ── */}
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
        {btn("💾 Salva", saveTab, "#4ade80", "Ctrl+S")}
        {btn("📋 Copia", copyCode, "#60a5fa", "Copia")}
        {btn("⬇ Scarica", downloadCode, "#a78bfa", "Scarica")}
        {btn("🔍 Cerca", () => setShowFind(f => !f), "#fbbf24", "Ctrl+F")}
        <div style={{ width: 1, height: 24, background: BORDER, margin: "0 4px" }}/>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
          <span>Aa</span>
          <button onClick={() => setFontSize(s => Math.max(11, s - 1))} style={{ background: "transparent", border: BORDER, color: "rgba(255,255,255,0.5)", borderRadius: 5, width: 22, height: 22, cursor: "pointer", fontSize: 14 }}>-</button>
          <span style={{ minWidth: 20, textAlign: "center", color: "#fff" }}>{fontSize}</span>
          <button onClick={() => setFontSize(s => Math.min(22, s + 1))} style={{ background: "transparent", border: BORDER, color: "rgba(255,255,255,0.5)", borderRadius: 5, width: 22, height: 22, cursor: "pointer", fontSize: 14 }}>+</button>
        </div>
        <button onClick={() => { if (window.confirm("Ripristinare il template?")) updateCode(lang.template); }}
          style={{ padding: "5px 10px", borderRadius: 7, border: BORDER, background: BG3, color: "rgba(255,255,255,0.35)", fontSize: 11, cursor: "pointer" }}>Template</button>
        <div style={{ flex: 1 }}/>
        {status && <span style={{ fontSize: 12, color: status.startsWith("❌") ? "#ff6b6b" : status.startsWith("✅") ? "#4ade80" : "rgba(255,255,255,0.6)" }}>{status}</span>}
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", flexShrink: 0 }}>F5 / Ctrl+Enter</span>
      </div>

      {/* ── TABS ── */}
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

      {/* ── FIND BAR ── */}
      {showFind && <FindBar code={activeTab.code} onChange={updateCode} onClose={() => setShowFind(false)} />}

      {/* ── EDITOR ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
        <CodeEditor code={activeTab.code} onChange={updateCode} fontSize={fontSize} />
      </div>

      {/* ── DIVIDER ── */}
      <div onMouseDown={() => setDragging(true)}
        style={{ height: 6, flexShrink: 0, background: dragging ? ACCENT : BG3, borderTop: BORDER, cursor: "row-resize", display: "flex", alignItems: "center", justifyContent: "center", transition: "background .15s" }}>
        <div style={{ width: 40, height: 2, borderRadius: 2, background: "rgba(255,45,85,0.3)" }}/>
      </div>

      {/* ── TERMINAL ── */}
      <InteractiveTerminal
        height={panelH}
        running={running}
        onRun={(isRunning) => { setRunning(isRunning); if (!isRunning) setStatus(""); }}
        onTest={testApi}
        btn={btn}
      />
    </div>
  );
}
