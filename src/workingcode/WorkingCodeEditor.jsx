import { useState, useRef, useEffect, useCallback } from "react";

const ACCENT  = "#ff2d55";
const ACCENT2 = "#ff0020";
const BG      = "#080000";
const BG2     = "#0d0000";
const BG3     = "#120000";
const BORDER  = "rgba(255,45,85,0.18)";

// ── Language definitions ──
const LANGUAGES = [
  { id: "c",          label: "C",          ext: "c",    runtime: "c",          version: "*", template: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}' },
  { id: "cpp",        label: "C++",        ext: "cpp",  runtime: "c++",        version: "*", template: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}' },
  { id: "python",     label: "Python",     ext: "py",   runtime: "python",     version: "*", template: 'print("Hello, World!")' },
  { id: "javascript", label: "JavaScript", ext: "js",   runtime: "javascript", version: "*", template: 'console.log("Hello, World!");' },
  { id: "java",       label: "Java",       ext: "java", runtime: "java",       version: "*", template: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}' },
  { id: "typescript", label: "TypeScript", ext: "ts",   runtime: "typescript", version: "*", template: 'const greet = (name: string): string => `Hello, ${name}!`;\nconsole.log(greet("World"));' },
  { id: "go",         label: "Go",         ext: "go",   runtime: "go",         version: "*", template: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}' },
  { id: "rust",       label: "Rust",       ext: "rs",   runtime: "rust",       version: "*", template: 'fn main() {\n    println!("Hello, World!");\n}' },
  { id: "php",        label: "PHP",        ext: "php",  runtime: "php",        version: "*", template: '<?php\necho "Hello, World!\\n";\n?>' },
  { id: "csharp",     label: "C#",         ext: "cs",   runtime: "csharp",     version: "*", template: 'using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello, World!");\n    }\n}' },
];

const FONT_SIZES = [11, 12, 13, 14, 16, 18, 20];
const TABS_KEY = "wc_editor_tabs";
const ACTIVE_KEY = "wc_editor_active";

function newTab(lang) {
  return {
    id: Date.now() + Math.random(),
    name: `main.${lang.ext}`,
    langId: lang.id,
    code: lang.template,
    saved: true,
  };
}

// ── Line numbers + editor ──
function CodeEditor({ code, onChange, fontSize, readOnly }) {
  const taRef = useRef(null);
  const lnRef = useRef(null);
  const lines = code.split("\n");

  const syncScroll = () => {
    if (lnRef.current && taRef.current)
      lnRef.current.scrollTop = taRef.current.scrollTop;
  };

  // Tab key → insert 4 spaces
  const handleKeyDown = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.target;
      const start = ta.selectionStart;
      const end   = ta.selectionEnd;
      const newCode = code.substring(0, start) + "    " + code.substring(end);
      onChange(newCode);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 4;
      });
    }
    // Auto-close brackets
    const pairs = { "(": ")", "[": "]", "{": "}", '"': '"', "'": "'" };
    if (pairs[e.key]) {
      const ta = e.target;
      const start = ta.selectionStart;
      const end   = ta.selectionEnd;
      if (start === end) {
        e.preventDefault();
        const newCode = code.substring(0, start) + e.key + pairs[e.key] + code.substring(end);
        onChange(newCode);
        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 1; });
      }
    }
    // Enter key → auto-indent
    if (e.key === "Enter") {
      const ta = e.target;
      const start = ta.selectionStart;
      const lineStart = code.lastIndexOf("\n", start - 1) + 1;
      const currentLine = code.substring(lineStart, start);
      const indent = currentLine.match(/^(\s*)/)[1];
      const extraIndent = currentLine.trimEnd().endsWith("{") || currentLine.trimEnd().endsWith(":") ? "    " : "";
      e.preventDefault();
      const newCode = code.substring(0, start) + "\n" + indent + extraIndent + code.substring(ta.selectionEnd);
      onChange(newCode);
      requestAnimationFrame(() => {
        const pos = start + 1 + indent.length + extraIndent.length;
        ta.selectionStart = ta.selectionEnd = pos;
      });
    }
  };

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden", fontFamily: "'Consolas','Courier New',monospace", fontSize }}>
      {/* Line numbers */}
      <div ref={lnRef} style={{
        width: 48, flexShrink: 0,
        background: BG2, borderRight: BORDER,
        color: "rgba(255,45,85,0.35)",
        padding: "12px 4px",
        textAlign: "right", lineHeight: "1.6",
        overflow: "hidden", userSelect: "none",
        fontSize, boxSizing: "border-box",
      }}>
        {lines.map((_, i) => (
          <div key={i} style={{ paddingRight: 6 }}>{i + 1}</div>
        ))}
      </div>
      {/* Textarea */}
      <textarea
        ref={taRef}
        value={code}
        onChange={e => onChange(e.target.value)}
        onScroll={syncScroll}
        onKeyDown={handleKeyDown}
        readOnly={readOnly}
        spellCheck={false}
        style={{
          flex: 1, border: "none", outline: "none", resize: "none",
          background: BG, color: "#f8f8f8",
          padding: "12px 16px", lineHeight: "1.6",
          fontSize, fontFamily: "inherit",
          caretColor: ACCENT,
          tabSize: 4,
        }}
      />
    </div>
  );
}

// ── Find & Replace bar ──
function FindBar({ code, onChange, onClose }) {
  const [find, setFind]       = useState("");
  const [replace, setReplace] = useState("");
  const matches = find ? (code.match(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length : 0;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
      background: BG3, borderBottom: BORDER, flexShrink: 0, flexWrap: "wrap",
    }}>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Cerca:</span>
      <input value={find} onChange={e => setFind(e.target.value)} placeholder="trova..."
        style={{ padding: "4px 8px", borderRadius: 6, border: BORDER, background: "#1a0005", color: "#fff", fontSize: 12, outline: "none", width: 140 }}/>
      {find && <span style={{ fontSize: 11, color: matches > 0 ? ACCENT : "rgba(255,255,255,0.3)" }}>{matches} trovati</span>}
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>→</span>
      <input value={replace} onChange={e => setReplace(e.target.value)} placeholder="sostituisci..."
        style={{ padding: "4px 8px", borderRadius: 6, border: BORDER, background: "#1a0005", color: "#fff", fontSize: 12, outline: "none", width: 140 }}/>
      <button onClick={() => { if (find) onChange(code.replace(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), replace)); }}
        style={{ padding: "4px 10px", borderRadius: 6, border: BORDER, background: BG3, color: ACCENT, fontSize: 11, cursor: "pointer" }}>Sostituisci</button>
      <button onClick={() => { if (find) onChange(code.replaceAll(find, replace)); }}
        style={{ padding: "4px 10px", borderRadius: 6, border: BORDER, background: BG3, color: ACCENT, fontSize: 11, cursor: "pointer" }}>Tutte</button>
      <button onClick={onClose} style={{ padding: "4px 8px", borderRadius: 6, border: "none", background: "transparent", color: "rgba(255,255,255,0.3)", fontSize: 14, cursor: "pointer" }}>✕</button>
    </div>
  );
}

// ── Main Editor ──
export default function WorkingCodeEditor() {
  const [tabs,    setTabs]    = useState(() => { try { const t = JSON.parse(localStorage.getItem(TABS_KEY)); return t?.length ? t : [newTab(LANGUAGES[0])]; } catch { return [newTab(LANGUAGES[0])]; } });
  const [activeId,setActiveId]= useState(() => { try { return localStorage.getItem(ACTIVE_KEY) || null; } catch { return null; } });
  const [output,  setOutput]  = useState("");
  const [stdin,   setStdin]   = useState("");
  const [running, setRunning] = useState(false);
  const [fontSize,setFontSize]= useState(14);
  const [showFind,setShowFind]= useState(false);
  const [panelH,  setPanelH]  = useState(200);
  const [dragging,setDragging]= useState(false);
  const [status,  setStatus]  = useState("");
  const [showStdin, setShowStdin] = useState(false);
  const [runTime, setRunTime] = useState(null);

  const activeTab = tabs.find(t => t.id === (activeId || tabs[0]?.id)) || tabs[0];
  const lang = LANGUAGES.find(l => l.id === activeTab?.langId) || LANGUAGES[0];

  // Persist
  useEffect(() => { localStorage.setItem(TABS_KEY, JSON.stringify(tabs)); }, [tabs]);
  useEffect(() => { if (activeId) localStorage.setItem(ACTIVE_KEY, activeId); }, [activeId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); saveCurrentTab(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "f") { e.preventDefault(); setShowFind(f => !f); }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); runCode(); }
      if (e.key === "F5") { e.preventDefault(); runCode(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs, activeId]);

  // Drag to resize console panel
  useEffect(() => {
    if (!dragging) return;
    const move = (e) => {
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const newH = window.innerHeight - clientY;
      setPanelH(Math.max(80, Math.min(newH, 500)));
    };
    const up = () => setDragging(false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [dragging]);

  const updateCode = (code) => {
    setTabs(ts => ts.map(t => t.id === activeTab.id ? { ...t, code, saved: false } : t));
  };

  const saveCurrentTab = () => {
    setTabs(ts => ts.map(t => t.id === activeTab.id ? { ...t, saved: true } : t));
    setStatus("💾 Salvato");
    setTimeout(() => setStatus(""), 1500);
  };

  const addTab = (langId) => {
    const l = LANGUAGES.find(l => l.id === langId) || LANGUAGES[0];
    const tab = newTab(l);
    setTabs(ts => [...ts, tab]);
    setActiveId(tab.id);
  };

  const closeTab = (id) => {
    const newTabs = tabs.filter(t => t.id !== id);
    if (!newTabs.length) newTabs.push(newTab(LANGUAGES[0]));
    setTabs(newTabs);
    if (activeId === id) setActiveId(newTabs[newTabs.length - 1].id);
  };

  const renameTab = (id) => {
    const t = tabs.find(t => t.id === id);
    const name = window.prompt("Rinomina file:", t.name);
    if (name) setTabs(ts => ts.map(t => t.id === id ? { ...t, name } : t));
  };

  const runCode = useCallback(async () => {
    if (!activeTab || running) return;
    setRunning(true);
    setOutput("⏳ Compilazione e avvio in corso...\n");
    setStatus("🔄 Esecuzione...");
    const start = Date.now();
    try {
      const res = await fetch("https://emkc.org/api/v2/piston/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: lang.runtime,
          version:  lang.version,
          files: [{ name: `main.${lang.ext}`, content: activeTab.code }],
          stdin: stdin,
          compile_timeout: 10000,
          run_timeout: 10000,
        }),
      });

      if (!res.ok) throw new Error(`Errore server: ${res.status}`);

      const data = await res.json();
      const elapsed = ((Date.now() - start) / 1000).toFixed(2);
      setRunTime(elapsed);

      // Compile errors (C/C++/Java)
      const compileOut = data.compile?.output?.trim() || "";
      const compileErr = data.compile?.stderr?.trim() || "";
      // Runtime output
      const runOut  = data.run?.stdout?.trim() || data.run?.output?.trim() || "";
      const runErr  = data.run?.stderr?.trim()  || "";
      const exitCode = data.run?.code ?? data.compile?.code ?? "?";

      let out = "";

      // Compilation errors
      const compileErrors = compileErr || (compileOut && exitCode !== 0 ? compileOut : "");
      if (compileErrors) {
        out += `❌ ERRORI DI COMPILAZIONE:\n${compileErrors}\n\n`;
        out += `💡 Controlla la sintassi del codice e riprova.\n`;
      } else if (compileOut && !compileErrors) {
        // Compile warnings
        out += `⚠️ Avvisi compilatore:\n${compileOut}\n\n`;
      }

      // Runtime output
      if (runOut) {
        out += `${runOut}`;
      }

      // Runtime errors
      if (runErr && runErr !== runOut && !compileErrors) {
        out += `\n\n⚠️ Errori runtime:\n${runErr}`;
      }

      // No output case
      if (!runOut && !compileErrors && !runErr) {
        out += `(il programma non ha prodotto output)\n`;
        if (lang.id === "c" || lang.id === "cpp") {
          out += `\n💡 Suggerimento: se il tuo programma usa scanf() o cin, inserisci i dati nel campo "⌨ Stdin" prima di eseguire.`;
        }
      }

      // Footer
      const ok = exitCode === 0 || exitCode === "0";
      out += `\n\n${"─".repeat(40)}\n${ok ? "✅" : "❌"} Terminato (codice ${exitCode}) · ${elapsed}s`;

      setOutput(out);
      setStatus(ok ? `✅ OK in ${elapsed}s` : `❌ Uscita ${exitCode}`);
    } catch (err) {
      setOutput(
        `❌ Impossibile connettersi al server di esecuzione.\n\n` +
        `Dettagli: ${err.message}\n\n` +
        `ℹ️  WorkingCode usa un server remoto per compilare ed eseguire il codice.\n` +
        `   A differenza di Dev-C++ (che compila sul tuo PC), qui è necessaria\n` +
        `   una connessione internet. Verifica la connessione e riprova.`
      );
      setStatus("❌ Errore di rete");
    }
    setRunning(false);
  }, [activeTab, lang, stdin, running]);

  const downloadCode = () => {
    const blob = new Blob([activeTab.code], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = activeTab.name;
    a.click(); URL.revokeObjectURL(url);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(activeTab.code);
    setStatus("📋 Copiato!");
    setTimeout(() => setStatus(""), 1500);
  };

  const clearOutput = () => setOutput("");

  const btn = (label, onClick, color, title, disabled) => (
    <button onClick={onClick} title={title} disabled={disabled}
      style={{
        padding: "5px 11px", borderRadius: 7, border: `1px solid ${color}44`,
        background: `${color}12`, color: disabled ? "rgba(255,255,255,0.25)" : color,
        fontSize: 12, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
        transition: "all .15s", flexShrink: 0,
      }}>
      {label}
    </button>
  );

  if (!activeTab) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: BG, color: "#f0f0f0" }}>
      <style>{`
        .wc-tab:hover { background: rgba(255,45,85,0.08) !important; }
        .wc-toolbar-btn:hover { opacity: .8; }
        button:active { transform: scale(0.97); }
        textarea:focus { outline: none; }
      `}</style>

      {/* ── TOOLBAR ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6, padding: "7px 12px",
        background: BG2, borderBottom: BORDER, flexShrink: 0, flexWrap: "wrap",
      }}>
        {/* Run */}
        <button onClick={runCode} disabled={running}
          style={{
            padding: "6px 16px", borderRadius: 8, border: "none",
            background: running ? "#333" : `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
            color: "#fff", fontWeight: 700, fontSize: 13, cursor: running ? "not-allowed" : "pointer",
            boxShadow: running ? "none" : `0 0 14px ${ACCENT}66`,
            display: "flex", alignItems: "center", gap: 6, flexShrink: 0, transition: "all .2s",
          }}>
          {running ? "⏳ Esecuzione..." : "▶ Esegui"}
        </button>

        <div style={{ width: 1, height: 24, background: BORDER, margin: "0 4px" }}/>

        {/* Language selector */}
        <select value={lang.id}
          onChange={e => {
            const l = LANGUAGES.find(x => x.id === e.target.value);
            setTabs(ts => ts.map(t => t.id === activeTab.id ? { ...t, langId: l.id, name: `main.${l.ext}`, code: t.saved ? l.template : t.code } : t));
          }}
          style={{
            padding: "5px 10px", borderRadius: 7, border: BORDER,
            background: BG3, color: "#fff", fontSize: 12, cursor: "pointer", outline: "none",
          }}>
          {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>

        <div style={{ width: 1, height: 24, background: BORDER, margin: "0 4px" }}/>

        {btn("💾 Salva", saveCurrentTab, "#4ade80", "Ctrl+S")}
        {btn("📋 Copia", copyCode, "#60a5fa", "Copia codice")}
        {btn("⬇ Scarica", downloadCode, "#a78bfa", "Scarica file")}
        {btn("🔍 Cerca", () => setShowFind(f => !f), "#fbbf24", "Ctrl+F")}
        {btn("⌨ Stdin", () => setShowStdin(s => !s), "#34d399", "Input programma")}

        <div style={{ width: 1, height: 24, background: BORDER, margin: "0 4px" }}/>

        {/* Font size */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
          <span>Aa</span>
          <button onClick={() => setFontSize(s => Math.max(11, s - 1))} style={{ background: "transparent", border: BORDER, color: "rgba(255,255,255,0.5)", borderRadius: 5, width: 22, height: 22, cursor: "pointer", fontSize: 14 }}>-</button>
          <span style={{ minWidth: 20, textAlign: "center", color: "#fff" }}>{fontSize}</span>
          <button onClick={() => setFontSize(s => Math.min(22, s + 1))} style={{ background: "transparent", border: BORDER, color: "rgba(255,255,255,0.5)", borderRadius: 5, width: 22, height: 22, cursor: "pointer", fontSize: 14 }}>+</button>
        </div>

        {/* Template button */}
        <button onClick={() => { if (window.confirm("Ripristinare il template di default?")) updateCode(lang.template); }}
          style={{ padding: "5px 10px", borderRadius: 7, border: BORDER, background: BG3, color: "rgba(255,255,255,0.4)", fontSize: 11, cursor: "pointer" }}>
          Template
        </button>

        <div style={{ flex: 1 }}/>

        {/* Status */}
        {status && <span style={{ fontSize: 12, color: status.startsWith("❌") ? "#ff4444" : status.startsWith("✅") ? "#4ade80" : "rgba(255,255,255,0.6)" }}>{status}</span>}

        {/* Keyboard hint */}
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", flexShrink: 0 }}>F5 / Ctrl+Enter = Esegui</span>
      </div>

      {/* ── TABS ── */}
      <div style={{
        display: "flex", alignItems: "center",
        background: BG2, borderBottom: BORDER,
        overflow: "auto", flexShrink: 0,
      }}>
        {tabs.map(t => (
          <div key={t.id} className="wc-tab"
            onClick={() => setActiveId(t.id)}
            onDoubleClick={() => renameTab(t.id)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px",
              background: t.id === activeTab.id ? BG : "transparent",
              borderRight: BORDER,
              borderBottom: t.id === activeTab.id ? `2px solid ${ACCENT}` : "2px solid transparent",
              cursor: "pointer", fontSize: 12, flexShrink: 0,
              color: t.id === activeTab.id ? "#fff" : "rgba(255,255,255,0.45)",
            }}>
            <span>{t.saved ? "" : "●"}{t.name}</span>
            <span onClick={e => { e.stopPropagation(); closeTab(t.id); }}
              style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", lineHeight: 1, padding: "0 2px" }}>×</span>
          </div>
        ))}
        {/* Add tab */}
        <select onChange={e => { if (e.target.value) { addTab(e.target.value); e.target.value = ""; } }}
          value=""
          style={{ margin: "0 4px", padding: "4px 8px", background: "transparent", border: BORDER, color: "rgba(255,255,255,0.4)", fontSize: 11, cursor: "pointer", borderRadius: 6, outline: "none" }}>
          <option value="">+ Nuovo</option>
          {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
      </div>

      {/* ── FIND BAR ── */}
      {showFind && (
        <FindBar code={activeTab.code} onChange={updateCode} onClose={() => setShowFind(false)} />
      )}

      {/* ── STDIN BAR ── */}
      {showStdin && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: BG3, borderBottom: BORDER, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", flexShrink: 0 }}>Standard Input (stdin):</span>
          <input value={stdin} onChange={e => setStdin(e.target.value)} placeholder="dati di input per il programma..."
            style={{ flex: 1, padding: "5px 10px", borderRadius: 6, border: BORDER, background: "#1a0005", color: "#fff", fontSize: 12, outline: "none", fontFamily: "Consolas, monospace" }}/>
          <button onClick={() => setShowStdin(false)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 14, cursor: "pointer" }}>✕</button>
        </div>
      )}

      {/* ── EDITOR AREA ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
        <CodeEditor
          code={activeTab.code}
          onChange={updateCode}
          fontSize={fontSize}
        />
      </div>

      {/* ── DIVIDER (draggable) ── */}
      <div
        onMouseDown={() => setDragging(true)}
        style={{
          height: 6, flexShrink: 0,
          background: dragging ? ACCENT : BG3,
          borderTop: BORDER, borderBottom: BORDER,
          cursor: "row-resize", display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background .15s",
        }}>
        <div style={{ width: 40, height: 2, borderRadius: 2, background: "rgba(255,45,85,0.3)" }}/>
      </div>

      {/* ── OUTPUT CONSOLE ── */}
      <div style={{
        height: panelH, flexShrink: 0, display: "flex", flexDirection: "column",
        background: "#050000", borderTop: BORDER,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "5px 12px",
          background: BG2, borderBottom: BORDER, flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: ACCENT, letterSpacing: 1 }}>OUTPUT</span>
          {runTime && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>· {runTime}s</span>}
          <div style={{ flex: 1 }}/>
          {btn("🗑 Pulisci", clearOutput, "rgba(255,255,255,0.3)", "Cancella output")}
        </div>
        <pre style={{
          flex: 1, overflow: "auto", margin: 0, padding: "10px 14px",
          fontFamily: "'Consolas','Courier New',monospace", fontSize: 13,
          color: "#d4d4d4", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-all",
          background: "transparent",
        }}>
          {output || <span style={{ color: "rgba(255,255,255,0.2)", fontStyle: "italic" }}>L'output del programma apparirà qui...</span>}
        </pre>
      </div>
    </div>
  );
}
