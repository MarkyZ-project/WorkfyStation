import { useState } from "react";

const key = (email, name) => `${name}_${email}`;

export default function NoteApp({ email, c }) {
  const storageKey = key(email, "notes");
  const load = () => { try { return JSON.parse(localStorage.getItem(storageKey) || "[]"); } catch (e) { return []; } };
  const [notes, setNotes] = useState(load);
  const [selId, setSelId] = useState(null);

  const save = (ns) => { setNotes(ns); localStorage.setItem(storageKey, JSON.stringify(ns)); };

  const newNote = () => {
    const n = { id: Date.now(), title: "Nuova nota", content: "", createdAt: new Date().toLocaleDateString() };
    const ns = [n, ...notes];
    save(ns); setSelId(n.id);
  };

  const del = (id) => {
    const ns = notes.filter(n => n.id !== id);
    save(ns);
    if (selId === id) setSelId(ns[0]?.id || null);
  };

  const upd = (field, val) => {
    const ns = notes.map(n => n.id === selId ? { ...n, [field]: val } : n);
    save(ns);
  };

  const sel = notes.find(n => n.id === selId);

  const btn = (active) => ({
    background: active ? c.accentBg : "transparent",
    border: `1px solid ${active ? c.accent : c.border}`,
    borderRadius: 6, padding: "5px 10px", cursor: "pointer",
    color: active ? c.accent : c.textMuted, fontSize: 12, transition: "all .2s",
  });

  return (
    <div style={{ display: "flex", height: "100%", gap: 0 }}>
      {/* Lista note */}
      <div style={{ width: 200, flexShrink: 0, borderRight: `1px solid ${c.border}`, display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ padding: "10px 8px", borderBottom: `1px solid ${c.border}` }}>
          <button onClick={newNote} style={{ width: "100%", padding: "8px", borderRadius: 8, border: `1px solid ${c.accent}`, background: c.accentBg, color: c.accent, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
            + Nuova nota
          </button>
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>
          {notes.length === 0 && <div style={{ padding: 16, fontSize: 12, color: c.textHint, textAlign: "center" }}>Nessuna nota</div>}
          {notes.map(n => (
            <div key={n.id} onClick={() => setSelId(n.id)}
              style={{ padding: "10px 12px", borderBottom: `1px solid ${c.border}`, cursor: "pointer", background: selId === n.id ? c.accentBg : "transparent", position: "relative" }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: selId === n.id ? c.accent : c.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.title || "Senza titolo"}</div>
              <div style={{ fontSize: 11, color: c.textHint, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.content?.slice(0, 40) || "Vuota"}</div>
              <div style={{ fontSize: 10, color: c.textHint, marginTop: 2 }}>{n.createdAt}</div>
              <button onClick={e => { e.stopPropagation(); del(n.id); }}
                style={{ position: "absolute", top: 8, right: 6, background: "transparent", border: "none", color: c.textHint, cursor: "pointer", fontSize: 14, opacity: .5 }}>×</button>
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingLeft: 16, height: "100%" }}>
        {!sel ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 36 }}>✏️</div>
            <div style={{ color: c.textHint, fontSize: 14 }}>Seleziona o crea una nota</div>
            <button onClick={newNote} style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${c.accent}`, background: c.accentBg, color: c.accent, cursor: "pointer", fontSize: 13 }}>+ Nuova nota</button>
          </div>
        ) : (
          <>
            <input value={sel.title} onChange={e => upd("title", e.target.value)} placeholder="Titolo"
              style={{ fontSize: 22, fontWeight: 600, border: "none", outline: "none", background: "transparent", color: c.text, marginBottom: 10, fontFamily: "inherit", padding: "4px 0", borderBottom: `1px solid ${c.border}` }} />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "8px 0", borderBottom: `1px solid ${c.border}`, marginBottom: 10 }}>
              {["B", "I", "U"].map(f => <button key={f} style={btn(false)}>{f}</button>)}
            </div>
            <textarea value={sel.content} onChange={e => upd("content", e.target.value)} placeholder="Inizia a scrivere..."
              style={{ flex: 1, border: "none", outline: "none", resize: "none", fontSize: 15, lineHeight: 1.8, background: "transparent", color: c.text, fontFamily: "inherit" }} />
            <div style={{ fontSize: 12, color: c.textHint, textAlign: "right", paddingTop: 8 }}>{sel.content?.length || 0} caratteri</div>
          </>
        )}
      </div>
    </div>
  );
}