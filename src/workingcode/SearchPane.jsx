import { useState } from "react";
import { isDesktopApp, wsGrep } from "./tauriBridge";

const ACCENT = "#ff2d55";
const BORDER = "rgba(255,45,85,0.18)";

export default function SearchPane({ onOpenFileAndLine, openTabs = [] }) {
  const [query, setQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSearched(true);
    setResults([]);

    try {
      if (isDesktopApp()) {
        const matches = await wsGrep(q, caseSensitive);
        setResults(matches || []);
      } else {
        // In-memory search across openTabs
        const out = [];
        for (const tab of openTabs) {
          const lines = (tab.code || "").split("\n");
          for (let i = 0; i < lines.length; i++) {
            const lineText = lines[i];
            const found = caseSensitive
              ? lineText.includes(q)
              : lineText.toLowerCase().includes(q.toLowerCase());
            if (found) {
              const col = (caseSensitive ? lineText : lineText.toLowerCase()).indexOf(
                caseSensitive ? q : q.toLowerCase()
              );
              out.push({
                file: tab.name,
                line: i + 1,
                col: col + 1,
                text: lineText.trim(),
                isTab: true,
                tabId: tab.id,
              });
            }
          }
        }
        setResults(out);
      }
    } catch (e) {
      alert("Errore ricerca: " + (e.message || e));
    } finally {
      setSearching(false);
    }
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
      {/* ── Search Header ── */}
      <div
        style={{
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
          Cerca nei File
        </span>

        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", gap: 4 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              placeholder="Cerca testo..."
              style={{
                flex: 1,
                padding: "6px 8px",
                borderRadius: 6,
                border: `1px solid ${BORDER}`,
                background: "#160007",
                color: "#fff",
                fontSize: 12,
                outline: "none",
              }}
            />
            <button
              onClick={handleSearch}
              disabled={searching}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: "none",
                background: `linear-gradient(135deg, ${ACCENT}, #ff0020)`,
                color: "#fff",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {searching ? "..." : "🔍"}
            </button>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "rgba(255,255,255,0.5)",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
              style={{ accentColor: ACCENT }}
            />
            Maiuscole/minuscole esatte (Aa)
          </label>
        </div>
      </div>

      {/* ── Results ── */}
      <div style={{ flex: 1, overflow: "auto", padding: "6px 0" }}>
        {searched && (
          <div
            style={{
              padding: "4px 12px 8px",
              fontSize: 11,
              color: "rgba(255,255,255,0.4)",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            {results.length} risultati trovati
          </div>
        )}

        {results.map((r, i) => (
          <div
            key={i}
            onClick={() => onOpenFileAndLine?.(r)}
            style={{
              padding: "6px 12px",
              cursor: "pointer",
              borderBottom: "1px solid rgba(255,255,255,0.03)",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div style={{ display: "flex", justifyContent: "space-between", color: ACCENT }}>
              <span style={{ fontWeight: 600 }}>{r.file}</span>
              <span style={{ fontSize: 10, opacity: 0.6 }}>
                {r.line}:{r.col}
              </span>
            </div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.7)",
                fontFamily: "Consolas",
                marginTop: 2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {r.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
