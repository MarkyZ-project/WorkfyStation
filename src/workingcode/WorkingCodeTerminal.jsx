import { useState, useRef, useEffect, useCallback } from "react";
import {
  COMPILERS_BY_LANG,
  C_STANDARDS,
  WARNING_FLAGS,
  getPreferredCompiler,
  setPreferredCompiler,
  getCompilerOptions,
  setCompilerOptions,
  codeNeedsInput,
  makeInteractive,
  wandboxRun,
  findPromptIndices,
} from "./wcCompiler";

const ACCENT = "#ff2d55";
const ACCENT2 = "#ff0020";
const BG = "#060002";
const BG2 = "#0d0004";
const BG3 = "#140008";
const BORDER = "rgba(255,45,85,0.2)";

const TABS_KEY = "wc_editor_tabs";
const ACTIVE_KEY = "wc_editor_active";

const DEFAULT_C_CODE = `#include <stdio.h>

int main() {
    int numero;
    printf("╔════════════════════════════════════╗\\n");
    printf("║  Benvenuto in WorkingCode C!       ║\\n");
    printf("╚════════════════════════════════════╝\\n\\n");
    printf("Inserisci un numero intero: ");
    if (scanf("%d", &numero) == 1) {
        if (numero % 2 == 0) {
            printf("Il numero %d e' PARI!\\n", numero);
        } else {
            printf("Il numero %d e' DISPARI!\\n", numero);
        }
        printf("Il suo quadrato e': %d\\n", numero * numero);
    } else {
        printf("Errore: input non valido.\\n");
    }
    return 0;
}`;

export default function WorkingCodeTerminal({ onSwitchToEditor }) {
  const [langId, setLangId] = useState("c");
  const [compiler, setCompiler] = useState(() => getPreferredCompiler("c"));
  const [standard, setStandard] = useState("-std=c17");
  const [extraFlags, setExtraFlags] = useState("-Wall");
  const [activeFileName, setActiveFileName] = useState("main.c");
  const [activeCode, setActiveCode] = useState(DEFAULT_C_CODE);

  // Terminal state
  const [lines, setLines] = useState(() => [
    { type: "banner", text: "╔════════════════════════════════════════════════════════════════════════╗" },
    { type: "banner", text: "║   🖥️  WORKINGCODE TERMINAL · AMBIENTE DI SVILUPPO C / C++ / JAVA       ║" },
    { type: "banner", text: "║   Compilatore attivo: GCC C (C17 / C23) con input interattivo           ║" },
    { type: "banner", text: "║   Digita 'help' per la guida comandi oppure premi '▶ Esegui Codice'    ║" },
    { type: "banner", text: "╚════════════════════════════════════════════════════════════════════════╝" },
    { type: "blank", text: "" },
  ]);

  const [mode, setMode] = useState("cli"); // "cli" | "input" | "busy"
  const [cmdInput, setCmdInput] = useState("");
  const [history, setHistory] = useState([]);
  const [histIndex, setHistIndex] = useState(-1);
  const [quickCodeOpen, setQuickCodeOpen] = useState(false);

  // Active step-by-step program execution state
  const [execState, setExecState] = useState({
    code: "",
    compiler: "",
    options: "",
    inputs: [],
    step: 0,
    startTime: 0,
  });

  const termRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll on new output
  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [lines]);

  // Focus input
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [mode, lines]);

  // Load active tab from editor on mount
  useEffect(() => {
    try {
      const tabs = JSON.parse(localStorage.getItem(TABS_KEY));
      const activeId = localStorage.getItem(ACTIVE_KEY);
      if (tabs && tabs.length > 0) {
        const current = tabs.find((t) => t.id === activeId) || tabs[0];
        if (current) {
          setActiveFileName(current.name || "main.c");
          if (current.code) setActiveCode(current.code);
          if (current.langId) {
            setLangId(current.langId);
            setCompiler(getPreferredCompiler(current.langId));
          }
        }
      }
    } catch {}
  }, []);

  // Update preferred compiler when changed
  const handleCompilerChange = (newComp) => {
    setCompiler(newComp);
    setPreferredCompiler(langId, newComp);
    appendLine("info", `🔧 Compilatore impostato su: ${newComp}`);
  };

  const handleStandardChange = (newStd) => {
    setStandard(newStd);
    setCompilerOptions(langId, `${newStd}\n${extraFlags}`);
    appendLine("info", `⚙️ Standard C impostato su: ${newStd}`);
  };

  const toggleFlag = (flag) => {
    const flags = extraFlags.split(" ").filter(Boolean);
    const newFlags = flags.includes(flag)
      ? flags.filter((f) => f !== flag)
      : [...flags, flag];
    const joined = newFlags.join(" ");
    setExtraFlags(joined);
    setCompilerOptions(langId, `${standard}\n${joined}`);
  };

  const appendLine = useCallback((type, text) => {
    setLines((prev) => [...prev, { type, text }]);
  }, []);

  // ═════════════════════════════════════════════════════
  // ESECUZIONE PROGRAMMA (Compilazione + Runtime Interattivo)
  // ═════════════════════════════════════════════════════
  const runProgram = useCallback(
    async (codeToRun = activeCode, forcedCompiler = compiler) => {
      const fullOptions = `${standard}\n${extraFlags}`.trim();
      const needsInput = codeNeedsInput(codeToRun, langId);
      const processedCode = needsInput ? makeInteractive(codeToRun, langId) : codeToRun;

      appendLine("cmd", `[COMPILA ED ESEGUI] ${activeFileName} --compilatore=${forcedCompiler}`);
      if (fullOptions) appendLine("system", `⚙️ Opzioni compilatore: ${fullOptions.replace(/\n/g, " ")}`);

      const t0 = Date.now();
      setMode("busy");

      if (!needsInput) {
        // Nessun input (nessuna scanf/cin) → esecuzione diretta completa
        try {
          const d = await wandboxRun(forcedCompiler, processedCode, "", fullOptions);
          const elapsed = ((Date.now() - t0) / 1000).toFixed(2);

          if (d.compiler_error && !d.program_output) {
            appendLine("error", "❌ ERRORE DI COMPILAZIONE:");
            d.compiler_error.split("\n").forEach((l) => appendLine("error", l));
          } else {
            if (d.compiler_message) {
              appendLine("warn", "⚠️ Note compilatore:");
              d.compiler_message.split("\n").forEach((l) => appendLine("warn", l));
            }
            if (d.program_output) {
              d.program_output.split("\n").forEach((l) => appendLine("output", l));
            } else {
              appendLine("output", "(Nessun output a video)");
            }
            if (d.program_error) {
              d.program_error.split("\n").forEach((l) => appendLine("warn", l));
            }
            appendLine("blank", "");
            appendLine(
              "status",
              `${(d.status || "0") === "0" ? "✅" : "❌"} Programma terminato con codice ${d.status || "0"} · Tempo: ${elapsed}s`
            );
          }
        } catch (err) {
          appendLine("error", "❌ Errore esecuzione: " + err.message);
        }
        setMode("cli");
        return;
      }

      // Con input interattivo (scanf / cin)
      appendLine("system", "⚙️ Compilazione in corso...");
      try {
        const d = await wandboxRun(forcedCompiler, processedCode, "", fullOptions);
        if (d.compiler_error && !d.program_output) {
          appendLine("error", "❌ ERRORE DI COMPILAZIONE:");
          d.compiler_error.split("\n").forEach((l) => appendLine("error", l));
          setMode("cli");
          return;
        }

        if (d.compiler_message) {
          appendLine("warn", "⚠️ " + d.compiler_message.split("\n")[0]);
        }

        setExecState({
          code: processedCode,
          compiler: forcedCompiler,
          options: fullOptions,
          inputs: [],
          step: 0,
          startTime: t0,
        });

        const output = d.program_output || "";
        const outLines = output.split("\n");
        const prompts = findPromptIndices(output);

        if (prompts.length > 0) {
          for (let i = 0; i <= prompts[0]; i++) {
            appendLine("output", outLines[i]);
          }
        } else {
          appendLine("info", "Il programma è in attesa di input (scanf).");
          appendLine("info", "Digita il valore richiesto e premi Invio:");
        }
        setMode("input");
      } catch (err) {
        appendLine("error", "❌ Errore: " + err.message);
        setMode("cli");
      }
    },
    [activeCode, activeFileName, compiler, extraFlags, langId, standard, appendLine]
  );

  // Invia un input digitato dall'utente al programma in esecuzione
  const handleProgramInput = async (userInputVal) => {
    appendLine("userinput", userInputVal);
    setMode("busy");

    const newInputs = [...execState.inputs, userInputVal];
    const stdinPayload = newInputs.join("\n") + "\n";
    const nextStep = execState.step + 1;

    try {
      const d = await wandboxRun(
        execState.compiler,
        execState.code,
        stdinPayload,
        execState.options
      );

      const fullOutput = d.program_output || "";
      const outLines = fullOutput.split("\n");
      const prompts = findPromptIndices(fullOutput);

      if (nextStep < prompts.length) {
        const start = prompts[nextStep - 1] + 1;
        const end = prompts[nextStep];
        for (let i = start; i <= end; i++) {
          if (i < outLines.length) appendLine("output", outLines[i]);
        }
        setExecState((prev) => ({
          ...prev,
          inputs: newInputs,
          step: nextStep,
        }));
        setMode("input");
      } else {
        // Nessun altro prompt: mostra output finale
        const start = prompts.length > 0 ? prompts[prompts.length - 1] + 1 : 0;
        for (let i = start; i < outLines.length; i++) {
          if (outLines[i] !== undefined && outLines[i] !== "") {
            appendLine("output", outLines[i]);
          }
        }
        if (d.program_error) {
          d.program_error.split("\n").forEach((l) => appendLine("warn", l));
        }
        const elapsed = ((Date.now() - execState.startTime) / 1000).toFixed(2);
        appendLine("blank", "");
        appendLine(
          "status",
          `${(d.status || "0") === "0" ? "✅" : "❌"} Programma terminato con codice ${d.status || "0"} · Tempo: ${elapsed}s`
        );
        setMode("cli");
      }
    } catch (err) {
      appendLine("error", "❌ Errore durante l'input: " + err.message);
      setMode("cli");
    }
  };

  // ═════════════════════════════════════════════════════
  // INTERPRETE COMANDI TERMINALE (CLI)
  // ═════════════════════════════════════════════════════
  const handleCliCommand = (raw) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    appendLine("cmd", `$ ${trimmed}`);
    setHistory((prev) => [...prev, trimmed]);
    setHistIndex(-1);

    const parts = trimmed.split(" ").filter(Boolean);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case "help":
      case "aiuto":
      case "?":
        appendLine("info", "═══════════════ GUIDA COMANDI WORKINGCODE ═══════════════");
        appendLine("output", "  run, esegui          Compila ed esegue il file C con il compilatore scelto");
        appendLine("output", "  gcc, compile         Compila e verifica errori o warning del codice");
        appendLine("output", "  compiler             Mostra o cambia il compilatore (es. compiler gcc-13.2.0-c)");
        appendLine("output", "  std [c17|c11|c99]    Imposta lo standard C (-std=c17, -std=c99...)");
        appendLine("output", "  flags [opzioni]      Imposta flag compilatore (es. flags -Wall -Wextra)");
        appendLine("output", "  code, cat            Mostra il codice sorgente attuale nel terminale");
        appendLine("output", "  edit, editor         Apre l'editor di testo o torna a WorkingCode Editor");
        appendLine("output", "  files, ls, dir       Elenca i file / tab aperti salvati");
        appendLine("output", "  clear, cls           Pulisce lo schermo del terminale");
        appendLine("output", "  echo [testo]         Stampa un messaggio a video");
        appendLine("output", "  whoami               Mostra informazioni sull'utente e piano Workfy");
        appendLine("output", "  sysinfo              Informazioni sull'app desktop e compilatore");
        appendLine("info", "═════════════════════════════════════════════════════════");
        break;

      case "run":
      case "esegui":
      case "start":
        runProgram();
        break;

      case "gcc":
      case "compile":
      case "make":
        appendLine("system", `Compilazione di ${activeFileName} con ${compiler}...`);
        runProgram();
        break;

      case "clear":
      case "cls":
        setLines([]);
        break;

      case "compiler":
      case "compilatore":
        if (args.length > 0) {
          const match = (COMPILERS_BY_LANG[langId] || []).find(
            (c) => c.id.toLowerCase().includes(args[0].toLowerCase()) || c.short.toLowerCase().includes(args[0].toLowerCase())
          );
          if (match) {
            handleCompilerChange(match.id);
          } else {
            appendLine("error", `Compilatore '${args[0]}' non trovato. Compilatori disponibili:`);
            (COMPILERS_BY_LANG[langId] || []).forEach((c) => appendLine("output", `  • ${c.id} (${c.label})`));
          }
        } else {
          appendLine("info", `Compilatore attuale: ${compiler}`);
          appendLine("output", "Compilatori disponibili per " + langId.toUpperCase() + ":");
          (COMPILERS_BY_LANG[langId] || []).forEach((c) =>
            appendLine("output", `  ${c.id === compiler ? "▶" : " "} ${c.id.padEnd(16)} · ${c.label}`)
          );
        }
        break;

      case "std":
        if (args.length > 0) {
          const val = args[0].startsWith("-std=") ? args[0] : `-std=${args[0]}`;
          handleStandardChange(val);
        } else {
          appendLine("info", `Standard attuale: ${standard}`);
        }
        break;

      case "flags":
        if (args.length > 0) {
          const f = args.join(" ");
          setExtraFlags(f);
          setCompilerOptions(langId, `${standard}\n${f}`);
          appendLine("info", `Flag impostati: ${f}`);
        } else {
          appendLine("info", `Flag attuali: ${extraFlags || "(nessuno)"}`);
        }
        break;

      case "code":
      case "cat":
        appendLine("info", `─── ${activeFileName} (${activeCode.split("\n").length} righe) ───`);
        activeCode.split("\n").forEach((line, idx) => {
          appendLine("output", `${String(idx + 1).padStart(3, " ")} | ${line}`);
        });
        break;

      case "files":
      case "ls":
      case "dir":
        try {
          const tabs = JSON.parse(localStorage.getItem(TABS_KEY)) || [];
          appendLine("info", `File aperti in WorkingCode (${tabs.length}):`);
          tabs.forEach((t) =>
            appendLine(
              "output",
              `  ${t.name === activeFileName ? "▶" : " "} ${t.name.padEnd(20)} [${(t.langId || "c").toUpperCase()}] ${t.code ? t.code.length + " bytes" : ""}`
            )
          );
        } catch {
          appendLine("output", `  • ${activeFileName}`);
        }
        break;

      case "edit":
      case "editor":
        if (onSwitchToEditor) onSwitchToEditor();
        else setQuickCodeOpen(true);
        break;

      case "whoami":
        try {
          const u = JSON.parse(localStorage.getItem("wfy_user")) || {};
          appendLine("output", `Utente: ${u.nome || "Ospite"} ${u.cognome || ""}`);
          appendLine("output", `Email:  ${u.email || "locale@workfy.station"}`);
          appendLine("output", `Piano:  Workfy PLUS (Attivo)`);
        } catch {
          appendLine("output", "Utente: Marky (Workfy PLUS)");
        }
        break;

      case "sysinfo":
        appendLine("info", "════════════ INFORMAZIONI SISTEMA ════════════");
        appendLine("output", `Piattaforma:  App Desktop Tauri / Web SPA`);
        appendLine("output", `Ambiente:     WorkfyStation v1.0.0`);
        appendLine("output", `Linguaggio:   ${langId.toUpperCase()}`);
        appendLine("output", `Compilatore:  ${compiler}`);
        appendLine("output", `Standard:     ${standard}`);
        appendLine("output", `Flag:         ${extraFlags}`);
        appendLine("info", "═════════════════════════════════════════════");
        break;

      case "echo":
        appendLine("output", args.join(" "));
        break;

      case "date":
      case "time":
        appendLine("output", new Date().toLocaleString("it-IT"));
        break;

      default:
        appendLine("error", `Comando non riconosciuto: '${cmd}'. Digita 'help' per la lista dei comandi.`);
        break;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = cmdInput;
      setCmdInput("");

      if (mode === "input") {
        handleProgramInput(val);
      } else if (mode === "cli") {
        handleCliCommand(val);
      }
    } else if (mode === "cli") {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (history.length === 0) return;
        const nextIdx = histIndex === -1 ? history.length - 1 : Math.max(0, histIndex - 1);
        setHistIndex(nextIdx);
        setCmdInput(history[nextIdx] || "");
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (histIndex === -1) return;
        const nextIdx = histIndex + 1;
        if (nextIdx >= history.length) {
          setHistIndex(-1);
          setCmdInput("");
        } else {
          setHistIndex(nextIdx);
          setCmdInput(history[nextIdx]);
        }
      }
    }
  };

  // Color generator for terminal lines
  const getLineColor = (type) => {
    switch (type) {
      case "banner":
        return "#ff2d55";
      case "cmd":
        return "#ffffff";
      case "userinput":
        return "#60a5fa";
      case "output":
        return "#e2e8f0";
      case "system":
        return "rgba(255,45,85,0.7)";
      case "info":
        return "#38bdf8";
      case "warn":
        return "#fbbf24";
      case "error":
        return "#ef4444";
      case "status":
        return "#34d399";
      default:
        return "#94a3b8";
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: BG,
        color: "#f8fafc",
        fontFamily: "'Segoe UI', sans-serif",
        position: "relative",
      }}
    >
      <style>{`
        .wc-term-btn:hover { background: rgba(255,45,85,0.2) !important; border-color: ${ACCENT} !important; }
        .wc-term-btn:active { transform: scale(0.97); }
        @keyframes wc-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>

      {/* ── TOP CONTROLS & COMPILER SELECTION BAR ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 16px",
          background: BG2,
          borderBottom: `1px solid ${BORDER}`,
          flexWrap: "wrap",
          zIndex: 10,
        }}
      >
        {/* Terminal Title Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 6 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: mode === "busy" ? "#fbbf24" : mode === "input" ? "#60a5fa" : "#34d399",
              boxShadow: `0 0 10px ${mode === "busy" ? "#fbbf24" : mode === "input" ? "#60a5fa" : "#34d399"}`,
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.5, color: "#fff" }}>
            TERMINALE
          </span>
          <span
            style={{
              fontSize: 10,
              padding: "2px 7px",
              borderRadius: 5,
              background: "rgba(255,45,85,0.15)",
              color: ACCENT,
              fontWeight: 600,
            }}
          >
            C / C++ / Java
          </span>
        </div>

        <div style={{ width: 1, height: 20, background: BORDER }} />

        {/* Linguaggio */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Linguaggio:</span>
          <select
            value={langId}
            onChange={(e) => {
              const newLang = e.target.value;
              setLangId(newLang);
              const comp = getPreferredCompiler(newLang);
              setCompiler(comp);
              appendLine("info", `Linguaggio impostato su ${newLang.toUpperCase()} (${comp})`);
            }}
            style={{
              padding: "4px 8px",
              borderRadius: 6,
              border: `1px solid ${BORDER}`,
              background: BG3,
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="c">C</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
          </select>
        </div>

        {/* COMPILATORE ATTIVO (Rispettato al 100%) */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Compilatore:</span>
          <select
            value={compiler}
            onChange={(e) => handleCompilerChange(e.target.value)}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: `1px solid ${ACCENT}77`,
              background: BG3,
              color: ACCENT,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              outline: "none",
            }}
          >
            {(COMPILERS_BY_LANG[langId] || []).map((c) => (
              <option key={c.id} value={c.id} style={{ background: "#110006", color: "#fff" }}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Standard C (solo se C) */}
        {langId === "c" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Standard:</span>
            <select
              value={standard}
              onChange={(e) => handleStandardChange(e.target.value)}
              style={{
                padding: "4px 8px",
                borderRadius: 6,
                border: `1px solid ${BORDER}`,
                background: BG3,
                color: "#e2e8f0",
                fontSize: 12,
                cursor: "pointer",
                outline: "none",
              }}
            >
              {C_STANDARDS.map((s) => (
                <option key={s.id} value={s.id} style={{ background: "#110006", color: "#fff" }}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Warning Flags */}
        {langId === "c" && (
          <div style={{ display: "flex", gap: 4 }}>
            {WARNING_FLAGS.map((f) => {
              const active = extraFlags.includes(f.id);
              return (
                <button
                  key={f.id}
                  onClick={() => toggleFlag(f.id)}
                  title={f.label}
                  className="wc-term-btn"
                  style={{
                    padding: "3px 8px",
                    borderRadius: 5,
                    border: `1px solid ${active ? ACCENT : BORDER}`,
                    background: active ? "rgba(255,45,85,0.2)" : "transparent",
                    color: active ? ACCENT : "rgba(255,255,255,0.4)",
                    fontSize: 11,
                    cursor: "pointer",
                    transition: "all .15s",
                  }}
                >
                  {f.id}
                </button>
              );
            })}
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* Bottoni Azione */}
        <button
          onClick={() => runProgram()}
          disabled={mode === "busy"}
          className="wc-term-btn"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 14px",
            borderRadius: 7,
            border: "none",
            background: mode === "busy" ? "#330009" : `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            cursor: mode === "busy" ? "not-allowed" : "pointer",
            boxShadow: mode === "busy" ? "none" : `0 0 12px ${ACCENT}55`,
          }}
        >
          {mode === "busy" ? "⏳ Esecuzione..." : `▶ Esegui ${activeFileName}`}
        </button>

        <button
          onClick={() => setQuickCodeOpen((v) => !v)}
          className="wc-term-btn"
          style={{
            padding: "5px 10px",
            borderRadius: 6,
            border: `1px solid ${BORDER}`,
            background: quickCodeOpen ? "rgba(255,45,85,0.2)" : BG3,
            color: "#fff",
            fontSize: 12,
            cursor: "pointer",
          }}
          title="Mostra / modifica codice sorgente"
        >
          📝 Codice
        </button>

        <button
          onClick={() => setLines([])}
          className="wc-term-btn"
          style={{
            padding: "5px 10px",
            borderRadius: 6,
            border: `1px solid ${BORDER}`,
            background: BG3,
            color: "rgba(255,255,255,0.6)",
            fontSize: 12,
            cursor: "pointer",
          }}
          title="Pulisci schermo terminale"
        >
          🗑 Pulisci
        </button>
      </div>

      {/* ── SPLIT VIEW: SE QUICK CODE OPEN ── */}
      {quickCodeOpen && (
        <div
          style={{
            padding: "10px 16px",
            background: BG2,
            borderBottom: `1px solid ${BORDER}`,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: ACCENT, fontWeight: 600 }}>
              Sorgente C attivo: {activeFileName}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              {onSwitchToEditor && (
                <button
                  onClick={onSwitchToEditor}
                  style={{
                    padding: "3px 10px",
                    borderRadius: 5,
                    border: `1px solid ${BORDER}`,
                    background: "transparent",
                    color: "#38bdf8",
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  Apri nell'Editor Completo ↗
                </button>
              )}
              <button
                onClick={() => setQuickCodeOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(255,255,255,0.4)",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                ✕
              </button>
            </div>
          </div>
          <textarea
            value={activeCode}
            onChange={(e) => setActiveCode(e.target.value)}
            spellCheck={false}
            style={{
              width: "100%",
              height: 140,
              background: "#040001",
              border: `1px solid ${BORDER}`,
              borderRadius: 6,
              color: "#f8fafc",
              fontFamily: "'Consolas','Courier New',monospace",
              fontSize: 13,
              lineHeight: 1.5,
              padding: "8px 12px",
              resize: "vertical",
              outline: "none",
              caretColor: ACCENT,
            }}
          />
        </div>
      )}

      {/* ── TERMINAL DISPLAY AREA ── */}
      <div
        ref={termRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 20px",
          fontFamily: "'Consolas', 'Cascadia Code', 'Fira Code', 'Courier New', monospace",
          fontSize: 13.5,
          lineHeight: 1.65,
          background: BG,
        }}
      >
        {lines.map((l, i) => (
          <div
            key={i}
            style={{
              color: getLineColor(l.type),
              minHeight: l.type === "blank" ? 8 : "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {l.type === "userinput" ? (
              <>
                <span style={{ color: "#34d399", fontWeight: 700 }}>&gt; </span>
                <span style={{ color: "#60a5fa", fontWeight: 600 }}>{l.text}</span>
              </>
            ) : (
              l.text
            )}
          </div>
        ))}

        {mode === "busy" && (
          <div style={{ color: "#fbbf24", marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ animation: "wc-pulse 1s infinite" }}>● Compilazione ed esecuzione in corso...</span>
          </div>
        )}
      </div>

      {/* ── INTERACTIVE INPUT BAR ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 16px",
          borderTop: `1px solid ${mode === "input" ? "#60a5fa" : BORDER}`,
          background: mode === "input" ? "rgba(10,25,50,0.85)" : BG2,
          transition: "all .2s ease",
        }}
      >
        <span
          style={{
            color: mode === "input" ? "#60a5fa" : ACCENT,
            fontFamily: "'Consolas', monospace",
            fontWeight: 800,
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {mode === "input" ? (
            <>
              <span style={{ animation: "wc-pulse 1s infinite" }}>▶</span> INPUT:
            </>
          ) : (
            "$"
          )}
        </span>

        <input
          ref={inputRef}
          value={cmdInput}
          onChange={(e) => setCmdInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={mode === "busy"}
          placeholder={
            mode === "input"
              ? "Il programma richiede un input (es. per scanf): digita e premi Invio..."
              : mode === "busy"
              ? "Attendere..."
              : "Scrivi un comando (es. run, help, gcc, code, compiler) e premi Invio..."
          }
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: mode === "input" ? "#60a5fa" : "#f8fafc",
            fontFamily: "'Consolas', monospace",
            fontSize: 14,
            caretColor: mode === "input" ? "#60a5fa" : ACCENT,
          }}
        />

        {mode === "input" && (
          <span
            style={{
              fontSize: 11,
              color: "#60a5fa",
              padding: "2px 8px",
              borderRadius: 4,
              background: "rgba(96,165,250,0.15)",
              fontWeight: 600,
            }}
          >
            SCANF ATTIVA
          </span>
        )}

        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
          {mode === "input" ? "Premi Invio per inviare" : "Invio = Esegui · ↑/↓ = Cronologia"}
        </span>
      </div>
    </div>
  );
}
