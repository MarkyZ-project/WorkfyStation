const ACCENT = "#ff2d55";
const BORDER = "rgba(255,45,85,0.18)";

export default function ProblemsPane({ diagnostics = [], onJumpToDiagnostic }) {
  const errorCount = diagnostics.filter((d) => d.severity === "error").length;
  const warnCount = diagnostics.filter((d) => d.severity === "warning").length;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#030002",
        color: "#f1f5f9",
        fontSize: 12,
        overflow: "hidden",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "5px 12px",
          background: "#0a0005",
          borderBottom: `1px solid ${BORDER}`,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>
          ⚠️ PROBLEMI ({diagnostics.length})
        </span>
        <div style={{ display: "flex", gap: 8, fontSize: 11 }}>
          <span style={{ color: errorCount > 0 ? "#ef4444" : "rgba(255,255,255,0.3)" }}>
            ❌ {errorCount} Errori
          </span>
          <span style={{ color: warnCount > 0 ? "#f59e0b" : "rgba(255,255,255,0.3)" }}>
            ⚠️ {warnCount} Avvisi
          </span>
        </div>
      </div>

      {/* ── Problem list ── */}
      <div style={{ flex: 1, overflow: "auto", padding: "6px 0" }}>
        {diagnostics.length === 0 ? (
          <div
            style={{
              padding: "16px 20px",
              color: "rgba(255,255,255,0.3)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontStyle: "italic",
            }}
          >
            <span style={{ color: "#34d399", fontStyle: "normal" }}>✓</span> Nessun problema rilevato nell'ultima compilazione.
          </div>
        ) : (
          diagnostics.map((d, i) => {
            const isErr = d.severity === "error";
            return (
              <div
                key={i}
                onClick={() => onJumpToDiagnostic?.(d)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: "6px 14px",
                  cursor: "pointer",
                  borderBottom: "1px solid rgba(255,255,255,0.03)",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ fontSize: 13, flexShrink: 0 }}>{isErr ? "❌" : "⚠️"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: isErr ? "#fca5a5" : "#fde047", lineHeight: 1.4 }}>
                    {d.message}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "rgba(255,255,255,0.35)",
                      marginTop: 2,
                      fontFamily: "Consolas",
                    }}
                  >
                    {d.file || "file"} [{d.line}:{d.col || 1}]
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
