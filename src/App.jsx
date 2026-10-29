import { useState, useRef, useEffect } from "react";

import RegisterScreen from "./components/RegisterScreen";
import WelcomeScreen from "./components/WelcomeScreen";
import SettingsPanel from "./components/SettingsPanel";
import PWAPrompt from "./components/PWAPrompt";
import LockScreen from "./components/LockScreen";
import WorkingCodeLoading from "./workingcode/WorkingCodeLoading";
import WorkingCodeApp from "./workingcode/WorkingCodeApp";
import LandingPage from "./components/LandingPage";

import HomeApp from "./tools/HomeApp";
import PlusScreen from "./tools/PlusScreen";
import NoteApp from "./tools/NoteApp";
import FoglioApp from "./tools/FoglioApp";
import DisegnoApp from "./tools/DisegnoApp";
import SlideApp from "./tools/SlideApp";
import CalcApp from "./tools/CalcApp";
import CronometroApp from "./tools/CronometroApp";
import ConvertitoreApp from "./tools/ConvertitoreApp";
import ImageEditorApp from "./tools/ImageEditorApp";
import PdfViewerApp from "./tools/PdfViewerApp";
import MusicApp from "./tools/MusicApp";
import TodoApp from "./tools/TodoApp";
import NotePlusApp from "./tools/NotePlusApp";

// ── Costanti colore ──
const NEON = "#ffffff";
const NEON2 = "#ffffff";
const GOLD = "#FFD700";
const GOLD2 = "#FFA500";

// ── Icona corona ──
function CrownIcon({ size, color }) {
  const s = size || 16;
  const col = color || GOLD;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M3 17L5 9L9 13L12 6L15 13L19 9L21 17H3Z" fill={col} stroke={col} strokeWidth="1.5" strokeLinejoin="round"/>
      <rect x="3" y="17" width="18" height="2.5" rx="1.25" fill={col}/>
    </svg>
  );
}

// ── Theme ──
function hexToRgb(hex) {
  if (!hex || typeof hex !== "string") return "255,255,255";
  let h = hex.trim().replace("#", "");
  if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  if (h.length === 6) {
    const r = parseInt(h.slice(0,2),16) || 255;
    const g = parseInt(h.slice(2,4),16) || 255;
    const b = parseInt(h.slice(4,6),16) || 255;
    return `${r},${g},${b}`;
  }
  return "255,255,255";
}

function isMonochrome(hex) {
  if (!hex) return true;
  const h = hex.trim().toLowerCase().replace("#", "");
  if (h === "fff" || h === "ffffff" || h === "000" || h === "000000") return true;
  if (h === "f5f5f7" || h === "f0f0f5" || h === "141414" || h === "0a0a0a") return true;
  if (h.length === 6 && h[0] === h[2] && h[2] === h[4] && h[1] === h[3] && h[3] === h[5]) return true;
  return false;
}

function useTheme() {
  // Migrazione da default rosa a B&W (Base Nera)
  if (!localStorage.getItem("wfy_bw_v2")) {
    const cur = localStorage.getItem("wfy_neon");
    if (!cur || cur === "#ff6b9d") {
      localStorage.setItem("wfy_neon", "#ffffff");
      localStorage.setItem("wfy_neon2", "#ffffff");
      localStorage.setItem("wfy_bgdark", "#000000");
      localStorage.setItem("wfy_bglight", "#ffffff");
    }
    localStorage.setItem("wfy_bw_v2", "1");
  }

  const [dark,        setDark]          = useState(() => localStorage.getItem("wfy_dark")         !== "false");
  const [glowOn,      setGlowOn]        = useState(() => localStorage.getItem("wfy_glow")         !== "false");
  const [glass,       setGlassRaw]      = useState(() => localStorage.getItem("wfy_glass")        === "true");
  const [glassPreset, setGlassPresetRaw]= useState(() => localStorage.getItem("wfy_glass_preset") || "aurora");
  const [glassBlur,   setGlassBlurRaw]  = useState(() => parseInt(localStorage.getItem("wfy_glass_blur") || "34", 10));
  const [glassOrbs,   setGlassOrbsRaw]  = useState(() => localStorage.getItem("wfy_glass_orbs")   !== "false");
  const [neon,        setNeonRaw]       = useState(() => localStorage.getItem("wfy_neon")         || "#ffffff");
  const [neon2,       setNeon2Raw]      = useState(() => localStorage.getItem("wfy_neon2")        || "#ffffff");
  const [bgDark,      setBgDarkRaw]     = useState(() => localStorage.getItem("wfy_bgdark")       || "#000000");
  const [bgLight,     setBgLightRaw]    = useState(() => localStorage.getItem("wfy_bglight")      || "#ffffff");

  const toggleDark      = () => { const v=!dark;      setDark(v);        localStorage.setItem("wfy_dark",         v); };
  const toggleGlow      = () => { const v=!glowOn;    setGlowOn(v);      localStorage.setItem("wfy_glow",         v); };
  const toggleGlass     = () => { const v=!glass;     setGlassRaw(v);    localStorage.setItem("wfy_glass",        v); };
  const setGlassPreset  = v  => { setGlassPresetRaw(v);                  localStorage.setItem("wfy_glass_preset", v); };
  const setGlassBlur    = v  => { setGlassBlurRaw(v);                    localStorage.setItem("wfy_glass_blur",   String(v)); };
  const toggleGlassOrbs = () => { const v=!glassOrbs; setGlassOrbsRaw(v);localStorage.setItem("wfy_glass_orbs",   v); };
  const setNeon         = v  => { setNeonRaw(v);                         localStorage.setItem("wfy_neon",         v); };
  const setNeon2        = v  => { setNeon2Raw(v);                        localStorage.setItem("wfy_neon2",        v); };
  const setBgDark       = v  => { setBgDarkRaw(v);                       localStorage.setItem("wfy_bgdark",       v); };
  const setBgLight      = v  => { setBgLightRaw(v);                      localStorage.setItem("wfy_bglight",      v); };

  return {
    dark, glowOn, glass, glassPreset, glassBlur, glassOrbs,
    neon, neon2, bgDark, bgLight,
    toggleDark, toggleGlow, toggleGlass, setGlassPreset, setGlassBlur, toggleGlassOrbs,
    setNeon, setNeon2, setBgDark, setBgLight,
  };
}

// ── Sfondo 3D Liquid Glass con Sfere Luminose Rifratte (ispirato a Glassmorphism 3D) ──
function LiquidGlassBackdrop({ dark, preset, orbs, neon, neon2 }) {
  const rgb1 = hexToRgb(neon);
  const rgb2 = hexToRgb(neon2);

  const themes = {
    aurora: {
      bg: dark
        ? "linear-gradient(135deg, #16143a 0%, #2b1f66 42%, #432371 76%, #1b1238 100%)"
        : "linear-gradient(135deg, #5b6ef7 0%, #867efb 45%, #b993fa 78%, #e2c6fc 100%)",
      sphere1: "radial-gradient(circle at 30% 28%, #ffffff 0%, #cffafe 28%, #38bdf8 68%, #0284c7 100%)",
      sphere2: "radial-gradient(circle at 32% 28%, #ffffff 0%, #ffe4e6 28%, #fb7185 66%, #e11d48 100%)",
      sphere3: "radial-gradient(circle at 30% 28%, #ffffff 0%, #e0e7ff 32%, #818cf8 70%, #4f46e5 100%)",
      centerGlow: "radial-gradient(circle, rgba(139, 92, 246, 0.48) 0%, rgba(56, 189, 248, 0.22) 45%, transparent 72%)",
    },
    orchid: {
      bg: dark
        ? "linear-gradient(135deg, #281136 0%, #481d5c 48%, #2e1a47 100%)"
        : "linear-gradient(135deg, #e599f7 0%, #f3c4fb 45%, #e9d8fd 78%, #c5b3ff 100%)",
      sphere1: "radial-gradient(circle at 30% 28%, #ffffff 0%, #fae8ff 34%, #e879f9 72%, #a21caf 100%)",
      sphere2: "radial-gradient(circle at 32% 30%, #ffffff 0%, #e0f2fe 32%, #7dd3fc 68%, #6366f1 100%)",
      sphere3: "radial-gradient(circle at 30% 28%, #ffffff 0%, #fce7f3 35%, #f472b6 72%, #9333ea 100%)",
      centerGlow: "radial-gradient(circle, rgba(232, 121, 249, 0.42) 0%, rgba(168, 85, 247, 0.20) 50%, transparent 72%)",
    },
    azure: {
      bg: dark
        ? "linear-gradient(135deg, #031938 0%, #013a7d 48%, #0066b2 100%)"
        : "linear-gradient(135deg, #00c6ff 0%, #0092ff 50%, #005bea 100%)",
      sphere1: "radial-gradient(circle at 28% 26%, #ffffff 0%, #a5f3fc 32%, #00b4d8 70%, #0077b6 100%)",
      sphere2: "radial-gradient(circle at 32% 30%, #e0f2fe 0%, #38bdf8 38%, #0284c7 75%, #03045e 100%)",
      sphere3: "radial-gradient(circle at 30% 28%, #ffffff 0%, #bae6fd 34%, #0ea5e9 72%, #1d4ed8 100%)",
      centerGlow: "radial-gradient(circle, rgba(56, 189, 248, 0.45) 0%, rgba(2, 132, 199, 0.22) 50%, transparent 72%)",
    },
    crystal: {
      bg: dark
        ? `linear-gradient(135deg, #090b14 0%, rgba(${rgb1}, 0.16) 50%, #0b0716 100%)`
        : `linear-gradient(135deg, #dde7ff 0%, #efe8ff 50%, #d8f3ff 100%)`,
      sphere1: `radial-gradient(circle at 30% 28%, #ffffff 0%, rgba(${rgb1}, 0.85) 55%, #38bdf8 100%)`,
      sphere2: `radial-gradient(circle at 32% 30%, #ffffff 0%, rgba(${rgb2}, 0.85) 55%, #f472b6 100%)`,
      sphere3: `radial-gradient(circle at 30% 28%, #ffffff 0%, #c7d2fe 45%, #818cf8 100%)`,
      centerGlow: `radial-gradient(circle, rgba(${rgb1}, 0.28) 0%, transparent 70%)`,
    },
  };

  const t = themes[preset] || themes.aurora;

  return (
    <div style={{ position: "absolute", inset: 0, background: t.bg, overflow: "hidden", pointerEvents: "none", zIndex: 0, transition: "background 0.5s ease" }}>
      {/* Luce centrale diffusa */}
      <div style={{ position: "absolute", top: "18%", left: "22%", width: "56%", height: "64%", background: t.centerGlow, filter: "blur(55px)", borderRadius: "50%" }} />

      {orbs && (
        <>
          {/* Sfera 3D Top-Left (Ciano/Perla come Immagine 1) */}
          <div style={{
            position: "absolute", top: "6%", left: "14%", width: 230, height: 230, borderRadius: "50%",
            background: t.sphere1,
            boxShadow: "0 24px 60px rgba(56, 189, 248, 0.35), inset 0 10px 24px rgba(255,255,255,0.9), inset -10px -14px 28px rgba(0,0,0,0.18)",
            animation: "orb-float-1 11s ease-in-out infinite",
          }} />

          {/* Sfera 3D Right (Corallo/Rosa o Cobalto come Immagine 1 & 3) */}
          <div style={{
            position: "absolute", top: "24%", right: "7%", width: 290, height: 290, borderRadius: "50%",
            background: t.sphere2,
            boxShadow: "0 28px 70px rgba(244, 63, 94, 0.30), inset 0 12px 28px rgba(255,255,255,0.88), inset -12px -18px 34px rgba(0,0,0,0.20)",
            animation: "orb-float-2 14s ease-in-out infinite",
          }} />

          {/* Sfera 3D Bottom-Left (Indaco/Perla grande come Immagine 1 & 2) */}
          <div style={{
            position: "absolute", bottom: "-6%", left: "6%", width: 320, height: 320, borderRadius: "50%",
            background: t.sphere3,
            boxShadow: "0 30px 75px rgba(99, 102, 241, 0.35), inset 0 14px 30px rgba(255,255,255,0.92), inset -14px -18px 36px rgba(0,0,0,0.20)",
            animation: "orb-float-3 16s ease-in-out infinite",
          }} />

          {/* Piccola sfera 3D satellite in alto a destra (come Immagine 3) */}
          <div style={{
            position: "absolute", top: "9%", right: "32%", width: 74, height: 74, borderRadius: "50%",
            background: t.sphere1,
            boxShadow: "0 12px 30px rgba(0, 0, 0, 0.22), inset 0 6px 14px rgba(255,255,255,0.9)",
            animation: "orb-float-2 9s ease-in-out infinite",
          }} />
        </>
      )}
    </div>
  );
}

function getC(dark, neon, neon2, bgDark, bgLight, glass, glassPreset = "aurora", glassBlur = 34) {
  const isBW = isMonochrome(neon);
  const rgb = hexToRgb(neon);

  if (dark) {
    // BASE NERA, SCRITTE BIANCHE (Default)
    const accent = isBW ? "#ffffff" : neon;
    const accentRgb = isBW ? "255,255,255" : rgb;
    const base = {
      dark: true,
      isBW,
      glass: !!glass,
      glassPreset,
      glassBlur,
      bg: bgDark || "#000000",
      surface: isBW ? "rgba(255,255,255,0.03)" : `rgba(${rgb},0.03)`,
      surface2: isBW ? "#121212" : "#16161f",
      border: isBW ? "rgba(255,255,255,0.14)" : `rgba(${rgb},0.22)`,
      text: "#ffffff",
      textMuted: "rgba(255,255,255,0.68)",
      textHint: isBW ? "rgba(255,255,255,0.45)" : `rgba(${rgb},0.55)`,
      accent: accent,
      accentText: isBW ? "#000000" : "#ffffff",
      accentBg: `rgba(${accentRgb},0.12)`,
      accentBg2: `rgba(${accentRgb},0.06)`,
      headerBg: isBW ? "rgba(255,255,255,0.02)" : `rgba(${rgb},0.02)`,
      inputBg: "rgba(255,255,255,0.06)",
    };
    if (glass) {
      base.surface = "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%)";
      base.surface2 = "linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.09) 100%)";
      base.border = "rgba(255,255,255,0.38)";
      base.headerBg = "linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 100%)";
      base.inputBg = "rgba(255,255,255,0.16)";
      base.textMuted = "rgba(255,255,255,0.82)";
      base.textHint = "rgba(255,255,255,0.62)";
      base.glassSurface = "linear-gradient(135deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.07) 55%, rgba(255,255,255,0.04) 100%)";
      base.glassCard = "linear-gradient(135deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.09) 55%, rgba(255,255,255,0.04) 100%)";
      base.glassBorder = "rgba(255,255,255,0.48)";
      base.glassShadow = "0 20px 50px rgba(0,0,0,0.35), inset 0 1.5px 1px rgba(255,255,255,0.68), inset 1px 0 1px rgba(255,255,255,0.28), inset 0 -1.5px 2px rgba(255,255,255,0.12)";
      base.glassBtn = "linear-gradient(135deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.10) 100%)";
      base.glassBtnHover = "linear-gradient(135deg, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0.16) 100%)";
      base.glassBtnBorder = "rgba(255,255,255,0.58)";
      base.glassHighlight = "rgba(255,255,255,0.35)";
    }
    return base;
  } else {
    // BASE CHIARA / PASTEL GLASS
    const isVividGlass = glass && (glassPreset === "aurora" || glassPreset === "azure");
    const accent = isVividGlass ? "#ffffff" : (isBW ? "#1e1b4b" : neon2);
    const accentRgb = isVividGlass ? "255,255,255" : (isBW ? "30,27,75" : hexToRgb(neon2));
    const base = {
      dark: false,
      isBW,
      glass: !!glass,
      glassPreset,
      glassBlur,
      bg: bgLight || "#ffffff",
      surface: "#ffffff",
      surface2: "#f3f3f5",
      border: isBW ? "#e4e4e7" : "#e0e0e0",
      text: isVividGlass ? "#ffffff" : "#18122b",
      textMuted: isVividGlass ? "rgba(255,255,255,0.86)" : "#4a4458",
      textHint: isVividGlass ? "rgba(255,255,255,0.68)" : "#766f88",
      accent: accent,
      accentText: isVividGlass ? "#1e1b4b" : "#ffffff",
      accentBg: `rgba(${accentRgb},0.12)`,
      accentBg2: `rgba(${accentRgb},0.06)`,
      headerBg: "#ffffff",
      inputBg: "#f4f4f6",
    };
    if (glass) {
      base.surface = isVividGlass
        ? "linear-gradient(135deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.14) 100%)"
        : "linear-gradient(135deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.38) 100%)";
      base.surface2 = isVividGlass
        ? "linear-gradient(135deg, rgba(255,255,255,0.40) 0%, rgba(255,255,255,0.18) 100%)"
        : "linear-gradient(135deg, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.46) 100%)";
      base.border = "rgba(255,255,255,0.72)";
      base.headerBg = isVividGlass
        ? "linear-gradient(135deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.10) 100%)"
        : "linear-gradient(135deg, rgba(255,255,255,0.64) 0%, rgba(255,255,255,0.32) 100%)";
      base.inputBg = isVividGlass ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.72)";
      base.glassSurface = base.surface;
      base.glassCard = base.surface2;
      base.glassBorder = "rgba(255,255,255,0.88)";
      base.glassShadow = "0 20px 50px rgba(31, 38, 135, 0.22), inset 0 2px 1.5px rgba(255,255,255,0.92), inset 1.5px 0 1.5px rgba(255,255,255,0.55), inset 0 -2px 4px rgba(255,255,255,0.28)";
      base.glassBtn = isVividGlass
        ? "linear-gradient(135deg, rgba(255,255,255,0.44) 0%, rgba(255,255,255,0.18) 100%)"
        : "linear-gradient(135deg, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.46) 100%)";
      base.glassBtnHover = isVividGlass
        ? "linear-gradient(135deg, rgba(255,255,255,0.58) 0%, rgba(255,255,255,0.26) 100%)"
        : "linear-gradient(135deg, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.62) 100%)";
      base.glassBtnBorder = "rgba(255,255,255,0.92)";
      base.glassHighlight = "rgba(255,255,255,0.65)";
    }
    return base;
  }
}

// ── Liste strumenti ──
const MOBILE_TABS = [
  { id: "home",    label: "Home",    icon: "🏠" },
  { id: "note",    label: "Note",    icon: "✏️" },
  { id: "todo",    label: "Tasks",   icon: "✅" },
  { id: "music",   label: "Musica",  icon: "🎵" },
  { id: "more",    label: "Altro",   icon: "⋯"  },
];

const TOOLS = [
  { id: "home",         label: "Home",         icon: "🏠" },
  { id: "note",         label: "Note",         icon: "✏️" },
  { id: "todo",         label: "Tasks",        icon: "✅" },
  { id: "foglio",       label: "Foglio",       icon: "📊" },
  { id: "disegno",      label: "Disegno",      icon: "🎨" },
  { id: "slide",        label: "Slide",        icon: "📐" },
  { id: "calc",         label: "Calcola",      icon: "🧮" },
  { id: "cronometro",   label: "Cronometro",   icon: "⏱️" },
  { id: "convertitore", label: "Convertitore", icon: "🔄" },
  { id: "imageeditor",  label: "Editor Img",   icon: "🖼️" },
  { id: "pdfviewer",    label: "PDF / Word",   icon: "📄" },
  { id: "music",        label: "Musica",       icon: "🎵" },
  { id: "noteplus",     label: "Note PLUS",    icon: "📓" },
];

// ── Drawer mobile ──
function MobileDrawer({ c, active, setActive, onClose }) {
  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:300, backdropFilter:"blur(4px)" }}/>
      <div className={c.glass?"glass-surface glass-edge":""} style={{ position:"fixed", bottom:64, left:0, right:0, zIndex:301, background: c.glass ? c.glassCard : (c.dark ? (c.isBW ? "#121212" : "#13101a") : "#fff"), border:c.glass?"none":`1px solid ${c.border}`, borderRadius:"24px 24px 0 0", padding:"20px 16px 16px", animation:"slideUp .3s cubic-bezier(.16,1,.3,1) both", ...(c.glass?{backdropFilter:`blur(${c.glassBlur || 34}px) saturate(210%)`, boxShadow:c.glassShadow, border:`1px solid ${c.glassBorder}`}:{}) }}>
        <div style={{ width:36, height:4, borderRadius:2, background:c.border, margin:"0 auto 20px" }}/>
        <div style={{ fontSize:12, color:c.textHint, letterSpacing:1, marginBottom:12 }}>TUTTI GLI STRUMENTI</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
          {TOOLS.map(t => (
            <button key={t.id} onClick={() => { setActive(t.id); onClose(); }}
              style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, padding:"14px 8px", borderRadius:16, cursor:"pointer", border:`1px solid ${active===t.id?c.accent:c.border}`, background:active===t.id?c.accentBg:c.surface, color:active===t.id?c.accent:c.textMuted }}>
              <span style={{ fontSize:24 }}>{t.icon}</span>
              <span style={{ fontSize:10, fontWeight:active===t.id?600:400, textAlign:"center" }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Mini player ──
function MiniPlayer({ audioState, audioRef, blobMap, c }) {
  const { currentId, songs, playing, currentTime, duration } = audioState;
  const currentSong = songs.find(s => s.id === currentId);
  const hasBlob = !!blobMap.current[currentId];
  if (!currentSong || !hasBlob) return null;
  const pct = duration ? Math.min((currentTime/duration)*100, 100) : 0;
  const togglePlay = () => {
    if (playing) audioRef.current.pause();
    else audioRef.current.play().catch(()=>{});
  };
  return (
    <div className={c.glass?"glass-surface":""} style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:150, background: c.glass ? c.glassSurface : (c.dark ? "rgba(10,10,10,0.97)" : "rgba(255,255,255,0.97)"), borderTop:c.glass?"none":`1px solid ${c.border}`, padding:"8px 16px", display:"flex", alignItems:"center", gap:12, backdropFilter:c.glass?`blur(${c.glassBlur || 34}px) saturate(210%)`:"blur(12px)", ...(c.glass?{boxShadow:c.glassShadow}:{}) }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background: c.border }}>
        <div style={{ height:"100%", width:`${pct}%`, background: c.accent, transition:"width .1s linear" }}/>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0 }}>
        <div style={{ width:32, height:32, borderRadius:8, background: c.accentBg, border: `1px solid ${c.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, color: c.accent, flexShrink:0 }}>{playing?"♫":"♪"}</div>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:600, color: c.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{currentSong.name}</div>
          <div style={{ fontSize:10, color: c.textHint }}>{playing?"In riproduzione":"In pausa"}</div>
        </div>
      </div>
      <button onClick={togglePlay} style={{ width:36, height:36, borderRadius:"50%", background: c.accent, border:"none", cursor:"pointer", color: c.accentText || "#000", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        {playing?"⏸":"▶"}
      </button>
    </div>
  );
}

// ── App principale ──
export default function App() {
  // Screen e utente
  const [screen, setScreen] = useState(() => {
    const landed = localStorage.getItem("wfy_landed");
    if (!landed) return "landing";
    const user = localStorage.getItem("wfy_user");
    const accounts = localStorage.getItem("wfy_accounts");
    if (user && accounts) return "app";
    return "register";
  });
  const [user,    setUser]     = useState(() => { try { return JSON.parse(localStorage.getItem("wfy_user")||"null"); } catch { return null; } });

  // UI
  const [active,       setActive]       = useState("home");
  const [sideOpen,     setSideOpen]     = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showDrawer,   setShowDrawer]   = useState(false);
  const [showAppSwitcher, setShowAppSwitcher] = useState(false);
  const [isMobile,     setIsMobile]     = useState(window.innerWidth < 768);

  // WorkingCode
  const [currentApp,    setCurrentApp]    = useState("workfystation"); // "workfystation" | "wc-loading" | "workingcode"
  const switchToWorkingCode = () => { setShowAppSwitcher(false); setCurrentApp("wc-loading"); };
  const switchToWorkfyStation = () => setCurrentApp("workfystation");

  // Sicurezza
  const [locked,     setLocked]     = useState(false);
  const [timeout,    setTimeoutVal] = useState(() => parseInt(localStorage.getItem("wfy_timeout") || "0"));
  // eslint-disable-next-line react-hooks/purity
  const lastActivity = useRef(Date.now());

  // Tema
  const {
    dark, glowOn, glass, glassPreset, glassBlur, glassOrbs,
    neon, neon2, bgDark, bgLight,
    toggleDark, toggleGlow, toggleGlass, setGlassPreset, setGlassBlur, toggleGlassOrbs,
    setNeon, setNeon2, setBgDark, setBgLight,
  } = useTheme();
  const c = getC(dark, neon, neon2, bgDark, bgLight, glass, glassPreset, glassBlur);

  // Audio globale
  const audioRef = useRef(new Audio());
  const blobMap  = useRef({});
  const [songs,      setSongs]      = useState(() => { try { return JSON.parse(localStorage.getItem("wfy_songs_meta")||"[]"); } catch { return []; } });
  const [playlists,  setPlaylists]  = useState(() => { try { return JSON.parse(localStorage.getItem("wfy_playlists")||"[]"); } catch { return []; } });
  const [currentId,  setCurrentId]  = useState(null);
  const [queue,      setQueue]      = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [playing,    setPlaying]    = useState(false);
  const [currentTime,setCurrentTime]= useState(0);
  const [duration,   setDuration]   = useState(0);
  const [volume,     setVolume]     = useState(1);
  const [muted,      setMuted]      = useState(false);
  const [shuffle,    setShuffle]    = useState(false);
  const [repeat,     setRepeat]     = useState("none");

  // ── Handlers ──
  const handleRegister    = (u) => { setUser(u); setScreen("welcome"); };
  const handleWelcomeDone = ()  => setScreen("app");
  const logout = () => {
    localStorage.removeItem("wfy_user");
    localStorage.removeItem("wfy_session_time");
    setUser(null);
    setScreen("register");
    setSettingsOpen(false);
    setLocked(false);
    setActive("home");
  };

  // ── Effects ──
  useEffect(() => { localStorage.setItem("wfy_timeout", timeout.toString()); }, [timeout]);
  useEffect(() => { localStorage.setItem("wfy_songs_meta", JSON.stringify(songs)); }, [songs]);
  useEffect(() => { localStorage.setItem("wfy_playlists", JSON.stringify(playlists)); }, [playlists]);

  // Timeout inattività
  useEffect(() => {
    if (timeout === 0 || screen !== "app") return;
    const reset = () => { lastActivity.current = Date.now(); };
    const check = setInterval(() => {
      if (Date.now() - lastActivity.current > timeout * 60 * 1000) setLocked(true);
    }, 10000);
    window.addEventListener("mousemove",  reset);
    window.addEventListener("keydown",    reset);
    window.addEventListener("touchstart", reset);
    return () => {
      clearInterval(check);
      window.removeEventListener("mousemove",  reset);
      window.removeEventListener("keydown",    reset);
      window.removeEventListener("touchstart", reset);
    };
  }, [timeout, screen]);

  // Resize
  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  // Audio eventi
  useEffect(() => {
    const audio = audioRef.current;
    const onTime  = () => setCurrentTime(audio.currentTime);
    const onMeta  = () => setDuration(audio.duration);
    const onPlay  = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    // eslint-disable-next-line no-use-before-define
    const onEnded = () => playNext();
    audio.addEventListener("timeupdate",    onTime);
    audio.addEventListener("loadedmetadata",onMeta);
    audio.addEventListener("play",          onPlay);
    audio.addEventListener("pause",         onPause);
    audio.addEventListener("ended",         onEnded);
    return () => {
      audio.removeEventListener("timeupdate",    onTime);
      audio.removeEventListener("loadedmetadata",onMeta);
      audio.removeEventListener("play",          onPlay);
      audio.removeEventListener("pause",         onPause);
      audio.removeEventListener("ended",         onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, queueIndex, shuffle, repeat]);

  // Cambio canzone
  useEffect(() => {
    if (!currentId) return;
    const url = blobMap.current[currentId];
    if (!url) return;
    const audio = audioRef.current;
    audio.src = url;
    audio.load();
    audio.volume = muted ? 0 : volume;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume, muted]);

  // ── Audio helpers ──
  const playNext = () => {
    if (!queue.length) return;
    if (repeat === "one") { audioRef.current.currentTime=0; audioRef.current.play(); return; }
    let next = shuffle ? Math.floor(Math.random()*queue.length) : (queueIndex+1)%queue.length;
    if (!shuffle && next===0 && repeat==="none") { setPlaying(false); return; }
    setQueueIndex(next);
    setCurrentId(queue[next]);
    setTimeout(() => audioRef.current.play().catch(()=>{}), 80);
  };

  const playPrev = () => {
    if (!queue.length) return;
    if (audioRef.current.currentTime > 3) { audioRef.current.currentTime=0; return; }
    const prev = (queueIndex-1+queue.length)%queue.length;
    setQueueIndex(prev);
    setCurrentId(queue[prev]);
    setTimeout(() => audioRef.current.play().catch(()=>{}), 80);
  };

  const playSong = (id, list) => {
    const ids = list || songs.map(s=>s.id);
    const idx = ids.indexOf(id);
    setQueue(ids); setQueueIndex(idx>=0?idx:0);
    setCurrentId(id);
    setTimeout(() => audioRef.current.play().catch(()=>{}), 80);
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!currentId || !blobMap.current[currentId]) return;
    if (playing) audio.pause(); else audio.play().catch(()=>{});
  };

  const audioState = {
    songs, setSongs, playlists, setPlaylists,
    currentId, setCurrentId, queue, setQueue,
    queueIndex, setQueueIndex, playing, setPlaying,
    currentTime, duration, volume, setVolume,
    muted, setMuted, shuffle, setShuffle, repeat, setRepeat,
    playSong, togglePlay, playNext, playPrev,
  };

  // ── Schermate speciali ──
  if (screen === "landing") return <LandingPage onEnter={() => { localStorage.setItem("wfy_landed", "1"); setScreen("register"); }} />;
  if (screen === "register") return <RegisterScreen onDone={handleRegister} c={c}/>;
  if (screen === "welcome")  return <WelcomeScreen user={user} onDone={handleWelcomeDone} c={c}/>;
  if (locked) return <LockScreen user={user} onUnlock={() => { setLocked(false); lastActivity.current=Date.now(); }} c={c}/>;

  // ── WorkingCode ──
  if (currentApp === "wc-loading") return <WorkingCodeLoading onDone={() => setCurrentApp("workingcode")} />;
  if (currentApp === "workingcode") return <WorkingCodeApp user={user} onSwitchBack={switchToWorkfyStation} />;

  const email = user?.email || "guest";
  const showMiniPlayer = active!=="music" && currentId && blobMap.current[currentId];
  const bottomOffset   = showMiniPlayer ? (isMobile?120:56) : (isMobile?64:0);

  const panels = {
    home:         <HomeApp        c={c} user={user} onNavigate={setActive}/>,
    plus:         <PlusScreen     c={c} user={user}/>,
    note:         <NoteApp        email={email} c={c}/>,
    todo:         <TodoApp        email={email} c={c}/>,
    foglio:       <FoglioApp      email={email} c={c}/>,
    disegno:      <DisegnoApp     email={email} c={c}/>,
    slide:        <SlideApp       email={email} c={c}/>,
    calc:         <CalcApp        c={c}/>,
    cronometro:   <CronometroApp  c={c}/>,
    convertitore: <ConvertitoreApp c={c}/>,
    imageeditor:  <ImageEditorApp  c={c}/>,
    pdfviewer:    <PdfViewerApp    c={c}/>,
    music:        <MusicApp audioState={audioState} audioRef={audioRef} blobMap={blobMap} c={c}/>,
    noteplus:     <NotePlusApp email={email} c={c}/>,
  };

  const glowS  = (color,size) => glowOn ? `0 0 ${size}px ${color}, 0 0 ${size*2}px ${color}` : "none";
  const glowTx = glowOn ? `0 0 10px ${neon}, 0 0 20px ${neon}, 0 0 40px ${neon2}` : "none";
  const currentTool = TOOLS.find(t=>t.id===active) || { icon:"🏠", label:"Home" };

  return (
    <div style={{ display:"flex", height:"100vh", background:c.bg, fontFamily:"'Segoe UI',sans-serif", overflow:"hidden", color:c.text, position:"relative", "--glass-blur": `${glassBlur}px` }}>
      {c.glass && (
        <LiquidGlassBackdrop dark={dark} preset={glassPreset} orbs={glassOrbs} neon={neon} neon2={neon2} />
      )}
      <div style={{ position:"relative", zIndex:1, display:"flex", width:"100%", height:"100%" }}>
      <style>{`
        ${glowOn?`@keyframes glow-pulse{0%,100%{box-shadow:0 0 8px ${neon};}50%{box-shadow:0 0 20px ${neon},0 0 40px ${neon2};}}`:""}
        @keyframes slideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .tool-btn:hover{background:${c.glass ? (c.glassBtnHover || c.accentBg) : c.accentBg}!important;${c.glass?`backdrop-filter:blur(${glassBlur}px) saturate(210%);-webkit-backdrop-filter:blur(${glassBlur}px) saturate(210%);box-shadow:0 8px 20px rgba(0,0,0,0.16), inset 0 1.5px 1px rgba(255,255,255,0.65);border-color:${c.glassBtnBorder}!important;`:''}}
        .tool-btn.active{background:${c.glass ? (c.glassBtn || c.accentBg) : c.accentBg}!important;border-color:${c.glass ? (c.glassBtnBorder || c.accent) : c.accent}!important;${c.glass?`backdrop-filter:blur(${glassBlur}px) saturate(210%);-webkit-backdrop-filter:blur(${glassBlur}px) saturate(210%);box-shadow:${c.glassShadow};`:''}}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:${c.border};border-radius:2px;}
        input::placeholder,textarea::placeholder{color:${c.textHint};}
        button:active{transform:scale(0.97);}
      `}</style>

      {/* Modali */}
      {settingsOpen && (
        <SettingsPanel
          dark={dark} glowOn={glowOn} glass={glass}
          glassPreset={glassPreset} setGlassPreset={setGlassPreset}
          glassBlur={glassBlur} setGlassBlur={setGlassBlur}
          glassOrbs={glassOrbs} toggleGlassOrbs={toggleGlassOrbs}
          toggleDark={toggleDark} toggleGlow={toggleGlow} toggleGlass={toggleGlass}
          neon={neon} neon2={neon2} setNeon={setNeon} setNeon2={setNeon2}
          bgDark={bgDark} setBgDark={setBgDark} bgLight={bgLight} setBgLight={setBgLight}
          timeout={timeout} setTimeout={setTimeoutVal}
          onLogout={logout}
          onLock={() => { setLocked(true); setSettingsOpen(false); }}
          onClose={() => setSettingsOpen(false)} c={c}
        />
      )}
      {showDrawer && <MobileDrawer c={c} active={active} setActive={setActive} onClose={()=>setShowDrawer(false)}/>}

      {/* Mini player */}
      {showMiniPlayer && <MiniPlayer audioState={audioState} audioRef={audioRef} blobMap={blobMap} c={c}/>}

      {/* PWA */}
      <PWAPrompt c={c}/>

      {/* ── SIDEBAR DESKTOP ── */}
      {!isMobile && (
        <div className={c.glass?"glass-surface glass-edge":""} style={{ width:sideOpen?228:68, background:c.glass?c.glassSurface:c.surface, borderRight:c.glass?"none":`1px solid ${c.border}`, display:"flex", flexDirection:"column", transition:"width .3s", overflow:"hidden", flexShrink:0, ...(c.glass?{boxShadow:c.glassShadow, borderRight:`1px solid ${c.glassBtnBorder}`, backdropFilter:`blur(${glassBlur}px) saturate(215%)`, WebkitBackdropFilter:`blur(${glassBlur}px) saturate(215%)`}:{}) }}>

          {/* Header con Switcher App */}
          <div style={{ padding:"16px 12px", borderBottom:`1px solid ${c.border}`, display:"flex", alignItems:"center", gap:8, position: "relative" }}>
            <div className={c.glass ? (c.dark ? "glass-squircle-dark" : "glass-squircle") : ""} style={{ width:38, height:38, borderRadius:12, background:c.glass ? undefined : c.accentBg, border:c.glass ? undefined : `1px solid ${c.accent}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:c.glass ? undefined : glowS(neon,6), animation:glowOn && !c.glass?"glow-pulse 3s infinite":"none" }}>
              <img src={`${import.meta.env.BASE_URL}WorkfyLogo.png`} alt="logo" style={{ width:24, height:24, objectFit:"contain", borderRadius:4 }}/>
            </div>
            
            {sideOpen && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <div 
                  onClick={() => setShowAppSwitcher(!showAppSwitcher)}
                  style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none" }}
                >
                  <div style={{ color:c.accent, fontWeight:600, fontSize:14, textShadow:glowTx, whiteSpace:"nowrap" }}>WorkfyStation</div>
                  <div style={{ fontSize: 10, color: c.accent, transform: showAppSwitcher ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▼</div>
                </div>
              </div>
            )}
            
            {sideOpen && <button onClick={()=>setSettingsOpen(true)} className={c.glass?"glass-btn":""} style={{ background:c.glass?c.glassBtn:"transparent", border:`1px solid ${c.glass?c.glassBtnBorder:c.border}`, borderRadius:10, width:32, height:32, cursor:"pointer", color:c.text, fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>⚙</button>}

            {/* Popup Switcher */}
            {sideOpen && showAppSwitcher && (
              <>
                <div onClick={() => setShowAppSwitcher(false)} style={{ position: "fixed", inset: 0, zIndex: 999 }} />
                <div style={{ position: "absolute", top: 60, left: 12, width: 220, background: dark ? "#1a1a1a" : "#ffffff", border: `1px solid ${c.border}`, borderRadius: 14, boxShadow: "0 12px 36px rgba(0,0,0,0.45)", zIndex: 1000, overflow: "hidden", animation: "fadeIn .2s ease" }}>
                  <div style={{ padding: "8px 12px", fontSize: 11, color: c.textHint, letterSpacing: 1, borderBottom: `1px solid ${c.border}` }}>PASSA A</div>
                  
                  {/* Current App */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px", background: c.accentBg, cursor: "default" }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: c.accentBg, border: `1px solid ${c.accent}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <img src={`${import.meta.env.BASE_URL}WorkfyLogo.png`} alt="logo" style={{ width: 18, height: 18, objectFit: "contain" }}/>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: c.accent }}>WorkfyStation</div>
                      <div style={{ fontSize: 10, color: c.textMuted }}>Suite di produttività</div>
                    </div>
                    <div style={{ fontSize: 14, color: c.accent }}>✓</div>
                  </div>

                  {/* Other App */}
                  <div 
                    onClick={switchToWorkingCode}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px", cursor: "pointer", transition: "background .2s" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = c.surface2}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${GOLD}44, ${GOLD2}22)`, border: `1px solid ${GOLD}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                      <img src={`${import.meta.env.BASE_URL}WorkingCodeLogo.png`} alt="WorkingCode" style={{ width: 18, height: 18, objectFit: "contain" }} 
                           onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span style="font-size:14px">💻</span>'; }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>WorkingCode <span style={{ color: GOLD }}>PLUS</span></div>
                      <div style={{ fontSize: 10, color: c.textMuted }}>Ambiente di sviluppo</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Utente + PLUS */}
          {sideOpen && user && (
            <div style={{ padding:"10px 16px", borderBottom:`1px solid ${c.border}` }}>
              <div style={{ color:c.textHint, fontSize:11, letterSpacing:1 }}>UTENTE</div>
              <div style={{ color:c.text, fontSize:13, marginTop:2, fontWeight:500 }}>{user.nome} {user.cognome}</div>
              <div style={{ color:c.textMuted, fontSize:11, marginTop:1, marginBottom:10 }}>{user.email}</div>
              <button onClick={()=>setActive("plus")}
                style={{ width:"100%", padding:"8px 12px", borderRadius:12, border:`1.5px solid ${GOLD}88`, background:`linear-gradient(135deg,${GOLD}22,${GOLD2}0e)`, cursor:"pointer", display:"flex", alignItems:"center", gap:8, transition:"all .2s", boxShadow:active==="plus"?`0 0 14px ${GOLD}55`:"none" }}>
                <CrownIcon size={15} color={GOLD}/>
                <span style={{ fontSize:12, fontWeight:700, background:`linear-gradient(90deg,${GOLD},${GOLD2})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", flex:1, textAlign:"left" }}>Workfy PLUS</span>
                <span style={{ fontSize:9, padding:"2px 6px", borderRadius:8, background:`${GOLD}22`, color:GOLD, fontWeight:700, letterSpacing:.5 }}>PRESTO</span>
              </button>
            </div>
          )}

          {/* Strumenti */}
          <div style={{ flex:1, padding:"10px 8px", display:"flex", flexDirection:"column", gap:5, overflowY:"auto" }}>
            {TOOLS.map(t => (
              <button key={t.id} onClick={()=>setActive(t.id)}
                className={`tool-btn${active===t.id?" active":""}`}
                style={{ display:"flex", alignItems:"center", gap:12, padding:c.glass?"8px 10px":"10px 12px", borderRadius:c.glass?14:10, border:"1px solid transparent", background:"transparent", cursor:"pointer", color:active===t.id?c.accent:c.textMuted, fontSize:13, textAlign:"left", transition:"all .2s", width:"100%", fontWeight:active===t.id?"600":"400" }}>
                <span className={c.glass ? (c.dark ? "glass-squircle-dark" : "glass-squircle") : ""} style={c.glass ? { width:30, height:30, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 } : { fontSize:18, flexShrink:0 }}>{t.icon}</span>
                {sideOpen && <span style={{ whiteSpace:"nowrap" }}>{t.label}</span>}
              </button>
            ))}
          </div>

          {/* Footer sidebar */}
          <div style={{ padding:"10px 8px", borderTop:`1px solid ${c.border}` }}>
            {!sideOpen && <button onClick={()=>setSettingsOpen(true)} style={{ width:"100%", padding:"8px", borderRadius:8, border:`1px solid ${c.border}`, background:"transparent", cursor:"pointer", color:c.textMuted, fontSize:16, marginBottom:4 }}>⚙</button>}
            <button onClick={()=>setSideOpen(!sideOpen)} className={c.glass?"glass-btn":""} style={{ width:"100%", padding:"8px", borderRadius:10, border:`1px solid ${c.glass?c.glassBtnBorder:c.border}`, background:c.glass?c.glassBtn:"transparent", cursor:"pointer", color:c.text, fontSize:12 }}>
              {sideOpen?"« Chiudi":"»"}
            </button>
          </div>
        </div>
      )}

      {/* ── CONTENUTO PRINCIPALE ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* Header */}
          <div className={c.glass?"glass-surface":""} style={{ padding:isMobile?"10px 16px":"14px 24px", borderBottom:c.glass?"none":`1px solid ${c.border}`, background:c.glass?c.headerBg:c.headerBg, display:"flex", alignItems:"center", gap:12, flexShrink:0, ...(c.glass?{boxShadow:`0 8px 24px rgba(0,0,0,0.12), inset 0 -1px 0 ${c.glassBtnBorder}`, backdropFilter:`blur(${glassBlur}px) saturate(210%)`, WebkitBackdropFilter:`blur(${glassBlur}px) saturate(210%)`}:{}) }}>
            {isMobile && (
              <div style={{ width:30, height:30, borderRadius:8, background:c.accentBg, border:`1px solid ${c.accent}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <img src={`${import.meta.env.BASE_URL}WorkfyLogo.png`} alt="logo" style={{ width:20, height:20, objectFit:"contain" }}/>
              </div>
            )}
            <span className={c.glass ? (c.dark ? "glass-squircle-dark" : "glass-squircle") : ""} style={c.glass ? { width:34, height:34, borderRadius:11, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 } : { fontSize:isMobile?18:22 }}>{currentTool.icon}</span>
            <span style={{ fontSize:isMobile?15:17, fontWeight:600, color:c.text }}>{currentTool.label}</span>
            {c.glass && (
              <span style={{ fontSize:10, padding:"3px 10px", borderRadius:20, background:c.glassBtn, border:`1px solid ${c.glassBtnBorder}`, color:c.text, fontWeight:600, letterSpacing:0.5, boxShadow:"inset 0 1px 1px rgba(255,255,255,0.6)" }}>
                ✨ LIQUID GLASS
              </span>
            )}
            <div style={{ flex:1 }}/>
            {isMobile && <button onClick={()=>setSettingsOpen(true)} style={{ width:32, height:32, borderRadius:8, border:`1px solid ${c.border}`, background:"transparent", cursor:"pointer", color:c.textMuted, fontSize:16 }}>⚙</button>}
            {!isMobile && <div style={{ fontSize:12, color:c.textHint }}>v1.1</div>}
          </div>

        {/* Pannello principale */}
          <div style={{ flex:1, overflow:"auto", background:c.glass ? "transparent" : c.surface, paddingBottom:bottomOffset }}>
            {panels[active]}
          </div>
      </div>

      {/* ── NAVBAR MOBILE ── */}
      {isMobile && (
        <div className={c.glass?"glass-surface glass-edge":""} style={{ position:"fixed", bottom:showMiniPlayer?56:0, left:0, right:0, zIndex:200, background: c.glass ? c.glassSurface : (c.dark ? "rgba(10,10,10,0.95)" : "rgba(255,255,255,0.95)"), borderTop:c.glass?"none":`1px solid ${c.border}`, backdropFilter:c.glass?`blur(${glassBlur}px) saturate(230%)`:"blur(12px)", display:"flex", alignItems:"center", height:64, paddingBottom:"env(safe-area-inset-bottom)", ...(c.glass?{boxShadow:c.glassShadow}:{}) }}>
          {MOBILE_TABS.map(t => {
            const isActive = t.id!=="more" && active===t.id;
            return (
              <button key={t.id} onClick={()=>t.id==="more"?setShowDrawer(true):setActive(t.id)}
                style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3, padding:"8px 0", border:"none", background:"transparent", cursor:"pointer", color:isActive?c.accent:c.textMuted, transition:"all .2s" }}>
                <div style={{ width:36, height:26, borderRadius:13, display:"flex", alignItems:"center", justifyContent:"center", background:isActive?c.accentBg:"transparent", transition:"all .2s" }}>
                  <span style={{ fontSize:18 }}>{t.icon}</span>
                </div>
                <span style={{ fontSize:10, fontWeight:isActive?600:400 }}>{t.label}</span>
              </button>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
