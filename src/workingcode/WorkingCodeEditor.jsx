import { useState, useRef, useEffect, useCallback } from "react";

const ACCENT  = "#ff2d55";
const ACCENT2 = "#ff0020";
const BG      = "#080000";
const BG2     = "#0d0000";
const BG3     = "#120000";
const BORDER  = "rgba(255,45,85,0.18)";

// ── Languages (Wandbox compiler names) ──
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

// ── Wandbox API ──
async function wandboxRun(compiler, code, stdin) {
  const res = await fetch("https://wandbox.org/api/compile.json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ compiler, code, stdin: stdin || "", "runtime-option-raw": "" }),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error("Risposta non valida:\n" + text.substring(0, 500)); }
  if (!res.ok) throw new Error("Server " + res.status + ": " + (data.message || text));
  return data;
}

// ── Code Editor with line numbers ──
function CodeEditor({ code, onChange, fontSize }) {
  const taRef = useRef(null);
  const lnRef = useRef(null);
  const lines = code.split("\n");

  const syncScroll = () => {
    if (lnRef.current && taRef.current) lnRef.current.scrollTop = taRef.current.scrollTop;
  };

  const handleKeyDown = (e) => {
    const ta = e.target, start = ta.selectionStart, end = ta.selectionEnd;
    if (e.key === "Tab") {
      e.preventDefault();
      const n = code.substring(0, start) + "    " + code.substring(end);
      onChange(n); requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 4; });
      return;
    }
    const pairs = { "(":")", "[":"]", "{":"}", '"':'"', "'":"'" };
    if (pairs[e.key] && start === end) {
      e.preventDefault();
      const n = code.substring(0, start) + e.key + pairs[e.key] + code.substring(end);
      onChange(n); requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 1; });
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const ls = code.lastIndexOf("\n", start - 1) + 1;
      const cl = code.substring(ls, start);
      const ind = cl.match(/^(\s*)/)[1];
      const ex = cl.trimEnd().endsWith("{") || cl.trimEnd().endsWith(":") ? "    " : "";
      const n = code.substring(0, start) + "\n" + ind + ex + code.substring(end);
      onChange(n); requestAnimationFrame(() => { const p = start + 1 + ind.length + ex.length; ta.selectionStart = ta.selectionEnd = p; });
    }
  };

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden", fontFamily: "'Consolas','Courier New',monospace", fontSize }}>
      <div ref={lnRef} style={{
        width: 48, flexShrink: 0, background: BG2, borderRight: BORDER,
        color: "rgba(255,45,85,0.3)", padding: "12px 4px", textAlign: "right",
        lineHeight: "1.6", overflow: "hidden", userSelect: "none", fontSize, boxSizing: "border-box",
      }}>
        {lines.map((_, i) => <div key={i} style={{ paddingRight: 6 }}>{i + 1}</div>)}
      </div>
      <textarea
        ref={taRef} value={code} onChange={e => onChange(e.target.value)}
        onScroll={syncScroll} onKeyDown={handleKeyDown} spellCheck={false}
        style={{
          flex: 1, border: "none", outline: "none", resize: "none",
          background: BG, color: "#f8f8f8", padding: "12px 16px",
          lineHeight: "1.6", fontSize, fontFamily: "inherit", caretColor: ACCENT, tabSize: 4,
        }}
      />
    </div>
  );
}

// ── Find & Replace ──
function FindBar({ code, onChange, onClose }) {
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const matches = find ? (code.match(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: BG3, borderBottom: BORDER, flexShrink: 0, flexWrap: "wrap" }}>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Cerca:</span>
      <input value={find} onChange={e => setFind(e.target.value)} placeholder="trova..."
        style={{ padding: "4px 8px", borderRadius: 6, border: BORDER, background: "#1a0005", color: "#fff", fontSize: 12, outline: "none", width: 140 }}/>
      {find && <span style={{ fontSize: 11, color: matches > 0 ? ACCENT : "rgba(255,255,255,0.3)" }}>{matches}</span>}
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>→</span>
      <input value={replace} onChange={e => setReplace(e.target.value)} placeholder="sostituisci..."
        style={{ padding: "4px 8px", borderRadius: 6, border: BORDER, background: "#1a0005", color: "#fff", fontSize: 12, outline: "none", width: 140 }}/>
      <button onClick={() => find && onChange(code.replace(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), replace))}
        style={{ padding: "4px 10px", borderRadius: 6, border: BORDER, background: BG3, color: ACCENT, fontSize: 11, cursor: "pointer" }}>Uno</button>
      <button onClick={() => find && onChange(code.replaceAll(find, replace))}
        style={{ padding: "4px 10px", borderRadius: 6, border: BORDER, background: BG3, color: ACCENT, fontSize: 11, cursor: "pointer" }}>Tutte</button>
      <button onClick={onClose} style={{ padding: "4px 8px", border: "none", background: "transparent", color: "rgba(255,255,255,0.3)", fontSize: 14, cursor: "pointer" }}>✕</button>
    </div>
  );
}

// ── Interactive Terminal ──
function Terminal({ output, running, height, runTime, onClear, onRun, testApi, btn }) {
  const termRef = useRef(null);
  useEffect(() => { if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight; }, [output]);
  const hasError = output && (output.includes("❌") || output.toLowerCase().includes("error"));

  return (
    <div style={{ height, flexShrink: 0, display: "flex", flexDirection: "column", background: "#020000" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: "#0a0000", borderBottom: BORDER, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 5, marginRight: 4 }}>
          {["#ff5f57","#febc2e","#28c840"].map((c,i) => <div key={i} style={{ width:10,height:10,borderRadius:"50%",background:c,opacity:.8 }}/>)}
        </div>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", flex: 1, textAlign: "center" }}>TERMINALE — WorkingCode (Wandbox)</span>
        {runTime && <span style={{ fontSize: 10, color: "rgba(255,45,85,0.4)" }}>{runTime}s</span>}
        {btn("🔬 Test", testApi, "#a78bfa", "Testa connessione")}
        {btn("🗑", onClear, "rgba(255,255,255,0.25)", "Pulisci")}
      </div>
      <div ref={termRef} style={{ flex: 1, overflow: "auto", padding: "10px 14px", fontFamily: "'Consolas','Courier New',monospace", fontSize: 13, lineHeight: 1.65 }}>
        <div style={{ color: "rgba(255,45,85,0.35)", marginBottom: 6, fontSize: 11 }}>WorkingCode Terminal — {new Date().toLocaleTimeString("it-IT")}</div>
        {output ? (
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all", color: hasError ? "#fca5a5" : "#e2e8f0" }}>{output}</pre>
        ) : running ? (
          <div style={{ color: "#fbbf24" }}>⏳ Compilazione ed esecuzione in corso...</div>
        ) : (
          <span style={{ color: "rgba(255,255,255,0.15)", fontStyle: "italic" }}>Premi ▶ Esegui (o F5) per avviare il programma...</span>
        )}
      </div>
    </div>
  );
}

// ── Main Editor ──
export default function WorkingCodeEditor() {
  const [tabs,     setTabs]     = useState(() => { try { const t = JSON.parse(localStorage.getItem(TABS_KEY)); return t?.length ? t : [newTab(LANGUAGES[0])]; } catch { return [newTab(LANGUAGES[0])]; } });
  const [activeId, setActiveId] = useState(() => { try { return localStorage.getItem(ACTIVE_KEY) || null; } catch { return null; } });
  const [output,   setOutput]   = useState("");
  const [stdin,    setStdin]    = useState("");
  const [running,  setRunning]  = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [showFind, setShowFind] = useState(false);
  const [panelH,   setPanelH]   = useState(220);
  const [dragging, setDragging] = useState(false);
  const [status,   setStatus]   = useState("");
  const [runTime,  setRunTime]  = useState(null);
  const [showStdin,setShowStdin]= useState(false);

  const activeTab = tabs.find(t => t.id === (activeId || tabs[0]?.id)) || tabs[0];
  const lang      = LANGUAGES.find(l => l.id === activeTab?.langId) || LANGUAGES[0];

  useEffect(() => { localStorage.setItem(TABS_KEY, JSON.stringify(tabs)); }, [tabs]);
  useEffect(() => { if (activeId) localStorage.setItem(ACTIVE_KEY, activeId); }, [activeId]);

  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey||e.metaKey) && e.key === "s")     { e.preventDefault(); saveTab(); }
      if ((e.ctrlKey||e.metaKey) && e.key === "f")     { e.preventDefault(); setShowFind(f => !f); }
      if ((e.ctrlKey||e.metaKey) && e.key === "Enter") { e.preventDefault(); handleRun(); }
      if (e.key === "F5")                               { e.preventDefault(); handleRun(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [tabs, activeId, stdin]);

  useEffect(() => {
    if (!dragging) return;
    const move = (e) => setPanelH(Math.max(100, Math.min(window.innerHeight - e.clientY, 520)));
    const up   = () => setDragging(false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [dragging]);

  const updateCode = (code) => setTabs(ts => ts.map(t => t.id === activeTab.id ? { ...t, code, saved: false } : t));
  const saveTab    = ()     => { setTabs(ts => ts.map(t => t.id === activeTab.id ? { ...t, saved: true } : t)); setStatus("💾 Salvato"); setTimeout(() => setStatus(""), 1500); };
  const addTab     = (lid)  => { const l = LANGUAGES.find(l => l.id === lid) || LANGUAGES[0]; const t = newTab(l); setTabs(ts => [...ts, t]); setActiveId(t.id); };
  const closeTab   = (id)   => { const nl = tabs.filter(t => t.id !== id); if (!nl.length) nl.push(newTab(LANGUAGES[0])); setTabs(nl); if (activeId === id) setActiveId(nl[nl.length - 1].id); };
  const renameTab  = (id)   => { const t = tabs.find(t => t.id === id); const n = window.prompt("Rinomina:", t.name); if (n) setTabs(ts => ts.map(t => t.id === id ? { ...t, name: n } : t)); };

  // ── Run code via Wandbox ──
  const handleRun = useCallback(async () => {
    if (!activeTab || running) return;
    setRunning(true);
    setOutput("⏳ Connessione a Wandbox...\n");
    setStatus("🔄 ...");
    const t0 = Date.now();
    try {
      const data = await wandboxRun(lang.compiler, activeTab.code, stdin);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
      setRunTime(elapsed);

      /*  Wandbox response fields:
          program_output  → stdout from execution
          program_error   → stderr from execution
          compiler_output → stdout from compiler
          compiler_error  → stderr from compiler (warnings/errors)
          compiler_message→ combined compiler messages
          status          → "0" if success
          signal          → e.g. "Killed" if timeout
      */
      const pOut = data.program_output  || "";
      const pErr = data.program_error   || "";
      const cOut = data.compiler_output || "";
      const cErr = data.compiler_error  || "";
      const cMsg = data.compiler_message|| "";
      const sig  = data.signal          || "";
      const code = data.status          || "0";

      let out = "";

      // Compiler errors (fatal)
      if (cErr && !pOut && code !== "0") {
        out = `❌ ERRORE DI COMPILAZIONE:\n${cErr}\n\n💡 Controlla la sintassi e riprova.`;
        setStatus("❌ Compilazione fallita");
      } else {
        // Compiler warnings
        if (cMsg || cErr) out += `⚠️ Compilatore:\n${cMsg || cErr}\n\n`;
        // Program output
        if (pOut) out += pOut;
        // Program stderr
        if (pErr) out += (out ? "\n\n" : "") + `⚠️ Stderr:\n${pErr}`;
        // No output
        if (!pOut && !pErr && !cErr) {
          out += "(nessun output)";
          if (lang.id === "c" || lang.id === "cpp")
            out += "\n💡 Se usi scanf(), scrivi i valori nel campo Stdin prima di eseguire.";
        }
        // Signal
        if (sig) out += `\n\n⚠️ Segnale: ${sig}`;

        const ok = code === "0" || code === 0;
        out += `\n\n${"─".repeat(36)}\n${ok ? "✅" : "❌"} Uscita ${code} · ${elapsed}s`;
        setStatus(ok ? `✅ ${elapsed}s` : `❌ Codice ${code}`);
      }
      setOutput(out);
    } catch (err) {
      setOutput(`❌ ERRORE:\n${err.message}\n\n👉 Prova "🔬 Test" per verificare la connessione al server Wandbox.`);
      setStatus("❌ Errore");
    }
    setRunning(false);
  }, [activeTab, lang, stdin, running]);

  // ── Test API ──
  const testApi = async () => {
    setRunning(true);
    setOutput("🔬 Test connessione Wandbox...\n");
    try {
      const data = await wandboxRun("gcc-head-c", '#include <stdio.h>\nint main(){printf("OK!");return 0;}', "");
      if (data.program_output && data.program_output.includes("OK")) {
        setOutput(`✅ Server Wandbox raggiungibile!\n\nOutput: ${data.program_output}\n\nPuoi eseguire il tuo codice normalmente.`);
        setStatus("✅ API OK");
      } else {
        setOutput(`⚠️ Risposta inattesa:\n${JSON.stringify(data, null, 2)}`);
        setStatus("⚠️ Anomalo");
      }
    } catch (e) {
      setOutput(`❌ Server NON raggiungibile:\n${e.message}`);
      setStatus("❌ Offline");
    }
    setRunning(false);
  };

  const downloadCode = () => { const b = new Blob([activeTab.code], { type: "text/plain" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = activeTab.name; a.click(); URL.revokeObjectURL(u); };
  const copyCode     = () => { navigator.clipboard.writeText(activeTab.code); setStatus("📋 Copiato!"); setTimeout(() => setStatus(""), 1500); };
  const clearOutput  = () => setOutput("");

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
        @keyframes wc-pulse { 0%,100%{opacity:.3;transform:scale(.85)} 50%{opacity:1;transform:scale(1)} }
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
        {btn("⌨ Stdin", () => setShowStdin(s => !s), "#34d399", "Input")}
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

      {/* ── STDIN BAR ── */}
      {showStdin && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: BG3, borderBottom: BORDER, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: "rgba(52,211,153,0.7)", flexShrink: 0 }}>Stdin (input per scanf/cin):</span>
          <textarea value={stdin} onChange={e => setStdin(e.target.value)}
            placeholder={"Se il programma legge input, scrivi qui i valori separati da Invio.\nEsempio: per 2 scanf, scrivi su 2 righe:\n5\n10"}
            rows={3}
            style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: BORDER, background: "#1a0005", color: "#34d399", fontSize: 12, outline: "none", fontFamily: "Consolas, monospace", resize: "vertical", lineHeight: 1.5 }}/>
          <button onClick={() => setShowStdin(false)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 14, cursor: "pointer", alignSelf: "flex-start" }}>✕</button>
        </div>
      )}

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
      <Terminal output={output} running={running} height={panelH} runTime={runTime}
        onClear={clearOutput} onRun={handleRun} testApi={testApi} btn={btn} />
    </div>
  );
}
