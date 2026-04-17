import { useState, useRef } from "react";

const key = (email, name) => `${name}_${email}`;
const NEON = "#ff6b9d";
const BG_COLORS = ["#1a0a2e","#0a1a2e","#1a2e0a","#2e0a1a","#0a2e2e","#2e1a0a","#111","#1a1a1a"];

export default function SlideApp({ email, c }) {
  const k = key(email, "slide");
  const def = [{ id: 1, bg: "#1a0a2e", elements: [
    { id: 1, type: "title", text: "Titolo della slide", x: 10, y: 30, fontSize: 32 },
    { id: 2, type: "text",  text: "Contenuto della presentazione", x: 10, y: 55, fontSize: 16 },
  ], image: null }];

  const [slides, setSlides] = useState(() => { try { return JSON.parse(localStorage.getItem(k) || "null") || def; } catch (e) { return def; } });
  const [cur, setCur] = useState(0);
  const [selEl, setSelEl] = useState(null);
  const fileRef = useRef();

  const save = (s) => { setSlides(s); localStorage.setItem(k, JSON.stringify(s)); };
  const sl = slides[cur];

  const addSlide = () => {
    const s = [...slides, { id: Date.now(), bg: "#1a0a2e", elements: [
      { id: Date.now(), type: "title", text: "Nuovo titolo", x: 10, y: 30, fontSize: 32 },
      { id: Date.now() + 1, type: "text", text: "Contenuto", x: 10, y: 55, fontSize: 16 },
    ], image: null }];
    save(s); setCur(s.length - 1); setSelEl(null);
  };

  const delSlide = () => {
    if (slides.length === 1) return;
    const s = slides.filter((_, i) => i !== cur);
    save(s); setCur(Math.min(cur, s.length - 1)); setSelEl(null);
  };

  const updSlide = (field, val) => { const s = [...slides]; s[cur] = { ...s[cur], [field]: val }; save(s); };

  const addEl = (type) => {
    const el = { id: Date.now(), type, text: type === "title" ? "Titolo" : "Testo", x: 10, y: 40, fontSize: type === "title" ? 28 : 16 };
    const s = [...slides]; s[cur] = { ...s[cur], elements: [...s[cur].elements, el] };
    save(s); setSelEl(el.id);
  };

  const updEl = (id, field, val) => {
    const s = [...slides];
    s[cur] = { ...s[cur], elements: s[cur].elements.map(e => e.id === id ? { ...e, [field]: val } : e) };
    save(s);
  };

  const delEl = (id) => {
    const s = [...slides];
    s[cur] = { ...s[cur], elements: s[cur].elements.filter(e => e.id !== id) };
    save(s); setSelEl(null);
  };

  const importImg = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => updSlide("image", ev.target.result);
    reader.readAsDataURL(file);
  };

  const btn = (active) => ({
    padding: "5px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer",
    border: `1px solid ${active ? c.accent : c.border}`,
    background: active ? c.accentBg : "transparent",
    color: active ? c.accent : c.textMuted,
  });

  const selectedEl = sl.elements.find(e => e.id === selEl);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 8 }}>
      {/* Slide tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", paddingBottom: 8, borderBottom: `1px solid ${c.border}` }}>
        {slides.map((_, i) => <div key={i} onClick={() => { setCur(i); setSelEl(null); }} style={btn(cur === i)}>Slide {i + 1}</div>)}
        <button onClick={addSlide} style={btn(false)}>+ Slide</button>
        {slides.length > 1 && <button onClick={delSlide} style={btn(false)}>Elimina</button>}
        <div style={{ flex: 1 }} />
        <button onClick={() => addEl("title")} style={btn(false)}>+ Titolo</button>
        <button onClick={() => addEl("text")} style={btn(false)}>+ Testo</button>
        <button onClick={() => fileRef.current.click()} style={btn(false)}>+ Immagine</button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={importImg} />
      </div>

      <div style={{ flex: 1, display: "flex", gap: 12, minHeight: 0 }}>
        {/* Canvas slide */}
        <div style={{ flex: 1, borderRadius: 12, background: sl.bg, position: "relative", overflow: "hidden", border: `1px solid ${c.border}`, minHeight: 200 }}
          onClick={() => setSelEl(null)}>
          {sl.image && <img src={sl.image} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: .35, pointerEvents: "none" }} />}
          {sl.elements.map(el => (
            <div key={el.id} onClick={e => { e.stopPropagation(); setSelEl(el.id); }}
              style={{ position: "absolute", left: `${el.x}%`, top: `${el.y}%`, cursor: "pointer", outline: selEl === el.id ? `2px dashed ${NEON}` : "none", borderRadius: 4, padding: "2px 4px", minWidth: 80 }}>
              <div contentEditable suppressContentEditableWarning
                onBlur={e => updEl(el.id, "text", e.target.innerText)}
                style={{ fontSize: el.fontSize, color: "#fff", fontWeight: el.type === "title" ? "600" : "400", lineHeight: 1.3, outline: "none", cursor: "text", whiteSpace: "pre-wrap", minWidth: 60 }}>
                {el.text}
              </div>
            </div>
          ))}
        </div>

        {/* Pannello elemento selezionato */}
        {selectedEl && (
          <div style={{ width: 180, flexShrink: 0, background: c.surface2, border: `1px solid ${c.border}`, borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: c.text }}>Elemento</div>
            <div>
              <div style={{ fontSize: 11, color: c.textHint, marginBottom: 4 }}>TESTO</div>
              <textarea value={selectedEl.text} onChange={e => updEl(selectedEl.id, "text", e.target.value)} rows={3}
                style={{ width: "100%", padding: "6px", borderRadius: 6, border: `1px solid ${c.border}`, background: c.inputBg, color: c.text, fontSize: 12, resize: "none", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: c.textHint, marginBottom: 4 }}>DIMENSIONE</div>
              <input type="range" min="10" max="72" value={selectedEl.fontSize} onChange={e => updEl(selectedEl.id, "fontSize", Number(e.target.value))} style={{ width: "100%" }} />
              <div style={{ fontSize: 11, color: c.textMuted, textAlign: "right" }}>{selectedEl.fontSize}px</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: c.textHint, marginBottom: 4 }}>POSIZIONE X%</div>
              <input type="range" min="0" max="80" value={selectedEl.x} onChange={e => updEl(selectedEl.id, "x", Number(e.target.value))} style={{ width: "100%" }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: c.textHint, marginBottom: 4 }}>POSIZIONE Y%</div>
              <input type="range" min="0" max="90" value={selectedEl.y} onChange={e => updEl(selectedEl.id, "y", Number(e.target.value))} style={{ width: "100%" }} />
            </div>
            <button onClick={() => delEl(selectedEl.id)} style={{ padding: "7px", borderRadius: 7, border: `1px solid ${NEON}`, background: "rgba(255,20,147,0.08)", color: NEON, cursor: "pointer", fontSize: 12 }}>Elimina elemento</button>
          </div>
        )}
      </div>

      {/* Sfondo */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: c.textHint, paddingTop: 6 }}>
        Sfondo:
        {BG_COLORS.map(bg => <div key={bg} onClick={() => updSlide("bg", bg)} style={{ width: 18, height: 18, borderRadius: "50%", background: bg, cursor: "pointer", border: sl.bg === bg ? `2px solid ${c.accent}` : `1px solid ${c.border}` }} />)}
        {sl.image && <button onClick={() => updSlide("image", null)} style={{ ...btn(false), marginLeft: 8 }}>Rimuovi img</button>}
      </div>
    </div>
  );
}