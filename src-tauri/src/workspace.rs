//! Accesso al file system confinato alla cartella di lavoro scelta dall'utente.
//!
//! La cartella può essere impostata SOLO tramite il selettore nativo (`ws_open`) oppure
//! riaprendo una cartella già scelta in precedenza (`ws_reopen`). La webview passa solo
//! percorsi relativi, che vengono validati e canonicalizzati prima di ogni operazione.

use crate::AppState;
use serde::Serialize;
use std::fs;
use std::path::{Component, Path, PathBuf};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;

const MAX_READ: u64 = 2 * 1024 * 1024;
const MAX_WRITE: usize = 5 * 1024 * 1024;
const MAX_ENTRIES: usize = 3000;
const MAX_FILES: usize = 5000;
const MAX_GREP_HITS: usize = 300;
const MAX_DEPTH: usize = 8;
const SKIP_DIRS: &[&str] = &[
    "node_modules", ".git", "target", "dist", "build", "__pycache__", ".venv", "venv", ".idea", ".vs",
];

#[derive(Serialize, Clone)]
pub struct WorkspaceInfo {
    pub name: String,
    pub path: String,
}

#[derive(Serialize)]
pub struct Entry {
    name: String,
    is_dir: bool,
    size: u64,
}

#[derive(Serialize)]
pub struct FileContent {
    content: String,
    eol: String,
    size: u64,
}

#[derive(Serialize)]
pub struct GrepHit {
    path: String,
    line: usize,
    text: String,
}

/// Rimuove il prefisso `\\?\` che Windows aggiunge ai percorsi canonici.
pub fn clean(p: &Path) -> String {
    let s = p.to_string_lossy().to_string();
    s.strip_prefix(r"\\?\").unwrap_or(&s).to_string()
}

fn info_of(root: &Path) -> WorkspaceInfo {
    WorkspaceInfo {
        name: root
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| clean(root)),
        path: clean(root),
    }
}

fn current_root(state: &State<'_, AppState>) -> Result<PathBuf, String> {
    state
        .root
        .lock()
        .map_err(|_| "Stato non disponibile".to_string())?
        .clone()
        .ok_or_else(|| "Nessuna cartella aperta".to_string())
}

fn bad_component(name: &str) -> bool {
    if name.is_empty() || name.ends_with('.') || name.ends_with(' ') {
        return true;
    }
    if name.chars().any(|c| matches!(c, '<' | '>' | ':' | '"' | '|' | '?' | '*') || (c as u32) < 32) {
        return true;
    }
    let stem = name.split('.').next().unwrap_or("").to_ascii_uppercase();
    matches!(stem.as_str(), "CON" | "PRN" | "AUX" | "NUL")
        || (stem.len() == 4
            && (stem.starts_with("COM") || stem.starts_with("LPT"))
            && stem.as_bytes()[3].is_ascii_digit())
}

/// Risolve un percorso relativo dentro `root`, rifiutando `..`, percorsi assoluti,
/// stream alternativi (`:`), nomi riservati di Windows e symlink che escono dalla cartella.
pub fn resolve_in(root: &Path, rel: &str, must_exist: bool) -> Result<PathBuf, String> {
    let rel_path = Path::new(rel);
    for c in rel_path.components() {
        match c {
            Component::CurDir => {}
            Component::Normal(n) => {
                if bad_component(&n.to_string_lossy()) {
                    return Err(format!("Nome non valido: {}", n.to_string_lossy()));
                }
            }
            _ => return Err("Percorso non valido".to_string()),
        }
    }
    let joined = root.join(rel_path);
    let canon = if joined.exists() {
        joined.canonicalize().map_err(|e| e.to_string())?
    } else {
        if must_exist {
            return Err("File o cartella inesistente".to_string());
        }
        let parent = joined.parent().ok_or("Percorso non valido")?;
        let name = joined.file_name().ok_or("Percorso non valido")?;
        parent
            .canonicalize()
            .map_err(|_| "La cartella padre non esiste".to_string())?
            .join(name)
    };
    if !canon.starts_with(root) {
        return Err("Percorso fuori dalla cartella di lavoro".to_string());
    }
    Ok(canon)
}

fn is_root(root: &Path, p: &Path) -> bool {
    p == root
}

// ── Cartelle recenti (salvate nei dati dell'app) ──

fn recents_file(app: &AppHandle) -> Option<PathBuf> {
    app.path().app_data_dir().ok().map(|d| d.join("recent_workspaces.json"))
}

fn load_recents(app: &AppHandle) -> Vec<String> {
    recents_file(app)
        .and_then(|f| fs::read_to_string(f).ok())
        .and_then(|s| serde_json::from_str::<Vec<String>>(&s).ok())
        .unwrap_or_default()
}

fn save_recent(app: &AppHandle, path: &str) {
    let mut v = load_recents(app);
    v.retain(|p| p != path);
    v.insert(0, path.to_string());
    v.truncate(8);
    if let Some(f) = recents_file(app) {
        if let Some(dir) = f.parent() {
            let _ = fs::create_dir_all(dir);
        }
        let _ = fs::write(f, serde_json::to_string(&v).unwrap_or_else(|_| "[]".into()));
    }
}

fn set_root(app: &AppHandle, state: &State<'_, AppState>, path: PathBuf) -> Result<WorkspaceInfo, String> {
    let canon = path.canonicalize().map_err(|e| format!("Cartella non accessibile: {e}"))?;
    if !canon.is_dir() {
        return Err("Il percorso scelto non è una cartella".to_string());
    }
    save_recent(app, &clean(&canon));
    let info = info_of(&canon);
    *state.root.lock().map_err(|_| "Stato non disponibile".to_string())? = Some(canon);
    Ok(info)
}

#[tauri::command]
pub async fn ws_open(app: AppHandle, state: State<'_, AppState>) -> Result<Option<WorkspaceInfo>, String> {
    let Some(picked) = app.dialog().file().blocking_pick_folder() else {
        return Ok(None);
    };
    let path = picked.into_path().map_err(|e| e.to_string())?;
    set_root(&app, &state, path).map(Some)
}

/// Riapre SOLO una cartella già scelta in passato dall'utente con il selettore nativo.
#[tauri::command]
pub async fn ws_reopen(app: AppHandle, state: State<'_, AppState>, path: String) -> Result<WorkspaceInfo, String> {
    if !load_recents(&app).iter().any(|p| p == &path) {
        return Err("Cartella non presente tra quelle recenti".to_string());
    }
    set_root(&app, &state, PathBuf::from(path))
}

#[tauri::command]
pub async fn ws_recent(app: AppHandle) -> Vec<WorkspaceInfo> {
    load_recents(&app)
        .into_iter()
        .filter(|p| Path::new(p).is_dir())
        .map(|p| info_of(Path::new(&p)))
        .collect()
}

#[tauri::command]
pub async fn ws_info(state: State<'_, AppState>) -> Result<Option<WorkspaceInfo>, String> {
    Ok(state
        .root
        .lock()
        .map_err(|_| "Stato non disponibile".to_string())?
        .as_ref()
        .map(|r| info_of(r)))
}

#[tauri::command]
pub async fn ws_close(state: State<'_, AppState>) -> Result<(), String> {
    *state.root.lock().map_err(|_| "Stato non disponibile".to_string())? = None;
    Ok(())
}

#[tauri::command]
pub async fn ws_list(state: State<'_, AppState>, rel: String) -> Result<Vec<Entry>, String> {
    let root = current_root(&state)?;
    let dir = resolve_in(&root, &rel, true)?;
    if !dir.is_dir() {
        return Err("Non è una cartella".to_string());
    }
    let mut out: Vec<Entry> = fs::read_dir(&dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .take(MAX_ENTRIES)
        .map(|e| {
            let md = e.metadata().ok();
            Entry {
                name: e.file_name().to_string_lossy().to_string(),
                is_dir: md.as_ref().map(|m| m.is_dir()).unwrap_or(false),
                size: md.map(|m| m.len()).unwrap_or(0),
            }
        })
        .collect();
    out.sort_by(|a, b| b.is_dir.cmp(&a.is_dir).then(a.name.to_lowercase().cmp(&b.name.to_lowercase())));
    Ok(out)
}

fn looks_binary(bytes: &[u8]) -> bool {
    bytes.iter().take(8192).any(|&b| b == 0)
}

#[tauri::command]
pub async fn ws_read(state: State<'_, AppState>, rel: String) -> Result<FileContent, String> {
    let root = current_root(&state)?;
    let p = resolve_in(&root, &rel, true)?;
    let md = fs::metadata(&p).map_err(|e| e.to_string())?;
    if !md.is_file() {
        return Err("Non è un file".to_string());
    }
    if md.len() > MAX_READ {
        return Err("File troppo grande per l'editor (max 2 MB)".to_string());
    }
    let bytes = fs::read(&p).map_err(|e| e.to_string())?;
    if looks_binary(&bytes) {
        return Err("File binario: non può essere aperto nell'editor".to_string());
    }
    let text = String::from_utf8_lossy(&bytes).to_string();
    let eol = if text.contains("\r\n") { "crlf" } else { "lf" };
    Ok(FileContent { content: text.replace("\r\n", "\n"), eol: eol.to_string(), size: md.len() })
}

#[tauri::command]
pub async fn ws_write(state: State<'_, AppState>, rel: String, content: String, eol: String) -> Result<(), String> {
    if content.len() > MAX_WRITE {
        return Err("Contenuto troppo grande (max 5 MB)".to_string());
    }
    let root = current_root(&state)?;
    let p = resolve_in(&root, &rel, false)?;
    if is_root(&root, &p) || p.is_dir() {
        return Err("Destinazione non valida".to_string());
    }
    let text = content.replace("\r\n", "\n");
    let text = if eol == "crlf" { text.replace('\n', "\r\n") } else { text };
    // Scrittura atomica: se qualcosa va storto il file originale resta intatto.
    let tmp = p.with_extension(format!(
        "{}wf-tmp",
        p.extension().map(|e| format!("{}.", e.to_string_lossy())).unwrap_or_default()
    ));
    fs::write(&tmp, text.as_bytes()).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &p).map_err(|e| {
        let _ = fs::remove_file(&tmp);
        e.to_string()
    })
}

#[tauri::command]
pub async fn ws_create(state: State<'_, AppState>, rel: String, is_dir: bool) -> Result<(), String> {
    let root = current_root(&state)?;
    let p = resolve_in(&root, &rel, false)?;
    if is_root(&root, &p) || p.exists() {
        return Err("Esiste già un elemento con questo nome".to_string());
    }
    if is_dir {
        fs::create_dir(&p).map_err(|e| e.to_string())
    } else {
        fs::File::create_new(&p).map(|_| ()).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub async fn ws_rename(state: State<'_, AppState>, from: String, to: String) -> Result<(), String> {
    let root = current_root(&state)?;
    let a = resolve_in(&root, &from, true)?;
    let b = resolve_in(&root, &to, false)?;
    if is_root(&root, &a) || is_root(&root, &b) {
        return Err("Operazione non consentita sulla cartella principale".to_string());
    }
    if b.exists() {
        return Err("Esiste già un elemento con questo nome".to_string());
    }
    fs::rename(a, b).map_err(|e| e.to_string())
}

/// Sposta nel Cestino (recuperabile) invece di cancellare definitivamente.
#[tauri::command]
pub async fn ws_delete(state: State<'_, AppState>, rel: String) -> Result<(), String> {
    let root = current_root(&state)?;
    let p = resolve_in(&root, &rel, true)?;
    if is_root(&root, &p) {
        return Err("Operazione non consentita sulla cartella principale".to_string());
    }
    trash::delete(&p).map_err(|e| format!("Impossibile spostare nel Cestino: {e}"))
}

fn walk(root: &Path, dir: &Path, depth: usize, out: &mut Vec<String>) {
    if depth > MAX_DEPTH || out.len() >= MAX_FILES {
        return;
    }
    let Ok(rd) = fs::read_dir(dir) else { return };
    for e in rd.filter_map(|e| e.ok()) {
        if out.len() >= MAX_FILES {
            return;
        }
        let path = e.path();
        // Non seguire symlink/junction: evita cicli e uscite dalla cartella.
        let Ok(ft) = e.file_type() else { continue };
        if ft.is_symlink() {
            continue;
        }
        let name = e.file_name().to_string_lossy().to_string();
        if ft.is_dir() {
            if !SKIP_DIRS.contains(&name.as_str()) {
                walk(root, &path, depth + 1, out);
            }
        } else if let Ok(r) = path.strip_prefix(root) {
            out.push(r.to_string_lossy().replace('\\', "/"));
        }
    }
}

#[tauri::command]
pub async fn ws_files(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let root = current_root(&state)?;
    tauri::async_runtime::spawn_blocking(move || {
        let mut out = Vec::new();
        walk(&root, &root, 0, &mut out);
        out
    })
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn ws_grep(state: State<'_, AppState>, query: String, case_sensitive: bool) -> Result<Vec<GrepHit>, String> {
    let q = query.trim().to_string();
    if q.is_empty() || q.len() > 200 {
        return Ok(vec![]);
    }
    let root = current_root(&state)?;
    tauri::async_runtime::spawn_blocking(move || {
        let mut files = Vec::new();
        walk(&root, &root, 0, &mut files);
        let needle = if case_sensitive { q.clone() } else { q.to_lowercase() };
        let mut hits = Vec::new();
        'files: for rel in files {
            let p = root.join(&rel);
            let Ok(md) = fs::metadata(&p) else { continue };
            if md.len() > 1024 * 1024 {
                continue;
            }
            let Ok(bytes) = fs::read(&p) else { continue };
            if looks_binary(&bytes) {
                continue;
            }
            let text = String::from_utf8_lossy(&bytes);
            for (i, line) in text.lines().enumerate() {
                let hay = if case_sensitive { line.to_string() } else { line.to_lowercase() };
                if hay.contains(&needle) {
                    hits.push(GrepHit { path: rel.clone(), line: i + 1, text: line.trim().chars().take(200).collect() });
                    if hits.len() >= MAX_GREP_HITS {
                        break 'files;
                    }
                }
            }
        }
        hits
    })
    .await
    .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sandbox() -> PathBuf {
        use std::sync::atomic::{AtomicUsize, Ordering};
        static N: AtomicUsize = AtomicUsize::new(0);
        let d = std::env::temp_dir().join(format!("wf-test-{}-{}", std::process::id(), N.fetch_add(1, Ordering::SeqCst)));
        let _ = fs::remove_dir_all(&d);
        fs::create_dir_all(d.join("sub")).unwrap();
        fs::write(d.join("a.c"), "x").unwrap();
        d.canonicalize().unwrap()
    }

    #[test]
    fn accepts_inner_paths() {
        let root = sandbox();
        assert!(resolve_in(&root, "a.c", true).is_ok());
        assert!(resolve_in(&root, "sub", true).is_ok());
        assert!(resolve_in(&root, "sub/new.c", false).is_ok());
        assert!(resolve_in(&root, "", true).is_ok());
    }

    #[test]
    fn rejects_escape_attempts() {
        let root = sandbox();
        assert!(resolve_in(&root, "../x", false).is_err());
        assert!(resolve_in(&root, "sub/../../x", false).is_err());
        assert!(resolve_in(&root, "C:\\Windows\\win.ini", false).is_err());
        assert!(resolve_in(&root, "/etc/passwd", false).is_err());
        assert!(resolve_in(&root, "\\\\server\\share\\x", false).is_err());
    }

    #[test]
    fn rejects_windows_tricks() {
        let root = sandbox();
        assert!(resolve_in(&root, "a.c:stream", false).is_err());
        assert!(resolve_in(&root, "NUL", false).is_err());
        assert!(resolve_in(&root, "con.txt", false).is_err());
        assert!(resolve_in(&root, "COM1", false).is_err());
        assert!(resolve_in(&root, "bad?.c", false).is_err());
        assert!(resolve_in(&root, "trail.", false).is_err());
    }

    #[test]
    fn missing_parent_is_rejected() {
        let root = sandbox();
        assert!(resolve_in(&root, "nope/new.c", false).is_err());
        assert!(resolve_in(&root, "nope.c", true).is_err());
    }
}
