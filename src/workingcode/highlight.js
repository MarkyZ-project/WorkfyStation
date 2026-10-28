// highlight.js — tokenizer leggero per C, C++, Java e Python.
// Restituisce una lista di [classe, testo]: il rendering usa elementi React (nessun innerHTML).

const C_KW = "auto break case const continue default do else enum extern for goto if inline register restrict return sizeof static struct switch typedef union volatile while true false NULL";
const C_TY = "char double float int long short signed unsigned void bool _Bool size_t FILE int8_t int16_t int32_t int64_t uint8_t uint16_t uint32_t uint64_t";
const CPP_KW = C_KW + " class namespace template typename public private protected virtual override final new delete this using try catch throw nullptr constexpr noexcept explicit friend operator mutable static_cast dynamic_cast const_cast reinterpret_cast decltype";
const CPP_TY = C_TY + " string vector map set unordered_map unordered_set pair array list queue stack deque wstring auto cout cin cerr endl";
const JAVA_KW = "abstract assert break case catch class const continue default do else enum extends final finally for goto if implements import instanceof interface native new package private protected public return static strictfp super switch synchronized this throw throws transient try volatile while true false null var record";
const JAVA_TY = "boolean byte char double float int long short void String Integer Double Long Boolean Character Object List ArrayList Map HashMap Set HashSet Scanner System Math";
const PY_KW = "and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield True False None self";
const PY_TY = "int float str list dict set tuple bool bytes range len print input open type object";

const set = (s) => new Set(s.split(" "));
const LANGS = {
  c:      { kw: set(C_KW),    ty: set(C_TY),    pp: true,  re: null },
  cpp:    { kw: set(CPP_KW),  ty: set(CPP_TY),  pp: true,  re: null },
  java:   { kw: set(JAVA_KW), ty: set(JAVA_TY), pp: false, re: null },
  python: { kw: set(PY_KW),   ty: set(PY_TY),   pp: false, re: null },
};

const NUM = String.raw`\b(?:0[xX][0-9a-fA-F]+|0[bB][01]+|\d+\.?\d*(?:[eE][+-]?\d+)?)[fFlLuU]*\b`;
const C_STYLE = new RegExp(
  [
    String.raw`(\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$))`,        // 1 commento
    String.raw`("(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?)`, // 2 stringa/char
    String.raw`(^[ \t]*#[ \t]*\w+[^\n]*)`,                   // 3 preprocessore
    `(${NUM})`,                                              // 4 numero
    String.raw`([A-Za-z_$][\w$]*)`,                          // 5 identificatore
  ].join("|"),
  "gm"
);
const PY_STYLE = new RegExp(
  [
    String.raw`(#[^\n]*)`,
    String.raw`("""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?)`,
    String.raw`(^[ \t]*@\w[\w.]*)`,
    `(${NUM})`,
    String.raw`([A-Za-z_][\w]*)`,
  ].join("|"),
  "gm"
);

const MAX_HIGHLIGHT_CHARS = 250_000;

export function tokenize(code, langId) {
  const lang = LANGS[langId];
  if (!lang || code.length > MAX_HIGHLIGHT_CHARS) return [["", code]];
  const re = langId === "python" ? PY_STYLE : C_STYLE;
  re.lastIndex = 0;
  const out = [];
  let last = 0;
  let m;
  const push = (cls, text) => {
    if (!text) return;
    const prev = out[out.length - 1];
    if (prev && prev[0] === cls) prev[1] += text;
    else out.push([cls, text]);
  };
  while ((m = re.exec(code)) !== null) {
    if (m.index > last) push("", code.slice(last, m.index));
    const text = m[0];
    if (m[1] !== undefined) push("cm", text);
    else if (m[2] !== undefined) push("st", text);
    else if (m[3] !== undefined) push(langId === "python" ? "pp" : lang.pp ? "pp" : "", text);
    else if (m[4] !== undefined) push("nu", text);
    else if (m[5] !== undefined) {
      if (lang.kw.has(text)) push("kw", text);
      else if (lang.ty.has(text)) push("ty", text);
      else if (code[m.index + text.length] === "(") push("fn", text);
      else if (/^[A-Z][A-Za-z0-9_]*$/.test(text) && langId !== "python" && text.length > 1 && /[a-z]/.test(text)) push("ty", text);
      else push("", text);
    }
    last = m.index + text.length;
    if (text.length === 0) re.lastIndex++;
  }
  if (last < code.length) push("", code.slice(last));
  return out;
}

export const TOKEN_COLORS = {
  kw: "#ff7a93",
  ty: "#7ee0c3",
  fn: "#ffd479",
  st: "#a5d6a7",
  nu: "#f2a65a",
  cm: "#6f7f95",
  pp: "#c792ea",
};
