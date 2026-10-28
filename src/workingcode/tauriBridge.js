// tauriBridge.js — ponte tra l'interfaccia web e il backend Rust (Tauri).
// Su browser (web) le funzioni native non sono disponibili: isTauriApp() restituisce false.

let _core = null;
async function core() {
  if (!_core) _core = await import("@tauri-apps/api/core");
  return _core;
}

export function isDesktopApp() {
  return typeof window !== "undefined" && !!window.__TAURI_INTERNALS__;
}
export async function isTauriApp() {
  return isDesktopApp();
}

async function call(cmd, args) {
  if (!isDesktopApp()) throw new Error("Funzione disponibile solo nell'app per PC.");
  const { invoke } = await core();
  return invoke(cmd, args);
}

// ── Sistema ──
export const getDesktopInfo = () => (isDesktopApp() ? call("get_desktop_info") : Promise.resolve(null));
export const toolchainInfo = () => call("toolchain_info");

// ── Cartella di lavoro (confinata dal backend) ──
export const wsOpen = () => call("ws_open");
export const wsReopen = (path) => call("ws_reopen", { path });
export const wsRecent = () => call("ws_recent");
export const wsInfo = () => call("ws_info");
export const wsClose = () => call("ws_close");
export const wsList = (rel = "") => call("ws_list", { rel });
export const wsRead = (rel) => call("ws_read", { rel });
export const wsWrite = (rel, content, eol = "lf") => call("ws_write", { rel, content, eol });
export const wsCreate = (rel, isDir = false) => call("ws_create", { rel, isDir });
export const wsRename = (from, to) => call("ws_rename", { from, to });
export const wsDelete = (rel) => call("ws_delete", { rel });
export const wsFiles = () => call("ws_files");
export const wsGrep = (query, caseSensitive = false) => call("ws_grep", { query, caseSensitive });

// ── Esecuzione locale interattiva ──
export const runStart = (spec) => call("run_start", { spec });
export const runStdin = (id, data) => call("run_stdin", { id, data });
export const runCloseStdin = (id) => call("run_close_stdin", { id });
export const runKill = (id) => call("run_kill", { id });

async function listenTo(name, cb) {
  const { listen } = await import("@tauri-apps/api/event");
  return listen(name, (e) => cb(e.payload));
}
/** Restituisce una funzione per annullare l'ascolto. */
export async function onRunEvent(cb) {
  return listenTo("wf-run", cb);
}

// ── Terminale (PTY) ──
export const ptyOpen = (id, cols, rows) => call("pty_open", { id, cols, rows });
export const ptyWrite = (id, data) => call("pty_write", { id, data });
export const ptyResize = (id, cols, rows) => call("pty_resize", { id, cols, rows });
export const ptyClose = (id) => call("pty_close", { id });
export async function onPtyEvent(cb) {
  return listenTo("wf-pty", cb);
}

// ── Aggiornamenti firmati (plugin ufficiale: verifica la firma con la chiave pubblica incorporata) ──
export async function checkForUpdate() {
  if (!isDesktopApp()) throw new Error("Gli aggiornamenti automatici sono disponibili nell'app per PC.");
  const { check } = await import("@tauri-apps/plugin-updater");
  return check();
}

export async function installUpdate(update, onProgress) {
  let total = 0;
  let done = 0;
  await update.downloadAndInstall((ev) => {
    if (ev.event === "Started") total = ev.data.contentLength || 0;
    else if (ev.event === "Progress") {
      done += ev.data.chunkLength;
      onProgress?.(total ? Math.min(done / total, 1) : null);
    } else if (ev.event === "Finished") onProgress?.(1);
  });
}

export function newId() {
  return Math.floor(Math.random() * 2_000_000_000) + 1;
}
