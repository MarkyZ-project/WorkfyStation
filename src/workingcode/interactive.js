// interactive.js — rende interattiva l'esecuzione Cloud (Wandbox).
//
// Il server Cloud riceve tutto lo stdin in anticipo, quindi non può "fermarsi" ad aspettare
// l'utente. Soluzione: aggiungiamo al programma un piccolo aggancio che, quando il programma
// prova a leggere ma l'input fornito finora è finito, stampa un marcatore su stderr e termina.
// Il frontend mostra l'output prodotto fin lì, chiede il valore all'utente e riesegue il
// programma con tutti i valori inseriti, mostrando solo la parte nuova dell'output.
// Funziona con scanf/getchar/fgets (C), cin/getline/scanf (C++), Scanner (Java), input() (Python).

export const NEED_MARKER = "@@WF_NEED_INPUT@@";

const C_HOOK = String.raw`#ifndef WF_EOF
#include <stdio.h>
#include <stdlib.h>
#include <ctype.h>
__attribute__((unused)) static void wf_need_(int skipws) {
  int c = getc(stdin);
  if (skipws) while (c != EOF && isspace(c)) c = getc(stdin);
  if (c == EOF) { fflush(stdout); fputs("\n@@WF_NEED_INPUT@@\n", stderr); exit(0); }
  ungetc(c, stdin);
}
__attribute__((unused)) static int wf_fmtws_(const char *f) { return !(f && f[0] == '%' && (f[1] == 'c' || f[1] == '[')); }
__attribute__((unused)) static int wf_getchar_(void) { wf_need_(0); return getc(stdin); }
#define wf_first_(a, ...) (a)
#define scanf(...) (wf_need_(wf_fmtws_(wf_first_(__VA_ARGS__, 0))), scanf(__VA_ARGS__))
#define getchar() wf_getchar_()
#define fgets(b, n, s) ((s) == stdin ? (wf_need_(0), fgets(b, n, s)) : fgets(b, n, s))
#endif
`;

const CPP_HOOK = String.raw`#ifndef WF_EOF
#if __has_include(<bits/stdc++.h>)
#include <bits/stdc++.h>
#endif
#include <cstdio>
#include <cstdlib>
#include <cctype>
#include <iostream>
#include <streambuf>
namespace wf_ns_ {
struct InBuf : std::streambuf {
  char ch_;
  int underflow() override {
    if (gptr() < egptr()) return (unsigned char)*gptr();
    int c = std::getc(stdin);
    if (c == EOF) { std::cout.flush(); std::fflush(stdout); std::fputs("\n@@WF_NEED_INPUT@@\n", stderr); std::exit(0); }
    ch_ = (char)c; setg(&ch_, &ch_, &ch_ + 1);
    return (unsigned char)c;
  }
};
struct Init { InBuf b; Init() { std::cin.rdbuf(&b); } };
static Init init_;
}
` + C_HOOK.replace("#ifndef WF_EOF\n", "") ;

const JAVA_HOOK_CLASS = `
class WfIn extends java.io.InputStream {
  private final java.io.InputStream in = System.in;
  static void install() { System.setIn(new WfIn()); }
  public int read() throws java.io.IOException { int c = in.read(); if (c < 0) need(); return c; }
  public int read(byte[] b, int off, int len) throws java.io.IOException {
    if (len == 0) return 0;
    int n = in.read(b, off, len);
    if (n < 0) need();
    return n;
  }
  public int available() throws java.io.IOException { return in.available(); }
  private static void need() {
    System.out.flush();
    System.err.println();
    System.err.println("${NEED_MARKER}");
    System.err.flush();
    Runtime.getRuntime().halt(0);
  }
}
`;

const PY_HOOK =
  "import builtins as _wf_b, sys as _wf_s, os as _wf_os\n" +
  "_wf_o = _wf_b.input\n" +
  "def _wf_input(p=''):\n" +
  "    try:\n" +
  "        return _wf_o(p)\n" +
  "    except EOFError:\n" +
  "        _wf_s.stdout.flush()\n" +
  `        print('\\n${NEED_MARKER}', file=_wf_s.stderr)\n` +
  "        _wf_s.stderr.flush()\n" +
  "        _wf_os._exit(0)\n" +
  "_wf_b.input = _wf_input\n";

// Il server Cloud è Linux: <conio.h> (getch, clrscr...) non esiste. Lo sostituiamo con
// equivalenti minimi sulla STESSA riga, così i numeri di riga degli errori non cambiano.
const U = "__attribute__((unused)) static";
const CONIO_STUB =
  `${U} int getch(void){return getchar();} ${U} int getche(void){return getchar();} ` +
  `${U} void clrscr(void){} ${U} int kbhit(void){return 0;}`;

function windowsCompat(code) {
  return code.replace(/^[ \t]*#[ \t]*include[ \t]*<conio\.h>[^\n]*/m, CONIO_STUB);
}

/** Righe di stderr generate da system("pause"/"cls") su Linux: inutili per l'utente. */
const NOISE_RE = /^sh: (?:\d+: )?(?:pause|cls|PAUSE|CLS)(?:: not found| : not found)?.*$/;

/** Nome del file principale usato dalle diagnostiche. */
function displayName(langId) {
  return { c: "main.c", cpp: "main.cpp", java: "Main.java", python: "main.py" }[langId] || "main";
}

/**
 * Prepara il codice per l'esecuzione Cloud.
 * @returns {{ code: string, lineOffset: number }} lineOffset = righe aggiunte in testa (da sottrarre alle diagnostiche)
 */
export function wrapForCloud(code, langId, { eof = false } = {}) {
  if (langId === "c" || langId === "cpp") {
    const hook = langId === "c" ? C_HOOK : CPP_HOOK;
    const def = eof ? "#define WF_EOF 1\n" : "";
    // #line riallinea i numeri di riga degli errori al codice dell'utente.
    return { code: `${def}${hook}#line 1 "${displayName(langId)}"\n${windowsCompat(code)}`, lineOffset: 0 };
  }
  if (langId === "java") {
    // Wandbox compila il codice in prog.java: rimuoviamo 'public' davanti a 'class' così
    // javac non richiede che il file abbia lo stesso nome della classe pubblica.
    const clean = code.replace(/\bpublic\s+((?:final\s+|abstract\s+)*class\s+)/g, "$1");
    if (eof) return { code: clean, lineOffset: 0 };
    // Installa l'aggancio come prima istruzione del main (sulla stessa riga: numeri di riga invariati).
    const re = /(static\s+(?:final\s+)?void\s+main\s*\([^)]*\)\s*(?:throws\s+[\w.,\s]+)?\{)/;
    if (!re.test(clean)) return { code: clean, lineOffset: 0 };
    return { code: clean.replace(re, "$1 WfIn.install();") + "\n" + JAVA_HOOK_CLASS, lineOffset: 0 };
  }
  if (langId === "python") {
    if (eof) return { code, lineOffset: 0 };
    return { code: `exec(${JSON.stringify(PY_HOOK)})\n${code}`, lineOffset: 1 };
  }
  return { code, lineOffset: 0 };
}

/** Riconosce se il programma si è fermato perché aspettava altro input. */
export function needsMoreInput(langId, stderr) {
  if (!stderr) return false;
  if (stderr.includes(NEED_MARKER)) return true;
  // Java: Scanner creato prima del main (campo static) non passa dall'aggancio.
  if (langId === "java" && /java\.util\.NoSuchElementException/.test(stderr)) return true;
  return false;
}

/** Rimuove il marcatore (e lo stack trace Java relativo) dallo stderr da mostrare. */
export function cleanStderr(langId, stderr) {
  if (!stderr) return "";
  if (langId === "java" && /java\.util\.NoSuchElementException/.test(stderr)) return "";
  return stderr
    .split("\n")
    .filter((l) => !l.includes(NEED_MARKER) && !NOISE_RE.test(l))
    .join("\n")
    .replace(/\n+$/, "");
}

/** Nome della classe principale Java (per l'esecuzione locale). */
export function javaMainClass(code) {
  const m = code.match(/public\s+(?:final\s+|abstract\s+)*class\s+([A-Za-z_]\w*)/);
  return m ? m[1] : "Main";
}
