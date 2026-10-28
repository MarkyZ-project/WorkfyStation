// wcCompiler.js — Gestione avanzata compilatori per WorkingCode

export const COMPILERS_BY_LANG = {
  c: [
    { id: "gcc-head-c",    label: "GCC (Latest · C23)",     short: "GCC Latest", version: "Latest" },
    { id: "gcc-13.2.0-c",  label: "GCC 13.2 (Standard C17)",short: "GCC 13.2",   version: "13.2.0" },
    { id: "gcc-12.3.0-c",  label: "GCC 12.3 (C11/C17)",     short: "GCC 12.3",   version: "12.3.0" },
    { id: "gcc-11.4.0-c",  label: "GCC 11.4 (Scuola/C99)",  short: "GCC 11.4",   version: "11.4.0" },
    { id: "clang-head-c",  label: "Clang (LLVM Latest)",    short: "Clang",      version: "Latest" },
    { id: "clang-17.0.1-c",label: "Clang 17.0.1",           short: "Clang 17",   version: "17.0.1" },
  ],
  cpp: [
    { id: "gcc-head",      label: "G++ (Latest · C++23)",   short: "G++ Latest", version: "Latest" },
    { id: "gcc-13.2.0",    label: "G++ 13.2 (C++20)",       short: "G++ 13.2",   version: "13.2.0" },
    { id: "gcc-11.4.0",    label: "G++ 11.4 (C++17)",       short: "G++ 11.4",   version: "11.4.0" },
    { id: "clang-head",    label: "Clang++ (LLVM Latest)",  short: "Clang++",    version: "Latest" },
    { id: "clang-17.0.1",  label: "Clang++ 17.0.1",         short: "Clang++ 17", version: "17.0.1" },
  ],
  java: [
    { id: "openjdk-jdk-22+36", label: "OpenJDK 22",         short: "Java 22",    version: "22" },
    { id: "openjdk-jdk-21+35", label: "OpenJDK 21 (LTS)",   short: "Java 21",    version: "21" },
  ],
  python: [
    { id: "cpython-head",      label: "Python 3 (Interprete)", short: "Python 3",   version: "3.x" },
  ],
};

export const C_STANDARDS = [
  { id: "-std=c17", label: "C17 (Consigliato)" },
  { id: "-std=c11", label: "C11" },
  { id: "-std=c99", label: "C99 (Didattico)" },
  { id: "-std=c89", label: "C89 / ANSI C" },
  { id: "-std=c2x", label: "C23 (Moderno)" },
];

export const WARNING_FLAGS = [
  { id: "-Wall", label: "-Wall (Tutti i warning)" },
  { id: "-Wextra", label: "-Wextra (Warning aggiuntivi)" },
];

const PREF_COMPILER_KEY = "wc_preferred_compiler_";
const PREF_OPTIONS_KEY  = "wc_compiler_options_";

export function getPreferredCompiler(langId) {
  try {
    const saved = localStorage.getItem(PREF_COMPILER_KEY + langId);
    const list = COMPILERS_BY_LANG[langId] || [];
    if (saved && list.some(c => c.id === saved)) return saved;
    return list[0]?.id || (langId === "python" ? "cpython-head" : "gcc-head-c");
  } catch {
    return (COMPILERS_BY_LANG[langId] || [])[0]?.id || "gcc-head-c";
  }
}

export function setPreferredCompiler(langId, compilerId) {
  try { localStorage.setItem(PREF_COMPILER_KEY + langId, compilerId); } catch {}
}

export function getCompilerOptions(langId) {
  try {
    const saved = localStorage.getItem(PREF_OPTIONS_KEY + langId);
    if (saved !== null) return saved;
  } catch {}
  return langId === "c" ? "-std=c17\n-Wall" : langId === "cpp" ? "-std=c++20\n-Wall" : "";
}

export function setCompilerOptions(langId, optsString) {
  try { localStorage.setItem(PREF_OPTIONS_KEY + langId, optsString); } catch {}
}

export function codeNeedsInput(code, langId) {
  if (!code) return false;
  if (langId === "c")    return /scanf\s*\(|gets\s*\(|getchar\s*\(/.test(code);
  if (langId === "cpp")  return /cin\s*>>|getline\s*\(\s*cin|scanf\s*\(/.test(code);
  if (langId === "java") return /\.next\w*\s*\(/.test(code);
  if (langId === "python") return /input\s*\(/.test(code);
  return false;
}

export function makeInteractive(code, langId) {
  if (langId !== "c" && langId !== "cpp") return code;
  const lines = code.split("\n");
  const result = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const indent = lines[i].match(/^(\s*)/)[1];

    const isScanf = langId === "c"
      ? /^scanf\s*\(/.test(trimmed)
      : /^(scanf\s*\(|cin\s*>>|getline\s*\(\s*cin)/.test(trimmed);

    if (isScanf) {
      let prevHasNewline = false;
      for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
        const pLine = lines[j].trim();
        if (pLine === "" || pLine.startsWith("//") || pLine.startsWith("}") || pLine.startsWith("{")) continue;
        if (pLine.includes("printf") || pLine.includes("cout") || pLine.includes("puts")) {
          if (pLine.includes('\\n"') || pLine.includes('\\n\\') || pLine.includes("endl") || pLine.includes("puts")) {
            prevHasNewline = true;
          }
          break;
        }
        break;
      }

      if (!prevHasNewline) {
        if (langId === "c") result.push(indent + 'printf("\\n");');
        else result.push(indent + 'cout << "\\n";');
      }
      if (langId === "c") result.push(indent + "fflush(stdout);");
      else result.push(indent + "cout.flush();");
    }

    result.push(lines[i]);
  }

  return result.join("\n");
}

export async function wandboxRun(compiler, code, stdin = "", options = "") {
  const payload = {
    compiler,
    code,
    stdin: stdin || "",
  };

  if (options && options.trim()) {
    // Wandbox options must be newline-separated
    const cleaned = options.split(/[\r\n]+|\s+/).filter(Boolean).join("\n");
    if (cleaned) payload["compiler-option-raw"] = cleaned;
  }

  const res = await fetch("https://wandbox.org/api/compile.json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Risposta non valida dal compilatore:\n" + text.substring(0, 500));
  }

  if (!res.ok) {
    throw new Error("Errore server " + res.status + ": " + (data.message || text));
  }

  return data;
}

export function findPromptIndices(outputText) {
  const lines = outputText.split("\n");
  const indices = [];
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trimEnd();
    if (t.length > 1 && (t.endsWith(":") || t.endsWith("?"))) {
      indices.push(i);
    }
  }
  return indices;
}
