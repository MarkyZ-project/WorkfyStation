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

export function getFileIcon(name, isDir, isOpen = false) {
  if (isDir) return isOpen ? "📂" : "📁";
  const ext = (name || "").split(".").pop().toLowerCase();
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
  onWorkspaceChange,
}) {
  const isDesktop = isDesktopApp();
  const [ws, setWs] = useState(null); // { name, path } | null
  const [tree, setTree] = useState({}); // { [relDir]: Entry[] }
  const [expanded, setExpanded] = useState(() => new Set([""]));
  const [recents, setRecents] = useState([]);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(null); // { parentRel, isDir } | null
  const [createName, setCreateName] = useState("");

  const loadDir = useCallback(async (rel) => {
    const list = await wsList(rel);
    setTree((prev) => ({ ...prev, [rel]: Array.isArray(list) ? list : [] }));
  }, []);

  const refresh = useCallback(async () => {
    if (!isDesktop) return;
    setError("");
    try {
      const info = await wsInfo();
      if (info && info.path) {
        setWs(info);
        onWorkspaceChange?.(info);
        const dirs = Array.from(expanded);
        if (!dirs.includes("")) dirs.push("");
        const nextTree = {};
        for (const d of dirs) {
          try {
            nextTree[d] = await wsList(d);
          } catch {
            nextTree[d] = [];
          }
        }
        setTree(nextTree);
      } else {
        setWs(null);
        onWorkspaceChange?.(null);
        setTree({});
        const rec = await wsRecent();
        setRecents(Array.isArray(rec) ? rec : []);
      }
    } catch (e) {
      setError(e.message || String(e));
    }
  }, [isDesktop, expanded, onWorkspaceChange]);

  useEffect(() => {
    refresh();
  }, [isDesktop]);

  const handleOpenFolder = async () => {
    setError("");
    try {
      const res = await wsOpen();
      if (res && res.path) {
        setExpanded(new Set([""]));
        await refresh();
      }
    } catch (e) {
      setError("Errore apertura cartella: " + (e.message || e));
    }
  };

  const handleReopen = async (path) => {
    setError("");
    try {
      await wsReopen(path);
      setExpanded(new Set([""]));
      await refresh();
    } catch (e) {
      setError("Impossibile aprire: " + (e.message || e));
    }
  };

  const handleCloseWorkspace = async () => {
    try {
      await wsClose();
      setExpanded(new Set([""]));
      await refresh();
    } catch (e) {
      setError(e.message || String(e));
    }
  };

  const toggleDir = async (rel) => {
    const next = new Set(expanded);
    if (next.has(rel)) {
      next.delete(rel);
      setExpanded(next);
    } else {
      next.add(rel);
      setExpanded(next);
      try {
        await loadDir(rel);
      } catch (e) {
        setError(e.message || String(e));
      }
    }
  };

  const startCreate = (parentRel, isDir) => {
    setCreating({ parentRel, isDir });
    setCreateName(isDir ? "nuova_cartella" : "nuovo.c");
  };

  const submitCreate = async () => {
    if (!creating) return;
    const name = createName.trim();
    const { parentRel, isDir } = creating;
    setCreating(null);
    setCreateName("");
    if (!name) return;
    const rel = parentRel ? `${parentRel}/${name}` : name;
    try {
      await wsCreate(rel, isDir);
      await refresh();
      if (!isDir) onOpenFile?.(rel);
    } catch (e) {
      setError(e.message || String(e));
    }
  };

  const handleRename = async (e, rel) => {
    e.stopPropagation();
    const oldBase = rel.split("/").pop();
    const newName = window.prompt("Rinomina in:", oldBase);
    if (!newName || !newName.trim() || newName.trim() === oldBase) return;
    const parent = rel.includes("/") ? rel.substring(0, rel.lastIndexOf("/")) : "";
    const target = parent ? `${parent}/${newName.trim()}` : newName.trim();
    try {
      await wsRename(rel, target);
      await refresh();
    } catch (err) {
      setError(err.message || String(err));
    }
  };

  const handleDelete = async (e, rel) => {
    e.stopPropagation();
    if (!window.confirm(`Spostare "${rel}" nel Cestino?`)) return;
    try {
      await wsDelete(rel);
      await refresh();
    } catch (err) {
      setError(err.message || String(err));
    }
  };

  const renderNodes = (parentRel, depth) => {
    const entries = tree[parentRel] || [];
    return entries.map((item) => {
      const rel = parentRel ? `${parentRel}/${item.name}` : item.name;
      const isDir = !!item.is_dir;
      const isOpen = isDir && expanded.has(rel);
      const isSelected = !isDir && activeFileRel === rel;
      return (
        <div key={rel}>
          <div
            onClick={() => (isDir ? toggleDir(rel) : onOpenFile?.(rel))}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: `5px 10px 5px ${14 + depth * 14}px`,
              cursor: "pointer",
              background: isSelected ? "rgba(255,45,85,0.16)" : "transparent",
              borderLeft: isSelected ? `2px solid ${ACCENT}` : "2px solid transparent",
              color: isSelected ? "#ffffff" : "rgba(255,255,255,0.8)",
              fontSize: 12,
            }}
            onMouseEnter={(e) => {
              if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            }}
            onMouseLeave={(e) => {
              if (!isSelected) e.currentTarget.style.background = "transparent";
            }}
          >
            <span style={{ fontSize: 12 }}>{getFileIcon(item.name, isDir, isOpen)}</span>
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.name}
            </span>
            {isDir && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isOpen) toggleDir(rel);
                  startCreate(rel, false);
                }}
                title="Nuovo file qui"
                style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.45)", cursor: "pointer", fontSize: 10, padding: 2 }}
              >
                +
              </button>
            )}
            <button
              onClick={(e) => handleRename(e, rel)}
              title="Rinomina"
              style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.45)", cursor: "pointer", fontSize: 10, padding: 2 }}
            >
              ✏️
            </button>
            <button
              onClick={(e) => handleDelete(e, rel)}
              title="Sposta nel Cestino"
              style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", fontSize: 10, padding: 2 }}
            >
              🗑
            </button>
          </div>
          {isOpen && renderNodes(rel, depth + 1)}
        </div>
      );
    });
  };

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
      {/* Header */}
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
        <span style={{ fontWeight: 700, letterSpacing: 0.5, color: "rgba(255,255,255,0.85)", fontSize: 11, textTransform: "uppercase" }}>
          Esplora Risorse
        </span>
        {isDesktop && ws && (
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => startCreate("", false)} title="Nuovo File" style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", padding: "2px 4px", fontSize: 12 }}>
              📄+
            </button>
            <button onClick={() => startCreate("", true)} title="Nuova Cartella" style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", padding: "2px 4px", fontSize: 12 }}>
              📁+
            </button>
            <button onClick={refresh} title="Aggiorna" style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", padding: "2px 4px", fontSize: 12 }}>
              🔄
            </button>
            <button onClick={handleCloseWorkspace} title="Chiudi Cartella" style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.45)", cursor: "pointer", padding: "2px 4px", fontSize: 12 }}>
              ✕
            </button>
          </div>
        )}
      </div>

      {error && (
        <div
          onClick={() => setError("")}
          style={{ padding: "7px 12px", background: "rgba(239,68,68,0.12)", borderBottom: "1px solid #ef4444", color: "#fca5a5", fontSize: 11, cursor: "pointer" }}
        >
          {error}
        </div>
      )}

      {creating && (
        <div style={{ padding: "8px 10px", background: "#140007", borderBottom: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 10, color: ACCENT, fontWeight: 700 }}>
            {creating.isDir ? "NUOVA CARTELLA" : "NUOVO FILE"} {creating.parentRel ? `in ${creating.parentRel}` : ""}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <input
              autoFocus
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitCreate();
                if (e.key === "Escape") setCreating(null);
              }}
              style={{ flex: 1, padding: "4px 6px", borderRadius: 5, border: `1px solid ${BORDER}`, background: "#090003", color: "#fff", fontSize: 12, outline: "none" }}
            />
            <button onClick={submitCreate} style={{ padding: "4px 8px", borderRadius: 5, border: "none", background: ACCENT, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              OK
            </button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflow: "auto", padding: "6px 0" }}>
        {/* Open Editors list */}
        <div style={{ padding: "4px 12px", fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: 1, fontWeight: 700 }}>
          EDITOR APERTI ({openTabs.length})
        </div>
        {openTabs.map((tab) => {
          const isSel = activeTabId === tab.id;
          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab?.(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 12px 4px 18px",
                cursor: "pointer",
                background: isSel ? "rgba(255,45,85,0.14)" : "transparent",
                color: isSel ? "#fff" : "rgba(255,255,255,0.65)",
                fontSize: 12,
              }}
            >
              <span>{getFileIcon(tab.name, false)}</span>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {!tab.saved && <span style={{ color: ACCENT }}>● </span>}
                {tab.name}
              </span>
              {openTabs.length > 1 && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab?.(tab.id);
                  }}
                  style={{ fontSize: 13, opacity: 0.5, padding: "0 3px" }}
                >
                  ×
                </span>
              )}
            </div>
          );
        })}

        <div style={{ height: 1, background: BORDER, margin: "8px 0" }} />

        {/* Workspace folder tree */}
        {isDesktop && ws ? (
          <div>
            <div
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", fontWeight: 700, color: ACCENT, fontSize: 11 }}
              title={ws.path}
            >
              <span>📂</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {ws.name}
              </span>
            </div>
            {(tree[""] || []).length === 0 ? (
              <div style={{ padding: "10px 16px", color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>
                Cartella vuota. Clicca 📄+ per creare un file.
              </div>
            ) : (
              renderNodes("", 0)
            )}
          </div>
        ) : isDesktop ? (
          <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ color: "rgba(255,255,255,0.45)", lineHeight: 1.5, fontSize: 11 }}>
              Puoi programmare subito negli editor aperti oppure aprire una cartella del PC.
            </div>
            <button
              onClick={handleOpenFolder}
              style={{
                padding: "8px 12px",
                borderRadius: 7,
                border: "none",
                background: `linear-gradient(135deg, ${ACCENT}, #ff0020)`,
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              📂 Apri Cartella...
            </button>
            {recents.length > 0 && (
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: 1, marginBottom: 6 }}>
                  CARTELLE RECENTI
                </div>
                {recents.map((r) => {
                  const path = typeof r === "string" ? r : r.path;
                  const name = typeof r === "string" ? r.split(/[\\/]/).filter(Boolean).pop() : r.name;
                  if (!path) return null;
                  return (
                    <div
                      key={path}
                      onClick={() => handleReopen(path)}
                      style={{ padding: "6px 8px", borderRadius: 6, cursor: "pointer", background: "rgba(255,255,255,0.03)", marginBottom: 4 }}
                      title={path}
                    >
                      <div style={{ fontWeight: 600, color: "#fff" }}>📁 {name}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {path}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: "8px 14px", color: "rgba(255,255,255,0.45)", fontSize: 11, lineHeight: 1.5 }}>
            I tuoi file sono salvati automaticamente nel browser. Usa il menu <strong>+ Nuovo File</strong> in alto per aggiungere altre schede.
          </div>
        )}
      </div>
    </div>
  );
}
