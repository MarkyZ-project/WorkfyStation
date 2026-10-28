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
  onCloseInput,
  onKill,
  onClear,
  onJumpToLocation,
}) {
  const [inputVal, setInputVal] = useState("");
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines, isWaitingForInput]);

  useEffect(() => {
    if (isWaitingForInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isWaitingForInput, lines.length]);

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
        return "rgba(255,45,85,0.75)";
      case "input":
        return "#60a5fa";
      case "info":
        return "#34d399";
      case "status":
        return "rgba(255,255,255,0.5)";
      default:
        return "#e2e8f0";
    }
  };

  const canInput = running || isWaitingForInput;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#030002",
        fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
        fontSize: 13,
        overflow: "hidden",
      }}
    >
      {/* Header */}
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
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>
          ▶ CONSOLE DI ESECUZIONE
        </span>

        {running && !isWaitingForInput && (
          <span style={{ color: "#fbbf24", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
            <span>●</span> In esecuzione...
          </span>
        )}

        {isWaitingForInput && (
          <span style={{ color: "#34d399", fontSize: 11, fontWeight: 700 }}>
            ● IN ATTESA DI INPUT (scrivi sotto e premi Invio)
          </span>
        )}

        {statusMsg && (
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginLeft: 6 }}>
            {statusMsg}
          </span>
        )}

        <div style={{ flex: 1 }} />

        {canInput && (
          <button
            onClick={onKill}
            title="Interrompi esecuzione"
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
          title="Pulisci console"
          style={{
            padding: "2px 8px",
            borderRadius: 5,
            border: `1px solid ${BORDER}`,
            background: "transparent",
            color: "rgba(255,255,255,0.45)",
            cursor: "pointer",
            fontSize: 11,
          }}
        >
          🗑 Pulisci
        </button>
      </div>

      {/* Console Lines */}
      <div
        ref={scrollRef}
        onClick={() => {
          if (canInput) inputRef.current?.focus();
        }}
        style={{
          flex: 1,
          overflow: "auto",
          padding: "10px 14px",
          lineHeight: 1.65,
        }}
      >
        {lines.length === 0 ? (
          <div style={{ color: "rgba(255,255,255,0.22)", fontStyle: "italic" }}>
            Premi ▶ Esegui (F5) per compilare ed eseguire il programma senza installare nulla.
          </div>
        ) : (
          lines.map((l, i) => {
            const loc = onJumpToLocation ? lineLocation(l.text || "") : null;
            return (
              <div
                key={i}
                style={{
                  color: getLineColor(l.type),
                  cursor: loc ? "pointer" : "text",
                  textDecoration: loc ? "underline" : "none",
                  minHeight: l.text === "" && !l.suffixInput ? 8 : "auto",
                }}
                onClick={(e) => {
                  if (loc) {
                    e.stopPropagation();
                    onJumpToLocation(loc);
                  }
                }}
                title={loc ? `Clicca per andare alla riga ${loc.line}` : undefined}
              >
                {l.type === "input" && <span style={{ color: "#60a5fa", opacity: 0.7 }}>&gt; </span>}
                <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{l.text}</span>
                {l.suffixInput !== undefined && (
                  <span style={{ color: "#60a5fa", fontWeight: 700, whiteSpace: "pre-wrap" }}>
                    {l.suffixInput}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Interactive Input Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 10px",
          background: isWaitingForInput ? "rgba(0,30,16,0.92)" : "#060003",
          borderTop: `1px solid ${isWaitingForInput ? "rgba(52,211,153,0.5)" : BORDER}`,
        }}
      >
        <span
          style={{
            color: isWaitingForInput ? "#34d399" : "rgba(255,255,255,0.25)",
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
          disabled={!canInput}
          placeholder={
            isWaitingForInput
              ? "Digita il valore per il programma e premi Invio..."
              : running
              ? "Invia input al programma e premi Invio..."
              : "Premi ▶ Esegui (F5) per avviare il programma"
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
        {canInput && (
          <>
            <button
              onClick={handleSubmitInput}
              style={{
                padding: "3px 10px",
                borderRadius: 5,
                border: `1px solid ${isWaitingForInput ? "#34d399" : BORDER}`,
                background: isWaitingForInput ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.05)",
                color: isWaitingForInput ? "#34d399" : "rgba(255,255,255,0.6)",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              Invia ↵
            </button>
            {onCloseInput && (
              <button
                onClick={onCloseInput}
                title="Fine input (EOF / Ctrl+Z)"
                style={{
                  padding: "3px 8px",
                  borderRadius: 5,
                  border: `1px solid ${BORDER}`,
                  background: "rgba(255,255,255,0.04)",
                  color: "rgba(255,255,255,0.5)",
                  cursor: "pointer",
                  fontSize: 10,
                }}
              >
                EOF
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
