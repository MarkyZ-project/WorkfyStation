//! Compilazione ed esecuzione locale (C, C++, Java, Python) con console interattiva reale.
//!
//! Sicurezza e robustezza:
//! - ogni esecuzione usa una cartella temporanea univoca (niente nomi prevedibili/condivisi);
//! - i flag del compilatore passano da una allow-list (niente `-fplugin`, `@file`, `-Wl,...`);
//! - nessuna shell: i processi sono avviati con argomenti separati (nessuna injection);
//! - limiti su dimensione del codice, output totale e durata massima.

use crate::{quiet, AppState};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager, State};

const MAX_OUTPUT: usize = 8 * 1024 * 1024;
const MAX_RUNTIME: Duration = Duration::from_secs(15 * 60);
const COMPILE_TIMEOUT: Duration = Duration::from_secs(60);
const MAX_CODE: usize = 2 * 1024 * 1024;
const MAX_STDIN_CHUNK: usize = 64 * 1024;
const MAX_CONCURRENT: usize = 4;

#[cfg(windows)]
const EXE_NAME: &str = "program.exe";
#[cfg(not(windows))]
const EXE_NAME: &str = "program";

/// Forza stdout/stderr senza buffer, così i prompt (`printf("Numero: ")`) compaiono
/// subito anche quando l'output è una pipe e non un terminale.
const UNBUF_HEADER: &str = "#include <stdio.h>\n\
__attribute__((constructor)) static void workfy_unbuffer(void) {\n\
    setvbuf(stdout, NULL, _IONBF, 0);\n\
    setvbuf(stderr, NULL, _IONBF, 0);\n\
}\n";

pub struct RunHandle {
    stdin: Arc<Mutex<Option<ChildStdin>>>,
    child: Arc<Mutex<Child>>,
    killed: Arc<AtomicBool>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunSpec {
    /// Identificativo scelto dal frontend (permette di ascoltare gli eventi senza race).
    id: u64,
    lang: String,
    filename: String,
    code: String,
    compiler: Option<String>,
    #[serde(default)]
    flags: Vec<String>,
    main_class: Option<String>,
}

#[derive(Serialize, Clone)]
struct RunEvent {
    id: u64,
    kind: &'static str,
    data: String,
    code: Option<i32>,
}

fn emit(app: &AppHandle, id: u64, kind: &'static str, data: String, code: Option<i32>) {
    let _ = app.emit("wf-run", RunEvent { id, kind, data, code });
}

// ── Validazione ──

/// Allow-list dei flag del compilatore.
pub fn flag_ok(f: &str) -> bool {
    let safe = |s: &str| {
        !s.is_empty()
            && s.len() <= 40
            && s.chars().all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '-' | '+' | '.' | '='))
    };
    if let Some(v) = f.strip_prefix("-std=") {
        return safe(v);
    }
    if let Some(v) = f.strip_prefix("-W") {
        return safe(v);
    }
    if let Some(v) = f.strip_prefix("-O") {
        return matches!(v, "" | "0" | "1" | "2" | "3" | "s" | "g" | "fast");
    }
    if let Some(v) = f.strip_prefix("-D") {
        let (name, val) = v.split_once('=').unwrap_or((v, ""));
        let name_ok = !name.is_empty()
            && !name.starts_with(|c: char| c.is_ascii_digit())
            && name.chars().all(|c| c.is_ascii_alphanumeric() || c == '_');
        let val_ok = val.len() <= 40 && val.chars().all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '.'));
        return name_ok && val_ok;
    }
    matches!(f, "-g" | "-pedantic" | "-pedantic-errors" | "-lm" | "-lpthread" | "-static" | "-fopenmp")
}

fn clean_filename(name: &str, exts: &[&str], default: &str) -> String {
    let base = Path::new(name).file_name().and_then(|s| s.to_str()).unwrap_or(default);
    let lower = base.to_ascii_lowercase();
    let ok = !base.is_empty()
        && base.len() <= 64
        && !base.starts_with('.')
        && base.chars().all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '-'))
        && exts.iter().any(|e| lower.ends_with(e));
    if ok { base.to_string() } else { default.to_string() }
}

fn valid_class(name: &str) -> bool {
    !name.is_empty()
        && name.len() <= 64
        && !name.starts_with(|c: char| c.is_ascii_digit())
        && name.chars().all(|c| c.is_ascii_alphanumeric() || c == '_')
}

// ── Piano di esecuzione ──

struct Plan {
    compile: Option<(String, Vec<String>)>,
    run: (String, Vec<String>),
    env: Vec<(String, String)>,
}

fn s(p: &Path) -> String {
    p.to_string_lossy().to_string()
}

fn prepare(spec: &RunSpec, dir: &Path) -> Result<Plan, String> {
    if spec.code.len() > MAX_CODE {
        return Err("Codice troppo grande (max 2 MB)".to_string());
    }
    match spec.lang.as_str() {
        "c" | "cpp" => {
            let is_cpp = spec.lang == "cpp";
            let file = if is_cpp {
                clean_filename(&spec.filename, &[".cpp", ".cc", ".cxx"], "main.cpp")
            } else {
                clean_filename(&spec.filename, &[".c"], "main.c")
            };
            for f in &spec.flags {
                if !flag_ok(f) {
                    return Err(format!("Flag del compilatore non consentito: {f}"));
                }
            }
            let src = dir.join(&file);
            let hdr = dir.join("workfy_unbuf.h");
            fs::write(&src, &spec.code).map_err(|e| e.to_string())?;
            fs::write(&hdr, UNBUF_HEADER).map_err(|e| e.to_string())?;

            let clang = spec.compiler.as_deref().unwrap_or("").contains("clang");
            let tool = match (is_cpp, clang) {
                (false, false) => "gcc",
                (false, true) => "clang",
                (true, false) => "g++",
                (true, true) => "clang++",
            };
            let (libs, opts): (Vec<&String>, Vec<&String>) = spec.flags.iter().partition(|f| f.starts_with("-l"));
            let mut args: Vec<String> = opts.into_iter().cloned().collect();
            args.extend(["-include".into(), s(&hdr), s(&src), "-o".into(), s(&dir.join(EXE_NAME))]);
            args.extend(libs.into_iter().cloned());
            Ok(Plan { compile: Some((tool.into(), args)), run: (s(&dir.join(EXE_NAME)), vec![]), env: vec![] })
        }
        "java" => {
            let class = spec.main_class.as_deref().filter(|c| valid_class(c)).unwrap_or("Main").to_string();
            let src = dir.join(format!("{class}.java"));
            fs::write(&src, &spec.code).map_err(|e| e.to_string())?;
            Ok(Plan {
                compile: Some(("javac".into(), vec!["-encoding".into(), "UTF-8".into(), "-d".into(), s(dir), s(&src)])),
                run: (
                    "java".into(),
                    vec![
                        "-Dfile.encoding=UTF-8".into(),
                        "-Dstdout.encoding=UTF-8".into(),
                        "-cp".into(),
                        s(dir),
                        class,
                    ],
                ),
                env: vec![],
            })
        }
        "python" => {
            let file = clean_filename(&spec.filename, &[".py"], "main.py");
            let src = dir.join(&file);
            fs::write(&src, &spec.code).map_err(|e| e.to_string())?;
            Ok(Plan {
                compile: None,
                run: ("python".into(), vec!["-u".into(), s(&src)]),
                env: vec![("PYTHONIOENCODING".into(), "utf-8".into()), ("PYTHONUTF8".into(), "1".into())],
            })
        }
        other => Err(format!("Linguaggio non supportato per l'esecuzione locale: {other}")),
    }
}

// ── Cartelle temporanee ──

fn build_base() -> PathBuf {
    std::env::temp_dir().join("workfystation-runs")
}

fn make_build_dir(id: u64) -> Result<PathBuf, String> {
    let base = build_base();
    fs::create_dir_all(&base).map_err(|e| e.to_string())?;
    let ms = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0);
    let dir = base.join(format!("run-{}-{}-{}", std::process::id(), id, ms));
    fs::create_dir(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn cleanup(dir: &Path) {
    for _ in 0..6 {
        if fs::remove_dir_all(dir).is_ok() || !dir.exists() {
            return;
        }
        std::thread::sleep(Duration::from_millis(200));
    }
}

/// Elimina residui di esecuzioni interrotte (più vecchi di 24 ore).
pub fn sweep_old_build_dirs() {
    let Ok(rd) = fs::read_dir(build_base()) else { return };
    let limit = Duration::from_secs(24 * 3600);
    for e in rd.filter_map(|e| e.ok()) {
        let old = e
            .metadata()
            .and_then(|m| m.modified())
            .ok()
            .and_then(|t| t.elapsed().ok())
            .map(|el| el > limit)
            .unwrap_or(false);
        if old {
            let _ = fs::remove_dir_all(e.path());
        }
    }
}

// ── Lettura output ──

/// Estrae dal buffer il testo UTF-8 valido, lasciando in coda un carattere multibyte incompleto.
pub fn take_utf8(carry: &mut Vec<u8>) -> String {
    match std::str::from_utf8(carry) {
        Ok(t) => {
            let out = t.to_string();
            carry.clear();
            out
        }
        Err(e) if e.error_len().is_none() => {
            let valid = e.valid_up_to();
            let out = String::from_utf8_lossy(&carry[..valid]).to_string();
            carry.drain(..valid);
            out
        }
        Err(_) => {
            let out = String::from_utf8_lossy(carry).to_string();
            carry.clear();
            out
        }
    }
}

fn pump<R: Read + Send + 'static>(
    app: AppHandle,
    id: u64,
    mut r: R,
    kind: &'static str,
    total: Arc<AtomicUsize>,
) -> std::thread::JoinHandle<()> {
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        let mut carry: Vec<u8> = Vec::new();
        loop {
            match r.read(&mut buf) {
                Ok(0) | Err(_) => break,
                Ok(n) => {
                    total.fetch_add(n, Ordering::Relaxed);
                    carry.extend_from_slice(&buf[..n]);
                    let text = take_utf8(&mut carry);
                    if !text.is_empty() {
                        emit(&app, id, kind, text, None);
                    }
                }
            }
        }
        if !carry.is_empty() {
            emit(&app, id, kind, String::from_utf8_lossy(&carry).to_string(), None);
        }
    })
}

fn compile(app: &AppHandle, id: u64, tool: &str, args: &[String], dir: &Path) -> Result<bool, String> {
    let mut cmd = Command::new(tool);
    cmd.args(args).current_dir(dir).stdin(Stdio::null()).stdout(Stdio::piped()).stderr(Stdio::piped());
    quiet(&mut cmd);
    let mut child = cmd.spawn().map_err(|e| {
        if e.kind() == std::io::ErrorKind::NotFound {
            format!("Compilatore '{tool}' non trovato nel PATH. Installalo (es. MinGW-w64 / MSYS2 / JDK) oppure usa l'esecuzione Cloud.")
        } else {
            e.to_string()
        }
    })?;
    let total = Arc::new(AtomicUsize::new(0));
    let out = child.stdout.take().ok_or("stdout non disponibile")?;
    let err = child.stderr.take().ok_or("stderr non disponibile")?;
    let h1 = pump(app.clone(), id, out, "compile", total.clone());
    let h2 = pump(app.clone(), id, err, "compile", total);
    let start = Instant::now();
    let status = loop {
        match child.try_wait() {
            Ok(Some(st)) => break Some(st),
            Ok(None) => {
                if start.elapsed() > COMPILE_TIMEOUT {
                    let _ = child.kill();
                    let _ = child.wait();
                    break None;
                }
                std::thread::sleep(Duration::from_millis(30));
            }
            Err(e) => return Err(e.to_string()),
        }
    };
    let _ = h1.join();
    let _ = h2.join();
    Ok(status.map(|st| st.success()).unwrap_or(false))
}

fn orchestrate(app: AppHandle, spec: RunSpec, dir: PathBuf, root: Option<PathBuf>) {
    let id = spec.id;
    let plan = match prepare(&spec, &dir) {
        Ok(p) => p,
        Err(e) => {
            emit(&app, id, "error", e, None);
            emit(&app, id, "exit", "setup".into(), Some(-1));
            cleanup(&dir);
            return;
        }
    };

    if let Some((tool, args)) = &plan.compile {
        emit(&app, id, "info", format!("$ {} {}", tool, args.join(" ")), None);
        match compile(&app, id, tool, args, &dir) {
            Ok(true) => {}
            Ok(false) => {
                emit(&app, id, "exit", "compile-error".into(), Some(1));
                cleanup(&dir);
                return;
            }
            Err(e) => {
                emit(&app, id, "error", e, None);
                emit(&app, id, "exit", "compile-error".into(), Some(127));
                cleanup(&dir);
                return;
            }
        }
    }

    let cwd = root.filter(|r| r.is_dir()).unwrap_or_else(|| dir.clone());
    let mut cmd = Command::new(&plan.run.0);
    cmd.args(&plan.run.1)
        .current_dir(&cwd)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    for (k, v) in &plan.env {
        cmd.env(k, v);
    }
    quiet(&mut cmd);

    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => {
            let msg = if e.kind() == std::io::ErrorKind::NotFound {
                format!("Programma '{}' non trovato nel PATH.", plan.run.0)
            } else {
                e.to_string()
            };
            emit(&app, id, "error", msg, None);
            emit(&app, id, "exit", "spawn".into(), Some(127));
            cleanup(&dir);
            return;
        }
    };

    let stdin = Arc::new(Mutex::new(child.stdin.take()));
    let out = child.stdout.take();
    let err = child.stderr.take();
    let child = Arc::new(Mutex::new(child));
    let killed = Arc::new(AtomicBool::new(false));
    {
        let state = app.state::<AppState>();
        if let Ok(mut runs) = state.runs.lock() {
            runs.insert(id, RunHandle { stdin: stdin.clone(), child: child.clone(), killed: killed.clone() });
        }
    }

    emit(&app, id, "start", String::new(), None);
    let total = Arc::new(AtomicUsize::new(0));
    let h_out = out.map(|o| pump(app.clone(), id, o, "stdout", total.clone()));
    let h_err = err.map(|e| pump(app.clone(), id, e, "stderr", total.clone()));

    let start = Instant::now();
    let mut note = String::new();
    let code = loop {
        std::thread::sleep(Duration::from_millis(40));
        let mut c = match child.lock() {
            Ok(c) => c,
            Err(_) => break None,
        };
        match c.try_wait() {
            Ok(Some(st)) => break st.code(),
            Ok(None) => {
                if total.load(Ordering::Relaxed) > MAX_OUTPUT {
                    let _ = c.kill();
                    note = "output-limit".into();
                } else if start.elapsed() > MAX_RUNTIME {
                    let _ = c.kill();
                    note = "timeout".into();
                }
            }
            Err(_) => break None,
        }
    };

    if let Some(h) = h_out {
        let _ = h.join();
    }
    if let Some(h) = h_err {
        let _ = h.join();
    }
    if let Ok(mut runs) = app.state::<AppState>().runs.lock() {
        runs.remove(&id);
    }
    if note.is_empty() && killed.load(Ordering::Relaxed) {
        note = "killed".into();
    }
    emit(&app, id, "exit", note, code);
    cleanup(&dir);
}

// ── Comandi esposti alla webview ──

#[tauri::command]
pub async fn run_start(app: AppHandle, state: State<'_, AppState>, spec: RunSpec) -> Result<(), String> {
    if spec.id == 0 {
        return Err("Identificativo di esecuzione non valido".to_string());
    }
    {
        let runs = state.runs.lock().map_err(|_| "Stato non disponibile".to_string())?;
        if runs.contains_key(&spec.id) {
            return Err("Esecuzione già in corso con questo identificativo".to_string());
        }
        if runs.len() >= MAX_CONCURRENT {
            return Err("Troppe esecuzioni contemporanee: ferma quelle in corso".to_string());
        }
    }
    let dir = make_build_dir(spec.id)?;
    let root = state.root.lock().ok().and_then(|g| g.clone());
    std::thread::spawn(move || orchestrate(app, spec, dir, root));
    Ok(())
}

#[tauri::command]
pub async fn run_stdin(state: State<'_, AppState>, id: u64, data: String) -> Result<(), String> {
    if data.len() > MAX_STDIN_CHUNK {
        return Err("Input troppo lungo".to_string());
    }
    let stdin = {
        let runs = state.runs.lock().map_err(|_| "Stato non disponibile".to_string())?;
        runs.get(&id).ok_or("Nessun programma in esecuzione")?.stdin.clone()
    };
    let mut guard = stdin.lock().map_err(|_| "Stato non disponibile".to_string())?;
    let w = guard.as_mut().ok_or("Input chiuso (EOF)")?;
    w.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
    w.flush().map_err(|e| e.to_string())
}

/// Chiude stdin (equivale a Ctrl+Z / Ctrl+D): il programma riceve EOF.
#[tauri::command]
pub async fn run_close_stdin(state: State<'_, AppState>, id: u64) -> Result<(), String> {
    let runs = state.runs.lock().map_err(|_| "Stato non disponibile".to_string())?;
    if let Some(h) = runs.get(&id) {
        if let Ok(mut g) = h.stdin.lock() {
            *g = None;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn run_kill(state: State<'_, AppState>, id: u64) -> Result<(), String> {
    let runs = state.runs.lock().map_err(|_| "Stato non disponibile".to_string())?;
    if let Some(h) = runs.get(&id) {
        h.killed.store(true, Ordering::Relaxed);
        if let Ok(mut c) = h.child.lock() {
            let _ = c.kill();
        }
    }
    Ok(())
}

pub fn kill_all(state: &AppState) {
    if let Ok(runs) = state.runs.lock() {
        for h in runs.values() {
            if let Ok(mut c) = h.child.lock() {
                let _ = c.kill();
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allows_normal_flags() {
        for f in ["-std=c17", "-std=c++20", "-Wall", "-Wextra", "-Werror=format", "-O2", "-O", "-g", "-lm", "-pedantic", "-DDEBUG", "-DN=10"] {
            assert!(flag_ok(f), "{f} dovrebbe essere consentito");
        }
    }

    #[test]
    fn blocks_dangerous_flags() {
        for f in [
            "-fplugin=evil.dll", "@args.txt", "-Wl,--wrap=x", "-Wa,-ahl", "-wrapper", "-B/tmp", "-specs=x.spec",
            "-o", "-I/etc", "-L/x", "-include", "-x", "-Xlinker", "-W", "-D", "-D1X", "-DX=a b", "-O9", "--help", "-std=c17;calc",
            "-Wall&&calc", "-std=",
        ] {
            assert!(!flag_ok(f), "{f} dovrebbe essere rifiutato");
        }
    }

    #[test]
    fn sanitizes_filenames() {
        assert_eq!(clean_filename("main.c", &[".c"], "main.c"), "main.c");
        assert_eq!(clean_filename("../../evil.c", &[".c"], "main.c"), "evil.c");
        assert_eq!(clean_filename("a b.c", &[".c"], "main.c"), "main.c");
        assert_eq!(clean_filename("prog.exe", &[".c"], "main.c"), "main.c");
        assert_eq!(clean_filename(".hidden.c", &[".c"], "main.c"), "main.c");
        assert!(valid_class("Main") && !valid_class("1Main") && !valid_class("a-b"));
    }

    #[test]
    fn utf8_carry_keeps_partial_chars() {
        let mut buf = vec![b'a', 0xC3];
        assert_eq!(take_utf8(&mut buf), "a");
        assert_eq!(buf, vec![0xC3]);
        buf.push(0xA8);
        assert_eq!(take_utf8(&mut buf), "è");
        assert!(buf.is_empty());
    }
}
