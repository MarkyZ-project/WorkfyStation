import { useState, useRef, useEffect } from "react";
import { lineLocation } from "./diagnostics";

const ACCENT = "#ff2d55";
const BORDER = "rgba(255,45,85,0.18)";

export default function OutputPane({
  lines = [],
  running = false,
  statusMsg = "",
  isWaitingForInput = false,
  onSendInput,
  onKill,
  onClear,
  onJumpToLocation,
}) {
  const [inputVal, setInputVal] = useState("");
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll on new output
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines, isWaitingForInput]);

  // Focus input when waiting for input
  useEffect(() => {
    if (isWaitingForInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isWaitingForInput]);

  const handleSubmitInput = () => {
    if (!onSendInput) return;
    const text = inputVal;
    setInputVal("");
    onSendInput(text);
  };

  const getLineColor = (type) => {
    switch (type) {
      case "error":
        return "#fca5a5";
      case "warn":
        return "#fde047";
      case "system":
        return "rgba(255,45,85,0.7)";
      case "input":
        return "#60a5fa";
      case "info":
        return "#34d399";
      case "status":
        return "rgba(255,255,255,0.45)";
      default:
        return "#e2e8f0";
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#030002",
        fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
        fontSize: 12,
        overflow: "hidden",
      }}
    >
      {/* ── Output Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 10px",
          background: "#0a0005",
          borderBottom: `1px solid ${BORDER}`,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>
          ▶ OUTPUT ESECUZIONE
        </span>

        {running && (
          <span style={{ color: "#fbbf24", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
            <span>●</span> In esecuzione...
          </span>
        )}

        {isWaitingForInput && (
          <span style={{ color: "#34d399", fontSize: 11, fontWeight: 700 }}>
            ● IN ATTESA DI INPUT
          </span>
        )}

        {statusMsg && (
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginLeft: 6 }}>
            {statusMsg}
          </span>
        )}

        <div style={{ flex: 1 }} />

        {running && (
          <button
            onClick={onKill}
            title="Interrompi processo (Ctrl+C / Kill)"
            style={{
              padding: "2px 8px",
              borderRadius: 5,
              border: "1px solid #ef4444",
              background: "rgba(239,68,68,0.15)",
              color: "#fca5a5",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            ⏹ Ferma
          </button>
        )}

        <button
          onClick={onClear}
          title="Pulisci output"
          style={{
            padding: "2px 8px",
            borderRadius: 5,
            border: `1px solid ${BORDER}`,
            background: "transparent",
            color: "rgba(255,255,255,0.4)",
            cursor: "pointer",
            fontSize: 11,
          }}
        >
          🗑 Pulisci
        </button>
      </div>

      {/* ── Console Lines ── */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflow: "auto",
          padding: "8px 12px",
          lineHeight: 1.6,
        }}
      >
        {lines.length === 0 ? (
          <div style={{ color: "rgba(255,255,255,0.2)", fontStyle: "italic" }}>
            Nessun output. Premi ▶ Esegui (F5) per compilare ed eseguire il codice.
          </div>
        ) : (
          lines.map((l, i) => {
            const loc = onJumpToLocation ? lineLocation(l.text) : null;
            return (
              <div
                key={i}
                style={{
                  color: getLineColor(l.type),
                  cursor: loc ? "pointer" : "text",
                  textDecoration: loc ? "underline" : "none",
                  display: "flex",
                  gap: 6,
                }}
                onClick={() => {
                  if (loc) onJumpToLocation(loc);
                }}
                title={loc ? `Vai a riga ${loc.line}` : undefined}
              >
                {l.type === "input" && <span style={{ color: "#60a5fa" }}>&gt;</span>}
                <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{l.text}</span>
              </div>
            );
          })
        )}
      </div>

      {/* ── Interactive Input Bar (for scanf / cin / input) ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          background: isWaitingForInput ? "rgba(0,25,12,0.9)" : "#060003",
          borderTop: `1px solid ${isWaitingForInput ? "rgba(52,211,153,0.4)" : BORDER}`,
        }}
      >
        <span
          style={{
            color: isWaitingForInput ? "#34d399" : "rgba(255,255,255,0.2)",
            fontFamily: "Consolas",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {isWaitingForInput ? "▶" : "$"}
        </span>
        <input
          ref={inputRef}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmitInput();
            }
          }}
          disabled={!running && !isWaitingForInput}
          placeholder={
            isWaitingForInput
              ? "Inserisci il valore richiesto e premi Invio..."
              : running
              ? "Invia input al processo (stdin)..."
              : "Pronto per l'esecuzione"
          }
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: isWaitingForInput ? "#60a5fa" : "#e2e8f0",
            fontFamily: "inherit",
            fontSize: 13,
            caretColor: ACCENT,
          }}
        />
        {running && (
          <button
            onClick={handleSubmitInput}
            style={{
              padding: "3px 10px",
              borderRadius: 5,
              border: `1px solid ${isWaitingForInput ? "#34d399" : BORDER}`,
              background: isWaitingForInput ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.05)",
              color: isWaitingForInput ? "#34d399" : "rgba(255,255,255,0.5)",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            Invia
          </button>
        )}
      </div>
    </div>
  );
}
