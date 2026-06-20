import { useState, useRef } from "react";

const NEON = "#ff6b9d";

const FILTERS = [
  { id: "brightness", label: "Luminosità", min: 0, max: 200, default: 100, unit: "%" },
  { id: "contrast",   label: "Contrasto",  min: 0, max: 200, default: 100, unit: "%" },
  { id: "saturate",   label: "Saturazione",min: 0, max: 200, default: 100, unit: "%" },
  { id: "grayscale",  label: "Scala grigi",min: 0, max: 100, default: 0,   unit: "%" },
  { id: "sepia",      label: "Seppia",     min: 0, max: 100, default: 0,   unit: "%" },
  { id: "invert",     label: "Inverti",    min: 0, max: 100, default: 0,   unit: "%" },
  { id: "blur",       label: "Sfocatura",  min: 0, max: 20,  default: 0,   unit: "px" },
  { id: "hue-rotate", label: "Tonalità",   min: 0, max: 360, default: 0,   unit: "deg" },
];

const PRESETS = [
  { label: "Originale",  values: { brightness:100,contrast:100,saturate:100,grayscale:0,sepia:0,invert:0,blur:0,"hue-rotate":0 } },
  { label: "Vivido",     values: { brightness:110,contrast:120,saturate:160,grayscale:0,sepia:0,invert:0,blur:0,"hue-rotate":0 } },
  { label: "Freddo",     values: { brightness:100,contrast:105,saturate:80, grayscale:0,sepia:0,invert:0,blur:0,"hue-rotate":200 } },
  { label: "Caldo",      values: { brightness:105,contrast:100,saturate:120,grayscale:0,sepia:30,invert:0,blur:0,"hue-rotate":20 } },
  { label: "B&N",        values: { brightness:100,contrast:120,saturate:0,  grayscale:100,sepia:0,invert:0,blur:0,"hue-rotate":0 } },
  { label: "Vintage",    values: { brightness:90, contrast:90, saturate:70, grayscale:20,sepia:40,invert:0,blur:0,"hue-rotate":0 } },
  { label: "Dramma",     values: { brightness:80, contrast:160,saturate:80, grayscale:30,sepia:0,invert:0,blur:0,"hue-rotate":0 } },
  { label: "Sogno",      values: { brightness:110,contrast:80, saturate:120,grayscale:0,sepia:0,invert:0,blur:1,"hue-rotate":30 } },
];

export default function ImageEditorApp({ c }) {
  const [image, setImage] = useState(null);
  const [filters, setFilters] = useState(() => Object.fromEntries(FILTERS.map(f => [f.id, f.default])));
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const canvasRef = useRef();
  const imgRef = useRef();
  const fileRef = useRef();

  const filterString = Object.entries(filters)
    .map(([k, v]) => `${k}(${v}${FILTERS.find(f => f.id === k)?.unit})`)
    .join(" ");

  const transform = `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`;

  const loadImage = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setImage(ev.target.result); setFilters(Object.fromEntries(FILTERS.map(f => [f.id, f.default]))); setRotation(0); setFlipH(false); setFlipV(false); };
    reader.readAsDataURL(file);
  };

  const applyPreset = (preset) => setFilters({ ...preset.values });

  const download = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = imgRef.current;
    if (!img) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.filter = filterString;
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    const a = document.createElement("a");
    a.download = "immagine_modificata.png";
    a.href = canvas.toDataURL("image/png");
    a.click();
  };

  const reset = () => {
    setFilters(Object.fromEntries(FILTERS.map(f => [f.id, f.default])));
    setRotation(0); setFlipH(false); setFlipV(false);
  };

  const btn = (active) => ({
    padding: "7px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer",
    border: `1px solid ${active ? c.accent : c.border}`,
    background: active ? c.accentBg : "transparent",
    color: active ? c.accent : c.textMuted,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 12 }}>
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={loadImage} />

      {!image ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, border: `2px dashed ${c.border}`, borderRadius: 16 }}>
          <div style={{ fontSize: 48 }}>🖼️</div>
          <div style={{ color: c.textMuted, fontSize: 15 }}>Importa un'immagine per iniziare</div>
          <button onClick={() => fileRef.current.click()} style={{ padding: "12px 28px", borderRadius: 10, border: `1px solid ${c.accent}`, background: c.accentBg, color: c.accent, cursor: "pointer", fontSize: 15, fontWeight: 500 }}>
            Scegli immagine
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0 }}>
          {/* Anteprima */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#111", borderRadius: 12, overflow: "hidden", border: `1px solid ${c.border}` }}>
              <img ref={imgRef} src={image} alt="preview"
                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", filter: filterString, transform }} />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => fileRef.current.click()} style={btn(false)}>Cambia img</button>
              <button onClick={() => setRotation(r => (r + 90) % 360)} style={btn(false)}>↻ Ruota</button>
              <button onClick={() => setFlipH(v => !v)} style={btn(flipH)}>↔ Specchia H</button>
              <button onClick={() => setFlipV(v => !v)} style={btn(flipV)}>↕ Specchia V</button>
              <button onClick={reset} style={btn(false)}>Reset</button>
              <button onClick={download} style={{ ...btn(true), marginLeft: "auto", background: NEON, color: "#fff", border: `1px solid ${NEON}` }}>⬇ Scarica</button>
            </div>
          </div>

          {/* Pannello filtri */}
          <div style={{ width: 220, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10, overflow: "auto" }}>
            <div style={{ fontSize: 12, color: c.textHint, letterSpacing: 1 }}>PRESET</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {PRESETS.map(p => (
                <button key={p.label} onClick={() => applyPreset(p)} style={{ ...btn(false), padding: "5px 10px" }}>{p.label}</button>
              ))}
            </div>

            <div style={{ fontSize: 12, color: c.textHint, letterSpacing: 1, marginTop: 4 }}>FILTRI MANUALI</div>
            {FILTERS.map(f => (
              <div key={f.id}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: c.textMuted, marginBottom: 3 }}>
                  <span>{f.label}</span>
                  <span style={{ color: c.accent }}>{filters[f.id]}{f.unit}</span>
                </div>
                <input type="range" min={f.min} max={f.max} value={filters[f.id]}
                  onChange={e => setFilters(prev => ({ ...prev, [f.id]: Number(e.target.value) }))}
                  style={{ width: "100%" }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}