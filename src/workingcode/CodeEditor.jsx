import { useState, useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from "react";
import { tokenize, TOKEN_COLORS } from "./highlight";

const ACCENT = "#ff2d55";
const BG = "#070002";
const BG_GUTTER = "#0e0005";
const BORDER = "rgba(255,45,85,0.18)";

const PAIRS = {
  "(": ")",
  "[": "]",
  "{": "}",
  '"': '"',
  "'": "'",
  "`": "`",
};

const CLOSERS = new Set([")", "]", "}", '"', "'", "`"]);

const CodeEditor = forwardRef(function CodeEditor(
  {
    code = "",
    onChange,
    langId = "c",
    fontSize = 14,
    diagnostics = [],
    onCursorChange,
    readOnly = false,
  },
  ref
) {
  const textareaRef = useRef(null);
  const preRef = useRef(null);
  const gutterRef = useRef(null);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  const lines = code.split("\n");

  // Diagnostics map per line
  const diagByLine = {};
  for (const d of diagnostics) {
    if (d.line && (!diagByLine[d.line] || d.severity === "error")) {
      diagByLine[d.line] = d;
    }
  }

  // Sync scroll
  const syncScroll = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    if (preRef.current) {
      preRef.current.scrollTop = ta.scrollTop;
      preRef.current.scrollLeft = ta.scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = ta.scrollTop;
    }
  };

  // Track cursor
  const updateCursor = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart || 0;
    const textBefore = ta.value.substring(0, pos);
    const lineArr = textBefore.split("\n");
    const line = lineArr.length;
    const col = lineArr[lineArr.length - 1].length + 1;
    const cur = { line, col };
    setCursorPos(cur);
    onCursorChange?.(cur);
  }, [onCursorChange]);

  // Expose gotoLine via ref
  useImperativeHandle(ref, () => ({
    gotoLine: (line, col = 1) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const allLines = ta.value.split("\n");
      const targetLine = Math.max(1, Math.min(line, allLines.length));
      let charIdx = 0;
      for (let i = 0; i < targetLine - 1; i++) {
        charIdx += allLines[i].length + 1;
      }
      charIdx += Math.max(0, col - 1);
      ta.focus();
      ta.setSelectionRange(charIdx, charIdx);
      updateCursor();
      const lineHeightPx = fontSize * 1.6;
      ta.scrollTop = Math.max(0, (targetLine - 3) * lineHeightPx);
    },
    insertText: (text) => {
      const ta = textareaRef.current;
      if (!ta) return;
      insertAtCursor(text);
    },
    focus: () => {
      textareaRef.current?.focus();
    },
  }));

  const insertAtCursor = (insertStr, cursorOffset = insertStr.length) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const oldVal = ta.value;

    let success = false;
    try {
      ta.focus();
      success = document.execCommand("insertText", false, insertStr);
    } catch {}

    if (!success) {
      const newVal = oldVal.substring(0, start) + insertStr + oldVal.substring(end);
      onChange?.(newVal);
      setTimeout(() => {
        ta.selectionStart = ta.selectionEnd = start + cursorOffset;
        updateCursor();
      }, 0);
    } else {
      setTimeout(() => {
        ta.selectionStart = ta.selectionEnd = start + cursorOffset;
        updateCursor();
      }, 0);
    }
  };

  const handleKeyDown = (e) => {
    const ta = textareaRef.current;
    if (!ta) return;

    // Tab indentation
    if (e.key === "Tab") {
      e.preventDefault();
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      if (e.shiftKey) {
        // Unindent
        const before = ta.value.substring(0, start);
        const lineStart = before.lastIndexOf("\n") + 1;
        const lineText = ta.value.substring(lineStart, end);
        if (lineText.startsWith("    ")) {
          const newVal = ta.value.substring(0, lineStart) + ta.value.substring(lineStart + 4);
          onChange?.(newVal);
          setTimeout(() => {
            ta.selectionStart = Math.max(lineStart, start - 4);
            ta.selectionEnd = Math.max(lineStart, end - 4);
            updateCursor();
          }, 0);
        }
      } else {
        insertAtCursor("    ");
      }
      return;
    }

    // Auto-indent on Enter
    if (e.key === "Enter" && !e.shiftKey) {
      const start = ta.selectionStart;
      const before = ta.value.substring(0, start);
      const curLine = before.split("\n").pop() || "";
      const indentMatch = curLine.match(/^(\s*)/);
      let indent = indentMatch ? indentMatch[1] : "";
      const trimmed = curLine.trim();

      const opensBlock =
        trimmed.endsWith("{") ||
        trimmed.endsWith(":") ||
        (trimmed.endsWith("(") && !trimmed.endsWith("()"));

      e.preventDefault();
      const extra = opensBlock ? "    " : "";
      insertAtCursor("\n" + indent + extra);
      return;
    }

    // Auto-close brackets and quotes
    if (PAIRS[e.key] && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const open = e.key;
      const close = PAIRS[open];
      const start = ta.selectionStart;
      const end = ta.selectionEnd;

      if (start !== end) {
        e.preventDefault();
        const selected = ta.value.substring(start, end);
        insertAtCursor(open + selected + close, selected.length + 1);
        return;
      }

      const nextChar = ta.value[start];
      if (open === nextChar && CLOSERS.has(open)) {
        e.preventDefault();
        ta.selectionStart = ta.selectionEnd = start + 1;
        updateCursor();
        return;
      }

      e.preventDefault();
      insertAtCursor(open + close, 1);
      return;
    }

    // Skip over closing bracket if typed
    if (CLOSERS.has(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const start = ta.selectionStart;
      if (ta.value[start] === e.key) {
        e.preventDefault();
        ta.selectionStart = ta.selectionEnd = start + 1;
        updateCursor();
        return;
      }
    }

    // Backspace: delete pair if empty
    if (e.key === "Backspace") {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      if (start === end && start > 0) {
        const prev = ta.value[start - 1];
        const next = ta.value[start];
        if (PAIRS[prev] && PAIRS[prev] === next) {
          e.preventDefault();
          const newVal = ta.value.substring(0, start - 1) + ta.value.substring(start + 1);
          onChange?.(newVal);
          setTimeout(() => {
            ta.selectionStart = ta.selectionEnd = start - 1;
            updateCursor();
          }, 0);
          return;
        }
      }
    }

    // Ctrl+/ or Cmd+/ Comment Toggle
    if ((e.ctrlKey || e.metaKey) && e.key === "/") {
      e.preventDefault();
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const before = ta.value.substring(0, start);
      const lineStart = before.lastIndexOf("\n") + 1;
      const after = ta.value.substring(end);
      const nextNewline = after.indexOf("\n");
      const lineEnd = nextNewline === -1 ? ta.value.length : end + nextNewline;
      const fullLine = ta.value.substring(lineStart, lineEnd);

      const prefix = langId === "python" ? "# " : "// ";
      let newLine;
      if (fullLine.trimStart().startsWith(prefix.trim())) {
        newLine = fullLine.replace(prefix, "").replace(prefix.trim(), "");
      } else {
        const m = fullLine.match(/^(\s*)/);
        const ind = m ? m[1] : "";
        newLine = ind + prefix + fullLine.substring(ind.length);
      }
      const newVal = ta.value.substring(0, lineStart) + newLine + ta.value.substring(lineEnd);
      onChange?.(newVal);
      setTimeout(() => {
        ta.selectionStart = ta.selectionEnd = Math.min(newVal.length, start + prefix.length);
        updateCursor();
      }, 0);
      return;
    }
  };

  // Syntax highlighting tokens
  const tokens = tokenize(code, langId);
  const lineHeight = fontSize * 1.6;

  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        position: "relative",
        background: BG,
        overflow: "hidden",
        fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
        fontSize,
      }}
    >
      {/* ── Line Numbers & Diagnostics Gutter ── */}
      <div
        ref={gutterRef}
        style={{
          width: 52,
          flexShrink: 0,
          background: BG_GUTTER,
          borderRight: `1px solid ${BORDER}`,
          padding: "12px 0",
          userSelect: "none",
          overflow: "hidden",
          textAlign: "right",
          color: "rgba(255,45,85,0.35)",
          boxSizing: "border-box",
          lineHeight: `${lineHeight}px`,
        }}
      >
        {lines.map((_, i) => {
          const lNum = i + 1;
          const isCurrent = cursorPos.line === lNum;
          const diag = diagByLine[lNum];
          return (
            <div
              key={i}
              style={{
                height: lineHeight,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                paddingRight: 10,
                paddingLeft: 4,
                color: diag
                  ? diag.severity === "error"
                    ? "#ef4444"
                    : "#f59e0b"
                  : isCurrent
                  ? ACCENT
                  : "rgba(255,255,255,0.22)",
                fontWeight: isCurrent ? 700 : 400,
                background: isCurrent ? "rgba(255,45,85,0.06)" : "transparent",
              }}
              title={diag ? `[${diag.severity.toUpperCase()}] ${diag.message}` : undefined}
            >
              {diag && (
                <span
                  style={{
                    fontSize: 8,
                    marginRight: 4,
                    color: diag.severity === "error" ? "#ef4444" : "#f59e0b",
                  }}
                >
                  ●
                </span>
              )}
              <span>{lNum}</span>
            </div>
          );
        })}
      </div>

      {/* ── Editor Canvas: Pre Layer + Textarea Overlay ── */}
      <div style={{ position: "relative", flex: 1, overflow: "hidden", minWidth: 0 }}>
        {/* Syntax Highlighted PRE Background */}
        <pre
          ref={preRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            margin: 0,
            padding: "12px 16px",
            lineHeight: `${lineHeight}px`,
            fontFamily: "inherit",
            fontSize: "inherit",
            overflow: "hidden",
            whiteSpace: "pre",
            wordWrap: "normal",
            pointerEvents: "none",
            boxSizing: "border-box",
            tabSize: 4,
            color: "#f8f8f8",
          }}
        >
          {tokens.map(([cls, txt], idx) => {
            const color = cls ? TOKEN_COLORS[cls] : undefined;
            return color ? (
              <span key={idx} style={{ color }}>
                {txt}
              </span>
            ) : (
              <span key={idx}>{txt}</span>
            );
          })}
          {code.endsWith("\n") && " "}
        </pre>

        {/* Transparent Interactive Textarea Foreground */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => {
            onChange?.(e.target.value);
            updateCursor();
          }}
          onScroll={syncScroll}
          onKeyDown={handleKeyDown}
          onClick={updateCursor}
          onKeyUp={updateCursor}
          readOnly={readOnly}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          style={{
            position: "absolute",
            inset: 0,
            margin: 0,
            padding: "12px 16px",
            lineHeight: `${lineHeight}px`,
            fontFamily: "inherit",
            fontSize: "inherit",
            border: "none",
            outline: "none",
            resize: "none",
            background: "transparent",
            color: "transparent",
            caretColor: "#ff2d55",
            whiteSpace: "pre",
            wordWrap: "normal",
            overflow: "auto",
            boxSizing: "border-box",
            tabSize: 4,
          }}
        />
      </div>
    </div>
  );
});

export default CodeEditor;
