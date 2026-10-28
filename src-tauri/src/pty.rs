//! Terminale integrato reale (pseudo-console), come quello di Visual Studio Code.
//! Sulla webview gira xterm.js; su Windows usa PowerShell (ConPTY), su macOS/Linux usa zsh/bash (PTY Unix).

use crate::{default_shell_path, enriched_path, home_dir, runner::take_utf8, AppState};
use portable_pty::{native_pty_system, Child as PtyChild, CommandBuilder, MasterPty, PtySize};
use serde::Serialize;
use std::io::{Read, Write};
use tauri::{AppHandle, Emitter, State};

const MAX_PTYS: usize = 8;
const MAX_WRITE: usize = 64 * 1024;

pub struct PtyHandle {
    master: Box<dyn MasterPty + Send>,
    writer: Box<dyn Write + Send>,
    child: Box<dyn PtyChild + Send + Sync>,
}

#[derive(Serialize, Clone)]
struct PtyEvent {
    id: u64,
    data: String,
    exited: bool,
}

fn size(cols: u16, rows: u16) -> PtySize {
    PtySize { rows: rows.clamp(2, 500), cols: cols.clamp(10, 500), pixel_width: 0, pixel_height: 0 }
}

/// Apre una nuova sessione di terminale. Parte nella cartella di lavoro (se aperta) o nella home.
#[tauri::command]
pub async fn pty_open(
    app: AppHandle,
    state: State<'_, AppState>,
    id: u64,
    cols: u16,
    rows: u16,
) -> Result<String, String> {
    if id == 0 {
        return Err("Identificativo non valido".to_string());
    }
    {
        let ptys = state.ptys.lock().map_err(|_| "Stato non disponibile".to_string())?;
        if ptys.contains_key(&id) {
            return Err("Terminale già aperto".to_string());
        }
        if ptys.len() >= MAX_PTYS {
            return Err("Troppi terminali aperti: chiudine qualcuno".to_string());
        }
    }

    let cwd = state
        .root
        .lock()
        .ok()
        .and_then(|g| g.clone())
        .filter(|r| r.is_dir())
        .unwrap_or_else(home_dir);

    let pair = native_pty_system().openpty(size(cols, rows)).map_err(|e| e.to_string())?;

    let mut cmd = if cfg!(windows) {
        let mut c = CommandBuilder::new("powershell.exe");
        // Politica di esecuzione di sistema invariata: non indebolisce la sicurezza dell'utente.
        c.args(["-NoLogo", "-NoProfile"]);
        c
    } else {
        let shell = default_shell_path();
        let mut c = CommandBuilder::new(&shell);
        // Avvia come login shell (-l) su macOS/Linux per caricare ~/.zprofile, ~/.zshrc e il PATH utente.
        if shell.ends_with("zsh") || shell.ends_with("bash") || shell.ends_with("fish") {
            c.arg("-l");
        }
        c.env("PATH", enriched_path());
        if std::env::var_os("LANG").is_none() {
            c.env("LANG", "en_US.UTF-8");
        }
        c
    };
    cmd.cwd(&cwd);
    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");
    cmd.env("WORKFYSTATION_TERMINAL", "1");

    let child = pair.slave.spawn_command(cmd).map_err(|e| format!("Impossibile avviare la shell: {e}"))?;
    drop(pair.slave);
    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

    state
        .ptys
        .lock()
        .map_err(|_| "Stato non disponibile".to_string())?
        .insert(id, PtyHandle { master: pair.master, writer, child });

    let app2 = app.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 8192];
        let mut carry: Vec<u8> = Vec::new();
        loop {
            match reader.read(&mut buf) {
                Ok(0) | Err(_) => break,
                Ok(n) => {
                    carry.extend_from_slice(&buf[..n]);
                    let text = take_utf8(&mut carry);
                    if !text.is_empty() {
                        let _ = app2.emit("wf-pty", PtyEvent { id, data: text, exited: false });
                    }
                }
            }
        }
        let _ = app2.emit("wf-pty", PtyEvent { id, data: String::new(), exited: true });
    });

    Ok(crate::workspace::clean(&cwd))
}

#[tauri::command]
pub async fn pty_write(state: State<'_, AppState>, id: u64, data: String) -> Result<(), String> {
    if data.len() > MAX_WRITE {
        return Err("Input troppo lungo".to_string());
    }
    let mut ptys = state.ptys.lock().map_err(|_| "Stato non disponibile".to_string())?;
    let h = ptys.get_mut(&id).ok_or("Terminale non trovato")?;
    h.writer.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
    h.writer.flush().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pty_resize(state: State<'_, AppState>, id: u64, cols: u16, rows: u16) -> Result<(), String> {
    let ptys = state.ptys.lock().map_err(|_| "Stato non disponibile".to_string())?;
    if let Some(h) = ptys.get(&id) {
        h.master.resize(size(cols, rows)).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn pty_close(state: State<'_, AppState>, id: u64) -> Result<(), String> {
    let handle = state.ptys.lock().map_err(|_| "Stato non disponibile".to_string())?.remove(&id);
    if let Some(mut h) = handle {
        let _ = h.child.kill();
    }
    Ok(())
}

pub fn kill_all(state: &AppState) {
    if let Ok(mut ptys) = state.ptys.lock() {
        for (_, h) in ptys.iter_mut() {
            let _ = h.child.kill();
        }
    }
}
