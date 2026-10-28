import { useState, useRef, useEffect, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import {
  isDesktopApp,
  ptyOpen,
  ptyWrite,
  ptyResize,
  ptyClose,
  onPtyEvent,
  newId,
} from "./tauriBridge";

const ACCENT = "#ff2d55";
const BORDER = "rgba(255,45,85,0.18)";

function TerminalInstance({ id, active, onTitleChange, onExit }) {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const fitAddonRef = useRef(null);
  const unlistenRef = useRef(null);

  useEffect(() => {
    if (!isDesktopApp() || !containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: "bar",
      fontSize: 13,
      fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
      theme: {
        background: "#040002",
        foreground: "#f1f5f9",
        cursor: ACCENT,
        cursorAccent: "#ffffff",
        selectionBackground: "rgba(255,45,85,0.35)",
        black: "#000000",
        red: "#ff2d55",
        green: "#34d399",
        yellow: "#fbbf24",
        blue: "#60a5fa",
        magenta: "#c084fc",
        cyan: "#38bdf8",
        white: "#f8fafc",
        brightBlack: "#4b5563",
        brightRed: "#f87171",
        brightGreen: "#4ade80",
        brightYellow: "#fde047",
        brightBlue: "#93c5fd",
        brightMagenta: "#e879f9",
        brightCyan: "#67e8f9",
        brightWhite: "#ffffff",
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // Open native PTY
    let isMounted = true;
    ptyOpen(id, term.cols || 80, term.rows || 24)
      .then((cwd) => {
        if (!isMounted) return;
        if (cwd) onTitleChange?.(`powershell (${cwd.split(/[\\/]/).pop()})`);
      })
      .catch((err) => {
        term.writeln(`\r\n\x1b[31m[Errore avvio PTY: ${err.message || err}]\x1b[0m\r\n`);
      });

    // Write to PTY
    const onDataDisp = term.onData((data) => {
      ptyWrite(id, data).catch(() => {});
    });

    // Listen to native events
    onPtyEvent((ev) => {
      if (ev.id === id) {
        if (ev.data) term.write(ev.data);
        if (ev.exited) {
          term.writeln("\r\n\x1b[33m[Processo terminato]\x1b[0m");
          onExit?.();
        }
      }
    }).then((un) => {
      unlistenRef.current = un;
    });

    // Resize observer
    const ro = new ResizeObserver(() => {
      try {
        if (containerRef.current?.clientWidth > 0 && containerRef.current?.clientHeight > 0) {
          fitAddon.fit();
          ptyResize(id, term.cols, term.rows).catch(() => {});
        }
      } catch {}
    });
    ro.observe(containerRef.current);

    return () => {
      isMounted = false;
      ro.disconnect();
      onDataDisp.dispose();
      unlistenRef.current?.();
      ptyClose(id).catch(() => {});
      term.dispose();
    };
  }, [id]);

  useEffect(() => {
    if (active && fitAddonRef.current && containerRef.current) {
      setTimeout(() => {
        try {
          fitAddonRef.current?.fit();
          termRef.current?.focus();
        } catch {}
      }, 50);
    }
  }, [active]);

  return (
    <div
      ref={containerRef}
      style={{
        display: active ? "block" : "none",
        width: "100%",
        height: "100%",
        padding: "4px 8px",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    />
  );
}

export default function TerminalPane() {
  const isDesktop = isDesktopApp();
  const [sessions, setSessions] = useState(() => [{ id: newId(), title: "powershell" }]);
  const [activeId, setActiveId] = useState(sessions[0]?.id);

  const addSession = () => {
    if (sessions.length >= 8) {
      alert("Massimo 8 sessioni contemporanee aperte.");
      return;
    }
    const newSession = { id: newId(), title: `powershell ${sessions.length + 1}` };
    setSessions((s) => [...s, newSession]);
    setActiveId(newSession.id);
  };

  const closeSession = (id) => {
    const next = sessions.filter((s) => s.id !== id);
    if (next.length === 0) {
      const fresh = { id: newId(), title: "powershell" };
      setSessions([fresh]);
      setActiveId(fresh.id);
    } else {
      setSessions(next);
      if (activeId === id) setActiveId(next[next.length - 1].id);
    }
  };

  if (!isDesktop) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          padding: 24,
          background: "#040002",
          color: "#fff",
          textAlign: "center",
          fontFamily: "'Segoe UI', sans-serif",
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 12 }}>⚡</div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: ACCENT }}>
          Terminale PowerShell Windows Reale
        </div>
        <div
          style={{
            maxWidth: 480,
            color: "rgba(255,255,255,0.65)",
            fontSize: 13,
            lineHeight: 1.6,
            marginBottom: 20,
          }}
        >
          Sei connesso via browser web. Il terminale con <strong>PowerShell nativo</strong> (con supporto a colori, ConPTY, script, git, compilatori locali) è attivo direttamente nell'applicazione desktop Windows.
        </div>
        <a
          href={`${import.meta.env.BASE_URL}WorkfyStation-Setup.exe`}
          download="WorkfyStation-Setup.exe"
          style={{
            padding: "10px 22px",
            borderRadius: 8,
            background: `linear-gradient(135deg, ${ACCENT}, #ff0020)`,
            color: "#fff",
            fontWeight: 600,
            textDecoration: "none",
            fontSize: 13,
            boxShadow: `0 0 16px ${ACCENT}55`,
          }}
        >
          📥 Scarica WorkfyStation per PC
        </a>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#040002",
        overflow: "hidden",
      }}
    >
      {/* ── Tabs header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 8px",
          background: "#0c0005",
          borderBottom: `1px solid ${BORDER}`,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginRight: 8, fontWeight: 600 }}>
          ⚡ POWERSHELL
        </span>

        {sessions.map((s, idx) => (
          <div
            key={s.id}
            onClick={() => setActiveId(s.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 11,
              background: activeId === s.id ? "rgba(255,45,85,0.2)" : "rgba(255,255,255,0.04)",
              border: activeId === s.id ? `1px solid ${ACCENT}88` : "1px solid transparent",
              color: activeId === s.id ? "#ffffff" : "rgba(255,255,255,0.5)",
            }}
          >
            <span>{s.title || `ps ${idx + 1}`}</span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                closeSession(s.id);
              }}
              style={{ fontSize: 13, opacity: 0.6, cursor: "pointer", padding: "0 2px" }}
              title="Chiudi sessione"
            >
              ×
            </span>
          </div>
        ))}

        <button
          onClick={addSession}
          title="Nuovo Terminale PowerShell"
          style={{
            padding: "3px 8px",
            borderRadius: 6,
            border: `1px solid ${BORDER}`,
            background: "rgba(255,255,255,0.03)",
            color: ACCENT,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          +
        </button>
      </div>

      {/* ── Terminal Instances ── */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {sessions.map((s) => (
          <TerminalInstance
            key={s.id}
            id={s.id}
            active={activeId === s.id}
            onTitleChange={(title) => {
              setSessions((prev) => prev.map((item) => (item.id === s.id ? { ...item, title } : item)));
            }}
            onExit={() => {}}
          />
        ))}
      </div>
    </div>
  );
}
