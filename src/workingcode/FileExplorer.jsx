import { useState, useEffect, useCallback } from "react";
import {
  isDesktopApp,
  wsOpen,
  wsReopen,
  wsRecent,
  wsInfo,
  wsClose,
  wsList,
  wsCreate,
  wsRename,
  wsDelete,
} from "./tauriBridge";

const ACCENT = "#ff2d55";
const BORDER = "rgba(255,45,85,0.18)";

function getFileIcon(name, isDir) {
  if (isDir) return "📁";
  const ext = name.split(".").pop().toLowerCase();
  switch (ext) {
    case "c":
    case "h":
      return "🔷";
    case "cpp":
    case "hpp":
    case "cc":
    case "cxx":
      return "🔵";
    case "java":
      return "☕";
    case "py":
      return "🐍";
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
      return "⚡";
    case "html":
    case "css":
      return "🌐";
    case "json":
      return "📦";
    case "md":
    case "txt":
      return "📝";
    default:
      return "📄";
  }
}

export default function FileExplorer({
  activeFileRel,
  onOpenFile,
  openTabs = [],
  onCloseTab,
  onSelectTab,
  activeTabId,
}) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [wsRoot, setWsRoot] = useState(null);
  const [items, setItems] = useState([]);
  const [recents, setRecents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedDirs, setExpandedDirs] = useState(new Set([""]));

  // Load workspace state
  const refresh = useCallback(async () => {
    if (!isDesktopApp()) return;
    setLoading(true);
    setError("");
    try {
      const info = await wsInfo();
      setWsRoot(info.root || null);
      if (info.root) {
        const rootItems = await wsList("");
        setItems(rootItems);
      } else {
        setItems([]);
        const rec = await wsRecent();
        setRecents(rec || []);
      }
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const desktop = isDesktopApp();
    setIsDesktop(desktop);
    if (desktop) {
      refresh();
    }
  }, [refresh]);

  const handleOpenFolder = async () => {
    setError("");
    try {
      const res = await wsOpen();
      if (res && res.path) {
        refresh();
      }
    } catch (e) {
      setError("Errore apertura cartella: " + (e.message || e));
    }
  };

  const handleReopen = async (path) => {
    try {
      await wsReopen(path);
      refresh();
    } catch (e) {
      setError("Impossibile aprire: " + (e.message || e));
    }
  };

  const handleCloseWorkspace = async () => {
    try {
      await wsClose();
      refresh();
    } catch (e) {
      setError(e.message || String(e));
    }
  };

  const handleCreateFile = async () => {
    const name = window.prompt("Nome del nuovo file (es. main.c):");
    if (!name || !name.trim()) return;
    try {
      await wsCreate(name.trim(), false);
      await refresh();
      onOpenFile?.(name.trim());
    } catch (e) {
      alert("Errore creazione file: " + (e.message || e));
    }
  };

  const handleCreateFolder = async () => {
    const name = window.prompt("Nome della nuova cartella:");
    if (!name || !name.trim()) return;
    try {
      await wsCreate(name.trim(), true);
      refresh();
    } catch (e) {
      alert("Errore creazione cartella: " + (e.message || e));
    }
  };

  const handleRename = async (e, rel) => {
    e.stopPropagation();
    const newName = window.prompt("Rinomina in:", rel.split(/[\\/]/).pop());
    if (!newName || !newName.trim()) return;
    const parent = rel.includes("/") ? rel.substring(0, rel.lastIndexOf("/")) : "";
    const target = parent ? `${parent}/${newName.trim()}` : newName.trim();
    try {
      await wsRename(rel, target);
      refresh();
    } catch (err) {
      alert("Errore rinomina: " + (err.message || err));
    }
  };

  const handleDelete = async (e, rel) => {
    e.stopPropagation();
    if (!window.confirm(`Spostare "${rel}" nel Cestino di Windows?`)) return;
    try {
      await wsDelete(rel);
      refresh();
    } catch (err) {
      alert("Errore eliminazione: " + (err.message || err));
    }
  };

  const folderName = wsRoot ? wsRoot.split(/[\\/]/).filter(Boolean).pop() : null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#0a0004",
        borderRight: `1px solid ${BORDER}`,
        color: "#f0f0f0",
        fontSize: 12,
        userSelect: "none",
        overflow: "hidden",
      }}
    >
      {/* ── Explorer Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px",
          borderBottom: `1px solid ${BORDER}`,
          background: "rgba(255,45,85,0.03)",
        }}
      >
        <span
          style={{
            fontWeight: 700,
            letterSpacing: 0.5,
            color: "rgba(255,255,255,0.85)",
            fontSize: 11,
            textTransform: "uppercase",
          }}
        >
          Esplora Risorse
        </span>
        {isDesktop && wsRoot && (
          <div style={{ display: "flex", gap: 4 }}>
            <button
              onClick={handleCreateFile}
              title="Nuovo File"
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.6)",
                cursor: "pointer",
                padding: "2px 4px",
                borderRadius: 4,
                fontSize: 13,
              }}
            >
              📄+
            </button>
            <button
              onClick={handleCreateFolder}
              title="Nuova Cartella"
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.6)",
                cursor: "pointer",
                padding: "2px 4px",
                borderRadius: 4,
                fontSize: 13,
              }}
            >
              📁+
            </button>
            <button
              onClick={refresh}
              title="Aggiorna"
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.6)",
                cursor: "pointer",
                padding: "2px 4px",
                borderRadius: 4,
                fontSize: 13,
              }}
            >
              🔄
            </button>
            <button
              onClick={handleCloseWorkspace}
              title="Chiudi Cartella"
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.4)",
                cursor: "pointer",
                padding: "2px 4px",
                borderRadius: 4,
                fontSize: 13,
              }}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            padding: "8px 12px",
            background: "rgba(239,68,68,0.1)",
            borderBottom: "1px solid #ef4444",
            color: "#fca5a5",
            fontSize: 11,
          }}
        >
          {error}
        </div>
      )}

      {/* ── Content Area ── */}
      <div style={{ flex: 1, overflow: "auto", padding: "6px 0" }}>
        {/* If on desktop with workspace open */}
        {isDesktop && wsRoot ? (
          <div>
            {/* Root folder item */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                fontWeight: 700,
                color: ACCENT,
                fontSize: 11,
                letterSpacing: 0.5,
              }}
              title={wsRoot}
            >
              <span>📂</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {folderName}
              </span>
            </div>

            {/* File List */}
            {items.length === 0 ? (
              <div style={{ padding: "12px 16px", color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>
                Cartella vuota. Clicca 📄+ per creare un file.
              </div>
            ) : (
              items.map((item) => {
                const isSelected = activeFileRel === item.rel;
                return (
                  <div
                    key={item.rel}
                    onClick={() => {
                      if (!item.is_dir) onOpenFile?.(item.rel);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "5px 12px 5px 24px",
                      cursor: item.is_dir ? "default" : "pointer",
                      background: isSelected ? "rgba(255,45,85,0.15)" : "transparent",
                      borderLeft: isSelected ? `2px solid ${ACCENT}` : "2px solid transparent",
                      color: isSelected ? "#ffffff" : "rgba(255,255,255,0.75)",
                      fontSize: 12,
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <span>{getFileIcon(item.name, item.is_dir)}</span>
                    <span
                      style={{
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.name}
                    </span>
                    <div className="file-actions" style={{ display: "flex", gap: 2, opacity: 0.6 }}>
                      <button
                        onClick={(e) => handleRename(e, item.rel)}
                        title="Rinomina"
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "inherit",
                          cursor: "pointer",
                          fontSize: 10,
                          padding: 2,
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, item.rel)}
                        title="Elimina nel Cestino"
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                          fontSize: 10,
                          padding: 2,
                        }}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : isDesktop && !wsRoot ? (
          /* Desktop with no folder open */
          <div style={{ padding: "16px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
              Nessuna cartella aperta. Apri una cartella locale per lavorare con più file e compilare direttamente da disco.
            </div>

            <button
              onClick={handleOpenFolder}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "none",
                background: `linear-gradient(135deg, ${ACCENT}, #ff0020)`,
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: `0 0 12px ${ACCENT}44`,
              }}
            >
              📂 Apri Cartella...
            </button>

            {recents.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 1, marginBottom: 6 }}>
                  RECENTI
                </div>
                {recents.map((p) => {
                  const name = p.split(/[\\/]/).filter(Boolean).pop();
                  return (
                    <div
                      key={p}
                      onClick={() => handleReopen(p)}
                      style={{
                        padding: "6px 8px",
                        borderRadius: 6,
                        cursor: "pointer",
                        background: "rgba(255,255,255,0.03)",
                        marginBottom: 4,
                      }}
                      title={p}
                    >
                      <div style={{ fontWeight: 600, color: "#fff" }}>📁 {name}</div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "rgba(255,255,255,0.3)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Web Mode: show open tabs */
          <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                background: "rgba(59,130,246,0.08)",
                border: "1px solid rgba(59,130,246,0.25)",
                color: "#93c5fd",
                fontSize: 11,
                lineHeight: 1.5,
              }}
            >
              🌐 <strong>Modalità Web</strong>
              <div style={{ marginTop: 4, color: "rgba(255,255,255,0.5)" }}>
                Scarica <strong>WorkfyStation per PC</strong> per aprire cartelle locali del tuo computer e usare il terminale PowerShell nativo!
              </div>
            </div>

            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 1 }}>
              FILE APERTI
            </div>

            {openTabs.map((tab) => {
              const isSelected = activeTabId === tab.id;
              return (
                <div
                  key={tab.id}
                  onClick={() => onSelectTab?.(tab.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    borderRadius: 6,
                    cursor: "pointer",
                    background: isSelected ? "rgba(255,45,85,0.15)" : "rgba(255,255,255,0.03)",
                    border: isSelected ? `1px solid ${ACCENT}66` : "1px solid transparent",
                    color: isSelected ? "#fff" : "rgba(255,255,255,0.6)",
                  }}
                >
                  <span>{getFileIcon(tab.name, false)}</span>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {!tab.saved && "● "}{tab.name}
                  </span>
                  {openTabs.length > 1 && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseTab?.(tab.id);
                      }}
                      style={{ fontSize: 14, opacity: 0.5, padding: "0 4px" }}
                    >
                      ×
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
