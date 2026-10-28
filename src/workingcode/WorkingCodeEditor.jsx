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
  CPP_STANDARDS,
  WARNING_FLAGS,
  getPreferredCompiler,
  setPreferredCompiler,
  getCompilerOptions,
  setCompilerOptions,
  hasLocalToolchain,
} from "./wcCompiler";
import {
  isDesktopApp,
  toolchainInfo,
  wsOpen,
  wsRead,
  wsWrite,
  runStart,
  runStdin,
  runCloseStdin,
  runKill,
  onRunEvent,
  newId,
} from "./tauriBridge";
import { LANGUAGES, SNIPPETS } from "./snippets";
import { parseDiagnostics } from "./diagnostics";
import { cloudRun } from "./cloudRunner";
import { javaMainClass } from "./interactive";

const ACCENT = "#ff2d55";
const ACCENT2 = "#ff0020";
const BG = "#050002";
const BG_SIDEBAR = "#090004";
const BG_PANEL = "#030002";
const BORDER = "rgba(255,45,85,0.18)";

const TABS_KEY = "wc_editor_tabs_v2";
const ACTIVE_KEY = "wc_editor_active_v2";
const RUN_MODE_KEY = "wc_run_mode_v2";

const DEFAULT_TEMPLATES = new Set(LANGUAGES.map((l) => l.template.trim()));

function newDefaultTab(lang) {
  return {
    id: "tab_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    name: lang.id === "java" ? "Main.java" : `main.${lang.ext}`,
    relPath: null,
    langId: lang.id,
    code: lang.template,
    saved: true,
    eol: "lf",
  };
}

// Pulisce codici ANSI da testo di console
const ANSI_RE = /\x1b\[[0-9;]*[A-Za-z]/g;
function stripAnsi(s) {
  return (s || "").replace(ANSI_RE, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/** Accoda testo in streaming alle righe di output mantenendo aperta l'ultima riga se non termina con \n. */
function appendStreamChunk(prev, type, rawChunk) {
  const chunk = stripAnsi(rawChunk);
  if (!chunk) return prev;
  const parts = chunk.split("\n");
  const endsWithNl = chunk.endsWith("\n");
  const items = endsWithNl ? parts.slice(0, -1) : parts;
  if (items.length === 0) return prev;

  const next = [...prev];
  const lastIdx = next.length - 1;

  if (
    lastIdx >= 0 &&
    next[lastIdx].open &&
    next[lastIdx].type === type &&
    next[lastIdx].suffixInput === undefined
  ) {
    const mergedOpen = items.length === 1 && !endsWithNl;
    next[lastIdx] = {
      ...next[lastIdx],
      text: next[lastIdx].text + items[0],
      open: mergedOpen,
    };
    for (let i = 1; i < items.length; i++) {
      const isLast = i === items.length - 1;
      next.push({ type, text: items[i], open: isLast && !endsWithNl });
    }
    return next;
  }

  for (let i = 0; i < items.length; i++) {
    const isLast = i === items.length - 1;
    next.push({ type, text: items[i], open: isLast && !endsWithNl });
  }
  return next;
}

/** Registra l'input dell'utente sulla riga di prompt aperta (se presente) o come nuova riga. */
function appendUserEcho(prev, val) {
  const next = [...prev];
  const lastIdx = next.length - 1;
  if (lastIdx >= 0 && next[lastIdx].open && next[lastIdx].suffixInput === undefined) {
    next[lastIdx] = { ...next[lastIdx], suffixInput: val, open: false };
    return next;
  }
  next.push({ type: "input", text: val, open: false });
  return next;
}

// ── Find & Replace Bar ──
function FindBar({ code, onChange, onClose }) {
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const m = find
    ? (code.match(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length
    : 0;
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
        autoFocus
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
          width: 150,
        }}
      />
      {find && (
        <span style={{ fontSize: 11, color: m > 0 ? ACCENT : "rgba(255,255,255,0.4)" }}>
          {m} risultati
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
          width: 150,
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

// ── Go To Line Modal (Ctrl+G) ──
function GotoLineModal({ isOpen, maxLine, onClose, onGoto }) {
  const [val, setVal] = useState("1");
  useEffect(() => {
    if (isOpen) setVal("1");
  }, [isOpen]);
  if (!isOpen) return null;
  const submit = () => {
    const n = parseInt(val, 10);
    if (!Number.isNaN(n) && n >= 1) onGoto(n);
    onClose();
  };
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "14vh",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 340,
          background: "#0d0005",
          border: `1px solid ${BORDER}`,
          borderRadius: 10,
          padding: 16,
          color: "#fff",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: ACCENT, marginBottom: 8 }}>
          Vai alla riga (1 – {maxLine})
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            autoFocus
            type="number"
            min={1}
            max={maxLine}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") onClose();
            }}
            style={{
              flex: 1,
              padding: "6px 10px",
              borderRadius: 6,
              border: `1px solid ${BORDER}`,
              background: "#160007",
              color: "#fff",
              fontSize: 13,
              outline: "none",
            }}
          />
          <button
            onClick={submit}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: "none",
              background: ACCENT,
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Vai
          </button>
        </div>
      </div>
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
  const standards = langId === "c" ? C_STANDARDS : langId === "cpp" ? CPP_STANDARDS : [];

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
          boxShadow: "0 16px 48px rgba(0,0,0,0.8)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: ACCENT }}>
            ⚙️ Opzioni Compilatore ({langId.toUpperCase()})
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 18 }}
          >
            ×
          </button>
        </div>

        {standards.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>
              Standard del linguaggio:
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {standards.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    const withoutStd = opts
                      .split("\n")
                      .filter((l) => !l.trim().startsWith("-std="))
                      .join("\n");
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
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>
            Flag di Warning & Ottimizzazione:
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {WARNING_FLAGS.map((w) => {
              const active = opts.split(/\s+/).includes(w.id);
              return (
                <button
                  key={w.id}
                  onClick={() => {
                    if (active) {
                      setOpts(
                        opts
                          .split("\n")
                          .filter((l) => l.trim() !== w.id)
                          .join("\n")
                      );
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
            Flag attivi (uno per riga, es. -O2, -lm):
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
          <button
            onClick={onClose}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: `1px solid ${BORDER}`,
              background: "transparent",
              color: "rgba(255,255,255,0.6)",
              cursor: "pointer",
            }}
          >
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
export default function WorkingCodeEditor({ externalSection, pendingLesson, onLessonConsumed }) {
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

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const activeLang = LANGUAGES.find((l) => l.id === activeTab?.langId) || LANGUAGES[0];

  // Probe local toolchain on desktop (non-blocking; Cloud is always ready without installing anything)
  const [toolchain, setToolchain] = useState(null);
  useEffect(() => {
    if (isDesktop) {
      toolchainInfo()
        .then((info) => setToolchain(info || []))
        .catch(() => setToolchain([]));
    }
  }, [isDesktop]);

  // Compiler selection & options
  const [selectedCompiler, setSelectedCompiler] = useState(() => getPreferredCompiler(activeLang.id));
  const [compilerOptions, setLocalCompilerOptions] = useState(() => getCompilerOptions(activeLang.id));

  // Run mode: "auto" (predefinito: Zero-Install Cloud, oppure Locale se installato), "cloud", "local"
  const [runMode, setRunMode] = useState(() => {
    try {
      return localStorage.getItem(RUN_MODE_KEY) || "auto";
    } catch {
      return "auto";
    }
  });

  const changeRunMode = (next) => {
    setRunMode(next);
    try {
      localStorage.setItem(RUN_MODE_KEY, next);
    } catch {}
  };

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
  const [panelHeight, setPanelHeight] = useState(250);
  const [draggingPanel, setDraggingPanel] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [showFind, setShowFind] = useState(false);
  const [showGoto, setShowGoto] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showQuickOpen, setShowQuickOpen] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [statusNotification, setStatusNotification] = useState("");
  const [workspaceInfo, setWorkspaceInfo] = useState(null);

  const editorRef = useRef(null);

  // Sync with external section clicks from WorkingCodeApp sidebar
  useEffect(() => {
    if (externalSection === "terminal") {
      setPanelOpen(true);
      setPanelTab("terminal");
    } else if (externalSection === "projects") {
      setSidebarView("explorer");
    } else if (externalSection === "snippets") {
      setSidebarView("snippets");
    }
  }, [externalSection]);

  // Load lesson code if user clicked "Apri nell'Editor" from Lezioni
  useEffect(() => {
    if (!pendingLesson) return;
    const lang = LANGUAGES.find((l) => l.id === pendingLesson.langId) || LANGUAGES[0];
    const t = {
      id: "tab_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      name: pendingLesson.filename || (lang.id === "java" ? "Main.java" : `esempio.${lang.ext}`),
      relPath: null,
      langId: lang.id,
      code: pendingLesson.code,
      saved: true,
      eol: "lf",
    };
    setTabs((prev) => [...prev, t]);
    setActiveTabId(t.id);
    onLessonConsumed?.();
  }, [pendingLesson, onLessonConsumed]);

  // Execution & Diagnostics state
  const [running, setRunning] = useState(false);
  const [outputLines, setOutputLines] = useState([]);
  const [isWaitingInput, setIsWaitingInput] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [diagnostics, setDiagnostics] = useState([]);

  const activeRunIdRef = useRef(null);
  const localCompileBufRef = useRef("");
  const localRunSpecRef = useRef(null);
  const localStartTimeRef = useRef(0);
  const cloudSessionRef = useRef(null);

  // Resize bottom panel
  useEffect(() => {
    if (!draggingPanel) return;
    const onMove = (e) => {
      const h = Math.max(120, Math.min(window.innerHeight - e.clientY, 620));
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

  // ── Cloud interactive runner (nessuna installazione richiesta) ──
  const executeCloudStep = useCallback(async (session, eof = false) => {
    try {
      const res = await cloudRun({
        compiler: session.compiler,
        code: session.code,
        langId: session.langId,
        options: session.options,
        inputs: session.inputs,
        eof,
      });

      if (cloudSessionRef.current?.id !== session.id) return;

      // Diagnostica compilatore + runtime (Python traceback, ecc.)
      const diagSource = [res.compilerText, res.stderr].filter(Boolean).join("\n");
      const diags = parseDiagnostics(diagSource, res.lineOffset || 0);
      setDiagnostics(diags);

      if (res.compileFailed) {
        setOutputLines((prev) =>
          appendStreamChunk(prev, "error", (res.compilerText || "Errore di compilazione").trimEnd() + "\n")
        );
        setRunning(false);
        setIsWaitingInput(false);
        setStatusMsg("Errore di compilazione");
        cloudSessionRef.current = null;
        return;
      }

      if (session.inputs.length === 0 && res.compilerText && res.compilerText.trim()) {
        setOutputLines((prev) =>
          appendStreamChunk(prev, "warn", res.compilerText.trimEnd() + "\n")
        );
      }

      // Mostra SOLO la parte nuova dell'output rispetto al passo precedente
      const fullOut = res.output || "";
      const delta = fullOut.slice(session.shownOutLen);
      session.shownOutLen = fullOut.length;

      if (delta) {
        setOutputLines((prev) => appendStreamChunk(prev, "stdout", delta));
      }

      if (res.needsInput) {
        setRunning(true);
        setIsWaitingInput(true);
        setStatusMsg("In attesa di input...");
        return;
      }

      if (res.stderr && res.stderr.trim()) {
        setOutputLines((prev) =>
          appendStreamChunk(prev, "error", res.stderr.trimEnd() + "\n")
        );
      }

      const elapsed = ((Date.now() - session.t0) / 1000).toFixed(2);
      const ok = String(res.status || "0") === "0";
      setRunning(false);
      setIsWaitingInput(false);
      setStatusMsg(`Completato · Codice ${res.status || 0} (${elapsed}s)`);
      setOutputLines((prev) => [
        ...prev.map((l) => (l.open ? { ...l, open: false } : l)),
        {
          type: "status",
          text: `─── ${ok ? "✅" : "❌"} Codice ${res.status || "0"} · ${elapsed}s ───`,
          open: false,
        },
      ]);
      cloudSessionRef.current = null;
    } catch (e) {
      if (cloudSessionRef.current?.id !== session.id) return;
      setOutputLines((prev) => [
        ...prev,
        { type: "error", text: "❌ Errore di connessione al compilatore: " + (e.message || e), open: false },
      ]);
      setRunning(false);
      setIsWaitingInput(false);
      setStatusMsg("Errore di rete");
      cloudSessionRef.current = null;
    }
  }, []);

  const startCloudExecution = useCallback(
    (compiler, code, langId, options, headerNote = "") => {
      const session = {
        id: newId(),
        compiler,
        code,
        langId,
        options,
        inputs: [],
        shownOutLen: 0,
        t0: Date.now(),
      };
      cloudSessionRef.current = session;
      activeRunIdRef.current = null;
      setRunning(true);
      setIsWaitingInput(false);
      setStatusMsg("Compilazione ed esecuzione...");
      setOutputLines([
        {
          type: "system",
          text: `─── WorkingCode [${langId.toUpperCase()} · ${compiler}]${headerNote} ───`,
          open: false,
        },
      ]);
      executeCloudStep(session, false);
    },
    [executeCloudStep]
  );

  // Listen to native run events on desktop
  useEffect(() => {
    if (!isDesktop) return;
    let unlisten = null;
    onRunEvent((ev) => {
      if (ev.id !== activeRunIdRef.current) return;
      if (ev.kind === "compile") {
        localCompileBufRef.current += ev.data;
        setDiagnostics(parseDiagnostics(localCompileBufRef.current, 0));
        setOutputLines((prev) => appendStreamChunk(prev, "warn", ev.data));
      } else if (ev.kind === "start") {
        setStatusMsg("In esecuzione (Locale)...");
      } else if (ev.kind === "stdout") {
        setOutputLines((prev) => appendStreamChunk(prev, "stdout", ev.data));
        setIsWaitingInput(true);
      } else if (ev.kind === "stderr") {
        localCompileBufRef.current += "\n" + ev.data;
        setDiagnostics(parseDiagnostics(localCompileBufRef.current, 0));
        setOutputLines((prev) => appendStreamChunk(prev, "warn", ev.data));
      } else if (ev.kind === "error") {
        setOutputLines((prev) => appendStreamChunk(prev, "error", ev.data + "\n"));
      } else if (ev.kind === "exit") {
        // Se il compilatore locale non è installato sul PC, passa subito e in automatico al compilatore Cloud integrato!
        if (ev.data === "not-found" && localRunSpecRef.current) {
          const s = localRunSpecRef.current;
          localRunSpecRef.current = null;
          activeRunIdRef.current = null;
          startCloudExecution(s.compiler, s.code, s.langId, s.options);
          return;
        }
        activeRunIdRef.current = null;
        setRunning(false);
        setIsWaitingInput(false);
        const code = ev.code !== undefined && ev.code !== null ? ev.code : 0;
        const elapsed = ((Date.now() - (localStartTimeRef.current || Date.now())) / 1000).toFixed(2);
        const ok = code === 0 && ev.data !== "compile-error";
        setStatusMsg(
          ev.data === "compile-error"
            ? "Errore di compilazione"
            : `Completato · Codice ${code} (${elapsed}s)`
        );
        setOutputLines((prev) => [
          ...prev.map((l) => (l.open ? { ...l, open: false } : l)),
          {
            type: "status",
            text: `─── ${ok ? "✅" : "❌"} Codice ${code} · ${elapsed}s ───`,
            open: false,
          },
        ]);
      }
    }).then((un) => {
      unlisten = un;
    });

    return () => {
      unlisten?.();
    };
  }, [isDesktop, startCloudExecution]);

  // ── Tab Management ──
  const updateActiveCode = (newCode) => {
    setTabs((ts) =>
      ts.map((t) => (t.id === activeTab.id ? { ...t, code: newCode, saved: false } : t))
    );
  };

  const notify = (msg) => {
    setStatusNotification(msg);
    setTimeout(() => setStatusNotification(""), 2200);
  };

  const saveActiveTab = async () => {
    if (!activeTab) return;
    if (activeTab.relPath && isDesktop) {
      try {
        await wsWrite(activeTab.relPath, activeTab.code, activeTab.eol || "lf");
        setTabs((ts) =>
          ts.map((t) => (t.id === activeTab.id ? { ...t, saved: true } : t))
        );
        notify("💾 Salvato su disco");
      } catch (e) {
        notify("❌ " + (e.message || e));
      }
    } else {
      setTabs((ts) =>
        ts.map((t) => (t.id === activeTab.id ? { ...t, saved: true } : t))
      );
      notify("💾 Salvato");
    }
  };

  const downloadActiveTab = () => {
    if (!activeTab) return;
    const blob = new Blob([activeTab.code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeTab.name;
    a.click();
    URL.revokeObjectURL(url);
    notify("⬇ File scaricato");
  };

  const copyActiveCode = () => {
    if (!activeTab) return;
    navigator.clipboard?.writeText(activeTab.code);
    notify("📋 Codice copiato");
  };

  const handleOpenRelFile = async (rel) => {
    const byRel = tabs.find((t) => t.relPath === rel || (!t.relPath && t.name === rel));
    if (byRel) {
      setActiveTabId(byRel.id);
      return;
    }
    if (!isDesktop) return;

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
      notify("❌ " + (e.message || e));
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

  const renameTab = (id) => {
    const t = tabs.find((x) => x.id === id);
    if (!t || t.relPath) return;
    const n = window.prompt("Rinomina scheda:", t.name);
    if (n && n.trim()) {
      setTabs((ts) => ts.map((x) => (x.id === id ? { ...x, name: n.trim() } : x)));
    }
  };

  // ── Run / Input / Stop ──
  const localAvailable = isDesktop && hasLocalToolchain(toolchain, activeTab?.langId, selectedCompiler);
  const useLocal =
    isDesktop &&
    (runMode === "local" || (runMode === "auto" && localAvailable));

  const handleRun = async () => {
    if (!activeTab) return;
    if (running) {
      await handleKill();
    }

    setDiagnostics([]);
    setPanelOpen(true);
    setPanelTab("output");

    const code = activeTab.code;
    const langId = activeTab.langId;
    const compiler = selectedCompiler || getPreferredCompiler(langId);
    const flags = compilerOptions
      .split(/[\r\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (useLocal) {
      const runId = newId();
      activeRunIdRef.current = runId;
      cloudSessionRef.current = null;
      localCompileBufRef.current = "";
      localStartTimeRef.current = Date.now();
      localRunSpecRef.current = { compiler, code, langId, options: compilerOptions };

      setRunning(true);
      setIsWaitingInput(false);
      setStatusMsg("Compilazione in corso...");
      setOutputLines([
        {
          type: "system",
          text: `─── WorkingCode [${langId.toUpperCase()} · ${compiler}] ───`,
          open: false,
        },
      ]);

      try {
        await runStart({
          id: runId,
          lang: langId,
          filename: activeTab.name,
          code,
          compiler,
          flags,
          mainClass: javaMainClass(code),
        });
      } catch {
        // Fallback immediato al compilatore Cloud integrato
        startCloudExecution(compiler, code, langId, compilerOptions);
      }
      return;
    }

    // Esecuzione Cloud immediata (nessun download o installazione richiesta)
    startCloudExecution(compiler, code, langId, compilerOptions);
  };

  const handleSendStdin = async (text) => {
    setOutputLines((prev) => appendUserEcho(prev, text));

    if (cloudSessionRef.current) {
      const session = cloudSessionRef.current;
      session.inputs = [...session.inputs, text];
      setIsWaitingInput(false);
      setStatusMsg("Esecuzione...");
      await executeCloudStep(session, false);
      return;
    }

    if (isDesktop && activeRunIdRef.current) {
      try {
        await runStdin(activeRunIdRef.current, text + "\n");
      } catch (e) {
        setOutputLines((prev) => [
          ...prev,
          { type: "error", text: "Errore invio input: " + (e.message || e), open: false },
        ]);
      }
    }
  };

  const handleCloseStdin = async () => {
    if (cloudSessionRef.current) {
      const session = cloudSessionRef.current;
      setIsWaitingInput(false);
      setStatusMsg("Fine input (EOF)...");
      await executeCloudStep(session, true);
      return;
    }
    if (isDesktop && activeRunIdRef.current) {
      try {
        await runCloseStdin(activeRunIdRef.current);
      } catch {}
    }
  };

  const handleKill = async () => {
    cloudSessionRef.current = null;
    if (isDesktop && activeRunIdRef.current) {
      const id = activeRunIdRef.current;
      activeRunIdRef.current = null;
      try {
        await runKill(id);
      } catch {}
    }
    setOutputLines((p) => [
      ...p.map((l) => (l.open ? { ...l, open: false } : l)),
      { type: "warn", text: "⏹ Esecuzione interrotta.", open: false },
    ]);
    setRunning(false);
    setIsWaitingInput(false);
    setStatusMsg("Interrotto");
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveActiveTab();
      } else if (e.key === "F5" || ((e.ctrlKey || e.metaKey) && e.key === "Enter")) {
        e.preventDefault();
        handleRun();
      } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setShowQuickOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setShowCommandPalette(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setSidebarView((v) => (v ? null : "explorer"));
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "j" || e.key === "`")) {
        e.preventDefault();
        setPanelOpen((p) => !p);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setShowFind((f) => !f);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "g") {
        e.preventDefault();
        setShowGoto(true);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const handleJumpToLocation = (loc) => {
    if (!loc) return;
    editorRef.current?.gotoLine(loc.line, loc.col || 1);
  };

  // Switch language on active tab (replaces template if code is untouched default template)
  const handleLanguageChange = (newLangId) => {
    const chosen = LANGUAGES.find((x) => x.id === newLangId);
    if (!chosen || !activeTab) return;
    const isDefaultCode =
      !activeTab.code.trim() || DEFAULT_TEMPLATES.has(activeTab.code.trim());
    setTabs((ts) =>
      ts.map((t) =>
        t.id === activeTab.id
          ? {
              ...t,
              langId: chosen.id,
              name: t.relPath
                ? t.name
                : chosen.id === "java"
                ? "Main.java"
                : `main.${chosen.ext}`,
              code: isDefaultCode ? chosen.template : t.code,
            }
          : t
      )
    );
  };

  // Command Palette actions
  const commands = [
    { category: "Esecuzione", title: "▶ Compila ed Esegui Codice", shortcut: "F5", action: handleRun },
    { category: "Esecuzione", title: "⏹ Interrompi Esecuzione", action: handleKill },
    { category: "File", title: "Salva File", shortcut: "Ctrl+S", action: saveActiveTab },
    { category: "File", title: "Scarica File sul PC", action: downloadActiveTab },
    { category: "File", title: "Copia Codice negli Appunti", action: copyActiveCode },
    { category: "File", title: "Cerca File (Quick Open)", shortcut: "Ctrl+P", action: () => setShowQuickOpen(true) },
    ...(isDesktop
      ? [{ category: "File", title: "Apri Cartella dal PC...", action: () => wsOpen() }]
      : []),
    { category: "File", title: "Nuovo File C", action: () => addNewTab("c") },
    { category: "File", title: "Nuovo File C++", action: () => addNewTab("cpp") },
    { category: "File", title: "Nuovo File Java", action: () => addNewTab("java") },
    { category: "File", title: "Nuovo File Python", action: () => addNewTab("python") },
    { category: "Editor", title: "Vai alla Riga...", shortcut: "Ctrl+G", action: () => setShowGoto(true) },
    { category: "Editor", title: "Cerca e Sostituisci", shortcut: "Ctrl+F", action: () => setShowFind(true) },
    { category: "Visualizza", title: "Mostra/Nascondi Barra Laterale", shortcut: "Ctrl+B", action: () => setSidebarView((v) => (v ? null : "explorer")) },
    { category: "Visualizza", title: "Mostra/Nascondi Pannello Inferiore", shortcut: "Ctrl+J", action: () => setPanelOpen((p) => !p) },
    { category: "Visualizza", title: "Apri Console di Esecuzione", action: () => { setPanelOpen(true); setPanelTab("output"); } },
    { category: "Visualizza", title: "Apri Terminale PowerShell", action: () => { setPanelOpen(true); setPanelTab("terminal"); } },
    { category: "Visualizza", title: "Ingrandisci Carattere (+)", action: () => setFontSize((s) => Math.min(24, s + 1)) },
    { category: "Visualizza", title: "Riduci Carattere (-)", action: () => setFontSize((s) => Math.max(10, s - 1)) },
    { category: "Compilatore", title: "Configura Opzioni Compilatore", action: () => setShowOptionsModal(true) },
    ...(SNIPPETS[activeTab.langId] || []).map((snip) => ({
      category: `Snippet ${activeTab.langId.toUpperCase()}`,
      title: `Inserisci: ${snip.name}`,
      action: () => editorRef.current?.insertText(snip.text),
    })),
  ];

  const totalLines = activeTab.code.split("\n").length;

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
        {/* Run Button */}
        <button
          onClick={handleRun}
          title="Compila ed Esegui (F5 / Ctrl+Invio) — Nessuna installazione richiesta"
          style={{
            padding: "5px 15px",
            borderRadius: 7,
            border: "none",
            background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
            color: "#fff",
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
            boxShadow: `0 0 12px ${ACCENT}55`,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {running ? "↻ Riesegui" : "▶ Esegui"}
        </button>

        {running && (
          <button
            onClick={handleKill}
            title="Ferma esecuzione"
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
          onChange={(e) => handleLanguageChange(e.target.value)}
          title="Linguaggio di programmazione"
          style={{
            padding: "4px 8px",
            borderRadius: 6,
            border: `1px solid ${BORDER}`,
            background: "#140007",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
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
          title="Versione del compilatore / interprete"
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

        {/* Options Button */}
        {(activeTab.langId === "c" || activeTab.langId === "cpp") && (
          <button
            onClick={() => setShowOptionsModal(true)}
            title="Opzioni compilatore (-std, -Wall, -O2...)"
            style={{
              padding: "4px 8px",
              borderRadius: 6,
              border: `1px solid ${BORDER}`,
              background: "transparent",
              color: "rgba(255,255,255,0.75)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            ⚙️ Flag
          </button>
        )}

        <div style={{ width: 1, height: 20, background: BORDER, margin: "0 2px" }} />

        {/* File Actions */}
        <button
          onClick={saveActiveTab}
          title="Salva (Ctrl+S)"
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
          onClick={copyActiveCode}
          title="Copia codice"
          style={{
            padding: "4px 8px",
            borderRadius: 6,
            border: `1px solid ${BORDER}`,
            background: "transparent",
            color: "#60a5fa",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          📋
        </button>

        <button
          onClick={downloadActiveTab}
          title="Scarica file"
          style={{
            padding: "4px 8px",
            borderRadius: 6,
            border: `1px solid ${BORDER}`,
            background: "transparent",
            color: "#c084fc",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          ⬇
        </button>

        <button
          onClick={() => setShowFind((f) => !f)}
          title="Cerca e sostituisci (Ctrl+F)"
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

        <button
          onClick={() => setShowCommandPalette(true)}
          title="Palette comandi (Ctrl+Shift+P)"
          style={{
            padding: "4px 10px",
            borderRadius: 6,
            border: `1px solid ${BORDER}`,
            background: "rgba(255,255,255,0.03)",
            color: "rgba(255,255,255,0.75)",
            fontSize: 11,
            cursor: "pointer",
            fontFamily: "Consolas",
          }}
        >
          &gt; Comandi
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
              color: "rgba(255,255,255,0.6)",
              cursor: "pointer",
            }}
          >
            -
          </button>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", minWidth: 20, textAlign: "center" }}>
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
              color: "rgba(255,255,255,0.6)",
              cursor: "pointer",
            }}
          >
            +
          </button>
        </div>

        {statusNotification && (
          <span style={{ fontSize: 12, color: ACCENT, fontWeight: 600, marginLeft: 6 }}>
            {statusNotification}
          </span>
        )}
      </div>

      {/* ── MAIN WORKSPACE BODY ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Activity Bar */}
        <div
          style={{
            width: 46,
            flexShrink: 0,
            background: "#080003",
            borderRight: `1px solid ${BORDER}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "8px 0",
            gap: 6,
          }}
        >
          <button
            className="act-btn"
            onClick={() => setSidebarView((v) => (v === "explorer" ? null : "explorer"))}
            title="Esplora Risorse (Ctrl+B)"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: "none",
              background: sidebarView === "explorer" ? "rgba(255,45,85,0.18)" : "transparent",
              color: sidebarView === "explorer" ? ACCENT : "rgba(255,255,255,0.45)",
              fontSize: 17,
              cursor: "pointer",
            }}
          >
            📁
          </button>

          <button
            className="act-btn"
            onClick={() => setSidebarView((v) => (v === "search" ? null : "search"))}
            title="Cerca nei file"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: "none",
              background: sidebarView === "search" ? "rgba(255,45,85,0.18)" : "transparent",
              color: sidebarView === "search" ? ACCENT : "rgba(255,255,255,0.45)",
              fontSize: 17,
              cursor: "pointer",
            }}
          >
            🔍
          </button>

          <button
            className="act-btn"
            onClick={() => setSidebarView((v) => (v === "snippets" ? null : "snippets"))}
            title="Frammenti di codice (Snippets)"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: "none",
              background: sidebarView === "snippets" ? "rgba(255,45,85,0.18)" : "transparent",
              color: sidebarView === "snippets" ? ACCENT : "rgba(255,255,255,0.45)",
              fontSize: 17,
              cursor: "pointer",
            }}
          >
            🧩
          </button>

          <button
            className="act-btn"
            onClick={() => {
              setPanelOpen(true);
              setPanelTab("terminal");
            }}
            title="Terminale PowerShell"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: "none",
              background: panelOpen && panelTab === "terminal" ? "rgba(59,130,246,0.2)" : "transparent",
              color: panelOpen && panelTab === "terminal" ? "#60a5fa" : "rgba(255,255,255,0.45)",
              fontSize: 17,
              cursor: "pointer",
            }}
          >
            🖥️
          </button>

          <div style={{ flex: 1 }} />

          <button
            className="act-btn"
            onClick={() => setShowCommandPalette(true)}
            title="Palette comandi (Ctrl+Shift+P)"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: "none",
              background: "transparent",
              color: "rgba(255,255,255,0.45)",
              fontSize: 17,
              cursor: "pointer",
            }}
          >
            ⚙️
          </button>
        </div>

        {/* Sidebar View */}
        {sidebarView && (
          <div style={{ width: 245, flexShrink: 0, height: "100%", overflow: "hidden" }}>
            {sidebarView === "explorer" && (
              <FileExplorer
                activeFileRel={activeTab?.relPath}
                onOpenFile={handleOpenRelFile}
                openTabs={tabs}
                onCloseTab={closeTab}
                onSelectTab={(id) => setActiveTabId(id)}
                activeTabId={activeTabId}
                onWorkspaceChange={setWorkspaceInfo}
              />
            )}

            {sidebarView === "search" && (
              <SearchPane
                openTabs={tabs}
                onOpenFileAndLine={(match) => {
                  if (match.isTab) {
                    setActiveTabId(match.tabId);
                  } else if (match.file) {
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
                <div style={{ fontWeight: 700, color: ACCENT, fontSize: 11, textTransform: "uppercase", marginBottom: 4 }}>
                  Snippets ({activeTab.langId.toUpperCase()})
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>
                  Clicca uno snippet per inserirlo alla posizione del cursore:
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
                      <div style={{ fontWeight: 600, color: "#fff" }}>🧩 {snip.name}</div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "rgba(255,255,255,0.45)",
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

        {/* Center Editor Area + Bottom Panel */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          {/* Tab Bar */}
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
                  onDoubleClick={() => renameTab(tab.id)}
                  title={tab.relPath || `${tab.name} (doppio clic per rinominare)`}
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
                    style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", padding: "0 2px" }}
                  >
                    ×
                  </span>
                </div>
              );
            })}

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
                color: "rgba(255,255,255,0.55)",
                fontSize: 11,
                borderRadius: 5,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="">+ Nuovo File</option>
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id} style={{ background: "#120006", color: "#fff" }}>
                  {l.label} (.{l.ext})
                </option>
              ))}
            </select>
          </div>

          {showFind && (
            <FindBar
              code={activeTab.code}
              onChange={updateActiveCode}
              onClose={() => setShowFind(false)}
            />
          )}

          {/* Code Editor */}
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

          {/* Panel Splitter */}
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

          {/* Bottom Panel */}
          {panelOpen && (
            <div
              style={{
                height: panelHeight,
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                background: BG_PANEL,
              }}
            >
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
                  ▶ Console Output {isWaitingInput ? "●" : ""}
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
                  ⚡ Terminale PowerShell
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
                    color:
                      panelTab === "problems"
                        ? "#fde047"
                        : diagnostics.length > 0
                        ? "#fca5a5"
                        : "rgba(255,255,255,0.5)",
                  }}
                >
                  ⚠️ Problemi ({diagnostics.length})
                </button>

                <div style={{ flex: 1 }} />

                <button
                  onClick={() =>
                    setPanelHeight((h) => (h > 360 ? 240 : Math.min(520, window.innerHeight - 180)))
                  }
                  title="Ingrandisci/Riduci pannello"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "rgba(255,255,255,0.45)",
                    cursor: "pointer",
                    fontSize: 12,
                    padding: "2px 6px",
                  }}
                >
                  ↕
                </button>

                <button
                  onClick={() => setPanelOpen(false)}
                  title="Nascondi pannello (Ctrl+J)"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "rgba(255,255,255,0.45)",
                    cursor: "pointer",
                    fontSize: 14,
                    padding: "2px 6px",
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                {panelTab === "output" && (
                  <OutputPane
                    lines={outputLines}
                    running={running}
                    statusMsg={statusMsg}
                    isWaitingForInput={isWaitingInput}
                    onSendInput={handleSendStdin}
                    onCloseInput={handleCloseStdin}
                    onKill={handleKill}
                    onClear={() => {
                      setOutputLines([]);
                      setStatusMsg("");
                    }}
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

          {/* Status Bar */}
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
              color: "rgba(255,255,255,0.6)",
              userSelect: "none",
            }}
          >
            {workspaceInfo && (
              <span style={{ color: ACCENT, fontWeight: 600 }} title={workspaceInfo.path}>
                📂 {workspaceInfo.name}
              </span>
            )}

            <span
              onClick={() => {
                setPanelOpen(true);
                setPanelTab("problems");
              }}
              style={{ cursor: "pointer", color: diagnostics.length > 0 ? "#f87171" : "inherit" }}
              title="Mostra problemi di compilazione"
            >
              ⚠️ {diagnostics.length}
            </span>

            <span
              onClick={() => {
                setPanelOpen(true);
                setPanelTab("output");
              }}
              style={{ cursor: "pointer" }}
              title="Apri Console Output"
            >
              ▶ Output
            </span>

            <span
              onClick={() => {
                setPanelOpen(true);
                setPanelTab("terminal");
              }}
              style={{ cursor: "pointer" }}
              title="Apri Terminale PowerShell"
            >
              🖥️ Terminale
            </span>

            <div style={{ flex: 1 }} />

            <span
              onClick={() => setShowGoto(true)}
              style={{ cursor: "pointer" }}
              title="Vai alla riga (Ctrl+G)"
            >
              Ln {cursorPos.line}, Col {cursorPos.col}
            </span>

            <span>Spazi: 4</span>
            <span>UTF-8</span>

            <span
              onClick={() => setShowOptionsModal(true)}
              style={{ cursor: "pointer", color: ACCENT, fontWeight: 600 }}
              title="Compilatore attivo"
            >
              {activeLang.label} ({selectedCompiler})
            </span>

            <span
              onClick={() => {
                if (!isDesktop) return;
                changeRunMode(runMode === "cloud" ? "auto" : "cloud");
              }}
              style={{ cursor: isDesktop ? "pointer" : "default", color: "#34d399" }}
              title="Pronto all'uso senza installare nulla"
            >
              {useLocal ? "⚡ Toolchain PC" : "⚡ Compilatore Integrato (Zero-Install)"}
            </span>
          </div>
        </div>
      </div>

      {/* Modals */}
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

      <GotoLineModal
        isOpen={showGoto}
        maxLine={totalLines}
        onClose={() => setShowGoto(false)}
        onGoto={(line) => editorRef.current?.gotoLine(line, 1)}
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
