import { useState, useEffect, useRef } from "react";
import { isDesktopApp, wsFiles } from "./tauriBridge";

const ACCENT = "#ff2d55";
const BORDER = "rgba(255,45,85,0.25)";

export default function QuickOpen({ isOpen, onClose, onSelectFile, openTabs = [] }) {
  const [query, setQuery] = useState("");
  const [allFiles, setAllFiles] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIdx(0);
      const tabNames = openTabs.map((t) => t.relPath || t.name);
      if (isDesktopApp()) {
        wsFiles()
          .then((files) => {
            const merged = Array.from(new Set([...tabNames, ...(files || [])]));
            setAllFiles(merged);
          })
          .catch(() => setAllFiles(tabNames));
      } else {
        setAllFiles(tabNames);
      }
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen, openTabs]);

  if (!isOpen) return null;

  const filtered = allFiles.filter((f) =>
    f.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((prev) => (filtered.length ? (prev + 1) % filtered.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((prev) => (filtered.length ? (prev - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selectedIdx]) {
        onSelectFile(filtered[selectedIdx]);
        onClose();
      }
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: "12vh",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 520,
          maxWidth: "92vw",
          background: "#0d0005",
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          boxShadow: `0 16px 48px rgba(0,0,0,0.8), 0 0 24px rgba(255,45,85,0.15)`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "10px 14px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: ACCENT, fontSize: 14 }}>📁</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIdx(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Cerca file per nome (Ctrl+P)..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#fff",
              fontSize: 14,
              fontFamily: "'Segoe UI', sans-serif",
            }}
          />
        </div>

        <div style={{ maxHeight: 320, overflow: "auto", padding: "6px 0" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "12px 16px", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
              Nessun file trovato.
            </div>
          ) : (
            filtered.map((file, i) => {
              const isSel = i === selectedIdx;
              const fileName = file.split(/[\\/]/).pop();
              const dir = file.includes("/") || file.includes("\\")
                ? file.substring(0, Math.max(file.lastIndexOf("/"), file.lastIndexOf("\\")))
                : "";
              return (
                <div
                  key={file}
                  onClick={() => {
                    onSelectFile(file);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIdx(i)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 16px",
                    cursor: "pointer",
                    background: isSel ? "rgba(255,45,85,0.2)" : "transparent",
                    color: isSel ? "#fff" : "rgba(255,255,255,0.8)",
                    fontSize: 13,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "#fff", fontWeight: 600 }}>{fileName}</span>
                    {dir && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{dir}</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
