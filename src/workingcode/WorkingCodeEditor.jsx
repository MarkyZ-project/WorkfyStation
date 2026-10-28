import { useState, useRef, useEffect, useCallback } from "react";
import CodeEditor from "./CodeEditor";
import FileExplorer from "./FileExplorer";
import TerminalPane from "./TerminalPane";
import OutputPane from "./OutputPane";
import ProblemsPane from "./ProblemsPane";
import SearchPane from "./SearchPane";
import CommandPalette from "./CommandPalette";
import QuickOpen from "./QuickOpen";
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
  isDesktopApp,
  toolchainInfo,
  wsRead,
  wsWrite,
  runStart,
  runStdin,
  runKill,
  onRunEvent,
  newId,
} from "./tauriBridge";
import { LANGUAGES, SNIPPETS } from "./snippets";
import { parseDiagnostics } from "./diagnostics";

const ACCENT = "#ff2d55";
const ACCENT2 = "#ff0020";
const BG = "#050002";
const BG_SIDEBAR = "#090004";
const BG_PANEL = "#030002";
const BORDER = "rgba(255,45,85,0.18)";

const TABS_KEY = "wc_editor_tabs_v2";
const ACTIVE_KEY = "wc_editor_active_v2";

function newDefaultTab(lang) {
  return {
    id: "tab_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    name: `main.${lang.ext}`,
    relPath: null,
    langId: lang.id,
    code: lang.template,
    saved: true,
    eol: "lf",
  };
}

// ── Find & Replace Bar ──
function FindBar({ code, onChange, onClose }) {
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const m = find ? (code.match(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length : 0;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        background: "#120006",
        borderBottom: `1px solid ${BORDER}`,
        flexShrink: 0,
        flexWrap: "wrap",
        fontSize: 12,
      }}
    >
      <span style={{ color: ACCENT, fontWeight: 700 }}>🔍</span>
      <input
        value={find}
        onChange={(e) => setFind(e.target.value)}
        placeholder="Cerca..."
        style={{
          padding: "4px 8px",
          borderRadius: 6,
          border: `1px solid ${BORDER}`,
          background: "#1c000a",
          color: "#fff",
          fontSize: 12,
          outline: "none",
          width: 140,
        }}
      />
      {find && (
        <span style={{ fontSize: 11, color: m > 0 ? ACCENT : "rgba(255,255,255,0.4)" }}>
          {m} trovati
        </span>
      )}
      <input
        value={replace}
        onChange={(e) => setReplace(e.target.value)}
        placeholder="Sostituisci con..."
        style={{
          padding: "4px 8px",
          borderRadius: 6,
          border: `1px solid ${BORDER}`,
          background: "#1c000a",
          color: "#fff",
          fontSize: 12,
          outline: "none",
          width: 140,
        }}
      />
      <button
        onClick={() => find && onChange(code.replace(find, replace))}
        style={{
          padding: "4px 8px",
          borderRadius: 6,
          border: `1px solid ${BORDER}`,
          background: "transparent",
          color: ACCENT,
          cursor: "pointer",
        }}
      >
        Sostituisci
      </button>
      <button
        onClick={() => find && onChange(code.replaceAll(find, replace))}
        style={{
          padding: "4px 8px",
          borderRadius: 6,
          border: `1px solid ${BORDER}`,
          background: "transparent",
          color: ACCENT,
          cursor: "pointer",
        }}
      >
        Tutti
      </button>
      <button
        onClick={onClose}
        style={{
          border: "none",
          background: "transparent",
          color: "rgba(255,255,255,0.4)",
          fontSize: 14,
          cursor: "pointer",
          marginLeft: "auto",
        }}
      >
        ✕
      </button>
    </div>
  );
}

// ── Compiler Options Modal ──
function CompilerOptionsModal({ isOpen, onClose, langId, currentOptions, onSaveOptions }) {
  const [opts, setOpts] = useState(currentOptions);
  useEffect(() => {
    setOpts(currentOptions);
  }, [currentOptions, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 460,
          maxWidth: "92vw",
          background: "#0d0005",
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          padding: 20,
          color: "#fff",
          boxShadow: `0 16px 48px rgba(0,0,0,0.8)`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: ACCENT }}>
            ⚙️ Opzioni Compilatore ({langId.toUpperCase()})
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 18 }}>
            ×
          </button>
        </div>

        {langId === "c" && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>Standard C:</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {C_STANDARDS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    const withoutStd = opts.split("\n").filter((l) => !l.startsWith("-std=")).join("\n");
                    setOpts(withoutStd ? withoutStd + "\n" + s.id : s.id);
                  }}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: `1px solid ${opts.includes(s.id) ? ACCENT : BORDER}`,
                    background: opts.includes(s.id) ? "rgba(255,45,85,0.2)" : "transparent",
                    color: opts.includes(s.id) ? "#fff" : "rgba(255,255,255,0.7)",
                    cursor: "pointer",
                    fontSize: 11,
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>Flag di Warning:</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {WARNING_FLAGS.map((w) => {
              const active = opts.includes(w.id);
              return (
                <button
                  key={w.id}
                  onClick={() => {
                    if (active) {
                      setOpts(opts.split("\n").filter((l) => l.trim() !== w.id).join("\n"));
                    } else {
                      setOpts(opts ? opts + "\n" + w.id : w.id);
                    }
                  }}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: `1px solid ${active ? ACCENT : BORDER}`,
                    background: active ? "rgba(255,45,85,0.2)" : "transparent",
                    color: active ? "#fff" : "rgba(255,255,255,0.7)",
                    cursor: "pointer",
                    fontSize: 11,
                  }}
                >
                  {w.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>
            Flag personalizzati (uno per riga, es. -O2, -lm):
          </div>
          <textarea
            value={opts}
            onChange={(e) => setOpts(e.target.value)}
            rows={4}
            style={{
              width: "100%",
              padding: 8,
              borderRadius: 8,
              border: `1px solid ${BORDER}`,
              background: "#160007",
              color: "#fff",
              fontFamily: "Consolas",
              fontSize: 12,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: "rgba(255,255,255,0.6)", cursor: "pointer" }}>
            Annulla
          </button>
          <button
            onClick={() => {
              onSaveOptions(opts);
              onClose();
            }}
            style={{
              padding: "6px 16px",
              borderRadius: 8,
              border: "none",
              background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Salva Opzioni
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
export default function WorkingCodeEditor() {
  const isDesktop = isDesktopApp();

  // Tabs state
  const [tabs, setTabs] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(TABS_KEY));
      if (saved && Array.isArray(saved) && saved.length > 0) return saved;
    } catch {}
    return [newDefaultTab(LANGUAGES[0])];
  });

  const [activeTabId, setActiveTabId] = useState(() => {
    try {
      return localStorage.getItem(ACTIVE_KEY) || tabs[0]?.id;
    } catch {
      return tabs[0]?.id;
    }
  });

  // Ensure active tab is valid
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const activeLang = LANGUAGES.find((l) => l.id === activeTab?.langId) || LANGUAGES[0];

  // Toolchain probe
  const [toolchain, setToolchain] = useState(null);
  useEffect(() => {
    if (isDesktop) {
      toolchainInfo()
        .then((info) => setToolchain(info))
        .catch(() => {});
    }
  }, [isDesktop]);

  // Compiler selection & options
  const [selectedCompiler, setSelectedCompiler] = useState(() => getPreferredCompiler(activeLang.id));
  const [compilerOptions, setLocalCompilerOptions] = useState(() => getCompilerOptions(activeLang.id));
  const [runLocation, setRunLocation] = useState(() => {
    return isDesktop ? "local" : "cloud";
  });

  useEffect(() => {
    setSelectedCompiler(getPreferredCompiler(activeLang.id));
    setLocalCompilerOptions(getCompilerOptions(activeLang.id));
  }, [activeLang.id]);

  // Persist tabs
  useEffect(() => {
    try {
      localStorage.setItem(TABS_KEY, JSON.stringify(tabs));
      if (activeTabId) localStorage.setItem(ACTIVE_KEY, activeTabId);
    } catch {}
  }, [tabs, activeTabId]);

  // UI layout state
  const [sidebarView, setSidebarView] = useState("explorer"); // "explorer" | "search" | "snippets" | null
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelTab, setPanelTab] = useState("output"); // "output" | "terminal" | "problems"
  const [panelHeight, setPanelHeight] = useState(240);
  const [draggingPanel, setDraggingPanel] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [showFind, setShowFind] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showQuickOpen, setShowQuickOpen] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [statusNotification, setStatusNotification] = useState("");

  const editorRef = useRef(null);

  // Execution & Diagnostics state
  const [running, setRunning] = useState(false);
  const [outputLines, setOutputLines] = useState([]);
  const [isWaitingInput, setIsWaitingInput] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [diagnostics, setDiagnostics] = useState([]);
  const activeRunIdRef = useRef(null);

  // Re-size panel drag listener
  useEffect(() => {
    if (!draggingPanel) return;
    const onMove = (e) => {
      const h = Math.max(120, Math.min(window.innerHeight - e.clientY, 600));
      setPanelHeight(h);
    };
    const onUp = () => setDraggingPanel(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [draggingPanel]);

  // Listen to native run events on desktop
  useEffect(() => {
    if (!isDesktop) return;
    let unlisten = null;
    onRunEvent((ev) => {
      if (ev.id !== activeRunIdRef.current) return;
      if (ev.kind === "compile") {
        setOutputLines((prev) => [...prev, { type: "system", text: ev.data }]);
      } else if (ev.kind === "stdout") {
        setOutputLines((prev) => [...prev, { type: "stdout", text: ev.data }]);
        // If output line ends with : or ? it may be a prompt
        if (ev.data.trimEnd().endsWith(":") || ev.data.trimEnd().endsWith("?")) {
          setIsWaitingInput(true);
        }
      } else if (ev.kind === "stderr") {
        setOutputLines((prev) => [...prev, { type: "warn", text: ev.data }]);
      } else if (ev.kind === "error") {
        setOutputLines((prev) => [...prev, { type: "error", text: ev.data }]);
      } else if (ev.kind === "exit") {
        setRunning(false);
        setIsWaitingInput(false);
        const code = ev.code !== undefined ? ev.code : 0;
        const note = ev.data ? ` (${ev.data})` : "";
        setStatusMsg(`Terminato con codice ${code}${note}`);
        setOutputLines((prev) => [
          ...prev,
          { type: "status", text: `─── Esecuzione completata · Codice ${code}${note} ───` },
        ]);
      }
    }).then((un) => {
      unlisten = un;
    });

    return () => {
      unlisten?.();
    };
  }, [isDesktop]);

  // ── Tab Management ──
  const updateActiveCode = (newCode) => {
    setTabs((ts) =>
      ts.map((t) => (t.id === activeTab.id ? { ...t, code: newCode, saved: false } : t))
    );
  };

  const saveActiveTab = async () => {
    if (!activeTab) return;
    if (activeTab.relPath && isDesktop) {
      try {
        await wsWrite(activeTab.relPath, activeTab.code, activeTab.eol || "lf");
        setTabs((ts) =>
          ts.map((t) => (t.id === activeTab.id ? { ...t, saved: true } : t))
        );
        notify("💾 File salvato su disco");
      } catch (e) {
        alert("Errore salvataggio: " + (e.message || e));
      }
    } else {
      setTabs((ts) =>
        ts.map((t) => (t.id === activeTab.id ? { ...t, saved: true } : t))
      );
      notify("💾 Salvato in memoria");
    }
  };

  const handleOpenRelFile = async (rel) => {
    // Check if already open
    const existing = tabs.find((t) => t.relPath === rel);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }

    try {
      const res = await wsRead(rel);
      const ext = rel.split(".").pop().toLowerCase();
      let matchedLang = LANGUAGES.find((l) => l.ext === ext);
      if (!matchedLang) {
        if (ext === "h") matchedLang = LANGUAGES[0];
        else if (["hpp", "cc", "cxx"].includes(ext)) matchedLang = LANGUAGES[1];
        else matchedLang = LANGUAGES[0];
      }

      const newT = {
        id: "tab_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        name: rel.split(/[\\/]/).pop(),
        relPath: rel,
        langId: matchedLang.id,
        code: res.content,
        saved: true,
        eol: res.eol || "lf",
      };

      setTabs((ts) => [...ts, newT]);
      setActiveTabId(newT.id);
    } catch (e) {
      alert("Impossibile aprire il file: " + (e.message || e));
    }
  };

  const closeTab = (id) => {
    const next = tabs.filter((t) => t.id !== id);
    if (next.length === 0) {
      const fresh = newDefaultTab(LANGUAGES[0]);
      setTabs([fresh]);
      setActiveTabId(fresh.id);
    } else {
      setTabs(next);
      if (activeTabId === id) setActiveTabId(next[next.length - 1].id);
    }
  };

  const addNewTab = (langId) => {
    const l = LANGUAGES.find((x) => x.id === langId) || LANGUAGES[0];
    const t = newDefaultTab(l);
    setTabs((ts) => [...ts, t]);
    setActiveTabId(t.id);
  };

  const notify = (msg) => {
    setStatusNotification(msg);
    setTimeout(() => setStatusNotification(""), 2000);
  };

  // ── Execution Logic (Locale & Wandbox) ──
  const handleRun = async () => {
    if (running || !activeTab) return;

    setRunning(true);
    setIsWaitingInput(false);
    setOutputLines([]);
    setDiagnostics([]);
    setStatusMsg("Compilazione in corso...");
    setPanelOpen(true);
    setPanelTab("output");

    const code = activeTab.code;
    const langId = activeTab.langId;
    const flags = compilerOptions.split(/[\r\n]+/).map((s) => s.trim()).filter(Boolean);

    // Desktop Local Execution
    if (isDesktop && runLocation === "local") {
      const runId = newId();
      activeRunIdRef.current = runId;

      setOutputLines([
        {
          type: "system",
          text: `─── Avvio esecuzione locale [${langId.toUpperCase()} · ${selectedCompiler}] ───`,
        },
      ]);

      try {
        await runStart({
          id: runId,
          lang: langId,
          filename: activeTab.name,
          code,
          compiler: selectedCompiler,
          flags,
          mainClass: "Main",
        });
      } catch (e) {
        setOutputLines((prev) => [
          ...prev,
          { type: "error", text: "❌ Errore avvio processo: " + (e.message || e) },
        ]);
        setRunning(false);
        setStatusMsg("Errore di avvio");
      }
      return;
    }

    // Cloud / Wandbox Execution (or Fallback)
    setOutputLines([
      {
        type: "system",
        text: `─── Compilazione Cloud Wandbox [${selectedCompiler}] ───`,
      },
    ]);

    try {
      const t0 = Date.now();
      const processed = codeNeedsInput(code, langId) ? makeInteractive(code, langId) : code;
      const res = await wandboxRun(selectedCompiler, processed, "", compilerOptions);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(2);

      const allOutput = (res.compiler_error || "") + "\n" + (res.compiler_message || "");
      const diags = parseDiagnostics(allOutput);
      setDiagnostics(diags);

      if (res.compiler_error && !res.program_output) {
        res.compiler_error.split("\n").forEach((l) => setOutputLines((p) => [...p, { type: "error", text: l }]));
        setStatusMsg(`Errore di compilazione (${elapsed}s)`);
      } else {
        if (res.compiler_message) {
          res.compiler_message.split("\n").forEach((l) => setOutputLines((p) => [...p, { type: "warn", text: l }]));
        }
        if (res.program_output) {
          res.program_output.split("\n").forEach((l) => setOutputLines((p) => [...p, { type: "stdout", text: l }]));
        }
        if (res.program_error) {
          res.program_error.split("\n").forEach((l) => setOutputLines((p) => [...p, { type: "warn", text: l }]));
        }
        const ok = (res.status || "0") === "0";
        setStatusMsg(`Completato · Codice ${res.status || 0} (${elapsed}s)`);
        setOutputLines((p) => [
          ...p,
          {
            type: "status",
            text: `─── ${ok ? "✅" : "❌"} Codice ${res.status || "0"} · ${elapsed}s (Wandbox) ───`,
          },
        ]);
      }
    } catch (e) {
      setOutputLines((p) => [...p, { type: "error", text: "❌ " + (e.message || e) }]);
      setStatusMsg("Errore di rete");
    } finally {
      setRunning(false);
    }
  };

  const handleSendStdin = async (text) => {
    setOutputLines((prev) => [...prev, { type: "input", text }]);
    setIsWaitingInput(false);

    if (isDesktop && runLocation === "local" && activeRunIdRef.current) {
      try {
        await runStdin(activeRunIdRef.current, text + "\n");
      } catch (e) {
        setOutputLines((prev) => [...prev, { type: "error", text: "Errore stdin: " + e.message }]);
      }
    }
  };

  const handleKill = async () => {
    if (isDesktop && activeRunIdRef.current) {
      try {
        await runKill(activeRunIdRef.current);
        setOutputLines((p) => [...p, { type: "warn", text: "Processo interrotto dall'utente." }]);
      } catch {}
    }
    setRunning(false);
    setIsWaitingInput(false);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const onKey = (e) => {
      // Ctrl+S / Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveActiveTab();
      }
      // F5 or Ctrl+Enter -> Run
      if (e.key === "F5" || ((e.ctrlKey || e.metaKey) && e.key === "Enter")) {
        e.preventDefault();
        handleRun();
      }
      // Ctrl+P -> Quick Open
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setShowQuickOpen(true);
      }
      // Ctrl+Shift+P -> Command Palette
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      // Ctrl+B -> Toggle Sidebar
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setSidebarView((v) => (v ? null : "explorer"));
      }
      // Ctrl+J -> Toggle Bottom Panel
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setPanelOpen((p) => !p);
      }
      // Ctrl+F -> Find Bar
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setShowFind((f) => !f);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeTab, running, compilerOptions, selectedCompiler, runLocation]);

  // Jump to Diagnostic location
  const handleJumpToLocation = (loc) => {
    if (!loc) return;
    if (editorRef.current) {
      editorRef.current.gotoLine(loc.line, loc.col || 1);
    }
  };

  // Available commands for Command Palette
  const commands = [
    { category: "Esecuzione", title: "▶ Esegui Codice", shortcut: "F5", action: handleRun },
    { category: "Esecuzione", title: "⏹ Interrompi Processo", action: handleKill },
    { category: "File", title: "Salva File", shortcut: "Ctrl+S", action: saveActiveTab },
    { category: "File", title: "Cerca File (Quick Open)", shortcut: "Ctrl+P", action: () => setShowQuickOpen(true) },
    { category: "File", title: "Nuovo File C", action: () => addNewTab("c") },
    { category: "File", title: "Nuovo File C++", action: () => addNewTab("cpp") },
    { category: "File", title: "Nuovo File Java", action: () => addNewTab("java") },
    { category: "File", title: "Nuovo File Python", action: () => addNewTab("python") },
    { category: "Visualizza", title: "Mostra/Nascondi Barra Laterale", shortcut: "Ctrl+B", action: () => setSidebarView((v) => (v ? null : "explorer")) },
    { category: "Visualizza", title: "Mostra/Nascondi Pannello Inferiore", shortcut: "Ctrl+J", action: () => setPanelOpen((p) => !p) },
    { category: "Visualizza", title: "Apri Terminale PowerShell", action: () => { setPanelOpen(true); setPanelTab("terminal"); } },
    { category: "Visualizza", title: "Cerca nel file", shortcut: "Ctrl+F", action: () => setShowFind(true) },
    { category: "Visualizza", title: "Ingrandisci Carattere", action: () => setFontSize((s) => Math.min(24, s + 1)) },
    { category: "Visualizza", title: "Riduci Carattere", action: () => setFontSize((s) => Math.max(10, s - 1)) },
    { category: "Compilatore", title: "Imposta Opzioni Compilatore", action: () => setShowOptionsModal(true) },
    ...(SNIPPETS[activeTab.langId] || []).map((snip) => ({
      category: `Snippet (${activeTab.langId.toUpperCase()})`,
      title: snip.name,
      action: () => editorRef.current?.insertText(snip.text),
    })),
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: BG,
        color: "#f1f5f9",
        fontFamily: "'Segoe UI', sans-serif",
        overflow: "hidden",
      }}
    >
      <style>{`
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,45,85,0.25); border-radius: 3px; }
        .act-btn { transition: all 0.15s; }
        .act-btn:hover { background: rgba(255,45,85,0.12) !important; color: #fff !important; }
        .tab-item:hover { background: rgba(255,45,85,0.08) !important; }
      `}</style>

      {/* ── TOP TOOLBAR ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          background: "#080003",
          borderBottom: `1px solid ${BORDER}`,
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        {/* Run / Stop Button */}
        <button
          onClick={handleRun}
          disabled={running}
          title="Esegui (F5 / Ctrl+Enter)"
          style={{
            padding: "5px 14px",
            borderRadius: 7,
            border: "none",
            background: running
              ? "#1a0005"
              : `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
            color: "#fff",
            fontWeight: 700,
            fontSize: 12,
            cursor: running ? "not-allowed" : "pointer",
            boxShadow: running ? "none" : `0 0 12px ${ACCENT}55`,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {running ? "⏳ ..." : "▶ Esegui"}
        </button>

        {running && (
          <button
            onClick={handleKill}
            title="Ferma processo"
            style={{
              padding: "5px 10px",
              borderRadius: 7,
              border: "1px solid #ef4444",
              background: "rgba(239,68,68,0.15)",
              color: "#fca5a5",
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            ⏹ Ferma
          </button>
        )}

        <div style={{ width: 1, height: 20, background: BORDER, margin: "0 2px" }} />

        {/* Language Select */}
        <select
          value={activeTab.langId}
          onChange={(e) => {
            const chosen = LANGUAGES.find((x) => x.id === e.target.value);
            if (chosen) {
              setTabs((ts) =>
                ts.map((t) =>
                  t.id === activeTab.id
                    ? {
                        ...t,
                        langId: chosen.id,
                        name: t.relPath ? t.name : `main.${chosen.ext}`,
                      }
                    : t
                )
              );
            }
          }}
          style={{
            padding: "4px 8px",
            borderRadius: 6,
            border: `1px solid ${BORDER}`,
            background: "#140007",
            color: "#fff",
            fontSize: 12,
            outline: "none",
            cursor: "pointer",
          }}
        >
          {LANGUAGES.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>

        {/* Compiler Select */}
        <select
          value={selectedCompiler}
          onChange={(e) => {
            setSelectedCompiler(e.target.value);
            setPreferredCompiler(activeLang.id, e.target.value);
          }}
          style={{
            padding: "4px 8px",
            borderRadius: 6,
            border: `1px solid ${ACCENT}55`,
            background: "#140007",
            color: ACCENT,
            fontSize: 12,
            fontWeight: 600,
            outline: "none",
            cursor: "pointer",
          }}
        >
          {(COMPILERS_BY_LANG[activeTab.langId] || []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>

        {/* Local / Cloud Location Toggle */}
        {isDesktop && (
          <button
            onClick={() => setRunLocation((loc) => (loc === "local" ? "cloud" : "local"))}
            title={
              runLocation === "local"
                ? "Esecuzione su compilatore locale Windows"
                : "Esecuzione su Cloud Wandbox"
            }
            style={{
              padding: "4px 9px",
              borderRadius: 6,
              border: `1px solid ${runLocation === "local" ? "#34d399" : "#60a5fa"}`,
              background: runLocation === "local" ? "rgba(52,211,153,0.1)" : "rgba(96,165,250,0.1)",
              color: runLocation === "local" ? "#34d399" : "#60a5fa",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {runLocation === "local" ? "🖥️ Locale" : "☁️ Cloud"}
          </button>
        )}

        {/* Options Button */}
        <button
          onClick={() => setShowOptionsModal(true)}
          title="Opzioni compilatore (-Wall, -std, -O2...)"
          style={{
            padding: "4px 8px",
            borderRadius: 6,
            border: `1px solid ${BORDER}`,
            background: "transparent",
            color: "rgba(255,255,255,0.7)",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          ⚙️
        </button>

        <div style={{ width: 1, height: 20, background: BORDER, margin: "0 2px" }} />

        {/* File Actions */}
        <button
          onClick={saveActiveTab}
          title="Salva file (Ctrl+S)"
          style={{
            padding: "4px 8px",
            borderRadius: 6,
            border: `1px solid ${BORDER}`,
            background: "transparent",
            color: "#4ade80",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          💾
        </button>

        <button
          onClick={() => setShowFind((f) => !f)}
          title="Cerca nel codice (Ctrl+F)"
          style={{
            padding: "4px 8px",
            borderRadius: 6,
            border: `1px solid ${BORDER}`,
            background: "transparent",
            color: "#fbbf24",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          🔍
        </button>

        {/* Command Palette Button */}
        <button
          onClick={() => setShowCommandPalette(true)}
          title="Palette comandi (Ctrl+Shift+P)"
          style={{
            padding: "4px 10px",
            borderRadius: 6,
            border: `1px solid ${BORDER}`,
            background: "rgba(255,255,255,0.03)",
            color: "rgba(255,255,255,0.7)",
            fontSize: 11,
            cursor: "pointer",
            fontFamily: "Consolas",
          }}
        >
          &gt; Comandi (Ctrl+Shift+P)
        </button>

        <div style={{ flex: 1 }} />

        {/* Font size +/- */}
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <button
            onClick={() => setFontSize((s) => Math.max(10, s - 1))}
            style={{
              width: 22,
              height: 22,
              borderRadius: 4,
              border: `1px solid ${BORDER}`,
              background: "transparent",
              color: "rgba(255,255,255,0.5)",
              cursor: "pointer",
            }}
          >
            -
          </button>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", minWidth: 20, textAlign: "center" }}>
            {fontSize}
          </span>
          <button
            onClick={() => setFontSize((s) => Math.min(24, s + 1))}
            style={{
              width: 22,
              height: 22,
              borderRadius: 4,
              border: `1px solid ${BORDER}`,
              background: "transparent",
              color: "rgba(255,255,255,0.5)",
              cursor: "pointer",
            }}
          >
            +
          </button>
        </div>

        {statusNotification && (
          <span style={{ fontSize: 12, color: ACCENT, marginLeft: 8 }}>
            {statusNotification}
          </span>
        )}
      </div>

      {/* ── MAIN WORKSPACE BODY ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* ── Activity Bar (Leftmost VS Code icons) ── */}
        <div
          style={{
            width: 48,
            flexShrink: 0,
            background: "#080003",
            borderRight: `1px solid ${BORDER}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "8px 0",
            gap: 8,
          }}
        >
          <button
            className={`act-btn${sidebarView === "explorer" ? " active" : ""}`}
            onClick={() => setSidebarView((v) => (v === "explorer" ? null : "explorer"))}
            title="Esplora Risorse (Ctrl+B)"
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              border: "none",
              background: sidebarView === "explorer" ? "rgba(255,45,85,0.18)" : "transparent",
              color: sidebarView === "explorer" ? ACCENT : "rgba(255,255,255,0.45)",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            📁
          </button>

          <button
            className={`act-btn${sidebarView === "search" ? " active" : ""}`}
            onClick={() => setSidebarView((v) => (v === "search" ? null : "search"))}
            title="Cerca nei file"
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              border: "none",
              background: sidebarView === "search" ? "rgba(255,45,85,0.18)" : "transparent",
              color: sidebarView === "search" ? ACCENT : "rgba(255,255,255,0.45)",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            🔍
          </button>

          <button
            className={`act-btn${sidebarView === "snippets" ? " active" : ""}`}
            onClick={() => setSidebarView((v) => (v === "snippets" ? null : "snippets"))}
            title="Frammenti di codice (Snippets)"
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              border: "none",
              background: sidebarView === "snippets" ? "rgba(255,45,85,0.18)" : "transparent",
              color: sidebarView === "snippets" ? ACCENT : "rgba(255,255,255,0.45)",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            🧩
          </button>

          <div style={{ flex: 1 }} />

          <button
            onClick={() => setShowCommandPalette(true)}
            title="Comandi e scorciatoie (Ctrl+Shift+P)"
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              border: "none",
              background: "transparent",
              color: "rgba(255,255,255,0.45)",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ⚙️
          </button>
        </div>

        {/* ── Sidebar View (Explorer / Search / Snippets) ── */}
        {sidebarView && (
          <div style={{ width: 250, flexShrink: 0, height: "100%", overflow: "hidden" }}>
            {sidebarView === "explorer" && (
              <FileExplorer
                activeFileRel={activeTab?.relPath}
                onOpenFile={handleOpenRelFile}
                openTabs={tabs}
                onCloseTab={closeTab}
                onSelectTab={(id) => setActiveTabId(id)}
                activeTabId={activeTabId}
              />
            )}

            {sidebarView === "search" && (
              <SearchPane
                openTabs={tabs}
                onOpenFileAndLine={(match) => {
                  if (match.isTab) {
                    setActiveTabId(match.tabId);
                  } else {
                    handleOpenRelFile(match.file);
                  }
                  setTimeout(() => {
                    editorRef.current?.gotoLine(match.line, match.col);
                  }, 60);
                }}
              />
            )}

            {sidebarView === "snippets" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                  background: BG_SIDEBAR,
                  borderRight: `1px solid ${BORDER}`,
                  padding: "10px 12px",
                  fontSize: 12,
                }}
              >
                <div style={{ fontWeight: 700, color: ACCENT, fontSize: 11, textTransform: "uppercase", marginBottom: 10 }}>
                  Snippets ({activeTab.langId.toUpperCase()})
                </div>
                <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                  {(SNIPPETS[activeTab.langId] || []).map((snip, i) => (
                    <div
                      key={i}
                      onClick={() => editorRef.current?.insertText(snip.text)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 6,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,45,85,0.12)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                    >
                      <div style={{ fontWeight: 600, color: "#fff" }}>{snip.name}</div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "rgba(255,255,255,0.4)",
                          fontFamily: "Consolas",
                          marginTop: 3,
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {snip.text.replace(/\n/g, " ")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Center Editor Area + Bottom Panel ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          {/* ── Tab Bar ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "#0a0004",
              borderBottom: `1px solid ${BORDER}`,
              overflowX: "auto",
              flexShrink: 0,
            }}
          >
            {tabs.map((tab) => {
              const isSel = tab.id === activeTab.id;
              return (
                <div
                  key={tab.id}
                  className="tab-item"
                  onClick={() => setActiveTabId(tab.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 14px",
                    background: isSel ? BG : "transparent",
                    borderRight: `1px solid ${BORDER}`,
                    borderBottom: isSel ? `2px solid ${ACCENT}` : "2px solid transparent",
                    cursor: "pointer",
                    fontSize: 12,
                    color: isSel ? "#ffffff" : "rgba(255,255,255,0.45)",
                    flexShrink: 0,
                  }}
                >
                  <span>
                    {!tab.saved && <span style={{ color: ACCENT }}>● </span>}
                    {tab.name}
                  </span>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                    style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", padding: "0 2px" }}
                  >
                    ×
                  </span>
                </div>
              );
            })}

            {/* Quick add tab dropdown */}
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  addNewTab(e.target.value);
                  e.target.value = "";
                }
              }}
              style={{
                margin: "0 6px",
                padding: "3px 6px",
                background: "transparent",
                border: `1px solid ${BORDER}`,
                color: "rgba(255,255,255,0.5)",
                fontSize: 11,
                borderRadius: 5,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="">+ Nuovo File</option>
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* ── Find Bar ── */}
          {showFind && (
            <FindBar
              code={activeTab.code}
              onChange={updateActiveCode}
              onClose={() => setShowFind(false)}
            />
          )}

          {/* ── Code Editor ── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
            <CodeEditor
              ref={editorRef}
              code={activeTab.code}
              onChange={updateActiveCode}
              langId={activeTab.langId}
              fontSize={fontSize}
              diagnostics={diagnostics}
              onCursorChange={(pos) => setCursorPos(pos)}
            />
          </div>

          {/* ── Panel Splitter ── */}
          {panelOpen && (
            <div
              onMouseDown={() => setDraggingPanel(true)}
              style={{
                height: 5,
                flexShrink: 0,
                background: draggingPanel ? ACCENT : "#100007",
                borderTop: `1px solid ${BORDER}`,
                cursor: "row-resize",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ width: 40, height: 2, background: "rgba(255,45,85,0.4)", borderRadius: 1 }} />
            </div>
          )}

          {/* ── Bottom Panel (Output / Terminal / Problems) ── */}
          {panelOpen && (
            <div style={{ height: panelHeight, flexShrink: 0, display: "flex", flexDirection: "column", background: BG_PANEL }}>
              {/* Panel Tabs Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 8px",
                  background: "#080003",
                  borderBottom: `1px solid ${BORDER}`,
                  flexShrink: 0,
                }}
              >
                <button
                  onClick={() => setPanelTab("output")}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 5,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: panelTab === "output" ? 700 : 500,
                    background: panelTab === "output" ? "rgba(255,45,85,0.22)" : "transparent",
                    color: panelTab === "output" ? "#ffffff" : "rgba(255,255,255,0.5)",
                  }}
                >
                  ▶ Output
                </button>

                <button
                  onClick={() => setPanelTab("terminal")}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 5,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: panelTab === "terminal" ? 700 : 500,
                    background: panelTab === "terminal" ? "rgba(59,130,246,0.25)" : "transparent",
                    color: panelTab === "terminal" ? "#60a5fa" : "rgba(255,255,255,0.5)",
                  }}
                >
                  ⚡ Terminale {isDesktop ? "PowerShell" : "(Web)"}
                </button>

                <button
                  onClick={() => setPanelTab("problems")}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 5,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: panelTab === "problems" ? 700 : 500,
                    background: panelTab === "problems" ? "rgba(245,158,11,0.22)" : "transparent",
                    color: panelTab === "problems" ? "#fde047" : "rgba(255,255,255,0.5)",
                  }}
                >
                  ⚠️ Problemi ({diagnostics.length})
                </button>

                <div style={{ flex: 1 }} />

                <button
                  onClick={() => setPanelOpen(false)}
                  title="Chiudi pannello (Ctrl+J)"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "rgba(255,255,255,0.4)",
                    cursor: "pointer",
                    fontSize: 14,
                    padding: "2px 6px",
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Panel Content (Terminal is kept alive via display toggle) */}
              <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                {panelTab === "output" && (
                  <OutputPane
                    lines={outputLines}
                    running={running}
                    statusMsg={statusMsg}
                    isWaitingForInput={isWaitingInput}
                    onSendInput={handleSendStdin}
                    onKill={handleKill}
                    onClear={() => setOutputLines([])}
                    onJumpToLocation={handleJumpToLocation}
                  />
                )}

                <div style={{ display: panelTab === "terminal" ? "block" : "none", height: "100%" }}>
                  <TerminalPane />
                </div>

                {panelTab === "problems" && (
                  <ProblemsPane
                    diagnostics={diagnostics}
                    onJumpToDiagnostic={handleJumpToLocation}
                  />
                )}
              </div>
            </div>
          )}

          {/* ── Status Bar (Bottom) ── */}
          <div
            style={{
              height: 24,
              flexShrink: 0,
              background: "#080004",
              borderTop: `1px solid ${BORDER}`,
              display: "flex",
              alignItems: "center",
              padding: "0 10px",
              gap: 12,
              fontSize: 11,
              color: "rgba(255,255,255,0.55)",
              userSelect: "none",
            }}
          >
            <span
              onClick={() => {
                setPanelOpen(true);
                setPanelTab("problems");
              }}
              style={{ cursor: "pointer", color: diagnostics.length > 0 ? "#ef4444" : "inherit" }}
            >
              ⚠️ {diagnostics.length}
            </span>

            <span
              onClick={() => {
                setPanelOpen(true);
                setPanelTab("terminal");
              }}
              style={{ cursor: "pointer" }}
            >
              🖥️ Terminale
            </span>

            <div style={{ flex: 1 }} />

            <span>
              Ln {cursorPos.line}, Col {cursorPos.col}
            </span>

            <span>Spazi: 4</span>

            <span>UTF-8</span>

            <span
              onClick={() => setShowOptionsModal(true)}
              style={{ cursor: "pointer", color: ACCENT, fontWeight: 600 }}
              title="Configura compilatore"
            >
              {activeLang.label} ({selectedCompiler})
            </span>

            <span>
              {isDesktop && runLocation === "local" ? "🖥️ Windows Locale" : "☁️ Wandbox"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        commands={commands}
      />

      <QuickOpen
        isOpen={showQuickOpen}
        onClose={() => setShowQuickOpen(false)}
        onSelectFile={handleOpenRelFile}
        openTabs={tabs}
      />

      <CompilerOptionsModal
        isOpen={showOptionsModal}
        onClose={() => setShowOptionsModal(false)}
        langId={activeTab.langId}
        currentOptions={compilerOptions}
        onSaveOptions={(opts) => {
          setLocalCompilerOptions(opts);
          setCompilerOptions(activeTab.langId, opts);
          notify("⚙️ Opzioni salvate");
        }}
      />
    </div>
  );
}
