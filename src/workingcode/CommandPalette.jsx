import { useState, useEffect, useRef } from "react";

const ACCENT = "#ff2d55";
const BORDER = "rgba(255,45,85,0.25)";

export default function CommandPalette({ isOpen, onClose, commands = [] }) {
  const [filter, setFilter] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setFilter("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = commands.filter((c) =>
    c.title.toLowerCase().includes(filter.toLowerCase()) ||
    (c.category && c.category.toLowerCase().includes(filter.toLowerCase()))
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
        filtered[selectedIdx].action();
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
          width: 540,
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
          <span style={{ color: ACCENT, fontSize: 14 }}>&gt;</span>
          <input
            ref={inputRef}
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setSelectedIdx(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Digita un comando o cerca un'azione..."
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
              Nessun comando corrispondente.
            </div>
          ) : (
            filtered.map((cmd, i) => {
              const isSel = i === selectedIdx;
              return (
                <div
                  key={i}
                  onClick={() => {
                    cmd.action();
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
                    color: isSel ? "#fff" : "rgba(255,255,255,0.75)",
                    fontSize: 13,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {cmd.category && (
                      <span style={{ fontSize: 10, color: ACCENT, textTransform: "uppercase", fontWeight: 700 }}>
                        {cmd.category}:
                      </span>
                    )}
                    <span>{cmd.title}</span>
                  </div>
                  {cmd.shortcut && (
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "Consolas" }}>
                      {cmd.shortcut}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
