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
import {
  isTauriApp,
  runPowerShellNative,
  getDesktopInfoNative,
  compileAndRunCLocalNative,
  triggerAppUpdateNative,
} from "./tauriBridge";

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
  // Mode: "powershell" (vero terminale Windows) | "compiler" (compilatore C dedicato)
  const [activeTabMode, setActiveTabMode] = useState("powershell");
  const [isDesktop, setIsDesktop] = useState(false);
  const [desktopInfo, setDesktopInfo] = useState(null);
  const [currentCwd, setCurrentCwd] = useState("C:\\Users");

  // Compiler state (per modalità C)
  const [langId, setLangId] = useState("c");
  const [compiler, setCompiler] = useState(() => getPreferredCompiler("c"));
  const [standard, setStandard] = useState("-std=c17");
  const [extraFlags, setExtraFlags] = useState("-Wall");
  const [activeFileName, setActiveFileName] = useState("main.c");
  const [activeCode, setActiveCode] = useState(DEFAULT_C_CODE);

  // Terminal output lines
  const [psLines, setPsLines] = useState([
    { type: "sys", text: "Windows PowerShell" },
    { type: "sys", text: "Copyright (C) Microsoft Corporation. Tutti i diritti riservati." },
    { type: "blank", text: "" },
    { type: "info", text: "⚡ Terminale Nativo WorkfyStation integrato con PowerShell reale." },
    { type: "info", text: "💡 Digita qualsiasi comando PowerShell (dir, gcc, python, git...) o premi i tasti rapidi in alto." },
    { type: "blank", text: "" },
  ]);

  const [cLines, setCLines] = useState([
    { type: "banner", text: "╔════════════════════════════════════════════════════════════════════════╗" },
    { type: "banner", text: "║   🖥️  WORKINGCODE TERMINAL C/C++ · COMPILATORE RISPETTATO AL 100%       ║" },
    { type: "banner", text: "║   Compilatore attivo: GCC C (C17 / C23) con input interattivo           ║" },
    { type: "banner", text: "╚════════════════════════════════════════════════════════════════════════╝" },
    { type: "blank", text: "" },
  ]);

  const [inputVal, setInputVal] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [cInputMode, setCInputMode] = useState(false); // se il programma C richiede scanf
  const [history, setHistory] = useState([]);
  const [histIndex, setHistIndex] = useState(-1);
  const [quickCodeOpen, setQuickCodeOpen] = useState(false);
  const [updateMsg, setUpdateMsg] = useState("");

  // Stato per esecuzione interattiva C (scanf)
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

  // Verifica se siamo nell'app desktop reale
  useEffect(() => {
    isTauriApp().then((ok) => {
      setIsDesktop(ok);
      if (ok) {
        getDesktopInfoNative().then((info) => {
          setDesktopInfo(info);
          if (info?.cwd) setCurrentCwd(info.cwd);
        });
      }
    });
  }, []);

  // Auto-scroll terminal
  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [psLines, cLines, activeTabMode]);

  // Focus input
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [activeTabMode, cInputMode, isBusy]);

  // Carica il codice dal localStorage dell'editor
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

  const appendPs = useCallback((type, text) => {
    setPsLines((p) => [...p, { type, text }]);
  }, []);

  const appendC = useCallback((type, text) => {
    setCLines((p) => [...p, { type, text }]);
  }, []);

  // ═════════════════════════════════════════════════════
  // 1. ESECUZIONE POWERSHELL REALE (Windows Desktop)
  // ═════════════════════════════════════════════════════
  const executePowerShellCommand = async (commandStr) => {
    const trimmed = commandStr.trim();
    if (!trimmed) return;

    appendPs("prompt", `PS ${currentCwd}> ${trimmed}`);
    setHistory((h) => [...h, trimmed]);
    setHistIndex(-1);
    setIsBusy(true);

    if (trimmed.toLowerCase() === "cls" || trimmed.toLowerCase() === "clear") {
      setPsLines([]);
      setIsBusy(false);
      return;
    }

    try {
      if (!isDesktop) {
        // Avviso se utente è su browser web
        appendPs(
          "warn",
          "⚠️ Sei sul browser web. Il terminale PowerShell reale richiede l'applicazione desktop Windows di WorkfyStation."
        );
        appendPs(
          "info",
          "💡 Clicca su 'Scarica per PC (.exe)' per installare l'app nativa e usare la vera console Windows!"
        );
        setIsBusy(false);
        return;
      }

      // Esecuzione reale tramite Tauri Rust
      const res = await runPowerShellNative(trimmed, currentCwd);

      if (res.cwd) setCurrentCwd(res.cwd);

      if (res.stdout && res.stdout.trim()) {
        res.stdout.split("\n").forEach((line) => {
          appendPs("output", line.replace(/\r/g, ""));
        });
      }

      if (res.stderr && res.stderr.trim()) {
        res.stderr.split("\n").forEach((line) => {
          appendPs("error", line.replace(/\r/g, ""));
        });
      }

      if (!res.stdout.trim() && !res.stderr.trim()) {
        // Alcuni comandi non hanno output
      }
    } catch (err) {
      appendPs("error", `Errore: ${err.message || err}`);
    } finally {
      setIsBusy(false);
    }
  };

  // ═════════════════════════════════════════════════════
  // 2. COMPILAZIONE ED ESECUZIONE C (Rispettando il compilatore)
  // ═════════════════════════════════════════════════════
  const runCProgram = useCallback(
    async (codeToRun = activeCode, forcedCompiler = compiler) => {
      const fullOptions = `${standard}\n${extraFlags}`.trim();
      const needsInput = codeNeedsInput(codeToRun, langId);
      const processedCode = needsInput ? makeInteractive(codeToRun, langId) : codeToRun;

      appendC("cmd", `[COMPILAZIONE & RUN] ${activeFileName} · Compilatore: ${forcedCompiler}`);
      if (fullOptions) appendC("sys", `⚙️ Opzioni: ${fullOptions.replace(/\n/g, " ")}`);

      const t0 = Date.now();
      setIsBusy(true);

      // Prova prima la compilazione locale se in desktop app e c'è gcc
      if (isDesktop && desktopInfo?.gcc_available && forcedCompiler.startsWith("gcc")) {
        appendC("sys", "🖥️ Esecuzione con GCC locale del PC...");
        try {
          const res = await compileAndRunCLocalNative(
            processedCode,
            "gcc",
            `${standard} ${extraFlags}`.trim()
          );
          const elapsed = ((Date.now() - t0) / 1000).toFixed(2);

          if (!res.success && res.stderr) {
            appendC("error", "❌ Errore compilazione locale:");
            res.stderr.split("\n").forEach((l) => appendC("error", l));
          } else {
            if (res.stdout) res.stdout.split("\n").forEach((l) => appendC("output", l));
            if (res.stderr) res.stderr.split("\n").forEach((l) => appendC("warn", l));
            appendC("status", `✅ Completato in ${elapsed}s con codice ${res.exit_code}`);
          }
          setIsBusy(false);
          return;
        } catch {}
      }

      // Altrimenti: esecuzione con Wandbox rispettando esattamente la versione richiesta
      if (!needsInput) {
        try {
          const d = await wandboxRun(forcedCompiler, processedCode, "", fullOptions);
          const elapsed = ((Date.now() - t0) / 1000).toFixed(2);

          if (d.compiler_error && !d.program_output) {
            appendC("error", "❌ ERRORE DI COMPILAZIONE:");
            d.compiler_error.split("\n").forEach((l) => appendC("error", l));
          } else {
            if (d.compiler_message) {
              appendC("warn", "⚠️ Note del compilatore:");
              d.compiler_message.split("\n").forEach((l) => appendC("warn", l));
            }
            if (d.program_output) {
              d.program_output.split("\n").forEach((l) => appendC("output", l));
            } else {
              appendC("output", "(Nessun output a video)");
            }
            if (d.program_error) {
              d.program_error.split("\n").forEach((l) => appendC("warn", l));
            }
            appendC(
              "status",
              `${(d.status || "0") === "0" ? "✅" : "❌"} Terminato con codice ${d.status || "0"} in ${elapsed}s`
            );
          }
        } catch (err) {
          appendC("error", "❌ Errore: " + err.message);
        }
        setIsBusy(false);
        return;
      }

      // Con input interattivo (scanf)
      appendC("sys", "⚙️ Compilazione in corso...");
      try {
        const d = await wandboxRun(forcedCompiler, processedCode, "", fullOptions);
        if (d.compiler_error && !d.program_output) {
          appendC("error", "❌ ERRORE DI COMPILAZIONE:");
          d.compiler_error.split("\n").forEach((l) => appendC("error", l));
          setIsBusy(false);
          return;
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
            appendC("output", outLines[i]);
          }
        } else {
          appendC("info", "Il programma richiede un input (scanf). Digita il valore e premi Invio:");
        }
        setCInputMode(true);
      } catch (err) {
        appendC("error", "❌ Errore: " + err.message);
      }
      setIsBusy(false);
    },
    [activeCode, activeFileName, compiler, desktopInfo, extraFlags, isDesktop, langId, standard, appendC]
  );

  // Invia input scanf durante l'esecuzione del programma C
  const handleCProgramInput = async (val) => {
    appendC("userinput", val);
    setIsBusy(true);

    const newInputs = [...execState.inputs, val];
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
          if (i < outLines.length) appendC("output", outLines[i]);
        }
        setExecState((prev) => ({
          ...prev,
          inputs: newInputs,
          step: nextStep,
        }));
      } else {
        const start = prompts.length > 0 ? prompts[prompts.length - 1] + 1 : 0;
        for (let i = start; i < outLines.length; i++) {
          if (outLines[i] !== undefined && outLines[i] !== "") {
            appendC("output", outLines[i]);
          }
        }
        if (d.program_error) {
          d.program_error.split("\n").forEach((l) => appendC("warn", l));
        }
        const elapsed = ((Date.now() - execState.startTime) / 1000).toFixed(2);
        appendC(
          "status",
          `${(d.status || "0") === "0" ? "✅" : "❌"} Terminato con codice ${d.status || "0"} in ${elapsed}s`
        );
        setCInputMode(false);
      }
    } catch (err) {
      appendC("error", "❌ Errore input: " + err.message);
      setCInputMode(false);
    }
    setIsBusy(false);
  };

  // Gestione tasto Invio e Frecce
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = inputVal;
      setInputVal("");

      if (activeTabMode === "powershell") {
        executePowerShellCommand(val);
      } else if (activeTabMode === "compiler") {
        if (cInputMode) {
          handleCProgramInput(val);
        } else {
          // In modalità C se non c'è scanf, esegue comando run / help
          if (val.trim() === "run" || val.trim() === "esegui") runCProgram();
          else if (val.trim() === "cls" || val.trim() === "clear") setCLines([]);
          else if (val.trim() === "help") {
            appendC("info", "Comandi disponibili: run (esegui codice), cls (pulisci schermo), help");
          } else {
            runCProgram();
          }
        }
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIdx = histIndex === -1 ? history.length - 1 : Math.max(0, histIndex - 1);
      setHistIndex(nextIdx);
      setInputVal(history[nextIdx] || "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIndex === -1) return;
      const nextIdx = histIndex + 1;
      if (nextIdx >= history.length) {
        setHistIndex(-1);
        setInputVal("");
      } else {
        setHistIndex(nextIdx);
        setInputVal(history[nextIdx]);
      }
    }
  };

  // Funzione per aggiornare l'applicazione con 1 click
  const handleUpdateApp = async () => {
    setUpdateMsg("Avvio aggiornamento in corso...");
    try {
      const res = await triggerAppUpdateNative();
      setUpdateMsg("✅ " + res);
      setTimeout(() => setUpdateMsg(""), 6000);
    } catch (err) {
      setUpdateMsg("❌ " + (err.message || err));
      setTimeout(() => setUpdateMsg(""), 6000);
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
      }}
    >
      <style>{`
        .wc-tbtn:hover { background: rgba(255,45,85,0.2) !important; border-color: ${ACCENT} !important; }
        .wc-tbtn:active { transform: scale(0.97); }
        .ps-tag:hover { background: rgba(56,189,248,0.2) !important; border-color: #38bdf8 !important; }
      `}</style>

      {/* ── HEADER SUPERIORE: SELEZIONE POWERSHELL VS COMPILATORE C ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 16px",
          background: BG2,
          borderBottom: `1px solid ${BORDER}`,
          flexWrap: "wrap",
        }}
      >
        {/* TABS PRINCIPALI: POWERSHELL REALE VS COMPILATORE C */}
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => setActiveTabMode("powershell")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 8,
              border: `1.5px solid ${activeTabMode === "powershell" ? "#38bdf8" : BORDER}`,
              background: activeTabMode === "powershell" ? "rgba(56,189,248,0.15)" : "transparent",
              color: activeTabMode === "powershell" ? "#38bdf8" : "rgba(255,255,255,0.6)",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all .2s",
            }}
          >
            ⚡ PowerShell Windows (Reale)
            {isDesktop ? (
              <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#059669", color: "#fff" }}>
                PC NATTVO
              </span>
            ) : (
              <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "rgba(255,255,255,0.1)", color: "#94a3b8" }}>
                WEB
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTabMode("compiler")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 8,
              border: `1.5px solid ${activeTabMode === "compiler" ? ACCENT : BORDER}`,
              background: activeTabMode === "compiler" ? "rgba(255,45,85,0.15)" : "transparent",
              color: activeTabMode === "compiler" ? ACCENT : "rgba(255,255,255,0.6)",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all .2s",
            }}
          >
            🔨 Compilatore C (Wandbox / GCC)
          </button>
        </div>

        <div style={{ width: 1, height: 20, background: BORDER }} />

        {/* CONTROLLI SPECIFICI PER MODALITÀ C */}
        {activeTabMode === "compiler" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Compilatore:</span>
              <select
                value={compiler}
                onChange={(e) => {
                  setCompiler(e.target.value);
                  setPreferredCompiler(langId, e.target.value);
                }}
                style={{
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: `1px solid ${ACCENT}77`,
                  background: BG3,
                  color: ACCENT,
                  fontSize: 11,
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

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Standard:</span>
              <select
                value={standard}
                onChange={(e) => {
                  setStandard(e.target.value);
                  setCompilerOptions(langId, `${e.target.value}\n${extraFlags}`);
                }}
                style={{
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: `1px solid ${BORDER}`,
                  background: BG3,
                  color: "#e2e8f0",
                  fontSize: 11,
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

            <button
              onClick={() => runCProgram()}
              disabled={isBusy}
              className="wc-tbtn"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                borderRadius: 7,
                border: "none",
                background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ▶ Esegui C
            </button>
          </>
        )}

        {/* COMANDI RAPIDI PER POWERSHELL */}
        {activeTabMode === "powershell" && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {[
              { label: "📁 dir", cmd: "dir" },
              { label: "🔧 gcc --version", cmd: "gcc --version" },
              { label: "🐍 python --version", cmd: "python --version" },
              { label: "👤 whoami", cmd: "whoami" },
              { label: "🗑 cls", cmd: "cls" },
            ].map((b, i) => (
              <button
                key={i}
                onClick={() => executePowerShellCommand(b.cmd)}
                className="ps-tag"
                style={{
                  padding: "3px 8px",
                  borderRadius: 6,
                  border: `1px solid ${BORDER}`,
                  background: "rgba(255,255,255,0.04)",
                  color: "#e2e8f0",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                {b.label}
              </button>
            ))}
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* PULSANTE AGGIORNAMENTO APPLICAZIONE */}
        <button
          onClick={handleUpdateApp}
          title="Controlla e installa l'aggiornamento più recente"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 12px",
            borderRadius: 7,
            border: "1px solid rgba(52,211,153,0.3)",
            background: "rgba(52,211,153,0.1)",
            color: "#34d399",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          🔄 Aggiorna App
        </button>

        {updateMsg && (
          <span style={{ fontSize: 11, color: "#34d399", fontWeight: 600 }}>{updateMsg}</span>
        )}
      </div>

      {/* ── SEGNALAZIONE SE SU BROWSER WEB ── */}
      {activeTabMode === "powershell" && !isDesktop && (
        <div
          style={{
            padding: "10px 16px",
            background: "rgba(245,158,11,0.12)",
            borderBottom: "1px solid rgba(245,158,11,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 12,
            color: "#fbbf24",
          }}
        >
          <div>
            <strong>⚠️ Sei sul browser web:</strong> I comandi di sistema PowerShell reali sono abilitati nell'applicazione installata su Windows per motivi di sicurezza.
          </div>
          <a
            href={`${import.meta.env.BASE_URL}WorkfyStation-Setup.exe`}
            download="WorkfyStation-Setup.exe"
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              background: "#fbbf24",
              color: "#000",
              fontWeight: 700,
              textDecoration: "none",
              fontSize: 11,
            }}
          >
            Scarica App per PC (.exe)
          </a>
        </div>
      )}

      {/* ── SCHERMATA DEL TERMINALE (Output) ── */}
      <div
        ref={termRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "14px 18px",
          fontFamily: "'Consolas', 'Cascadia Code', 'Fira Code', 'Courier New', monospace",
          fontSize: 13,
          lineHeight: 1.6,
          background: BG,
        }}
      >
        {activeTabMode === "powershell" ? (
          // Output PowerShell
          psLines.map((l, i) => (
            <div
              key={i}
              style={{
                color:
                  l.type === "prompt"
                    ? "#ffffff"
                    : l.type === "error"
                    ? "#ef4444"
                    : l.type === "warn"
                    ? "#fbbf24"
                    : l.type === "info"
                    ? "#38bdf8"
                    : l.type === "sys"
                    ? "rgba(255,255,255,0.7)"
                    : "#cbd5e1",
                minHeight: l.type === "blank" ? 8 : "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {l.type === "prompt" ? (
                <span style={{ color: "#38bdf8", fontWeight: 700 }}>{l.text}</span>
              ) : (
                l.text
              )}
            </div>
          ))
        ) : (
          // Output Compilatore C
          cLines.map((l, i) => (
            <div
              key={i}
              style={{
                color:
                  l.type === "banner"
                    ? ACCENT
                    : l.type === "cmd"
                    ? "#ffffff"
                    : l.type === "userinput"
                    ? "#60a5fa"
                    : l.type === "error"
                    ? "#ef4444"
                    : l.type === "warn"
                    ? "#fbbf24"
                    : l.type === "status"
                    ? "#34d399"
                    : l.type === "sys"
                    ? "rgba(255,45,85,0.7)"
                    : "#e2e8f0",
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
          ))
        )}

        {isBusy && (
          <div style={{ color: "#fbbf24", marginTop: 4 }}>
            <span style={{ animation: "wc-blink 1s infinite" }}>● Esecuzione in corso...</span>
          </div>
        )}
      </div>

      {/* ── RIGA DI INPUT (Command Line) ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 16px",
          borderTop: `1px solid ${cInputMode ? "#60a5fa" : BORDER}`,
          background: cInputMode ? "rgba(10,25,50,0.85)" : BG2,
        }}
      >
        <span
          style={{
            color: activeTabMode === "powershell" ? "#38bdf8" : cInputMode ? "#60a5fa" : ACCENT,
            fontFamily: "'Consolas', monospace",
            fontWeight: 800,
            fontSize: 13,
            whiteSpace: "nowrap",
          }}
        >
          {activeTabMode === "powershell" ? (
            `PS ${currentCwd}>`
          ) : cInputMode ? (
            "SCANF INPUT ▶"
          ) : (
            "C:>"
          )}
        </span>

        <input
          ref={inputRef}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isBusy}
          placeholder={
            activeTabMode === "powershell"
              ? "Scrivi un comando PowerShell (es. dir, ipconfig, gcc main.c) e premi Invio..."
              : cInputMode
              ? "Inserisci il valore richiesto da scanf e premi Invio..."
              : "Digita 'run' per eseguire o scrivi un comando..."
          }
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: cInputMode ? "#60a5fa" : "#f8fafc",
            fontFamily: "'Consolas', monospace",
            fontSize: 13,
            caretColor: activeTabMode === "powershell" ? "#38bdf8" : ACCENT,
          }}
        />

        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
          Invio = Esegui · ↑/↓ = Cronologia
        </span>
      </div>
    </div>
  );
}
