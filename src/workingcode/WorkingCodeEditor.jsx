import { useState, useRef, useEffect, useCallback } from "react";
import {
  COMPILERS_BY_LANG,
  getPreferredCompiler,
  setPreferredCompiler,
  getCompilerOptions,
  codeNeedsInput,
  makeInteractive,
  wandboxRun,
  findPromptIndices,
} from "./wcCompiler";
import {
  isTauriApp,
  runPowerShellNative,
  getDesktopInfoNative,
  compileAndRunCLocalNative,
} from "./tauriBridge";

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
function DevTerminal({ height, onRunStateChange, onTest, btn, onOpenTerminal, activeCompiler }) {
  const [tabMode, setTabMode]   = useState("compiler"); // "compiler" | "powershell"
  const [isDesktop, setIsDesktop] = useState(false);
  const [desktopInfo, setDesktopInfo] = useState(null);

  // Compiler terminal state
  const [lines, setLines]       = useState([]);
  const [mode, setMode]         = useState("idle"); // idle | input | busy | done
  const [inputVal, setInputVal] = useState("");
  const [job, setJob]           = useState(null);
  const [inputs, setInputs]     = useState([]);
  const [step, setStep]         = useState(0);

  // PowerShell terminal state
  const [psCwd, setPsCwd]       = useState("C:\\Users");
  const [psLines, setPsLines]   = useState([
    { type: "sys", text: "Windows PowerShell" },
    { type: "sys", text: "Copyright (C) Microsoft Corporation. Tutti i diritti riservati." },
    { type: "blank", text: "" },
  ]);
  const [psInput, setPsInput]   = useState("");
  const [psBusy, setPsBusy]     = useState(false);
  const [psHistory, setPsHistory] = useState([]);
  const [psHistIdx, setPsHistIdx] = useState(-1);

  const termRef  = useRef(null);
  const inputRef = useRef(null);
  const psInputRef = useRef(null);

  useEffect(() => {
    isTauriApp().then(ok => {
      setIsDesktop(ok);
      if (ok) {
        getDesktopInfoNative().then(info => {
          setDesktopInfo(info);
          if (info?.cwd) setPsCwd(info.cwd);
          setPsLines(prev => [
            ...prev,
            { type: "info", text: `⚡ Connesso a PowerShell Windows (Utente: ${info.username})` },
            { type: "info", text: `📁 Cartella: ${info.cwd}` },
            { type: "blank", text: "" },
          ]);
        });
      } else {
        setPsLines(prev => [
          ...prev,
          { type: "warn", text: "⚠️ Versione Web: Il terminale PowerShell reale è attivo nell'applicazione PC (Desktop)." },
          { type: "info", text: "💡 Scarica WorkfyStation per PC per eseguire qualsiasi comando PowerShell in locale." },
          { type: "blank", text: "" },
        ]);
      }
    });
  }, []);

  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [lines, psLines, tabMode]);

  useEffect(() => {
    if (tabMode === "compiler" && mode === "input" && inputRef.current) {
      inputRef.current.focus();
    } else if (tabMode === "powershell" && psInputRef.current) {
      psInputRef.current.focus();
    }
  }, [tabMode, mode, lines, psLines]);

  const add = useCallback((type, text) => setLines(p => [...p, { type, text }]), []);
  const addPs = useCallback((type, text) => setPsLines(p => [...p, { type, text }]), []);

  // ── ESECUZIONE POWERSHELL REALE ──
  const handlePsCommand = async (cmd) => {
    const trimmed = (cmd !== undefined ? cmd : psInput).trim();
    if (!trimmed) return;
    setPsInput("");
    addPs("prompt", `PS ${psCwd}> ${trimmed}`);
    setPsHistory(h => [...h, trimmed]);
    setPsHistIdx(-1);

    if (trimmed.toLowerCase() === "cls" || trimmed.toLowerCase() === "clear") {
      setPsLines([]);
      return;
    }

    setPsBusy(true);
    try {
      if (!isDesktop) {
        addPs("warn", "⚠️ Sei sul browser web. Il terminale PowerShell reale richiede l'applicazione desktop Windows.");
        addPs("info", "💡 Scarica l'app per PC dalla schermata iniziale o usa la scheda 'Compilatore C'!");
        setPsBusy(false);
        return;
      }
      const res = await runPowerShellNative(trimmed, psCwd);
      if (res.cwd) setPsCwd(res.cwd);
      if (res.stdout && res.stdout.trim()) {
        res.stdout.split("\n").forEach(l => addPs("output", l.replace(/\r/g, "")));
      }
      if (res.stderr && res.stderr.trim()) {
        res.stderr.split("\n").forEach(l => addPs("error", l.replace(/\r/g, "")));
      }
    } catch (e) {
      addPs("error", "❌ " + (e.message || e));
    } finally {
      setPsBusy(false);
    }
  };

  // ── STEP 0: Run code (local GCC if available in desktop app, else Wandbox) ──
  const startExecution = useCallback(async (compiler, code, langId, options = "") => {
    setTabMode("compiler");
    const processedCode = codeNeedsInput(code, langId) ? makeInteractive(code, langId) : code;
    setJob({ compiler, code: processedCode, langId, options });
    setInputs([]);
    setStep(0);
    setLines([{ type: "system", text: `─── Terminale WorkingCode [${compiler}] ───` }]);

    // Prova compilazione locale se siamo su Desktop e GCC locale e disponibile
    if (isDesktop && desktopInfo?.gcc_available && compiler.startsWith("gcc")) {
      setMode("busy");
      onRunStateChange(true);
      add("system", "🖥️ Esecuzione con GCC locale di Windows...");
      try {
        const t0 = Date.now();
        const res = await compileAndRunCLocalNative(processedCode, "gcc", options);
        const el = ((Date.now() - t0) / 1000).toFixed(2);
        if (!res.success && res.stderr) {
          add("error", "❌ Errore compilazione locale:");
          res.stderr.split("\n").forEach(l => add("error", l));
        } else {
          if (res.stdout) res.stdout.split("\n").forEach(l => add("output", l));
          if (res.stderr) res.stderr.split("\n").forEach(l => add("warn", l));
          add("blank", "");
          add("status", "─".repeat(36));
          add("status", `✅ Codice ${res.exit_code} · ${el}s (GCC Locale Windows)`);
        }
      } catch (e) {
        add("error", "❌ Errore locale: " + e.message);
      }
      setMode("done");
      onRunStateChange(false);
      return;
    }

    if (!codeNeedsInput(code, langId)) {
      setMode("busy");
      onRunStateChange(true);
      try {
        const t0 = Date.now();
        const d = await wandboxRun(compiler, processedCode, "", options);
        const el = ((Date.now() - t0) / 1000).toFixed(2);
        if (d.compiler_error && !d.program_output) {
          add("error", "❌ Errore compilazione:");
          d.compiler_error.split("\n").forEach(l => add("error", l));
        } else {
          if (d.compiler_message) { add("warn", d.compiler_message); add("blank", ""); }
          (d.program_output || "(nessun output)").split("\n").forEach(l => add("output", l));
          if (d.program_error) d.program_error.split("\n").forEach(l => add("warn", l));
          add("blank", "");
          add("status", "─".repeat(36));
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
    add("system", "⚙️ Compilazione in corso...");

    try {
      const d = await wandboxRun(compiler, processedCode, "", options);
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
        for (let i = 0; i <= prompts[0]; i++) {
          add("output", outLines[i]);
        }
        setMode("input");
      } else {
        add("info", "Il programma è in attesa di input.");
        add("info", "Scrivi un valore e premi Invio.");
        setMode("input");
      }
    } catch (e) { add("error", "❌ " + e.message); setMode("done"); }
    onRunStateChange(false);
  }, [add, onRunStateChange, isDesktop, desktopInfo]);

  // ── STEP N: User entered a value → re-run with all values, show new output ──
  const handleUserInput = useCallback(async () => {
    if (mode !== "input" || !job) return;
    const val = inputVal;
    setInputVal("");
    if (val.trim() === "") return;

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
      const d = await wandboxRun(job.compiler, job.code, stdinStr, job.options || "");
      const el = ((Date.now() - t0) / 1000).toFixed(2);
      const output = d.program_output || "";
      const outLines = output.split("\n");
      const prompts = findPromptIndices(output);

      const prevPrompt = prompts[newStep - 1];
      const nextPrompt = prompts[newStep];

      if (prevPrompt !== undefined) {
        const from = prevPrompt + 1;
        const to = nextPrompt !== undefined ? nextPrompt + 1 : outLines.length;

        for (let i = from; i < to; i++) {
          if (outLines[i] !== undefined) add("output", outLines[i]);
        }

        if (nextPrompt !== undefined) {
          setMode("input");
        } else {
          const ok = (d.status || "0") === "0";
          if (d.program_error) d.program_error.split("\n").forEach(l => add("warn", l));
          add("blank", "");
          add("status", "─".repeat(36));
          add("status", `${ok ? "✅" : "❌"} Codice ${d.status || "0"} · ${el}s`);
          setMode("done");
        }
      } else {
        outLines.forEach(l => add("output", l));
        add("blank", "");
        add("status", "─".repeat(36));
        add("status", `${(d.status||"0")==="0"?"✅":"❌"} Codice ${d.status||"0"} · ${el}s`);
        setMode("done");
      }
    } catch (e) { add("error", "❌ " + e.message); setMode("done"); }
    onRunStateChange(false);
  }, [mode, job, inputVal, inputs, step, add, onRunStateChange]);

  const clear = () => {
    if (tabMode === "compiler") {
      setLines([]); setMode("idle"); setInputs([]); setStep(0); setJob(null);
    } else {
      setPsLines([]);
    }
  };

  useEffect(() => {
    window.__wcTerminal = { startExecution };
    return () => { delete window.__wcTerminal; };
  }, [startExecution]);

  const clr = (t) => {
    const map = {
      system: "rgba(255,45,85,0.6)",
      sys: "#38bdf8",
      output: "#e2e8f0",
      error: "#fca5a5",
      warn: "#fbbf24",
      userinput: "#60a5fa",
      info: "#34d399",
      status: "rgba(255,255,255,0.45)",
      prompt: "#a78bfa",
    };
    return map[t] || "transparent";
  };

  return (
    <div style={{ height, flexShrink: 0, display: "flex", flexDirection: "column", background: "#020000" }}>
      {/* Header and Tab Switcher */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: "#0a0000", borderBottom: BORDER, flexShrink: 0, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 5, marginRight: 6 }}>
          {["#ff5f57","#febc2e","#28c840"].map((c,i) => <div key={i} style={{ width:10,height:10,borderRadius:"50%",background:c,opacity:.8 }}/>)}
        </div>

        {/* Tab Switcher */}
        <div style={{ display: "flex", background: "rgba(255,255,255,0.06)", borderRadius: 7, padding: 2, gap: 2 }}>
          <button
            onClick={() => setTabMode("compiler")}
            style={{
              padding: "4px 10px", borderRadius: 5, border: "none", cursor: "pointer",
              fontSize: 11, fontWeight: tabMode === "compiler" ? 700 : 500,
              background: tabMode === "compiler" ? "rgba(255,45,85,0.28)" : "transparent",
              color: tabMode === "compiler" ? "#ffffff" : "rgba(255,255,255,0.5)",
              display: "flex", alignItems: "center", gap: 5,
            }}>
            🔨 Compilatore C {activeCompiler && <span style={{ color: ACCENT, fontSize: 10 }}>[{activeCompiler}]</span>}
          </button>
          <button
            onClick={() => setTabMode("powershell")}
            style={{
              padding: "4px 10px", borderRadius: 5, border: "none", cursor: "pointer",
              fontSize: 11, fontWeight: tabMode === "powershell" ? 700 : 500,
              background: tabMode === "powershell" ? "rgba(59,130,246,0.3)" : "transparent",
              color: tabMode === "powershell" ? "#60a5fa" : "rgba(255,255,255,0.5)",
              display: "flex", alignItems: "center", gap: 5,
            }}>
            ⚡ PowerShell {isDesktop ? "Windows (Reale)" : "(Desktop)"}
          </button>
        </div>

        {/* Quick PowerShell buttons */}
        {tabMode === "powershell" && (
          <div style={{ display: "flex", gap: 4, marginLeft: 4 }}>
            {["dir", "gcc --version", "cls"].map(cmd => (
              <button
                key={cmd}
                onClick={() => handlePsCommand(cmd)}
                style={{
                  padding: "2px 7px", borderRadius: 5, border: `1px solid rgba(255,255,255,0.15)`,
                  background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.7)",
                  fontSize: 10, cursor: "pointer", fontFamily: "Consolas",
                }}>
                {cmd}
              </button>
            ))}
          </div>
        )}

        <div style={{ flex: 1 }}/>

        {tabMode === "compiler" && (
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginRight: 6 }}>
            {mode === "input" && <span style={{ color: "#34d399" }}>● INSERISCI VALORE</span>}
            {mode === "busy"  && <span style={{ color: "#fbbf24" }}>● ESECUZIONE</span>}
          </span>
        )}

        {onOpenTerminal && btn("🖥️ Terminale Completo", onOpenTerminal, "#ff2d55", "Apri schermata Terminale dedicata")}
        {tabMode === "compiler" && btn("🔬", onTest, "#a78bfa", "Test API")}
        {btn("🗑", clear, "rgba(255,255,255,0.25)", "Pulisci")}
      </div>

      {/* Terminal Output Area */}
      <div ref={termRef} style={{ flex: 1, overflow: "auto", padding: "10px 14px", fontFamily: "'Consolas','Courier New',monospace", fontSize: 13, lineHeight: 1.65 }}>
        {tabMode === "compiler" ? (
          <>
            {lines.length === 0 && <span style={{ color: "rgba(255,255,255,0.15)", fontStyle: "italic" }}>Premi ▶ Esegui (F5) per compilare ed avviare il codice...</span>}
            {lines.map((l, i) => (
              <div key={i} style={{ color: clr(l.type), minHeight: l.type === "blank" ? 6 : "auto" }}>
                {l.type === "userinput"
                  ? <><span style={{ opacity: .5 }}>{">"} </span><span style={{ color: "#60a5fa", fontWeight: 600 }}>{l.text}</span></>
                  : l.text}
              </div>
            ))}
            {mode === "busy" && <div style={{ color: "#fbbf24", marginTop: 4 }}><span style={{ animation: "wc-blink 1s infinite" }}>▌</span></div>}
          </>
        ) : (
          <>
            {psLines.map((l, i) => (
              <div key={i} style={{ color: clr(l.type), minHeight: l.type === "blank" ? 6 : "auto" }}>
                {l.text}
              </div>
            ))}
            {psBusy && <div style={{ color: "#38bdf8", marginTop: 4 }}>Esecuzione comando in corso...</div>}
          </>
        )}
      </div>

      {/* Terminal Input Bar */}
      {tabMode === "compiler" ? (
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
            placeholder={mode === "input" ? "Scrivi il valore per scanf e premi Invio..." : mode === "busy" ? "Attendere..." : "Pronto per l'esecuzione"}
            disabled={mode !== "input"}
            autoFocus={mode === "input"}
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: mode === "input" ? "#60a5fa" : "#34d399", fontFamily: "'Consolas',monospace", fontSize: 14, caretColor: "#60a5fa" }}
          />
        </div>
      ) : (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
          borderTop: "1px solid rgba(59,130,246,0.3)", background: "#020712",
        }}>
          <span style={{ color: "#60a5fa", fontSize: 13, fontFamily: "Consolas", fontWeight: 600, whiteSpace: "nowrap" }}>
            PS {psCwd}&gt;
          </span>
          <input
            ref={psInputRef}
            value={psInput}
            onChange={e => setPsInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") {
                e.preventDefault();
                handlePsCommand(psInput);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                if (psHistory.length > 0) {
                  const nextIdx = psHistIdx === -1 ? psHistory.length - 1 : Math.max(0, psHistIdx - 1);
                  setPsHistIdx(nextIdx);
                  setPsInput(psHistory[nextIdx]);
                }
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                if (psHistIdx !== -1) {
                  const nextIdx = psHistIdx + 1;
                  if (nextIdx < psHistory.length) {
                    setPsHistIdx(nextIdx);
                    setPsInput(psHistory[nextIdx]);
                  } else {
                    setPsHistIdx(-1);
                    setPsInput("");
                  }
                }
              }
            }}
            placeholder={isDesktop ? "Digita un comando PowerShell reale (dir, gcc, python...) e premi Invio..." : "PowerShell reale attiva su PC. Digita un comando..."}
            disabled={psBusy}
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#f8fafc", fontFamily: "'Consolas',monospace", fontSize: 13, caretColor: "#60a5fa" }}
          />
          {psBusy && <span style={{ color: "#60a5fa", fontSize: 12 }}>⏳</span>}
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════
export default function WorkingCodeEditor({ onOpenTerminal }) {
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
  const [selectedCompiler, setSelectedCompiler] = useState(() => getPreferredCompiler(lang.id));

  useEffect(() => {
    setSelectedCompiler(getPreferredCompiler(lang.id));
  }, [lang.id]);

  const handleCompilerChange = (newComp) => {
    setSelectedCompiler(newComp);
    setPreferredCompiler(lang.id, newComp);
  };

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
  }, [tabs, activeId, selectedCompiler]);
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
    const options = getCompilerOptions(lang.id);
    const compToUse = selectedCompiler || lang.compiler;
    if (window.__wcTerminal) window.__wcTerminal.startExecution(compToUse, activeTab.code, lang.id, options);
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
        <select
          value={selectedCompiler}
          onChange={e => handleCompilerChange(e.target.value)}
          title="Seleziona il compilatore specifico da usare"
          style={{ padding: "5px 10px", borderRadius: 7, border: `1px solid ${ACCENT}55`, background: BG3, color: ACCENT, fontSize: 12, fontWeight: 600, cursor: "pointer", outline: "none" }}>
          {(COMPILERS_BY_LANG[lang.id] || []).map(c => (
            <option key={c.id} value={c.id} style={{ background: "#110006", color: "#fff" }}>
              {c.label}
            </option>
          ))}
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

      <DevTerminal
        height={panelH}
        onRunStateChange={(r) => { setRunning(r); if (!r) setTimeout(() => setStatus(""), 2000); }}
        onTest={testApi}
        btn={btn}
        onOpenTerminal={onOpenTerminal}
        activeCompiler={selectedCompiler}
      />
    </div>
  );
}
