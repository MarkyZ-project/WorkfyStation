import { useState, useRef, useEffect } from "react";

const NEON = "#ff6b9d";

export default function PdfViewerApp({ c }) {
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Word editor
  const [wordHtml, setWordHtml] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [wordArrayBuffer, setWordArrayBuffer] = useState(null);
  const editorRef = useRef();

  const canvasRef = useRef();
  const fileRef = useRef();
  const pdfDocRef = useRef(null);

  const loadFile = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setError(""); setLoading(true); setWordHtml(""); setCurrentPage(1); setEditMode(false);

    const ext = f.name.split(".").pop().toLowerCase();
    setFileType(ext);
    setFile(f);

    if (ext === "pdf") {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
        const arrayBuffer = await f.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        pdfDocRef.current = pdf;
        setTotalPages(pdf.numPages);
        setLoading(false);
        renderPage(pdf, 1, zoom);
      } catch (err) {
        setError("Errore nel caricamento del PDF: " + err.message);
        setLoading(false);
      }
    } else if (ext === "docx" || ext === "doc") {
      try {
        const mammoth = await import("mammoth");
        const arrayBuffer = await f.arrayBuffer();
        setWordArrayBuffer(arrayBuffer);
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setWordHtml(result.value);
        setLoading(false);
      } catch (err) {
        setError("Errore nel caricamento: " + err.message);
        setLoading(false);
      }
    } else {
      setError("Formato non supportato. Usa PDF o DOCX.");
      setLoading(false);
    }
  };

  const renderPage = async (pdf, pageNum, scale) => {
    try {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (err) {
      setError("Errore nel rendering della pagina.");
    }
  };

  useEffect(() => {
    if (pdfDocRef.current && fileType === "pdf") {
      renderPage(pdfDocRef.current, currentPage, zoom);
    }
  }, [currentPage, zoom]);

  // Scarica il documento Word modificato
  const downloadWord = async () => {
    setSaving(true);
    try {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");

      // Prendi il testo dall'editor
      const content = editorRef.current ? editorRef.current.innerText : wordHtml.replace(/<[^>]+>/g, "");
      const lines = content.split("\n").filter(l => l.trim());

      const docParagraphs = lines.map(line => {
        return new Paragraph({
          children: [new TextRun({ text: line, size: 24 })],
          spacing: { after: 200 },
        });
      });

      const doc = new Document({
        sections: [{
          properties: {},
          children: docParagraphs,
        }],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file?.name?.replace(/\.[^.]+$/, "") + "_modificato.docx" || "documento_modificato.docx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError("Errore durante il salvataggio: " + err.message);
    }
    setSaving(false);
  };

  // Formattazione testo selezionato
  const format = (cmd, value) => {
    document.execCommand(cmd, false, value || null);
    editorRef.current?.focus();
  };

  const btn = (active) => ({
    padding: "6px 12px", borderRadius: 8, fontSize: 13, cursor: "pointer",
    border: `1px solid ${active ? c.accent : c.border}`,
    background: active ? c.accentBg : "transparent",
    color: active ? c.accent : c.textMuted,
    transition: "all .2s",
  });

  const fmtBtn = (cmd, label) => (
    <button
      onMouseDown={e => { e.preventDefault(); format(cmd); }}
      style={{ padding: "5px 10px", borderRadius: 6, fontSize: 13, cursor: "pointer", border: `1px solid ${c.border}`, background: "transparent", color: c.textMuted, fontWeight: cmd === "bold" ? 700 : 400, fontStyle: cmd === "italic" ? "italic" : "normal", textDecoration: cmd === "underline" ? "underline" : "none" }}>
      {label}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 12 }}>
      <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }} onChange={loadFile} />

      {!file ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, border: `2px dashed ${c.border}`, borderRadius: 16 }}>
          <div style={{ fontSize: 48 }}>📄</div>
          <div style={{ color: c.textMuted, fontSize: 15 }}>Apri un file PDF o Word</div>
          <div style={{ color: c.textHint, fontSize: 13 }}>Supporta .pdf, .doc, .docx</div>
          <button onClick={() => fileRef.current.click()} style={{ padding: "12px 28px", borderRadius: 10, border: `1px solid ${c.accent}`, background: c.accentBg, color: c.accent, cursor: "pointer", fontSize: 15, fontWeight: 500 }}>
            Apri file
          </button>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", paddingBottom: 8, borderBottom: `1px solid ${c.border}` }}>
            <button onClick={() => fileRef.current.click()} style={btn(false)}>Apri altro</button>

            {/* Toolbar PDF */}
            {fileType === "pdf" && (
              <>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} style={btn(false)} disabled={currentPage === 1}>‹ Prec</button>
                <span style={{ color: c.text, fontSize: 13 }}>Pag {currentPage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} style={btn(false)} disabled={currentPage === totalPages}>Succ ›</button>
                <div style={{ width: 1, height: 20, background: c.border }} />
                <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} style={btn(false)}>−</button>
                <span style={{ color: c.text, fontSize: 13 }}>{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} style={btn(false)}>+</button>
                <button onClick={() => setZoom(1)} style={btn(zoom !== 1)}>Reset</button>
              </>
            )}

            {/* Toolbar Word */}
            {(fileType === "docx" || fileType === "doc") && (
              <>
                <div style={{ width: 1, height: 20, background: c.border }} />
                <button onClick={() => setEditMode(!editMode)} style={btn(editMode)}>
                  {editMode ? "👁 Visualizza" : "✏️ Modifica"}
                </button>
                {editMode && (
                  <>
                    <div style={{ width: 1, height: 20, background: c.border }} />
                    {fmtBtn("bold", "G")}
                    {fmtBtn("italic", "C")}
                    {fmtBtn("underline", "S")}
                    <select onChange={e => format("fontSize", e.target.value)}
                      style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${c.border}`, background: c.inputBg, color: c.text, fontSize: 12, cursor: "pointer", outline: "none" }}>
                      <option value="">Dim</option>
                      {[1,2,3,4,5,6,7].map(s => <option key={s} value={s}>{[8,10,12,14,18,24,36][s-1]}px</option>)}
                    </select>
                    <select onChange={e => format("foreColor", e.target.value)}
                      style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${c.border}`, background: c.inputBg, color: c.text, fontSize: 12, cursor: "pointer", outline: "none" }}>
                      <option value="">Colore</option>
                      {["#000","#fff","#ff6b9d","#378add","#639922","#e24b4a","#ba7517"].map(col => (
                        <option key={col} value={col} style={{ background: col }}>{col}</option>
                      ))}
                    </select>
                    <button onMouseDown={e => { e.preventDefault(); format("justifyLeft"); }} style={btn(false)}>⬅</button>
                    <button onMouseDown={e => { e.preventDefault(); format("justifyCenter"); }} style={btn(false)}>≡</button>
                    <button onMouseDown={e => { e.preventDefault(); format("justifyRight"); }} style={btn(false)}>➡</button>
                    <button onMouseDown={e => { e.preventDefault(); format("insertUnorderedList"); }} style={btn(false)}>• Lista</button>
                  </>
                )}
                <button onClick={downloadWord} style={{ ...btn(false), marginLeft: "auto", background: NEON, color: "#fff", border: `1px solid ${NEON}` }}>
                  {saving ? "Salvataggio..." : "⬇ Scarica DOCX"}
                </button>
              </>
            )}

            <div style={{ flex: fileType === "pdf" ? 1 : 0 }} />
            <div style={{ fontSize: 12, color: c.textHint }}>{file?.name}</div>
          </div>

          {loading && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 32 }}>⏳</div>
              <div style={{ color: c.textMuted }}>Caricamento...</div>
            </div>
          )}

          {error && (
            <div style={{ padding: 16, background: "rgba(255,20,147,0.08)", border: `1px solid ${NEON}`, borderRadius: 10, color: NEON, fontSize: 14 }}>{error}</div>
          )}

          {/* Visualizzatore PDF */}
          {fileType === "pdf" && !loading && !error && (
            <div style={{ flex: 1, overflow: "auto", display: "flex", justifyContent: "center", background: "#333", borderRadius: 12, padding: 16 }}>
              <canvas ref={canvasRef} style={{ borderRadius: 4, boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }} />
            </div>
          )}

          {/* Editor / Visualizzatore Word */}
          {(fileType === "docx" || fileType === "doc") && !loading && !error && (
            <div style={{ flex: 1, overflow: "auto", background: "#fff", borderRadius: 12, padding: "32px 48px", boxShadow: "0 2px 12px rgba(0,0,0,0.15)", position: "relative" }}>
              {editMode && (
                <div style={{ position: "sticky", top: -32, left: 0, right: 0, background: "#f0f0f0", padding: "6px 8px", borderRadius: 8, marginBottom: 16, fontSize: 11, color: "#666", textAlign: "center" }}>
                  ✏️ Stai modificando — seleziona il testo per formattarlo
                </div>
              )}
              <div
                ref={editorRef}
                contentEditable={editMode}
                suppressContentEditableWarning
                dangerouslySetInnerHTML={!editMode ? { __html: wordHtml } : undefined}
                style={{
                  color: "#111", fontSize: 15, lineHeight: 1.8,
                  outline: "none", minHeight: 400,
                  cursor: editMode ? "text" : "default",
                  borderBottom: editMode ? `2px solid ${NEON}` : "none",
                  paddingBottom: editMode ? 8 : 0,
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}