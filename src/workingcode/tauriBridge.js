// tauriBridge.js — Ponte nativo tra interfaccia web e backend Rust Tauri

let _isTauriCache = null;

export async function isTauriApp() {
  if (_isTauriCache !== null) return _isTauriCache;
  if (typeof window === "undefined") {
    _isTauriCache = false;
    return false;
  }
  // Check global Tauri runtime properties
  if (window.__TAURI_INTERNALS__ || window.__TAURI__) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const ok = await invoke("is_tauri_app");
      _isTauriCache = !!ok;
      return _isTauriCache;
    } catch {
      _isTauriCache = false;
      return false;
    }
  }
  _isTauriCache = false;
  return false;
}

export async function runPowerShellNative(command, cwd) {
  const isDesktop = await isTauriApp();
  if (!isDesktop) {
    throw new Error(
      "PowerShell nativa e disponibile solo all'interno dell'Applicazione Desktop per PC.\nSul browser web non e possibile accedere direttamente a powershell.exe per motivi di sicurezza del browser.\nScarica l'app per PC dalla schermata iniziale!"
    );
  }
  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke("run_powershell", { command, cwd: cwd || null });
}

export async function getDesktopInfoNative() {
  const isDesktop = await isTauriApp();
  if (!isDesktop) {
    return {
      is_windows: true,
      username: "Web User",
      cwd: "Web Sandbox",
      gcc_available: false,
      powershell_available: false,
      version: "1.0.0 (Web)",
    };
  }
  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke("get_desktop_info");
}

export async function compileAndRunCLocalNative(code, compiler, flags, stdinInput) {
  const isDesktop = await isTauriApp();
  if (!isDesktop) {
    throw new Error("La compilazione locale richiede l'applicazione desktop.");
  }
  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke("compile_and_run_c_local", {
    code,
    compiler: compiler || "gcc",
    flags: flags || "-std=c17 -Wall",
    stdinInput: stdinInput || null,
  });
}

export async function triggerAppUpdateNative(installerUrl) {
  const isDesktop = await isTauriApp();
  if (!isDesktop) {
    // Sul web, scarica direttamente il file
    const link = document.createElement("a");
    link.href = installerUrl || `${import.meta.env.BASE_URL}WorkfyStation-Setup.exe`;
    link.download = "WorkfyStation-Setup.exe";
    link.click();
    return "Download avviato nel browser!";
  }
  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke("download_and_install_update", {
    installerUrl: installerUrl || null,
  });
}
