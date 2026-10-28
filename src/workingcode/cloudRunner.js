// cloudRunner.js — esecuzione sul compilatore Cloud (Wandbox) con input interattivo.
import { wandboxRun } from "./wcCompiler.js";
import { wrapForCloud, needsMoreInput, cleanStderr } from "./interactive.js";

/**
 * Esegue il programma sul Cloud con gli input forniti finora.
 * @param {{compiler:string, code:string, langId:string, options?:string, inputs?:string[], eof?:boolean}} p
 *   eof=true: nessun aggancio, l'input finisce davvero (come Ctrl+Z).
 */
export async function cloudRun({ compiler, code, langId, options = "", inputs = [], eof = false }) {
  const { code: wrapped, lineOffset } = wrapForCloud(code, langId, { eof });
  const stdin = inputs.length ? inputs.join("\n") + "\n" : "";
  const opts = langId === "c" || langId === "cpp" ? options : "";
  const d = await wandboxRun(compiler, wrapped, stdin, opts);
  const rawErr = d.program_error || "";
  const compileFailed = !!d.compiler_error && d.program_output === undefined && !d.program_error;
  return {
    output: d.program_output || "",
    stderr: cleanStderr(langId, rawErr),
    // compiler_message contiene già output + errori del compilatore.
    compilerText: d.compiler_message || d.compiler_error || "",
    compileFailed: compileFailed || (d.status !== "0" && !!d.compiler_error && !d.program_output && !rawErr),
    needsInput: !eof && needsMoreInput(langId, rawErr),
    status: d.status ?? (d.signal ? "signal" : "0"),
    signal: d.signal || "",
    lineOffset,
  };
}
