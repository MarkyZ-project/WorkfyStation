use std::process::Command;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PowerShellOutput {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub cwd: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct LocalRunOutput {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub compiler_used: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DesktopInfo {
    pub is_windows: bool,
    pub username: String,
    pub cwd: String,
    pub gcc_available: bool,
    pub powershell_available: bool,
    pub version: String,
}

#[tauri::command]
fn is_tauri_app() -> bool {
    true
}

#[tauri::command]
fn get_desktop_info() -> DesktopInfo {
    let username = std::env::var("USERNAME").unwrap_or_else(|_| "Utente".to_string());
    let cwd = std::env::current_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| "C:\\".to_string());

    #[cfg(target_os = "windows")]
    use std::os::windows::process::CommandExt;
    #[cfg(target_os = "windows")]
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    #[cfg(target_os = "windows")]
    let gcc_available = Command::new("gcc")
        .arg("--version")
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    #[cfg(not(target_os = "windows"))]
    let gcc_available = Command::new("gcc")
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    DesktopInfo {
        is_windows: cfg!(target_os = "windows"),
        username,
        cwd,
        gcc_available,
        powershell_available: true,
        version: "1.0.0".to_string(),
    }
}

#[tauri::command]
fn run_powershell(command: String, cwd: Option<String>) -> Result<PowerShellOutput, String> {
    let mut current_dir = cwd.unwrap_or_else(|| {
        std::env::current_dir()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|_| "C:\\".to_string())
    });

    let trimmed = command.trim();

    // Gestione comando "cd" per tracciare la cartella
    if trimmed.starts_with("cd ") || trimmed.starts_with("Set-Location ") {
        let raw_target = if trimmed.starts_with("cd ") {
            trimmed.trim_start_matches("cd ").trim()
        } else {
            trimmed.trim_start_matches("Set-Location ").trim()
        };
        let target = raw_target.trim_matches('"').trim_matches('\'');

        let new_path = if target == ".." {
            std::path::Path::new(&current_dir)
                .parent()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_else(|| current_dir.clone())
        } else if std::path::Path::new(target).is_absolute() {
            target.to_string()
        } else {
            std::path::Path::new(&current_dir)
                .join(target)
                .to_string_lossy()
                .to_string()
        };

        if std::path::Path::new(&new_path).exists() {
            current_dir = new_path;
            return Ok(PowerShellOutput {
                stdout: String::new(),
                stderr: String::new(),
                exit_code: 0,
                cwd: current_dir,
            });
        }
    }

    #[cfg(target_os = "windows")]
    let mut cmd = Command::new("powershell.exe");

    #[cfg(not(target_os = "windows"))]
    let mut cmd = Command::new("sh");

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
        cmd.args(&["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", trimmed]);
    }

    #[cfg(not(target_os = "windows"))]
    {
        cmd.args(&["-c", trimmed]);
    }

    if std::path::Path::new(&current_dir).exists() {
        cmd.current_dir(&current_dir);
    }

    match cmd.output() {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            let exit_code = output.status.code().unwrap_or(0);
            Ok(PowerShellOutput {
                stdout,
                stderr,
                exit_code,
                cwd: current_dir,
            })
        }
        Err(e) => Err(format!("Errore esecuzione comando PowerShell: {}", e)),
    }
}

#[tauri::command]
fn compile_and_run_c_local(
    code: String,
    compiler: String,
    flags: String,
    stdin_input: Option<String>,
) -> Result<LocalRunOutput, String> {
    let temp_dir = std::env::temp_dir();
    let c_file = temp_dir.join("workfy_program.c");
    let exe_file = temp_dir.join("workfy_program.exe");

    if let Err(e) = std::fs::write(&c_file, code) {
        return Err(format!("Impossibile creare il file temporaneo .c: {}", e));
    }

    let comp = if compiler.contains("clang") { "clang" } else { "gcc" };

    #[cfg(target_os = "windows")]
    use std::os::windows::process::CommandExt;
    #[cfg(target_os = "windows")]
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    #[cfg(target_os = "windows")]
    let check = Command::new(comp)
        .arg("--version")
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    #[cfg(not(target_os = "windows"))]
    let check = Command::new(comp).arg("--version").output();

    if check.is_err() || !check.as_ref().unwrap().status.success() {
        return Ok(LocalRunOutput {
            success: false,
            stdout: String::new(),
            stderr: format!(
                "Compilatore locale '{}' non trovato nel sistema.\n\nSuggerimento: puoi usare la modalita 'Wandbox / GCC Cloud' integrata nel terminale per compilare subito senza dover installare nulla sul PC, oppure installa MinGW-w64.",
                comp
            ),
            exit_code: 127,
            compiler_used: comp.to_string(),
        });
    }

    // Compilazione
    let mut compile_cmd = Command::new(comp);
    #[cfg(target_os = "windows")]
    compile_cmd.creation_flags(CREATE_NO_WINDOW);

    compile_cmd.arg(&c_file);
    compile_cmd.arg("-o");
    compile_cmd.arg(&exe_file);

    for flag in flags.split_whitespace() {
        if !flag.is_empty() {
            compile_cmd.arg(flag);
        }
    }

    let compile_output = match compile_cmd.output() {
        Ok(out) => out,
        Err(e) => return Err(format!("Errore invocazione compilatore: {}", e)),
    };

    if !compile_output.status.success() {
        let stderr = String::from_utf8_lossy(&compile_output.stderr).to_string();
        return Ok(LocalRunOutput {
            success: false,
            stdout: String::new(),
            stderr,
            exit_code: compile_output.status.code().unwrap_or(1),
            compiler_used: comp.to_string(),
        });
    }

    // Esecuzione dell'eseguibile compilato
    let mut run_cmd = Command::new(&exe_file);
    #[cfg(target_os = "windows")]
    run_cmd.creation_flags(CREATE_NO_WINDOW);
    run_cmd.current_dir(&temp_dir);

    if let Some(input_str) = stdin_input {
        use std::io::Write;
        run_cmd.stdin(std::process::Stdio::piped());
        run_cmd.stdout(std::process::Stdio::piped());
        run_cmd.stderr(std::process::Stdio::piped());

        let mut child = match run_cmd.spawn() {
            Ok(c) => c,
            Err(e) => return Err(format!("Errore avvio programma compilato: {}", e)),
        };

        if let Some(mut stdin) = child.stdin.take() {
            let _ = stdin.write_all(input_str.as_bytes());
        }

        let output = match child.wait_with_output() {
            Ok(o) => o,
            Err(e) => return Err(format!("Errore attesa output: {}", e)),
        };

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Ok(LocalRunOutput {
            success: output.status.success(),
            stdout,
            stderr,
            exit_code: output.status.code().unwrap_or(0),
            compiler_used: comp.to_string(),
        })
    } else {
        let output = match run_cmd.output() {
            Ok(o) => o,
            Err(e) => return Err(format!("Errore esecuzione: {}", e)),
        };

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Ok(LocalRunOutput {
            success: output.status.success(),
            stdout,
            stderr,
            exit_code: output.status.code().unwrap_or(0),
            compiler_used: comp.to_string(),
        })
    }
}

#[tauri::command]
fn download_and_install_update(installer_url: Option<String>) -> Result<String, String> {
    let url = installer_url.unwrap_or_else(|| {
        "https://MarkyZ-project.github.io/WorkfyStation/WorkfyStation-Setup.exe".to_string()
    });

    let script = format!(
        "$dest = \"$env:TEMP\\WorkfyStation-Update.exe\"; [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('{}', $dest); Start-Process $dest",
        url
    );

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let mut cmd = Command::new("powershell.exe");
        cmd.creation_flags(CREATE_NO_WINDOW);
        cmd.args(&["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", &script]);
        match cmd.spawn() {
            Ok(_) => Ok("Download dell'aggiornamento avviato! L'installer si aprira tra poco.".to_string()),
            Err(e) => Err(format!("Errore avvio aggiornamento: {}", e)),
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok("Aggiornamento supportato su Windows.".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            is_tauri_app,
            get_desktop_info,
            run_powershell,
            compile_and_run_c_local,
            download_and_install_update
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
