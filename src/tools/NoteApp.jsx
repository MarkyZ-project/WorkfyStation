import { useState, useRef } from "react";

const key = (email, name) => `${name}_${email}`;

export default function NoteApp({ email, c }) {
  const storageKey = key(email, "notes");
  const load = () => { try { return JSON.parse(localStorage.getItem(storageKey) || "[]"); } catch { return []; } };
  const [notes, setNotes] = useState(load);
  const [selId, setSelId] = useState(null);
  const [search, setSearch] = useState("");
  const editorRef = useRef();

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

  // Rich text formatting
  const execFormat = (cmd, value) => {
    document.execCommand(cmd, false, value || null);
    editorRef.current?.focus();
    // Save after format
    setTimeout(() => {
      if (editorRef.current) upd("content", editorRef.current.innerHTML);
    }, 10);
  };

  const isFormatActive = (cmd) => {
    try { return document.queryCommandState(cmd); } catch { return false; }
  };

  // Search filter
  const filteredNotes = search
    ? notes.filter(n =>
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        (n.content || "").toLowerCase().includes(search.toLowerCase())
      )
    : notes;

  const btn = (active) => ({
    background: active ? c.accentBg : "transparent",
    border: `1px solid ${active ? c.accent : c.border}`,
    borderRadius: 6, padding: "5px 10px", cursor: "pointer",
    color: active ? c.accent : c.textMuted, fontSize: 12, transition: "all .2s",
    fontWeight: active ? 700 : 400,
  });

  // Word count helper
  const wordCount = (text) => {
    const plain = (text || "").replace(/<[^>]+>/g, " ").trim();
    return plain ? plain.split(/\s+/).length : 0;
  };

  return (
    <div style={{ display: "flex", height: "100%", gap: 0 }}>
      {/* Lista note */}
      <div style={{ width: 220, flexShrink: 0, borderRight: `1px solid ${c.border}`, display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ padding: "10px 8px", borderBottom: `1px solid ${c.border}`, display: "flex", flexDirection: "column", gap: 6 }}>
          <button onClick={newNote} style={{ width: "100%", padding: "8px", borderRadius: 8, border: `1px solid ${c.accent}`, background: c.accentBg, color: c.accent, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
            + Nuova nota
          </button>
          {/* Barra di ricerca */}
          <div style={{ position: "relative" }}>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Cerca nelle note..."
              style={{ width: "100%", padding: "7px 10px 7px 10px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.inputBg, color: c.text, fontSize: 12, outline: "none", boxSizing: "border-box" }}
            />
            {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: c.textHint, cursor: "pointer", fontSize: 14 }}>×</button>}
          </div>
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>
          {filteredNotes.length === 0 && <div style={{ padding: 16, fontSize: 12, color: c.textHint, textAlign: "center" }}>{search ? "Nessun risultato" : "Nessuna nota"}</div>}
          {filteredNotes.map(n => (
            <div key={n.id} onClick={() => setSelId(n.id)}
              style={{ padding: "10px 12px", borderBottom: `1px solid ${c.border}`, cursor: "pointer", background: selId === n.id ? c.accentBg : "transparent", position: "relative" }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: selId === n.id ? c.accent : c.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.title || "Senza titolo"}</div>
              <div style={{ fontSize: 11, color: c.textHint, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{(n.content || "").replace(/<[^>]+>/g, "").slice(0, 40) || "Vuota"}</div>
              <div style={{ fontSize: 10, color: c.textHint, marginTop: 2 }}>{n.createdAt}</div>
              <button onClick={e => { e.stopPropagation(); del(n.id); }}
                style={{ position: "absolute", top: 8, right: 6, background: "transparent", border: "none", color: c.textHint, cursor: "pointer", fontSize: 14, opacity: .5 }}>×</button>
            </div>
          ))}
        </div>
        <div style={{ padding: "8px 10px", borderTop: `1px solid ${c.border}`, fontSize: 11, color: c.textHint, textAlign: "center" }}>
          {notes.length} nota{notes.length !== 1 ? "e" : ""}
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
            {/* Toolbar formattazione */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "8px 0", borderBottom: `1px solid ${c.border}`, marginBottom: 10, alignItems: "center" }}>
              <button onClick={() => execFormat("bold")} style={btn(isFormatActive("bold"))} title="Grassetto (Ctrl+B)"><b>B</b></button>
              <button onClick={() => execFormat("italic")} style={btn(isFormatActive("italic"))} title="Corsivo (Ctrl+I)"><i>I</i></button>
              <button onClick={() => execFormat("underline")} style={btn(isFormatActive("underline"))} title="Sottolineato (Ctrl+U)"><u>U</u></button>
              <button onClick={() => execFormat("strikeThrough")} style={btn(false)} title="Barrato"><s>S</s></button>
              <div style={{ width: 1, height: 18, background: c.border, margin: "0 4px" }} />
              <button onClick={() => execFormat("insertUnorderedList")} style={btn(false)} title="Elenco puntato">• Lista</button>
              <button onClick={() => execFormat("insertOrderedList")} style={btn(false)} title="Elenco numerato">1. Lista</button>
              <div style={{ width: 1, height: 18, background: c.border, margin: "0 4px" }} />
              <select onChange={e => { if (e.target.value) execFormat("formatBlock", e.target.value); e.target.value = ""; }}
                style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${c.border}`, background: c.inputBg, color: c.textMuted, fontSize: 11, outline: "none", cursor: "pointer" }}>
                <option value="">Formato</option>
                <option value="h1">Titolo 1</option>
                <option value="h2">Titolo 2</option>
                <option value="h3">Titolo 3</option>
                <option value="p">Paragrafo</option>
              </select>
            </div>
            {/* Editor contentEditable */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              dangerouslySetInnerHTML={{ __html: sel.content || "" }}
              onInput={() => {
                if (editorRef.current) upd("content", editorRef.current.innerHTML);
              }}
              style={{
                flex: 1, border: "none", outline: "none", fontSize: 15, lineHeight: 1.8,
                background: "transparent", color: c.text, fontFamily: "inherit",
                overflow: "auto", padding: "4px 0", minHeight: 100,
                wordBreak: "break-word",
              }}
              onKeyDown={(e) => {
                if (e.ctrlKey || e.metaKey) {
                  if (e.key === "b") { e.preventDefault(); execFormat("bold"); }
                  if (e.key === "i") { e.preventDefault(); execFormat("italic"); }
                  if (e.key === "u") { e.preventDefault(); execFormat("underline"); }
                }
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: c.textHint, paddingTop: 8, borderTop: `1px solid ${c.border}` }}>
              <span>{wordCount(sel.content)} parole</span>
              <span>{(sel.content || "").replace(/<[^>]+>/g, "").length} caratteri</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}