//! WorkfyStation desktop backend.
//!
//! Sicurezza: la webview può invocare SOLO i comandi elencati in `generate_handler!`.
//! - File: ogni accesso è confinato alla cartella scelta dall'utente tramite il selettore nativo
//!   (vedi `workspace.rs`); la webview non può impostare la cartella da sola.
//! - Esecuzione: i flag del compilatore sono validati con una allow-list (vedi `runner.rs`).
//! - Aggiornamenti: gestiti dal plugin ufficiale `updater`, che verifica la firma minisign
//!   dell'installer con la chiave pubblica incorporata in `tauri.conf.json`.

mod pty;
mod runner;
mod workspace;

use serde::Serialize;
use std::collections::HashMap;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use tauri::Manager;

#[derive(Default)]
pub struct AppState {
    /// Cartella di lavoro corrente (percorso canonico). Impostata solo dal backend.
    pub root: Mutex<Option<PathBuf>>,
    pub runs: Mutex<HashMap<u64, runner::RunHandle>>,
    pub ptys: Mutex<HashMap<u64, pty::PtyHandle>>,
    next_id: AtomicU64,
}

impl AppState {
    pub fn new_id(&self) -> u64 {
        self.next_id.fetch_add(1, Ordering::Relaxed) + 1
    }
}

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// Restituisce un PATH arricchito con le directory standard di macOS/Linux (es. Homebrew, /usr/local/bin),
/// indispensabile perché le app GUI su macOS avviate dal Finder hanno un PATH minimale.
pub fn enriched_path() -> std::ffi::OsString {
    let current = std::env::var_os("PATH").unwrap_or_default();
    #[cfg(windows)]
    {
        current
    }
    #[cfg(not(windows))]
    {
        let mut paths: Vec<PathBuf> = std::env::split_paths(&current).collect();
        let extras = [
            "/opt/homebrew/bin",
            "/opt/homebrew/sbin",
            "/usr/local/bin",
            "/usr/local/sbin",
            "/usr/bin",
            "/bin",
            "/usr/sbin",
            "/sbin",
        ];
        for extra in extras {
            let p = PathBuf::from(extra);
            if p.is_dir() && !paths.iter().any(|existing| existing == &p) {
                paths.push(p);
            }
        }
        std::env::join_paths(paths).unwrap_or(current)
    }
}

/// Individua la shell nativa predefinita del sistema operativo in modo sicuro.
pub fn default_shell_path() -> String {
    #[cfg(windows)]
    {
        "powershell.exe".to_string()
    }
    #[cfg(not(windows))]
    {
        if let Ok(sh) = std::env::var("SHELL") {
            let trimmed = sh.trim();
            let p = std::path::Path::new(trimmed);
            if p.is_absolute() && p.is_file() {
                return trimmed.to_string();
            }
        }
        for candidate in ["/bin/zsh", "/bin/bash", "/bin/sh"] {
            if std::path::Path::new(candidate).is_file() {
                return candidate.to_string();
            }
        }
        "/bin/sh".to_string()
    }
}

pub fn default_shell_name() -> String {
    #[cfg(windows)]
    {
        "powershell".to_string()
    }
    #[cfg(not(windows))]
    {
        let sh = default_shell_path();
        std::path::Path::new(&sh)
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "zsh".to_string())
    }
}

/// Evita che compaia una finestra console nera su Windows e assicura il PATH completo su macOS/Linux.
pub fn quiet(cmd: &mut Command) -> &mut Command {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    #[cfg(not(windows))]
    {
        cmd.env("PATH", enriched_path());
    }
    cmd
}

pub fn home_dir() -> PathBuf {
    std::env::var_os("USERPROFILE")
        .or_else(|| std::env::var_os("HOME"))
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."))
}

#[derive(Serialize)]
struct DesktopInfo {
    username: String,
    home: String,
    version: String,
    platform: String,
    shell: String,
}

#[derive(Serialize, Default, Clone)]
struct Tool {
    name: String,
    found: bool,
    version: String,
}

#[tauri::command]
fn is_tauri_app() -> bool {
    true
}

#[tauri::command]
fn get_desktop_info() -> DesktopInfo {
    DesktopInfo {
        username: std::env::var("USERNAME")
            .or_else(|_| std::env::var("USER"))
            .unwrap_or_else(|_| "Utente".to_string()),
        home: workspace::clean(&home_dir()),
        version: env!("CARGO_PKG_VERSION").to_string(),
        platform: std::env::consts::OS.to_string(),
        shell: default_shell_name(),
    }
}

fn probe(name: &str, args: &[&str]) -> Tool {
    let mut cmd = Command::new(name);
    cmd.args(args).stdin(Stdio::null());
    quiet(&mut cmd);
    match cmd.output() {
        Ok(o) if o.status.success() => {
            let text = if o.stdout.is_empty() { &o.stderr } else { &o.stdout };
            let version = String::from_utf8_lossy(text)
                .lines()
                .find(|l| !l.trim().is_empty())
                .unwrap_or("")
                .trim()
                .to_string();
            Tool { name: name.to_string(), found: true, version }
        }
        _ => Tool { name: name.to_string(), found: false, version: String::new() },
    }
}

fn probe_python() -> Tool {
    #[cfg(not(windows))]
    {
        let p3 = probe("python3", &["--version"]);
        if p3.found {
            return Tool { name: "python".to_string(), found: true, version: p3.version };
        }
    }
    let p = probe("python", &["--version"]);
    if p.found {
        return p;
    }
    let p3 = probe("python3", &["--version"]);
    Tool { name: "python".to_string(), found: p3.found, version: p3.version }
}

/// Elenca i compilatori/interpreti realmente installati sul PC/Mac.
#[tauri::command]
async fn toolchain_info() -> Vec<Tool> {
    tauri::async_runtime::spawn_blocking(|| {
        vec![
            probe("gcc", &["--version"]),
            probe("g++", &["--version"]),
            probe("clang", &["--version"]),
            probe("clang++", &["--version"]),
            probe("javac", &["-version"]),
            probe("java", &["-version"]),
            probe_python(),
            probe("git", &["--version"]),
        ]
    })
    .await
    .unwrap_or_default()
}

fn shutdown(app: &tauri::AppHandle) {
    let state = app.state::<AppState>();
    runner::kill_all(&state);
    pty::kill_all(&state);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    runner::sweep_old_build_dirs();

    let app = tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::default())
        .setup(|app| {
            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
            let _ = app;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            is_tauri_app,
            get_desktop_info,
            toolchain_info,
            workspace::ws_open,
            workspace::ws_reopen,
            workspace::ws_recent,
            workspace::ws_info,
            workspace::ws_close,
            workspace::ws_list,
            workspace::ws_read,
            workspace::ws_write,
            workspace::ws_create,
            workspace::ws_rename,
            workspace::ws_delete,
            workspace::ws_files,
            workspace::ws_grep,
            runner::run_start,
            runner::run_stdin,
            runner::run_close_stdin,
            runner::run_kill,
            pty::pty_open,
            pty::pty_write,
            pty::pty_resize,
            pty::pty_close,
        ])
        .build(tauri::generate_context!())
        .expect("errore durante l'avvio di WorkfyStation");

    app.run(|handle, event| {
        if let tauri::RunEvent::Exit = event {
            shutdown(handle);
        }
    });
}
