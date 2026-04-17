import { useState, useRef, useEffect } from "react";

const NEON = "#ff6b9d";

export default function PdfViewerApp({ c }) {
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [wordContent, setWordContent] = useState("");
  const canvasRef = useRef();
  const fileRef = useRef();
  const pdfDocRef = useRef(null);

  const loadFile = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setError(""); setLoading(true); setPages([]); setWordContent(""); setCurrentPage(1);

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
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setWordContent(result.value);
        setLoading(false);
      } catch (err) {
        setError("Errore nel caricamento del file Word: " + err.message);
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

  const btn = (active) => ({
    padding: "7px 14px", borderRadius: 8, fontSize: 13, cursor: "pointer",
    border: `1px solid ${active ? c.accent : c.border}`,
    background: active ? c.accentBg : "transparent",
    color: active ? c.accent : c.textMuted,
    transition: "all .2s",
  });

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
            {fileType === "pdf" && (
              <>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} style={btn(false)} disabled={currentPage === 1}>‹ Prec</button>
                <span style={{ color: c.text, fontSize: 13 }}>Pag {currentPage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} style={btn(false)} disabled={currentPage === totalPages}>Succ ›</button>
                <div style={{ width: 1, height: 20, background: c.border }} />
                <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} style={btn(false)}>−</button>
                <span style={{ color: c.text, fontSize: 13 }}>{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} style={btn(false)}>+</button>
                <button onClick={() => setZoom(1)} style={btn(zoom !== 1)}>Reset zoom</button>
              </>
            )}
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: 12, color: c.textHint }}>{file?.name}</div>
          </div>

          {loading && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 32 }}>⏳</div>
              <div style={{ color: c.textMuted }}>Caricamento in corso...</div>
            </div>
          )}

          {error && (
            <div style={{ padding: 16, background: "rgba(255,20,147,0.08)", border: `1px solid ${NEON}`, borderRadius: 10, color: NEON, fontSize: 14 }}>{error}</div>
          )}

          {/* PDF canvas */}
          {fileType === "pdf" && !loading && !error && (
            <div style={{ flex: 1, overflow: "auto", display: "flex", justifyContent: "center", background: "#333", borderRadius: 12, padding: 16 }}>
              <canvas ref={canvasRef} style={{ borderRadius: 4, boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }} />
            </div>
          )}

          {/* Word content */}
          {(fileType === "docx" || fileType === "doc") && !loading && !error && (
            <div style={{ flex: 1, overflow: "auto", background: "#fff", borderRadius: 12, padding: "32px 48px", color: "#111", fontSize: 15, lineHeight: 1.8, boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }}
              dangerouslySetInnerHTML={{ __html: wordContent }} />
          )}
        </>
      )}
    </div>
  );
}