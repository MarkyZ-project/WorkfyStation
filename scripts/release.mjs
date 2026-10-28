import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const nsisDir = path.join(root, "src-tauri", "target", "release", "bundle", "nsis");
const publicDir = path.join(root, "public");

const exeFile = path.join(nsisDir, "WorkfyStation_1.1.0_x64-setup.exe");
const sigFile = path.join(nsisDir, "WorkfyStation_1.1.0_x64-setup.exe.sig");

if (!fs.existsSync(exeFile)) {
  console.error("Installer non trovato:", exeFile);
  process.exit(1);
}

let signature = "";
if (fs.existsSync(sigFile)) {
  signature = fs.readFileSync(sigFile, "utf-8").trim();
  console.log("Firma trovata:", signature.substring(0, 32) + "...");
} else {
  console.warn("ATTENZIONE: File .sig non trovato. L'aggiornamento automatico richiede la firma.");
}

// Copia installer in public/WorkfyStation-Setup.exe per download diretto dal sito e installer updater
const targetExe = path.join(publicDir, "WorkfyStation-Setup.exe");
fs.copyFileSync(exeFile, targetExe);
console.log("Copiato installer in:", targetExe);

// Scrive public/latest.json per il plugin tauri-plugin-updater
const latestJson = {
  version: "1.1.0",
  notes: "WorkfyStation v1.1.0 — WorkingCode IDE stile Visual Studio, terminale PowerShell ConPTY reale, compilatore C/C++/Java/Python sicuro, aggiornamenti automatici firmati.",
  pub_date: new Date().toISOString(),
  platforms: {
    "windows-x86_64": {
      signature: signature,
      url: "https://markyz-project.github.io/WorkfyStation/WorkfyStation-Setup.exe",
    },
  },
};

const latestPath = path.join(publicDir, "latest.json");
fs.writeFileSync(latestPath, JSON.stringify(latestJson, null, 2), "utf-8");
console.log("Creato file latest.json in:", latestPath);
console.log("Tutto pronto per il deploy!");
