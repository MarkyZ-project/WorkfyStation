// diagnostics.js — interpreta l'output dei compilatori (GCC/Clang/javac) e di Python.

const GCC_RE = /^(?:.*[\\/])?([^\\/:\n]+):(\d+):(?:(\d+):)?\s*(fatal error|error|warning|note):\s*(.*)$/;
const PY_RE = /^\s*File "(?:.*[\\/])?([^\\/"]+)", line (\d+)/;

/** Estrae gli errori/warning da un testo di output. */
export function parseDiagnostics(text) {
  const out = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].replace(/\r$/, "");
    const m = raw.match(GCC_RE);
    if (m) {
      out.push({
        file: m[1],
        line: parseInt(m[2], 10),
        col: m[3] ? parseInt(m[3], 10) : 1,
        severity: m[4] === "warning" ? "warning" : m[4] === "note" ? "info" : "error",
        message: m[5],
      });
      continue;
    }
    const p = raw.match(PY_RE);
    if (p) {
      // il messaggio dell'errore Python è nell'ultima riga del traceback
      const msg = lines.slice(i + 1).find((l) => /^\w*(Error|Exception)\b/.test(l.trim())) || "Errore";
      out.push({ file: p[1], line: parseInt(p[2], 10), col: 1, severity: "error", message: msg.trim() });
    }
  }
  return out.filter((d) => d.severity !== "info");
}

/** Se la riga è una diagnostica, restituisce {file,line,col}, altrimenti null. */
export function lineLocation(rawLine) {
  const m = rawLine.match(GCC_RE);
  if (m) return { file: m[1], line: parseInt(m[2], 10), col: m[3] ? parseInt(m[3], 10) : 1 };
  const p = rawLine.match(PY_RE);
  if (p) return { file: p[1], line: parseInt(p[2], 10), col: 1 };
  return null;
}
