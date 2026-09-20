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

const TABS_KEY   = "wc_editor_tabs";
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

// ── Core fetch to Piston API ──
async function pistonRun(language, version, ext, code, stdin) {
  const res = await fetch("https://emkc.org/api/v2/piston/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language,
      version,
      files: [{ name: `main.${ext}`, content: code }],
      stdin: stdin || "",
    }),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error(`Risposta non valida dal server:\n${text.substring(0, 300)}`); }
  if (!res.ok) throw new Error(`Server error ${res.status}: ${data?.message || text}`);
  return data;
}

// ── Code Editor with line numbers ──
function CodeEditor({ code, onChange, fontSize }) {
  const taRef = useRef(null);
  const lnRef = useRef(null);
  const lines  = code.split("\n");

  const syncScroll = () => {
    if (lnRef.current && taRef.current)
      lnRef.current.scrollTop = taRef.current.scrollTop;
  };

  const handleKeyDown = (e) => {
    const ta    = e.target;
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;

    // Tab → 4 spaces
    if (e.key === "Tab") {
      e.preventDefault();
      const next = code.substring(0, start) + "    " + code.substring(end);
      onChange(next);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 4; });
      return;
    }
    // Auto-close pairs
    const pairs = { "(": ")", "[": "]", "{": "}", '"': '"', "'": "'" };
    if (pairs[e.key] && start === end) {
      e.preventDefault();
      const next = code.substring(0, start) + e.key + pairs[e.key] + code.substring(end);
      onChange(next);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 1; });
      return;
    }
    // Enter → auto-indent
    if (e.key === "Enter") {
      e.preventDefault();
      const lineStart   = code.lastIndexOf("\n", start - 1) + 1;
      const currentLine = code.substring(lineStart, start);
      const indent      = currentLine.match(/^(\s*)/)[1];
      const extra       = currentLine.trimEnd().endsWith("{") || currentLine.trimEnd().endsWith(":") ? "    " : "";
      const next        = code.substring(0, start) + "\n" + indent + extra + code.substring(end);
      onChange(next);
      requestAnimationFrame(() => {
        const pos = start + 1 + indent.length + extra.length;
        ta.selectionStart = ta.selectionEnd = pos;
      });
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
        ref={taRef}
        value={code}
        onChange={e => onChange(e.target.value)}
        onScroll={syncScroll}
        onKeyDown={handleKeyDown}
        spellCheck={false}
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
  const [find,    setFind]    = useState("");
  const [replace, setReplace] = useState("");
  const matches = find ? (code.match(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: BG3, borderBottom: BORDER, flexShrink: 0, flexWrap: "wrap" }}>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Cerca:</span>
      <input value={find} onChange={e => setFind(e.target.value)} placeholder="trova..."
        style={{ padding: "4px 8px", borderRadius: 6, border: BORDER, background: "#1a0005", color: "#fff", fontSize: 12, outline: "none", width: 140 }}/>
      {find && <span style={{ fontSize: 11, color: matches > 0 ? ACCENT : "rgba(255,255,255,0.3)" }}>{matches} trovati</span>}
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>→</span>
      <input value={replace} onChange={e => setReplace(e.target.value)} placeholder="sostituisci..."
        style={{ padding: "4px 8px", borderRadius: 6, border: BORDER, background: "#1a0005", color: "#fff", fontSize: 12, outline: "none", width: 140 }}/>
      <button onClick={() => find && onChange(code.replace(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), replace))}
        style={{ padding: "4px 10px", borderRadius: 6, border: BORDER, background: BG3, color: ACCENT, fontSize: 11, cursor: "pointer" }}>Sostituisci</button>
      <button onClick={() => find && onChange(code.replaceAll(find, replace))}
        style={{ padding: "4px 10px", borderRadius: 6, border: BORDER, background: BG3, color: ACCENT, fontSize: 11, cursor: "pointer" }}>Tutte</button>
      <button onClick={onClose} style={{ padding: "4px 8px", borderRadius: 6, border: "none", background: "transparent", color: "rgba(255,255,255,0.3)", fontSize: 14, cursor: "pointer" }}>✕</button>
    </div>
  );
}

// ── Interactive Terminal ──
function Terminal({ output, running, height, runTime, onClear, onRun, testApi, stdin, onStdinChange, langId, btn }) {
  const [termInput, setTermInput]   = useState("");
  const [inputLines, setInputLines] = useState([]);
  const [showHelp, setShowHelp]     = useState(false);
  const termRef = useRef(null);
  const inputRef= useRef(null);

  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [output, inputLines]);

  const addLine = () => {
    const nl = [...inputLines, termInput];
    setInputLines(nl);
    onStdinChange(nl.join("\n"));
    setTermInput("");
    inputRef.current?.focus();
  };

  const clearAll = () => { setInputLines([]); onStdinChange(""); onClear(); };

  const hasError = output && (output.includes("❌") || output.toLowerCase().includes("error"));

  return (
    <div style={{ height, flexShrink: 0, display: "flex", flexDirection: "column", background: "#020000" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: "#0a0000", borderBottom: BORDER, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 5, marginRight: 4 }}>
          {["#ff5f57","#febc2e","#28c840"].map((c,i) => <div key={i} style={{ width:10,height:10,borderRadius:"50%",background:c,opacity:.8 }}/>)}
        </div>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", flex: 1, textAlign: "center" }}>TERMINALE — WorkingCode</span>
        {runTime && <span style={{ fontSize: 10, color: "rgba(255,45,85,0.4)" }}>{runTime}s</span>}
        <button onClick={() => setShowHelp(h => !h)} style={{ background:"transparent",border:BORDER,color:"rgba(255,255,255,0.3)",borderRadius:5,padding:"2px 7px",fontSize:11,cursor:"pointer" }}>?</button>
        {btn("🔬 Test", testApi, "#a78bfa", "Testa connessione API")}
        {btn("🗑", clearAll, "rgba(255,255,255,0.25)", "Pulisci")}
      </div>

      {/* Help */}
      {showHelp && (
        <div style={{ padding: "8px 14px", background: "#0f0005", borderBottom: BORDER, fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>
          <strong style={{ color: ACCENT }}>Come usare WorkingCode:</strong><br/>
          • Il codice viene compilato su un <strong>server remoto</strong> (come onlinegdb.com / repl.it)<br/>
          • Se usi <code style={{ color: "#4ade80" }}>scanf()</code>, scrivi i valori nel campo <strong>$</strong> sotto, premi Invio per ogni valore, poi <strong>▶ Esegui</strong><br/>
          • Usa <strong>🔬 Test</strong> per verificare che la connessione al server funzioni
        </div>
      )}

      {/* Output area */}
      <div ref={termRef} style={{ flex: 1, overflow: "auto", padding: "10px 14px", fontFamily: "'Consolas','Courier New',monospace", fontSize: 13, lineHeight: 1.65 }}>
        <div style={{ color: "rgba(255,45,85,0.4)", marginBottom: 6, fontSize: 11 }}>WorkingCode Terminal — {new Date().toLocaleTimeString("it-IT")}</div>

        {inputLines.length > 0 && !output && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ color:"rgba(255,255,255,0.3)",fontSize:11,marginBottom:4 }}>📥 Input pronti:</div>
            {inputLines.map((l,i) => <div key={i} style={{ color:"#34d399" }}><span style={{ opacity:.4 }}>&gt; </span>{l}</div>)}
          </div>
        )}

        {output ? (
          <pre style={{ margin:0, whiteSpace:"pre-wrap", wordBreak:"break-all", color: hasError ? "#fca5a5" : "#e2e8f0" }}>{output}</pre>
        ) : running ? (
          <div style={{ color:"#fbbf24" }}>⏳ Compilazione ed esecuzione in corso...</div>
        ) : (
          <span style={{ color:"rgba(255,255,255,0.15)",fontStyle:"italic" }}>Premi ▶ Esegui (o F5) per avviare il programma...</span>
        )}
      </div>

      {/* Stdin chips */}
      {inputLines.length > 0 && (
        <div style={{ padding:"4px 14px",display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",borderTop:"1px solid rgba(52,211,153,0.1)" }}>
          <span style={{ fontSize:10,color:"rgba(52,211,153,0.5)" }}>📥 INPUT:</span>
          {inputLines.map((l,i) => (
            <span key={i} style={{ fontSize:11,padding:"2px 8px",borderRadius:12,background:"rgba(52,211,153,0.1)",border:"1px solid rgba(52,211,153,0.2)",color:"#34d399",fontFamily:"Consolas",display:"flex",alignItems:"center",gap:4 }}>
              {l||"(vuoto)"}
              <span onClick={() => { const nl=inputLines.filter((_,j)=>j!==i);setInputLines(nl);onStdinChange(nl.join("\n")); }} style={{ cursor:"pointer",opacity:.5 }}>×</span>
            </span>
          ))}
          <span onClick={clearAll} style={{ fontSize:10,color:"rgba(255,45,85,0.5)",cursor:"pointer",textDecoration:"underline" }}>Cancella</span>
        </div>
      )}

      {/* Input row */}
      <div style={{ display:"flex",alignItems:"center",gap:6,padding:"7px 10px",borderTop:BORDER,background:"#040000" }}>
        <span style={{ color:"#34d399",fontSize:13,fontFamily:"Consolas",flexShrink:0 }}>$</span>
        <input
          ref={inputRef}
          value={termInput}
          onChange={e => setTermInput(e.target.value)}
          onKeyDown={e => { if (e.key==="Enter") { e.preventDefault(); addLine(); } }}
          placeholder={running ? "Esecuzione..." : "Valore di input → Invio per aggiungere..."}
          disabled={running}
          style={{ flex:1,background:"transparent",border:"none",outline:"none",color:"#34d399",fontFamily:"'Consolas',monospace",fontSize:13,caretColor:"#34d399" }}
        />
        {termInput && (
          <button onClick={addLine} style={{ padding:"3px 10px",borderRadius:6,border:"1px solid rgba(52,211,153,0.3)",background:"rgba(52,211,153,0.08)",color:"#34d399",fontSize:11,cursor:"pointer" }}>+ Invio</button>
        )}
        <button onClick={onRun} disabled={running}
          style={{ padding:"5px 14px",borderRadius:7,border:"none",background:running?"#1a0005":`linear-gradient(135deg,${ACCENT},${ACCENT2})`,color:"#fff",fontWeight:700,fontSize:12,cursor:running?"not-allowed":"pointer",boxShadow:running?"none":`0 0 10px ${ACCENT}55`,transition:"all .2s",flexShrink:0 }}>
          {running ? "⏳" : "▶ Esegui"}
        </button>
      </div>
    </div>
  );
}

// ── Main Editor ──
export default function WorkingCodeEditor() {
  const [tabs,     setTabs]     = useState(() => { try { const t=JSON.parse(localStorage.getItem(TABS_KEY)); return t?.length?t:[newTab(LANGUAGES[0])]; } catch { return [newTab(LANGUAGES[0])]; } });
  const [activeId, setActiveId] = useState(() => { try { return localStorage.getItem(ACTIVE_KEY)||null; } catch { return null; } });
  const [output,   setOutput]   = useState("");
  const [stdin,    setStdin]    = useState("");
  const [running,  setRunning]  = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [showFind, setShowFind] = useState(false);
  const [panelH,   setPanelH]   = useState(220);
  const [dragging, setDragging] = useState(false);
  const [status,   setStatus]   = useState("");
  const [runTime,  setRunTime]  = useState(null);

  const activeTab = tabs.find(t => t.id === (activeId || tabs[0]?.id)) || tabs[0];
  const lang      = LANGUAGES.find(l => l.id === activeTab?.langId) || LANGUAGES[0];

  // Persist
  useEffect(() => { localStorage.setItem(TABS_KEY, JSON.stringify(tabs)); }, [tabs]);
  useEffect(() => { if (activeId) localStorage.setItem(ACTIVE_KEY, activeId); }, [activeId]);

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey||e.metaKey) && e.key==="s")     { e.preventDefault(); saveTab(); }
      if ((e.ctrlKey||e.metaKey) && e.key==="f")     { e.preventDefault(); setShowFind(f=>!f); }
      if ((e.ctrlKey||e.metaKey) && e.key==="Enter") { e.preventDefault(); handleRun(); }
      if (e.key==="F5")                               { e.preventDefault(); handleRun(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs, activeId, stdin]);

  // Resize divider
  useEffect(() => {
    if (!dragging) return;
    const move = (e) => { const y=e.clientY; const h=window.innerHeight-y; setPanelH(Math.max(100,Math.min(h,520))); };
    const up   = () => setDragging(false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup",   up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [dragging]);

  const updateCode = (code) => setTabs(ts => ts.map(t => t.id===activeTab.id ? {...t,code,saved:false} : t));
  const saveTab    = ()     => { setTabs(ts=>ts.map(t=>t.id===activeTab.id?{...t,saved:true}:t)); setStatus("💾 Salvato"); setTimeout(()=>setStatus(""),1500); };

  const addTab   = (langId) => { const l=LANGUAGES.find(l=>l.id===langId)||LANGUAGES[0]; const t=newTab(l); setTabs(ts=>[...ts,t]); setActiveId(t.id); };
  const closeTab = (id)     => { const nl=tabs.filter(t=>t.id!==id); if(!nl.length) nl.push(newTab(LANGUAGES[0])); setTabs(nl); if(activeId===id) setActiveId(nl[nl.length-1].id); };
  const renameTab= (id)     => { const t=tabs.find(t=>t.id===id); const n=window.prompt("Rinomina:",t.name); if(n) setTabs(ts=>ts.map(t=>t.id===id?{...t,name:n}:t)); };

  const handleRun = useCallback(async () => {
    if (!activeTab || running) return;
    setRunning(true);
    setOutput("⏳ Connessione al server di compilazione...\n");
    setStatus("🔄 ...");
    const t0 = Date.now();
    try {
      const data = await pistonRun(lang.runtime, lang.version, lang.ext, activeTab.code, stdin);
      const elapsed = ((Date.now()-t0)/1000).toFixed(2);
      setRunTime(elapsed);

      const cErr = data.compile?.stderr?.trim() || "";
      const cOut = data.compile?.stdout?.trim() || data.compile?.output?.trim() || "";
      const rOut = data.run?.stdout?.trim()  || data.run?.output?.trim()  || "";
      const rErr = data.run?.stderr?.trim()  || "";
      const code = data.run?.code ?? data.compile?.code ?? "?";

      let out = "";

      if (cErr) {
        out = `❌ ERRORE DI COMPILAZIONE:\n${cErr}`;
        if (cOut) out += `\n${cOut}`;
        out += `\n\n💡 Controlla la sintassi e riprova.`;
        setStatus("❌ Compilazione fallita");
      } else {
        if (cOut) out += `⚠️ Avvisi:\n${cOut}\n\n`;
        if (rOut) out += rOut;
        if (rErr) out += (out?"\n\n":"")+`⚠️ Stderr:\n${rErr}`;
        if (!rOut && !rErr) {
          out += "(nessun output)";
          if (lang.id==="c"||lang.id==="cpp") out += "\n💡 Se usi scanf(), aggiungi i valori nel campo $ qui sotto, poi riesegui.";
        }
        const ok = code===0||code==="0"||code===null;
        out += `\n\n${"─".repeat(36)}\n${ok?"✅":"❌"} Uscita ${code} · ${elapsed}s`;
        setStatus(ok?`✅ ${elapsed}s`:`❌ Codice ${code}`);
      }
      setOutput(out);
    } catch(err) {
      setOutput(`❌ ERRORE DI CONNESSIONE:\n${err.message}\n\n👉 Usa il pulsante "🔬 Test" per verificare se il server è raggiungibile.`);
      setStatus("❌ Errore");
    }
    setRunning(false);
  }, [activeTab, lang, stdin, running]);

  const testApi = async () => {
    setRunning(true);
    setOutput("🔬 Test connessione in corso...\n");
    try {
      const data = await pistonRun("python", "*", "py", 'print("CONNESSIONE OK!")', "");
      const out  = data.run?.stdout || data.run?.output || "";
      if (out.includes("CONNESSIONE OK")) {
        setOutput(`✅ Server raggiungibile!\n\nL'API funziona correttamente.\n\nOutput test: ${out}\n\nOra puoi eseguire il tuo codice C normalmente.`);
        setStatus("✅ API OK");
      } else {
        setOutput(`⚠️ Il server ha risposto ma in modo inatteso:\n${JSON.stringify(data,null,2)}`);
        setStatus("⚠️ Risposta anomala");
      }
    } catch(e) {
      setOutput(`❌ Server NON raggiungibile:\n${e.message}\n\nVerifica la connessione internet.`);
      setStatus("❌ Offline");
    }
    setRunning(false);
  };

  const downloadCode = () => { const b=new Blob([activeTab.code],{type:"text/plain"}); const u=URL.createObjectURL(b); const a=document.createElement("a"); a.href=u; a.download=activeTab.name; a.click(); URL.revokeObjectURL(u); };
  const copyCode     = () => { navigator.clipboard.writeText(activeTab.code); setStatus("📋 Copiato!"); setTimeout(()=>setStatus(""),1500); };
  const clearOutput  = () => setOutput("");

  const btn = (label, onClick, color, title, disabled) => (
    <button onClick={onClick} title={title} disabled={disabled}
      style={{ padding:"5px 11px",borderRadius:7,border:`1px solid ${color}44`,background:`${color}12`,color:disabled?"rgba(255,255,255,0.25)":color,fontSize:12,fontWeight:600,cursor:disabled?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap",transition:"all .15s",flexShrink:0 }}>
      {label}
    </button>
  );

  if (!activeTab) return null;

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:BG,color:"#f0f0f0" }}>
      <style>{`
        .wc-tab:hover { background: rgba(255,45,85,0.08) !important; }
        button:active  { transform: scale(0.97); }
        textarea:focus { outline: none; }
        @keyframes wc-pulse { 0%,100%{opacity:.3;transform:scale(.85)} 50%{opacity:1;transform:scale(1)} }
      `}</style>

      {/* ── TOOLBAR ── */}
      <div style={{ display:"flex",alignItems:"center",gap:6,padding:"7px 12px",background:BG2,borderBottom:BORDER,flexShrink:0,flexWrap:"wrap" }}>
        <button onClick={handleRun} disabled={running}
          style={{ padding:"6px 16px",borderRadius:8,border:"none",background:running?"#1a0005":`linear-gradient(135deg,${ACCENT},${ACCENT2})`,color:"#fff",fontWeight:700,fontSize:13,cursor:running?"not-allowed":"pointer",boxShadow:running?"none":`0 0 14px ${ACCENT}66`,display:"flex",alignItems:"center",gap:6,flexShrink:0,transition:"all .2s" }}>
          {running ? "⏳ Esecuzione..." : "▶ Esegui"}
        </button>
        <div style={{ width:1,height:24,background:BORDER,margin:"0 4px" }}/>
        <select value={lang.id}
          onChange={e => { const l=LANGUAGES.find(x=>x.id===e.target.value); setTabs(ts=>ts.map(t=>t.id===activeTab.id?{...t,langId:l.id,name:`main.${l.ext}`,code:l.template}:t)); }}
          style={{ padding:"5px 10px",borderRadius:7,border:BORDER,background:BG3,color:"#fff",fontSize:12,cursor:"pointer",outline:"none" }}>
          {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
        <div style={{ width:1,height:24,background:BORDER,margin:"0 4px" }}/>
        {btn("💾 Salva",    saveTab,                         "#4ade80", "Ctrl+S")}
        {btn("📋 Copia",    copyCode,                        "#60a5fa", "Copia codice")}
        {btn("⬇ Scarica",  downloadCode,                    "#a78bfa", "Scarica file")}
        {btn("🔍 Cerca",    () => setShowFind(f=>!f),        "#fbbf24", "Ctrl+F")}
        <div style={{ width:1,height:24,background:BORDER,margin:"0 4px" }}/>
        <div style={{ display:"flex",alignItems:"center",gap:4,fontSize:11,color:"rgba(255,255,255,0.4)" }}>
          <span>Aa</span>
          <button onClick={() => setFontSize(s=>Math.max(11,s-1))} style={{ background:"transparent",border:BORDER,color:"rgba(255,255,255,0.5)",borderRadius:5,width:22,height:22,cursor:"pointer",fontSize:14 }}>-</button>
          <span style={{ minWidth:20,textAlign:"center",color:"#fff" }}>{fontSize}</span>
          <button onClick={() => setFontSize(s=>Math.min(22,s+1))} style={{ background:"transparent",border:BORDER,color:"rgba(255,255,255,0.5)",borderRadius:5,width:22,height:22,cursor:"pointer",fontSize:14 }}>+</button>
        </div>
        <button onClick={() => { if(window.confirm("Ripristinare il template?")) updateCode(lang.template); }}
          style={{ padding:"5px 10px",borderRadius:7,border:BORDER,background:BG3,color:"rgba(255,255,255,0.35)",fontSize:11,cursor:"pointer" }}>Template</button>
        <div style={{ flex:1 }}/>
        {status && <span style={{ fontSize:12,color:status.startsWith("❌")?"#ff6b6b":status.startsWith("✅")?"#4ade80":"rgba(255,255,255,0.6)" }}>{status}</span>}
        <span style={{ fontSize:10,color:"rgba(255,255,255,0.18)",flexShrink:0 }}>F5 / Ctrl+Enter</span>
      </div>

      {/* ── TABS ── */}
      <div style={{ display:"flex",alignItems:"center",background:BG2,borderBottom:BORDER,overflow:"auto",flexShrink:0 }}>
        {tabs.map(t => (
          <div key={t.id} className="wc-tab"
            onClick={() => setActiveId(t.id)}
            onDoubleClick={() => renameTab(t.id)}
            style={{ display:"flex",alignItems:"center",gap:6,padding:"7px 14px",background:t.id===activeTab.id?BG:"transparent",borderRight:BORDER,borderBottom:t.id===activeTab.id?`2px solid ${ACCENT}`:"2px solid transparent",cursor:"pointer",fontSize:12,flexShrink:0,color:t.id===activeTab.id?"#fff":"rgba(255,255,255,0.4)" }}>
            <span>{t.saved?"":"●"}{t.name}</span>
            <span onClick={e=>{e.stopPropagation();closeTab(t.id);}} style={{ fontSize:14,color:"rgba(255,255,255,0.3)",lineHeight:1,padding:"0 2px" }}>×</span>
          </div>
        ))}
        <select onChange={e=>{if(e.target.value){addTab(e.target.value);e.target.value="";}}} value=""
          style={{ margin:"0 4px",padding:"4px 8px",background:"transparent",border:BORDER,color:"rgba(255,255,255,0.4)",fontSize:11,cursor:"pointer",borderRadius:6,outline:"none" }}>
          <option value="">+ Nuovo</option>
          {LANGUAGES.map(l=><option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
      </div>

      {/* ── FIND BAR ── */}
      {showFind && <FindBar code={activeTab.code} onChange={updateCode} onClose={() => setShowFind(false)} />}

      {/* ── EDITOR ── */}
      <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minHeight:0 }}>
        <CodeEditor code={activeTab.code} onChange={updateCode} fontSize={fontSize} />
      </div>

      {/* ── DIVIDER ── */}
      <div onMouseDown={() => setDragging(true)}
        style={{ height:6,flexShrink:0,background:dragging?ACCENT:BG3,borderTop:BORDER,cursor:"row-resize",display:"flex",alignItems:"center",justifyContent:"center",transition:"background .15s" }}>
        <div style={{ width:40,height:2,borderRadius:2,background:"rgba(255,45,85,0.3)" }}/>
      </div>

      {/* ── TERMINAL ── */}
      <Terminal
        output={output} running={running} height={panelH} runTime={runTime}
        onClear={clearOutput} onRun={handleRun} testApi={testApi}
        stdin={stdin} onStdinChange={setStdin} langId={lang.id} btn={btn}
      />
    </div>
  );
}
