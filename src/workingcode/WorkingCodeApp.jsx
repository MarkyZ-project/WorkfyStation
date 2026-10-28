import { useState } from "react";
import WorkingCodeWelcome from "./WorkingCodeWelcome";
import WorkingCodeEditor from "./WorkingCodeEditor";

const ACCENT = "#ff2d55";
const ACCENT2 = "#ff0020";
const GOLD = "#FFD700";

const WC_TOOLS = [
  { id: "welcome", label: "Home", icon: "🏠" },
  { id: "editor", label: "Editor IDE", icon: "⌨️" },
  { id: "terminal", label: "Terminale", icon: "🖥️" },
  { id: "projects", label: "Progetti", icon: "📁" },
  { id: "lessons", label: "Lezioni", icon: "🎓" },
  { id: "snippets", label: "Snippets", icon: "🧩" },
];

const LESSONS = [
  {
    langId: "c",
    badge: "C · Base",
    title: "Input e Condizioni (Pari o Dispari)",
    filename: "pari_dispari.c",
    desc: "Legge un numero intero da tastiera con scanf e verifica se è pari o dispari.",
    code: `#include <stdio.h>

int main() {
    int n;
    printf("Inserisci un numero intero: ");
    scanf("%d", &n);
    if (n % 2 == 0) {
        printf("%d e' PARI!\\n", n);
    } else {
        printf("%d e' DISPARI!\\n", n);
    }
    return 0;
}
`,
  },
  {
    langId: "c",
    badge: "C · Array & Cicli",
    title: "Somma, Media e Massimo di N numeri",
    filename: "media_massimo.c",
    desc: "Chiede quanti valori inserire, calcola somma, media e valore massimo.",
    code: `#include <stdio.h>

int main() {
    int n;
    printf("Quanti numeri vuoi inserire? ");
    scanf("%d", &n);
    if (n <= 0) return 0;

    int somma = 0, max = 0;
    for (int i = 0; i < n; i++) {
        int x;
        printf("Valore #%d: ", i + 1);
        scanf("%d", &x);
        somma += x;
        if (i == 0 || x > max) max = x;
    }
    printf("Somma = %d\\nMedia = %.2f\\nMassimo = %d\\n", somma, (double)somma / n, max);
    return 0;
}
`,
  },
  {
    langId: "cpp",
    badge: "C++ · STL",
    title: "Ordinamento di un Vector con std::sort",
    filename: "ordina_vector.cpp",
    desc: "Legge una lista di numeri in un std::vector e li stampa ordinati.",
    code: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    cout << "Quanti elementi? ";
    cin >> n;
    vector<int> v(n);
    for (int i = 0; i < n; i++) {
        cout << "Elemento " << i + 1 << ": ";
        cin >> v[i];
    }
    sort(v.begin(), v.end());
    cout << "Ordinati: ";
    for (int x : v) cout << x << " ";
    cout << endl;
    return 0;
}
`,
  },
  {
    langId: "java",
    badge: "Java · OOP",
    title: "Calcolatrice Interattiva con Scanner",
    filename: "Main.java",
    desc: "Legge due numeri e un operatore da tastiera con Scanner e stampa il risultato.",
    code: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        System.out.print("Primo numero: ");
        double a = in.nextDouble();
        System.out.print("Secondo numero: ");
        double b = in.nextDouble();
        System.out.println("Somma: " + (a + b));
        System.out.println("Prodotto: " + (a * b));
    }
}
`,
  },
  {
    langId: "python",
    badge: "Python · Base",
    title: "Indovina e Analizza una Parola",
    filename: "analisi_parola.py",
    desc: "Chiede una parola con input(), conta le vocali e verifica se è palindroma.",
    code: `parola = input("Scrivi una parola: ").strip()
vocali = sum(1 for c in parola.lower() if c in "aeiou")
palindroma = parola.lower() == parola.lower()[::-1]
print(f"Lunghezza: {len(parola)}, Vocali: {vocali}")
print("Palindroma!" if palindroma else "Non palindroma.")
`,
  },
];

function LessonsView({ onOpenLesson }) {
  return (
    <div style={{ flex: 1, overflow: "auto", padding: "28px 32px", background: "#080000", color: "#fff" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ fontSize: 11, color: ACCENT, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
          LEZIONI & ESEMPI INTERATTIVI
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
          Impara con esempi pronti da eseguire
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 24 }}>
          Clicca <strong>Apri nell'Editor ▶</strong> per caricare il codice nell'IDE e provarlo subito senza installare nulla.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16 }}>
          {LESSONS.map((l, i) => (
            <div
              key={i}
              style={{
                padding: 18,
                borderRadius: 12,
                background: "#0d0004",
                border: "1px solid rgba(255,45,85,0.2)",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span
                  style={{
                    fontSize: 10,
                    padding: "3px 9px",
                    borderRadius: 10,
                    background: "rgba(255,45,85,0.15)",
                    color: ACCENT,
                    fontWeight: 700,
                  }}
                >
                  {l.badge}
                </span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "Consolas" }}>
                  {l.filename}
                </span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{l.title}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>{l.desc}</div>
              <pre
                style={{
                  margin: 0,
                  padding: 10,
                  borderRadius: 8,
                  background: "#050002",
                  border: "1px solid rgba(255,255,255,0.06)",
                  color: "#e2e8f0",
                  fontFamily: "Consolas, monospace",
                  fontSize: 11,
                  overflowX: "auto",
                  maxHeight: 140,
                }}
              >
                {l.code.trim()}
              </pre>
              <button
                onClick={() => onOpenLesson(l)}
                style={{
                  marginTop: "auto",
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: "pointer",
                  alignSelf: "flex-start",
                }}
              >
                Apri nell'Editor ▶
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function WorkingCodeApp({ user, onSwitchBack }) {
  const [active, setActive] = useState("welcome");
  const [sideOpen, setSideOpen] = useState(true);
  const [pendingLesson, setPendingLesson] = useState(null);

  const currentTool = WC_TOOLS.find((t) => t.id === active) || WC_TOOLS[0];
  const showEditor = active === "editor" || active === "terminal" || active === "projects" || active === "snippets";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        display: "flex",
        overflow: "hidden",
        background: "#080000",
        fontFamily: "'Segoe UI', sans-serif",
      }}
    >
      <style>{`
        @keyframes wc-fadeIn { from{opacity:0} to{opacity:1} }
        .wc-tool-btn:hover { background: rgba(255,45,85,0.09) !important; }
        .wc-tool-btn.wc-active { background: rgba(255,45,85,0.14) !important; border-color: ${ACCENT}77 !important; }
      `}</style>

      {/* ── SIDEBAR ── */}
      <div
        style={{
          width: sideOpen ? 210 : 60,
          flexShrink: 0,
          background: "#0d0000",
          borderRight: "1px solid rgba(255,45,85,0.15)",
          display: "flex",
          flexDirection: "column",
          transition: "width .25s",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 12px",
            borderBottom: "1px solid rgba(255,45,85,0.12)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              flexShrink: 0,
              background: "rgba(255,45,85,0.12)",
              border: `1px solid ${ACCENT}66`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 12px ${ACCENT}44`,
              overflow: "hidden",
            }}
          >
            <img
              src={`${import.meta.env.BASE_URL}WorkingCodeLogo.png`}
              alt="WorkingCode"
              style={{ width: 22, height: 22, objectFit: "contain" }}
              onError={(e) => {
                e.target.style.display = "none";
                e.target.parentElement.innerHTML = '<span style="font-size:17px">💻</span>';
              }}
            />
          </div>

          {sideOpen && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT2})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                WorkingCode
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>IDE · Zero-Install</div>
            </div>
          )}

          {sideOpen && (
            <button
              onClick={onSwitchBack}
              title="Torna a WorkfyStation"
              style={{
                background: "transparent",
                border: "1px solid rgba(255,45,85,0.2)",
                borderRadius: 8,
                width: 28,
                height: 28,
                cursor: "pointer",
                color: "rgba(255,255,255,0.45)",
                fontSize: 13,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ←
            </button>
          )}
        </div>

        {/* Account */}
        {sideOpen && user && (
          <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,45,85,0.08)" }}>
            <div style={{ fontSize: 10, color: "rgba(255,45,85,0.6)", letterSpacing: 1, marginBottom: 4 }}>
              ACCOUNT
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
              {user.nome} {user.cognome}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>{user.email}</div>

            <div
              style={{
                marginTop: 8,
                padding: "6px 10px",
                borderRadius: 8,
                border: `1px solid ${GOLD}44`,
                background: "rgba(255,215,0,0.06)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ fontSize: 12 }}>👑</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  background: `linear-gradient(90deg, ${GOLD}, #FFA500)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Workfy PLUS
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 9,
                  padding: "2px 6px",
                  borderRadius: 6,
                  background: "rgba(255,215,0,0.15)",
                  color: GOLD,
                  fontWeight: 700,
                }}
              >
                ATTIVO
              </span>
            </div>
          </div>
        )}

        {/* Strumenti */}
        <div
          style={{
            flex: 1,
            padding: "10px 8px",
            display: "flex",
            flexDirection: "column",
            gap: 3,
            overflowY: "auto",
          }}
        >
          {WC_TOOLS.map((t) => (
            <button
              key={t.id}
              className={`wc-tool-btn${active === t.id ? " wc-active" : ""}`}
              onClick={() => setActive(t.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "9px 12px",
                borderRadius: 9,
                border: "1px solid transparent",
                background: "transparent",
                cursor: "pointer",
                color: active === t.id ? ACCENT : "rgba(255,255,255,0.45)",
                fontSize: 13,
                textAlign: "left",
                width: "100%",
                fontWeight: active === t.id ? 600 : 400,
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>{t.icon}</span>
              {sideOpen && <span style={{ whiteSpace: "nowrap" }}>{t.label}</span>}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: "10px 8px", borderTop: "1px solid rgba(255,45,85,0.08)" }}>
          <button
            onClick={() => setSideOpen(!sideOpen)}
            style={{
              width: "100%",
              padding: "7px",
              borderRadius: 8,
              border: "1px solid rgba(255,45,85,0.15)",
              background: "transparent",
              cursor: "pointer",
              color: "rgba(255,255,255,0.35)",
              fontSize: 12,
            }}
          >
            {sideOpen ? "« Comprimi" : "»"}
          </button>
        </div>
      </div>

      {/* ── AREA PRINCIPALE ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div
          style={{
            padding: "9px 20px",
            borderBottom: "1px solid rgba(255,45,85,0.12)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
            background: "rgba(255,45,85,0.02)",
          }}
        >
          <span style={{ fontSize: 16 }}>{currentTool.icon}</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{currentTool.label}</span>
          <div style={{ flex: 1 }} />
          <div
            style={{
              fontSize: 11,
              padding: "3px 10px",
              borderRadius: 12,
              border: `1px solid ${ACCENT}44`,
              color: ACCENT,
              background: "rgba(255,45,85,0.08)",
            }}
          >
            WorkingCode · Pronto senza installazione
          </div>
          <button
            onClick={onSwitchBack}
            style={{
              padding: "5px 12px",
              borderRadius: 8,
              cursor: "pointer",
              border: "1px solid rgba(255,45,85,0.2)",
              background: "transparent",
              color: "rgba(255,255,255,0.5)",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            ← WorkfyStation
          </button>
        </div>

        {/* Contenuto: WorkingCodeEditor resta montato per preservare stato, terminale ed esecuzioni */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {active === "welcome" && <WorkingCodeWelcome onEnter={() => setActive("editor")} />}
          {active === "lessons" && (
            <LessonsView
              onOpenLesson={(lesson) => {
                setPendingLesson(lesson);
                setActive("editor");
              }}
            />
          )}
          <div
            style={{
              display: showEditor ? "flex" : "none",
              flex: 1,
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <WorkingCodeEditor
              externalSection={active}
              pendingLesson={pendingLesson}
              onLessonConsumed={() => setPendingLesson(null)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
